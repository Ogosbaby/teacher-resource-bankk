import Link from "next/link";
import { auth } from "@/lib/auth/config";
import { CourseDetailView } from "@/components/courses/course-detail-view";
import { getCourseForTeacher } from "@/lib/services/enrollments.service";

export const dynamic = "force-dynamic";

export default async function CourseDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const session = await auth();
  const userId = session?.user?.id ?? "offline-teacher";
  const view = await getCourseForTeacher(userId, params.slug).catch(() => null);

  return <CourseDetailView initialView={view} slug={params.slug} />;
}

