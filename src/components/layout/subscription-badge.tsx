"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export type SubscriptionState = "active" | "expiring" | "expired" | "none";

/**
 * Small chip in the header showing subscription state.
 * Active = green dot, Expiring = amber dot + days, Expired = red dot + renew link.
 */
export function SubscriptionBadge({
  state,
  daysLeft,
  className,
}: {
  state: SubscriptionState;
  daysLeft?: number;
  className?: string;
}) {
  if (state === "none") return null;

  const config = {
    active: {
      dot: "bg-mint-500",
      bg: "bg-mint-50 border-mint-200",
      text: "text-mint-800",
      label: "Active",
    },
    expiring: {
      dot: "bg-amber-500",
      bg: "bg-amber-50 border-amber-200",
      text: "text-amber-800",
      label: daysLeft !== undefined ? `${daysLeft}d left` : "Expiring",
    },
    expired: {
      dot: "bg-red-500",
      bg: "bg-red-50 border-red-200",
      text: "text-red-700",
      label: "Expired",
    },
  }[state];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        config.bg,
        config.text,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
      {state === "expired" && (
        <Link
          href="/dashboard/billing"
          className="ml-0.5 underline underline-offset-2 hover:no-underline"
        >
          Renew
        </Link>
      )}
    </div>
  );
}
