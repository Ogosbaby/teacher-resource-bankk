"use client";

import type { ClassLevel } from "@/lib/content/curriculum";
import { Pill, StepActions } from "./primitives";
import type { SubjectSection } from "./subject-sections";

/**
 * Step 3 — Subjects (Multi-select, filtered by chosen Class Levels).
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

  // Flatten all available subject IDs
  const allIds = sections.flatMap((sec) => sec.items.map((it) => it.id));
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.includes(id));

  function handleToggleAll() {
    if (allSelected) {
      // Deselect all
      allIds.forEach((id) => {
        if (selected.includes(id)) onToggle(id);
      });
    } else {
      // Select all
      allIds.forEach((id) => {
        if (!selected.includes(id)) onToggle(id);
      });
    }
  }

  return (
    <div className="space-y-4 text-left">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-ink">
          {selected.length === 0
            ? "Tap to select your subjects:"
            : `${selected.length} subject${selected.length === 1 ? "" : "s"} chosen`}
        </span>
        {totalCount > 0 && (
          <button
            type="button"
            onClick={handleToggleAll}
            className="text-xs font-semibold text-mint-700 hover:text-mint-800 underline transition-colors"
          >
            {allSelected ? "Deselect All" : "Select All"}
          </button>
        )}
      </div>

      {totalCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-warm-300 p-8 text-center bg-warm-50/50">
          <p className="text-sm font-semibold text-ink">No subjects to display</p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-warm-500">
            Please go back and pick at least one class level.
          </p>
        </div>
      ) : (
        <div className="max-h-80 space-y-4 overflow-y-auto rounded-2xl border border-warm-200 bg-warm-50/30 p-3.5 scrollbar-thin">
          {sections.map((section) => (
            <div key={section.heading} className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-warm-500">
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

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 text-center">
          {error}
        </div>
      )}

      <StepActions
        nextLabel="Continue to Activation →"
        onBack={onBack}
        onNext={onContinue}
        nextDisabled={totalCount === 0}
      />
    </div>
  );
}
