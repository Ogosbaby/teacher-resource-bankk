"use client";

import type { ClassLevel } from "@/lib/content/curriculum";
import { Pill, StepActions } from "./primitives";
import type { SubjectSection } from "./subject-sections";

/**
 * Step 3 — subjects, filtered to the class levels chosen in Step 2.
 *
 * The list is never a fixed catalogue: it is `getSubjectsForLevels(levels)`, so
 * nothing from an unselected level can appear. When the teacher selected more
 * than one level, each pill carries its level as a suffix and the sections break
 * by level — otherwise "Mathematics" would appear twice with no explanation of
 * why, or worse, look like a duplicate.
 */
export function StepSubjects({
  sections,
  totalCount,
  classLevels,
  selected,
  error,
  onToggle,
  onBack,
  onContinue,
}: {
  sections: SubjectSection[];
  totalCount: number;
  classLevels: ClassLevel[];
  selected: string[];
  error: string | null;
  onToggle: (id: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const multiLevel = classLevels.length > 1;

  return (
    <div className="space-y-6">
      {totalCount === 0 ? (
        // Reachable only if Step 2 was skipped, but the empty state is real and
        // says what to do rather than showing a blank box.
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center">
          <p className="text-sm font-medium text-neutral-700">No subjects to show yet</p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-neutral-400">
            Pick at least one class level and we&apos;ll list the subjects that belong to it.
          </p>
        </div>
      ) : (
        <div className="max-h-72 space-y-4 overflow-y-auto p-1">
          {sections.map((section) => (
            <div key={section.heading}>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                {section.heading}
              </p>
              <div className="flex flex-wrap gap-2">
                {section.items.map((subj) => (
                  <Pill
                    key={subj.id}
                    label={multiLevel ? `${subj.label} · ${subj.level}` : subj.label}
                    active={selected.includes(subj.id)}
                    onClick={() => onToggle(subj.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-neutral-400">
        {selected.length === 0
          ? "Tap all the subjects you teach"
          : `${selected.length} subject${selected.length === 1 ? "" : "s"} selected`}
      </p>

      {error && <p className="text-center text-sm text-red-600">{error}</p>}

      <StepActions
        nextLabel="Continue"
        onBack={onBack}
        onNext={onContinue}
        nextDisabled={totalCount === 0}
      />
    </div>
  );
}
