import { auth } from "@/lib/auth/config";
import { CourseCatalog } from "@/components/courses/course-catalog";
import { listPublishedCourses } from "@/lib/services/courses.service";
import { AdminWebGuard } from "@/components/layout/admin-web-guard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "CPD Courses — Teacher Resource Bank",
  description: "Accredited pedagogical courses for Nigerian teachers.",
};

export default async function CoursesPage() {
  const session = await auth();
  const courses = await listPublishedCourses();

  return (
    <AdminWebGuard userRole={session?.user?.role}>
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        <div className="mb-3">
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">CPD Courses</h1>
        </div>
        <CourseCatalog courses={courses} basePath="/courses" />
      </div>
    </AdminWebGuard>
  );
}
