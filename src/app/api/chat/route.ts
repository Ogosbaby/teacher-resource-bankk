import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { getAIProvider } from "@/lib/ai";
import { buildSystemPrompt } from "@/lib/ai/prompt";
import { retrieveContext } from "@/lib/ai/retrieval";
import {
  createSession,
  saveMessage,
  getSessionMessages,
} from "@/lib/services/chat.service";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { message, sessionId } = (await req.json()) as {
    message: string;
    sessionId?: string;
  };

  if (!message || typeof message !== "string") {
    return new Response("Missing message", { status: 400 });
  }

  const chatSessionId = sessionId ?? (await createSession(session.user.id));
  await saveMessage(chatSessionId, "user", message);

  // Retrieve grounding context before building the prompt. This never throws —
  // on any failure it reports a status the prompt describes honestly.
  const retrieval = await retrieveContext(message);
  const systemPrompt = buildSystemPrompt(retrieval);

  const history = await getSessionMessages(chatSessionId);

  const ai = getAIProvider();
  const stream = ai.streamChat([systemPrompt, ...history]);

  const encoder = new TextEncoder();
  let fullResponse = "";

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const token of stream) {
          fullResponse += token;
          controller.enqueue(encoder.encode(token));
        }
        // Record which KB answered and exactly which chunks were used, so a
        // response can be audited back to its sources.
        await saveMessage(chatSessionId, "assistant", fullResponse, {
          sourceTypeUsed: retrieval.chunks.length ? retrieval.routedTo : null,
          retrievedChunkIds: retrieval.chunks.map((c) => c.id),
        });
      } catch (err) {
        console.error("Chat stream error:", err);
        controller.enqueue(
          encoder.encode(
            "\n\n[The assistant is unavailable right now. If you're running the local model, check that Ollama is running (`ollama serve`).]"
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Session-Id": chatSessionId,
      // Lets the widget surface whether the answer was grounded in platform content.
      "X-Retrieval-Status": retrieval.status,
    },
  });
}
