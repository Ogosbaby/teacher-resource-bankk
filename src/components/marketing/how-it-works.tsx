"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";

export function HowItWorks() {
  return (
    <section className="oak-section bg-cream border-b border-warm-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-14">
          
          {/* Left: Realistic Image depicting teacher preparing with AI + mock AI prompt (6 cols) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-6"
          >
            <div className="relative group overflow-hidden rounded-oak-2xl border border-warm-200 bg-white p-3 shadow-warm-lg">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-oak-xl bg-warm-200">
                <Image
                  src="/images/teacher-planning-ai.jpg"
                  alt="Nigerian teacher using laptop and planner to prepare classroom resources with AI assistance"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 540px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/20 to-transparent" />
                
                {/* Floating AI Query simulation card */}
                <div className="absolute bottom-4 left-4 right-4 rounded-xl bg-white/95 p-3.5 shadow-warm backdrop-blur-md border border-warm-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-mint-200 text-xs text-mint-900 font-bold">
                      ✦
                    </span>
                    <span className="text-xs font-semibold text-ink">
                      TRB Assistant Query
                    </span>
                    <span className="ml-auto rounded-full bg-warm-100 px-2 py-0.5 text-[10px] text-warm-600 font-mono">
                      AI Generated
                    </span>
                  </div>
                  <p className="text-xs text-warm-700 italic">
                    &ldquo;Give me 3 engaging starter activities for teaching Primary 5 Fractions using real-life Nigerian market examples.&rdquo;
                  </p>
                </div>
              </div>

              <div className="mt-3 px-2 flex items-center justify-between text-xs text-warm-600">
                <span className="flex items-center gap-1.5 font-medium text-ink">
                  <span className="h-2 w-2 rounded-full bg-mint-500 animate-pulse" />
                  Available 24/7 for Lesson Planning
                </span>
                <span>Grounded in NERDC Curriculum</span>
              </div>
            </div>
          </motion.div>

          {/* Right: AI Assistant & Structured Courses copy (6 cols) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-6 flex flex-col gap-6"
          >
            {/* AI Assistant Callout */}
            <div className="rounded-oak-xl border border-warm-200 bg-white p-6 sm:p-7 shadow-warm-sm">
              <span className="oak-badge">AI Teaching Assistant</span>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                Got a curriculum question? Just ask.
              </h2>
              <p className="mt-3 text-sm sm:text-base text-warm-600 leading-relaxed">
                Our AI assistant draws on published Nigerian resources and syllabus requirements
                to help you brainstorm starter activities, adjust differentiation levels, or clarify tricky topics — anytime, day or night.
              </p>
              <ul className="mt-5 space-y-2.5">
                {[
                  "Every response clearly marked as AI-generated",
                  "Grounded in published, teacher-reviewed resources",
                  "One-click feedback controls on every suggestion",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-xs sm:text-sm text-warm-700">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-mint-200 text-[10px] font-bold text-mint-800">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Courses callout */}
            <div className="rounded-oak-xl border border-mint-200 bg-mint-50/70 p-6 sm:p-7">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-mint-800 shadow-2xs">
                  Structured Courses
                </span>
                <span className="text-xs font-medium text-mint-700">Self-Paced</span>
              </div>
              <h3 className="mt-3 text-xl font-bold text-ink sm:text-2xl">
                Upgrade your skills with completion certificates
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-warm-600 leading-relaxed">
                Step-by-step professional development modules created for Nigerian teachers. Learn pedagogy, modern assessment, and classroom leadership at your convenience.
              </p>
              <div className="mt-5 flex items-center justify-between gap-4">
                <Link href="/courses">
                  <Button variant="primary" size="md" className="shadow-warm hover:shadow-warm-lg">
                    Browse courses
                  </Button>
                </Link>
                <span className="text-[11px] text-warm-500 max-w-xs text-right">
                  Certificates record module completion.
                </span>
              </div>
            </div>

          </motion.div>

        </div>
      </div>
    </section>
  );
}
