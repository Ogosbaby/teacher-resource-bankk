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
  grantTermPass,
  isValidCodeFormat,
  provisionLocalModel,
  redeemActivationCode,
  registerDevice,
  syncTermPassWithServer,
  saveTeacherProfile,
} from "@/lib/offline";

/**
 * Native app activation screen — shown the first time a brand-new device
 * opens the app (after the splash screen).
 *
 * The teacher must have already:
 *   1. Registered on the website
 *   2. Paid via Paystack
 *   3. Received an activation code via email
 *
 * This screen asks for just that activation code. On success:
 *   - A device token is written (recognising this device going forward)
 *   - A term pass is granted
 *   - The code is bound to this device's UUID
 *   - The teacher is taken to the resource download / courses screen
 *
 * There is NO registration form here. Registration happens on the website only.
 */
export default function AppActivatePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

      // Grant the term pass and bind the code to this device
      grantTermPass(result.code ?? cleaned, result.months ?? DEFAULT_TERM_MONTHS);
      registerDevice(result.code ?? cleaned);
      clearDraft();
      clearTermPassRevocation();

      // Start background model download and server sync
      provisionLocalModel();
      void syncTermPassWithServer();

      // Navigate to courses
      router.replace("/courses");
      router.refresh();
    } catch (err) {
      setLoading(false);
      setError((err as Error).message || "Could not verify activation code.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4 py-8">
      <Card className="w-full max-w-md overflow-hidden border-0 bg-white shadow-2xl">
        <CardBody className="p-6 sm:p-8">
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
                className="mt-1.5 font-mono text-center tracking-widest uppercase text-base h-12"
                required
                autoFocus
              />
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 leading-relaxed">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-sm font-semibold"
              isLoading={loading}
            >
              Activate &amp; Continue
            </Button>
          </form>

          {/* Help text */}
          <div className="mt-6 border-t border-warm-100 pt-4 text-center">
            <p className="text-[11px] text-warm-400 leading-relaxed">
              Don&apos;t have a code? Register and pay at{" "}
              <span className="font-semibold text-warm-600">teacherresourcebank.com</span>{" "}
              to receive yours.
            </p>
          </div>

          {/* Already activated before — sign in instead */}
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => router.replace("/app/sign-in")}
              className="text-xs font-semibold text-ink underline underline-offset-2 hover:text-warm-700 transition-colors"
            >
              Already activated? Sign in instead
            </button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
