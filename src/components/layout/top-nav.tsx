"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";
import { Logomark } from "@/components/brand/logomark";
import { cn } from "@/lib/utils/cn";

export interface NavItem {
  label: string;
  href: string;
  /** Set for index routes so they don't prefix-match their own children. */
  exact?: boolean;
}

export interface NavNotification {
  id: string;
  title: string;
  detail?: string;
}

export interface ProfileAction {
  label: string;
  href?: string;
  onSelect?: () => void;
}

export function TopNav({
  items,
  brandLabel,
  brandHref,
  roleLabel,
  notifications = [],
}: {
  items: NavItem[];
  brandLabel: string;
  brandHref: string;
  roleLabel: string;
  notifications?: NavNotification[];
}) {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<"bell" | "profile" | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpenMenu(null);
  }, [pathname]);

  useEffect(() => {
    if (!openMenu) return;
    function onPointerDown(e: MouseEvent) {
      if (!navRef.current?.contains(e.target as Node)) setOpenMenu(null);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenu(null);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenu]);

  // One role surface now — settings and billing are the only profile actions.
  const profileActions: ProfileAction[] = [
    { label: "Settings", href: "/dashboard/settings" },
    { label: "Billing", href: "/dashboard/billing" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur-md">
      <div
        ref={navRef}
        className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6"
      >
        <Link href={brandHref} className="flex shrink-0 items-center gap-2.5">
          <Logomark size={30} animated={false} />
          <span className="hidden text-sm font-semibold tracking-tight text-ink sm:inline">
            {brandLabel}
          </span>
        </Link>

        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {items.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-ink text-white"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-ink"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          <div className="relative">
            <IconButton
              label="Notifications"
              active={openMenu === "bell"}
              onClick={() => setOpenMenu(openMenu === "bell" ? null : "bell")}
            >
              <BellIcon className="h-4.5 w-4.5" />
              {notifications.length > 0 && (
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent ring-2 ring-white" />
              )}
            </IconButton>
            {openMenu === "bell" && (
              <Dropdown className="w-72">
                <p className="label-mono px-4 py-3 text-[10px] text-neutral-400">
                  Notifications
                </p>
                {notifications.length === 0 ? (
                  <p className="px-4 pb-4 text-sm text-neutral-500">
                    You&apos;re all caught up.
                  </p>
                ) : (
                  <ul className="pb-2">
                    {notifications.map((n) => (
                      <li key={n.id} className="px-4 py-2.5 hover:bg-neutral-50">
                        <p className="text-sm font-medium text-ink">{n.title}</p>
                        {n.detail && (
                          <p className="mt-0.5 text-xs text-neutral-500">{n.detail}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Dropdown>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenMenu(openMenu === "profile" ? null : "profile")}
              className={cn(
                "flex items-center gap-1.5 rounded-full py-1.5 pl-1.5 pr-2.5 text-sm font-medium transition-colors",
                openMenu === "profile"
                  ? "bg-neutral-100 text-ink"
                  : "text-neutral-700 hover:bg-neutral-100"
              )}
            >
              <span className="num-mono flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-accent">
                {roleLabel.charAt(0)}
              </span>
              <span className="hidden sm:inline">{roleLabel}</span>
              <ChevronIcon className="h-3.5 w-3.5 text-neutral-400" />
            </button>
            {openMenu === "profile" && (
              <Dropdown className="w-52">
                <div className="border-b border-neutral-100 px-4 py-3">
                  <p className="label-mono text-[10px] text-neutral-400">
                    Signed in as
                  </p>
                  <p className="text-sm font-medium text-ink">{roleLabel}</p>
                </div>
                <ul className="py-1.5">
                  {profileActions.map((a) => (
                    <li key={a.label}>
                      <Link
                        href={a.href ?? "#"}
                        className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-ink"
                      >
                        {a.label}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <button
                      type="button"
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="block w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 hover:text-ink"
                    >
                      Sign out
                    </button>
                  </li>
                </ul>
              </Dropdown>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function IconButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-full transition-colors",
        active ? "bg-neutral-100 text-ink" : "text-neutral-600 hover:bg-neutral-100"
      )}
    >
      {children}
    </button>
  );
}

function Dropdown({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "absolute right-0 top-12 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl shadow-neutral-300/30",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

function BellIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.7 20a2 2 0 0 1-3.4 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
