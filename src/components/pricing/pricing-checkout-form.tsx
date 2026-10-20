"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

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

export function PricingCheckoutForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setError("Please enter your full name.");
      return;
    }

    if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const loaded = await loadPaystackScript();
      if (!loaded || !window.PaystackPop) {
        setLoading(false);
        setError("Paystack payment could not be initialized. Please check your internet connection.");
        return;
      }

      const paystackKey =
        process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ||
        "pk_test_b8e5c3c0ef0e451475727932c0282142278e8584";
      const reference = `TRB_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;

      const handler = window.PaystackPop.setup({
        key: paystackKey,
        email: cleanEmail,
        amount: 5000 * 100, // ₦5,000 in kobo
        currency: "NGN",
        ref: reference,
        callback: function (response) {
          // Payment confirmed by Paystack!
          void (async () => {
            try {
              await fetch("/api/subscriptions/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: cleanName,
                  email: cleanEmail,
                  phone: phone.trim(),
                  reference: response.reference,
                }),
              });

              // Redirect to payment success page ONLY after successful payment!
              router.push(
                `/payment-success?status=paid&name=${encodeURIComponent(cleanName)}&email=${encodeURIComponent(cleanEmail)}`
              );
            } catch {
              router.push(
                `/payment-success?status=paid&name=${encodeURIComponent(cleanName)}&email=${encodeURIComponent(cleanEmail)}`
              );
            }
          })();
        },
        onClose: function () {
          setLoading(false);
        },
      });

      handler.openIframe();
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || "An unexpected error occurred. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
      <div className="space-y-1">
        <label className="text-xs font-semibold text-ink">Your Full Name</label>
        <input
          type="text"
          required
          placeholder="e.g. Mrs. Chioma Adeyemi"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-warm-300 bg-warm-50/50 px-3.5 py-2.5 text-sm text-ink placeholder-warm-400 focus:border-mint-600 focus:bg-white focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-ink">Email for Activation Code</label>
        <input
          type="email"
          required
          placeholder="e.g. chioma@school.ng"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-warm-300 bg-warm-50/50 px-3.5 py-2.5 text-sm text-ink placeholder-warm-400 focus:border-mint-600 focus:bg-white focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-ink">Phone / WhatsApp (Optional)</label>
        <input
          type="tel"
          placeholder="e.g. 08012345678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-xl border border-warm-300 bg-warm-50/50 px-3.5 py-2.5 text-sm text-ink placeholder-warm-400 focus:border-mint-600 focus:bg-white focus:outline-none"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
          {error}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={loading}
        className="w-full h-12 bg-ink text-white hover:bg-neutral-800 font-semibold shadow-md text-sm mt-2"
      >
        {loading ? "Opening Secure Payment..." : "Pay ₦5,000 & Get Activation Code →"}
      </Button>

      <p className="text-center text-[11px] text-warm-500 pt-1">
        Secure payment via Paystack · App unlocked upon payment
      </p>
    </form>
  );
}
