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
  "You are TRB AI, an expert, supportive pedagogical assistant for Nigerian school teachers (Early Years, Primary, JSS, and SSS). " +
  "Maintain conversation continuity: always track the previous questions and answers in this dialogue. " +
  "When the teacher refers to 'it', 'this', 'that', or asks follow-up questions (e.g. 'How does it support me as a teacher?'), " +
  "connect your answer directly to what was just discussed previously. Never say 'It is unclear which tool you are referring to' if it was mentioned in the conversation. " +
  "Be concise, warm, highly practical, and specific to the Nigerian classroom context (NERDC curriculum, large class management, low-cost local teaching aids). " +
  "Format answers with clear bullet points, actionable steps, and concise paragraphs.";

function contextBlock(chunks: RetrievedChunk[]): string {
  return chunks
    .map((c, i) => `[${i + 1}] (source ${c.sourceType}, similarity ${c.similarity.toFixed(2)})\n${c.content}`)
    .join("\n\n---\n\n");
}

export function buildSystemPrompt(retrieval: RetrievalOutcome): ChatMessage {
  const parts = [BASE];

  if (retrieval.status === "grounded") {
    parts.push(
      `Here is relevant reference material from the Teacher Resource Bank:\n\n` +
        contextBlock(retrieval.chunks) +
        `\n\nIncorporate this reference material naturally into your response where helpful.`
    );
  }

  parts.push(
    "Always provide realistic, actionable advice that Nigerian educators can apply in their classrooms right away. " +
    "Never invent fake citations or URL links."
  );

  return { role: "system", content: parts.join("\n\n") };
}
