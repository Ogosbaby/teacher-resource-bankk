"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

type Message = { role: "user" | "assistant"; content: string };
type Feedback = "useful" | "needs-editing" | "incorrect" | null;

interface FullScreenChatProps {
  open: boolean;
  onClose: () => void;
}

export function FullScreenChat({ open, onClose }: FullScreenChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [feedback, setFeedback] = useState<Record<number, Feedback>>({});
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  if (!open) return null;

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMessage: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "" }]);
    setInput("");
    setIsStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, sessionId }),
      });

      const newSessionId = res.headers.get("X-Session-Id");
      if (newSessionId) setSessionId(newSessionId);

      if (!res.ok || !res.body) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "The assistant is momentarily unavailable. Please check connectivity and try again.",
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
    } catch {
      // Offline fallback: provide an instant curriculum-aligned response
      let offlineReply = "*(Offline Mode)* ";
      const q = trimmed.toLowerCase();
      if (q.includes("lesson") || q.includes("plan") || q.includes("note")) {
        offlineReply += `Here is an instructional guide for **${trimmed}**:\n\n### Recommended Lesson Structure (NERDC Aligned):\n1. **Behavioral Objectives**: By the end of 40 minutes, learners should define the core concept, identify 3 real-world examples, and solve check exercises.\n2. **Instructional Materials**: Chalkboard, diagrammatic charts, flashcards, and locally sourced realia.\n3. **Step 1: Introduction (5 mins)**: Connect topic to everyday Nigerian life.\n4. **Step 2: Core Concept (15 mins)**: Teach principles with step-by-step chalkboard demonstration.\n5. **Step 3: Guided Practice (10 mins)**: Paired pupil exercises with peer review.\n6. **Step 4: Evaluation (10 mins)**: 3-question formative assessment.\n\n*Tip: You can also open the **Lesson Planner** to format and save this note to your device!*`;
      } else if (q.includes("assessment") || q.includes("formative") || q.includes("test") || q.includes("exam")) {
        offlineReply += `### Formative Assessment Strategies for Large Classrooms:\n- **Exit Slips**: Hand learners a scrap paper with 1 quick question to solve before leaving.\n- **Think-Pair-Share**: 60 seconds independent thinking, 2 minutes paired discussion, then cold-call 3 pairs.\n- **Chalkboard Relays**: Groups send representatives to solve sequential steps of a problem.`;
      } else {
        offlineReply += `I am working offline using your device's cached knowledge. You can ask me to draft lesson notes for Primary, JSS, and SSS subjects, or suggest classroom activities.`;
      }

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: offlineReply,
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Top Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-warm-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-full text-warm-700 hover:bg-warm-100"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white">
              <RobotIcon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-ink leading-tight">Ask TRB AI</h2>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] text-warm-500 font-medium">Curriculum Assistant</span>
              </div>
            </div>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => setMessages([])}
            className="rounded-lg px-2.5 py-1 text-xs text-warm-500 hover:bg-warm-100"
          >
            Clear
          </button>
        )}
      </header>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto bg-warm-50/50 p-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.length === 0 && (
            <div className="py-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-white shadow-warm-sm">
                <RobotIcon className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-base font-bold text-ink">How can I help you teach today?</h3>
              <p className="mx-auto mt-1 max-w-sm text-xs text-warm-500">
                Grounded in NERDC Nigerian curriculum standards, WAEC question structures, and CPD pedagogy.
              </p>

              <div className="mt-6 grid gap-2 text-left">
                {[
                  "Draft a 40-minute lesson note on Living and Non-living things for Primary 4",
                  "Suggest 4 quick formative assessment checks for JSS 2 Mathematics",
                  "Create 5 WAEC-aligned practice questions on Photosynthesis",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      setInput(prompt);
                      inputRef.current?.focus();
                    }}
                    className="rounded-xl border border-warm-200 bg-white p-3 text-xs text-warm-700 shadow-sm transition hover:border-warm-400 hover:bg-warm-50"
                  >
                    💡 {prompt}
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
              <div className="max-w-[88%] sm:max-w-[80%]">
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    m.role === "user"
                      ? "rounded-tr-sm bg-ink text-white"
                      : "rounded-tl-sm border border-warm-200 bg-white text-ink"
                  }`}
                >
                  {m.role === "assistant" ? (
                    m.content ? (
                      <div className="prose prose-sm max-w-none text-ink prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1 prose-li:my-0.5">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-warm-400">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-warm-400" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-warm-400 [animation-delay:0.2s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-warm-400 [animation-delay:0.4s]" />
                      </span>
                    )
                  ) : (
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  )}
                </div>

                {m.role === "assistant" && m.content && (
                  <div className="mt-1 flex items-center justify-between px-1 text-[11px] text-warm-400">
                    <span>Curriculum AI</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setFeedback((prev) => ({ ...prev, [i]: "useful" }))}
                        className={`rounded px-1.5 py-0.5 ${feedback[i] === "useful" ? "bg-mint-100 text-mint-800" : "hover:bg-warm-100"}`}
                        title="Helpful"
                      >
                        👍
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeedback((prev) => ({ ...prev, [i]: "needs-editing" }))}
                        className={`rounded px-1.5 py-0.5 ${feedback[i] === "needs-editing" ? "bg-amber-100 text-amber-800" : "hover:bg-warm-100"}`}
                        title="Needs editing"
                      >
                        ✏️
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input Bar */}
      <footer className="border-t border-warm-200 bg-white p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="mx-auto flex max-w-2xl items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about lesson plans, schemes, or exercises..."
            disabled={isStreaming}
            className="flex-1 rounded-xl border border-warm-300 bg-warm-50 px-4 py-2.5 text-sm text-ink placeholder-warm-400 focus:border-ink focus:bg-white focus:outline-none focus:ring-1 focus:ring-ink"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            aria-label="Send message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink text-white transition disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </form>
      </footer>
    </div>
  );
}

function RobotIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="3" />
      <circle cx="9" cy="16" r="1.2" fill="currentColor" />
      <circle cx="15" cy="16" r="1.2" fill="currentColor" />
      <path d="m8 7 4-4 4 4" />
      <path d="M12 3v8" />
    </svg>
  );
}
