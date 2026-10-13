import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { resources } from "@/lib/db/schema";
import { getStorageProvider, resourceFileKey } from "@/lib/storage";
import {
  MAX_RESOURCE_FILE_BYTES,
  RESOURCE_FILE_TYPE_LABEL,
  fileExtensionFor,
  sanitiseResourceFileName,
} from "@/lib/content/resource-files";
import {
  InvalidTransitionError,
  canTransition,
  reviewFieldsFor,
  type ContentStatus,
} from "@/lib/content/status";
import { uniqueSlug } from "@/lib/utils/slug";

// Vocabulary lives in a client-safe module — see the note there.
import type { ResourceType } from "@/lib/content/resource-types";
export { RESOURCE_TYPES, RESOURCE_TYPE_LABEL } from "@/lib/content/resource-types";
export type { ResourceType } from "@/lib/content/resource-types";

export interface ResourceInput {
  title: string;
  description?: string | null;
  body?: string | null;
  resourceType: ResourceType;
  subject?: string | null;
  gradeLevel?: string | null;
  /** Curriculum path, `class/subject/topic` — see 0010_resource_topic.sql. */
  topicPath?: string | null;
  tags?: string[];
  fileType?: string | null;
  aiGenerated?: boolean;
  aiModelVersion?: string | null;
  generationPrompt?: string | null;
}

export async function listAllResources() {
  return db
    .select({
      id: resources.id,
      title: resources.title,
      slug: resources.slug,
      resourceType: resources.resourceType,
      subject: resources.subject,
      gradeLevel: resources.gradeLevel,
      topicPath: resources.topicPath,
      status: resources.status,
      aiGenerated: resources.aiGenerated,
      fileType: resources.fileType,
      fileSizeBytes: resources.fileSizeBytes,
      // `fileUploadedAt` is the one honest signal that a real object exists — the
      // key column holds a placeholder path for text-only resources.
      hasFile: sql<boolean>`(${resources.fileUploadedAt} IS NOT NULL)`,
      updatedAt: resources.updatedAt,
    })
    .from(resources)
    .orderBy(desc(resources.updatedAt));
}

export async function getResource(id: string) {
  const [row] = await db.select().from(resources).where(eq(resources.id, id)).limit(1);
  return row ?? null;
}

export async function getResourceBySlug(slug: string) {
  const [row] = await db.select().from(resources).where(eq(resources.slug, slug)).limit(1);
  return row ?? null;
}

/**
 * Teacher-facing lookup by slug. Published only, and unlisted-but-published rows
 * are reachable on purpose — a resource with no `topicPath` is still real content,
 * it just is not browseable from a topic page.
 */
export async function getPublishedResourceBySlug(slug: string) {
  const [row] = await db
    .select()
    .from(resources)
    .where(and(eq(resources.slug, slug), eq(resources.status, "published")))
    .limit(1);
  return row ?? null;
}

async function resolveSlug(title: string, excludeId?: string) {
  return uniqueSlug(title, async (candidate) => {
    const rows = await db
      .select({ id: resources.id })
      .from(resources)
      .where(
        excludeId
          ? and(eq(resources.slug, candidate), ne(resources.id, excludeId))
          : eq(resources.slug, candidate)
      )
      .limit(1);
    return rows.length > 0;
  });
}

/** `fileStorageKey` is NOT NULL in the schema; drafted text resources get a virtual key. */
function storageKeyFor(slug: string, fileType: string | null | undefined) {
  return `${fileType === "pdf" ? "resources" : "resources/inline"}/${slug}`;
}

export async function createResource(input: ResourceInput, actorId: string) {
  const slug = await resolveSlug(input.title);
  const [created] = await db
    .insert(resources)
    .values({
      title: input.title,
      slug,
      description: input.description ?? null,
      body: input.body ?? null,
      resourceType: input.resourceType,
      subject: input.subject ?? null,
      gradeLevel: input.gradeLevel ?? null,
      topicPath: input.topicPath ?? null,
      tags: input.tags ?? [],
      fileStorageKey: storageKeyFor(slug, input.fileType),
      fileType: input.fileType ?? null,
      status: "draft",
      aiGenerated: input.aiGenerated ?? true,
      aiModelVersion: input.aiModelVersion ?? null,
      generationPrompt: input.generationPrompt ?? null,
      createdBy: actorId,
    })
    .returning({ id: resources.id });
  return created.id;
}

export async function updateResource(id: string, input: Partial<ResourceInput>) {
  const [existing] = await db
    .select({ slug: resources.slug })
    .from(resources)
    .where(eq(resources.id, id))
    .limit(1);
  if (!existing) return false;

  await db
    .update(resources)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.title !== undefined ? { slug: await resolveSlug(input.title, id) } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.resourceType !== undefined ? { resourceType: input.resourceType } : {}),
      ...(input.subject !== undefined ? { subject: input.subject } : {}),
      ...(input.gradeLevel !== undefined ? { gradeLevel: input.gradeLevel } : {}),
      ...(input.topicPath !== undefined ? { topicPath: input.topicPath } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(input.fileType !== undefined ? { fileType: input.fileType } : {}),
      updatedAt: new Date(),
    })
    .where(eq(resources.id, id));

  return true;
}

export async function setResourceStatus(id: string, to: ContentStatus, actorId: string) {
  const [row] = await db
    .select({ status: resources.status })
    .from(resources)
    .where(eq(resources.id, id))
    .limit(1);
  if (!row) return null;

  if (!canTransition(row.status, to)) throw new InvalidTransitionError(row.status, to);

  await db
    .update(resources)
    .set({ status: to, ...reviewFieldsFor(to, actorId), updatedAt: new Date() })
    .where(eq(resources.id, id));

  return { from: row.status, to };
}

