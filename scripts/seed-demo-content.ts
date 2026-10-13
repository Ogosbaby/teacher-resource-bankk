import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { db, pool } from "../src/lib/db/client";
import {
  certificates,
  contentEmbeddings,
  courses,
  enrollments,
  moduleProgress,
  modules,
  users,
} from "../src/lib/db/schema";

/**
 * OPT-IN demo content for evaluating the Learn catalog and My Learning designs.
 *
 *   npx tsx scripts/seed-demo-content.ts          # create/refresh demo courses
 *   npx tsx scripts/seed-demo-content.ts --clear  # remove them again
 *
 * This is the ONLY place content is written with status='published' without a
 * human clicking through draft -> in_review -> published. It stands in for that
 * review step exactly like the demo subscription stands in for a Paystack charge,
 * and every run is stamped as demo content so it is easy to spot and remove.
 *
 * The real admin CRUD screens (Phase C) must NOT shortcut this way.
 */

const DEMO_PREFIX = "demo-";

type DemoCourse = {
  title: string;
  slug: string;
  description: string;
  subject: string;
  classLevels: string[];
  estimatedDurationMinutes: number;
  modules: string[];
};

const DEMO_COURSES: DemoCourse[] = [
  {
    title: "Classroom Management Essentials",
    slug: "demo-classroom-management",
    description:
      "Practical routines for a calm, focused classroom — seating, transitions, expectations, and handling disruption without raising your voice.",
    subject: "Professional Development",
    classLevels: ["Primary", "JSS", "SSS"],
    estimatedDurationMinutes: 120,
    modules: [
      "Setting expectations in week one",
      "Managing transitions between activities",
      "Responding to low-level disruption",
      "Building a consistent reward system",
    ],
  },
  {
    title: "Teaching Mathematics for Understanding",
    slug: "demo-teaching-mathematics",
    description:
      "Move beyond memorised procedures. Concrete-to-abstract sequencing, worked examples, and question design that exposes misconceptions.",
    subject: "Mathematics",
    classLevels: ["JSS", "SSS"],
    estimatedDurationMinutes: 180,
    modules: [
      "Diagnosing misconceptions before teaching",
      "Concrete, pictorial, abstract sequencing",
      "Designing worked examples that teach",
      "Questioning that checks real understanding",
      "Assessment without exam pressure",
    ],
  },
  {
    title: "Assessment That Actually Helps Learning",
    slug: "demo-assessment-for-learning",
    description:
      "Formative assessment techniques you can use tomorrow: hinge questions, exit tickets, no-hands-up questioning, and marking that saves time.",
    subject: "Professional Development",
    classLevels: ["JSS", "SSS"],
    estimatedDurationMinutes: 90,
    modules: [
      "Hinge questions and exit tickets",
      "Whole-class feedback instead of 60 individual comments",
      "Using assessment data to plan the next lesson",
    ],
  },
  {
    title: "Teaching English Language: Reading & Comprehension",
    slug: "demo-english-reading",
    description:
      "Building comprehension from decoding to inference, with strategies for mixed-ability classes and limited textbooks.",
    subject: "English Language",
    classLevels: ["Primary", "JSS"],
    estimatedDurationMinutes: 150,
    modules: [
      "Choosing and using a text",
      "Scaffolding inference and deduction",
      "Vocabulary instruction that sticks",
      "Reading in mixed-ability classrooms",
    ],
  },
  {
    title: "Practical Science with Limited Equipment",
    slug: "demo-practical-science",
    description:
      "Running genuine practical work without a lab: low-cost demonstrations, improvised apparatus, and safety planning.",
    subject: "Basic Science",
    classLevels: ["Primary", "JSS"],
    estimatedDurationMinutes: 105,
    modules: [
      "Practical work with almost nothing",
      "Safety planning for shared classrooms",
      "Recording results and drawing conclusions",
    ],
  },
  {
    title: "Digital Skills for the Classroom",
    slug: "demo-digital-skills",
    description:
      "Using the tools you already have — a phone, a projector, a shared laptop — to plan lessons and give feedback faster.",
    subject: "Computer Studies",
    classLevels: ["JSS", "SSS"],
    estimatedDurationMinutes: 90,
    modules: [
      "Planning lessons on a phone",
      "Making printed handouts from digital sources",
      "Practical AI use: what it can and cannot do for you",
    ],
  },
];

