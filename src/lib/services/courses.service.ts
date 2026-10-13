import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { courses, enrollments, modules } from "@/lib/db/schema";
import {
  InvalidTransitionError,
  canTransition,
  reviewFieldsFor,
  STATUS_LABEL,
  type ContentStatus,
} from "@/lib/content/status";
import { slugify, uniqueSlug } from "@/lib/utils/slug";

import { getPreloadedCourses } from "@/lib/content/cpd-courses";

/** Exposes custom preloaded CPD courses, merged with any published DB courses. */
export async function listPublishedCourses() {
  const preloaded = getPreloadedCourses().map((c) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    description: c.description,
    coverImageUrl: c.coverImageUrl ?? null,
    estimatedDurationMinutes: c.estimatedDurationMinutes,
    subject: c.subject,
    classLevels: c.classLevels,
  }));

  try {
    const dbCourses = await db
      .select({
        id: courses.id,
        title: courses.title,
        slug: courses.slug,
        description: courses.description,
        coverImageUrl: courses.coverImageUrl,
        estimatedDurationMinutes: courses.estimatedDurationMinutes,
        subject: courses.subject,
        classLevels: courses.classLevels,
      })
      .from(courses)
      .where(eq(courses.status, "published"))
      .orderBy(desc(courses.createdAt));

    const seenSlugs = new Set(dbCourses.map((c) => c.slug));
    const uniquePreloaded = preloaded.filter((p) => !seenSlugs.has(p.slug));
    return [...uniquePreloaded, ...dbCourses];
  } catch (err) {
    // If DB is offline or unreachable, serve the preloaded courses smoothly
    return preloaded;
  }
}

/**
 * Admin listing: every course at every status, with its published-module count.
 *
 * The count comes from the same left join the admin table renders, so a course
 * with no modules reads 0 rather than missing from the list — `count(*)` on a
 * left join would count the phantom row, hence the column reference.
 */
export async function listAllCourses() {
  return db
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
      subject: courses.subject,
      status: courses.status,
      aiGenerated: courses.aiGenerated,
      updatedAt: courses.updatedAt,
      moduleCount: sql<number>`count(${modules.id})::int`,
    })
    .from(courses)
    .leftJoin(modules, eq(modules.courseId, courses.id))
    .groupBy(courses.id)
    .orderBy(desc(courses.updatedAt));
}

