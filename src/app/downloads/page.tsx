"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui";
import { isTermPassActive } from "@/lib/offline";
import { getSession } from "next-auth/react";
import { getWhatsAppSupportUrl } from "@/lib/support/whatsapp";

function DownloadsContent() {
  const params = useSearchParams();
  const code = params.get("code");
  const paid = params.get("paid");
  const [hasAccess, setHasAccess] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    void (async () => {
      let hasSession = false;
      try {
        const s = await getSession();
        hasSession = Boolean(s?.user);
      } catch {}

      const active = isTermPassActive() || Boolean(code) || Boolean(paid) || hasSession;
      setHasAccess(active);
      setChecked(true);
    })();
  }, [code, paid]);

  if (!checked) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg items-center justify-center px-4 py-16 text-xs text-warm-500">
        Checking access…
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg items-center px-4 py-16">
        <Card className="w-full text-center">
          <CardBody className="p-6 sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl text-amber-800">
              🔒
            </div>
            <h1 className="mt-4 text-xl font-bold text-ink sm:text-2xl">
              Activation Required
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-warm-600 leading-relaxed max-w-sm mx-auto">
              The TRB Android package and offline resources are available to active subscribers. Complete payment or input your activation code to unlock the download.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/pricing"
                className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-ink px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-neutral-800"
              >
                Get Started
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl border border-warm-300 bg-white px-5 py-3 text-xs font-semibold text-ink hover:bg-warm-50"
              >
                Have a Code?
              </Link>
            </div>

            <div className="mt-6 pt-4 border-t border-warm-100">
              <a
                href={getWhatsAppSupportUrl("Hi, I'd like to book a demo for the teacher resource bank")}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-warm-500 hover:text-ink underline"
              >
                Book a Demo on WhatsApp →
              </a>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg items-center px-4 py-16">
      <Card className="w-full">
        <CardBody className="p-6 sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mint-100 text-mint-800">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>

          <h1 className="mt-4 text-2xl font-bold text-ink">
            Teacher Resource Bank Downloads
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-warm-600">
            Download the official Android application package and offline resources directly to your device.
          </p>

          <div className="mt-6 space-y-3">
            {/* Android APK */}
            <a
              href="/api/downloads/apk"
              download="trb.apk"
              className="flex items-center justify-between rounded-xl border border-warm-300 bg-white p-4 shadow-sm hover:border-mint-500 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3">
                <img src="/trb-icon.png" alt="TRB Icon" className="h-10 w-10 rounded-xl object-cover shadow-sm" />
                <div className="text-left">
                  <div className="text-sm font-semibold text-ink group-hover:text-mint-700">
                    TRB Android Application
                  </div>
                  <div className="text-xs text-warm-500">Official Release · Ready to install</div>
                </div>
              </div>
              <span className="rounded-lg bg-mint-50 px-3 py-1.5 text-xs font-semibold text-mint-700 group-hover:bg-mint-600 group-hover:text-white transition-colors">
                Download App
              </span>
            </a>

            {/* Qwen AI Model */}
            <a
              href="/api/model/local/bundle"
              download="qwen2.5-0.5b-instruct-q4_k_m.gguf"
              className="flex items-center justify-between rounded-xl border border-warm-300 bg-white p-4 shadow-sm hover:border-mint-500 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🧠</span>
                <div className="text-left">
                  <div className="text-sm font-semibold text-ink group-hover:text-mint-700">
                    Offline Resource Bundle
                  </div>
                  <div className="text-xs text-warm-500">Offline teaching resources · 468 MB</div>
                </div>
              </div>
              <span className="rounded-lg bg-mint-50 px-3 py-1.5 text-xs font-semibold text-mint-700 group-hover:bg-mint-600 group-hover:text-white transition-colors">
                Download Resources
              </span>
            </a>
          </div>

          <p className="mt-6 text-center text-xs text-warm-500">
            Both packages are designed to function offline after download.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

export default function DownloadsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-16 text-sm text-neutral-500">
          Loading…
        </div>
      }
    >
      <DownloadsContent />
    </Suspense>
  );
}
