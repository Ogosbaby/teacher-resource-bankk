/**
 * Text chunking for retrieval.
 *
 * Pure and dependency-free so it can be reasoned about and tested on its own.
 * Splits on paragraph boundaries first (the natural unit in teaching content),
 * falls back to sentence boundaries for oversized paragraphs, and only then
 * hard-splits. Each chunk carries a small overlap from the end of the previous
 * one so a sentence spanning a boundary stays retrievable.
 */

export interface Chunk {
  index: number;
  content: string;
}

export interface ChunkOptions {
  /** Target maximum characters per chunk. ~1000 chars is roughly 250 tokens. */
  maxChars?: number;
  /** Characters of the previous chunk repeated at the start of the next. */
  overlapChars?: number;
}

const DEFAULTS = { maxChars: 1000, overlapChars: 150 };

/** Split a block into sentences, keeping terminal punctuation. */
function splitSentences(block: string): string[] {
  const matches = block.match(/[^.!?\n]+[.!?]*\s*/g);
  const sentences = (matches ?? [block]).map((s) => s.trim()).filter(Boolean);
  return sentences.length ? sentences : [block];
}

/** Hard-split anything longer than maxChars (a wall of text with no punctuation). */
function hardSplit(text: string, maxChars: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += maxChars) {
    out.push(text.slice(i, i + maxChars));
  }
  return out;
}

export function chunkText(text: string, options: ChunkOptions = {}): Chunk[] {
  const maxChars = options.maxChars ?? DEFAULTS.maxChars;
  const overlapChars = options.overlapChars ?? DEFAULTS.overlapChars;

  if (maxChars <= 0) throw new Error("chunkText: maxChars must be positive");
  if (overlapChars < 0 || overlapChars >= maxChars) {
    throw new Error("chunkText: overlapChars must be >= 0 and < maxChars");
  }

  const normalized = text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalized) return [];

  const blocks = normalized.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);

  // Pass 1: expand into pieces that each fit within maxChars.
  const pieces: string[] = [];
  for (const block of blocks) {
    if (block.length <= maxChars) {
      pieces.push(block);
      continue;
    }

    let current = "";
    for (const rawSentence of splitSentences(block)) {
      const sentences =
        rawSentence.length > maxChars ? hardSplit(rawSentence, maxChars) : [rawSentence];

      for (const sentence of sentences) {
        const candidate = current ? `${current} ${sentence}` : sentence;
        if (candidate.length > maxChars && current) {
          pieces.push(current);
          current = sentence;
        } else {
          current = candidate;
        }
      }
    }
    if (current) pieces.push(current);
  }

  // Pass 2: attach overlap from the previous *piece* (not the previous chunk,
  // so overlaps never compound).
  return pieces.map((body, i) => {
    const previous = i > 0 ? pieces[i - 1] : "";
    const overlap = previous ? previous.slice(-overlapChars).trim() : "";
    return {
      index: i,
      content: overlap ? `${overlap}\n${body}` : body,
    };
  });
}
