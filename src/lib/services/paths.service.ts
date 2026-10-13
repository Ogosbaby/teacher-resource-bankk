import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { courses, learningPathCourses, learningPaths } from "@/lib/db/schema";
import {
  InvalidTransitionError,
  canTransition,
  reviewFieldsFor,
  type ContentStatus,
} from "@/lib/content/status";
import { uniqueSlug } from "@/lib/utils/slug";

export type LearningPath = typeof learningPaths.$inferSelect;

export interface LearningPathInput {
  title: string;
  description?: string | null;
  coverImageUrl?: string | null;
  courseIds?: string[];
}

export async function getPathWithCourses(id: string) {
  const [path] = await db.select().from(learningPaths).where(eq(learningPaths.id, id)).limit(1);
  if (!path) return null;

  const linked = await db
    .select({
      courseId: courses.id,
      title: courses.title,
      status: courses.status,
      sequenceOrder: learningPathCourses.sequenceOrder,
      isRequired: learningPathCourses.isRequired,
    })
    .from(learningPathCourses)
    .innerJoin(courses, eq(learningPathCourses.courseId, courses.id))
    .where(eq(learningPathCourses.pathId, id))
    .orderBy(asc(learningPathCourses.sequenceOrder));

  return { path, courses: linked };
}

async function resolveSlug(title: string, excludeId?: string) {
  return uniqueSlug(title, async (candidate) => {
    const rows = await db
      .select({ id: learningPaths.id })
      .from(learningPaths)
      .where(
        excludeId
          ? and(eq(learningPaths.slug, candidate), ne(learningPaths.id, excludeId))
          : eq(learningPaths.slug, candidate)
      )
      .limit(1);
    return rows.length > 0;
  });
}

export async function createPath(input: LearningPathInput, actorId: string) {
  const [created] = await db
    .insert(learningPaths)
    .values({
      title: input.title,
      slug: await resolveSlug(input.title),
      description: input.description ?? null,
      coverImageUrl: input.coverImageUrl ?? null,
      status: "draft",
      createdBy: actorId,
    })
    .returning({ id: learningPaths.id });

  if (input.courseIds) await setPathCourses(created.id, input.courseIds);
  return created.id;
}

export async function updatePath(id: string, input: Partial<LearningPathInput>) {
  const [existing] = await db
    .select({ slug: learningPaths.slug })
    .from(learningPaths)
    .where(eq(learningPaths.id, id))
    .limit(1);
  if (!existing) return false;

  await db
    .update(learningPaths)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.title !== undefined ? { slug: await resolveSlug(input.title, id) } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.coverImageUrl !== undefined ? { coverImageUrl: input.coverImageUrl } : {}),
      updatedAt: new Date(),
    })
    .where(eq(learningPaths.id, id));

  if (input.courseIds) await setPathCourses(id, input.courseIds);
  return true;
}

export async function setPathCourses(pathId: string, courseIds: string[]) {
  await db.delete(learningPathCourses).where(eq(learningPathCourses.pathId, pathId));
  if (!courseIds.length) return;
  await db.insert(learningPathCourses).values(
    courseIds.map((courseId, i) => ({
      pathId,
      courseId,
      sequenceOrder: i + 1,
      isRequired: true,
    }))
  );
}

export async function setPathStatus(id: string, to: ContentStatus, actorId: string) {
  const [path] = await db
    .select({ status: learningPaths.status })
    .from(learningPaths)
    .where(eq(learningPaths.id, id))
    .limit(1);
  if (!path) return null;

  if (!canTransition(path.status, to)) throw new InvalidTransitionError(path.status, to);

  await db
    .update(learningPaths)
    .set({ status: to, ...reviewFieldsFor(to, actorId), updatedAt: new Date() })
    .where(eq(learningPaths.id, id));

  return { from: path.status, to };
}

export async function deletePath(id: string) {
  await db.delete(learningPathCourses).where(eq(learningPathCourses.pathId, id));
  await db.delete(learningPaths).where(eq(learningPaths.id, id));
}

export async function countPathsByStatus() {
  return db
    .select({ status: learningPaths.status, n: sql<number>`count(*)::int` })
    .from(learningPaths)
    .groupBy(learningPaths.status);
}

/**
 * Admin listing: every path at every status, with how many courses it links.
 *
 * The count is a correlated subquery rather than a join + group by, because the
 * column is only ever needed for the table cell and a GROUP BY over the path row
 * would drag every selected column into the grouping.
 */
export async function listAllPaths() {
  return db
    .select({
      id: learningPaths.id,
      title: learningPaths.title,
      slug: learningPaths.slug,
      status: learningPaths.status,
      updatedAt: learningPaths.updatedAt,
      courseCount: sql<number>`(
        select count(*)::int from ${learningPathCourses}
        where ${learningPathCourses.pathId} = ${learningPaths.id}
      )`,
    })
    .from(learningPaths)
    .orderBy(desc(learningPaths.updatedAt));
}

/** Courses selectable when composing a path (drafts included, flagged in the UI). */
export async function listCoursesForPicker() {
  return db
    .select({ id: courses.id, title: courses.title, status: courses.status })
    .from(courses)
    .orderBy(asc(courses.title));
}
