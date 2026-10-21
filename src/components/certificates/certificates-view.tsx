"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Card, CardBody, Button } from "@/components/ui";
import { getLocalCertificates, type LocalCertificate } from "@/lib/certificates/local-certificates";
import {
  downloadCertificateAsImage,
  printCertificateDocument,
  generateCertificateDataUrl,
  type CertificateData,
} from "@/lib/certificates/certificate-canvas";

interface UnifiedCertificate {
  id: string;
  titleSnapshot: string;
  recipientNameSnapshot: string;
  completionDate: string;
  isOffline?: boolean;
}

export function CertificatesView({ serverCerts = [] }: { serverCerts: any[] }) {
  const [certs, setCerts] = useState<UnifiedCertificate[]>(serverCerts);
  const [previewCert, setPreviewCert] = useState<CertificateData | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

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

  function handleSaveImage(c: UnifiedCertificate) {
    const data: CertificateData = {
      recipientName: c.recipientNameSnapshot,
      courseTitle: c.titleSnapshot,
      completionDate: c.completionDate,
      certificateId: c.id,
    };
    setDownloading(c.id);
    try {
      downloadCertificateAsImage(data);
    } finally {
      setTimeout(() => setDownloading(null), 800);
    }
  }

  function handlePrintPDF(c: UnifiedCertificate) {
    const data: CertificateData = {
      recipientName: c.recipientNameSnapshot,
      courseTitle: c.titleSnapshot,
      completionDate: c.completionDate,
      certificateId: c.id,
    };
    printCertificateDocument(data);
  }

  function handleOpenPreview(c: UnifiedCertificate) {
    const data: CertificateData = {
      recipientName: c.recipientNameSnapshot,
      courseTitle: c.titleSnapshot,
      completionDate: c.completionDate,
      certificateId: c.id,
    };
    const url = generateCertificateDataUrl(data);
    setPreviewDataUrl(url);
    setPreviewCert(data);
  }

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
    <>
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

              {/* Action Buttons: Print PDF & Save Image */}
              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handlePrintPDF(c)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-warm-300 bg-white px-3.5 py-2 text-xs font-bold text-ink hover:bg-warm-50 transition-colors shadow-2xs"
                  title="Print certificate or save as PDF"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-warm-700" fill="none" aria-hidden="true">
                    <path
                      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Print / Save PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveImage(c)}
                  disabled={downloading === c.id}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-warm-300 bg-warm-50/80 px-3.5 py-2 text-xs font-bold text-ink hover:bg-warm-100 transition-colors shadow-2xs"
                  title="Download certificate as high-definition image"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-warm-700" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                  <span>{downloading === c.id ? "Saving..." : "Save as Image"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenPreview(c)}
                  className="inline-flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-semibold text-warm-500 hover:text-ink hover:bg-warm-100 transition-colors"
                >
                  <span>View</span>
                </button>
              </div>

              <p className="mt-4 text-[11px] leading-relaxed text-warm-400">
                Accredited pedagogical completion verified by Teacher Resource Bank.
              </p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Certificate Preview Modal */}
      {previewCert && previewDataUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-warm-200 px-6 py-4">
              <div>
                <h3 className="text-sm font-bold text-ink">Certificate Preview</h3>
                <p className="text-xs text-warm-500">{previewCert.courseTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreviewCert(null);
                  setPreviewDataUrl(null);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-warm-100 text-sm font-bold text-warm-600 hover:bg-warm-200"
              >
                ✕
              </button>
            </div>

            {/* Certificate Canvas / Image */}
            <div className="max-h-[70vh] overflow-auto bg-warm-100/50 p-4 text-center sm:p-6">
              <img
                src={previewDataUrl}
                alt="Certificate of Completion"
                className="mx-auto max-h-[60vh] w-auto rounded-lg shadow-lg border border-warm-300"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-warm-200 bg-warm-50/50 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => printCertificateDocument(previewCert)}
                className="text-xs"
              >
                📄 Print / Save as PDF
              </Button>
              <Button
                type="button"
                onClick={() => downloadCertificateAsImage(previewCert)}
                className="bg-ink text-white text-xs"
              >
                🖼️ Save as Image (PNG)
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
