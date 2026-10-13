"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

interface MobileBottomNavProps {
  onOpenChat: () => void;
}

export function MobileBottomNav({ onOpenChat }: MobileBottomNavProps) {
  const pathname = usePathname();

  const isHome = pathname === "/" || pathname === "/app";
  const isCourses = (pathname === "/courses" || pathname.startsWith("/courses/")) && !isHome;
  const isPlanner = pathname.startsWith("/lesson-planner");
  const isCertificates = pathname.startsWith("/my-library/certificates");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-warm-200 bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] shadow-lg">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
        {/* 1. Home */}
        <Link
          href="/courses"
          className={cn(
            "flex flex-1 flex-col items-center justify-center py-1 text-center transition-colors",
            isHome ? "text-ink font-semibold" : "text-warm-500 hover:text-ink"
          )}
        >
          <HomeIcon className="h-5 w-5" />
          <span className="mt-1 text-[11px]">Home</span>
        </Link>

        {/* 2. Courses */}
        <Link
          href="/courses"
          className={cn(
            "flex flex-1 flex-col items-center justify-center py-1 text-center transition-colors",
            isCourses ? "text-ink font-semibold" : "text-warm-500 hover:text-ink"
          )}
        >
          <BookIcon className="h-5 w-5" />
          <span className="mt-1 text-[11px]">Courses</span>
        </Link>

        {/* 3. Ask AI (Robot icon with black background, slightly bigger) */}
        <button
          type="button"
          onClick={onOpenChat}
          aria-label="Ask AI Assistant"
          className="group relative -top-3 flex flex-col items-center justify-center focus:outline-none"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-white shadow-warm-lg ring-4 ring-white transition-transform duration-200 active:scale-95 group-hover:scale-105">
            <RobotIcon className="h-6 w-6" />
          </div>
          <span className="mt-0.5 text-[11px] font-semibold text-ink">Ask AI</span>
        </button>

        {/* 4. Lesson Planner */}
        <Link
          href="/lesson-planner"
          className={cn(
            "flex flex-1 flex-col items-center justify-center py-1 text-center transition-colors",
            isPlanner ? "text-ink font-semibold" : "text-warm-500 hover:text-ink"
          )}
        >
          <PlannerIcon className="h-5 w-5" />
          <span className="mt-1 text-[11px] truncate px-0.5">Lesson Plan</span>
        </Link>

        {/* 5. Certificates */}
        <Link
          href="/my-library/certificates"
          className={cn(
            "flex flex-1 flex-col items-center justify-center py-1 text-center transition-colors",
            isCertificates ? "text-ink font-semibold" : "text-warm-500 hover:text-ink"
          )}
        >
          <CertificateIcon className="h-5 w-5" />
          <span className="mt-1 text-[11px] truncate px-0.5">Certificates</span>
        </Link>
      </div>
    </nav>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
      <path d="M6 6h10" />
      <path d="M6 10h10" />
    </svg>
  );
}

function RobotIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="3" />
      <circle cx="9" cy="16" r="1.3" fill="currentColor" />
      <circle cx="15" cy="16" r="1.3" fill="currentColor" />
      <path d="m8 7 4-4 4 4" />
      <path d="M12 3v8" />
    </svg>
  );
}

function PlannerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </svg>
  );
}

function CertificateIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  );
}
