"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { SubjectIcon } from "@/components/ui/subject-icon";
import {
  getClassesForLevel,
  getSecondaryClasses,
  getSubjectsForClass,
  getLevelForClass,
  type ClassInfo,
} from "@/lib/content/curriculum";

/**
 * Inline subject/class picker widget for the homepage.
 * A mini version of the mega-menu that lets visitors quickly browse.
 */
export function SubjectStrip() {
  const [activeLevel, setActiveLevel] = useState<"primary" | "secondary">("primary");
  const classes =
    activeLevel === "primary"
      ? getClassesForLevel("primary")
      : getSecondaryClasses();
  const [activeClass, setActiveClass] = useState(classes[0]?.slug ?? "p1");

  const currentClasses =
    activeLevel === "primary"
      ? getClassesForLevel("primary")
      : getSecondaryClasses();

  const subjects = getSubjectsForClass(activeClass);

  return (
    <section className="border-b border-warm-200 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Find resources for your class
          </h2>
          <p className="mt-3 text-warm-600">
            Choose your level and class to browse curriculum-aligned resources.
          </p>
        </motion.div>

        {/* Level tabs */}
        <div className="mt-8 flex justify-center gap-2">
          {(["primary", "secondary"] as const).map((level) => (
            <button
              key={level}
              onClick={() => {
                setActiveLevel(level);
                const cls =
                  level === "primary"
                    ? getClassesForLevel("primary")
                    : getSecondaryClasses();
                setActiveClass(cls[0]?.slug ?? "p1");
              }}
              className={cn(
                "rounded-2xl px-5 py-2.5 text-sm font-medium transition-all duration-200",
                activeLevel === level
                  ? "bg-ink text-white shadow-warm"
                  : "bg-warm-100 text-warm-600 hover:bg-warm-200"
              )}
            >
              {level === "primary" ? "Primary" : "Secondary"}
            </button>
          ))}
        </div>

        {/* Class tabs */}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {currentClasses.map((cls: ClassInfo) => (
            <button
              key={cls.slug}
              onClick={() => setActiveClass(cls.slug)}
              className={cn(
                "rounded-xl px-3.5 py-1.5 text-sm font-medium transition-all duration-150",
                activeClass === cls.slug
                  ? "bg-mint-200 text-ink shadow-warm-sm"
                  : "text-warm-500 hover:bg-warm-100 hover:text-ink"
              )}
            >
              {cls.shortLabel}
            </button>
          ))}
        </div>

        {/* Subject grid */}
        <motion.div
          key={activeClass}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        >
          {subjects.map((subj) => {
            const level = getLevelForClass(activeClass);
            const href = `/subjects/${level?.slug ?? "primary"}/${activeClass}/${subj.slug}`;
            return (
              <Link
                key={subj.slug}
                href={href}
                className="group flex items-center gap-3 rounded-oak bg-warm-50 p-4 transition-all duration-200 hover:bg-white hover:shadow-warm hover:-translate-y-0.5"
              >
                <SubjectIcon icon={subj.icon} colorClass={subj.color} size="sm" />
                <span className="text-sm font-medium text-ink">{subj.label}</span>
              </Link>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
