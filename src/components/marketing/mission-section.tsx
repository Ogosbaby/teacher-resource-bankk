"use client";

import { motion } from "framer-motion";

export function MissionSection() {
  return (
    <section id="community" className="oak-section bg-white border-y border-warm-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="oak-badge">A Growing Community</span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl lg:text-4xl">
            Teachers across Nigeria, growing their practice together
          </h2>
          <p className="mt-2 text-base text-warm-600">
            Curriculum materials and CPD courses built for Nigerian classrooms.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {[
            {
              stat: "12",
              label: "Classes Covered",
              detail: "Primary 1 through SSS 3",
            },
            {
              stat: "40+",
              label: "Core Subjects",
              detail: "Primary, JSS, and SSS curriculums",
            },
            {
              stat: "100%",
              label: "Offline Ready",
              detail: "Zero internet required in class",
            },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="rounded-oak-xl border border-warm-200 bg-cream p-7 text-center shadow-warm-sm transition-all hover:shadow-warm hover:-translate-y-1"
            >
              <p className="text-4xl font-extrabold text-mint-700">
                {item.stat}
              </p>
              <p className="mt-2 text-base font-semibold text-ink">
                {item.label}
              </p>
              <p className="mt-1 text-xs sm:text-sm text-warm-600">
                {item.detail}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
