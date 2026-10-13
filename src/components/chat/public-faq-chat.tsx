"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { FAQ_BANK } from "@/lib/faq/faq-bank";
import { getWhatsAppSupportUrl } from "@/lib/support/whatsapp";

type Message =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; unmatched?: false }
  | { role: "assistant"; content: string; unmatched: true; question: string };

// Pre-written, platform-goal-aligned FAQ suggestions shown before the visitor
// has typed anything. Anyone — signed in or not — can use this widget.
const SUGGESTED_IDS = ["is-it-free", "whats-included", "how-long-does-it-take", "need-internet-data"];
const SUGGESTED_QUESTIONS = SUGGESTED_IDS.map(
  (id) => FAQ_BANK.find((f) => f.id === id)?.question
).filter((q): q is string => Boolean(q));

export function PublicFaqChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    function handleOpen() {
      setOpen(true);
    }
    window.addEventListener("trb:open-ask-us", handleOpen);
    return () => window.removeEventListener("trb:open-ask-us", handleOpen);
  }, []);

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || isLoading) return;

    setMessages((prev) => [...prev, { role: "user", content }]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.matched) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.answer as string }]);
      } else {
        // Not in the FAQ bank — hand off to WhatsApp rather than guessing.
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "I couldn't find that in our FAQs. Our support team can help directly on WhatsApp:",
            unmatched: true,
            question: content,
          },
        ]);
      }
    } catch (err) {
      console.error("Public FAQ chat request failed:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong reaching our FAQs. You can also message us directly:",
          unmatched: true,
          question: content,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
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
            className="fixed bottom-24 right-6 z-50 flex h-[26rem] w-96 max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-oak-xl border border-warm-200 bg-white shadow-warm-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-warm-200 bg-ink px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-mint-400" />
                <div>
                  <p className="text-sm font-semibold text-white">Ask about the platform</p>
                  <p className="text-[11px] text-warm-300">No sign-in needed</p>
                </div>
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
              {messages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-warm-500">
                    Ask about pricing, what&apos;s included, how long it takes, or whether you
                    need data — or tap a question below.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="rounded-full border border-warm-200 bg-white px-3 py-1.5 text-xs font-medium text-warm-700 transition-colors hover:border-mint-300 hover:bg-mint-50 hover:text-ink"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
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
                        <div className="prose prose-sm max-w-none prose-p:my-1.5">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <span className="whitespace-pre-wrap">{m.content}</span>
                      )}
                    </div>
                    {m.role === "assistant" && "unmatched" in m && m.unmatched && (
                      <a
                        href={getWhatsAppSupportUrl(`Hi! I had a question on the site: "${m.question}"`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
                          <path d="M20.52 3.48A11.93 11.93 0 0 0 12.04 0C5.5 0 .2 5.3.2 11.84c0 2.08.55 4.12 1.6 5.92L0 24l6.4-1.68a11.86 11.86 0 0 0 5.64 1.44h.01c6.54 0 11.84-5.3 11.84-11.84 0-3.16-1.24-6.14-3.37-8.44ZM12.05 21.5h-.01a9.7 9.7 0 0 1-4.94-1.35l-.35-.21-3.68.97.98-3.58-.23-.37a9.66 9.66 0 0 1-1.48-5.12c0-5.36 4.36-9.72 9.73-9.72a9.65 9.65 0 0 1 6.87 2.85 9.65 9.65 0 0 1 2.85 6.87c0 5.36-4.37 9.66-9.74 9.66Zm5.34-7.28c-.29-.15-1.73-.85-2-.95-.27-.1-.46-.15-.66.15-.2.29-.76.95-.93 1.14-.17.2-.34.22-.63.07-.29-.15-1.23-.45-2.34-1.44-.86-.77-1.45-1.72-1.62-2.01-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.2-.29.29-.49.1-.2.05-.37-.02-.51-.07-.15-.66-1.59-.9-2.18-.24-.57-.48-.5-.66-.5h-.56c-.2 0-.51.07-.78.37-.27.29-1.02 1-1.02 2.44 0 1.43 1.05 2.82 1.2 3.01.15.2 2.06 3.15 5 4.42.7.3 1.24.48 1.67.61.7.22 1.34.19 1.84.12.56-.08 1.73-.71 1.98-1.39.24-.68.24-1.27.17-1.39-.07-.12-.26-.2-.55-.34Z" />
                        </svg>
                        Continue on WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-warm-200 bg-white px-3 py-2 text-sm text-warm-400">
                    …
                  </div>
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
                placeholder="Ask about pricing, features…"
                className="flex-1 rounded-xl border border-warm-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint-300 focus:border-mint-400"
              />
              <button
                onClick={() => sendMessage()}
                disabled={isLoading}
                className="rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
