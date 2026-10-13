import { PageHeader } from "@/components/layout/page-header";
import { CourseCatalog } from "@/components/courses/course-catalog";
import { LearnTabs } from "@/components/courses/learn-tabs";
import { listPublishedCourses } from "@/lib/services/courses.service";

export const metadata = { title: "Learn · Teacher Resource Bank" };

export default async function LearnCatalogPage() {
  const courses = await listPublishedCourses();

  return (
    <>
      <PageHeader
        title="Learn"
        description="Courses and learning paths built around Nigerian classrooms."
      />
      <div className="mb-6">
        <LearnTabs />
      </div>
      <CourseCatalog courses={courses} />
    </>
  );
}
