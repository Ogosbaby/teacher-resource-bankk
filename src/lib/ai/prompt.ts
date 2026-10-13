import type { ChatMessage } from "@/lib/ai/types";
import type { RetrievedChunk } from "@/lib/services/embeddings.service";

/**
 * Builds the assistant's system prompt.
 *
 * The prompt only claims access to platform content when retrieval actually
 * returned some. This matters: the earlier prompt hard-coded "you have no access
 * to the resource bank", which became a lie the moment retrieval was wired up,
 * and would also make the model refuse to use context it was given.
 */

export type RetrievalStatus =
  /** Chunks were found and injected. */
  | "grounded"
  /** Retrieval ran but the knowledge base has nothing relevant. */
  | "empty"
  /** Retrieval could not run at all (no embedding model, provider down). */
  | "unavailable";

export interface RetrievalOutcome {
  status: RetrievalStatus;
  chunks: RetrievedChunk[];
  /** Which KB the router picked, when it had exemplars to route with. */
  routedTo: "resource" | "help" | null;
}

const BASE =
  "You are a teaching assistant for Nigerian school teachers. " +
  "Be concise, practical, and specific — teachers want something they can use in class tomorrow. " +
  "Use plain language and avoid marketing tone. " +
  "Format answers with short paragraphs or bullet points, not long essays.";

function contextBlock(chunks: RetrievedChunk[]): string {
  return chunks
    .map((c, i) => `[${i + 1}] (source ${c.sourceType}, similarity ${c.similarity.toFixed(2)})\n${c.content}`)
    .join("\n\n---\n\n");
}

export function buildSystemPrompt(retrieval: RetrievalOutcome): ChatMessage {
  const parts = [BASE];

  if (retrieval.status === "grounded") {
    parts.push(
      `Here is relevant published content from this platform${
        retrieval.routedTo === "help" ? "'s help centre" : "'s resource bank"
      }. Prefer it over your own knowledge, and mention the content by name when you use it:\n\n` +
        contextBlock(retrieval.chunks)
    );
    parts.push(
      "If the question isn't covered by the content above, say so plainly, then answer from general " +
        "teaching practice and make clear that part isn't from the platform."
    );
  } else if (retrieval.status === "empty") {
    parts.push(
      "You searched this platform's content and found nothing relevant to this question. " +
        "Say that the platform doesn't have material on it yet, then answer from general teaching " +
        "practice. Do not invent platform content or claim a lesson plan exists."
    );
  } else {
    parts.push(
      "Platform content search is currently unavailable, so you cannot check this platform's resource " +
        "bank or help articles. Answer from general teaching practice, and mention that you couldn't " +
        "check platform content for this question."
    );
  }

  parts.push(
    "Never invent citations, statistics, curriculum references, or links. If you don't know, say so."
  );

  return { role: "system", content: parts.join("\n\n") };
}
