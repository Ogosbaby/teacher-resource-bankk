import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTeacherApi } from "@/lib/auth/api-guards";
import { apiError } from "@/lib/api/respond";
import { createLessonPlan, listLessonPlans } from "@/lib/services/lesson-plans.service";

export async function GET() {
  const guard = await requireTeacherApi();
  if ("error" in guard) return guard.error;

  try {
    const plans = await listLessonPlans(guard.session.user.id);
    return NextResponse.json({ plans });
  } catch (err) {
    return apiError(err);
  }
}

const schema = z.object({
  title: z.string().min(1).max(255),
  body: z.string().min(1),
  subject: z.string().max(100).nullable().optional(),
  gradeLevel: z.string().max(50).nullable().optional(),
  topic: z.string().max(255).nullable().optional(),
  source: z.enum(["ai_generated", "ai_refined", "manual"]).default("manual"),
});

/** Save a manually written or hand-edited lesson plan (e.g. after editing an AI draft). */
export async function POST(req: Request) {
  const guard = await requireTeacherApi();
  if ("error" in guard) return guard.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A title and body are required." }, { status: 400 });
  }

  try {
    const saved = await createLessonPlan(guard.session.user.id, parsed.data);
    return NextResponse.json({ saved }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
