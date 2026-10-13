import { getAIProvider, type ChatMessage } from "@/lib/ai";

/**
 * AI drafting for the admin content pipeline.
 *
 * Everything here goes through getAIProvider() — no provider-specific calls.
 * Output is NEVER published: it is saved with status 'draft' and aiGenerated
 * provenance, and a human must walk it through in_review -> published.
 *
 * The local model is small, so parsing is deliberately forgiving. A structured
 * JSON reply is used when we get one; otherwise the raw text is kept as the
 * body so the admin still has something editable rather than a hard failure.
 */

export interface DraftedModule {
  title: string;
  body: string;
}

export interface DraftedCourse {
  title: string;
  description: string;
  modules: DraftedModule[];
}

export interface DraftedResource {
  title: string;
  description: string;
  body: string;
}

export interface DraftResult<T> {
  draft: T;
  raw: string;
  parsed: boolean;
  modelVersion: string;
}

/** Accumulate a streamed completion into a single string. */
export async function complete(messages: ChatMessage[]): Promise<string> {
  let out = "";
  for await (const token of getAIProvider().streamChat(messages)) {
    out += token;
  }
  return out.trim();
}

/**
 * Pull the first JSON object out of a model reply. Handles ```json fences and
 * leading prose, which small models produce constantly.
 */
function extractJson(raw: string): unknown | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Salvage title/description/body from JSON-ish output that JSON.parse rejected.
 *
 * The small local model reliably emits `"body": """` (triple quotes) instead of
 * a properly escaped string, which is invalid JSON but otherwise well-shaped.
 * Rather than discarding a usable draft, pull the fields out with regexes and
 * strip the leftover JSON punctuation.
 */
