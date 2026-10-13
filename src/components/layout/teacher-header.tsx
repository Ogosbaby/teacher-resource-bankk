"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Logomark } from "@/components/brand/logomark";
import {
  SubscriptionBadge,
  type SubscriptionState,
} from "./subscription-badge";
import { cn } from "@/lib/utils/cn";
import { useIsNativeApp } from "@/lib/native/app";
import { signOut } from "next-auth/react";
import { clearDeviceToken, clearTermPass, getTeacherProfile, isTermPassActive, STORAGE_KEYS } from "@/lib/offline";

interface TeacherHeaderProps {
  isLoggedIn?: boolean;
  userName?: string;
  userRole?: string;
  subscriptionState?: SubscriptionState;
  subscriptionDaysLeft?: number;
}

export function TeacherHeader({
  isLoggedIn = false,
  userName,
  userRole,
  subscriptionState = "none",
  subscriptionDaysLeft,
}: TeacherHeaderProps) {
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const isNative = useIsNativeApp();

  const [hasAuth, setHasAuth] = useState(isLoggedIn);
  const [displayName, setDisplayName] = useState(userName ?? "Teacher");

  useEffect(() => {
    if (isLoggedIn) {
      setHasAuth(true);
      if (userName) setDisplayName(userName);
    } else {
      const active = isTermPassActive();
      const profile = getTeacherProfile();
      if (active || profile) {
        setHasAuth(true);
        if (profile?.name) setDisplayName(profile.name);
      }
    }
  }, [isLoggedIn, userName]);

  // Close menus on route change
  useEffect(() => {
    setProfileOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  // Close profile on outside click
  useEffect(() => {
    if (!profileOpen) return;
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [profileOpen]);

  async function handleSignOut() {
    try {
      clearDeviceToken();
      clearTermPass();
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEYS.deviceToken);
        window.localStorage.removeItem(STORAGE_KEYS.termPass);
        window.localStorage.removeItem(STORAGE_KEYS.teacherProfile);
      }
    } catch {}

    try {
      await signOut({ redirect: false });
    } catch {}

    window.location.href = isNative ? "/app/sign-in" : "/sign-in";
  }

  function handleOpenAskUs() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("trb:open-ask-us"));
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-warm-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
        {/* Left: Logo */}
        <Link href={isNative ? "/courses" : "/"} className="flex shrink-0 items-center gap-2.5">
          <Logomark size={30} animated={false} />
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-ink sm:text-base">
              TRB
            </span>
            {!isNative && (
              <span className="hidden -mt-1 text-[10px] font-medium text-warm-500 sm:inline">
                Teacher Resource Bank
              </span>
            )}
          </div>
        </Link>

        {/* Center: Desktop Navigation Links (Only on Web) */}
        {!isNative && (
          <nav className="hidden md:flex items-center gap-7">
            <Link
              href="/#features"
              className="text-sm font-medium text-warm-600 transition-colors hover:text-ink"
            >
              Features
            </Link>
            <button
              type="button"
              onClick={handleOpenAskUs}
              className="text-sm font-medium text-warm-600 transition-colors hover:text-ink cursor-pointer"
            >
              Ask Us
            </button>
            <Link
              href="/pricing"
              className="text-sm font-medium text-warm-600 transition-colors hover:text-ink"
            >
              Pricing
            </Link>
            <Link
              href="/sign-in"
              className="text-sm font-medium text-warm-600 transition-colors hover:text-ink"
            >
              Have a Code?
            </Link>
          </nav>
        )}

        {/* Right side actions */}
        <div className="flex items-center gap-3">

          {/* Search Icon inside Native App */}
          {isNative && (
            <Link
              href="/courses"
              aria-label="Search courses"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-warm-600 transition-colors hover:bg-warm-100 hover:text-ink"
            >
              <SearchIcon className="h-5 w-5" />
            </Link>
          )}

          {/* Subscription badge on larger screens */}
          {hasAuth && isNative && (
            <SubscriptionBadge
              state={subscriptionState}
              daysLeft={subscriptionDaysLeft}
              className="hidden sm:inline-flex"
            />
          )}

          {/* When authenticated: Profile Dropdown */}
          {hasAuth ? (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl p-1 text-sm font-medium transition-colors",
                  profileOpen ? "bg-warm-100 text-ink" : "text-warm-700 hover:bg-warm-100"
                )}
                aria-label="User Profile"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-mint-200 text-xs font-bold text-ink ring-2 ring-warm-100">
                  {displayName.charAt(0).toUpperCase()}
                </span>
                <ChevronDown className="h-3 w-3 text-warm-400 hidden sm:block" />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-2xl border border-warm-200 bg-white shadow-warm-lg"
                  >
                    <div className="border-b border-warm-100 px-4 py-3">
                      <p className="text-xs text-warm-400">Signed in as</p>
                      <p className="truncate text-sm font-semibold text-ink">
                        {displayName}
                      </p>
                      {userRole && (
                        <span className="mt-1 inline-block text-[10px] uppercase font-bold tracking-wider text-warm-500">
                          Role: {userRole}
                        </span>
                      )}
                    </div>
                    <ul className="py-1 text-xs">
                      {userRole === "admin" && (
                        <li>
                          <Link
                            href="/dashboard"
                            className="flex items-center gap-2.5 px-4 py-2.5 font-medium text-purple-700 hover:bg-purple-50"
                          >
                            <span>⚡ Admin Dashboard</span>
                          </Link>
                        </li>
                      )}
                      <li>
                        <Link
                          href="/my-library"
                          className="flex items-center gap-2.5 px-4 py-2.5 font-medium text-warm-700 hover:bg-warm-50 hover:text-ink"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4 text-warm-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m16 6 4 14" />
                            <path d="M12 6v14" />
                            <path d="M8 8v12" />
                            <path d="M4 4v16" />
                            <path d="M4 20h16" />
                          </svg>
                          <span>My Library</span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/downloads"
                          className="flex items-center gap-2.5 px-4 py-2.5 font-medium text-warm-700 hover:bg-warm-50 hover:text-ink"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4 text-warm-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          <span>Download App</span>
                        </Link>
                      </li>
                      <li className="border-t border-warm-100 mt-1 pt-1">
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left font-medium text-rose-600 hover:bg-rose-50"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                          </svg>
                          <span>Sign out</span>
                        </button>
                      </li>
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            /* When not authenticated on Web: Sign in & Get Started CTA */
            <div className="flex items-center gap-2">
              <Link
                href="/sign-in"
                className="hidden sm:inline-flex rounded-xl px-3 py-1.5 text-xs font-semibold text-warm-700 transition-colors hover:bg-warm-100 hover:text-ink"
              >
                Sign in
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-neutral-800 transition-colors"
              >
                <span>Get Started</span>
              </Link>
            </div>
          )}

          {/* Mobile hamburger menu button on Web */}
          {!isNative && (
            <button
              type="button"
              aria-label="Toggle navigation menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-warm-700 hover:bg-warm-100 md:hidden"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={mobileMenuOpen ? "M6 6l12 12M18 6 6 18" : "M4 6h16M4 12h16M4 18h16"} strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer Navigation for Web */}
      {!isNative && mobileMenuOpen && (
        <div className="border-t border-warm-200 bg-white px-4 py-4 md:hidden animate-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col gap-1.5 text-sm font-medium">
            <Link
              href="/#features"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl px-3 py-2 text-warm-700 hover:bg-warm-50 hover:text-ink"
            >
              Features
            </Link>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleOpenAskUs();
              }}
              className="flex items-center justify-between rounded-xl px-3 py-2 text-left text-warm-700 hover:bg-warm-50 hover:text-ink"
            >
              <span>Ask Us</span>
            </button>
            <Link
              href="/pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl px-3 py-2 text-warm-700 hover:bg-warm-50 hover:text-ink"
            >
              Pricing
            </Link>
            <Link
              href="/sign-in"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl px-3 py-2 text-warm-700 hover:bg-warm-50 hover:text-ink"
            >
              Have an Activation Code?
            </Link>
            {!hasAuth && (
              <div className="mt-2 border-t border-warm-100 pt-2 flex flex-col gap-2">
                <Link
                  href="/sign-in"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-2 text-center text-warm-700 hover:bg-warm-50"
                >
                  Sign in
                </Link>
                <Link
                  href="/pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl bg-ink px-4 py-2.5 text-center font-semibold text-white shadow-sm"
                >
                  Get Started
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