async function clear() {
  const demoSlugs = DEMO_COURSES.map((c) => c.slug);
  const found = await db
    .select({ id: courses.id })
    .from(courses)
    .where(inArray(courses.slug, demoSlugs));
  if (!found.length) {
    console.log("No demo courses found — nothing to remove.");
    return;
  }

  const ids = found.map((c) => c.id);

  // One transaction, deleted in dependency order: a half-applied clear (modules
  // gone, courses left behind) is worse than a failed one. Note that
  // certificates are removed too — a certificate earned for demo content would
  // otherwise block this forever, and there is no way to keep it meaningful once
  // the course it names is gone.
  await db.transaction(async (tx) => {
    await tx.delete(moduleProgress).where(
      inArray(
        moduleProgress.enrollmentId,
        tx.select({ id: enrollments.id }).from(enrollments).where(inArray(enrollments.courseId, ids))
      )
    );
    await tx.delete(certificates).where(inArray(certificates.courseId, ids));
    await tx.delete(enrollments).where(inArray(enrollments.courseId, ids));
    await tx.delete(modules).where(inArray(modules.courseId, ids));
    await tx.delete(contentEmbeddings).where(inArray(contentEmbeddings.sourceId, ids));
    await tx.delete(courses).where(inArray(courses.slug, demoSlugs));
  });

  console.log(
    `Removed ${found.length} demo course(s), their modules, enrollments, and any certificates or embeddings.`
  );
}

/**
 * Enroll the seeded demo teacher into the first few courses and mark some
 * modules complete, so My Learning shows real progress bars. No-op when the
 * demo teacher account doesn't exist.
 */
async function seedEnrollments() {
  const [teacher] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, "teacher@trb.local"))
    .limit(1);
  if (!teacher) return 0;

  const partial: Record<string, number> = {
    "demo-classroom-management": 2,
    "demo-teaching-mathematics": 3,
    "demo-assessment-for-learning": 1,
  };

  for (const [slug, completedCount] of Object.entries(partial)) {
    const [course] = await db
      .select({ id: courses.id })
      .from(courses)
      .where(eq(courses.slug, slug))
      .limit(1);
    if (!course) continue;

    const [enrollment] = await db
      .insert(enrollments)
      .values({ userId: teacher.id, courseId: course.id, status: "active" })
      .onConflictDoNothing()
      .returning({ id: enrollments.id });

    const enrollmentId =
      enrollment?.id ??
      (
        await db
          .select({ id: enrollments.id })
          .from(enrollments)
          .where(eq(enrollments.courseId, course.id))
          .limit(1)
      )[0]?.id;
    if (!enrollmentId) continue;

    const courseModules = await db
      .select({ id: modules.id })
      .from(modules)
      .where(eq(modules.courseId, course.id))
      .orderBy(modules.sequenceOrder);

    await db.delete(moduleProgress).where(eq(moduleProgress.enrollmentId, enrollmentId));
    const done = courseModules.slice(0, completedCount);
    if (done.length) {
      await db.insert(moduleProgress).values(
        done.map((m) => ({ enrollmentId, moduleId: m.id, completedAt: new Date() }))
      );
    }
  }

  return Object.keys(partial).length;
}

async function seed() {
  let created = 0;
  let refreshed = 0;

  for (const [i, c] of DEMO_COURSES.entries()) {
    const [existing] = await db
      .select({ id: courses.id })
      .from(courses)
      .where(eq(courses.slug, c.slug))
      .limit(1);

    const values = {
      title: c.title,
      slug: c.slug,
      description: c.description,
      subject: c.subject,
      classLevels: c.classLevels,
      tags: ["demo", c.subject.toLowerCase()],
      estimatedDurationMinutes: c.estimatedDurationMinutes,
      status: "published" as const,
      aiGenerated: true,
      aiModelVersion: "demo-seed",
      generationPrompt: "[demo seed — not AI generated]",
      coverImageUrl: `https://picsum.photos/seed/${c.slug}/800/500?grayscale`,
    };

    let courseId: string;
    if (existing) {
      await db.update(courses).set({ ...values, updatedAt: new Date() }).where(eq(courses.id, existing.id));
      courseId = existing.id;
      refreshed++;
    } else {
      const [inserted] = await db.insert(courses).values(values).returning({ id: courses.id });
      courseId = inserted.id;
      created++;
    }

    await db.delete(modules).where(eq(modules.courseId, courseId));
    await db.insert(modules).values(
      c.modules.map((title, idx) => ({
        courseId,
        title,
        sequenceOrder: idx + 1,
        contentType: "text" as const,
        status: "published" as const,
        body: `[Demo module content for "${title}".]`,
      }))
    );

    // Keep iteration order visible in the catalog's "newest first" default.
    await db
      .update(courses)
      .set({ createdAt: new Date(Date.now() - i * 60_000) })
      .where(eq(courses.id, courseId));
  }

  const enrolled = await seedEnrollments();

  console.log(`Demo content ready: ${created} created, ${refreshed} refreshed, each with modules.`);
  if (enrolled) console.log(`Enrolled teacher@trb.local in ${enrolled} courses with partial progress.`);
  console.log(`Every slug is prefixed "${DEMO_PREFIX}" — remove with --clear.`);
}

async function main() {
  if (process.argv.includes("--clear")) await clear();
  else await seed();
}

main()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error(err);
    await pool.end().catch(() => {});
    process.exit(1);
  });
