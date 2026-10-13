import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import {
  getLevelBySlug,
  getClassBySlug,
  getSubjectBySlug,
  getTopicsForSubject,
  getTopicBySlug,
} from "@/lib/content/curriculum";
import { RESOURCE_TYPE_LABEL, RESOURCE_TYPE_ICON, RESOURCE_TYPE_COLOR } from "@/lib/content/resource-types";
import { formatFileSize } from "@/lib/content/resource-files";
import { auth } from "@/lib/auth/config";
import { listPublishedResourcesForTopic } from "@/lib/services/resources.service";

// Reads the resource bank on every request: publishing a resource has to show up
// for teachers immediately, and there is no cache tag to invalidate from the
// admin write path.
export const dynamic = "force-dynamic";

export function generateMetadata({
  params,
}: {
  params: { level: string; classSlug: string; subject: string; topic: string };
}) {
  const cls = getClassBySlug(params.classSlug);
  const subj = getSubjectBySlug(params.classSlug, params.subject);
  const topic = getTopicBySlug(params.classSlug, params.subject, params.topic);
  if (!cls || !subj || !topic) return { title: "Not Found" };
  return {
    title: `${topic.label} — ${subj.label} ${cls.label} — Teacher Resource Bank`,
    description: topic.rationale ?? `Resources for ${topic.label} in ${subj.label} ${cls.label}.`,
  };
}

export default async function TopicDetailPage({
  params,
}: {
  params: { level: string; classSlug: string; subject: string; topic: string };
}) {
  const level = getLevelBySlug(params.level);
  const cls = getClassBySlug(params.classSlug);
  const subj = getSubjectBySlug(params.classSlug, params.subject);
  const topic = getTopicBySlug(params.classSlug, params.subject, params.topic);

  if (!level || !cls || !subj || !topic) notFound();

  const allTopics = getTopicsForSubject(cls.slug, subj.slug);
  const topicIndex = allTopics.findIndex((t) => t.slug === topic.slug);
  const prevTopic = topicIndex > 0 ? allTopics[topicIndex - 1] : null;
  const nextTopic = topicIndex < allTopics.length - 1 ? allTopics[topicIndex + 1] : null;

  const basePath = `/subjects/${level.slug}/${cls.slug}/${subj.slug}`;
  // Matches the `topicPath` an admin types (or the CLI stores) on the resource —
  // one string, so the two sides cannot disagree about what "this topic" means.
  const topicPath = `${basePath}/${topic.slug}`;

  const [resources, session] = await Promise.all([
    listPublishedResourcesForTopic(topicPath),
    auth(),
  ]);

  // Downloads are auth-gated (see the download route), so a guest is shown the
  // resource but not a button that would answer 401.
  const canDownload = Boolean(session?.user);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: level.label, href: `/subjects/${level.slug}/${cls.slug}` },
          { label: cls.label, href: `/subjects/${level.slug}/${cls.slug}` },
          { label: subj.label, href: basePath },
          { label: topic.label },
        ]}
      />

      {/* Topic header + counter + pager */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="text-sm font-medium text-mint-700">
            Topic {topicIndex + 1} of {allTopics.length}
          </span>
          <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">{topic.label}</h1>
          {topic.thread && (
            <span className="mt-1 inline-block rounded-full bg-warm-100 px-3 py-0.5 text-xs font-medium text-warm-600">
              {topic.thread}
            </span>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          {prevTopic ? (
            <Link
              href={`${basePath}/${prevTopic.slug}`}
              className="rounded-xl border border-warm-300 px-3 py-2 text-sm font-medium text-warm-600 hover:bg-warm-50 transition-colors"
            >
              ← Previous
            </Link>
          ) : (
            <span className="rounded-xl border border-warm-200 px-3 py-2 text-sm text-warm-300 cursor-not-allowed">
              ← Previous
            </span>
          )}
          {nextTopic ? (
            <Link
              href={`${basePath}/${nextTopic.slug}`}
              className="rounded-xl border border-warm-300 px-3 py-2 text-sm font-medium text-warm-600 hover:bg-warm-50 transition-colors"
            >
              Next →
            </Link>
          ) : (
            <span className="rounded-xl border border-warm-200 px-3 py-2 text-sm text-warm-300 cursor-not-allowed">
              Next →
            </span>
          )}
        </div>
      </div>

      {/* Info blocks */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {topic.rationale && (
          <div className="rounded-oak bg-white p-6 shadow-warm-sm">
            <h2 className="flex items-center gap-2 font-semibold text-ink">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-mint-100 text-sm">💡</span>
              Why this, why now
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-warm-600">
              {topic.rationale}
            </p>
          </div>
        )}

        {topic.priorKnowledge && topic.priorKnowledge.length > 0 && (
          <div className="rounded-oak bg-white p-6 shadow-warm-sm">
            <h2 className="flex items-center gap-2 font-semibold text-ink">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-subject-maths text-sm">📋</span>
              Prior knowledge
            </h2>
            <ul className="mt-3 space-y-2">
              {topic.priorKnowledge.map((pk) => (
                <li key={pk} className="flex items-start gap-2 text-sm text-warm-600">
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-mint-400 shrink-0" />
                  {pk}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Resource list — published rows from the resource bank, nothing else. */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-ink">Resources in this topic</h2>

        {resources.length === 0 ? (
          <div className="mt-4 rounded-oak border border-dashed border-warm-200 bg-white/60 p-10 text-center">
            <p className="font-medium text-ink">Nothing published for this topic yet.</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-warm-600">
              Your library updates on its own as resources are reviewed and published — nothing to
              install.
            </p>
            <Link
              href="/my-library"
              className="mt-5 inline-block rounded-xl border border-warm-300 px-4 py-2 text-sm font-medium text-warm-600 transition-colors hover:bg-warm-50"
            >
              Browse the whole library
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {resources.map((resource) => (
              <Link
                key={resource.id}
                href={`${basePath}/${topic.slug}/${resource.slug}`}
                className="group flex items-center gap-4 rounded-oak bg-white p-4 shadow-warm-sm transition-all hover:shadow-warm hover:-translate-y-0.5"
              >
                <span className="text-xl">{RESOURCE_TYPE_ICON[resource.resourceType]}</span>
                <div className="flex-1">
                  <h3 className="font-medium text-ink group-hover:text-mint-700 transition-colors">
                    {resource.title}
                  </h3>
                  {resource.description && (
                    <p className="mt-0.5 line-clamp-1 text-sm text-warm-500">{resource.description}</p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${RESOURCE_TYPE_COLOR[resource.resourceType]}`}>
                      {RESOURCE_TYPE_LABEL[resource.resourceType]}
                    </span>
                    {resource.hasFile && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-mint-100 px-2 py-0.5 text-[11px] font-medium text-mint-700">
                        {canDownload ? "Downloadable" : "Sign in to download"}
                        {resource.fileType && ` · ${resource.fileType.toUpperCase()}`}
                        {resource.fileSizeBytes
                          ? ` · ${formatFileSize(resource.fileSizeBytes)}`
                          : ""}
                      </span>
                    )}
                    <Badge variant="published">Published</Badge>
                  </div>
                </div>
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-warm-400 group-hover:text-mint-500" fill="none">
                  <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
