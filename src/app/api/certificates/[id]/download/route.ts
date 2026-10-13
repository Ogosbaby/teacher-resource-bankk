import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireSessionApi } from "@/lib/auth/api-guards";
import { db } from "@/lib/db/client";
import { certificates } from "@/lib/db/schema";
import { ObjectNotFoundError, getStorageProvider } from "@/lib/storage";
import { slugify } from "@/lib/utils/slug";

/**
 * Stream a certificate PDF.
 *
 * Auth-gated but deliberately NOT subscription-gated: a teacher keeps access to
 * certificates they already earned even if their term pass has lapsed.
 *
 * The file is streamed through this route rather than served from a public URL,
 * so ownership is checked on every request and storage never has to be public.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireSessionApi();
  if ("error" in guard) return guard.error;

  const [certificate] = await db
    .select()
    .from(certificates)
    .where(
      and(eq(certificates.id, params.id), eq(certificates.userId, guard.session.user.id))
    )
    .limit(1);

  if (!certificate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const object = await getStorageProvider().get(certificate.storageKey);
    const filename = `${slugify(certificate.titleSnapshot)}-certificate.pdf`;

    // Re-wrap so the buffer is a plain ArrayBuffer-backed view — BodyInit won't
    // accept a SharedArrayBuffer-typed Uint8Array.
    const bytes = new Uint8Array(object.body);

    return new Response(bytes, {
      headers: {
        "Content-Type": object.contentType || "application/pdf",
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      // The row exists but the file doesn't — usually storage was reset in dev.
      return NextResponse.json(
        { error: "The certificate file is missing from storage." },
        { status: 404 }
      );
    }
    console.error("[certificate] download failed:", err);
    return NextResponse.json({ error: "Could not read the certificate." }, { status: 500 });
  }
}
