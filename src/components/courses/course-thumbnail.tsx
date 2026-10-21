"use client";

import React from "react";

interface CourseThumbnailProps {
  slug: string;
  title: string;
  subject?: string | null;
  className?: string;
  aspectRatio?: "video" | "banner";
}

type SubjectTheme = "math" | "science" | "english" | "assessment" | "pedagogy" | "primary" | "general";

function detectTheme(slug: string, title: string, subject?: string | null): SubjectTheme {
  const text = `${slug} ${title} ${subject || ""}`.toLowerCase();

  if (text.includes("math") || text.includes("algebra") || text.includes("geometry") || text.includes("quadratic") || text.includes("numeracy") || text.includes("equation") || text.includes("calculus") || text.includes("trigonometry") || text.includes("logarithm") || text.includes("fraction") || text.includes("arithmetic") || text.includes("number") || text.includes("mensuration") || text.includes("statistics") || text.includes("probability")) {
    if (text.includes("primary") || text.includes("pri ") || text.includes("bundle") || text.includes("place value") || text.includes("counting")) return "primary";
    return "math";
  }
  if (text.includes("science") || text.includes("biology") || text.includes("chemistry") || text.includes("physics") || text.includes("photosynthesis") || text.includes("experiment") || text.includes("machine") || text.includes("ecology") || text.includes("genetics") || text.includes("cell") || text.includes("respiration") || text.includes("organism") || text.includes("energy") || text.includes("atom") || text.includes("molecule") || text.includes("stoichiometry") || text.includes("lever") || text.includes("matter")) {
    return "science";
  }
  if (text.includes("english") || text.includes("phonics") || text.includes("reading") || text.includes("essay") || text.includes("peel") || text.includes("grammar") || text.includes("summary") || text.includes("vocabulary") || text.includes("literature") || text.includes("writing") || text.includes("comprehension") || text.includes("noun") || text.includes("verb") || text.includes("prose") || text.includes("poetry") || text.includes("language") || text.includes("speech") || text.includes("waec continuous")) {
    if (text.includes("phonics") || text.includes("early") || text.includes("primary")) return "primary";
    return "english";
  }
  if (text.includes("assessment") || text.includes("record") || text.includes("grading") || text.includes("formative") || text.includes("rubric") || text.includes("evaluation") || text.includes("scoring") || text.includes("marking") || text.includes("test design") || text.includes("examination")) {
    return "assessment";
  }
  if (text.includes("pedagogy") || text.includes("classroom") || text.includes("active") || text.includes("management") || text.includes("lesson planning") || text.includes("differentiation") || text.includes("instruction") || text.includes("teaching method") || text.includes("mentor") || text.includes("cpd")) {
    return "pedagogy";
  }
  return "general";
}


const THEME_CONFIGS: Record<
  SubjectTheme,
  {
    bgGradient: string;
    accentColor: string;
    badgeBg: string;
    badgeText?: string;
    categoryLabel: string;
    icon: string;
    formulaSnippet?: string;
  }
> = {
  math: {
    bgGradient: "from-slate-900 via-indigo-950 to-blue-900",
    accentColor: "#38bdf8",
    badgeBg: "bg-blue-500/20 border-blue-400/30 text-blue-200",
    categoryLabel: "MATHEMATICS & ALGEBRA",
    icon: "📐",
    formulaSnippet: "x = (-b ± √(b² - 4ac)) / 2a",
  },
  science: {
    bgGradient: "from-zinc-900 via-emerald-950 to-teal-900",
    accentColor: "#34d399",
    badgeBg: "bg-emerald-500/20 border-emerald-400/30 text-emerald-200",
    categoryLabel: "BASIC SCIENCE & BIOLOGY",
    icon: "🔬",
    formulaSnippet: "6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂",
  },
  english: {
    bgGradient: "from-stone-900 via-amber-950 to-orange-950",
    accentColor: "#fbbf24",
    badgeBg: "bg-amber-500/20 border-amber-400/30 text-amber-200",
    categoryLabel: "ENGLISH & LITERACY",
    icon: "📖",
    formulaSnippet: "PEEL: Point • Evidence • Explain • Link",
  },
  assessment: {
    bgGradient: "from-slate-950 via-purple-950 to-violet-900",
    accentColor: "#c084fc",
    badgeBg: "bg-purple-500/20 border-purple-400/30 text-purple-200",
    categoryLabel: "EVALUATION & ASSESSMENT",
    icon: "📊",
    formulaSnippet: "Thumbs Up / Sideways / Down",
  },
  pedagogy: {
    bgGradient: "from-gray-950 via-teal-950 to-cyan-950",
    accentColor: "#2dd4bf",
    badgeBg: "bg-teal-500/20 border-teal-400/30 text-teal-200",
    categoryLabel: "CLASSROOM PEDAGOGY",
    icon: "👥",
    formulaSnippet: "Think • Pair • Share",
  },
  primary: {
    bgGradient: "from-neutral-900 via-sky-950 to-emerald-950",
    accentColor: "#4ade80",
    badgeBg: "bg-emerald-500/20 border-emerald-400/30 text-emerald-200",
    categoryLabel: "PRIMARY FOUNDATIONS",
    icon: "🧱",
    formulaSnippet: "Tens & Units • Phonics Sounds",
  },
  general: {
    bgGradient: "from-neutral-900 via-zinc-900 to-stone-900",
    accentColor: "#a3a3a3",
    badgeBg: "bg-white/10 border-white/20 text-neutral-200",
    categoryLabel: "TEACHER CPD MODULE",
    icon: "🎓",
  },
};

