"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui";

/** The step names, in order. Length defines the progress bar's scale. */
export const STEP_LABELS = ["Account", "Class levels", "Subjects", "Activate"];

/**
 * Per-step copy, kept beside the step order so a step's wording can never drift
 * away from its position in the flow.
 */
export const STEP_COPY: Record<number, { title: string; subtitle: string }> = {
  1: { title: "Teacher Registration", subtitle: "Enter your contact details to get started." },
  2: {
    title: "What levels do you teach?",
    subtitle: "Select all that apply — you can choose multiple class levels.",
  },
  3: { title: "What subjects do you teach?", subtitle: "Showing subjects tailored to your chosen levels." },
  4: { title: "Activate Your Term Pass", subtitle: "₦5,000 for 3 months unlimited offline access across all subjects." },
};

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M20 6 9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The touch-friendly multiselect control used for levels and subjects. */
export function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
        active
          ? "border-ink bg-ink text-white shadow-2xs"
          : "border-warm-200 bg-white text-warm-700 hover:border-warm-300 hover:bg-warm-50/60"
      }`}
    >
      {label}
    </button>
  );
}

export function RegistrationSteps({ step }: { step: number }) {
  const progressPct = ((step - 1) / (STEP_LABELS.length - 1)) * 100;

  return (
    <div className="mb-8">
      <div className="relative flex items-center justify-between">
        <div className="absolute left-4 right-4 top-3.5 h-0.5 -translate-y-1/2 bg-neutral-200" />
        <motion.div
          className="absolute left-4 top-3.5 h-0.5 -translate-y-1/2 bg-neutral-900"
          initial={false}
          animate={{ width: `${progressPct}%` }}
          style={{ maxWidth: "calc(100% - 2rem)" }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
        />

        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const isActive = n === step;
          const isDone = n < step;
          return (
            <div key={label} className="relative z-10 flex flex-col items-center gap-1.5">
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1.1 : 1,
                  backgroundColor: isActive || isDone ? "#171717" : "#e5e5e5",
                  color: isActive || isDone ? "#ffffff" : "#737373",
                }}
                transition={{ duration: 0.2 }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold shadow-sm"
              >
                {isDone ? <CheckIcon className="h-3.5 w-3.5" /> : n}
              </motion.div>
              <span
                className={`hidden text-[11px] transition-colors sm:inline ${
                  isActive ? "font-medium text-neutral-900" : "text-neutral-400"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Slide-and-fade wrapper so each step reads as a distinct, intentional screen. */
export function StepTransition({ stepKey, children }: { stepKey: number; children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={stepKey}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * The Back/Continue footer. Every step that can move both ways uses it, so the
 * two buttons can't drift apart in size, order or disabled behaviour.
 */
export function StepActions({
  nextLabel,
  onBack,
  onNext,
  nextLoading,
  nextDisabled,
  nextType = "button",
}: {
  nextLabel: string;
  onBack: () => void;
  onNext?: () => void;
  nextLoading?: boolean;
  nextDisabled?: boolean;
  nextType?: "button" | "submit";
}) {
  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onBack}
        disabled={nextLoading}
      >
        Back
      </Button>
      <Button
        type={nextType}
        className="w-full"
        onClick={onNext}
        isLoading={nextLoading}
        disabled={nextDisabled}
      >
        {nextLabel}
      </Button>
    </div>
  );
}

/** The centered heading block, animated between steps. */
export function StepHeading({ step }: { step: number }) {
  const copy = STEP_COPY[step];
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={`heading-${step}`}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.18 }}
      >
        <h1 className="mb-1 text-center text-xl font-semibold text-neutral-900">{copy.title}</h1>
        <p className="mb-6 text-center text-sm text-neutral-500">{copy.subtitle}</p>
      </motion.div>
    </AnimatePresence>
  );
}
