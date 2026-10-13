import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { kbArticles } from "@/lib/db/schema";
import { InvalidTransitionError, canTransition, type ContentStatus } from "@/lib/content/status";

export interface KbArticleInput {
  title: string;
  body: string;
  category?: string | null;
}

export async function listKbArticles() {
  return db
    .select({
      id: kbArticles.id,
      title: kbArticles.title,
      category: kbArticles.category,
      status: kbArticles.status,
      updatedAt: kbArticles.updatedAt,
    })
    .from(kbArticles)
    .orderBy(desc(kbArticles.updatedAt));
}

export async function getKbArticle(id: string) {
  const [row] = await db.select().from(kbArticles).where(eq(kbArticles.id, id)).limit(1);
  return row ?? null;
}

export async function createKbArticle(input: KbArticleInput, actorId: string) {
  const [created] = await db
    .insert(kbArticles)
    .values({
      title: input.title,
      body: input.body,
      category: input.category ?? null,
      status: "draft",
      createdBy: actorId,
    })
    .returning({ id: kbArticles.id });
  return created.id;
}

export async function updateKbArticle(id: string, input: Partial<KbArticleInput>) {
  const [existing] = await db
    .select({ id: kbArticles.id })
    .from(kbArticles)
    .where(eq(kbArticles.id, id))
    .limit(1);
  if (!existing) return false;

  await db
    .update(kbArticles)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      updatedAt: new Date(),
    })
    .where(eq(kbArticles.id, id));
  return true;
}

export async function setKbStatus(id: string, to: ContentStatus) {
  const [row] = await db
    .select({ status: kbArticles.status })
    .from(kbArticles)
    .where(eq(kbArticles.id, id))
    .limit(1);
  if (!row) return null;

  if (!canTransition(row.status, to)) throw new InvalidTransitionError(row.status, to);

  await db
    .update(kbArticles)
    .set({ status: to, updatedAt: new Date() })
    .where(eq(kbArticles.id, id));
  return { from: row.status, to };
}

export async function deleteKbArticle(id: string) {
  await db.delete(kbArticles).where(eq(kbArticles.id, id));
}

/**
 * Help-KB articles that are live. Phase D embeds these into content_embeddings
 * with sourceType 'help' — this is the source feed for that.
 */
export async function listPublishedKbArticles() {
  return db
    .select({ id: kbArticles.id, title: kbArticles.title, body: kbArticles.body })
    .from(kbArticles)
    .where(eq(kbArticles.status, "published"));
}
