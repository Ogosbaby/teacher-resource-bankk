"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui";
import { TrustBadges } from "@/components/ui/trust-badge";
import { getWhatsAppSupportUrl } from "@/lib/support/whatsapp";

const TESTIMONIALS = [
  {
    name: "Mrs. Adebayo",
    role: "Primary 4 Teacher, Ikeja, Lagos",
    avatar: "/images/teacher-adebayo.jpg",
    badge: "Primary Curriculum",
    quote:
      "I used to spend my entire Sunday writing lesson notes from scratch. Now I adapt what's here in 20 minutes and have the rest of the day with my children.",
  },
  {
    name: "Mr. Okoro",
    role: "JSS2 Mathematics Teacher, Enugu",
    avatar: "/images/teacher-okoro.jpg",
    badge: "Junior Secondary",
    quote:
      "The scheme of work is already term-mapped and matches NERDC standards. I just tweak for my classroom. My students are doing much better because I am always prepared.",
  },
  {
    name: "Miss Aisha",
    role: "SSS1 Biology Teacher, Kano",
    avatar: "/images/teacher-aisha.jpg",
    badge: "Senior Secondary",
    quote:
      "The question banks saved me during exam term. Well-structured diagnostic questions that actually test deep understanding, not just rote recall.",
  },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-cream pt-10 pb-16 sm:pb-20 lg:pt-10 lg:pb-24">
      {/* Soft decorative background glows */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-mint-100 opacity-60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-subject-maths opacity-35 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
          {/* Left Column — Inspiring Copy & Actions (7 cols on lg) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="lg:col-span-7"
          >
            {/* <TrustBadges variant="compact" className="mb-5" /> */}

            <h1 className="text-3xl font-bold pt-4 tracking-tight text-ink sm:text-5xl lg:text-[3.25rem] lg:leading-[1.15]">
              Everything you need for your classroom,{" "}
              <span className="relative inline-block text-mint-700">
                100% offline.
                <svg
                  className="absolute -bottom-1.5 left-0 w-full text-mint-300 -z-10"
                  height="8"
                  viewBox="0 0 100 8"
                  preserveAspectRatio="none"
                  fill="currentColor"
                >
                  <path d="M0,5 Q50,8 100,3 L100,8 L0,8 Z" />
                </svg>
              </span>
            </h1>

            <p className="mt-3 max-w-md text-base sm:text-lg leading-relaxed text-warm-600">
              Lesson notes, schemes of work, and offline AI for Nigerian teachers. Zero internet required.
            </p>

            <div className="mt-5 flex items-center gap-3">
              <div className="flex -space-x-2.5 overflow-hidden">
                {TESTIMONIALS.map((t) => (
                  <div
                    key={t.name}
                    className="relative h-9 w-9 rounded-full border-2 border-white overflow-hidden shadow-sm ring-1 ring-warm-200"
                  >
                    <Image
                      src={t.avatar}
                      alt={t.name}
                      fill
                      className="object-cover"
                      sizes="36px"
                    />
                  </div>
                ))}
              </div>
              <div className="text-xs sm:text-sm text-warm-600">
                <span className="font-semibold text-ink">
                  1,200+ teachers
                </span>{" "}
                across 36 states
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              <Link href="/pricing">
                <Button
                  variant="primary"
                  size="lg"
                  className="min-w-[160px] shadow-warm hover:shadow-warm-lg"
                >
                  Get Started
                  <svg
                    className="h-4 w-4 ml-1.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </Button>
              </Link>
              <a
                href={getWhatsAppSupportUrl("Hi, I'd like to book a demo for the teacher resource bank")}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="outline"
                  size="lg"
                  className="min-w-[160px] bg-white/80 backdrop-blur-sm"
                >
                  Book a Demo
                </Button>
              </a>
            </div>

            {/* Curriculum badges / facts */}

            {/* Social Proof strip with real avatars */}
          </motion.div>

          {/* Right Column — Realistic Hero Meeting Image & Live Testimonials (5 cols on lg) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="lg:col-span-5 flex flex-col gap-4"
          >
            {/* Focal Hero Image: Nigerian teachers seated in a meeting */}
            <div className="relative group overflow-hidden rounded-oak-2xl border border-warm-200 bg-white p-2 shadow-warm-lg">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-oak-xl bg-warm-100">
                <Image
                  src="/images/hero-teachers-meeting.jpg"
                  alt="Nigerian teachers collaborating and planning curriculum lessons together in a staff meeting"
                  fill
                  priority
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 500px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent opacity-80" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
