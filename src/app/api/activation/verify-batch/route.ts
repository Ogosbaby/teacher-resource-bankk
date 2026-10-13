import { NextResponse } from "next/server";
import {
  canonicalBatchPayload,
  base64UrlToBytes,
  type SignedActivationBatch,
  SHIPPED_BATCH,
} from "@/lib/offline/activation-batch";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const batch = (await req.json()) as SignedActivationBatch;
    if (!batch || !batch.publicKey || !batch.signature) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    // In Node.js, crypto.subtle is always available
    const key = await crypto.subtle.importKey(
      "jwk",
      batch.publicKey,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    );
    const data = new TextEncoder().encode(canonicalBatchPayload(batch));
    const signature = base64UrlToBytes(batch.signature);
    const valid = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, signature, data);

    return NextResponse.json({ valid: Boolean(valid) });
  } catch (err) {
    console.error("verify-batch endpoint error:", err);
    return NextResponse.json({ valid: false });
  }
}
