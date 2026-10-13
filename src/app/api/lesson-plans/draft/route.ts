import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTeacherApi } from "@/lib/auth/api-guards";
import { apiError, withProvider } from "@/lib/api/respond";
import { generateLessonPlanDraft, refineLessonPlanDraft } from "@/lib/ai/draft";
import { createLessonPlan } from "@/lib/services/lesson-plans.service";

// mode "generate": draft a new plan from a topic the teacher typed.
// mode "refine": polish a rough draft, already extracted to plain text
// client-side (from a pasted note, .txt file, or parsed PDF).
const schema = z.object({
  mode: z.enum(["generate", "refine"]),
  topic: z.string().max(500).optional(),
  roughText: z.string().max(50_000).optional(),
  sourceFileName: z.string().max(255).nullable().optional(),
  subject: z.string().max(100).nullable().optional(),
  gradeLevel: z.string().max(50).nullable().optional(),
  save: z.boolean().optional(),
});

export async function POST(req: Request) {
  const guard = await requireTeacherApi();
  if ("error" in guard) return guard.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { mode, topic, roughText, sourceFileName, subject, gradeLevel, save } = parsed.data;

  if (mode === "generate" && (!topic || topic.trim().length < 3)) {
    return NextResponse.json(
      { error: "Describe the topic in at least 3 characters." },
      { status: 400 }
    );
  }
  if (mode === "refine" && (!roughText || roughText.trim().length < 20)) {
    return NextResponse.json(
      { error: "The uploaded draft looks too short to refine — check the file extracted correctly." },
      { status: 400 }
    );
  }

  try {
    const { draft, parsed: structured, modelVersion } = await withProvider(() =>
      mode === "generate"
        ? generateLessonPlanDraft(topic!.trim(), {
            subject: subject ?? null,
            gradeLevel: gradeLevel ?? null,
          })
        : refineLessonPlanDraft(roughText!, {
            subject: subject ?? null,
            gradeLevel: gradeLevel ?? null,
            topic: topic ?? null,
          })
    );

    if (!save) {
      return NextResponse.json({ ok: true, draft, structured, modelVersion, saved: null });
    }

    const saved = await createLessonPlan(guard.session.user.id, {
      title: draft.title,
      subject: draft.subject ?? subject ?? null,
      gradeLevel: draft.gradeLevel ?? gradeLevel ?? null,
      topic: topic ?? null,
      body: draft.body,
      source: mode === "generate" ? "ai_generated" : "ai_refined",
      sourceFileName: sourceFileName ?? null,
      aiModelVersion: modelVersion,
    });

    return NextResponse.json(
      { ok: true, draft, structured, modelVersion, saved },
      { status: 201 }
    );
  } catch (err) {
    return apiError(err);
  }
}
