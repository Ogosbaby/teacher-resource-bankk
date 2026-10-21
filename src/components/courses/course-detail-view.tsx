"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Button } from "@/components/ui";
import { CoursePlayer } from "@/components/courses/course-player";
import { CourseThumbnail } from "@/components/courses/course-thumbnail";

import { getTailoredCourseBySlug, getCustomGeneratedCourses } from "@/lib/content/course-generator";
import { MathText } from "@/components/ui/formatted-markdown";
import type { CPDCourse } from "@/lib/content/cpd-courses";

export interface CourseDetailViewProps {
  initialView: {
    course: {
      id: string;
      title: string;
      slug: string;
      description: string | null;
      coverImageUrl: string | null;
      subject: string | null;
      classLevels: string[] | null;
      estimatedDurationMinutes: number | null;
      aiGenerated?: boolean | null;
    };
    modules: {
      id: string;
      title: string;
      body: string | null;
      contentType: string;
    }[];
    enrollment: any;
    completedModuleIds: string[];
  } | null;
  slug: string;
}

export function CourseDetailView({ initialView, slug }: CourseDetailViewProps) {
  const [courseData, setCourseData] = useState(initialView);
  const [isClientResolved, setIsClientResolved] = useState(Boolean(initialView));

  useEffect(() => {
    if (courseData) return;

    // Check localStorage custom generated courses first
    const customCourses = getCustomGeneratedCourses();
    const localMatch = customCourses.find((c) => c.slug === slug || c.id === slug);

    if (localMatch) {
      setCourseData({
        course: {
          id: localMatch.id,
          title: localMatch.title,
          slug: localMatch.slug,
          description: localMatch.description,
          coverImageUrl: localMatch.coverImageUrl ?? null,
          subject: localMatch.subject,
          classLevels: localMatch.classLevels,
          estimatedDurationMinutes: localMatch.estimatedDurationMinutes,
          aiGenerated: localMatch.aiGenerated,
        },
        modules: localMatch.modules.map((m) => ({
          id: m.id,
          title: m.title,
          body: m.body,
          contentType: m.contentType,
        })),
        enrollment: null,
        completedModuleIds: [],
      });
      setIsClientResolved(true);
      return;
    }

    // Fall back to tailored blueprint generator
    const blueprint = getTailoredCourseBySlug(slug);
    if (blueprint) {
      setCourseData({
        course: {
          id: blueprint.id,
          title: blueprint.title,
          slug: blueprint.slug,
          description: blueprint.description,
          coverImageUrl: blueprint.coverImageUrl ?? null,
          subject: blueprint.subject,
          classLevels: blueprint.classLevels,
          estimatedDurationMinutes: blueprint.estimatedDurationMinutes,
          aiGenerated: blueprint.aiGenerated,
        },
        modules: blueprint.modules.map((m) => ({
          id: m.id,
          title: m.title,
          body: m.body,
          contentType: m.contentType,
        })),
        enrollment: null,
        completedModuleIds: [],
      });
      setIsClientResolved(true);
      return;
    }

    setIsClientResolved(true);
  }, [courseData, slug]);

  if (!courseData) {
    if (!isClientResolved) {
      return (
        <div className="mx-auto max-w-4xl p-8 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-mint-500 border-t-transparent mx-auto mb-4" />
          <p className="text-sm text-warm-600">Loading course curriculum...</p>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-ink">Course Not Found</h1>
        <p className="mt-2 text-sm text-warm-600">
          The requested course is not currently available on your device.
        </p>
        <div className="mt-6">
          <Link href="/courses">
            <Button className="rounded-xl bg-ink px-6 py-2.5 text-xs font-bold text-white shadow-md">
              ← Return to Course Catalog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { course, modules, enrollment, completedModuleIds } = courseData;
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
        <CourseThumbnail
          slug={course.slug}
          title={course.title}
          subject={course.subject}
          aspectRatio="banner"
        />

        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            {course.subject && <Badge>{course.subject}</Badge>}
            {course.classLevels?.map((lvl) => (
              <Badge key={lvl}>{lvl}</Badge>
            ))}
            {course.estimatedDurationMinutes && (
              <Badge>{course.estimatedDurationMinutes} min</Badge>
            )}
            {course.aiGenerated && (
              <Badge variant="neutral">✨ Tailored for your profile</Badge>
            )}
          </div>

          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            <MathText text={course.title} />
          </h1>
          {course.description && (
            <p className="mt-3 max-w-3xl text-warm-600 leading-relaxed">{course.description}</p>
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

      <Link
        href="/courses"
        className="inline-flex items-center gap-1 text-sm text-warm-600 hover:text-ink"
      >
        ← Back to all courses
      </Link>
    </div>
  );
}