export async function deleteResource(id: string) {
  await db.delete(resources).where(eq(resources.id, id));
}

export async function countResourcesByStatus() {
  return db
    .select({ status: resources.status, n: sql<number>`count(*)::int` })
    .from(resources)
    .groupBy(resources.status);
}

// ─── Files ────────────────────────────────────────────────

/**
 * A rejected upload. Carries the status the HTTP layer should answer with, so the
 * endpoint and the CLI report the same reason for the same file rather than each
 * inventing their own.
 */
export class ResourceFileError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "ResourceFileError";
  }
}

export interface AttachedFile {
  storageKey: string;
  fileType: string;
  sizeBytes: number;
  /** Which backend took it — worth reporting, since local is not durable. */
  backend: string;
  isRemote: boolean;
}

/**
 * Store a file for a resource and point the row at it.
 *
 * Every rule the upload has to satisfy is checked here rather than in the route,
 * so the CLI cannot store something the API would have refused.
 *
 * Order matters twice over. The object goes up **before** the row is updated: a
 * row naming an object that does not exist is a broken download, while an object
 * with no row is invisible and harmless. And the previous object is deleted only
 * **after** the new one is written and the row moved, so a failure at any point
 * leaves the resource readable rather than pointing at a deleted file.
 */
export async function attachResourceFile(
  resourceId: string,
  file: { name: string; contentType: string; body: Uint8Array }
): Promise<AttachedFile> {
  if (file.body.byteLength === 0) {
    throw new ResourceFileError("That file is empty.", 400);
  }
  if (file.body.byteLength > MAX_RESOURCE_FILE_BYTES) {
    throw new ResourceFileError(
      `Files must be ${Math.round(MAX_RESOURCE_FILE_BYTES / (1024 * 1024))} MB or smaller.`,
      413
    );
  }

  const extension = fileExtensionFor(file.contentType);
  if (!extension) {
    throw new ResourceFileError(
      `"${file.contentType}" is not an accepted file type. Upload a ${RESOURCE_FILE_TYPE_LABEL}.`,
      415
    );
  }

  const existing = await getResource(resourceId);
  if (!existing) throw new ResourceFileError("That resource no longer exists.", 404);

  const key = resourceFileKey(resourceId, sanitiseResourceFileName(file.name, extension));
  const storage = getStorageProvider();
  await storage.put(key, file.body, file.contentType);

  await db
    .update(resources)
    .set({
      fileStorageKey: key,
      fileType: extension,
      fileUploadedAt: new Date(),
      fileSizeBytes: file.body.byteLength,
      fileOriginalName: file.name.slice(0, 255),
      updatedAt: new Date(),
    })
    .where(eq(resources.id, resourceId));

  // Only ever a file this service uploaded: `fileUploadedAt` being set proves the
  // old key was a real object, and the prefix check keeps a stray value from
  // pointing the delete at a certificate.
  const previous = existing.fileStorageKey;
  if (
    existing.fileUploadedAt &&
    previous !== key &&
    previous.startsWith("resources/") &&
    !previous.includes("/inline/")
  ) {
    await storage.delete(previous).catch(() => {});
  }

  return {
    storageKey: key,
    fileType: extension,
    sizeBytes: file.body.byteLength,
    backend: storage.name,
    isRemote: storage.isRemote,
  };
}

/**
 * Remove a resource's file. Returns false when there was nothing real to remove.
 *
 * The row goes back to a virtual key rather than being left pointing at the object
 * that is about to be deleted — `file_storage_key` is NOT NULL, and a dangling key
 * is the exact state this whole feature exists to avoid.
 */
export async function detachResourceFile(resourceId: string): Promise<boolean> {
  const existing = await getResource(resourceId);
  if (!existing || !existing.fileUploadedAt) return false;

  const storage = getStorageProvider();
  await storage.delete(existing.fileStorageKey).catch(() => {});

  await db
    .update(resources)
    .set({
      fileStorageKey: storageKeyFor(existing.slug, null),
      fileType: null,
      fileUploadedAt: null,
      fileSizeBytes: null,
      fileOriginalName: null,
      updatedAt: new Date(),
    })
    .where(eq(resources.id, resourceId));

  return true;
}

/**
 * Teacher-facing: the published resources for one curriculum topic.
 *
 * Returns the file metadata along with the row because the listing needs to know
 * whether to offer a download — a card that promises a file and then 404s is worse
 * than one that never mentioned it.
 */
export async function listPublishedResourcesForTopic(topicPath: string) {
  return db
    .select({
      id: resources.id,
      title: resources.slug,
      slug: resources.slug,
      description: resources.description,
      resourceType: resources.resourceType,
      updatedAt: resources.updatedAt,
      fileType: resources.fileType,
      fileSizeBytes: resources.fileSizeBytes,
      hasFile: sql<boolean>`(${resources.fileUploadedAt} IS NOT NULL)`,
    })
    .from(resources)
    .where(and(eq(resources.status, "published"), eq(resources.topicPath, topicPath)))
    .orderBy(desc(resources.updatedAt));
}

/** Teacher-facing: only ever published resources. */
export async function listPublishedResources() {
  return db
    .select({
      id: resources.id,
      title: resources.title,
      slug: resources.slug,
      description: resources.description,
      resourceType: resources.resourceType,
      subject: resources.subject,
      gradeLevel: resources.gradeLevel,
    })
    .from(resources)
    .where(eq(resources.status, "published"))
    .orderBy(desc(resources.updatedAt));
}
