"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import {
  getClassesForLevel,
  getSecondaryClasses,
  getSubjectsForClass,
  getLevelForClass,
  type ClassInfo,
} from "@/lib/content/curriculum";
import { SubjectIcon } from "@/components/ui/subject-icon";

type MenuMode = "primary" | "secondary";

export function TeacherMegaMenu({
  mode,
  onClose,
}: {
  mode: MenuMode;
  onClose: () => void;
}) {
  const classes =
    mode === "primary"
      ? getClassesForLevel("primary")
      : getSecondaryClasses();

  const [activeTab, setActiveTab] = useState(classes[0]?.slug ?? "");
  const menuRef = useRef<HTMLDivElement>(null);
  const subjects = getSubjectsForClass(activeTab);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <>
      {/* Backdrop overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 top-[65px] z-40 bg-ink/10 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="absolute left-0 right-0 top-full z-50 border-b border-warm-200 bg-white shadow-warm-lg"
      >
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          {/* Tier A: Class tabs */}
          <div className="flex flex-wrap gap-2 border-b border-warm-100 pb-4" role="tablist">
            {classes.map((cls: ClassInfo) => (
              <button
                key={cls.slug}
                role="tab"
                aria-selected={activeTab === cls.slug}
                onClick={() => setActiveTab(cls.slug)}
                onKeyDown={(e) => {
                  const idx = classes.findIndex((c: ClassInfo) => c.slug === cls.slug);
                  if (e.key === "ArrowRight" && idx < classes.length - 1) {
                    setActiveTab(classes[idx + 1].slug);
                  } else if (e.key === "ArrowLeft" && idx > 0) {
                    setActiveTab(classes[idx - 1].slug);
                  }
                }}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-medium transition-all duration-150",
                  activeTab === cls.slug
                    ? "bg-mint-200 text-ink shadow-warm-sm"
                    : "text-warm-600 hover:bg-warm-100 hover:text-ink"
                )}
              >
                {cls.shortLabel}
              </button>
            ))}
          </div>

          {/* Tier B: Subject grid */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {subjects.map((subj) => {
              const level = getLevelForClass(activeTab);
              const href = `/subjects/${level?.slug ?? "primary"}/${activeTab}/${subj.slug}`;

              return (
                <Link
                  key={subj.slug}
                  href={href}
                  onClick={onClose}
                  className="group flex items-center gap-3 rounded-2xl p-3 transition-all duration-150 hover:bg-warm-50 hover:shadow-warm-sm"
                >
                  <SubjectIcon
                    icon={subj.icon}
                    colorClass={subj.color}
                    size="sm"
                  />
                  <span className="text-sm font-medium text-ink group-hover:text-mint-700">
                    {subj.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Quick link to browse all */}
          <div className="mt-5 border-t border-warm-100 pt-4">
            <Link
              href={`/subjects/${mode === "primary" ? "primary" : "junior-secondary"}/${activeTab}`}
              onClick={onClose}
              className="text-sm font-medium text-mint-700 hover:text-mint-800 hover:underline"
            >
              Browse all {classes.find((c: ClassInfo) => c.slug === activeTab)?.label} subjects →
            </Link>
          </div>
        </div>
      </motion.div>
    </>
  );
}
