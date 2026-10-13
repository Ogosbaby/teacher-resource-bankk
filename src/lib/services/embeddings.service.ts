import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { toVectorLiteral } from "@/lib/ai/embedding";

/**
 * Storage and similarity search for content_embeddings.
 *
 * Raw SQL rather than the Drizzle query builder, for two reasons: pgvector needs
 * `::vector` casts on string literals, and the search has to use the `<=>`
 * cosine-distance operator with an ORDER BY that matches the HNSW index.
 */

export type EmbeddingSourceType = "resource" | "help";

export interface EmbeddingRow {
  chunkIndex: number;
  content: string;
  embedding: number[];
  tokenCount?: number | null;
  metadata?: Record<string, unknown>;
}

export interface RetrievedChunk {
  id: string;
  sourceId: string;
  sourceType: EmbeddingSourceType;
  chunkIndex: number;
  content: string;
  similarity: number;
}

/** Replace all chunks for one source in a single transaction. */
export async function replaceEmbeddings(
  sourceType: EmbeddingSourceType,
  sourceId: string,
  rows: EmbeddingRow[]
): Promise<number> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`
      DELETE FROM content_embeddings
      WHERE source_type = ${sourceType}::embedding_source_type
        AND source_id = ${sourceId}::uuid
    `);

    for (const row of rows) {
      const literal = toVectorLiteral(row.embedding);
      await tx.execute(sql`
        INSERT INTO content_embeddings
          (source_type, source_id, chunk_index, content, embedding, token_count, metadata)
        VALUES (
          ${sourceType}::embedding_source_type,
          ${sourceId}::uuid,
          ${row.chunkIndex},
          ${row.content},
          ${literal}::vector,
          ${row.tokenCount ?? null},
          ${JSON.stringify(row.metadata ?? {})}::jsonb
        )
      `);
    }
  });

  return rows.length;
}

export async function deleteEmbeddings(
  sourceType: EmbeddingSourceType,
  sourceId: string
): Promise<void> {
  await db.execute(sql`
    DELETE FROM content_embeddings
    WHERE source_type = ${sourceType}::embedding_source_type
      AND source_id = ${sourceId}::uuid
  `);
}

/**
 * Top-k cosine similarity search.
 *
 * Accepts several source types so the KB router can fall back to searching both
 * knowledge bases when it has no exemplars to route with.
 */
export async function searchContent(
  sourceTypes: EmbeddingSourceType[],
  queryVector: number[],
  topK = 5
): Promise<RetrievedChunk[]> {
  if (sourceTypes.length === 0) return [];

  const literal = toVectorLiteral(queryVector);
  const typeList = sql.join(
    sourceTypes.map((t) => sql`${t}::embedding_source_type`),
    sql`, `
  );

  const result = await db.execute(sql`
    SELECT
      id,
      source_id,
      source_type,
      chunk_index,
      content,
      1 - (embedding <=> ${literal}::vector) AS similarity
    FROM content_embeddings
    WHERE source_type IN (${typeList})
    ORDER BY embedding <=> ${literal}::vector
    LIMIT ${topK}
  `);

  return (result.rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    sourceId: String(r.source_id),
    sourceType: r.source_type as EmbeddingSourceType,
    chunkIndex: Number(r.chunk_index),
    content: String(r.content),
    similarity: Number(r.similarity),
  }));
}

export async function countEmbeddings(): Promise<Record<EmbeddingSourceType, number>> {
  const result = await db.execute(sql`
    SELECT source_type, count(*)::int AS n
    FROM content_embeddings
    GROUP BY source_type
  `);

  const counts: Record<EmbeddingSourceType, number> = { resource: 0, help: 0 };
  for (const row of result.rows as { source_type: EmbeddingSourceType; n: number }[]) {
    counts[row.source_type] = Number(row.n);
  }
  return counts;
}
