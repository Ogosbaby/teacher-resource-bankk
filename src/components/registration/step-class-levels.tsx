"use client";

import { CLASS_LEVELS, type ClassLevel } from "@/lib/content/curriculum";
import { CheckIcon, Pill, StepActions } from "./primitives";

/**
 * Step 2 — which class levels the teacher covers.
 *
 * This selection drives Step 3 entirely: `getSubjectsForLevels` filters the subject
 * pool from it. The selected chips are echoed back as explicit confirmation, so a
 * teacher can see what they picked before the subject list changes under them.
 */
export function StepClassLevels({
  classLevels,
  error,
  onToggle,
  onBack,
  onContinue,
}: {
  classLevels: ClassLevel[];
  error: string | null;
  onToggle: (level: ClassLevel) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-center gap-2">
        {CLASS_LEVELS.map((lvl) => (
          <Pill key={lvl} label={lvl} active={classLevels.includes(lvl)} onClick={() => onToggle(lvl)} />
        ))}
      </div>

      <div className="text-center">
        <p className="text-xs text-neutral-400">
          {classLevels.length === 0
            ? "Tap all the levels you teach"
            : `${classLevels.length} level${classLevels.length === 1 ? "" : "s"} selected`}
        </p>
        {classLevels.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {classLevels.map((lvl) => (
              <span
                key={lvl}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
              >
                <CheckIcon className="h-3 w-3" />
                {lvl}
              </span>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-center text-sm text-red-600">{error}</p>}

      <StepActions nextLabel="Continue" onBack={onBack} onNext={onContinue} />
    </div>
  );
}
