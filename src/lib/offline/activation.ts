/**
 * Activation code validation — entirely offline, against a signed batch.
 *
 * The trust chain, in order:
 *
 *   1. `activation-batch.json` is verified against its ECDSA P-256 signature.
 *      Until that passes, the code list is data we found lying around, not data
 *      we vouch for — so a failed verification refuses every code rather than
 *      honouring an unsigned edit.
 *   2. The code must not have been revoked. The list of revoked codes is a second
 *      signed document, verified against the *same* public key, and it is what
 *      lets a single code be cancelled without shipping a new batch of codes.
 *   3. The code must appear in that trusted list.
 *   4. The code must not already be bound to a different device UUID.
 *
 * Only then is a term pass granted. This is why validation and binding are a
 * single call: a code that validates but cannot bind must not report success.
 *
 * Everything here works with no network. The one async step is the WebCrypto
 * signature check, which is local CPU work.
 */
import { bindActivationCode, isCodeBoundToThisDevice } from "./device";
import {
  SHIPPED_BATCH,
  isShippedBatchTrusted,
  isValidCodeFormat,
  type ActivationCodeEntry,
} from "./activation-batch";
import { applyShippedRevocations, revocationFor } from "./activation-revocations";

// Defined alongside the batch it describes; re-exported so callers keep the one
// import they already had.
export { isValidCodeFormat };

/** Used only if a batch entry somehow carries no duration. */
const FALLBACK_MONTHS = 3;

export type ActivationFailure =
  | "malformed"
  | "unknown"
  | "revoked"
  | "already-bound-elsewhere"
  | "untrusted-batch";

export interface ActivationResult {
  ok: boolean;
  reason?: ActivationFailure;
  /** Subscription length the code grants, when valid. */
  months?: number;
  code?: string;
  note?: string;
}

/** Look a code up in the shipped batch. Does not check authenticity. */
export function findCode(rawCode: string): ActivationCodeEntry | undefined {
  const code = normalise(rawCode);
  return SHIPPED_BATCH.codes.find((c) => c.code === code);
}

export function getBatchCodes(): ActivationCodeEntry[] {
  return SHIPPED_BATCH.codes;
}

/**
 * Validate + atomically bind. `months` is taken from the signed batch, never
 * from the caller — the client cannot inflate its own entitlement.
 */
export async function redeemActivationCode(rawCode: string): Promise<ActivationResult> {
  const code = normalise(rawCode);

  if (!isValidCodeFormat(code)) {
    return { ok: false, reason: "malformed" };
  }

  // Signature first: nothing from an unverified batch is trusted, not even the
  // code list we are about to search.
  if (!(await isShippedBatchTrusted())) {
    return { ok: false, reason: "untrusted-batch" };
  }

  // Revocation is checked before the code list, and only after the batch has been
  // trusted: a code that was cancelled reads as cancelled rather than as a plain
  // unknown, and a list we cannot vouch for is never allowed to cancel anything.
  await applyShippedRevocations();
  if (revocationFor(code)) {
    return { ok: false, reason: "revoked" };
  }

  const entry = SHIPPED_BATCH.codes.find((c) => c.code === code);
  if (!entry) {
    return { ok: false, reason: "unknown" };
  }

  const months = entry.months || FALLBACK_MONTHS;

  // Already ours? Idempotent success, so a teacher re-entering their own code
  // is not told it belongs to someone else.
  if (isCodeBoundToThisDevice(code)) {
    return { ok: true, months, code, note: entry.note };
  }

  // Binding fails only when the code belongs to a different device UUID.
  if (!bindActivationCode(code)) {
    return { ok: false, reason: "already-bound-elsewhere" };
  }

  return { ok: true, months, code, note: entry.note };
}

export const ACTIVATION_ERROR_MESSAGES: Record<ActivationFailure, string> = {
  malformed: "That doesn't look like an activation code. It should look like TRB-XXXX-XXXX.",
  unknown: "We don't recognise that code. Check it for typos and try again.",
  revoked:
    "That code has been cancelled, so it can't be used on this device. Contact support if you think that's a mistake.",
  "already-bound-elsewhere":
    "This code has already been activated on another device. Contact support to move it.",
  "untrusted-batch":
    "This build's activation list failed its integrity check. Reinstall the app to repair it.",
};

function normalise(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}
