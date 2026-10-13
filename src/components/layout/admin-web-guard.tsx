"use client";

import Link from "next/link";
import { useIsNativeApp } from "@/lib/native/app";
import { getWhatsAppSupportUrl } from "@/lib/support/whatsapp";

interface AdminWebGuardProps {
  userRole?: string;
  children: React.ReactNode;
}

export function AdminWebGuard({ userRole, children }: AdminWebGuardProps) {
  const isNative = useIsNativeApp();

  // On Native Android APK, teachers have direct access
  if (isNative) {
    return <>{children}</>;
  }

  // On the Web, only admins have demo & testing access
  if (userRole === "admin") {
    return (
      <div>
        <div className="bg-purple-900 text-white px-4 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-mint-400 animate-ping" />
            <span className="font-semibold">Admin Testing & Demo Mode Active</span>
            <span className="text-purple-200 hidden sm:inline">· You are testing commercial resources on the web preview.</span>
          </div>
          <Link href="/dashboard" className="underline font-semibold hover:text-mint-300">
            Open Admin Dashboard →
          </Link>
        </div>
        {children}
      </div>
    );
  }

  // Non-admin visitor accessing resources on web
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-mint-100 text-3xl shadow-sm">
        📱
      </div>

      <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        Teacher Resource Bank is Built for Android
      </h1>

      <p className="mt-3 text-sm leading-relaxed text-warm-600 max-w-md">
        Curriculum lesson notes, schemes of work, and our offline AI assistant run on the TRB Android application with zero internet required.
      </p>

      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
        <Link
          href="/pricing"
          className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-ink px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-neutral-800 transition-colors"
        >
          Get Started
        </Link>

        <Link
          href="/sign-in"
          className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl border border-warm-300 bg-white px-5 py-3.5 text-sm font-semibold text-ink hover:bg-warm-50 transition-colors"
        >
          Have an Activation Code?
        </Link>
      </div>

      <div className="mt-6">
        <a
          href={getWhatsAppSupportUrl("Hi, I'd like to book a demo for the teacher resource bank")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs font-semibold text-warm-600 hover:text-ink underline"
        >
          Book a Demo on WhatsApp →
        </a>
      </div>
    </div>
  );
}
