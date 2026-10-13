/**
 * localStorage encryption helpers.
 *
 * Threat model, stated honestly: this protects the *substance* of stored data
 * from casual inspection and from other scripts casually reading raw
 * localStorage values. It is NOT protection from someone with code execution on
 * the device — they can read the per-install secret and decrypt everything. A
 * truly secure design needs an OS keystore (Capacitor SecureStorage / Android
 * Keystore) for the key, which is the natural next step for the native build.
 *
 * The key is a per-install random secret, not a hardcoded constant, so a copy of
 * the ciphertext taken off one device is useless on another.
 */
import CryptoJS from "crypto-js";
import { STORAGE_KEYS } from "./keys";

const isBrowser = () => typeof window !== "undefined" && !!window.localStorage;

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < bytes; i++) buf[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * The per-install secret, created on first use and reused forever after. Kept in
 * plaintext because it is the input to every other key.
 */
export function getInstallSecret(): string {
  if (!isBrowser()) return "ssr-placeholder";
  let secret = window.localStorage.getItem(STORAGE_KEYS.deviceSecret);
  if (!secret) {
    secret = randomHex(32);
    window.localStorage.setItem(STORAGE_KEYS.deviceSecret, secret);
  }
  return secret;
}

export function encryptString(plain: string): string {
  return CryptoJS.AES.encrypt(plain, getInstallSecret()).toString();
}

export function decryptString(cipher: string): string | null {
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, getInstallSecret());
    const text = bytes.toString(CryptoJS.enc.Utf8);
    return text || null;
  } catch {
    return null;
  }
}

/** Encrypt any JSON-serialisable value for localStorage. */
export function encryptJson(value: unknown): string {
  return encryptString(JSON.stringify(value));
}

/** Decrypt and parse; returns null on any tampering, key change or corruption. */
export function decryptJson<T>(cipher: string): T | null {
  const text = decryptString(cipher);
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

// ─── Typed read/write wrappers ────────────────────────────

/** Read + decrypt + parse a key. Returns null if absent or unreadable. */
export function readEncrypted<T>(key: string): T | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  return decryptJson<T>(raw);
}

export function writeEncrypted(key: string, value: unknown): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, encryptJson(value));
}

export function readPlain(key: string): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(key);
}

export function writePlain(key: string, value: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, value);
}

export function removeKey(key: string): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(key);
}
