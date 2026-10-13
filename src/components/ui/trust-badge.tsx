import { cn } from "@/lib/utils/cn";

const TRUST_ITEMS = [
  {
    id: "curriculum",
    label: "Curriculum-aligned",
    icon: (
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path
          d="M10 2L3 6v6c0 3.5 3 6.5 7 8 4-1.5 7-4.5 7-8V6l-7-4z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M7 10l2 2 4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "reviewed",
    label: "Human-reviewed",
    icon: (
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <circle cx="10" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M4 17c0-3 2.7-5 6-5s6 2 6 5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M14 6l1.5 1.5L19 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "updated",
    label: "Updated regularly",
    icon: (
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path
          d="M17 10a7 7 0 11-2-5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M17 3v4h-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
] as const;

export function TrustBadges({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "compact";
}) {
  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      {TRUST_ITEMS.map((item) => (
        <div
          key={item.id}
          className={cn(
            "inline-flex items-center gap-2 rounded-full font-medium text-mint-800",
            variant === "compact"
              ? "bg-mint-50 px-3 py-1 text-xs"
              : "bg-mint-100 px-4 py-1.5 text-sm",
          )}
        >
          <span className="text-mint-600">{item.icon}</span>
          {item.label}
        </div>
      ))}
    </div>
  );
}

/** Single trust badge for inline use */
export function TrustBadge({
  id,
  className,
}: {
  id: "curriculum" | "reviewed" | "updated";
  className?: string;
}) {
  const item = TRUST_ITEMS.find((t) => t.id === id);
  if (!item) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-mint-100 px-3 py-1 text-xs font-medium text-mint-800",
        className,
      )}
    >
      <span className="text-mint-600">{item.icon}</span>
      {item.label}
    </span>
  );
}