export function CourseThumbnail({
  slug,
  title,
  subject,
  className = "",
  aspectRatio = "video",
}: CourseThumbnailProps) {
  const theme = detectTheme(slug, title, subject);
  const cfg = THEME_CONFIGS[theme];

  const heightClass = aspectRatio === "banner" ? "h-48 sm:h-64" : "aspect-[16/10] sm:aspect-[16/9]";

  return (
    <div
      className={`relative w-full overflow-hidden bg-gradient-to-br ${cfg.bgGradient} select-none ${heightClass} ${className}`}
    >
      {/* Dynamic Geometric & Mathematical SVG Overlay Background */}
      <svg
        className="absolute inset-0 h-full w-full opacity-20 pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id={`grid-${slug}`} width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.75" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#grid-${slug})`} />
      </svg>

      {/* Decorative Subject Graphic Elements */}
      {theme === "math" && (
        <svg className="absolute -right-8 -bottom-8 h-48 w-48 text-blue-400/10 pointer-events-none" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
          <polygon points="50,15 90,80 10,80" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="50" y1="15" x2="50" y2="80" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )}

      {theme === "science" && (
        <svg className="absolute -right-6 -bottom-6 h-44 w-44 text-emerald-400/10 pointer-events-none" viewBox="0 0 100 100">
          <path d="M50 10 C 65 30, 85 50, 85 70 C 85 85, 70 95, 50 95 C 30 95, 15 85, 15 70 C 15 50, 35 30, 50 10 Z" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <line x1="50" y1="15" x2="50" y2="95" stroke="currentColor" strokeWidth="1.5" />
          <line x1="50" y1="45" x2="75" y2="60" stroke="currentColor" strokeWidth="1.5" />
          <line x1="50" y1="65" x2="25" y2="80" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )}

      {theme === "english" && (
        <svg className="absolute -right-6 -bottom-6 h-44 w-44 text-amber-400/10 pointer-events-none" viewBox="0 0 100 100">
          <rect x="20" y="20" width="60" height="70" rx="4" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <line x1="30" y1="35" x2="70" y2="35" stroke="currentColor" strokeWidth="2" />
          <line x1="30" y1="50" x2="70" y2="50" stroke="currentColor" strokeWidth="2" />
          <line x1="30" y1="65" x2="55" y2="65" stroke="currentColor" strokeWidth="2" />
        </svg>
      )}

      {theme === "assessment" && (
        <svg className="absolute -right-6 -bottom-6 h-44 w-44 text-purple-400/10 pointer-events-none" viewBox="0 0 100 100">
          <rect x="25" y="20" width="50" height="70" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="38" cy="38" r="4" fill="currentColor" />
          <line x1="48" y1="38" x2="65" y2="38" stroke="currentColor" strokeWidth="2" />
          <circle cx="38" cy="55" r="4" fill="currentColor" />
          <line x1="48" y1="55" x2="65" y2="55" stroke="currentColor" strokeWidth="2" />
        </svg>
      )}

      {/* Main Content Area */}
      <div className="relative z-10 flex h-full flex-col justify-between p-4 sm:p-5">
        {/* Top Header Tag */}
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase ${cfg.badgeBg}`}>
            <span>{cfg.icon}</span>
            <span>{cfg.categoryLabel}</span>
          </span>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-xs backdrop-blur-sm text-white/80">
            TRB
          </span>
        </div>

        {/* Center / Bottom Course Typography */}
        <div className="mt-auto">
          <h3 className="line-clamp-2 text-sm sm:text-base font-bold tracking-tight text-white drop-shadow-sm leading-snug">
            {title}
          </h3>

          {cfg.formulaSnippet && (
            <div className="mt-2 inline-flex items-center gap-1 rounded bg-black/40 px-2 py-0.5 font-mono text-[11px] text-white/90 border border-white/10 backdrop-blur-sm">
              <span className="text-mint-400">⚡</span>
              <span className="truncate max-w-[260px]">{cfg.formulaSnippet}</span>
            </div>
          )}
        </div>
      </div>

      {/* Subtle bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{ backgroundColor: cfg.accentColor }}
      />
    </div>
  );
}
