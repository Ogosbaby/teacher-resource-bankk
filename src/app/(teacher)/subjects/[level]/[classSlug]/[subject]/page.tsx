"use client";

import { useState } from "react";
import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { cn } from "@/lib/utils/cn";
import {
  getLevelBySlug,
  getClassBySlug,
  getSubjectBySlug,
  getTopicsForSubject,
  getThreadsForSubject,
  type TopicInfo,
} from "@/lib/content/curriculum";

export default function TopicListPage() {
  const params = useParams<{ level: string; classSlug: string; subject: string }>();
  const level = getLevelBySlug(params.level);
  const cls = getClassBySlug(params.classSlug);
  const subj = getSubjectBySlug(params.classSlug, params.subject);

  if (!level || !cls || !subj) notFound();

  const allTopics = getTopicsForSubject(cls.slug, subj.slug);
  const threads = getThreadsForSubject(cls.slug, subj.slug);

  const [activeThread, setActiveThread] = useState<string | null>(null);

  const filteredTopics = activeThread
    ? allTopics.filter((t) => t.thread === activeThread)
    : allTopics;

  // Group by term
  const byTerm = new Map<number, TopicInfo[]>();
  filteredTopics.forEach((t) => {
    const arr = byTerm.get(t.term) ?? [];
    arr.push(t);
    byTerm.set(t.term, arr);
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: level.label, href: `/subjects/${level.slug}/${cls.slug}` },
          { label: cls.label, href: `/subjects/${level.slug}/${cls.slug}` },
          { label: subj.label },
        ]}
      />

      {/* Subject hero */}
      <div className="mt-6 flex items-start gap-4">
        <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shrink-0", subj.color)}>
          {subj.icon}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">
            {subj.label} — {cls.label}
          </h1>
          <p className="mt-1 text-warm-600">
            {allTopics.length > 0
              ? `${allTopics.length} topic${allTopics.length === 1 ? "" : "s"} organised by term`
              : "Content is being developed"}
          </p>
        </div>
      </div>

      {/* Thread filter bar */}
      {threads.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-warm-500">Highlight a strand:</span>
          <button
            onClick={() => setActiveThread(null)}
            className={cn(
              "rounded-xl px-3 py-1.5 text-sm font-medium transition-colors",
              !activeThread
                ? "bg-ink text-white"
                : "bg-warm-100 text-warm-600 hover:bg-warm-200"
            )}
          >
            All
          </button>
          {threads.map((thread) => (
            <button
              key={thread}
              onClick={() => setActiveThread(activeThread === thread ? null : thread)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-sm font-medium transition-colors",
                activeThread === thread
                  ? "bg-mint-200 text-ink"
                  : "bg-warm-100 text-warm-600 hover:bg-warm-200"
              )}
            >
              {thread}
            </button>
          ))}
        </div>
      )}

      {/* Topic list grouped by term */}
      {allTopics.length === 0 ? (
        <div className="mt-8 rounded-oak bg-white p-12 text-center shadow-warm-sm">
          <p className="font-medium text-ink">We&apos;re still building content for {subj.label}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-warm-500">
            Topics and resources will appear here as they are published. We don&apos;t
            show empty shells — when content is ready, you&apos;ll see it.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {[1, 2, 3].map((term) => {
            const topics = byTerm.get(term as 1 | 2 | 3);
            if (!topics?.length) return null;

            return (
              <div key={term}>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-mint-100 text-xs font-bold text-mint-800">
                    T{term}
                  </span>
                  Term {term}
                </h2>

                <div className="mt-3 space-y-2">
                  {topics.map((topic, idx) => {
                    const globalIdx = allTopics.indexOf(topic) + 1;
                    return (
                      <motion.div
                        key={topic.slug}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Link
                          href={`/subjects/${level.slug}/${cls.slug}/${subj.slug}/${topic.slug}`}
                          className="group flex items-center gap-4 rounded-oak bg-white p-4 shadow-warm-sm transition-all hover:shadow-warm hover:-translate-y-0.5"
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-warm-100 text-sm font-semibold text-warm-600 group-hover:bg-mint-100 group-hover:text-mint-800 transition-colors">
                            {globalIdx}
                          </span>
                          <div className="flex-1">
                            <h3 className="font-medium text-ink group-hover:text-mint-700 transition-colors">
                              {topic.label}
                            </h3>
                            {topic.thread && (
                              <span className="mt-0.5 text-xs text-warm-500">
                                {topic.thread}
                              </span>
                            )}
                          </div>
                          <svg
                            viewBox="0 0 24 24"
                            className="h-5 w-5 text-warm-400 group-hover:text-mint-500 transition-colors"
                            fill="none"
                          >
                            <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
