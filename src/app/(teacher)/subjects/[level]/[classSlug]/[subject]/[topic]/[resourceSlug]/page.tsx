import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import {
  getLevelBySlug,
  getClassBySlug,
  getSubjectBySlug,
  getTopicBySlug,
} from "@/lib/content/curriculum";
import { RESOURCE_TYPE_LABEL } from "@/lib/content/resource-types";
import { formatFileSize } from "@/lib/content/resource-files";
import { auth } from "@/lib/auth/config";
import { getPublishedResourceBySlug } from "@/lib/services/resources.service";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { level: string; classSlug: string; subject: string; topic: string; resourceSlug: string };
}) {
  const topic = getTopicBySlug(params.classSlug, params.subject, params.topic);
  const resource = await getPublishedResourceBySlug(params.resourceSlug);
  if (!topic) return { title: "Not Found" };
  return {
    title: `${resource?.title ?? params.resourceSlug.replace(/-/g, " ")} — ${topic.label} — Teacher Resource Bank`,
    description: resource?.description ?? undefined,
  };
}

export default async function ResourceDetailPage({
  params,
}: {
  params: { level: string; classSlug: string; subject: string; topic: string; resourceSlug: string };
}) {
  const level = getLevelBySlug(params.level);
  const cls = getClassBySlug(params.classSlug);
  const subj = getSubjectBySlug(params.classSlug, params.subject);
  const topic = getTopicBySlug(params.classSlug, params.subject, params.topic);

  if (!level || !cls || !subj || !topic) notFound();

  const basePath = `/subjects/${level.slug}/${cls.slug}/${subj.slug}`;
  const topicPath = `${basePath}/${topic.slug}`;

  // Published only. A draft is not a broken link — it is content that has not been
  // through review, so it answers 404 exactly like a resource that never existed.
  const [resource, session] = await Promise.all([
    getPublishedResourceBySlug(params.resourceSlug),
    auth(),
  ]);
  if (!resource) notFound();

  const hasFile = resource.fileUploadedAt !== null;
  const canDownload = Boolean(session?.user);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: level.label, href: `/subjects/${level.slug}/${cls.slug}` },
          { label: cls.label, href: `/subjects/${level.slug}/${cls.slug}` },
          { label: subj.label, href: basePath },
          { label: topic.label, href: topicPath },
          { label: resource.title },
        ]}
      />

      <div className="mt-6">
        {/* Machine-generated content is still flagged on the teacher's side, even
            though it passed review — the badge is about provenance, not approval. */}
        {resource.aiGenerated && (
          <div className="mb-6 flex items-center gap-3 rounded-oak bg-amber-50 border border-amber-200 p-4">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Drafted with AI — reviewed before publishing
              </p>
              <p className="text-xs text-amber-700">
                A human editor approved this, but check anything you plan to hand to a class.
              </p>
            </div>
          </div>
        )}

        {/* Resource header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink sm:text-3xl">{resource.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="published">Published</Badge>
              <span className="text-sm text-warm-500">
                {subj.label} · {cls.label} · {topic.label}
              </span>
              <span className="text-sm text-warm-500">
                {RESOURCE_TYPE_LABEL[resource.resourceType]}
              </span>
            </div>
          </div>

          {hasFile && canDownload && (
            <a
              href={`/api/resources/${resource.id}/download`}
              className="shrink-0 rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
            >
              Download {resource.fileType?.toUpperCase()}
              {resource.fileSizeBytes ? ` (${formatFileSize(resource.fileSizeBytes)})` : ""}
            </a>
          )}
          {hasFile && !canDownload && (
            <Link
              href={`/sign-in?next=${encodeURIComponent(topicPath)}`}
              className="shrink-0 rounded-xl border border-warm-300 px-3 py-2 text-sm font-medium text-warm-600 transition-colors hover:bg-warm-50"
            >
              Sign in to download
            </Link>
          )}
        </div>

        {resource.description && (
          <p className="mt-4 text-warm-600">{resource.description}</p>
        )}

        {/* Resource content — the same markdown a reviewer approved. */}
        <div className="mt-8 rounded-oak bg-white p-8 shadow-warm-sm">
          <div className="prose prose-warm max-w-none">
            {resource.body ? (
              <ReactMarkdown>{resource.body}</ReactMarkdown>
            ) : (
              <p className="text-warm-500">
                This resource is the attached file — open it with the download button above.
              </p>
            )}
          </div>
        </div>

        {/* Prev/Next resource pager */}
        <div className="mt-8 flex items-center justify-between">
          <Link
            href={topicPath}
            className="rounded-xl border border-warm-300 px-4 py-2 text-sm font-medium text-warm-600 hover:bg-warm-50 transition-colors"
          >
            ← Back to topic
          </Link>
        </div>
      </div>
    </div>
  );
}
