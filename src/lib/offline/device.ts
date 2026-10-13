/**
 * Device identity and recognition.
 *
 * The device UUID is generated once per install and never leaves the device. It
 * is the anchor for two separate guarantees:
 *
 *  1. **Recognition** — a device token proves this install has completed
 *     registration before, so the splash screen can skip straight to the app.
 *  2. **Code binding** — an activation code is bound to exactly one device UUID,
 *     so the same code cannot be redeemed on a second device.
 *
 * Both are verified offline: there is no server round-trip, which is what makes
 * registration work with no network at all.
 *
 * **Limit worth stating plainly.** The local binding map can only reject codes
 * this install has already seen. A brand-new device with an empty store has no
 * record that a code was used elsewhere, so it will accept it — no purely local
 * scheme can do better, because there is nothing to consult. True cross-device
 * prevention needs a global view, which is the server's job: the sync route
 * holds a unique reference per code and rejects a redemption from a second
 * account. When that happens the client records a `FOREIGN_BINDING` here
 * (`blockCodeLocally`), so the device stops honouring the code offline too.
 */
import { STORAGE_KEYS } from "./keys";
import { readEncrypted, removeKey, writeEncrypted, readPlain, writePlain } from "./crypto";

export interface DeviceToken {
  deviceId: string;
  issuedAt: number;
  /** When device recognition stops being honoured and re-registration is required. */
  expiresAt: number;
  /** The activation code this device was first bound with, if any. */
  boundActivationCode?: string;
  /** Marks that the registration wizard completed on this device. */
  registrationComplete: boolean;
}

export interface ActivationBindings {
  [code: string]: { deviceId: string; boundAt: number };
}

/** How long a device stays "recognised" before it must re-register. */
const DEVICE_TOKEN_TTL_DAYS = 365;

function randomUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for older WebViews without crypto.randomUUID.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * The mock hardware UUID: generated once, persisted in plaintext (it carries no
 * personal data), and stable across launches.
 */
export function getDeviceId(): string {
  let id = readPlain(STORAGE_KEYS.deviceId);
  if (!id) {
    id = randomUuid();
    writePlain(STORAGE_KEYS.deviceId, id);
  }
  return id;
}

// ─── Device token ─────────────────────────────────────────

export function getDeviceToken(): DeviceToken | null {
  return readEncrypted<DeviceToken>(STORAGE_KEYS.deviceToken);
}

export function isDeviceTokenValid(token: DeviceToken | null): boolean {
  if (!token) return false;
  // A token from a different install (e.g. restored backup) is not this device.
  if (token.deviceId !== getDeviceId()) return false;
  return token.expiresAt > Date.now();
}

/**
 * Writes the device token. Called after the wizard completes and after a
 * successful activation-code redemption.
 */
export function registerDevice(boundActivationCode?: string): DeviceToken {
  const now = Date.now();
  const token: DeviceToken = {
    deviceId: getDeviceId(),
    issuedAt: now,
    expiresAt: now + DEVICE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    boundActivationCode,
    registrationComplete: true,
  };
  writeEncrypted(STORAGE_KEYS.deviceToken, token);
  return token;
}

export function clearDeviceToken(): void {
  removeKey(STORAGE_KEYS.deviceToken);
}

/** The single question the splash screen asks. */
export function isRecognisedDevice(): boolean {
  return isDeviceTokenValid(getDeviceToken());
}

// ─── Activation code binding ──────────────────────────────

export function getActivationBindings(): ActivationBindings {
  return readEncrypted<ActivationBindings>(STORAGE_KEYS.activationBindings) ?? {};
}

export function getActivationBinding(code: string): ActivationBindings[string] | undefined {
  return getActivationBindings()[normaliseCode(code)];
}

/**
 * Binds a code to this device. Returns `false` if the code is already bound to a
 * *different* device UUID — the reuse rejection the spec requires. Re-binding on
 * the same device is idempotent and allowed.
 */
export function bindActivationCode(code: string): boolean {
  const normalised = normaliseCode(code);
  const deviceId = getDeviceId();
  const bindings = getActivationBindings();
  const existing = bindings[normalised];

  if (existing && existing.deviceId !== deviceId) return false;

  bindings[normalised] = { deviceId, boundAt: Date.now() };
  writeEncrypted(STORAGE_KEYS.activationBindings, bindings);
  return true;
}

export function isCodeBoundToThisDevice(code: string): boolean {
  return getActivationBinding(code)?.deviceId === getDeviceId();
}

/**
 * Sentinel recorded against a code the *server* rejected as belonging to another
 * account. It is not a real device UUID, so `bindActivationCode` treats the code
 * as bound elsewhere and refuses it from then on.
 */
export const FOREIGN_BINDING = "__server_rejected__";

/**
 * Permanently block a code on this device after the server reports it was used
 * elsewhere. Without this, an offline device would keep accepting a stolen code
 * after its next successful reconnect.
 */
export function blockCodeLocally(code: string): void {
  const bindings = getActivationBindings();
  bindings[normaliseCode(code)] = { deviceId: FOREIGN_BINDING, boundAt: Date.now() };
  writeEncrypted(STORAGE_KEYS.activationBindings, bindings);
}

export function normaliseCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}
