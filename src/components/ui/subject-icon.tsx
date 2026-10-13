import { cn } from "@/lib/utils/cn";

/**
 * Blob-style coloured subject icon.
 * Each subject gets a distinct pastel colour — used in mega-menu, subject grids, and topic lists.
 */
export function SubjectIcon({
  icon,
  colorClass,
  size = "md",
  className,
}: {
  /** Emoji or short text to display */
  icon: string;
  /** Tailwind background colour class, e.g. "bg-subject-maths" */
  colorClass: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "h-9 w-9 text-base rounded-xl",
    md: "h-12 w-12 text-xl rounded-2xl",
    lg: "h-16 w-16 text-2xl rounded-oak-xl",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110",
        sizeClasses[size],
        colorClass,
        className
      )}
      aria-hidden="true"
    >
      {icon}
    </div>
  );
}
