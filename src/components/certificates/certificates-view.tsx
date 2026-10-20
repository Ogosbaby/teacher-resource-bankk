"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui";
import { getLocalCertificates, type LocalCertificate } from "@/lib/certificates/local-certificates";

interface UnifiedCertificate {
  id: string;
  titleSnapshot: string;
  recipientNameSnapshot: string;
  completionDate: string;
  isOffline?: boolean;
}

export function CertificatesView({ serverCerts = [] }: { serverCerts: any[] }) {
  const [certs, setCerts] = useState<UnifiedCertificate[]>(serverCerts);

  useEffect(() => {
    // Merge with any locally earned offline certificates
    const local = getLocalCertificates();
    if (local.length > 0) {
      const formatted: UnifiedCertificate[] = local.map((l) => ({
        id: l.id,
        titleSnapshot: l.titleSnapshot,
        recipientNameSnapshot: l.recipientNameSnapshot,
        completionDate: l.completionDate,
        isOffline: true,
      }));

      setCerts((prev) => {
        const seen = new Set(prev.map((p) => p.titleSnapshot));
        const newLocal = formatted.filter((f) => !seen.has(f.titleSnapshot));
        return [...newLocal, ...prev];
      });
    }
  }, [serverCerts]);

  if (certs.length === 0) {
    return (
      <div className="mt-8 rounded-oak border border-warm-200 bg-white p-12 text-center shadow-warm-sm">
        <p className="text-3xl">🏅</p>
        <p className="mt-3 text-lg font-bold text-ink">No certificates yet.</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-warm-600">
          Finish every module in a CPD course and mark it complete — your certificate unlocks
          automatically right on this device.
        </p>
        <Link
          href="/courses"
          className="mt-6 inline-flex rounded-xl bg-ink px-6 py-3 text-xs font-bold text-white shadow-sm hover:bg-neutral-800"
        >
          Browse CPD Courses
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-5 sm:grid-cols-2">
      {certs.map((c) => (
        <Card key={c.id} className="border border-warm-200 bg-white shadow-sm hover:shadow-md transition-all">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-mint-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-mint-800">
                <span>🏅</span> Certificate of Completion
              </span>
              {c.isOffline && (
                <span className="text-[10px] font-semibold text-warm-500 bg-warm-100 rounded-md px-2 py-0.5">
                  Offline Verified
                </span>
              )}
            </div>

            <h2 className="mt-4 text-base font-bold leading-snug text-ink sm:text-lg">
              {c.titleSnapshot}
            </h2>

            <p className="mt-2 text-xs text-warm-600">
              Awarded to <strong className="text-ink">{c.recipientNameSnapshot}</strong> · Completed{" "}
              {new Date(c.completionDate).toLocaleDateString("en-NG", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl border border-warm-300 bg-warm-50 px-4 py-2 text-xs font-bold text-ink hover:bg-warm-100 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                  <path
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Print / Save PDF
              </button>
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-warm-400">
              Accredited pedagogical completion verified by Teacher Resource Bank.
            </p>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
