"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { Logomark } from "@/components/brand/logomark";

/**
 * @deprecated Use TeacherHeader from @/components/layout/teacher-header instead.
 * Kept for backwards compatibility with MarketingShell.
 */
const LINKS = [
  { label: "Primary", href: "/subjects/primary/p1" },
  { label: "Secondary", href: "/subjects/junior-secondary/jss1" },
  { label: "Courses", href: "/courses" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 border-b border-warm-200 bg-white/95 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-around px-6 py-3.5">
        {/* <Link href="/" className="flex flex-1 items-center gap-2.5">
          <Logomark size={30} animated={false} />
          <span className="text-sm font-semibold tracking-tight text-ink">
            Teacher Resource Bank
          </span>
        </Link> */}

        <nav className="hidden flex-1 items-center justify-center gap-6 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-warm-600 transition-colors hover:text-ink"
            >
              {/* {l.label} */}
            </Link>
          ))}
        </nav>

        <div className="hidden flex-1 items-center justify-end gap-2 md:flex">
          <Link href="/sign-in">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button variant="primary" size="sm">
              Get started
            </Button>
          </Link>
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          onClick={() => setOpen((o) => !o)}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-warm-700 hover:bg-warm-100 md:hidden"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            aria-hidden="true"
          >
            <path
              d={open ? "M6 6l12 12M18 6 6 18" : "M4 8h16M4 16h16"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-warm-200 bg-white px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-warm-700 hover:bg-warm-100"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/sign-in"
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-warm-700 hover:bg-warm-100"
            >
              Sign in
            </Link>
          </nav>
          <Link
            href="/sign-up"
            onClick={() => setOpen(false)}
            className="mt-3 block"
          >
            <Button variant="primary" className="w-full">
              Get started
            </Button>
          </Link>
        </div>
      )}
    </motion.header>
  );
}
