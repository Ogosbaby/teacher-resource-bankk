"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const name = searchParams.get("name") || "Teacher";
  const email = searchParams.get("email") || "";
  const firstName = name.trim().split(/\s+/)[0] || "Teacher";
  const isVerified = status === "paid" || status === "activated";

  if (!isVerified) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center justify-center px-4 py-6">
        <Card className="w-full text-center border-warm-200 p-6 shadow-warm-lg">
          <CardBody className="space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-2xl text-amber-800">
              🔒
            </div>
            <h1 className="text-xl font-bold text-ink">Payment Required</h1>
            <p className="text-xs text-warm-600 leading-relaxed">
              Please complete payment or enter a valid activation code to access and download the TRB application.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
              <Link
                href="/pricing"
                className="w-full sm:w-auto rounded-xl bg-ink px-5 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 transition-colors"
              >
                Get Started
              </Link>
              <Link
                href="/sign-in"
                className="w-full sm:w-auto rounded-xl border border-warm-300 bg-white px-5 py-2.5 text-xs font-semibold text-ink hover:bg-warm-50 transition-colors"
              >
                Have a Code?
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-lg items-center justify-center px-4 py-4 sm:py-6">
      <Card className="w-full overflow-hidden border-warm-200 shadow-warm-lg">
        {/* Top Celebration Banner - Compact */}
        <div className="bg-gradient-to-br from-mint-600 via-mint-700 to-emerald-800 px-6 py-5 text-center text-white">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md text-xl">
            🎉
          </div>
          <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
            Term Pass Active!
          </h1>
          <p className="mt-1 text-xs text-mint-100">
            Welcome, {firstName}. Access is unlocked for the academic term.
          </p>
        </div>

        <CardBody className="p-5 sm:p-6 space-y-4">
          {/* Activation Code Sent to Email Notice */}
          <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/70 p-5 text-center shadow-xs">
            <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-2xl text-emerald-800 shadow-2xs">
              ✉️
            </div>
            <h2 className="text-base font-bold text-ink">
              Activation Code Sent to Your Email
            </h2>
            <p className="mt-1 text-xs text-warm-700 leading-relaxed max-w-sm mx-auto">
              Your device activation code has been generated and sent to:
            </p>
            {email ? (
              <p className="mt-2 font-mono text-xs sm:text-sm font-bold text-emerald-900 bg-white/90 py-1.5 px-4 rounded-xl border border-emerald-300 shadow-2xs inline-block">
                {email}
              </p>
            ) : (
              <p className="mt-2 text-xs font-semibold text-emerald-900 bg-white/90 py-1 px-3 rounded-xl border border-emerald-200 inline-block">
                Your registered email address
              </p>
            )}
            <p className="mt-3 text-[11px] text-warm-600 leading-relaxed">
              Please check your inbox (and spam or junk folder) for the code. You will enter it when opening the downloaded app.
            </p>
          </div>

          {/* Download App Action Card */}
          <div className="rounded-2xl border-2 border-mint-500/30 bg-mint-50/50 p-4 text-center">
            <h2 className="text-base font-bold text-ink">
              Download TRB App
            </h2>
            <p className="mt-0.5 text-xs text-warm-600">
              Offline materials, lesson planner, and AI assistant on your device.
            </p>

            <a
              href="/api/downloads/apk"
              download="trb.apk"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white shadow-md transition-transform hover:bg-neutral-800 active:scale-[0.99]"
            >
              <img src="/trb-icon.png" alt="TRB Icon" className="h-5 w-5 rounded-md object-cover" />
              <span>Download App</span>
            </a>
          </div>

          {/* Compact 4-Step Instructions (Grid) */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-warm-500 mb-2">
              Next Steps on Your Android Device:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2.5 rounded-xl border border-warm-200 bg-white px-3 py-2 shadow-2xs">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mint-100 font-bold text-mint-800 text-[11px]">
                  1
                </span>
                <span className="font-semibold text-ink">Install App</span>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl border border-warm-200 bg-white px-3 py-2 shadow-2xs">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mint-100 font-bold text-mint-800 text-[11px]">
                  2
                </span>
                <span className="font-semibold text-ink">Input Code from Email</span>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl border border-warm-200 bg-white px-3 py-2 shadow-2xs">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mint-100 font-bold text-mint-800 text-[11px]">
                  3
                </span>
                <span className="font-semibold text-ink">Download Resources</span>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl border border-warm-200 bg-white px-3 py-2 shadow-2xs">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mint-100 font-bold text-mint-800 text-[11px]">
                  4
                </span>
                <span className="font-semibold text-ink">Unlocked 100% Offline</span>
              </div>
            </div>
          </div>

          <div className="pt-1 text-center border-t border-warm-200">
            <Link href="/" className="text-xs font-semibold text-warm-500 hover:text-ink">
              ← Return to homepage
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-warm-500">Loading receipt…</div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