function salvageJsonish(raw: string): { title?: string; description?: string; body?: string } {
  const pick = (key: string, max: number) => {
    const m = raw.match(new RegExp(`"${key}"\\s*:\\s*"([^"]{2,${max}})"`));
    return m?.[1]?.trim();
  };

  const bodyMatch = raw.match(/"body"\s*:\s*("""|")/);
  let body: string | undefined;
  if (bodyMatch) {
    body = raw.slice((bodyMatch.index ?? 0) + bodyMatch[0].length);
    // Drop the closing quote(s) and any trailing brace/closing quote.
    body = body.replace(/["\s}]+$/, "").trim();
  }

  const title = pick("title", 200);
  const description = pick("description", 600);

  // A lone JSON blob is not a usable body — fall back to the whole reply then.
  if (body && body.length < 40) body = undefined;
  if (!body && (title || description)) body = raw;

  return { title, description, body };
}

function firstLine(raw: string, max = 120): string {
  const line = raw
    .split("\n")
    .map((l) => l.replace(/^#+\s*/, "").trim())
    .find((l) => l.length > 0);
  if (!line) return "Untitled draft";
  return line.length > max ? line.slice(0, max).trimEnd() : line;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

const SYSTEM: ChatMessage = {
  role: "system",
  content:
    "You write practical teaching material for Nigerian school teachers. " +
    "Be specific, concrete, and classroom-ready. Avoid filler and marketing language. " +
    "Always reply with a single valid JSON object and no other text.",
};

export async function generateCourseDraft(
  topic: string,
  context?: { subject?: string | null; classLevels?: string[] }
): Promise<DraftResult<DraftedCourse>> {
  const modelVersion = getAIProvider().modelVersion;

  const prompt: ChatMessage = {
    role: "user",
    content: [
      `Draft a short professional-development course for teachers on the topic: "${topic}".`,
      context?.subject ? `Subject focus: ${context.subject}.` : "",
      context?.classLevels?.length ? `Class levels: ${context.classLevels.join(", ")}.` : "",
      "",
      "Reply with JSON exactly in this shape:",
      `{"title": "course title", "description": "2-3 sentence summary", "modules": [{"title": "module title", "body": "markdown body, 150-300 words"}]}`,
      "Include 3 to 5 modules.",
    ]
      .filter(Boolean)
      .join("\n"),
  };

  const raw = await complete([SYSTEM, prompt]);
  const json = extractJson(raw) as Partial<DraftedCourse> | null;

  if (json && typeof json === "object") {
    const modules = Array.isArray(json.modules)
      ? json.modules
          .filter((m): m is DraftedModule => !!m && typeof m === "object")
          .map((m, i) => ({
            title: asString((m as DraftedModule).title, `Module ${i + 1}`),
            body: asString((m as DraftedModule).body, ""),
          }))
          .filter((m) => m.body.length > 0)
      : [];

    return {
      draft: {
        title: asString(json.title, firstLine(raw)),
        description: asString(json.description, ""),
        modules,
      },
      raw,
      parsed: true,
      modelVersion,
    };
  }

  // Fallback: salvage what we can, keep the raw reply as the body, and never
  // hard-fail — the admin still gets something editable to work from.
  const salvaged = salvageJsonish(raw);
  return {
    draft: {
      title: salvaged.title ?? firstLine(raw),
      description: salvaged.description ?? "",
      modules: [],
    },
    raw,
    parsed: false,
    modelVersion,
  };
}

export async function generateResourceDraft(
  topic: string,
  context?: { resourceType?: string; subject?: string | null; gradeLevel?: string | null }
): Promise<DraftResult<DraftedResource>> {
  const modelVersion = getAIProvider().modelVersion;

  const prompt: ChatMessage = {
    role: "user",
    content: [
      `Draft a ${context?.resourceType?.replace("_", " ") ?? "lesson plan"} on the topic: "${topic}".`,
      context?.subject ? `Subject: ${context.subject}.` : "",
      context?.gradeLevel ? `Class level: ${context.gradeLevel}.` : "",
      "",
      "Reply with JSON exactly in this shape:",
      `{"title": "resource title", "description": "one sentence", "body": "the full resource in markdown"}`,
      "The body should be directly usable in a classroom: objectives, activities, and assessment where relevant.",
    ]
      .filter(Boolean)
      .join("\n"),
  };

  const raw = await complete([SYSTEM, prompt]);
  const json = extractJson(raw) as Partial<DraftedResource> | null;

  if (json && typeof json === "object") {
    const body = asString(json.body, "");
    if (body) {
      return {
        draft: {
          title: asString(json.title, firstLine(raw)),
          description: asString(json.description, ""),
          body,
        },
        raw,
        parsed: true,
        modelVersion,
      };
    }
  }

  const salvaged = salvageJsonish(raw);
  return {
    draft: {
      title: salvaged.title ?? firstLine(raw),
      description: salvaged.description ?? "",
      body: salvaged.body ?? raw,
    },
    raw,
    // Treat a clean salvage as structured, so the UI doesn't flag a perfectly
    // usable draft as unparseable.
    parsed: Boolean(salvaged.title && salvaged.body),
    modelVersion,
  };
}

export interface DraftedPath {
  title: string;
  description: string;
}

export async function generatePathDraft(
  topic: string,
  context?: { classLevels?: string[] }
): Promise<DraftResult<DraftedPath>> {
  const modelVersion = getAIProvider().modelVersion;

  const prompt: ChatMessage = {
    role: "user",
    content: [
      `Draft a multi-course learning path for teachers on the theme: "${topic}".`,
      context?.classLevels?.length ? `Aimed at: ${context.classLevels.join(", ")}.` : "",
      "",
      "Reply with JSON exactly in this shape:",
      `{"title": "path title", "description": "2-3 sentence summary of what the teacher will be able to do at the end"}`,
    ]
      .filter(Boolean)
      .join("\n"),
  };

  const raw = await complete([SYSTEM, prompt]);
  const json = extractJson(raw) as Partial<DraftedPath> | null;

  if (json && typeof json === "object") {
    return {
      draft: {
        title: asString(json.title, firstLine(raw)),
        description: asString(json.description, ""),
      },
      raw,
      parsed: true,
      modelVersion,
    };
  }

  const salvaged = salvageJsonish(raw);
  return {
    draft: {
      title: salvaged.title ?? firstLine(raw),
      description: salvaged.description ?? raw,
    },
    raw,
    parsed: Boolean(salvaged.title),
    modelVersion,
  };
}

export interface DraftedLessonPlan {
  title: string;
  subject?: string;
  gradeLevel?: string;
  body: string;
}

const LESSON_PLAN_SYSTEM: ChatMessage = {
  role: "system",
  content:
    "You write classroom-ready lesson plans for Nigerian school teachers. " +
    "Be specific and practical: clear objectives, materials, a step-by-step activity sequence with " +
    "rough timings, and a short assessment or wrap-up. Avoid filler and marketing language. " +
    "Always reply with a single valid JSON object and no other text.",
};

/** Generate a brand-new lesson plan from a topic the teacher types in. */
export async function generateLessonPlanDraft(
  topic: string,
  context?: { subject?: string | null; gradeLevel?: string | null }
): Promise<DraftResult<DraftedLessonPlan>> {
  const modelVersion = getAIProvider().modelVersion;

  const prompt: ChatMessage = {
    role: "user",
    content: [
      `Draft a full lesson plan on the topic: "${topic}".`,
      context?.subject ? `Subject: ${context.subject}.` : "",
      context?.gradeLevel ? `Class level: ${context.gradeLevel}.` : "",
      "",
      "Reply with JSON exactly in this shape:",
      `{"title": "lesson plan title", "subject": "subject", "gradeLevel": "class level", "body": "the full lesson plan in markdown, including: Learning objectives, Materials needed, Introduction, Main activities (with rough timings), and Assessment/wrap-up"}`,
    ]
      .filter(Boolean)
      .join("\n"),
  };

  const raw = await complete([LESSON_PLAN_SYSTEM, prompt]);
  return parseLessonPlanReply(raw, modelVersion, topic);
}

/**
 * Refine a rough draft the teacher already wrote or uploaded (as plain text,
 * already extracted client-side from a PDF/Word doc) into a polished,
 * classroom-ready lesson plan.
 */
export async function refineLessonPlanDraft(
  roughText: string,
  context?: { subject?: string | null; gradeLevel?: string | null; topic?: string | null }
): Promise<DraftResult<DraftedLessonPlan>> {
  const modelVersion = getAIProvider().modelVersion;

  // Small local models have limited context — keep the pasted-in draft to a
  // sane size rather than truncating silently deep inside the provider call.
  const trimmed = roughText.slice(0, 12_000);

  const prompt: ChatMessage = {
    role: "user",
    content: [
      "A teacher uploaded the rough lesson plan draft below. Refine it into a polished, classroom-ready " +
        "lesson plan: keep their intent and content, improve structure and clarity, and fill in any " +
        "obviously missing sections (objectives, materials, activities with timings, assessment).",
      context?.subject ? `Subject: ${context.subject}.` : "",
      context?.gradeLevel ? `Class level: ${context.gradeLevel}.` : "",
      context?.topic ? `Topic: ${context.topic}.` : "",
      "",
      "--- ROUGH DRAFT START ---",
      trimmed,
      "--- ROUGH DRAFT END ---",
      "",
      "Reply with JSON exactly in this shape:",
      `{"title": "lesson plan title", "subject": "subject", "gradeLevel": "class level", "body": "the refined lesson plan in markdown"}`,
    ]
      .filter(Boolean)
      .join("\n"),
  };

  const raw = await complete([LESSON_PLAN_SYSTEM, prompt]);
  return parseLessonPlanReply(raw, modelVersion, context?.topic ?? "Untitled lesson plan");
}

function parseLessonPlanReply(
  raw: string,
  modelVersion: string,
  fallbackTopic: string
): DraftResult<DraftedLessonPlan> {
  const json = extractJson(raw) as Partial<DraftedLessonPlan> | null;

  if (json && typeof json === "object") {
    const body = asString(json.body, "");
    if (body) {
      return {
        draft: {
          title: asString(json.title, firstLine(raw) || fallbackTopic),
          subject: json.subject ? asString(json.subject, "") : undefined,
          gradeLevel: json.gradeLevel ? asString(json.gradeLevel, "") : undefined,
          body,
        },
        raw,
        parsed: true,
        modelVersion,
      };
    }
  }

  const salvaged = salvageJsonish(raw);
  return {
    draft: {
      title: salvaged.title ?? firstLine(raw) ?? fallbackTopic,
      body: salvaged.body ?? raw,
    },
    raw,
    parsed: Boolean(salvaged.title && salvaged.body),
    modelVersion,
  };
}

export interface DraftedContent {
  title: string;
  description: string;
  body: string;
}

const REFINE_SYSTEM: ChatMessage = {
  role: "system",
  content:
    "You help an admin turn a rough uploaded draft into polished, classroom-ready course content " +
    "for Nigerian school teachers. Keep the author's intent and factual content, improve structure, " +
    "clarity, and flow. Always reply with a single valid JSON object and no other text.",
};

/**
 * Refine an arbitrary rough draft (already extracted client-side from a PDF,
 * Word doc, or pasted text) into polished course/module content the admin can
 * edit further before publishing.
 */
export async function refineContentDraft(
  roughText: string,
  context?: { title?: string | null }
): Promise<DraftResult<DraftedContent>> {
  const modelVersion = getAIProvider().modelVersion;
  const trimmed = roughText.slice(0, 12_000);

  const prompt: ChatMessage = {
    role: "user",
    content: [
      "Refine the rough draft below into polished course content.",
      context?.title ? `Working title: ${context.title}.` : "",
      "",
      "--- ROUGH DRAFT START ---",
      trimmed,
      "--- ROUGH DRAFT END ---",
      "",
      "Reply with JSON exactly in this shape:",
      `{"title": "a clear title", "description": "1-2 sentence summary", "body": "the refined content in markdown"}`,
    ]
      .filter(Boolean)
      .join("\n"),
  };

  const raw = await complete([REFINE_SYSTEM, prompt]);
  const json = extractJson(raw) as Partial<DraftedContent> | null;

  if (json && typeof json === "object") {
    const body = asString(json.body, "");
    if (body) {
      return {
        draft: {
          title: asString(json.title, firstLine(raw)),
          description: asString(json.description, ""),
          body,
        },
        raw,
        parsed: true,
        modelVersion,
      };
    }
  }

  const salvaged = salvageJsonish(raw);
  return {
    draft: {
      title: salvaged.title ?? firstLine(raw),
      description: salvaged.description ?? "",
      body: salvaged.body ?? raw,
    },
    raw,
    parsed: Boolean(salvaged.title && salvaged.body),
    modelVersion,
  };
}
