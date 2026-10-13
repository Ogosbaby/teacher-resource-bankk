import { NextResponse } from "next/server";
import { getStorageProvider } from "@/lib/storage";
import { ObjectNotFoundError } from "@/lib/storage/types";

// This route only ever serves objects written under allowed prefixes,
// so it cannot be turned into a generic file server by requesting an arbitrary key.
const ALLOWED_PREFIXES = ["course-covers"];

export async function GET(
  _req: Request,
  { params }: { params: { key: string[] } },
) {
  const key = params.key?.join("/") ?? "";
  const prefix = key.split("/")[0];

  if (!prefix || !ALLOWED_PREFIXES.includes(prefix)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const object = await getStorageProvider().get(key);
    const body = new ArrayBuffer(object.body.byteLength);
    new Uint8Array(body).set(object.body);
    return new NextResponse(body, {
      headers: {
        "Content-Type": object.contentType,
        // Uploaded images are content-addressed by a random UUID filename, so
        // they never change once written — safe to cache aggressively.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    console.error("Image serve error:", err);
    return NextResponse.json(
      { error: "Could not load image." },
      { status: 500 },
    );
  }
}
