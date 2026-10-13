import "dotenv/config";
import { asc, eq } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import { users, courses, modules } from "../src/lib/db/schema";
import { createCourse, setCourseStatus, publishCourseModules } from "../src/lib/services/courses.service";
import { enroll, setModuleProgress } from "../src/lib/services/enrollments.service";

const COURSE_TITLE = "Formative Assessment for Everyday Teaching";

const MODULES = [
  {
    title: "Why Formative Assessment Matters",
    contentType: "text" as const,
    body: `## Why Formative Assessment Matters

Formative assessment is the ongoing, low-stakes checking you do **while** you teach — not
just the test you give at the end of term. Done well, it tells you in real time whether
a class has actually understood a concept, so you can adjust your teaching before a small
gap becomes a big one.

**By the end of this module you will be able to:**

- Explain the difference between formative and summative assessment
- Identify at least three moments in a typical lesson where formative checks fit naturally
- Recognise the difference between assessment *of* learning and assessment *for* learning

### The core idea

Summative assessment (end-of-term exams, WAEC-style tests) tells you **what** a learner
achieved. Formative assessment tells you **what to do next** — which learners need more
support, which need to move faster, and which part of your explanation didn't land.

> A quick show-of-hands, a one-question exit ticket, or a "thumbs up/thumbs down" check
> are all formative assessment. You are probably already doing some of this — this course
> will help you do it more deliberately and use what you learn.

### Reflection

Before the next module, think of one lesson you taught this week. At what point could
you have paused for 60 seconds to check understanding, before moving on?`,
  },
  {
    title: "Quick, Low-Prep Techniques You Can Use Tomorrow",
    contentType: "text" as const,
    body: `## Quick, Low-Prep Techniques You Can Use Tomorrow

These techniques need little to no preparation and work in classes of any size, including
crowded Nigerian classrooms with 40+ learners.

### 1. Exit tickets
At the end of a lesson, ask learners to answer one short question on a scrap of paper
before they leave — "What is one thing you learned today?" or "What is one thing you're
still unsure about?" Skim them before your next lesson with that class.

### 2. Thumbs up / thumbs down
Ask a quick check question and have learners show thumbs up (confident), sideways
(partly sure), or down (lost). Takes ten seconds and tells you instantly whether to
re-explain or move on.

### 3. Think–Pair–Share
Pose a question, give learners 30 seconds to think alone, then 1 minute to compare
answers with a neighbour, before taking a few answers from the class. This surfaces
misunderstandings learners might be too shy to raise alone.

### 4. Cold call with wait time
Ask the question **before** naming who answers, pause for 3–5 seconds, then call on a
learner. This keeps everyone thinking, not just the ones with raised hands.

### 5. One-minute write
Give learners 60 seconds to write down everything they remember about a topic just
covered. Skimming a few of these tells you a lot about where the class actually is.

Pick **one** of these to try in your very next lesson.`,
  },
  {
    title: "Using What You Learn to Adjust Your Teaching",
    contentType: "text" as const,
    body: `## Using What You Learn to Adjust Your Teaching

Collecting formative data is only useful if it changes what you do next. This module
covers three simple response patterns.

### If most of the class is confident
Move on, but keep a light-touch check later in the lesson to confirm the understanding
held.

### If the class is split
Use Think–Pair–Share so confident learners can explain to those who are unsure — often
more effective than another teacher explanation, and it keeps everyone engaged.

### If most of the class is lost
Stop, re-teach the concept a different way (a new example, a diagram, a real-world
analogy), and re-check before moving forward. Resist the urge to "cover the syllabus"
at the expense of actual understanding — a class that is lost on today's concept will
struggle even more with tomorrow's, which usually builds on it.

### A simple weekly habit

Keep a small notebook or a phone note with one line per class: *"P5 — struggled with
fractions, re-teach Monday."* Reviewing this weekly turns individual formative checks
into a pattern you can act on across the term.`,
  },
  {
    title: "Knowledge Check",
    contentType: "quiz" as const,
    body: `## Knowledge Check

Answer honestly — this is for your own reflection, not graded.

1. What is the main difference between formative and summative assessment?
2. Name two low-prep formative techniques you could use in a class of 40+ learners.
3. If a formative check shows half the class is confused and half is confident, what is
   a good next step?
4. Describe one change you will make to a lesson this week based on this course.

Write your answers in your lesson notebook or the Lesson Planner — there is no need to
submit them here.`,
  },
  {
    title: "Further Viewing: Formative Assessment in Practice",
    contentType: "video" as const,
    videoUrl: "https://www.youtube.com/watch?v=nkyR9-uT9AU",
    body: `## Further Viewing

This short video shows formative assessment techniques in a real classroom setting.
Watch it, then note down one technique from the video you haven't tried before.`,
  },
];

async function main() {
  const admin = (
    await db.select().from(users).where(eq(users.role, "admin")).limit(1)
  )[0];
  if (!admin) {
    throw new Error("No admin user found — run scripts/seed.ts first.");
  }

  const teacher = (
    await db.select().from(users).where(eq(users.email, "teacher@trb.local")).limit(1)
  )[0];

  // Idempotent — running this twice just reports the existing course rather
  // than creating a duplicate.
  const existing = (
    await db.select().from(courses).where(eq(courses.title, COURSE_TITLE)).limit(1)
  )[0];

  let courseId: string;
  if (existing) {
    courseId = existing.id;
    console.log(`Course already exists (${existing.status}):`, existing.slug);
  } else {
    courseId = await createCourse(
      {
        title: COURSE_TITLE,
        description:
          "A practical, classroom-ready introduction to formative assessment — quick, " +
          "low-prep techniques you can start using in your very next lesson, and how to " +
          "act on what they tell you.",
        subject: "Professional Development",
        classLevels: ["Primary", "JSS", "SSS"],
        tags: ["assessment", "pedagogy", "cpd"],
        estimatedDurationMinutes: 75,
        coverImageUrl: null,
        modules: MODULES,
      },
      admin.id
    );

    // Mirror the real admin review pipeline rather than writing "published"
    // directly, so this sample behaves exactly like admin-authored content.
    await setCourseStatus(courseId, "in_review", admin.id);
    await setCourseStatus(courseId, "published", admin.id);
    await publishCourseModules(courseId);

    console.log("Created and published course:", COURSE_TITLE);
  }

  if (teacher) {
    const enrollmentId = await enroll(teacher.id, courseId);
    if (enrollmentId) {
      // Demo progress: first two modules done, so My Learning has something
      // to show without the course being fully finished.
      const courseModules = await db
        .select({ id: modules.id })
        .from(modules)
        .where(eq(modules.courseId, courseId))
        .orderBy(asc(modules.sequenceOrder));
      for (const m of courseModules.slice(0, 2)) {
        await setModuleProgress(enrollmentId, m.id, true);
      }
      console.log(
        `Enrolled ${teacher.email} with ${Math.min(2, courseModules.length)} of ${courseModules.length} modules complete.`
      );
    }
  } else {
    console.log("No demo teacher found (teacher@trb.local) — skipped enrollment.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
