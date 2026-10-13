"use client";

import Link from "next/link";
import { Card, CardBody, Button } from "@/components/ui";

// Shown right after a teacher activates their term pass — the landing page
// doubles as the registration + payment gateway, and this is the payoff
// screen: get the app, or head straight into the course catalog.
export default function WelcomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-warm-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardBody>
          <div className="text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-mint-100 text-2xl">
              🎉
            </span>
            <h1 className="mt-4 text-xl font-semibold text-ink">You&apos;re all set!</h1>
            <p className="mt-2 text-sm text-warm-600">
              Your term pass is active. Get the app for the best experience, including offline
              access to your lesson notes and saved lesson plans.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <a
              href="/downloads?platform=android"
              className="flex items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-warm-800"
            >
              Download App for Android
            </a>
            <a
              href="/downloads?platform=windows"
              className="flex items-center justify-center gap-2 rounded-2xl border border-warm-300 bg-white px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-warm-400"
            >
              Download App for Desktop (Windows)
            </a>
          </div>

          <Link
            href="/courses"
            className="mt-5 block text-center text-sm text-warm-500 underline underline-offset-2 hover:text-ink"
          >
            Continue in the browser instead →
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}
