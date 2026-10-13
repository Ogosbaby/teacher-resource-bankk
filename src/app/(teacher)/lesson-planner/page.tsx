import { auth } from "@/lib/auth/config";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { LessonPlannerStudio } from "@/components/lesson-planner/lesson-planner-studio";
import { AdminWebGuard } from "@/components/layout/admin-web-guard";

export const metadata = {
  title: "Lesson Planner — Teacher Resource Bank",
  description: "Draft and refine classroom-ready lesson plans with AI, or upload a rough draft to polish.",
};

export default async function LessonPlannerPage() {
  const session = await auth();

  return (
    <AdminWebGuard userRole={session?.user?.role}>
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Lesson Planner</h1>
          <p className="mt-1 text-xs text-warm-600">
            Generate complete Nigerian curriculum lesson plans with AI, or paste/upload rough notes to polish.
          </p>
        </div>

        <LessonPlannerStudio userName={session?.user?.name ?? undefined} />
      </div>
    </AdminWebGuard>
  );
}
