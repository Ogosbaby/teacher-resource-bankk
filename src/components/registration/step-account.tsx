import Link from "next/link";
import { Button } from "@/components/ui";

/**
 * Step 1 — Teacher Profile (Name, Email, WhatsApp).
 */
export function StepAccount({
  name,
  email,
  phone = "",
  error,
  checkingEmail = false,
  emailConflict = null,
  onNameChange,
  onEmailChange,
  onPhoneChange,
  onSubmit,
}: {
  name: string;
  email: string;
  phone?: string;
  error: string | null;
  checkingEmail?: boolean;
  emailConflict?: string | null;
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
          className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-ink placeholder-warm-400 focus:outline-none transition-colors ${
            emailConflict
              ? "border-amber-400 bg-amber-50/40 focus:border-amber-500"
              : "border-warm-300 bg-warm-50/50 focus:border-mint-600 focus:bg-white"
          }`}
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

      {emailConflict ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3.5 space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-900 font-bold text-xs mt-0.5">
              !
            </span>
            <div>
              <p className="text-xs font-bold text-amber-950">Email Already Registered</p>
              <p className="mt-0.5 text-xs text-amber-900 leading-relaxed">
                {emailConflict}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-amber-200/70">
            <Link
              href={`/sign-in?email=${encodeURIComponent(email)}`}
              className="inline-flex items-center justify-center rounded-xl bg-ink px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors shadow-xs"
            >
              Sign in with your email →
            </Link>
            <a
              href={`https://wa.me/2349069261584?text=${encodeURIComponent(
                `Hi, I already registered with email ${email} and need help accessing my activation code or account.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-100/50 transition-colors"
            >
              Contact Support
            </a>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
          {error}
        </div>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={checkingEmail}
        className="w-full h-11 bg-ink text-white hover:bg-neutral-800 font-semibold shadow-sm text-sm mt-3 flex items-center justify-center gap-2"
      >
        {checkingEmail ? (
          <>
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <span>Verifying email...</span>
          </>
        ) : (
          <span>Continue to Class Levels →</span>
        )}
      </Button>
    </form>
  );
}
