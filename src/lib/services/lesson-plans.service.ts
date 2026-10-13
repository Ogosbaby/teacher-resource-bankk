import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { lessonPlans } from "@/lib/db/schema";

export type LessonPlanSource = "ai_generated" | "ai_refined" | "manual";

export interface LessonPlanInput {
  title: string;
  subject?: string | null;
  gradeLevel?: string | null;
  topic?: string | null;
  body: string;
  source: LessonPlanSource;
  sourceFileName?: string | null;
  aiModelVersion?: string | null;
}

export async function listLessonPlans(ownerId: string) {
  return db
    .select()
    .from(lessonPlans)
    .where(eq(lessonPlans.ownerId, ownerId))
    .orderBy(desc(lessonPlans.updatedAt));
}

export async function getLessonPlan(ownerId: string, id: string) {
  const [row] = await db
    .select()
    .from(lessonPlans)
    .where(and(eq(lessonPlans.id, id), eq(lessonPlans.ownerId, ownerId)))
    .limit(1);
  return row ?? null;
}

export async function createLessonPlan(ownerId: string, input: LessonPlanInput) {
  const [row] = await db
    .insert(lessonPlans)
    .values({
      ownerId,
      title: input.title,
      subject: input.subject ?? null,
      gradeLevel: input.gradeLevel ?? null,
      topic: input.topic ?? null,
      body: input.body,
      source: input.source,
      sourceFileName: input.sourceFileName ?? null,
      aiModelVersion: input.aiModelVersion ?? null,
    })
    .returning();
  return row;
}

export async function updateLessonPlan(
  ownerId: string,
  id: string,
  input: Partial<Pick<LessonPlanInput, "title" | "body" | "subject" | "gradeLevel">>
) {
  const [row] = await db
    .update(lessonPlans)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(lessonPlans.id, id), eq(lessonPlans.ownerId, ownerId)))
    .returning();
  return row ?? null;
}

export async function deleteLessonPlan(ownerId: string, id: string) {
  await db
    .delete(lessonPlans)
    .where(and(eq(lessonPlans.id, id), eq(lessonPlans.ownerId, ownerId)));
}
