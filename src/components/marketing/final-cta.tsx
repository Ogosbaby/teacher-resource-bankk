"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { getWhatsAppSupportUrl } from "@/lib/support/whatsapp";

export function FinalCta() {
  return (
    <section className="oak-section bg-white border-t border-warm-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-xl text-center"
        >
          <span className="oak-badge">Get Started</span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Equip your classroom today
          </h2>
          <p className="mt-2 text-sm sm:text-base text-warm-600">
            Offline lesson notes, schemes of work, and AI assistant for the entire term.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/pricing">
              <Button
                variant="primary"
                size="lg"
                className="shadow-warm hover:shadow-warm-lg min-w-[150px]"
              >
                Get Started
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
                className="bg-white min-w-[150px]"
              >
                Book a Demo
              </Button>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
