"use client";

import { CLASS_LEVELS, type ClassLevel } from "@/lib/content/curriculum";
import { CheckIcon, StepActions } from "./primitives";

const LEVEL_DETAILS: Record<
  ClassLevel,
  { title: string; subtitle: string; badge: string; icon: string }
> = {
  Primary: {
    title: "Primary School",
    subtitle: "Primary 1 – 6 foundational subjects & NERDC curriculum",
    badge: "Basic 1–6",
    icon: "🌱",
  },
  JSS: {
    title: "Junior Secondary (JSS)",
    subtitle: "JSS 1 – 3 classes, continuous assessments & BECE exam bank",
    badge: "Basic 7–9",
    icon: "📘",
  },
  SSS: {
    title: "Senior Secondary (SSS)",
    subtitle: "SSS 1 – 3 sciences, arts, commercial, trade & WAEC/NECO prep",
    badge: "Post-Basic",
    icon: "🎓",
  },
};

/**
 * Step 2 — Class levels the teacher covers (Multi-select).
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
    <div className="space-y-5 text-left">
      <div className="grid grid-cols-1 gap-2.5">
        {CLASS_LEVELS.map((lvl) => {
          const active = classLevels.includes(lvl);
          const meta = LEVEL_DETAILS[lvl];
          return (
            <button
              key={lvl}
              type="button"
              onClick={() => onToggle(lvl)}
              aria-pressed={active}
              className={`flex items-start gap-3.5 rounded-2xl border p-4 text-left transition-all ${
                active
                  ? "border-ink bg-warm-50 shadow-xs ring-1 ring-ink"
                  : "border-warm-200 bg-white hover:border-warm-300 hover:bg-warm-50/40"
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warm-100 text-lg">
                {meta.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-ink">{meta.title}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
                      active
                        ? "bg-ink text-white"
                        : "bg-warm-100 text-warm-600"
                    }`}
                  >
                    {meta.badge}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-warm-600 leading-relaxed">
                  {meta.subtitle}
                </p>
              </div>
              <div
                className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                  active
                    ? "border-ink bg-ink text-white"
                    : "border-warm-300 bg-white"
                }`}
              >
                {active && <CheckIcon className="h-3.5 w-3.5 stroke-[3]" />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-warm-200 bg-warm-50/60 px-3.5 py-2.5 text-center">
        <p className="text-xs text-warm-600 font-medium">
          {classLevels.length === 0
            ? "💡 Tap one or more levels you teach (you can select multiple)"
            : `${classLevels.length} level${
                classLevels.length === 1 ? "" : "s"
              } selected: ${classLevels.join(", ")}`}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 text-center">
          {error}
        </div>
      )}

      <StepActions nextLabel="Continue to Subjects →" onBack={onBack} onNext={onContinue} />
    </div>
  );
}
