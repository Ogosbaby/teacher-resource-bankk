import { PageHeader } from "@/components/layout/page-header";
import { LearnTabs } from "@/components/courses/learn-tabs";

export default function ResourcesPage() {
  return (
    <>
      <PageHeader
        title="Resource Bank"
        description="Lesson plans, worksheets, and templates — AI-drafted, human-reviewed."
      />
      <div className="mb-6">
        <LearnTabs />
      </div>
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center">
        <p className="font-medium text-ink">The resource bank is empty.</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
          Nothing is published yet. Resources only appear here after a human reviewer has signed
          off on them.
        </p>
      </div>
    </>
  );
}
