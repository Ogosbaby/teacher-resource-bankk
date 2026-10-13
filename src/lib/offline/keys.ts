/**
 * Offline storage keys.
 *
 * Everything the app needs to remember between launches lives under a `trb.`
 * namespaced key. Every value written here is encrypted (see `./crypto`) unless
 * it is explicitly non-sensitive — the device secret and the device id are the
 * only plaintext entries, because the secret is what encrypts everything else
 * and the id is a random opaque handle with no personal data in it.
 */
export const STORAGE_KEYS = {
  /** Per-install secret used to derive the encryption key. Plaintext by necessity. */
  deviceSecret: "trb.device.secret",
  /** Random per-install hardware handle. Not personal data. */
  deviceId: "trb.device.id",
  /** Encrypted device token — the thing the splash screen validates. */
  deviceToken: "trb.device.token",
  /** Encrypted `{ code -> { deviceId, boundAt } }` map, one entry per redeemed code. */
  activationBindings: "trb.activation.bindings",
  /**
   * Encrypted revocation store: every code this device must refuse, however it
   * learned about it. Survives restarts because a revoked code has to stay
   * revoked with no network to re-check against.
   */
  activationRevocations: "trb.activation.revocations",
  /** Encrypted 3-month subscription token. */
  termPass: "trb.term.pass",
  /** Set when the server revokes a pass; shown to the teacher once, on next launch. */
  termPassRevoked: "trb.term.pass.revoked",
  /** Encrypted in-progress registration, so a refresh mid-wizard loses nothing. */
  registrationDraft: "trb.registration.draft",
  /** Permanent encrypted profile of the teacher on this device (name, class levels, subjects). */
  teacherProfile: "trb.teacher.profile",
  /** Hidden timestamp logged on each app open to detect clock rollback. */
  lastOpenedTimestamp: "trb.device.last_opened_timestamp",
  /** Flagged if the device clock moves backwards relative to last_opened_timestamp. */
  clockTampered: "trb.device.clock_tampered",
  /** Encrypted local offline storage for finalized lesson plans. */
  savedLessonPlans: "trb.lesson_plans.saved",
  /** Local AI model download state. */
  localModel: "trb.model.qwen",
  /** Marks the launch splash as already shown this app session. */
  splashShown: "trb.splash.shown",
  /** Legacy handoff flag — set before navigating a freshly-registered user on. */
  postSignupSplash: "trb-post-signup-splash",
} as const;
