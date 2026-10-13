"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, Button } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logomark } from "@/components/brand/logomark";
import {
  ACTIVATION_ERROR_MESSAGES,
  clearDraft,
  clearTermPassRevocation,
  DEFAULT_TERM_MONTHS,
  formatBytes,
  grantTermPass,
  isValidCodeFormat,
  provisionLocalModel,
  redeemActivationCode,
  registerDevice,
  syncTermPassWithServer,
  type ModelState,
} from "@/lib/offline";

/**
 * Native app activation & resource download screen.
 *
 * Flow:
 *  1. Teacher inputs activation code received after web payment.
 *  2. Code is cryptographically verified and bound to this hardware device UUID.
 *  3. "Downloading Resources" phase kicks off:
 *     - Downloads the offline AI model (~491 MB)
 *     - Caches curriculum & lesson notes for 100% offline usage.
 *  4. Teacher can watch the live progress bar or proceed to courses anytime.
 */
export default function AppActivatePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Downloading resources state
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusDetail, setStatusDetail] = useState("Preparing offline engine...");
  const [bytesDownloaded, setBytesDownloaded] = useState(0);
  const [totalBytes, setTotalBytes] = useState(491_400_032);
  const [isReady, setIsReady] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cleaned = code.trim().toUpperCase();

    if (!isValidCodeFormat(cleaned)) {
      setError("Enter a valid activation code formatted as TRB-XXXX-XXXX.");
      return;
    }

    setLoading(true);
    try {
      const result = await redeemActivationCode(cleaned);
      if (!result.ok) {
        setLoading(false);
        setError(ACTIVATION_ERROR_MESSAGES[result.reason ?? "unknown"]);
        return;
      }

      // 1. Grant the term pass and securely bind the code to this device UUID
      grantTermPass(result.code ?? cleaned, result.months ?? DEFAULT_TERM_MONTHS);
      registerDevice(result.code ?? cleaned);
      clearDraft();
      clearTermPassRevocation();

      // 2. Sync term pass with cloud in background
      void syncTermPassWithServer();

      // 3. Switch to downloading resources view
      setLoading(false);
      setIsDownloading(true);

      // 4. Provision local AI model & curriculum resources
      provisionLocalModel((state: ModelState) => {
        setProgress(state.progress);
        setBytesDownloaded(state.bytesDownloaded);
        if (state.totalBytes) setTotalBytes(state.totalBytes);
        if (state.detail) setStatusDetail(state.detail);

        if (state.status === "ready") {
          setIsReady(true);
          setStatusDetail("All offline resources downloaded & verified.");
          // Auto-redirect to courses after 1.8 seconds
          setTimeout(() => {
            router.replace("/courses");
            router.refresh();
          }, 1800);
        }
      });
    } catch (err) {
      setLoading(false);
      setError((err as Error).message || "Could not verify activation code.");
    }
  }

  function handleContinue() {
    router.replace("/courses");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4 py-8">
      <Card className="w-full max-w-md overflow-hidden border-0 bg-white shadow-2xl">
        <CardBody className="p-6 sm:p-8">
          {isDownloading ? (
            /* Resource Download Phase */
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-mint-100 text-3xl mb-4">
                {isReady ? "🎉" : "📥"}
              </div>

              <h1 className="text-xl font-bold tracking-tight text-ink">
                {isReady ? "Ready for Offline Teaching!" : "Downloading Offline Resources"}
              </h1>
              <p className="mt-2 text-xs text-warm-600 leading-relaxed max-w-sm mx-auto">
                {isReady
                  ? "Your AI teaching engine and curriculum resources are downloaded. You can now use the app anywhere without internet."
                  : "Downloading the on-device AI model and Nigerian curriculum so you can teach 100% offline."}
              </p>

              {/* Progress Bar Card */}
              <div className="mt-6 rounded-2xl border border-warm-200 bg-warm-50/70 p-4 text-left">
                <div className="flex items-center justify-between text-xs font-semibold text-ink">
                  <span>Offline AI Assistant</span>
                  <span className="font-mono text-mint-700">{progress}%</span>
                </div>

                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-warm-200">
                  <div
                    className="h-full rounded-full bg-mint-500 transition-all duration-300"
                    style={{ width: `${Math.max(5, progress)}%` }}
                  />
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[11px] text-warm-500">
                  <span>{formatBytes(bytesDownloaded)} of {formatBytes(totalBytes)}</span>
                  <span className="truncate max-w-[170px] text-right font-medium text-warm-600">
                    {statusDetail}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6">
                <Button
                  onClick={handleContinue}
                  className="w-full justify-center rounded-xl bg-ink py-3 text-xs font-bold text-white shadow-md hover:bg-neutral-800"
                >
                  {isReady ? "Open Teacher Resource Bank →" : "Continue to Courses"}
                </Button>

                {!isReady && (
                  <p className="mt-3 text-[11px] text-warm-400">
                    The download continues in the background if you proceed.
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Activation Code Input Phase */
            <>
              {/* Logo & Heading */}
              <div className="text-center mb-6">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-white mb-4">
                  <Logomark size={32} animated={false} />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-ink">
                  Activate This Device
                </h1>
                <p className="mt-2 text-xs text-warm-500 leading-relaxed">
                  Enter the activation code from your registration email.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Label htmlFor="activation-code" className="text-xs font-semibold text-ink">
                    Activation Code
                  </Label>
                  <Input
                    id="activation-code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="TRB-XXXX-XXXX"
                    className="mt-1.5 font-mono text-center tracking-widest text-base uppercase"
                    disabled={loading}
                    autoFocus
                    required
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-700 text-left">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || !code.trim()}
                  className="w-full justify-center rounded-xl bg-ink py-3 text-xs font-bold text-white shadow-md hover:bg-neutral-800 disabled:opacity-50"
                >
                  {loading ? "Verifying Code…" : "Activate Device"}
                </Button>
              </form>

              {/* Security notice */}
              <div className="mt-6 rounded-xl border border-warm-200 bg-warm-50 p-3 text-left">
                <p className="text-[11px] leading-relaxed text-warm-600">
                  🔒 <strong className="text-ink">Device-Bound License:</strong> Your activation code attaches directly to this hardware. Need to change devices? Contact support.
                </p>
              </div>

              {/* Support */}
              <div className="mt-5 text-center">
                <a
                  href="https://wa.me/2348000000000?text=Hi%2C%20I%20need%20help%20with%20my%20Teacher%20Resource%20Bank%20activation%20code"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-warm-500 hover:text-ink underline"
                >
                  Need help? Contact Support on WhatsApp
                </a>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
