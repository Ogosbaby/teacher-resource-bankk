import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { toVectorLiteral } from "@/lib/ai/embedding";
import type { EmbeddingSourceType } from "@/lib/services/embeddings.service";

/**
 * Routes an incoming question to one of the two knowledge bases.
 *
 * Deliberately a cheap exemplar-similarity comparison against pre-embedded
 * example questions (kb_route_exemplars) rather than an LLM classification call:
 * it costs one vector comparison instead of a full generation round-trip, and it
 * stays predictable as the model changes.
 */

export interface RouteResult {
  sourceType: EmbeddingSourceType;
  similarity: number;
  /** Which exemplar won, useful for debugging a misroute. */
  matchedQuestion: string;
}

export interface ExemplarInput {
  sourceType: EmbeddingSourceType;
  exampleQuestion: string;
  embedding: number[];
}

/** Nearest exemplar wins. Returns null when no exemplars have been seeded. */
export async function routeQuery(queryVector: number[]): Promise<RouteResult | null> {
  const literal = toVectorLiteral(queryVector);

  const result = await db.execute(sql`
    SELECT
      source_type,
      example_question,
      1 - (embedding <=> ${literal}::vector) AS similarity
    FROM kb_route_exemplars
    ORDER BY embedding <=> ${literal}::vector
    LIMIT 1
  `);

  const row = (result.rows as Record<string, unknown>[])[0];
  if (!row) return null;

  return {
    sourceType: row.source_type as EmbeddingSourceType,
    similarity: Number(row.similarity),
    matchedQuestion: String(row.example_question),
  };
}

export async function replaceExemplars(rows: ExemplarInput[]): Promise<number> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`DELETE FROM kb_route_exemplars`);
    for (const row of rows) {
      const literal = toVectorLiteral(row.embedding);
      await tx.execute(sql`
        INSERT INTO kb_route_exemplars (source_type, example_question, embedding)
        VALUES (${row.sourceType}::embedding_source_type, ${row.exampleQuestion}, ${literal}::vector)
      `);
    }
  });
  return rows.length;
}

export async function listExemplars(): Promise<
  { sourceType: EmbeddingSourceType; exampleQuestion: string }[]
> {
  const result = await db.execute(sql`
    SELECT source_type, example_question
    FROM kb_route_exemplars
    ORDER BY source_type, created_at
  `);
  return (result.rows as Record<string, unknown>[]).map((r) => ({
    sourceType: r.source_type as EmbeddingSourceType,
    exampleQuestion: String(r.example_question),
  }));
}

export async function countExemplars(): Promise<number> {
  const result = await db.execute(sql`SELECT count(*)::int AS n FROM kb_route_exemplars`);
  return Number((result.rows as { n: number }[])[0]?.n ?? 0);
}
