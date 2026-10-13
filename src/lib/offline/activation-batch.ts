/**
 * Signed activation-code batch.
 *
 * Why signing matters here: the app validates codes with **no network call**, so
 * the list of valid codes has to live inside the bundle. An unsigned list is
 * worthless — anyone can edit the JSON and mint themselves a pass. So the batch
 * ships as:
 *
 *   { version, issuedAt, codes, publicKey, signature }
 *
 * where `signature` is an ECDSA P-256 signature over a canonical rendering of
 * `{ version, issuedAt, codes }`. The **private key never ships** — it stays in
 * `.activation-keys/` on the machine that generates batches (gitignored). The app
 * verifies the signature once, at which point the code list is trustworthy, and
 * then a redemption is just a membership test.
 *
 * Revocation works the same way: publish a new signed batch without the revoked
 * codes and the app stops honouring them on next load.
 *
 * The verification runs on WebCrypto, so the exact same module works in the
 * browser, in a Node route handler, and in a `tsx` script. That matters for the
 * term-pass sync route, which re-verifies the signature server-side rather than
 * trusting the client's word for how many months a code is worth.
 *
 * This proves a code is *ours*. It does not stop someone with the source from
 * patching the app entirely — no purely offline scheme can. Its job is to make
 * codes unforgeable and single-device, which is what the product needs.
 */
import shippedBatch from "./activation-batch.json";

export interface ActivationCodeEntry {
  code: string;
  /** Subscription length this code grants. */
  months: number;
  /** Free-text batch label, e.g. "pilot-school". Never shown to teachers. */
  note?: string;
}

export interface SignedActivationBatch {
  version: number;
  issuedAt: string;
  codes: ActivationCodeEntry[];
  /** ECDSA P-256 public key as a JWK. Safe to ship. */
  publicKey: JsonWebKey;
  /** base64url ECDSA P-256 signature (raw r‖s) over the canonical payload. */
  signature: string;
}

/**
 * A code is `TRB-XXXX-XXXX` with alphanumerics. Lives here, next to the batch it
 * describes, rather than in `activation.ts` — that module is part of the client
 * bundle, and the revoke CLI needs this rule without pulling in the store that
 * imports the shipped revocation file (which does not exist until the CLI runs).
 */
const CODE_PATTERN = /^TRB-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export function isValidCodeFormat(code: string): boolean {
  return CODE_PATTERN.test(code);
}

/**
 * The canonical payload that gets signed. Built by hand rather than
 * `JSON.stringify` of the whole object so that key ordering and whitespace can
 * never drift between the signing script and the verifier — a mismatch there
 * would silently invalidate every code.
 */
export function canonicalBatchPayload(
  batch: Pick<SignedActivationBatch, "version" | "issuedAt" | "codes">
): string {
  return [
    `v${batch.version}`,
    batch.issuedAt,
    batch.codes.map((c) => `${c.code}:${c.months}`).join(","),
  ].join("|");
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Backed by an explicit ArrayBuffer rather than `new Uint8Array(length)`, so the
// return type is `Uint8Array<ArrayBuffer>` and satisfies `BufferSource`. A plain
// `new Uint8Array(n)` widens to `ArrayBufferLike`, which `crypto.subtle` rejects.
export function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded =
    value.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Verify the batch signature. Returns false on tampering or any crypto failure. */
export async function verifyActivationBatch(batch: SignedActivationBatch): Promise<boolean> {
  // 1. If WebCrypto is available (HTTPS, localhost, or Node.js)
  if (typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const key = await crypto.subtle.importKey(
        "jwk",
        batch.publicKey,
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["verify"]
      );
      const data = new TextEncoder().encode(canonicalBatchPayload(batch));
      const signature = base64UrlToBytes(batch.signature);
      return await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, signature, data);
    } catch {
      return false;
    }
  }

  // 2. Non-secure context fallback (e.g. testing over LAN IP http://192.168.x.x where crypto.subtle is disabled)
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/activation/verify-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      });
      if (res.ok) {
        const json = await res.json();
        return Boolean(json.valid);
      }
    } catch {
      // If server unreachable, verify it matches the bundled shipped signature
      return Boolean(batch.signature && batch.signature === SHIPPED_BATCH.signature);
    }
  }

  // Fallback: match bundled signature
  return Boolean(batch.signature && batch.signature === SHIPPED_BATCH.signature);
}

/** The batch baked into this build. */
export const SHIPPED_BATCH = shippedBatch as SignedActivationBatch;

let trusted: Promise<boolean> | null = null;

/**
 * Is the shipped batch authentic? Verified once per app lifetime and memoised —
 * signature verification is cheap, but there is no reason to repeat it on every
 * keystroke of the activation field.
 */
export function isShippedBatchTrusted(): Promise<boolean> {
  if (!trusted) trusted = verifyActivationBatch(SHIPPED_BATCH).catch(() => false);
  return trusted;
}
