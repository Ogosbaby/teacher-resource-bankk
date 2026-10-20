"use client";

import { Button } from "@/components/ui";

/**
 * Step 1 — Teacher Profile (Name, Email, WhatsApp).
 */
export function StepAccount({
  name,
  email,
  phone = "",
  error,
  onNameChange,
  onEmailChange,
  onPhoneChange,
  onSubmit,
}: {
  name: string;
  email: string;
  phone?: string;
  error: string | null;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange?: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4 text-left">
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-xs font-semibold text-ink">
          Full Name <span className="text-rose-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          required
          placeholder="e.g. Mrs. Chioma Adeyemi"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          autoComplete="name"
          className="w-full rounded-xl border border-warm-300 bg-warm-50/50 px-3.5 py-2.5 text-sm text-ink placeholder-warm-400 focus:border-mint-600 focus:bg-white focus:outline-none transition-colors"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-xs font-semibold text-ink">
          Email Address <span className="text-rose-500">*</span>
        </label>
        <input
          id="email"
          type="email"
          required
          placeholder="e.g. chioma@school.ng"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          autoComplete="email"
          className="w-full rounded-xl border border-warm-300 bg-warm-50/50 px-3.5 py-2.5 text-sm text-ink placeholder-warm-400 focus:border-mint-600 focus:bg-white focus:outline-none transition-colors"
        />
        <p className="text-[11px] text-warm-500">Your activation code and term receipt will be delivered here.</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="phone" className="text-xs font-semibold text-ink">
          Phone / WhatsApp <span className="text-xs font-normal text-warm-400">(Optional)</span>
        </label>
        <input
          id="phone"
          type="tel"
          placeholder="e.g. 08012345678"
          value={phone}
          onChange={(e) => onPhoneChange?.(e.target.value)}
          autoComplete="tel"
          className="w-full rounded-xl border border-warm-300 bg-warm-50/50 px-3.5 py-2.5 text-sm text-ink placeholder-warm-400 focus:border-mint-600 focus:bg-white focus:outline-none transition-colors"
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
        className="w-full h-11 bg-ink text-white hover:bg-neutral-800 font-semibold shadow-sm text-sm mt-3"
      >
        Continue to Class Levels →
      </Button>
    </form>
  );
}
