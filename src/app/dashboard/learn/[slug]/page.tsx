import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { Badge } from "@/components/ui";
import { CoursePlayer } from "@/components/courses/course-player";
import { getCourseForTeacher } from "@/lib/services/enrollments.service";

export const dynamic = "force-dynamic";

// Only published courses are reachable here; getCourseForTeacher filters on
// status so a draft slug 404s rather than leaking unreviewed content.
export default async function CourseDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const session = await requireSession();
  const view = await getCourseForTeacher(session.user.id, params.slug);
  if (!view) notFound();

  const { course, modules, enrollment, completedModuleIds } = view;
  const cover =
    course.coverImageUrl ?? `https://picsum.photos/seed/${course.slug}/1600/600?grayscale`;

  return (
    <div className="space-y-8">
      <Link
        href="/dashboard/learn"
        className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-ink"
      >
        ← Back to catalog
      </Link>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover} alt="" className="h-48 w-full object-cover grayscale sm:h-64" />
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            {course.subject && <Badge>{course.subject}</Badge>}
            {course.classLevels?.map((lvl) => (
              <Badge key={lvl}>{lvl}</Badge>
            ))}
            {course.estimatedDurationMinutes && (
              <Badge>{course.estimatedDurationMinutes} min</Badge>
            )}
          </div>

          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {course.title}
          </h1>
          {course.description && (
            <p className="mt-3 max-w-3xl text-neutral-600">{course.description}</p>
          )}

          {course.aiGenerated && (
            <p className="mt-4 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
              This course was drafted with AI assistance and reviewed by the Teacher
              Resource Bank editorial team before publishing.
            </p>
          )}
        </div>
      </div>

      <CoursePlayer
        courseId={course.id}
        courseTitle={course.title}
        enrollmentId={enrollment?.id ?? null}
        initialCompleted={completedModuleIds}
        isCompleted={enrollment?.status === "completed"}
        modules={modules.map((m) => ({
          id: m.id,
          title: m.title,
          body: m.body ?? "",
          contentType: m.contentType,
        }))}
      />
    </div>
  );
}
