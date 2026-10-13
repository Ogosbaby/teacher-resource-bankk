/**
 * Embedding configuration — the single source of truth for vector width.
 *
 * `EMBEDDING_DIMENSION` MUST match the pgvector column definitions in
 * src/lib/db/migrations/0001_init.sql (`content_embeddings.embedding` and
 * `kb_route_exemplars.embedding`). pgvector enforces width per column, so a
 * mismatch fails at write time rather than silently degrading.
 *
 * 1024 is the width of `mxbai-embed-large`, which is the configured embedding
 * model. Changing the model to one with a different width requires a migration
 * that drops and recreates those columns plus their HNSW indexes, then
 * re-embedding every chunk.
 */
export const EMBEDDING_DIMENSION = 1024;

/** The model name to request from the provider, e.g. "mxbai-embed-large". */
export function embeddingModelName(): string {
  return process.env.QWEN_EMBEDDING_MODEL?.trim() ?? "";
}

export class EmbeddingModelNotConfiguredError extends Error {
  constructor() {
    super(
      "No embedding model is configured. Set QWEN_EMBEDDING_MODEL (e.g. mxbai-embed-large) " +
        "and pull it with `ollama pull mxbai-embed-large`."
    );
    this.name = "EmbeddingModelNotConfiguredError";
  }
}

export class EmbeddingDimensionError extends Error {
  constructor(
    readonly actual: number,
    readonly expected: number,
    readonly model: string
  ) {
    super(
      `Embedding model "${model}" returned ${actual} dimensions but the database columns are ` +
        `VECTOR(${expected}). Update EMBEDDING_DIMENSION and add a migration, or pick a model ` +
        `with ${expected} dimensions.`
    );
    this.name = "EmbeddingDimensionError";
  }
}

/** Guard every vector before it is written to (or compared against) pgvector. */
export function assertEmbeddingDimension(vector: number[], model: string): void {
  if (vector.length !== EMBEDDING_DIMENSION) {
    throw new EmbeddingDimensionError(vector.length, EMBEDDING_DIMENSION, model);
  }
}

/** pgvector accepts vectors as `[1,2,3]` string literals. */
export function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

/** Rough token estimate for reporting only — no tokenizer dependency. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
