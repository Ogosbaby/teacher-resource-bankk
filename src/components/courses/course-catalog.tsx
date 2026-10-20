"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

export interface CatalogCourse {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  estimatedDurationMinutes: number | null;
  subject: string | null;
  classLevels: string[];
}

type SortKey = "newest" | "title" | "shortest";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest first" },
  { key: "title", label: "Title A–Z" },
  { key: "shortest", label: "Shortest first" },
];

function coverFor(course: CatalogCourse) {
  // Deterministic grayscale placeholder keyed on the slug, swappable for a real
  // upload once the storage client exists.
  return course.coverImageUrl ?? `https://picsum.photos/seed/${course.slug}/800/500?grayscale`;
}

function durationLabel(mins: number | null) {
  if (!mins) return null;
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

import { getTeacherProfile, loadDraft, type TeacherProfile } from "@/lib/offline";
import { getCustomGeneratedCourses } from "@/lib/content/course-generator";

export function CourseCatalog({
  courses: initialCourses,
  basePath = "/courses",
}: {
  courses: CatalogCourse[];
  basePath?: string;
}) {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("newest");
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [courses, setCourses] = useState<CatalogCourse[]>(initialCourses);

  useEffect(() => {
    const prof = getTeacherProfile();
    if (prof && prof.classLevels.length > 0) {
      setProfile(prof);
    } else {
      const draft = loadDraft();
      if (draft && draft.classLevels.length > 0) {
        setProfile({
          name: draft.name,
          email: draft.email,
          classLevels: draft.classLevels,
          subjects: draft.subjects,
          savedAt: draft.updatedAt,
        });
      }
    }

    // Load any locally generated tailored courses
    const custom = getCustomGeneratedCourses();
    if (custom.length > 0) {
      const customFormatted: CatalogCourse[] = custom.map((c) => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        description: c.description,
        coverImageUrl: c.coverImageUrl ?? null,
        estimatedDurationMinutes: c.estimatedDurationMinutes,
        subject: c.subject,
        classLevels: c.classLevels,
      }));
      setCourses((prev) => {
        const seen = new Set(prev.map((p) => p.slug));
        const added = customFormatted.filter((cf) => !seen.has(cf.slug));
        return [...added, ...prev];
      });
    }
  }, [initialCourses]);

  const subjects = useMemo(() => {
    const set = new Set<string>();
    for (const c of courses) if (c.subject) set.add(c.subject);
    return Array.from(set).sort();
  }, [courses]);

  const { recommended, allFiltered } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = courses.filter((c) => {
      if (subject && c.subject !== subject) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q) ||
        c.classLevels.some((l) => l.toLowerCase().includes(q))
      );
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "shortest")
        return (a.estimatedDurationMinutes ?? Infinity) - (b.estimatedDurationMinutes ?? Infinity);
      return 0;
    });

    if (!profile || profile.classLevels.length === 0) {
      return { recommended: [], allFiltered: sorted };
    }

    const normSubjects = (profile.subjects || []).map((s) =>
      s.toLowerCase().replace(/_/g, " ").replace(/primary|jss|sss/g, "").trim()
    );

    // Score courses based on exact match: both subject and level match gets highest priority
    const scored = sorted.map((c) => {
      const levelHit = c.classLevels.some((lvl) => profile.classLevels.includes(lvl as any));
      const subjHit = normSubjects.some((ns) =>
        ns.length > 2 && (
          (c.subject ?? "").toLowerCase().includes(ns) ||
          c.title.toLowerCase().includes(ns) ||
          (c.description ?? "").toLowerCase().includes(ns)
        )
      );

      let score = 0;
      if (levelHit && subjHit) score = 3; // Both level & subject match (top tier)
      else if (subjHit) score = 2;        // Subject match
      else if (levelHit) score = 1;       // Level match

      return { course: c, score, levelHit, subjHit };
    });

    // Recommended list sorted by match relevance
    const rec = scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.course);

    return { recommended: rec, allFiltered: sorted };
  }, [courses, query, subject, sort, profile]);

  const isFiltering = Boolean(query.trim() || subject);

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses…"
            className="h-11 w-full rounded-full border border-neutral-300 bg-white pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ink/20"
          />
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-11 self-start rounded-full border border-neutral-300 bg-white px-4 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-ink/20 md:self-auto"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {subjects.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Pill label="All subjects" active={subject === null} onClick={() => setSubject(null)} />
          {subjects.map((s) => (
            <Pill key={s} label={s} active={subject === s} onClick={() => setSubject(s)} />
          ))}
        </div>
      )}

      {/* Recommended for Registered Teacher Section */}
      {!isFiltering && recommended.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-mint-100 px-3 py-1 text-xs font-semibold text-mint-800">
                <span>⭐</span> Tailored For Your Classroom
              </div>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-ink sm:text-2xl">
                Recommended for your {profile?.classLevels.join(" & ")} classes
              </h2>
            </div>
          </div>

          <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.map((c, i) => (
              <CourseCard key={c.id} course={c} basePath={basePath} index={i} isRecommended />
            ))}
          </div>
        </div>
      )}

      {/* Full Catalog Section */}
      <div className={!isFiltering && recommended.length > 0 ? "mt-14" : "mt-8"}>
        {!isFiltering && recommended.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-tight text-ink">
              All Professional Development Courses
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Browse our complete library of accredited pedagogical modules.
            </p>
          </div>
        )}

        {allFiltered.length === 0 ? (
          <EmptyState hasAny={courses.length > 0} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {allFiltered.map((c, i) => (
              <CourseCard key={c.id} course={c} basePath={basePath} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CourseCard({
  course: c,
  basePath,
  index: i,
  isRecommended = false,
}: {
  course: CatalogCourse;
  basePath: string;
  index: number;
  isRecommended?: boolean;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(i, 8) * 0.05 }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-white transition-shadow hover:shadow-xl hover:shadow-neutral-200/70",
        isRecommended ? "border-mint-300 ring-1 ring-mint-300/50 shadow-sm" : "border-neutral-200"
      )}
    >
      <Link href={`${basePath}/${c.slug}`} className="absolute inset-0 z-10" aria-label={`Open ${c.title}`} />
      <div className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverFor(c)}
          alt=""
          className="h-44 w-full object-cover grayscale transition-transform duration-500 group-hover:scale-105"
        />
        {c.subject && (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-ink shadow-sm">
            {c.subject}
          </span>
        )}
        {isRecommended && (
          <span className="absolute right-3 top-3 rounded-full bg-mint-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
            Recommended
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-semibold leading-snug text-ink underline-offset-4 group-hover:underline">
          {c.title}
        </h3>
        {c.description && (
          <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{c.description}</p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2 pt-1">
          {c.classLevels.map((l) => (
            <Badge key={l} variant="neutral">
              {l}
            </Badge>
          ))}
          {durationLabel(c.estimatedDurationMinutes) && (
            <span className="text-xs text-neutral-400">
              {durationLabel(c.estimatedDurationMinutes)}
            </span>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-ink bg-ink text-white"
          : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500"
      )}
    >
      {label}
    </button>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center">
      <p className="font-medium text-ink">
        {hasAny ? "No courses match your filters." : "No courses published yet."}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
        {hasAny
          ? "Try clearing the search box or picking a different subject."
          : "Courses appear here once they've been published."}
      </p>
    </div>
  );
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
