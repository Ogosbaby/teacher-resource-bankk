/**
 * Verification for resource file storage.
 *
 *   npm run verify:files
 *
 * Needs a reachable database and a writable storage backend — with R2 unset that
 * is the local filesystem fallback, which is exactly what this exercise is meant to
 * cover. No server: it drives the service the endpoint calls.
 *
 * The point of the run is the part that is easy to get wrong and invisible when it
 * is: that the row and the object stay in step. So it attaches a file, replaces it
 * and checks the old object is gone, then detaches and checks the key went back to
 * a placeholder rather than dangling.
 *
 * Everything it creates it deletes, scoped to the resource it made. The seeded
 * admin is used only as the author of that throwaway row and is never modified.
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import { resources, users } from "../src/lib/db/schema";
import { getStorageProvider } from "../src/lib/storage";
import { ObjectNotFoundError } from "../src/lib/storage/types";
import {
  ResourceFileError,
  attachResourceFile,
  createResource,
  detachResourceFile,
  getResource,
} from "../src/lib/services/resources.service";

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(detail ? `${name} — ${detail}` : name);
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title: string): void {
  console.log(`\n${title}`);
}

const PDF = new TextEncoder().encode(
  "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"
);

async function existsInStorage(key: string): Promise<boolean> {
  try {
    await getStorageProvider().get(key);
    return true;
  } catch (error) {
    if (error instanceof ObjectNotFoundError) return false;
    throw error;
  }
}

async function main() {
  const [author] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.role, "admin"))
    .limit(1);

  if (!author) throw new Error("No admin user to attribute the test resource to — run `npm run seed`.");

  const storage = getStorageProvider();
  let resourceId: string | null = null;
  const keys: string[] = [];

  try {
    section("Setup");
    resourceId = await createResource(
      {
        title: `Verify file storage ${Date.now()}`,
        description: "Throwaway resource created by npm run verify:files.",
        resourceType: "lesson_plan",
        body: "Text body, so the file is genuinely optional.",
        aiGenerated: false,
      },
      author.id
    );
    check("throwaway resource created", Boolean(resourceId));
    console.log(`  (storage backend: ${storage.name}${storage.isRemote ? "" : " — local fallback"})`);

    const fresh = await getResource(resourceId);
    check("a text resource reports no file", fresh?.fileUploadedAt === null);
    check(
      "its key is a placeholder, not a stored object",
      (fresh?.fileStorageKey ?? "").startsWith("resources/") && !(await existsInStorage(fresh!.fileStorageKey))
    );

    section("Attach");
    const first = await attachResourceFile(resourceId, {
      name: "Scheme of Work (JSS 2).pdf",
      contentType: "application/pdf",
      body: PDF,
    });
    keys.push(first.storageKey);

    check("the key is namespaced to the resource", first.storageKey.startsWith(`resources/${resourceId}/`));
    check("the filename is made safe", first.storageKey.endsWith(".pdf") && !first.storageKey.includes(" "));
    check("the size is reported", first.sizeBytes === PDF.byteLength, String(first.sizeBytes));
    check("the object is really in storage", await existsInStorage(first.storageKey));

    const afterAttach = await getResource(resourceId);
    check("the row records the upload", afterAttach?.fileUploadedAt instanceof Date);
    check("the row records the size", afterAttach?.fileSizeBytes === PDF.byteLength);
    check("the row keeps the original filename", afterAttach?.fileOriginalName === "Scheme of Work (JSS 2).pdf");
    check("the row moved to the real key", afterAttach?.fileStorageKey === first.storageKey);

    section("Replace");
    const second = await attachResourceFile(resourceId, {
      name: "scheme-v2.pdf",
      contentType: "application/pdf",
      body: new Uint8Array([...PDF, 0x0a, 0x25, 0x25, 0x45, 0x4f, 0x46]),
    });
    keys.push(second.storageKey);

    check("the new object is in storage", await existsInStorage(second.storageKey));
    check(
      "the replaced object is gone, not orphaned",
      (await existsInStorage(first.storageKey)) === false,
      first.storageKey
    );
    check("the row points at the new object", (await getResource(resourceId))?.fileStorageKey === second.storageKey);

    section("Refusals");
    const reject = async (
      name: string,
      file: { name: string; contentType: string; body: Uint8Array },
      expectedStatus: number
    ) => {
      try {
        await attachResourceFile(resourceId!, file);
        check(name, false, "it was accepted");
      } catch (error) {
        check(
          name,
          error instanceof ResourceFileError && error.status === expectedStatus,
          error instanceof Error ? `${error.name}: ${error.message}` : String(error)
        );
      }
    };

    await reject("a zip is refused", { name: "x.zip", contentType: "application/zip", body: PDF }, 415);
    await reject("an empty file is refused", { name: "empty.pdf", contentType: "application/pdf", body: new Uint8Array() }, 400);
    await reject(
      "an oversized file is refused",
      { name: "big.pdf", contentType: "application/pdf", body: new Uint8Array(26 * 1024 * 1024) },
      413
    );

    try {
      await attachResourceFile("00000000-0000-4000-8000-000000000000", {
        name: "x.pdf",
        contentType: "application/pdf",
        body: PDF,
      });
      check("an unknown resource is refused", false, "it was accepted");
    } catch (error) {
      check(
        "an unknown resource is refused",
        error instanceof ResourceFileError && error.status === 404
      );
    }

    check("a refused upload changed nothing", (await getResource(resourceId))?.fileStorageKey === second.storageKey);

    section("Detach");
    const detached = await detachResourceFile(resourceId);
    check("detach reports the removal", detached);
    check("the object is deleted", (await existsInStorage(second.storageKey)) === false);

    const afterDetach = await getResource(resourceId);
    check("the row no longer claims a file", afterDetach?.fileUploadedAt === null);
    check(
      "the key went back to a placeholder",
      (afterDetach?.fileStorageKey ?? "").includes("/inline/"),
      afterDetach?.fileStorageKey
    );
    check("detaching twice is a no-op", (await detachResourceFile(resourceId)) === false);
  } finally {
    section("Cleanup");
    if (resourceId) {
      // Best-effort object cleanup first: orphaned bytes are invisible but still
      // cost money on a real bucket.
      for (const key of keys) await storage.delete(key).catch(() => {});
      const removed = await db
        .delete(resources)
        .where(eq(resources.id, resourceId))
        .returning({ id: resources.id });
      check("throwaway resource removed", removed.length === 1);
      const leftovers = await Promise.all(keys.map(existsInStorage));
      check("no test objects left in storage", leftovers.every((exists) => !exists));
    }
  }

  console.log(`\n${passed} checks passed, ${failures.length} failed.`);
  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  - ${f}`);
    process.exitCode = 1;
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((error) => {
    console.error("\nFile storage verification crashed:", error);
    process.exit(1);
  });
