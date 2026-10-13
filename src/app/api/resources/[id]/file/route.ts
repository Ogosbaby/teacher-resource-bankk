import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/api-guards";
import {
  ResourceFileError,
  attachResourceFile,
  detachResourceFile,
} from "@/lib/services/resources.service";

/**
 * Attach a file to a resource, or take it away.
 *
 * Admin-only, because the resource bank is the shared, reviewed content the
 * teachers read — not a teacher's own upload. `requireAdminApi` rather than
 * `requireSessionApi` is what keeps a teacher from writing into it.
 *
 * Storage goes through `getStorageProvider()`, so this route does not know or care
 * whether the backend is R2 or the local fallback; the response reports which one
 * took the file, because "stored locally" is not durable and the caller deserves
 * to know that.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'Attach the file under a "file" field.' },
      { status: 400 }
    );
  }

  try {
    const attached = await attachResourceFile(params.id, {
      name: file.name || "resource",
      // An empty type is common from hand-rolled clients; the service rejects it
      // with a clear message rather than storing an untyped object.
      contentType: file.type || "application/octet-stream",
      body: new Uint8Array(await file.arrayBuffer()),
    });

    return NextResponse.json({ ok: true, ...attached });
  } catch (error) {
    if (error instanceof ResourceFileError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[resources] file upload failed:", error);
    return NextResponse.json({ error: "Could not store that file." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const removed = await detachResourceFile(params.id);
    if (!removed) {
      return NextResponse.json({ error: "That resource has no file attached." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[resources] file detach failed:", error);
    return NextResponse.json({ error: "Could not remove that file." }, { status: 500 });
  }
}
