import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";

/** How many prior messages to replay into the model's context. */
const HISTORY_LIMIT = 20;

export async function createSession(userId: string, title?: string) {
  const result = await db.execute(sql`
    INSERT INTO chat_sessions (user_id, title)
    VALUES (${userId}, ${title ?? "New chat"})
    RETURNING id
  `);
  return (result.rows[0] as { id: string }).id;
}

export async function saveMessage(
  sessionId: string,
  role: "user" | "assistant" | "system",
  content: string,
  meta?: {
    sourceTypeUsed?: "resource" | "help" | null;
    retrievedChunkIds?: string[] | null;
  }
) {
  const chunkIds = meta?.retrievedChunkIds?.length ? meta.retrievedChunkIds : null;

  await db.execute(sql`
    INSERT INTO chat_messages
      (session_id, role, content, source_type_used, retrieved_chunk_ids)
    VALUES (
      ${sessionId},
      ${role},
      ${content},
      ${meta?.sourceTypeUsed ?? null}::embedding_source_type,
      ${chunkIds ? sql`ARRAY[${sql.join(chunkIds.map((id) => sql`${id}::uuid`), sql`, `)}]` : sql`NULL`}
    )
  `);
}

/**
 * Most recent messages in chronological order.
 *
 * Reads the newest N and then reverses, rather than taking the oldest N — a long
 * conversation should keep its recent turns, not the opening small talk.
 */
export async function getSessionMessages(sessionId: string) {
  const result = await db.execute(sql`
    SELECT role, content FROM (
      SELECT role, content, created_at
      FROM chat_messages
      WHERE session_id = ${sessionId}
      ORDER BY created_at DESC
      LIMIT ${HISTORY_LIMIT}
    ) recent
    ORDER BY created_at ASC
  `);
  return result.rows as { role: "user" | "assistant" | "system"; content: string }[];
}
