"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { TrustBadges } from "@/components/ui/trust-badge";

const PILLARS = [
  {
    icon: (
      <svg
        className="h-5 w-5 text-purple-700"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    ),
    title: "Structured CPD Courses",
    description: "Self-paced professional training with verifiable completion certificates.",
    color: "bg-subject-art",
  },
  {
    icon: (
      <svg
        className="h-5 w-5 text-blue-700"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    title: "AI Lesson Planner",
    description: "Generate comprehensive NERDC lesson notes in seconds for offline use.",
    color: "bg-subject-english",
  },
  {
    icon: (
      <svg
        className="h-5 w-5 text-emerald-700"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
    title: "Curriculum & Question Bank",
    description: "Term-mapped lesson notes, schemes of work, and diagnostic questions from Primary 1 to SSS 3.",
    color: "bg-subject-tech",
  },
];

export function PillarsSection() {
  return (
    <section id="features" className="oak-section bg-white border-y border-warm-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="oak-badge">Core Features</span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl lg:text-4xl">
            Everything for your teaching workflow
          </h2>
          <p className="mt-2 text-base text-warm-600">
            Practical materials and offline tools to plan lessons in minutes.
          </p>
        </motion.div>

        {/* Balanced Grid: Image depicting classroom teaching + 4 Feature Cards */}
        <div className="mt-12 grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Left: Realistic Nigerian classroom photo depicting lesson note in action (5 cols) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-5"
          >
            <div className="relative group overflow-hidden rounded-oak-2xl border border-warm-200 bg-cream p-2.5 shadow-warm-lg">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-oak-xl bg-warm-200">
                <Image
                  src="/images/classroom-lesson.jpg"
                  alt="Nigerian teacher leading an active primary school English class with students participating enthusiastically"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 480px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
              </div>
            </div>
          </motion.div>

          {/* Right: The 3 Flagship Features (7 cols) */}
          <div className="lg:col-span-7 grid gap-4">
            {PILLARS.map((pillar, i) => (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="group flex items-start gap-4 rounded-oak-xl border border-warm-200 bg-cream/70 p-5 transition-all duration-200 hover:border-warm-300 hover:bg-white hover:shadow-warm"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-xs transition-transform group-hover:scale-110 ${pillar.color}`}
                >
                  {pillar.icon}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-ink group-hover:text-mint-700 transition-colors">
                    {pillar.title}
                  </h3>
                  <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-warm-600">
                    {pillar.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
