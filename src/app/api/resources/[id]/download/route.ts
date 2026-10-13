import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth/api-guards";
import { getResource } from "@/lib/services/resources.service";
import { ObjectNotFoundError, getStorageProvider } from "@/lib/storage";

/**
 * Stream a resource's file.
 *
 * Auth-gated but not subscription-gated, matching certificates and billing:
 * gating content lives in the Server Component layouts, not in a file-serving
 * route, and a lapsed pass must never turn a 200 into a 403 for something the
 * teacher is already reading.
 *
 * The file is streamed through this route rather than handed out as a public URL,
 * so storage never has to be public and every request re-checks visibility. Keys
 * are never taken from the request — the row supplies them — so this cannot be
 * turned into a general file server the way a key-in-the-path route could.
 */
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireSessionApi();
  if ("error" in guard) return guard.error;

  const resource = await getResource(params.id);

  // Written as "not published" rather than "is draft" on purpose: a status added
  // later is then invisible by default instead of accidentally public.
  if (!resource || (resource.status !== "published" && guard.session.user.role !== "admin")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // `fileUploadedAt` is the only honest answer to "is there a file?" — the key
  // column holds a placeholder path for text-only resources.
  if (!resource.fileUploadedAt) {
    return NextResponse.json({ error: "This resource has no file to download." }, { status: 404 });
  }

  try {
    const object = await getStorageProvider().get(resource.fileStorageKey);

    // Re-wrap: a plain Uint8Array over a Node Buffer is not a valid BodyInit.
    const bytes = new Uint8Array(object.body);
    const filename = `${resource.slug}.${resource.fileType ?? "bin"}`;

    return new Response(bytes, {
      headers: {
        "Content-Type": object.contentType || "application/octet-stream",
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      // The row points at an object that is gone — usually local storage was
      // cleared between runs. Say so rather than returning an empty 200.
      return NextResponse.json(
        { error: "The file is missing from storage." },
        { status: 404 }
      );
    }
    console.error("[resources] file download failed:", error);
    return NextResponse.json({ error: "Could not read that file." }, { status: 500 });
  }
}
