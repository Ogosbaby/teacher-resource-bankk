/**
 * Offline-first layer.
 *
 * Everything the registration flow, the splash screen and the entitlement checks
 * need to work with no network. Import from here rather than reaching into
 * individual modules so the surface stays in one place.
 *
 * Note: nothing in here imports via the `@/` alias, so the whole layer is
 * importable from a plain `tsx` script with no path-mapping setup (see
 * scripts/verify-offline-flow.ts).
 */
export { STORAGE_KEYS } from "./keys";

export {
  encryptJson,
  decryptJson,
  encryptString,
  decryptString,
  readEncrypted,
  writeEncrypted,
  readPlain,
  writePlain,
  removeKey,
  getInstallSecret,
} from "./crypto";

export {
  getDeviceId,
  getDeviceToken,
  isDeviceTokenValid,
  isRecognisedDevice,
  registerDevice,
  clearDeviceToken,
  bindActivationCode,
  getActivationBinding,
  getActivationBindings,
  isCodeBoundToThisDevice,
  blockCodeLocally,
  normaliseCode,
  FOREIGN_BINDING,
  type DeviceToken,
  type ActivationBindings,
} from "./device";

export {
  redeemActivationCode,
  isValidCodeFormat,
  findCode,
  getBatchCodes,
  ACTIVATION_ERROR_MESSAGES,
  type ActivationResult,
  type ActivationFailure,
} from "./activation";

export {
  SHIPPED_BATCH,
  canonicalBatchPayload,
  verifyActivationBatch,
  isShippedBatchTrusted,
  bytesToBase64Url,
  base64UrlToBytes,
  type ActivationCodeEntry,
  type SignedActivationBatch,
} from "./activation-batch";

export {
  grantTermPass,
  getTermPass,
  isTermPassActive,
  daysUntilExpiry,
  isDemoPassCode,
  markTermPassSynced,
  clearTermPass,
  markTermPassRevoked,
  getTermPassRevocation,
  clearTermPassRevocation,
  DEFAULT_TERM_MONTHS,
  type TermPass,
  type TermPassRevocation,
} from "./term-pass";

export {
  applyShippedRevocations,
  canonicalRevocationPayload,
  getRevocationStore,
  isCodeRevoked,
  reconcileTermPassWithRevocations,
  recordRevocations,
  recordSignedRevocations,
  revocationFor,
  verifyRevocationList,
  REVOCATION_LIST_VERSION,
  SHIPPED_REVOCATIONS,
  type RevocationEntry,
  type RevocationRecord,
  type RevocationSource,
  type SignedRevocationList,
} from "./activation-revocations";

export {
  loadDraft,
  saveDraft,
  clearDraft,
  reconcileSubjects,
  EMPTY_DRAFT,
  type RegistrationDraft,
} from "./registration-draft";

export {
  getModelState,
  isModelReady,
  provisionLocalModel,
  discardTransferredModel,
  formatBytes,
  MODEL_SIZE_BYTES,
  type ModelState,
  type ModelStatus,
} from "./local-model";

export {
  syncTermPassWithServer,
  retryPendingSync,
  startSyncRetryLoop,
  type SyncOutcome,
} from "./sync";

export {
  verifyAndRecordClockOpen,
  isClockTampered,
  getClockTamperDetails,
  resolveClockTamper,
  saveTeacherProfile,
  getTeacherProfile,
  isEmailRegisteredLocally,
  recordRegisteredEmailLocally,
  type ClockTamperState,
  type TeacherProfile,
} from "./tamper";
