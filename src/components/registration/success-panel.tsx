"use client";

import { motion } from "framer-motion";
import { Button, Card, CardBody } from "@/components/ui";
import { formatBytes, type ModelState } from "@/lib/offline";
import { useIsNativeApp } from "@/lib/native/app";
import type { GrantedPass } from "./use-registration";

/**
 * Shown once a pass is active, whether it came from a code or the demo step.
 *
 * The model block is informational and never blocking: provisioning is a
 * background chore, so the primary action is always available. It distinguishes a
 * locally-installed model from a transferred one, because "already here" and
 * "downloading" are very different things to tell a teacher.
 */
export function SuccessPanel({
  granted,
  modelState,
  teacherName,
  onContinue,
}: {
  granted: GrantedPass;
  modelState: ModelState;
  teacherName?: string;
  onContinue: () => void;
}) {
  const isNative = useIsNativeApp();
  const firstName = teacherName?.trim().split(/\s+/)[0] || "Teacher";

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardBody>
          <div className="text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">
              🎉
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-neutral-900">
              Welcome, {firstName}!
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Your term pass is active.
              {granted.code ? ` Activated with ${granted.code}.` : " Access unlocked for your academic term."}
            </p>
          </div>

          <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              On-device AI model
            </p>
            <p className="mt-1 text-sm text-neutral-700">
              {modelState.status === "ready"
                ? modelState.local
                  ? "Ready — using the model already installed on this device."
                  : modelState.verified === false
                    ? "Downloaded — the host offered no checksum to verify against."
                    : "Ready — the assistant now runs without a connection."
                : modelState.status === "error"
                  ? "Could not finish now — it will retry the next time you open the app."
                  : `Preparing in the background · ${modelState.progress}%`}
            </p>
            {modelState.detail && <p className="mt-1 text-xs text-neutral-500">{modelState.detail}</p>}

            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
              <motion.div
                className="h-full rounded-full bg-ink"
                animate={{ width: `${modelState.progress}%` }}
                transition={{ duration: 0.25 }}
              />
            </div>
            <p className="mt-2 text-xs text-neutral-400">
              {formatBytes(modelState.bytesDownloaded)} of {formatBytes(modelState.totalBytes)} · you can
              keep using the app
            </p>

            <div className="mt-4 pt-3 border-t border-neutral-200">
              <a
                href="/api/model/local/bundle"
                download="qwen2.5-0.5b-instruct-q4_k_m.gguf"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-mint-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-mint-800 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Resources (468 MB)
              </a>
            </div>
          </div>

          {!isNative ? (
            <a
              href={`/payment-success?status=activated&name=${encodeURIComponent(firstName)}`}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-neutral-800 transition-colors"
            >
              <span>Download TRB App →</span>
            </a>
          ) : (
            <Button variant="outline" className="mt-4 w-full" onClick={onContinue}>
              Go to my courses →
            </Button>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
