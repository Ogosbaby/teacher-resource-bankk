"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { label: "Courses", href: "/dashboard/learn" },
  { label: "Learning Paths", href: "/dashboard/learn/paths" },
  { label: "Resource Bank", href: "/dashboard/learn/resources" },
];

/** Segmented control for the three content types living under the Learn tab. */
export function LearnTabs() {
  const pathname = usePathname();
  return (
    <div className="inline-flex rounded-full border border-neutral-200 bg-white p-1">
      {TABS.map((t) => {
        const active = t.href === "/dashboard/learn" ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-ink text-white" : "text-neutral-600 hover:text-ink"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
