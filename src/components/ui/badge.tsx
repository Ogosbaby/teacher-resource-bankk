import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-warm-100 text-warm-700",
        mint: "bg-mint-100 text-mint-800",
        draft: "bg-amber-100 text-amber-800",
        in_review: "bg-blue-100 text-blue-800",
        published: "bg-mint-100 text-mint-800",
        archived: "bg-warm-200 text-warm-600",
        active: "bg-mint-100 text-mint-800",
        expired: "bg-red-100 text-red-800",
        failed: "bg-red-100 text-red-800",
        pending: "bg-amber-100 text-amber-800",
        success: "bg-mint-100 text-mint-800",
        refunded: "bg-warm-100 text-warm-700",
        ai: "bg-purple-50 text-purple-700",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
