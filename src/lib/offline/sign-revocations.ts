/**
 * Signing a revocation list, server side.
 *
 * Node-only: this module imports `node:crypto`, so it must never be reachable
 * from a client component, and it is deliberately **not** re-exported from
 * `@/lib/offline`'s barrel — the app bundle imports that barrel. Its only callers
 * are the sync route and `scripts/revoke-activation-codes.ts`.
 *
 * Why sign a list that arrives over an authenticated HTTPS response at all: the
 * live channel can be intercepted. A school proxy with an installed root
 * certificate is an ordinary thing to find in this app's deployment context, and
 * without a signature such a proxy could cancel any teacher's code on their
 * device, permanently, because revocations are merged and never expire. With the
 * signature a cancelled code has to have been cancelled by the holder of the
 * private key, exactly like a code has to have been minted by them.
 *
 * The key is read at call time rather than at import time, so an unconfigured
 * server is a runtime decision (omit the document) instead of a build failure.
 * When it is absent the route falls back to the plain list, and
 * `activation-revocations.ts` explains what that does and does not protect.
 *
 * The PEM belongs to the same P-256 keypair that signs the code batch, because
 * the client verifies this document against the *batch's* public key — a key that
 * does not match produces signatures the app refuses, so `codes:revoke` checks
 * the match explicitly before writing a file.
 */
import { createPrivateKey, sign, type KeyObject } from "node:crypto";
import { bytesToBase64Url } from "./activation-batch";
import {
  REVOCATION_LIST_VERSION,
  canonicalRevocationPayload,
  type RevocationEntry,
  type SignedRevocationList,
} from "./revocation-document";

/** Read `ACTIVATION_SIGNING_KEY`, accepting a raw PEM, a base64 PEM, or escaped `\n`. */
export function loadSigningKey(): KeyObject | null {
  const raw = process.env.ACTIVATION_SIGNING_KEY?.trim();
  if (!raw) return null;

  try {
    const pem = raw.includes("BEGIN") ? raw.replace(/\\n/g, "\n") : Buffer.from(raw, "base64").toString("utf8");
    return createPrivateKey(pem);
  } catch {
    // A malformed key is treated as no key. Silently degrading to an unsigned
    // list is worse than failing loudly, but this runs inside a background sync
    // route where throwing would only turn into a 500 for a teacher who is
    // already offline. The route reports which form it used.
    console.error("[trb] ACTIVATION_SIGNING_KEY is set but could not be parsed as a private key.");
    return null;
  }
}

export function hasSigningKey(): boolean {
  return loadSigningKey() !== null;
}

/**
 * The one place a revocation list is put on the wire in signed form, so the bytes
 * signed here and the bytes verified in the app can never drift. `codes:revoke`
 * calls this too, with the key it read from disk.
 */
export function signRevocationDocumentWithKey(
  key: KeyObject,
  revokedCodes: readonly RevocationEntry[],
  issuedAt: Date = new Date()
): SignedRevocationList {
  const unsigned = {
    version: REVOCATION_LIST_VERSION,
    issuedAt: issuedAt.toISOString(),
    revokedCodes: revokedCodes.map((entry) => ({
      code: entry.code.trim().toUpperCase(),
      ...(entry.reason ? { reason: entry.reason } : {}),
      ...(entry.revokedAt ? { revokedAt: entry.revokedAt } : {}),
    })),
  };

  const payload = Buffer.from(canonicalRevocationPayload(unsigned), "utf8");
  const signature = sign("sha256", payload, {
    key,
    // ieee-p1363 gives raw r‖s, which is exactly what WebCrypto's ECDSA verify
    // expects. Node's default DER encoding would fail verification in the app.
    dsaEncoding: "ieee-p1363",
  });

  return { ...unsigned, signature: bytesToBase64Url(new Uint8Array(signature)) };
}

/** Sign with the server's configured key, or `null` when it has none. */
export function signRevocationDocument(
  revokedCodes: readonly RevocationEntry[],
  issuedAt: Date = new Date()
): SignedRevocationList | null {
  const key = loadSigningKey();
  if (!key) return null;
  return signRevocationDocumentWithKey(key, revokedCodes, issuedAt);
}
