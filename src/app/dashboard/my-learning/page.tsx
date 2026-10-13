import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui";
import { enrollmentProgress, listActiveEnrollments } from "@/lib/services/courses.service";

export const metadata = { title: "My Learning · Teacher Resource Bank" };

// Auth-only (no subscription check): a teacher keeps visibility of courses they
// already started, mirroring the certificates-remain-accessible rule.
export default async function MyLearningPage() {
  const session = await requireSession();
  const [items, progress] = await Promise.all([
    listActiveEnrollments(session.user.id),
    enrollmentProgress(session.user.id),
  ]);

  return (
    <>
      <PageHeader
        title="My Learning"
        description="Courses you've started. Pick up where you left off."
      />

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center">
          <p className="font-medium text-ink">You haven&apos;t started a course yet.</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
            Enroll from the Learn tab and your courses will show up here.
          </p>
        </div>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((e) => {
            const p = progress.get(e.id);
            const pct = p && p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0;
            const cover =
              e.courseCoverImageUrl ??
              `https://picsum.photos/seed/${e.courseSlug}/800/500?grayscale`;

            return (
              <li
                key={e.id}
                className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-shadow hover:shadow-xl hover:shadow-neutral-200/70"
              >
                <Link
                  href={`/dashboard/learn/${e.courseSlug}`}
                  className="absolute inset-0 z-10"
                  aria-label={`Continue ${e.courseTitle}`}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover} alt="" className="h-36 w-full object-cover grayscale" />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold leading-snug text-ink underline-offset-4 group-hover:underline">
                      {e.courseTitle}
                    </h3>
                    <Badge variant="active">In progress</Badge>
                  </div>
                  {e.courseDescription && (
                    <p className="mt-2 line-clamp-2 text-sm text-neutral-600">
                      {e.courseDescription}
                    </p>
                  )}

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-neutral-500">
                      <span>
                        {p && p.total > 0
                          ? `${p.completed} of ${p.total} modules`
                          : "Not started"}
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
                      <div className="h-full rounded-full bg-ink" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
