"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { FormattedMarkdown } from "@/components/ui/formatted-markdown";
import { Button } from "@/components/ui";

type Message = { role: "user" | "assistant"; content: string };
type Feedback = "useful" | "needs-editing" | "incorrect" | null;

export function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [feedback, setFeedback] = useState<Record<number, Feedback>>({});
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [needsAuth, setNeedsAuth] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function sendMessage() {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [
      ...prev,
      userMessage,
      { role: "assistant", content: "" },
    ]);
    setInput("");
    setIsStreaming(true);
    setNeedsAuth(false);

    const historyToSend = messages
      .filter((m) => m.content.trim().length > 0)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          history: [...historyToSend, { role: "user", content: userMessage.content }],
          sessionId,
        }),
      });

      if (res.status === 401) {
        setNeedsAuth(true);
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      const newSessionId = res.headers.get("X-Session-Id");
      if (newSessionId) setSessionId(newSessionId);

      if (!res.ok || !res.body) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content:
              "The assistant is unavailable right now. Please try again.",
          };
          return updated;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: updated[updated.length - 1].content + chunk,
          };
          return updated;
        });
      }
    } catch (err) {
      console.error("Chat request failed:", err);
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant" && !last.content) {
          updated[updated.length - 1] = {
            role: "assistant",
            content:
              "The assistant is unreachable. Is the local model running?",
          };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  function handleFeedback(msgIndex: number, value: Feedback) {
    setFeedback((prev) => ({ ...prev, [msgIndex]: value }));
    // In production, send this to an API endpoint
  }

  return (
    <>
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-ink px-5 py-3.5 text-sm font-medium text-white shadow-warm-xl"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint-300 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-mint-400" />
        </span>
        {open ? "✕" : "Ask Me Anything"}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 flex h-[24rem] w-96 flex-col overflow-hidden rounded-oak-xl border border-warm-200 bg-white shadow-warm-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-warm-200 bg-ink px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-mint-400" />
                <p className="text-sm font-semibold text-white">Your Assist</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-warm-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto bg-warm-50 p-4">
              {messages.length === 0 && !needsAuth && (
                <p className="text-sm text-warm-400">
                  Ask me about the platform.
                </p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[85%]">
                    <div
                      className={`rounded-2xl px-3 py-2 text-sm ${
                        m.role === "user"
                          ? "bg-ink text-white"
                          : "border border-warm-200 bg-white text-ink"
                      }`}
                    >
                      {m.role === "assistant" ? (
                        m.content ? (
                          <>
                            <FormattedMarkdown content={m.content} />

                          </>
                        ) : (
                          isStreaming && i === messages.length - 1 && "…"
                        )
                      ) : (
                        <span className="whitespace-pre-wrap">{m.content}</span>
                      )}
                    </div>

                    {/* AI-generated label + feedback controls */}
                    {m.role === "assistant" && m.content && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-[10px] font-medium text-warm-400 bg-warm-100 rounded-full px-2 py-0.5">
                          AI-generated
                        </span>
                        {!feedback[i] ? (
                          <div className="flex gap-1">
                            {(
                              [
                                ["useful", "👍"],
                                ["needs-editing", "✏️"],
                                ["incorrect", "❌"],
                              ] as [Feedback, string][]
                            ).map(([value, emoji]) => (
                              <button
                                key={value}
                                onClick={() => handleFeedback(i, value)}
                                className="rounded-md px-1.5 py-0.5 text-[10px] text-warm-400 hover:bg-warm-100 transition-colors"
                                title={
                                  value === "useful"
                                    ? "Useful"
                                    : value === "needs-editing"
                                      ? "Needs editing"
                                      : "Incorrect"
                                }
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-mint-600">
                            Thanks for the feedback
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {needsAuth && (
                <div className="rounded-oak border border-warm-200 bg-white p-3 text-sm text-warm-600">
                  Sign in to chat with the AI assistant.{" "}
                  <Link
                    href="/sign-in"
                    className="font-medium text-ink underline"
                  >
                    Sign in
                  </Link>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2 border-t border-warm-200 p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
                placeholder="Type a message..."
                className="flex-1 rounded-xl border border-warm-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint-300 focus:border-mint-400"
              />
              <Button
                onClick={sendMessage}
                isLoading={isStreaming}
                size="sm"
                variant="primary"
              >
                Send
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
