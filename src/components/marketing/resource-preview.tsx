"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";

const SAMPLES = [
  {
    type: "Lesson Note",
    title: "Place Value — Large Numbers up to 100,000",
    subject: "Mathematics",
    class: "Primary 4",
    link: "/subjects/primary/p4/mathematics",
    color: "bg-subject-maths",
    highlights: ["Clear learning objectives", "Real-world Nigerian money context", "Formative starter & exit questions"],
  },
  {
    type: "Scheme of Work",
    title: "Term 1 Structured English Language",
    subject: "English Language",
    class: "JSS 2",
    link: "/subjects/junior-secondary/jss2/english-language",
    color: "bg-subject-english",
    highlights: ["12-week breakdown mapped to NERDC", "Integrated grammar & comprehension", "Weekly assessment milestones"],
  },
  {
    type: "Question Bank",
    title: "Biology — Ecosystems & Energy Flow",
    subject: "Biology",
    class: "SSS 1",
    link: "/subjects/senior-secondary/sss1/biology",
    color: "bg-subject-science",
    highlights: ["Categorized by Bloom's Taxonomy", "Multiple choice & structured theory", "Detailed marking schemes"],
  },
];

export function ResourcePreview() {
  return (
    <section className="oak-section bg-cream">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="oak-badge">Real Classroom Materials</span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl lg:text-4xl">
            See what&apos;s inside our curriculum bank
          </h2>
          <p className="mt-3 text-base text-warm-600">
            Actual previews of materials Nigerian educators adapt for their classrooms every week.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {SAMPLES.map((sample, i) => (
            <motion.div
              key={sample.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="oak-card group flex flex-col justify-between overflow-hidden border border-warm-200"
            >
              <div>
                <div className={`h-2 ${sample.color}`} />
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="oak-badge text-[11px]">{sample.type}</span>
                    <span className="text-xs font-medium text-warm-500">{sample.class}</span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-ink group-hover:text-mint-700 transition-colors">
                    {sample.title}
                  </h3>
                  <p className="mt-1 text-xs font-medium text-warm-500">
                    {sample.subject}
                  </p>

                  <ul className="mt-5 space-y-2 border-t border-warm-100 pt-4">
                    {sample.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2 text-xs text-warm-600">
                        <span className="text-mint-600 font-bold">·</span>
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-6 pt-0">
                <Link href={sample.link} className="block w-full">
                  <Button variant="outline" size="md" className="w-full text-xs sm:text-sm">
                    View sample topic
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/subjects/primary/p1">
            <Button variant="primary" size="lg" className="shadow-warm hover:shadow-warm-lg">
              Explore all subjects & classes
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
