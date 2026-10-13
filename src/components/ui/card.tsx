import { cn } from "@/lib/utils/cn";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-oak bg-white shadow-warm-sm transition-all duration-200 hover:shadow-warm hover:-translate-y-0.5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-6 pt-6", className)} {...props}>
      {children}
    </div>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-6 py-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("border-t border-warm-100 px-6 py-4", className)} {...props}>
      {children}
    </div>
  );
}

/** Backwards-compatible alias for CardContent */
export const CardBody = CardContent;

/** Subject-coloured card variant — coloured top border for subject grids */
export function SubjectCard({
  className,
  colorClass,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { colorClass?: string }) {
  return (
    <div
      className={cn(
        "group rounded-oak bg-white shadow-warm-sm transition-all duration-200 hover:shadow-warm hover:-translate-y-1 overflow-hidden",
        className
      )}
      {...props}
    >
      <div className={cn("h-1.5 w-full", colorClass ?? "bg-mint-200")} />
      <div className="p-5">{children}</div>
    </div>
  );
}
