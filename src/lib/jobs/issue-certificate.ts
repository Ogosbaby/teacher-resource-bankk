import { and, eq } from "drizzle-orm";
import type PgBoss from "pg-boss";
import { db } from "@/lib/db/client";
import {
  certificates,
  courses,
  enrollments,
  learningPaths,
  pathEnrollments,
  users,
} from "@/lib/db/schema";
import { certificateKey, getStorageProvider } from "@/lib/storage";
import { renderCertificatePdf } from "@/lib/pdf/render";
import { QUEUES, enqueue } from "@/lib/jobs/queue";

export interface IssueCertificateJob {
  userId: string;
  target: "course" | "path";
  targetId: string;
}

/**
 * Issue a certificate for a completed course or learning path.
 *
 * Idempotent by design, because pg-boss retries:
 *  - the storage key is derived from (user, target), so a re-run overwrites the
 *    same object instead of orphaning a file;
 *  - an existing certificate row short-circuits the work entirely;
 *  - the partial unique indexes from 0005 are the final backstop against a race.
 */
export async function handleIssueCertificate(
  job: PgBoss.Job<IssueCertificateJob>
): Promise<void> {
  const { userId, target, targetId } = job.data;

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    console.warn(`[certificate] user ${userId} no longer exists — skipping`);
    return;
  }

  const [existing] = await db
    .select({ id: certificates.id })
    .from(certificates)
    .where(
      and(
        eq(certificates.userId, userId),
        target === "course"
          ? eq(certificates.courseId, targetId)
          : eq(certificates.learningPathId, targetId)
      )
    )
    .limit(1);

  if (existing) {
    console.log(`[certificate] already issued for ${target} ${targetId} — skipping`);
    return;
  }

  let title: string;
  let completionDate: Date;

  if (target === "course") {
    const [course] = await db.select().from(courses).where(eq(courses.id, targetId)).limit(1);
    if (!course) {
      console.warn(`[certificate] course ${targetId} no longer exists — skipping`);
      return;
    }
    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, targetId)))
      .limit(1);

    title = course.title;
    completionDate = enrollment?.completedAt ?? new Date();
  } else {
    const [path] = await db
      .select()
      .from(learningPaths)
      .where(eq(learningPaths.id, targetId))
      .limit(1);
    if (!path) {
      console.warn(`[certificate] learning path ${targetId} no longer exists — skipping`);
      return;
    }
    const [enrollment] = await db
      .select()
      .from(pathEnrollments)
      .where(and(eq(pathEnrollments.userId, userId), eq(pathEnrollments.pathId, targetId)))
      .limit(1);

    title = path.title;
    completionDate = enrollment?.completedAt ?? new Date();
  }

  const displayDate = completionDate.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const referenceId = `${target === "course" ? "C" : "P"}-${targetId.slice(0, 8).toUpperCase()}`;

  const pdf = await renderCertificatePdf({
    recipientName: user.name,
    courseTitle: title,
    completionDate: displayDate,
    title: target === "path" ? "Learning Path Certificate" : "Certificate of Completion",
    referenceId,
  });

  const key = certificateKey(userId, targetId);
  const storage = getStorageProvider();
  await storage.put(key, pdf, "application/pdf");

  // Row last: if the upload fails the job retries and no dangling record is left.
  await db
    .insert(certificates)
    .values({
      userId,
      courseId: target === "course" ? targetId : null,
      learningPathId: target === "path" ? targetId : null,
      titleSnapshot: title,
      recipientNameSnapshot: user.name,
      completionDate: completionDate.toISOString().slice(0, 10),
      storageKey: key,
    })
    .onConflictDoNothing();

  console.log(
    `[certificate] issued "${title}" to ${user.email} via ${storage.name} storage (${pdf.length} bytes)`
  );
}

/** Queue certificate issuing. Never throws — completion must not fail on this. */
export async function enqueueCertificate(
  userId: string,
  target: "course" | "path",
  targetId: string
): Promise<string | null> {
  return enqueue<IssueCertificateJob>(QUEUES.issueCertificate, { userId, target, targetId });
}
