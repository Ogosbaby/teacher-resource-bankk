/**
 * Per-code revocation.
 *
 * A code grants entitlement offline, so "is this code still valid?" is answered
 * from data on the device, not from a server. Revocation therefore has to arrive
 * through the same kind of channel the codes do — verifiable with no network —
 * and it has to *stay* honoured afterwards, including on a device that never
 * reconnects.
 *
 * Two channels feed one encrypted store:
 *
 *   - **Shipped** (`activation-revocations.json`): a signed list baked into the
 *     bundle. This is the channel that reaches a device with no connection at
 *     all, and the reason revocations are signed at all — the file sits in a
 *     bundle anyone can edit, and an unsigned edit there could cancel any
 *     teacher's code. The signature is checked against the *shipped batch's*
 *     public key rather than one carried in the file, so the document cannot
 *     authorise itself with a key of its own choosing.
 *   - **Live** (`POST /api/subscriptions/sync`): the same list served from the
 *     server, so a device learns about a revocation that postdates its build
 *     without waiting for an app update. It is read from an authenticated
 *     session over TLS and may carry its own signature when the server is
 *     configured with the signing key; either way it is merged, never treated as
 *     a replacement for what the device already knows.
 *
 * Merging is monotonic: entries are only ever added, never removed. That is what
 * makes the store worth persisting, and it has one cost worth stating plainly — a
 * tampered live response can only ever *add* revocations, so the worst it can do
 * is cancel a teacher's code (a denial of service, never a grant), and because
 * entries are never removed that denial also sticks. Signing the live list is what
 * takes the possibility away; the shipped list is signed unconditionally. The
 * store is encrypted and persistent rather than held in memory because offline is
 * exactly when it has to work.
 *
 * The reconciliation at the bottom is what turns the store into an action: a
 * device holding a pass for a revoked code loses the pass, the device token and
 * the code itself, and is sent back to registration with an explanation.
 */
import { STORAGE_KEYS } from "./keys";
import { readEncrypted, writeEncrypted } from "./crypto";
import { blockCodeLocally, clearDeviceToken, normaliseCode } from "./device";
import {
  SHIPPED_BATCH,
  base64UrlToBytes,
  isShippedBatchTrusted,
} from "./activation-batch";
import {
  clearTermPass,
  getTermPass,
  isDemoPassCode,
  markTermPassRevoked,
} from "./term-pass";
import {
  canonicalRevocationPayload,
  type RevocationEntry,
  type SignedRevocationList,
} from "./revocation-document";
import shippedRevocations from "./activation-revocations.json";

// The wire shape and its canonical payload live in `revocation-document.ts` —
// see that file for why — and are re-exported so the whole feature is one import.
export { REVOCATION_LIST_VERSION, canonicalRevocationPayload } from "./revocation-document";
export type { RevocationEntry, SignedRevocationList } from "./revocation-document";

/**
 * Where a revocation came from. Kept per entry because it is the only way to
 * tell a code we verified ourselves from one a server merely asserted.
 */
export type RevocationSource = "shipped" | "signed" | "server";

export interface RevocationRecord {
  reason: string;
  /** Epoch ms. */
  revokedAt: number;
  source: RevocationSource;
}

export type RevocationStore = Record<string, RevocationRecord>;

const UNKNOWN_REASON = "This code was cancelled by support.";

/**
 * Verify a revocation list. Returns false on tampering or any crypto failure.
 *
 * An empty list is accepted when it is signed. Editing codes into or out of a
 * document breaks its signature either way, so there is nothing to gain by
 * rejecting the empty case — it would only make a stripped-down document more
 * powerful than a signed one.
 */
export async function verifyRevocationList(list: SignedRevocationList): Promise<boolean> {
  if (!Array.isArray(list.revokedCodes)) return false;

  if (typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const key = await crypto.subtle.importKey(
        "jwk",
        SHIPPED_BATCH.publicKey,
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["verify"]
      );
      const data = new TextEncoder().encode(canonicalRevocationPayload(list));
      const signature = base64UrlToBytes(list.signature);
      return await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, signature, data);
    } catch {
      return false;
    }
  }

  return Boolean(list.signature && list.signature === SHIPPED_REVOCATIONS.signature);
}

