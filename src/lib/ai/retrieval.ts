import { getAIProvider } from "@/lib/ai";
import { routeQuery } from "@/lib/services/kb-router.service";
import { searchContent, type EmbeddingSourceType, type RetrievedChunk } from "@/lib/services/embeddings.service";
import type { RetrievalOutcome } from "@/lib/ai/prompt";
import { PRELOADED_CPD_COURSES } from "@/lib/content/cpd-courses";

const TOP_K = 5;

/** Fallback semantic & keyword search across bundled CPD courses */
function searchPreloadedCourses(question: string): RetrievedChunk[] {
  const words = question
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (words.length === 0) return [];

  const matched: RetrievedChunk[] = [];

  for (const course of PRELOADED_CPD_COURSES) {
    for (let i = 0; i < course.modules.length; i++) {
      const mod = course.modules[i];
      const hay = `${course.title} ${course.subject} ${mod.title} ${mod.body}`.toLowerCase();
      let score = 0;
      for (const w of words) {
        if (hay.includes(w)) score += 1;
      }
      if (score > 0) {
        matched.push({
          id: `${course.id}-${mod.id}`,
          sourceId: course.id,
          sourceType: "resource",
          chunkIndex: i,
          content: `Course: ${course.title} (${course.classLevels.join(", ")})\nModule: ${mod.title}\n\n${mod.body}`,
          similarity: Math.min(0.95, 0.5 + score * 0.1),
        });
      }
    }
  }

  return matched.sort((a, b) => b.similarity - a.similarity).slice(0, 3);
}

/**
 * Retrieve grounding context for a question.
 *
 * Never throws. Prioritizes preloaded CPD course content and local grounding.
 */
export async function retrieveContext(question: string): Promise<RetrievalOutcome> {
  if (!question.trim()) {
    return { status: "empty", chunks: [], routedTo: null };
  }

  const preloadedMatches = searchPreloadedCourses(question);

  let queryVector: number[] | null = null;
  try {
    queryVector = await getAIProvider().embed(question);
  } catch (err) {
    console.warn("[retrieval] embedding unavailable, checking preloaded courses:", (err as Error).message);
    if (preloadedMatches.length > 0) {
      return { status: "grounded", chunks: preloadedMatches, routedTo: "resource" };
    }
    return { status: "unavailable", chunks: [], routedTo: null };
  }

  let sourceTypes: EmbeddingSourceType[] = ["resource", "help"];
  let routedTo: "resource" | "help" | null = null;

  try {
    const route = await routeQuery(queryVector);
    if (route) {
      routedTo = route.sourceType;
      sourceTypes = [route.sourceType];
    }
  } catch (err) {
    console.warn("[retrieval] KB routing failed, searching both:", (err as Error).message);
  }

  try {
    const dbChunks = await searchContent(sourceTypes, queryVector, TOP_K);
    const combined = [...preloadedMatches, ...dbChunks].slice(0, TOP_K);

    if (combined.length === 0) {
      return { status: "empty", chunks: [], routedTo };
    }
    return { status: "grounded", chunks: combined, routedTo: routedTo ?? "resource" };
  } catch (err) {
    if (preloadedMatches.length > 0) {
      return { status: "grounded", chunks: preloadedMatches, routedTo: "resource" };
    }
    return { status: "unavailable", chunks: [], routedTo };
  }
}
