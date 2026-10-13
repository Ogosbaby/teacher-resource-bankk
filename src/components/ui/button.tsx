"use client";

import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonStyles = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-ink text-white hover:bg-warm-800 shadow-warm-sm hover:shadow-warm hover:-translate-y-px",
        accent: "bg-accent text-white hover:bg-accent-600 shadow-warm-sm hover:shadow-warm hover:-translate-y-px",
        mint: "bg-mint-200 text-ink hover:bg-mint-300 shadow-warm-sm hover:shadow-warm hover:-translate-y-px",
        warm: "bg-warm-100 text-ink hover:bg-warm-200",
        secondary: "bg-warm-100 text-ink hover:bg-warm-200",
        outline: "border-2 border-warm-300 text-ink hover:bg-warm-50 hover:border-warm-400",
        destructive: "bg-red-600 text-white hover:bg-red-700",
        ghost: "text-warm-700 hover:bg-warm-100 hover:text-ink",
      },
      size: {
        sm: "h-9 px-4 text-sm rounded-xl",
        md: "min-h-[48px] h-12 px-6 text-sm sm:text-base font-medium rounded-2xl",
        lg: "min-h-[56px] h-14 px-8 text-base font-semibold rounded-2xl",
        xl: "min-h-[64px] h-16 px-10 text-lg font-semibold rounded-2xl",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonStyles> {
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonStyles({ variant, size }), className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? "Please wait..." : children}
    </button>
  )
);
Button.displayName = "Button";