/** The revocation list baked into this build. */
export const SHIPPED_REVOCATIONS = shippedRevocations as SignedRevocationList;

// ─── The device's store ───────────────────────────────────

export function getRevocationStore(): RevocationStore {
  return readEncrypted<RevocationStore>(STORAGE_KEYS.activationRevocations) ?? {};
}

/**
 * Merge entries into the store. Existing records win: revocation is monotonic, so
 * the first reason recorded for a code is the one that stands, and only a
 * genuinely new code counts as a change. Returns how many were new.
 */
export function recordRevocations(
  entries: readonly RevocationEntry[],
  source: RevocationSource
): number {
  const store = getRevocationStore();
  let added = 0;

  for (const entry of entries) {
    if (!entry?.code) continue;
    const code = normaliseCode(entry.code);
    if (store[code]) continue;

    store[code] = {
      reason: entry.reason?.trim() || UNKNOWN_REASON,
      revokedAt: entry.revokedAt ? Date.parse(entry.revokedAt) || Date.now() : Date.now(),
      source,
    };
    added += 1;
  }

  if (added > 0) writeEncrypted(STORAGE_KEYS.activationRevocations, store);
  return added;
}

export function isCodeRevoked(code: string): boolean {
  return normaliseCode(code) in getRevocationStore();
}

export function revocationFor(code: string): RevocationRecord | null {
  return getRevocationStore()[normaliseCode(code)] ?? null;
}

// ─── The shipped channel ──────────────────────────────────

let applied: Promise<number> | null = null;

/**
 * Fold this build's signed revocation list into the store. Verified once per app
 * lifetime and memoised — the same treatment, and for the same reason, as the
 * code batch itself.
 *
 * A failed verification records nothing rather than throwing: the store is
 * additive, so the safe outcome is to keep whatever the device already honours.
 * Note the ordering — the batch is checked first, because a revocation list is
 * only as trustworthy as the batch it was signed alongside.
 */
export function applyShippedRevocations(): Promise<number> {
  if (!applied) {
    applied = (async () => {
      if (!(await isShippedBatchTrusted())) return 0;
      if (!(await verifyRevocationList(SHIPPED_REVOCATIONS))) return 0;
      return recordRevocations(SHIPPED_REVOCATIONS.revokedCodes, "shipped");
    })().catch(() => 0);
  }
  return applied;
}

/**
 * Record a signed list that arrived at runtime (the sync route, when the server
 * holds the signing key). Unverifiable input is discarded silently — the caller
 * is a background sync with nobody to report to.
 */
export async function recordSignedRevocations(list: SignedRevocationList): Promise<number> {
  if (!(await verifyRevocationList(list))) return 0;
  return recordRevocations(list.revokedCodes, "signed");
}

// ─── Reconciliation ───────────────────────────────────────

/**
 * Drop this device's term pass if the code behind it has been revoked.
 *
 * Every consequence is deliberate:
 *
 *  - `blockCodeLocally` keeps the code refused offline forever, so a later
 *    reconnect cannot quietly re-accept it.
 *  - The device token goes too. A recognised device slides past the splash into
 *    the app, so leaving the token in place would mean a revoked teacher keeps
 *    their session while only the pass disappears.
 *  - The revocation *reason* is recorded instead of the pass simply vanishing:
 *    a pass that disappears with no explanation is indistinguishable from a bug.
 *
 * Returns the reason when a pass was dropped, or null when there was nothing to
 * do. A demo pass carries no code and is never revoked here.
 */
export function reconcileTermPassWithRevocations(): string | null {
  const pass = getTermPass();
  if (!pass || isDemoPassCode(pass.code)) return null;

  const revocation = revocationFor(pass.code);
  if (!revocation) return null;

  blockCodeLocally(pass.code);
  clearTermPass();
  clearDeviceToken();

  const reason = `${revocation.reason} The pass on this device was removed — enter a valid activation code to continue.`;
  markTermPassRevoked(reason);
  return reason;
}
