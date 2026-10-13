"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { getWhatsAppSupportUrl } from "@/lib/support/whatsapp";

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
  email?: string;
  error: string | null;
  finishing: boolean;
  onBack: () => void;
  onFinish: (code?: string) => void;
}

export function StepActivate({
  email = "",
  error,
  finishing,
  onBack,
  onFinish,
}: StepActivateProps) {
  const [paystackLoading, setPaystackLoading] = useState(false);
  const [paystackError, setPaystackError] = useState<string | null>(null);

  // Default Paystack test public key; overrideable by NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
  const paystackPublicKey =
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ||
    "pk_test_b8e5c3c0ef0e451475727932c0282142278e8584";

  function loadPaystackScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && window.PaystackPop) {
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

  async function handlePaystackPay() {
    setPaystackError(null);
    setPaystackLoading(true);

    try {
      const loaded = await loadPaystackScript();
      if (!loaded || !window.PaystackPop) {
        setPaystackLoading(false);
        setPaystackError("Paystack payment popup could not be loaded. Please check your internet connection.");
        return;
      }

      const teacherEmail = email.trim() || "teacher@example.com";
      const reference = `TRB_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

      const handler = window.PaystackPop.setup({
        key: paystackPublicKey,
        email: teacherEmail,
        amount: 5000 * 100, // ₦5,000 in kobo
        currency: "NGN",
        ref: reference,
        callback: (response) => {
          setPaystackLoading(false);
          // Payment successful!
          onFinish(`paystack_${response.reference}`);
        },
        onClose: () => {
          setPaystackLoading(false);
        },
      });

      handler.openIframe();
    } catch (err) {
      setPaystackLoading(false);
      setPaystackError((err as Error).message || "An error occurred starting payment.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Pricing card */}
      <div className="rounded-2xl border border-warm-200 bg-white p-5 text-center shadow-warm-sm">
        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
          Paystack Test Mode
        </span>
        <p className="mt-2 text-sm font-medium text-warm-600">Nigerian Academic Term Pass</p>
        <p className="mt-1 text-3xl font-extrabold text-ink">
          ₦5,000 <span className="text-sm font-normal text-warm-500">/ term (3 months)</span>
        </p>
        <p className="mt-2 text-xs text-warm-500 max-w-xs mx-auto leading-relaxed">
          Full unlimited offline access to all accredited CPD courses, WAEC test banks, and curriculum lesson plans.
        </p>
      </div>

      {/* Paystack Test notice */}
      <div className="rounded-xl border border-warm-200 bg-warm-50 p-3 text-xs text-warm-600 space-y-1">
        <p className="font-semibold text-ink flex items-center gap-1.5">
          <span>💳</span> Paystack Test Payments Enabled
        </p>
        <p className="text-[11px] leading-relaxed text-warm-500">
          Use Paystack test card: <span className="font-mono font-medium text-ink">4084 0840 0840 0840</span> (expiry: any future date, CVV: <span className="font-mono text-ink">408</span>, OTP: <span className="font-mono text-ink">12345</span>).
        </p>
      </div>

      {paystackError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {paystackError}
        </div>
      )}

      {error && <p className="text-center text-xs text-rose-600">{error}</p>}

      {/* Action buttons */}
      <div className="space-y-2.5">
        <Button
          type="button"
          onClick={handlePaystackPay}
          isLoading={paystackLoading}
          className="w-full h-12 text-sm font-semibold bg-[#0BA4DB] hover:bg-[#0991c2] text-white flex items-center justify-center gap-2 shadow-sm"
        >
          <span>Pay ₦5,000 with Paystack</span>
        </Button>

        <a
          href={getWhatsAppSupportUrl("Hi, I'd like to book a demo for the teacher resource bank")}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full h-11 text-xs font-semibold rounded-xl border border-warm-300 bg-white hover:bg-warm-50 text-warm-700 flex items-center justify-center gap-2 transition-colors shadow-xs"
        >
          <span>Book a Demo on WhatsApp</span>
        </a>
      </div>

      <div className="flex items-center justify-between border-t border-warm-100 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-medium text-warm-500 hover:text-ink"
        >
          ← Back to subjects
        </button>
        <span className="text-[11px] text-warm-400">
          Have a physical card? Use Input Code above
        </span>
      </div>
    </div>
  );
}
