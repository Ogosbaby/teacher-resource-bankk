/**
 * The encrypted 3-month subscription token.
 *
 * This is the offline entitlement: it proves the device holds an active term
 * pass without asking the server. The server-side `subscriptions` table remains
 * the billing source of truth, and this token is what gets synced up to it when
 * a connection is available (see `syncTermPass`). A lapsed token never deletes
 * anything — it just stops unlocking new content.
 */
import CryptoJS from "crypto-js";
import { STORAGE_KEYS } from "./keys";
import { readEncrypted, removeKey, writeEncrypted, getInstallSecret } from "./crypto";
import { getDeviceId } from "./device";

export interface TermPass {
  /** Opaque token id, stored alongside the human-readable code. */
  token: string;
  code: string;
  deviceId: string;
  issuedAt: number;
  expiresAt: number;
  months: number;
  /** Cryptographic MAC ensuring expiry and tokens have not been forged/tampered */
  mac?: string;
  /** Set once the server has acknowledged this pass; drives sync retries. */
  syncedAt?: number;
}

export const DEFAULT_TERM_MONTHS = 3;

/**
 * True for the pass handed out by the payment placeholder, which carries no code
 * at all. It is the one pass a code revocation can never apply to, so the test
 * lives here rather than in the sync module that used to own it — the wizard, the
 * sync and revocation reconciliation all have to agree on what "demo" means.
 */
export function isDemoPassCode(code: string): boolean {
  return code.startsWith("demo");
}

function addMonths(from: number, months: number): number {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d.getTime();
}

function computePassSignature(pass: {
  token: string;
  code: string;
  deviceId: string;
  issuedAt: number;
  expiresAt: number;
  months: number;
}): string {
  const payload = `${pass.token}:${pass.code}:${pass.deviceId}:${pass.issuedAt}:${pass.expiresAt}:${pass.months}`;
  return CryptoJS.HmacSHA256(payload, getInstallSecret()).toString(CryptoJS.enc.Hex);
}

/**
 * Issue (or extend) a term pass for this device. Extending an existing pass adds
 * the new months on top of the current expiry rather than resetting it, so
 * redeeming a code early never costs the teacher time they already paid for.
 */
export function grantTermPass(code: string, months = DEFAULT_TERM_MONTHS): TermPass {
  const now = Date.now();
  const existing = getTermPass();
  const base = existing && existing.expiresAt > now ? existing.expiresAt : now;

  const core = {
    token: `trb_${now.toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
    code,
    deviceId: getDeviceId(),
    issuedAt: existing?.issuedAt ?? now,
    expiresAt: addMonths(base, months),
    months,
  };

  const pass: TermPass = {
    ...core,
    mac: computePassSignature(core),
  };

  writeEncrypted(STORAGE_KEYS.termPass, pass);
  return pass;
}

export function getTermPass(): TermPass | null {
  return readEncrypted<TermPass>(STORAGE_KEYS.termPass);
}

export function isTermPassActive(): boolean {
  const pass = getTermPass();
  if (!pass) return false;
  // A pass minted on another device UUID (restored backup) is not valid here.
  if (pass.deviceId !== getDeviceId()) return false;
  // Anti-tamper verification: if MAC is present, ensure pass was not forged/tampered in storage
  if (pass.mac) {
    const expected = computePassSignature(pass);
    if (pass.mac !== expected) {
      console.warn("Term pass integrity verification failed (tampered data).");
      clearTermPass();
      return false;
    }
  }
  return pass.expiresAt > Date.now();
}

export function daysUntilExpiry(): number | null {
  const pass = getTermPass();
  if (!pass) return null;
  return Math.max(0, Math.ceil((pass.expiresAt - Date.now()) / (24 * 60 * 60 * 1000)));
}

export function markTermPassSynced(): void {
  const pass = getTermPass();
  if (!pass) return;
  writeEncrypted(STORAGE_KEYS.termPass, { ...pass, syncedAt: Date.now() });
}

export function clearTermPass(): void {
  removeKey(STORAGE_KEYS.termPass);
}

// ─── Revocation ───────────────────────────────────────────

/**
 * A revocation is recorded rather than silently dropped, because a pass that
 * simply vanishes is indistinguishable from a bug: the teacher would be bounced
 * to registration with no explanation. Recording the reason lets the wizard say
 * what happened.
 */
export interface TermPassRevocation {
  reason: string;
  at: number;
}

export function markTermPassRevoked(reason: string): TermPassRevocation {
  const revocation: TermPassRevocation = { reason, at: Date.now() };
  writeEncrypted(STORAGE_KEYS.termPassRevoked, revocation);
  return revocation;
}

export function getTermPassRevocation(): TermPassRevocation | null {
  return readEncrypted<TermPassRevocation>(STORAGE_KEYS.termPassRevoked);
}

export function clearTermPassRevocation(): void {
  removeKey(STORAGE_KEYS.termPassRevoked);
}
