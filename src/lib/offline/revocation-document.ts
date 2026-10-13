/**
 * The shape of a revocation list, and nothing else.
 *
 * Split out from `activation-revocations.ts` for one practical reason: that module
 * imports the shipped JSON, and the script that *writes* that JSON has to be able
 * to import the document shape before the file exists. Keeping the wire format in
 * a module with no imports at all breaks that circle, and it leaves one definition
 * of the bytes that are signed — shared by the Node signer, the browser verifier
 * and the CLI, so they cannot drift apart.
 *
 * Nothing here touches storage, crypto or the DOM.
 */

/** One code, as it appears on the wire (shipped file or sync response). */
export interface RevocationEntry {
  code: string;
  /** Shown to the teacher when they are told why access was removed. */
  reason?: string;
  /** ISO timestamp, when the issuer knows it. */
  revokedAt?: string;
}

/**
 * A signed revocation list. Deliberately carries no `publicKey`: see
 * `activation-revocations.ts` for why it is verified against the shipped batch's
 * key instead, so the document cannot authorise itself with a key of its own
 * choosing.
 */
export interface SignedRevocationList {
  version: number;
  issuedAt: string;
  revokedCodes: RevocationEntry[];
  /** base64url ECDSA P-256 signature (raw r‖s) over the canonical payload. */
  signature: string;
}

/** Bumped only if the canonical payload's shape ever changes. */
export const REVOCATION_LIST_VERSION = 1;

/**
 * The canonical payload that gets signed. The codes are sorted so the signature
 * cannot depend on the order the revoke script happened to build the list in —
 * the same list must always produce the same bytes, or a re-signed file would
 * fail to verify for a reason nobody could see.
 *
 * Only the codes are signed, not their reasons or timestamps: those are text shown
 * to a teacher, and copying the batch's convention (which signs the duration but
 * not the note) keeps the two documents consistent.
 */
export function canonicalRevocationPayload(
  list: Pick<SignedRevocationList, "version" | "issuedAt" | "revokedCodes">
): string {
  const codes = list.revokedCodes
    .map((entry) => entry.code.trim().toUpperCase().replace(/\s+/g, ""))
    .sort();
  return [`v${list.version}`, list.issuedAt, codes.join(",")].join("|");
}
