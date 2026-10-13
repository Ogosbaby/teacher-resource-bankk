import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/config";
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
  const session = await auth();
  const userId = session?.user?.id ?? "offline-teacher";
  const view = await getCourseForTeacher(userId, params.slug);
  if (!view) notFound();

  const { course, modules, enrollment, completedModuleIds } = view;
  const cover =
    course.coverImageUrl ?? `https://picsum.photos/seed/${course.slug}/1600/600?grayscale`;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-4 sm:px-6">
      <div className="flex items-center justify-between">
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-warm-600 hover:text-ink"
        >
          <span aria-hidden="true">←</span> Back to courses
        </Link>
      </div>

      <div className="overflow-hidden rounded-oak border border-warm-200 bg-white shadow-warm-sm">
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
            <p className="mt-3 max-w-3xl text-warm-600">{course.description}</p>
          )}

          {course.aiGenerated && (
            <p className="mt-4 rounded-lg bg-warm-50 px-3 py-2 text-xs text-warm-500">
              This course was drafted with AI assistance and reviewed by the Teacher Resource
              Bank editorial team before publishing.
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
        certificatesHref="/my-library/certificates"
        modules={modules.map((m) => ({
          id: m.id,
          title: m.title,
          body: m.body ?? "",
          contentType: m.contentType,
        }))}
      />

      <Link href="/courses" className="inline-flex items-center gap-1 text-sm text-warm-600 hover:text-ink">
        ← Back to all courses
      </Link>
    </div>
  );
}
