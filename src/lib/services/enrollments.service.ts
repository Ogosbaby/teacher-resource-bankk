import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { courses, enrollments, moduleProgress, modules } from "@/lib/db/schema";
import { enqueueCertificate } from "@/lib/jobs/issue-certificate";

/**
 * Teacher-side enrollment and completion.
 *
 * Completion is the trigger for certificate issuing, so the rule is enforced
 * here rather than in the UI: every published module must be marked complete
 * before an enrollment can be completed.
 */

export interface TeacherCourseView {
  course: typeof courses.$inferSelect;
  modules: (typeof modules.$inferSelect)[];
  enrollment: typeof enrollments.$inferSelect | null;
  completedModuleIds: string[];
}

import { getPreloadedCourseBySlug } from "@/lib/content/cpd-courses";

export async function getCourseForTeacher(
  userId: string,
  slug: string
): Promise<TeacherCourseView | null> {
  try {
    const [course] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.slug, slug), eq(courses.status, "published")))
      .limit(1);

    if (course) {
      const courseModules = await db
        .select()
        .from(modules)
        .where(and(eq(modules.courseId, course.id), eq(modules.status, "published")))
        .orderBy(asc(modules.sequenceOrder));

      const [enrollment] = await db
        .select()
        .from(enrollments)
        .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, course.id)))
        .limit(1);

      let completedModuleIds: string[] = [];
      if (enrollment) {
        const rows = await db
          .select({ moduleId: moduleProgress.moduleId })
          .from(moduleProgress)
          .where(
            and(
              eq(moduleProgress.enrollmentId, enrollment.id),
              sql`${moduleProgress.completedAt} is not null`
            )
          );
        completedModuleIds = rows.map((r) => r.moduleId);
      }

      return { course, modules: courseModules, enrollment: enrollment ?? null, completedModuleIds };
    }
  } catch (err) {
    // If DB is offline, fall through to preloaded courses
  }

  // Preloaded course fallback
  const preloaded = getPreloadedCourseBySlug(slug);
  if (!preloaded) return null;

  const syntheticCourse = {
    id: preloaded.id,
    title: preloaded.title,
    slug: preloaded.slug,
    description: preloaded.description,
    subject: preloaded.subject,
    classLevels: preloaded.classLevels,
    estimatedDurationMinutes: preloaded.estimatedDurationMinutes,
    coverImageUrl: preloaded.coverImageUrl ?? null,
    aiGenerated: preloaded.aiGenerated ?? false,
    status: "published" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: userId,
    reviewedById: null,
    reviewedAt: null,
    rejectionReason: null,
  };

  const syntheticModules = preloaded.modules.map((m, idx) => ({
    id: m.id,
    courseId: preloaded.id,
    title: m.title,
    body: m.body,
    contentType: m.contentType,
    sequenceOrder: idx + 1,
    status: "published" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: userId,
  }));

  return {
    course: syntheticCourse as any,
    modules: syntheticModules as any,
    enrollment: null,
    completedModuleIds: [],
  };
}

/** Idempotent: enrolling twice returns the existing enrollment. */
export async function enroll(userId: string, courseId: string) {
  const [course] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.status, "published")))
    .limit(1);
  if (!course) return null;

  const [created] = await db
    .insert(enrollments)
    .values({ userId, courseId, status: "active" })
    .onConflictDoNothing()
    .returning({ id: enrollments.id });

  if (created) return created.id;

  const [existing] = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)))
    .limit(1);
  return existing?.id ?? null;
}

export async function setModuleProgress(
  enrollmentId: string,
  moduleId: string,
  completed: boolean
) {
  await db
    .insert(moduleProgress)
    .values({
      enrollmentId,
      moduleId,
      completedAt: completed ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: [moduleProgress.enrollmentId, moduleProgress.moduleId],
      set: { completedAt: completed ? new Date() : null },
    });
}

export interface CompletionResult {
  ok: boolean;
  /** Populated when ok is false, so the UI can say what's left. */
  remainingModules?: string[];
  alreadyCompleted?: boolean;
  certificateQueued?: boolean;
}

/**
 * Mark a course complete. Refuses while any published module is outstanding, so
 * the certificate always reflects genuinely finished work.
 */
export async function completeCourse(
  userId: string,
  enrollmentId: string
): Promise<CompletionResult | null> {
  const [enrollment] = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.id, enrollmentId), eq(enrollments.userId, userId)))
    .limit(1);
  if (!enrollment) return null;

  if (enrollment.status === "completed") {
    return { ok: true, alreadyCompleted: true, certificateQueued: false };
  }

  const courseModules = await db
    .select({ id: modules.id, title: modules.title })
    .from(modules)
    .where(and(eq(modules.courseId, enrollment.courseId), eq(modules.status, "published")))
    .orderBy(asc(modules.sequenceOrder));

  const done = await db
    .select({ moduleId: moduleProgress.moduleId })
    .from(moduleProgress)
    .where(
      and(
        eq(moduleProgress.enrollmentId, enrollmentId),
        sql`${moduleProgress.completedAt} is not null`
      )
    );
  const doneIds = new Set(done.map((d) => d.moduleId));

  const remaining = courseModules.filter((m) => !doneIds.has(m.id));
  if (remaining.length > 0) {
    return { ok: false, remainingModules: remaining.map((m) => m.title) };
  }

  await db
    .update(enrollments)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(enrollments.id, enrollmentId));

  // Queue the PDF; never throw, so completion itself can't fail on this.
  const jobId = await enqueueCertificate(userId, "course", enrollment.courseId);

  return { ok: true, certificateQueued: Boolean(jobId) };
}

export async function getEnrollmentOwnedBy(userId: string, enrollmentId: string) {
  const [row] = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.id, enrollmentId), eq(enrollments.userId, userId)))
    .limit(1);
  return row ?? null;
}

/** Verify a module belongs to the enrollment's course before recording progress. */
export async function moduleBelongsToEnrollment(enrollmentId: string, moduleId: string) {
  const result = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(modules)
    .innerJoin(enrollments, eq(modules.courseId, enrollments.courseId))
    .where(and(eq(enrollments.id, enrollmentId), eq(modules.id, moduleId)));
  return Number(result[0]?.n ?? 0) > 0;
}
