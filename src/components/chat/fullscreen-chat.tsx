"use client";

import { useState, useRef, useEffect } from "react";
import { FormattedMarkdown } from "@/components/ui/formatted-markdown";



import { getDeviceToken, isModelReady } from "@/lib/offline";
import { runWllamaInference } from "@/lib/offline/wllama-runner";
import { generateOfflineLessonPlan } from "@/lib/offline/offline-planner";

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
    function handleOpenEvent(e: Event) {
      const custom = e as CustomEvent<{ prompt?: string }>;
      if (custom.detail?.prompt) {
        setInput(custom.detail.prompt);
        // Automatically dispatch prompt after dialog opens
        setTimeout(() => {
          sendDirectMessage(custom.detail.prompt!);
        }, 300);
      }
    }
    window.addEventListener("trb:open-chat", handleOpenEvent);
    return () => window.removeEventListener("trb:open-chat", handleOpenEvent);
  }, []);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  if (!open) return null;

  async function getOfflineReply(promptText: string): Promise<string> {
    if (isModelReady()) {
      try {
        const wllamaOutput = await runWllamaInference(promptText);
        if (wllamaOutput && wllamaOutput.trim().length > 0) {
          return wllamaOutput;
        }
      } catch (e) {
        console.warn("Wllama on-device inference failed, falling back to curriculum engine:", e);
      }
    }

    const q = promptText.toLowerCase();

    // Check if user is asking for a lesson plan or explanation of a core topic
    const isPlan = q.includes("lesson") || q.includes("plan") || q.includes("note") || q.includes("draft") || q.includes("teach") || q.includes("explain");
    
    if (isPlan) {
      try {
        let detectedSubject = "basic science";
        if (q.includes("math") || q.includes("algebra") || q.includes("geometry") || q.includes("fraction") || q.includes("number") || q.includes("quadratic")) {
          detectedSubject = "mathematics";
        } else if (q.includes("english") || q.includes("grammar") || q.includes("noun") || q.includes("essay") || q.includes("comprehension") || q.includes("peel")) {
          detectedSubject = "english studies";
        }

        let detectedLevel = "JSS";
        if (q.includes("primary") || q.includes("pri 1") || q.includes("pri 2") || q.includes("pri 3") || q.includes("pri 4") || q.includes("pri 5") || q.includes("pri 6")) {
          detectedLevel = "Primary";
        } else if (q.includes("sss") || q.includes("ss 1") || q.includes("ss 2") || q.includes("ss 3") || q.includes("waec")) {
          detectedLevel = "SSS";
        }

        const draft = generateOfflineLessonPlan({
          topic: promptText.replace(/draft|create|prepare|write|a 40-minute|lesson note on|lesson plan on/gi, "").trim() || promptText,
          subject: detectedSubject,
          gradeLevel: detectedLevel,
        });

        return `*(Offline Curriculum Mode)*\n\n# ${draft.title}\n**Subject:** ${draft.subject} | **Level:** ${draft.gradeLevel}\n\n${draft.body}\n\n---\n*💡 This note was generated completely offline from your cached Nigerian curriculum engine.*`;
      } catch (err) {
        console.warn("Offline planner fallback error:", err);
      }
    }

    if (q.includes("assessment") || q.includes("formative") || q.includes("test") || q.includes("quiz")) {
      return `*(Offline Curriculum Mode)*\n\n### 4 High-Impact Formative Assessment Checks for Large Classrooms:\n\n1. **Thumbs Up / Sideways / Down (30 Seconds)**\n   - **Thumbs Up:** "I can explain the core formula or rule to my partner."\n   - **Thumbs Sideways:** "I understand the concept, but I need help with step 2."\n   - **Thumbs Down:** "I am confused and need a chalkboard recap."\n\n2. **Exit Slips (Scrap Paper Check)**\n   Hand each pupil a small scrap of paper with 1 specific problem (e.g. solve for $x$ in $2x + 4 = 10$). Collect as they step out.\n\n3. **Chalkboard Relay**\n   Divide the class into 4 rows. Row 1 identifies the given quantities, Row 2 selects the formula, Row 3 calculates, Row 4 verifies units.\n\n4. **Think-Pair-Share**\n   Give 60 seconds individual thinking, 90 seconds peer discussion, then cold-call 3 pairs to explain their reasoning.`;
    }

    if (q.includes("photosynthesis") || q.includes("respiration") || q.includes("science")) {
      return `*(Offline Curriculum Mode)*\n\n### Teaching Photosynthesis in Nigerian Schools (JSS & SSS)\n\n#### The Core Chemical Equation:\n$$6\\text{CO}_2 + 6\\text{H}_2\\text{O} \\xrightarrow{\\text{sunlight, chlorophyll}} \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2$$\n\n#### Everyday Classroom Analogies:\n- **Inputs (The Recipe):**\n  - Carbon Dioxide ($6\\text{CO}_2$) from atmospheric air via stomata.\n  - Water ($6\\text{H}_2\\text{O}$) absorbed by roots from soil.\n  - Sunlight absorbed by green chlorophyll pigments.\n- **Outputs (The Product):**\n  - Glucose ($\text{C}_6\\text{H}_{12}\\text{O}_6$) stored as starch (yam, cassava, maize).\n  - Oxygen ($6\\text{O}_2$) released into the atmosphere for animal respiration.\n\n#### Formative Check Question:\n*"If a plant is kept in total darkness for 48 hours, what happens to the starch in its leaves?"* (It is destarched as the plant metabolizes stored food).`;
    }

    return `*(Offline Curriculum Mode)*\n\nI am running 100% offline using your on-device Nigerian curriculum model.\n\nYou can ask me anytime to:\n- **Draft 40-minute NERDC lesson plans** for Primary, JSS, or SSS.\n- **Explain math & science equations** with step-by-step chalkboard breakdowns.\n- **Suggest low-cost teaching aids** using locally sourced Nigerian realia.\n- **Create WAEC/BECE practice questions** with marking rubrics.`;
  }


  async function sendDirectMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    const userMessage: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "" }]);
    setInput("");
    setIsStreaming(true);

    const historyToSend = messages
      .filter((m) => m.content.trim().length > 0)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const token = getDeviceToken();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token?.deviceId ? { "x-device-id": token.deviceId } : {}),
          ...(token?.boundActivationCode ? { "x-device-token": token.boundActivationCode } : {}),
        },
        body: JSON.stringify({
          message: trimmed,
          history: [...historyToSend, { role: "user", content: trimmed }],
          sessionId,
        }),
      });

      const newSessionId = res.headers.get("X-Session-Id");
      if (newSessionId) setSessionId(newSessionId);

      if (!res.ok || !res.body) {
        const fallback = await getOfflineReply(trimmed);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: fallback,
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
          const last = updated[updated.length - 1];
          updated[updated.length - 1] = {
            role: "assistant",
            content: (last?.content || "") + chunk,
          };
          return updated;
        });
      }
    } catch {
      const fallback = await getOfflineReply(trimmed);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: fallback,
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  async function sendMessage() {
    await sendDirectMessage(input);
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
                      <FormattedMarkdown content={m.content} />

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
