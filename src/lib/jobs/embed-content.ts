import { eq } from "drizzle-orm";
import type PgBoss from "pg-boss";
import { db } from "@/lib/db/client";
import {
  courses,
  kbArticles,
  learningPathCourses,
  learningPaths,
  modules,
  resources,
} from "@/lib/db/schema";
import { getAIProvider } from "@/lib/ai";
import { chunkText } from "@/lib/ai/chunk";
import { estimateTokens } from "@/lib/ai/embedding";
import { QUEUES, enqueue } from "@/lib/jobs/queue";
import {
  deleteEmbeddings,
  replaceEmbeddings,
  type EmbeddingSourceType,
} from "@/lib/services/embeddings.service";

/**
 * Which table a piece of embeddable content lives in.
 *
 * The `embedding_source_type` enum only distinguishes the teaching resource bank
 * ('resource') from the platform help KB ('help'), so courses, resources and
 * learning paths all store as 'resource' while the entity kind is recorded in
 * the chunk metadata.
 */
export type EmbedEntity = "course" | "resource" | "path" | "kb_article";

export interface EmbedContentJob {
  entity: EmbedEntity;
  id: string;
}

export function sourceTypeFor(entity: EmbedEntity): EmbeddingSourceType {
  return entity === "kb_article" ? "help" : "resource";
}

interface SourceText {
  title: string;
  body: string;
  metadata: Record<string, unknown>;
}

/** Load and flatten the searchable text for a piece of content. */
async function loadSourceText(entity: EmbedEntity, id: string): Promise<SourceText | null> {
  if (entity === "course") {
    const [course] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
    if (!course) return null;

    const courseModules = await db
      .select()
      .from(modules)
      .where(eq(modules.courseId, id))
      .orderBy(modules.sequenceOrder);

    const body = [
      course.description ?? "",
      ...courseModules.map((m, i) => `## ${i + 1}. ${m.title}\n${m.body ?? ""}`),
    ]
      .filter((s) => s.trim())
      .join("\n\n");

    return {
      title: course.title,
      body,
      metadata: { entity, subject: course.subject, classLevels: course.classLevels },
    };
  }

  if (entity === "resource") {
    const [resource] = await db.select().from(resources).where(eq(resources.id, id)).limit(1);
    if (!resource) return null;
    return {
      title: resource.title,
      body: [resource.description ?? "", resource.body ?? ""].filter((s) => s.trim()).join("\n\n"),
      metadata: {
        entity,
        resourceType: resource.resourceType,
        subject: resource.subject,
        gradeLevel: resource.gradeLevel,
      },
    };
  }

  if (entity === "path") {
    const [path] = await db.select().from(learningPaths).where(eq(learningPaths.id, id)).limit(1);
    if (!path) return null;

    const linked = await db
      .select({ title: courses.title })
      .from(learningPathCourses)
      .innerJoin(courses, eq(learningPathCourses.courseId, courses.id))
      .where(eq(learningPathCourses.pathId, id))
      .orderBy(learningPathCourses.sequenceOrder);

    return {
      title: path.title,
      body: [path.description ?? "", ...linked.map((c) => `- ${c.title}`)]
        .filter((s) => s.trim())
        .join("\n\n"),
      metadata: { entity },
    };
  }

  const [article] = await db.select().from(kbArticles).where(eq(kbArticles.id, id)).limit(1);
  if (!article) return null;
  return {
    title: article.title,
    body: article.body,
    metadata: { entity, category: article.category },
  };
}

/**
 * Chunk and embed one piece of content. Replaces any existing chunks for it, so
 * this is safe to re-run after an edit.
 */
export async function handleEmbedContent(job: PgBoss.Job<EmbedContentJob>): Promise<void> {
  const { entity, id } = job.data;
  const sourceType = sourceTypeFor(entity);

  const source = await loadSourceText(entity, id);
  if (!source) {
    console.warn(`[embed] ${entity} ${id} no longer exists — clearing its chunks`);
    await deleteEmbeddings(sourceType, id);
    return;
  }

  const text = `${source.title}\n\n${source.body}`.trim();
  const chunks = chunkText(text);

  if (chunks.length === 0) {
    await deleteEmbeddings(sourceType, id);
    return;
  }

  const provider = getAIProvider();
  const rows = [];
  for (const chunk of chunks) {
    rows.push({
      chunkIndex: chunk.index,
      content: chunk.content,
      embedding: await provider.embed(chunk.content),
      tokenCount: estimateTokens(chunk.content),
      metadata: { ...source.metadata, title: source.title },
    });
  }

  const written = await replaceEmbeddings(sourceType, id, rows);
  console.log(`[embed] ${entity} ${id}: ${written} chunk(s) indexed`);
}

/**
 * Keep the index in step with a status change. Published content gets embedded;
 * anything moving out of published has its chunks removed so stale material stops
 * being retrievable.
 */
export async function syncEmbeddingsForStatus(
  entity: EmbedEntity,
  id: string,
  status: string
): Promise<void> {
  const sourceType = sourceTypeFor(entity);

  if (status === "published") {
    await enqueue<EmbedContentJob>(QUEUES.embedContent, { entity, id });
    return;
  }

  try {
    await deleteEmbeddings(sourceType, id);
  } catch (err) {
    console.error(`[embed] failed to clear chunks for ${entity} ${id}:`, err);
  }
}
