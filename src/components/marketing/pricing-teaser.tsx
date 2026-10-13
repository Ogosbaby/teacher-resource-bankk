"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { getWhatsAppSupportUrl } from "@/lib/support/whatsapp";

const INCLUDED = [
  "Structured CPD courses with verifiable completion certificates",
  "AI teaching assistant grounded in published curriculum",
  "Full lesson notes, schemes of work, and question banks to apply what you learn",
  "Unlimited access to the reviewed Nigerian curriculum bank",
  "Clean, predictable access throughout the entire school term",
];

export function PricingTeaser() {
  return (
    <section
      id="pricing"
      className="oak-section bg-cream border-b border-warm-200"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-6">
            <span className="oak-badge">Transparent Pricing</span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              One simple pass. Full access.
            </h2>
            <p className="mt-3 text-base sm:text-lg leading-relaxed text-warm-600">
              Covers all curriculum lesson notes, CPD courses, certificates, and the offline AI assistant for the entire academic term.
            </p>

            <div className="mt-6 space-y-2.5">
              <div className="flex items-center gap-3 text-sm text-warm-700">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-mint-200 text-xs font-bold text-mint-800">
                  ✓
                </span>
                <span>Full access for 1 academic term</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-warm-700">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-mint-200 text-xs font-bold text-mint-800">
                  ✓
                </span>
                <span>All levels from Primary 1 to SSS 3</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-warm-700">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-mint-200 text-xs font-bold text-mint-800">
                  ✓
                </span>
                <span>100% offline functionality on your Android device</span>
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-6"
          >
            <div className="relative overflow-hidden rounded-oak-2xl bg-ink p-8 sm:p-10 text-white shadow-warm-xl">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-mint-300">
                  Teacher Term Pass
                </p>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-warm-300 backdrop-blur-sm">
                  Full Access
                </span>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <p className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
                  ₦5,000
                </p>
                <span className="text-sm font-medium text-warm-300">
                  / academic term
                </span>
              </div>

              <div className="mt-3 h-1 w-20 rounded-full bg-mint-400" />

              <div className="mt-8 flex flex-col gap-3">
                <Link href="/pricing" className="block w-full">
                  <Button
                    variant="mint"
                    size="lg"
                    className="w-full text-base font-semibold shadow-warm hover:shadow-warm-lg"
                  >
                    Get Started
                  </Button>
                </Link>

                <a
                  href={getWhatsAppSupportUrl("Hi, I'd like to book a demo for the teacher resource bank")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-2.5 text-xs font-semibold text-warm-300 hover:text-white transition-colors"
                >
                  Need a school walkthrough? Book a Demo on WhatsApp →
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
