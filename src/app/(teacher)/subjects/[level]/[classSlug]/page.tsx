import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { SubjectIcon } from "@/components/ui/subject-icon";
import { TrustBadges } from "@/components/ui/trust-badge";
import {
  getLevelBySlug,
  getClassBySlug,
  getSubjectsForClass,
  getLevelForClass,
} from "@/lib/content/curriculum";

export function generateMetadata({ params }: { params: { level: string; classSlug: string } }) {
  const cls = getClassBySlug(params.classSlug);
  const level = getLevelBySlug(params.level);
  if (!cls || !level) return { title: "Not Found" };
  return {
    title: `${cls.label} Subjects — Teacher Resource Bank`,
    description: `Browse curriculum-aligned resources for ${cls.label} across all subjects.`,
  };
}

export default function SubjectLandingPage({
  params,
}: {
  params: { level: string; classSlug: string };
}) {
  const level = getLevelBySlug(params.level);
  const cls = getClassBySlug(params.classSlug);

  if (!level || !cls) notFound();

  const subjects = getSubjectsForClass(cls.slug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: level.label, href: `/subjects/${level.slug}/${cls.slug}` },
          { label: cls.label },
        ]}
      />

      {/* Hero */}
      <div className="mt-8 rounded-oak-xl bg-white p-8 shadow-warm-sm sm:p-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-ink">
              {cls.label}
            </h1>
            <p className="mt-2 max-w-lg text-warm-600">
              Browse all subjects available for {cls.label}. Each subject contains
              term-organised topics with lesson notes, schemes of work, and question banks.
            </p>
            <TrustBadges variant="compact" className="mt-4" />
          </div>
          <div className="flex h-20 w-20 items-center justify-center rounded-oak-xl bg-mint-100 text-4xl shrink-0">
            📚
          </div>
        </div>
      </div>

      {/* Subject grid */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {subjects.map((subj) => (
          <Link
            key={subj.slug}
            href={`/subjects/${level.slug}/${cls.slug}/${subj.slug}`}
            className="group oak-card flex items-center gap-4 p-5"
          >
            <SubjectIcon icon={subj.icon} colorClass={subj.color} size="md" />
            <div>
              <h2 className="font-semibold text-ink group-hover:text-mint-700 transition-colors">
                {subj.label}
              </h2>
              <p className="mt-0.5 text-xs text-warm-500">
                View topics →
              </p>
            </div>
          </Link>
        ))}
      </div>

      {subjects.length === 0 && (
        <div className="mt-8 rounded-oak bg-white p-12 text-center shadow-warm-sm">
          <p className="font-medium text-ink">No subjects available yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-warm-500">
            We&apos;re still building content for this class. Check back soon — we add new
            subjects regularly.
          </p>
        </div>
      )}
    </div>
  );
}
