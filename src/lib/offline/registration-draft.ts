/**
 * Refresh-durable registration state.
 *
 * The wizard writes here on every change, so a refresh, a tab close or a phone
 * call mid-signup loses nothing. Stored encrypted because it holds a name and an
 * email address.
 *
 * Note the shape: `subjects` holds **level-tagged ids** (`primary_mathematics`),
 * never display labels. If a teacher changes their class levels after picking
 * subjects, `reconcileSubjects` drops the ones that no longer belong to a
 * selected level — the subject pool can never contain a stale entry from a level
 * they deselected.
 */
import { STORAGE_KEYS } from "./keys";
import { readEncrypted, removeKey, writeEncrypted } from "./crypto";
// Relative rather than the `@/` alias: the offline layer stays importable from
// plain Node via tsx (scripts, tests) with no path-mapping setup.
import { getSubjectsForLevels, type ClassLevel } from "../content/curriculum";

export interface RegistrationDraft {
  step: number;
  name: string;
  email: string;
  classLevels: ClassLevel[];
  /** Level-tagged subject ids. */
  subjects: string[];
  updatedAt: number;
}

export const EMPTY_DRAFT: RegistrationDraft = {
  step: 1,
  name: "",
  email: "",
  classLevels: [],
  subjects: [],
  updatedAt: 0,
};

export function loadDraft(): RegistrationDraft | null {
  const draft = readEncrypted<RegistrationDraft>(STORAGE_KEYS.registrationDraft);
  if (!draft) return null;
  // Defensive: tolerate a draft written by an older shape of the app.
  return { ...EMPTY_DRAFT, ...draft };
}

export function saveDraft(patch: Partial<RegistrationDraft>): RegistrationDraft {
  const current = loadDraft() ?? EMPTY_DRAFT;
  const next: RegistrationDraft = { ...current, ...patch, updatedAt: Date.now() };
  writeEncrypted(STORAGE_KEYS.registrationDraft, next);
  return next;
}

export function clearDraft(): void {
  removeKey(STORAGE_KEYS.registrationDraft);
}

/**
 * Keeps only the selected subjects that still exist in the pool for the
 * currently selected class levels. Call this whenever Step 2 changes.
 */
export function reconcileSubjects(levels: ClassLevel[], subjects: string[]): string[] {
  const allowed = new Set(getSubjectsForLevels(levels).map((s) => s.id));
  return subjects.filter((id) => allowed.has(id));
}
