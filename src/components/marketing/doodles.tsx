/**
 * Hand-drawn SVG doodles in the chalk/classroom visual language.
 * All original paths — nothing traced or copied from a third party.
 */

export function BlobField() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-neutral-200/70 blur-3xl animate-blob" />
      <div className="absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-neutral-300/50 blur-3xl animate-blob [animation-delay:4s]" />
      <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-neutral-100 blur-3xl animate-blob [animation-delay:8s]" />
    </div>
  );
}

export function DotGrid({ className = "" }: { className?: string }) {
  return <div className={`bg-dot-grid ${className}`} />;
}

/** Ruled exercise-book lines. */
export function RuledPaper({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        backgroundImage:
          "repeating-linear-gradient(to bottom, transparent 0 27px, #e5e5e5 27px 28px)",
      }}
    />
  );
}

export function Squiggle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 20" className={className} fill="none" aria-hidden="true">
      <path
        d="M0 10C20 -3 40 23 60 10C80 -3 100 23 120 10C140 -3 160 23 180 10C190 3.5 195 10 200 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Double chalk underline for headings. */
export function ChalkUnderline({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 16" className={className} fill="none" aria-hidden="true">
      <path
        d="M3 9c38-4 76-6 114-5 24 .7 48 2 86 5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M28 14c30-2.5 60-3.5 90-3 26 .4 52 1.4 84 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity=".55"
      />
    </svg>
  );
}

/** Hand-drawn curved arrow. */
export function CurvedArrow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 90 60" className={className} fill="none" aria-hidden="true">
      <path
        d="M4 52C12 26 34 10 62 12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M52 4l12 8-10 8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Hand-drawn tick, for checklists. */
export function TickMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M4 13.5c2.2 1.4 4 3.2 5.4 5C12.6 13 16.6 8.2 21 5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlusMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M11 2h2v9h9v2h-9v9h-2v-9H2v-2h9V2z" />
    </svg>
  );
}

/** Four-point sparkle. */
export function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 0c.6 6.4 5.6 11.4 12 12-6.4.6-11.4 5.6-12 12-.6-6.4-5.6-11.4-12-12C6.4 11.4 11.4 6.4 12 0z" />
    </svg>
  );
}

/** Open book, for the resource-bank motif. */
export function BookMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
      <path
        d="M3 6.5A2.5 2.5 0 0 1 5.5 4H14v23H5.5A2.5 2.5 0 0 1 3 24.5v-18Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M29 6.5A2.5 2.5 0 0 0 26.5 4H18v23h8.5a2.5 2.5 0 0 0 2.5-2.5v-18Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M16 4v23" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/** Compass/divider doodle, geometry-class motif. */
export function CompassMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
      <circle cx="16" cy="5" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M16 8 8 27M16 8l8 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M11 21h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Speech bubble with a query mark — the assistant motif. */
export function AskMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
      <path
        d="M4 8.5A4.5 4.5 0 0 1 8.5 4h15A4.5 4.5 0 0 1 28 8.5v10A4.5 4.5 0 0 1 23.5 23H13l-7 5v-5H8.5A4.5 4.5 0 0 1 4 18.5v-10Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M13 11.5a3 3 0 0 1 5.8.9c0 2-2.8 2.3-2.8 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="16" cy="19.6" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function BellMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
      <path
        d="M24 12a8 8 0 1 0-16 0c0 8-3 9.5-3 9.5h22S24 20 24 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 26a3 3 0 0 1-5 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CertificateMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
      <rect x="3" y="4" width="26" height="18" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path d="M8 11h11M8 16h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="23" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M22 26.5 21 31l3-1.8 3 1.8-1-4.5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
