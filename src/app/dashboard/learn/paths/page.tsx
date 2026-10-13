import { PageHeader } from "@/components/layout/page-header";
import { LearnTabs } from "@/components/courses/learn-tabs";

export default function PathsPage() {
  return (
    <>
      <PageHeader
        title="Learning Paths"
        description="Multi-course tracks that build on each other."
      />
      <div className="mb-6">
        <LearnTabs />
      </div>
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center">
        <p className="font-medium text-ink">No learning paths published yet.</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
          Paths appear here once they've been published.
        </p>
      </div>
    </>
  );
}
