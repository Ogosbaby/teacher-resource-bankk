import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTeacherApi } from "@/lib/auth/api-guards";
import { apiError } from "@/lib/api/respond";
import {
  deleteLessonPlan,
  getLessonPlan,
  updateLessonPlan,
} from "@/lib/services/lesson-plans.service";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireTeacherApi();
  if ("error" in guard) return guard.error;

  try {
    const plan = await getLessonPlan(guard.session.user.id, params.id);
    if (!plan) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ plan });
  } catch (err) {
    return apiError(err);
  }
}

const schema = z.object({
  title: z.string().min(1).max(255).optional(),
  body: z.string().min(1).optional(),
  subject: z.string().max(100).nullable().optional(),
  gradeLevel: z.string().max(50).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireTeacherApi();
  if ("error" in guard) return guard.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }

  try {
    const plan = await updateLessonPlan(guard.session.user.id, params.id, parsed.data);
    if (!plan) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ plan });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireTeacherApi();
  if ("error" in guard) return guard.error;

  try {
    await deleteLessonPlan(guard.session.user.id, params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
