/**
 * Security & Offline Tamper Protection.
 *
 * Enforces hardware UUID binding integrity and clock rollback detection.
 * Prevents users from resetting device system clocks backwards to extend
 * offline term passes indefinitely.
 */
import { STORAGE_KEYS } from "./keys";
import { readEncrypted, writeEncrypted, removeKey } from "./crypto";
import type { ClassLevel } from "@/lib/content/curriculum";

export interface ClockTamperState {
  tampered: boolean;
  detectedAt?: number;
  lastOpenedTimestamp?: number;
  systemTimestamp?: number;
  reason?: string;
}

export interface TeacherProfile {
  name: string;
  email: string;
  classLevels: ClassLevel[];
  subjects: string[];
  savedAt: number;
}

/** 60-second allowance for minor NTP network sync drift */
const CLOCK_DRIFT_TOLERANCE_MS = 60 * 1000;

/**
 * Checks system clock integrity on every app launch.
 *
 * Compares current Date.now() against a hidden last_opened_timestamp.
 * If the clock was wound backwards beyond the tolerance threshold,
 * a tampering block is recorded that requires an online check-in to clear.
 */
export function verifyAndRecordClockOpen(): ClockTamperState {
  if (typeof window === "undefined" || !window.localStorage) {
    return { tampered: false };
  }

  // Check if already in a tampered state
  const existingTamper = readEncrypted<ClockTamperState>(STORAGE_KEYS.clockTampered);
  if (existingTamper && existingTamper.tampered) {
    return existingTamper;
  }

  const now = Date.now();
  const lastOpened = readEncrypted<number>(STORAGE_KEYS.lastOpenedTimestamp);

  if (lastOpened && now < lastOpened - CLOCK_DRIFT_TOLERANCE_MS) {
    const tamperRecord: ClockTamperState = {
      tampered: true,
      detectedAt: now,
      lastOpenedTimestamp: lastOpened,
      systemTimestamp: now,
      reason:
        "Device clock manipulation detected. The current device time is earlier than the last recorded app session. An online check-in is required to verify your subscription.",
    };
    writeEncrypted(STORAGE_KEYS.clockTampered, tamperRecord);
    return tamperRecord;
  }

  // Legitimate forward time: update last_opened_timestamp
  writeEncrypted(STORAGE_KEYS.lastOpenedTimestamp, now);
  return { tampered: false, lastOpenedTimestamp: now };
}

export function isClockTampered(): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false;
  const tamper = readEncrypted<ClockTamperState>(STORAGE_KEYS.clockTampered);
  return Boolean(tamper?.tampered);
}

export function getClockTamperDetails(): ClockTamperState | null {
  return readEncrypted<ClockTamperState>(STORAGE_KEYS.clockTampered);
}

/**
 * Clears clock tamper lock after successful online validation.
 */
export function resolveClockTamper(verifiedServerTime?: number): void {
  removeKey(STORAGE_KEYS.clockTampered);
  const validTime = verifiedServerTime || Date.now();
  writeEncrypted(STORAGE_KEYS.lastOpenedTimestamp, validTime);
}

// ─── Persistent Teacher Profile ──────────────────────────────

export function saveTeacherProfile(profile: {
  name: string;
  email?: string;
  classLevels: ClassLevel[];
  subjects: string[];
}): TeacherProfile {
  const record: TeacherProfile = {
    name: profile.name,
    email: profile.email ?? "",
    classLevels: profile.classLevels,
    subjects: profile.subjects,
    savedAt: Date.now(),
  };
  writeEncrypted(STORAGE_KEYS.teacherProfile, record);
  return record;
}

export function getTeacherProfile(): TeacherProfile | null {
  return readEncrypted<TeacherProfile>(STORAGE_KEYS.teacherProfile);
}