/** Courses the teacher has started but not yet completed. */
export async function listActiveEnrollments(userId: string) {
  return db
    .select({
      id: enrollments.id,
      status: enrollments.status,
      enrolledAt: enrollments.enrolledAt,
      courseTitle: courses.title,
      courseSlug: courses.slug,
      courseDescription: courses.description,
      courseCoverImageUrl: courses.coverImageUrl,
      courseDurationMinutes: courses.estimatedDurationMinutes,
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(and(eq(enrollments.userId, userId), eq(enrollments.status, "active")))
    .orderBy(desc(enrollments.enrolledAt));
}

/**
 * Real module-level progress per enrollment, computed from module_progress
 * against the course's published modules. Returns an empty map when no
 * modules exist yet, so callers render "not started" rather than 0%.
 */
export async function enrollmentProgress(userId: string) {
  const result = await db.execute(sql`
    SELECT e.id AS enrollment_id,
           count(m.id)::int AS total,
           count(mp.id)::int AS completed
    FROM enrollments e
    LEFT JOIN modules m
      ON m.course_id = e.course_id AND m.status = 'published'
    LEFT JOIN module_progress mp
      ON mp.enrollment_id = e.id
     AND mp.module_id = m.id
     AND mp.completed_at IS NOT NULL
    WHERE e.user_id = ${userId}
    GROUP BY e.id
  `);

  const map = new Map<string, { total: number; completed: number }>();
  for (const row of result.rows as { enrollment_id: string; total: number; completed: number }[]) {
    map.set(row.enrollment_id, { total: Number(row.total), completed: Number(row.completed) });
  }
  return map;
}

// ---------------------------------------------------------------------------
// Admin / authoring operations
// ---------------------------------------------------------------------------

export interface ModuleInput {
  title: string;
  body?: string | null;
  contentType?: "video" | "text" | "quiz" | "resource" | "external_link";
  videoUrl?: string | null;
  status?: ContentStatus;
}

export interface CourseInput {
  title: string;
  description?: string | null;
  subject?: string | null;
  classLevels?: string[];
  tags?: string[];
  estimatedDurationMinutes?: number | null;
  coverImageUrl?: string | null;
  aiGenerated?: boolean;
  aiModelVersion?: string | null;
  generationPrompt?: string | null;
  modules?: ModuleInput[];
}

export async function getCourseWithModules(id: string) {
  const [course] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
  if (!course) return null;
  const courseModules = await db
    .select()
    .from(modules)
    .where(eq(modules.courseId, id))
    .orderBy(asc(modules.sequenceOrder));
  return { course, modules: courseModules };
}

async function resolveSlug(title: string, excludeId?: string) {
  return uniqueSlug(title, async (candidate) => {
    const rows = await db
      .select({ id: courses.id })
      .from(courses)
      .where(
        excludeId
          ? and(eq(courses.slug, candidate), ne(courses.id, excludeId))
          : eq(courses.slug, candidate)
      )
      .limit(1);
    return rows.length > 0;
  });
}

/**
 * Creates a course. Always 'draft' unless an explicit status is passed — and
 * even then the value is stored as given and only publishable through
 * setCourseStatus, which enforces the transition graph.
 */
export async function createCourse(input: CourseInput, actorId: string) {
  const slug = await resolveSlug(input.title);

  const [created] = await db
    .insert(courses)
    .values({
      title: input.title,
      slug,
      description: input.description ?? null,
      subject: input.subject ?? null,
      classLevels: input.classLevels ?? [],
      tags: input.tags ?? [],
      estimatedDurationMinutes: input.estimatedDurationMinutes ?? null,
      coverImageUrl: input.coverImageUrl ?? null,
      status: "draft",
      aiGenerated: input.aiGenerated ?? false,
      aiModelVersion: input.aiModelVersion ?? null,
      generationPrompt: input.generationPrompt ?? null,
      createdBy: actorId,
    })
    .returning({ id: courses.id });

  if (input.modules?.length) await replaceModules(created.id, input.modules);
  return created.id;
}

export async function updateCourse(id: string, input: Partial<CourseInput>) {
  const [existing] = await db
    .select({ title: courses.title, slug: courses.slug })
    .from(courses)
    .where(eq(courses.id, id))
    .limit(1);
  if (!existing) return false;

  const slug =
    input.title && slugify(input.title) !== existing.slug
      ? await resolveSlug(input.title, id)
      : existing.slug;

  await db
    .update(courses)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      slug,
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.subject !== undefined ? { subject: input.subject } : {}),
      ...(input.classLevels !== undefined ? { classLevels: input.classLevels } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(input.estimatedDurationMinutes !== undefined
        ? { estimatedDurationMinutes: input.estimatedDurationMinutes }
        : {}),
      ...(input.coverImageUrl !== undefined ? { coverImageUrl: input.coverImageUrl } : {}),
      updatedAt: new Date(),
    })
    .where(eq(courses.id, id));

  if (input.modules) await replaceModules(id, input.modules);
  return true;
}

/** Modules are authored as a whole list, so replace-on-save keeps ordering sane. */
export async function replaceModules(courseId: string, list: ModuleInput[]) {
  await db.delete(modules).where(eq(modules.courseId, courseId));
  if (!list.length) return;
  await db.insert(modules).values(
    list.map((m, i) => ({
      courseId,
      title: m.title,
      body: m.body ?? null,
      contentType: m.contentType ?? ("text" as const),
      videoUrl: m.videoUrl ?? null,
      sequenceOrder: i + 1,
      status: m.status ?? ("draft" as const),
    }))
  );
}

/** Rejects any transition the pipeline doesn't allow (notably draft -> published). */
export async function setCourseStatus(id: string, to: ContentStatus, actorId: string) {
  const [course] = await db
    .select({ status: courses.status })
    .from(courses)
    .where(eq(courses.id, id))
    .limit(1);
  if (!course) return null;

  if (!canTransition(course.status, to)) {
    throw new InvalidTransitionError(course.status, to);
  }

  await db
    .update(courses)
    .set({ status: to, ...reviewFieldsFor(to, actorId), updatedAt: new Date() })
    .where(eq(courses.id, id));

  return { from: course.status, to, label: STATUS_LABEL[to] };
}

/** Publishing a course publishes its modules too, so the catalog isn't empty inside. */
export async function publishCourseModules(courseId: string) {
  await db
    .update(modules)
    .set({ status: "published", updatedAt: new Date() })
    .where(and(eq(modules.courseId, courseId), inArray(modules.status, ["draft", "in_review"])));
}

export async function deleteCourse(id: string) {
  await db.delete(modules).where(eq(modules.courseId, id));
  await db.delete(courses).where(eq(courses.id, id));
}

export async function countCoursesByStatus() {
  const rows = await db
    .select({ status: courses.status, n: sql<number>`count(*)::int` })
    .from(courses)
    .groupBy(courses.status);
  return rows;
}

export async function listCompletedEnrollments(userId: string) {
  return db
    .select({
      id: enrollments.id,
      completedAt: enrollments.completedAt,
      courseTitle: courses.title,
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(and(eq(enrollments.userId, userId), eq(enrollments.status, "completed")))
    .orderBy(desc(enrollments.completedAt));
}
