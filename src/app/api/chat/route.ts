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

  const { message, sessionId, history: clientHistory } = (await req.json()) as {
    message: string;
    sessionId?: string;
    history?: { role: "user" | "assistant"; content: string }[];
  };

  if (!message || typeof message !== "string") {
    return new Response("Missing message", { status: 400 });
  }

  let chatSessionId = sessionId;
  let history: { role: "user" | "assistant" | "system"; content: string }[] = [];

  // Persist session and history if user is signed in to web account
  if (session?.user?.id) {
    try {
      chatSessionId = sessionId ?? (await createSession(session.user.id));
      await saveMessage(chatSessionId, "user", message);
      history = await getSessionMessages(chatSessionId);
    } catch (dbErr) {
      console.warn("Could not persist message to database, continuing session in transient mode:", dbErr);
    }
  }

  // Retrieve grounding context before building the prompt. This never throws —
  // on any failure it reports a status the prompt describes honestly.
  const retrieval = await retrieveContext(message);
  const systemPrompt = buildSystemPrompt(retrieval);

  // Form conversation history: prefer clientHistory (APK/client memory) or server session history
  let conversation: { role: "user" | "assistant"; content: string }[] = [];
  if (Array.isArray(clientHistory) && clientHistory.length > 0) {
    conversation = clientHistory.filter(
      (m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim().length > 0
    );
  } else if (history.length > 0) {
    conversation = history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  }

  // Ensure the current user message is at the end of the conversation
  if (conversation.length === 0 || conversation[conversation.length - 1].content !== message) {
    conversation.push({ role: "user", content: message });
  }

  // Include up to the last 12 messages for full contextual memory
  const recentConversation = conversation.slice(-12);
  const messagesToSend = [systemPrompt, ...recentConversation];

  const ai = getAIProvider();
  const stream = ai.streamChat(messagesToSend);

  const encoder = new TextEncoder();
  let fullResponse = "";

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const token of stream) {
          fullResponse += token;
          controller.enqueue(encoder.encode(token));
        }
        if (session?.user?.id && chatSessionId) {
          try {
            await saveMessage(chatSessionId, "assistant", fullResponse, {
              sourceTypeUsed: retrieval.chunks.length ? retrieval.routedTo : null,
              retrievedChunkIds: retrieval.chunks.map((c) => c.id),
            });
          } catch (dbErr) {
            console.warn("Could not persist assistant response to database:", dbErr);
          }
        }
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
      ...(chatSessionId ? { "X-Session-Id": chatSessionId } : {}),
      // Lets the widget surface whether the answer was grounded in platform content.
      "X-Retrieval-Status": retrieval.status,
    },
  });
}
