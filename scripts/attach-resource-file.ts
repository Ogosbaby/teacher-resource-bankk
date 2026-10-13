/**
 * Attach a file to a resource, from the command line.
 *
 *   npm run resources:attach -- --slug=scheme-of-work-jss2 --file=./scheme.pdf
 *   npm run resources:attach -- --slug=scheme-of-work-jss2 --detach
 *   npm run resources:attach -- --slug=scheme-of-work-jss2
 *
 * This is the operator path to the same service the upload endpoint uses, and it
 * exists because the admin area this would otherwise live in is not in the tree —
 * `src/app/admin/**` was removed, so there is no form to put an upload button in.
 * The endpoint is ready for one; until then, a file is attached from here.
 *
 * It talks to the service rather than over HTTP for the same reason
 * `scripts/seed.ts` talks to the tables directly: no session, no server to start,
 * and one implementation of the rules — the service is what refuses a bad type or
 * an oversized file, so the CLI cannot bypass what the API enforces.
 */
import "dotenv/config";
import { readFileSync, statSync } from "node:fs";
import { basename, extname } from "node:path";
import {
  formatFileSize,
  contentTypeForExtension,
  RESOURCE_FILE_TYPE_LABEL,
} from "../src/lib/content/resource-files";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.split("=").slice(1).join("=");
}

function usage(): never {
  console.error(
    "Usage:\n" +
      "  npm run resources:attach -- --slug=<resource-slug> --file=<path>\n" +
      "  npm run resources:attach -- --slug=<resource-slug> --detach\n" +
      "  npm run resources:attach -- --slug=<resource-slug>          (show current file)\n"
  );
  process.exit(1);
}

async function main() {
  const slug = arg("slug");
  if (!slug) usage();

  const resources = await import("../src/lib/services/resources.service");
  const resource = await resources.getResourceBySlug(slug!);

  if (!resource) {
    console.error(`No resource with slug "${slug}".`);
    process.exit(1);
  }

  const describe = () =>
    resource.fileUploadedAt
      ? `  file:      ${resource.fileOriginalName ?? resource.fileStorageKey}\n` +
        `  stored at: ${resource.fileStorageKey}\n` +
        `  type:      ${resource.fileType ?? "unknown"}  (${formatFileSize(resource.fileSizeBytes ?? 0)})`
      : `  file:      none attached (key "${resource.fileStorageKey}" is a placeholder)`;

  if (!arg("file") && !process.argv.includes("--detach")) {
    console.log(`Resource "${slug}" (${resource.status}):\n${describe()}`);
    return;
  }

  if (process.argv.includes("--detach")) {
    const removed = await resources.detachResourceFile(resource.id);
    console.log(removed ? `Detached the file from "${slug}".` : `"${slug}" had no file to detach.`);
    return;
  }

  const path = arg("file")!;

  let body: Uint8Array;
  try {
    if (!statSync(path).isFile()) throw new Error("not a file");
    body = new Uint8Array(readFileSync(path));
  } catch (error) {
    console.error(`Could not read "${path}": ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  // The CLI has a path and no browser, so the extension is the only signal — the
  // same rule the endpoint applies, from the content type the browser supplies.
  const extension = extname(path).replace(/^\./, "");
  const contentType = contentTypeForExtension(extension);
  if (!contentType) {
    console.error(`".${extension}" is not an accepted file type. Upload a ${RESOURCE_FILE_TYPE_LABEL}.`);
    process.exit(1);
  }

  try {
    const attached = await resources.attachResourceFile(resource.id, {
      name: basename(path),
      contentType,
      body,
    });

    console.log(`Attached ${basename(path)} to "${slug}".`);
    console.log(`  stored at: ${attached.storageKey}`);
    console.log(`  size:      ${formatFileSize(attached.sizeBytes)}`);
    console.log(`  backend:   ${attached.backend}${attached.isRemote ? "" : "  (local — not durable)"}`);
    console.log(`  download:  /api/resources/${resource.id}/download`);
  } catch (error) {
    if (error instanceof resources.ResourceFileError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}

main()
  .then(() => {
    // Explicit exit: the database half opens a pg pool that keeps the loop alive.
    process.exit(process.exitCode ?? 0);
  })
  .catch((error) => {
    console.error("\nAttach failed:", error);
    process.exit(1);
  });
