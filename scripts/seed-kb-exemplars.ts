import "dotenv/config";
import { getAIProvider } from "../src/lib/ai";
import { embeddingModelName, EMBEDDING_DIMENSION, assertEmbeddingDimension } from "../src/lib/ai/embedding";
import { replaceExemplars, listExemplars } from "../src/lib/services/kb-router.service";
import { pool } from "../src/lib/db/client";

/**
 * Seed the KB router's exemplar questions.
 *
 *   npx tsx scripts/seed-kb-exemplars.ts
 *
 * The router compares an incoming question against these by cosine similarity and
 * picks the closest KB. More (and more varied) examples make routing more
 * accurate; a misroute only costs a worse answer, never data.
 *
 * Requires embeddings to be available:
 *   ollama serve --embeddings
 *   ollama pull mxbai-embed-large
 */

const EXEMPLARS: { sourceType: "resource" | "help"; question: string }[] = [
  // --- Teaching content (the resource bank) ---
  { sourceType: "resource", question: "Show me a lesson plan on fractions" },
  { sourceType: "resource", question: "I need a worksheet for primary 3 addition" },
  { sourceType: "resource", question: "Do you have a scheme of work for JSS 2 mathematics?" },
  { sourceType: "resource", question: "Find me a lesson note template" },
  { sourceType: "resource", question: "What teaching resources cover photosynthesis?" },
  { sourceType: "resource", question: "Give me classroom activities for teaching phonics" },
  { sourceType: "resource", question: "Is there a lesson plan for civic education?" },
  { sourceType: "resource", question: "I want ideas for a practical science lesson with no lab" },
  { sourceType: "resource", question: "What resources exist for teaching English comprehension?" },
  { sourceType: "resource", question: "Help me plan a lesson on the Nigerian civil war" },
  { sourceType: "resource", question: "Are there worksheets on long division?" },
  { sourceType: "resource", question: "Which courses can I take on classroom management?" },

  // --- Platform help (how this product works) ---
  { sourceType: "help", question: "How much does the subscription cost?" },
  { sourceType: "help", question: "How do I pay for my term pass?" },
  { sourceType: "help", question: "Where do I download my certificate?" },
  { sourceType: "help", question: "I forgot my password, how do I reset it?" },
  { sourceType: "help", question: "How do I change the class levels on my account?" },
  { sourceType: "help", question: "Why can't I access the courses?" },
  { sourceType: "help", question: "My subscription expired, what happens now?" },
  { sourceType: "help", question: "How does the AI assistant work?" },
  { sourceType: "help", question: "How do I update my subjects?" },
  { sourceType: "help", question: "Can I get a refund for this term?" },
  { sourceType: "help", question: "How do I sign in with Google?" },
  { sourceType: "help", question: "Who reviews the content on this platform?" },
];

async function main() {
  const model = embeddingModelName();
  if (!model) {
    console.error(
      "QWEN_EMBEDDING_MODEL is not set. Add it to .env, e.g.\n  QWEN_EMBEDDING_MODEL=mxbai-embed-large"
    );
    process.exit(1);
  }

  const provider = getAIProvider();
  console.log(`Embedding ${EXEMPLARS.length} exemplars with "${model}"…`);

  const rows = [];
  for (const [i, e] of EXEMPLARS.entries()) {
    const embedding = await provider.embed(e.question);
    assertEmbeddingDimension(embedding, model);
    rows.push({ sourceType: e.sourceType, exampleQuestion: e.question, embedding });
    process.stdout.write(`\r  ${i + 1}/${EXEMPLARS.length}`);
  }
  console.log();

  const written = await replaceExemplars(rows);
  console.log(`✓ Stored ${written} exemplars (${EMBEDDING_DIMENSION} dims each)`);

  const stored = await listExemplars();
  const byType = stored.reduce<Record<string, number>>((acc, e) => {
    acc[e.sourceType] = (acc[e.sourceType] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`  resource: ${byType.resource ?? 0}  |  help: ${byType.help ?? 0}`);
}

main()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error("\nFailed:", err instanceof Error ? err.message : err);
    console.error(
      "\nIf this is a connection error, check that Ollama is running with embeddings:\n" +
        "  ollama serve --embeddings\n" +
        "  ollama pull mxbai-embed-large"
    );
    await pool.end().catch(() => {});
    process.exit(1);
  });
