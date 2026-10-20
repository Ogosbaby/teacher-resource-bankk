"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { getWhatsAppSupportUrl } from "@/lib/support/whatsapp";
import type { ClassLevel } from "@/lib/content/curriculum";
import { redeemActivationCode } from "@/lib/offline/activation";

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number;
        currency: string;
        ref: string;
        callback: (response: { reference: string; status: string }) => void;
        onClose: () => void;
      }) => {
        openIframe: () => void;
      };
    };
  }
}

interface StepActivateProps {
  name?: string;
  email?: string;
  phone?: string;
  classLevels?: ClassLevel[];
  subjects?: string[];
  error: string | null;
  finishing: boolean;
  onBack: () => void;
  onFinish: (code?: string) => void;
}

function loadPaystackScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.PaystackPop) {
      return resolve(true);
    }
    const existing = document.querySelector('script[src*="paystack"]');
    if (existing) {
      return resolve(true);
    }
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function StepActivate({
  name = "",
  email = "",
  phone = "",
  classLevels = [],
  subjects = [],
  error,
  finishing,
  onBack,
  onFinish,
}: StepActivateProps) {
  const router = useRouter();
  const [paystackLoading, setPaystackLoading] = useState(false);
  const [paystackError, setPaystackError] = useState<string | null>(null);

  // Manual code state
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [validatingCode, setValidatingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const paystackPublicKey =
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ||
    "pk_test_3847075c459ab42bea6c62592feb7ab2babef104";

  async function handlePaystackPay() {
    setPaystackError(null);
    setPaystackLoading(true);

    const cleanEmail = email.trim().toLowerCase() || "teacher@example.com";
    const cleanName = name.trim() || "Teacher";

    try {
      const loaded = await loadPaystackScript();
      if (!loaded || !window.PaystackPop) {
        setPaystackLoading(false);
        setPaystackError("Paystack payment could not be initialized. Please check your internet connection.");
        return;
      }

      const reference = `TRB_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;

      const handler = window.PaystackPop.setup({
        key: paystackPublicKey,
        email: cleanEmail,
        amount: 5000 * 100, // ₦5,000 in kobo
        currency: "NGN",
        ref: reference,
        callback: function (response) {
          // Payment confirmed by Paystack
          setPaystackLoading(true);
          void (async () => {
            try {
              const res = await fetch("/api/subscriptions/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: cleanName,
                  email: cleanEmail,
                  phone: phone.trim(),
                  classLevels,
                  subjects,
                  reference: response.reference,
                }),
              });

              const data = await res.json().catch(() => null);
              const assignedCode = data?.code || response.reference;

              // Save local unlock if needed
              onFinish(assignedCode);

              // Redirect to payment success page without exposing activation code on the web
              router.push(
                `/payment-success?status=paid&name=${encodeURIComponent(cleanName)}&email=${encodeURIComponent(cleanEmail)}`
              );
            } catch (e) {
              onFinish(response.reference);
              router.push(
                `/payment-success?status=paid&name=${encodeURIComponent(cleanName)}&email=${encodeURIComponent(cleanEmail)}`
              );
            }
          })();
        },
        onClose: function () {
          setPaystackLoading(false);
        },
      });

      handler.openIframe();
    } catch (err: any) {
      setPaystackLoading(false);
      setPaystackError(err?.message || "An unexpected error occurred launching Paystack. Please try again.");
    }
  }

  async function handleManualCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCodeError(null);
    const cleanCode = manualCode.trim().toUpperCase();

    if (!cleanCode) {
      setCodeError("Please enter an activation code.");
      return;
    }

    setValidatingCode(true);

    try {
      // Validate with server or shipped batch
      const res = await fetch("/api/activation/validate-and-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cleanCode }),
      }).catch(() => null);

      if (res && res.ok) {
        setValidatingCode(false);
        onFinish(cleanCode);
        router.push(
          `/payment-success?status=activated&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`
        );
        return;
      }

      // Offline fallback
      const offlineResult = await redeemActivationCode(cleanCode);
      setValidatingCode(false);

      if (offlineResult.ok) {
        onFinish(cleanCode);
        router.push(
          `/payment-success?status=activated&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`
        );
      } else {
        setCodeError("Invalid or already redeemed activation code. Please check and try again.");
      }
    } catch {
      setValidatingCode(false);
      setCodeError("Could not verify activation code. Please try again.");
    }
  }

  return (
    <div className="space-y-5 text-left">
      {/* Registration Summary Card */}
      <div className="rounded-2xl border border-warm-200 bg-white p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-warm-100 pb-2.5">
          <div>
            <p className="text-xs font-bold text-ink">{name || "Teacher"}</p>
            <p className="text-[11px] text-warm-500">{email}</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
            Term Pass
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-warm-50/70 p-2 border border-warm-200/60">
            <span className="text-[10px] uppercase font-bold text-warm-400 block">Class Levels</span>
            <span className="font-semibold text-ink truncate block">
              {classLevels.length > 0 ? classLevels.join(", ") : "None selected"}
            </span>
          </div>
          <div className="rounded-xl bg-warm-50/70 p-2 border border-warm-200/60">
            <span className="text-[10px] uppercase font-bold text-warm-400 block">Subjects</span>
            <span className="font-semibold text-ink truncate block">
              {subjects.length} subject{subjects.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-warm-600 font-medium">Nigerian Academic Term (3 Months)</span>
          <span className="text-xl font-black text-ink">₦5,000</span>
        </div>
      </div>

      {paystackError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {paystackError}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Main Paystack Action */}
      <div className="space-y-2.5">
        <Button
          type="button"
          onClick={handlePaystackPay}
          disabled={paystackLoading || finishing}
          className="w-full h-12 text-sm font-bold bg-[#0BA4DB] hover:bg-[#0991c2] text-white flex items-center justify-center gap-2 shadow-sm rounded-xl transition-all"
        >
          {paystackLoading ? (
            <span>Connecting to Paystack...</span>
          ) : (
            <span>Pay ₦5,000 with Paystack →</span>
          )}
        </Button>

        <p className="text-center text-[11px] text-warm-500">
          Instant activation code & app download link delivered upon payment.
        </p>
      </div>

      {/* Code Bypass / School Voucher Accordion */}
      <div className="rounded-2xl border border-warm-200 bg-warm-50/50 p-3.5">
        <button
          type="button"
          onClick={() => setShowCodeInput(!showCodeInput)}
          className="flex w-full items-center justify-between text-xs font-semibold text-ink"
        >
          <span>Have a code from your school or agent?</span>
          <span className="text-warm-500 text-sm">{showCodeInput ? "▲" : "▼"}</span>
        </button>

        {showCodeInput && (
          <form onSubmit={handleManualCodeSubmit} className="mt-3 space-y-2 pt-2 border-t border-warm-200">
            <input
              type="text"
              placeholder="e.g. TRB-2026-TERM1"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="w-full rounded-xl border border-warm-300 bg-white px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider text-ink focus:border-mint-600 focus:outline-none"
            />
            {codeError && <p className="text-[11px] text-rose-600 font-medium">{codeError}</p>}
            <Button
              type="submit"
              disabled={validatingCode}
              size="sm"
              className="w-full bg-ink text-white text-xs h-9"
            >
              {validatingCode ? "Verifying Code..." : "Activate with Code →"}
            </Button>
          </form>
        )}
      </div>

      {/* WhatsApp Help */}
      <div className="text-center">
        <a
          href={getWhatsAppSupportUrl(
            `Hi, I'm registering on TRB (Teacher: ${name || "Teacher"}). I would like assistance with payment or bank transfer.`
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-warm-600 hover:text-ink font-medium transition-colors"
        >
          <span>Need help or direct bank transfer?</span>
          <span className="text-emerald-700 font-semibold underline">Chat on WhatsApp</span>
        </a>
      </div>

      {/* Back button */}
      <div className="border-t border-warm-100 pt-3 flex justify-between items-center">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-medium text-warm-500 hover:text-ink"
        >
          ← Back to subjects
        </button>
        <span className="text-[11px] text-warm-400">Step 4 of 4</span>
      </div>
    </div>
  );
}
