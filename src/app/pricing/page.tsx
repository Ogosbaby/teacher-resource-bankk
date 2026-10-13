import Link from "next/link";
import { Logomark } from "@/components/brand/logomark";
import { PricingCheckoutForm } from "@/components/pricing/pricing-checkout-form";

export const metadata = { title: "Get Started · Teacher Resource Bank" };

export default function PricingPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-warm-50/50 px-4 py-8 sm:py-12">
      <div className="w-full max-w-md rounded-3xl border border-warm-200 bg-white p-6 shadow-warm-lg sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-white mb-3">
            <Logomark size={28} animated={false} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Get Started</h1>
          <p className="mt-1 text-sm text-warm-600">
            Term Pass · <strong className="text-ink font-semibold">₦5,000</strong> (3 months access)
          </p>
        </div>

        <PricingCheckoutForm />

        <div className="mt-6 border-t border-warm-100 pt-4 text-center">
          <p className="text-xs text-warm-500">
            Already have an activation code?{" "}
            <Link href="/sign-in" className="font-semibold text-ink underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
