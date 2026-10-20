"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Badge, Button, Card, CardBody } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

export interface PlayerModule {
  id: string;
  title: string;
  body: string;
  contentType: string;
}

export function CoursePlayer({
  courseId,
  courseTitle,
  enrollmentId,
  initialCompleted,
  modules,
  isCompleted,
  certificatesHref = "/dashboard/certificates",
}: {
  courseId: string;
  courseTitle: string;
  enrollmentId: string | null;
  initialCompleted: string[];
  modules: PlayerModule[];
  isCompleted: boolean;
  certificatesHref?: string;
}) {
  const router = useRouter();
  const [localEnrolledId, setLocalEnrolledId] = useState<string | null>(enrollmentId);
  const [completed, setCompleted] = useState<Set<string>>(new Set(initialCompleted));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);

  const activeEnrollmentId = enrollmentId ?? localEnrolledId;
  const allDone = modules.length > 0 && modules.every((m) => completed.has(m.id));
  const pct = modules.length ? Math.round((completed.size / modules.length) * 100) : 0;

  async function enroll() {
    setBusy("enroll");
    setError(null);
    try {
      if (typeof window !== "undefined") {
        try {
          const raw = window.localStorage.getItem("trb.enrolled_courses");
          const list = raw ? JSON.parse(raw) : [];
          if (!list.includes(courseId)) {
            list.push(courseId);
            window.localStorage.setItem("trb.enrolled_courses", JSON.stringify(list));
          }
          window.localStorage.setItem(`trb.course_enrolled.${courseId}`, "true");
        } catch {}
      }
      setLocalEnrolledId(`local-${courseId}`);

      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const data = await res.json().catch(() => null);
      if (data?.enrollmentId) {
        setLocalEnrolledId(data.enrollmentId);
      }
      router.refresh();
    } catch {
      setLocalEnrolledId(`local-${courseId}`);
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(`trb.course_progress.${courseId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCompleted((prev) => new Set([...Array.from(prev), ...parsed]));
        }
      }
      const raw = window.localStorage.getItem("trb.enrolled_courses");
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list) && (list.includes(courseId) || list.includes(courseTitle))) {
          setLocalEnrolledId((prev) => prev ?? `local-${courseId}`);
        }
      }
    } catch {}
  }, [courseId, courseTitle]);

  async function toggleModule(moduleId: string, next: boolean) {
    setBusy(moduleId);
    setError(null);

    // Optimistic UI update
    setCompleted((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(moduleId);
      else copy.delete(moduleId);

      // Save locally for offline access
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            `trb.course_progress.${courseId}`,
            JSON.stringify(Array.from(copy))
          );
        } catch {}
      }

      return copy;
    });

    if (!activeEnrollmentId || activeEnrollmentId.startsWith("local-")) {
      setBusy(null);
      return;
    }

    try {
      const res = await fetch(`/api/enrollments/${activeEnrollmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "progress", moduleId, completed: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Could not save progress to server.");
      }
      router.refresh();
    } catch (err) {
      // Keep local completion even if server sync is offline
      console.warn("Could not sync module progress to server:", err);
    } finally {
      setBusy(null);
    }
  }

  async function finish() {
    setBusy("finish");
    setError(null);

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(`trb.course_completed.${courseId}`, "true");
        // Issue verifiable local completion certificate immediately
        const { issueLocalCertificate } = await import("@/lib/certificates/local-certificates");
        issueLocalCertificate(courseId, courseTitle);
      } catch {}
    }

    if (!activeEnrollmentId || activeEnrollmentId.startsWith("local-")) {
      setJustCompleted(true);
      setBusy(null);
      return;
    }

    try {
      const res = await fetch(`/api/enrollments/${activeEnrollmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "complete" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not complete the course.");
      setJustCompleted(true);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {!activeEnrollmentId && (
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-medium text-ink">Not enrolled yet</p>
              <p className="mt-1 text-sm text-neutral-600">
                Enroll to track your progress through {courseTitle} and earn a certificate.
              </p>
            </div>
            <Button onClick={enroll} isLoading={busy === "enroll"}>
              Enroll in this course
            </Button>
          </CardBody>
        </Card>
      )}

      {activeEnrollmentId && (
        <Card>
          <CardBody>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {isCompleted || justCompleted ? (
                  <Badge variant="published">Completed</Badge>
                ) : (
                  <Badge variant="active">In progress</Badge>
                )}
                <span className="text-sm text-neutral-600">
                  {completed.size} of {modules.length} modules complete
                </span>
              </div>
              <Button
                onClick={finish}
                disabled={!allDone || isCompleted}
                isLoading={busy === "finish"}
              >
                {isCompleted || justCompleted ? "Course completed" : "Finish course"}
              </Button>
            </div>

            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
              <div className="h-full rounded-full bg-ink transition-all" style={{ width: `${pct}%` }} />
            </div>

            {!allDone && !isCompleted && (
              <p className="mt-3 text-xs text-neutral-500">
                Mark every module complete to finish the course and generate your certificate.
              </p>
            )}
            {justCompleted && (
              <p className="mt-3 text-sm text-emerald-700">
                Course completed. Your certificate is being generated —{" "}
                <Link href={certificatesHref} className="underline">
                  check your certificates
                </Link>{" "}
                in a moment.
              </p>
            )}
          </CardBody>
        </Card>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {modules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
          <p className="font-medium text-ink">This course has no published modules yet.</p>
        </div>
      ) : (
        <ol className="space-y-4">
          {modules.map((m, i) => {
            const isDone = completed.has(m.id);
            return (
              <li key={m.id}>
                <Card>
                  <CardBody>
                    {/* Module Header */}
                    <div className="flex items-center justify-between gap-4 border-b border-warm-100 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-warm-100 text-xs font-bold text-ink">
                          {i + 1}
                        </span>
                        <h2 className="text-base font-bold text-ink sm:text-lg">{m.title}</h2>
                      </div>
                      {isDone && <Badge variant="published">Done</Badge>}
                    </div>

                    {/* Module Content - Full Width */}
                    {m.body && (
                      <div className="prose prose-sm prose-neutral mt-4 max-w-none text-warm-900 leading-relaxed">
                        <ReactMarkdown>{m.body}</ReactMarkdown>
                      </div>
                    )}

                    {/* Module Action Bar - Bottom Footer */}
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-warm-100 pt-4">
                      {/* Ask AI Contextual Assistant */}
                      <button
                        type="button"
                        onClick={() => {
                          const event = new CustomEvent("trb:open-chat", {
                            detail: {
                              prompt: `I am currently studying module ${i + 1}: "${m.title}" in the course "${courseTitle}". Can you explain this concept in more practical detail for a Nigerian classroom with examples?`,
                            },
                          });
                          window.dispatchEvent(event);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-warm-200 bg-warm-50 px-3.5 py-2 text-xs font-semibold text-ink transition-all hover:bg-warm-100 hover:border-warm-300"
                      >
                        <span>🤖</span>
                        <span>Ask AI about this lesson</span>
                      </button>

                      {/* Clean Mark Complete Checkbox / Button */}
                      {activeEnrollmentId && (
                        <label className="inline-flex cursor-pointer select-none items-center gap-2.5 rounded-xl border border-warm-200 bg-white px-4 py-2 text-xs font-semibold shadow-sm transition-all hover:bg-warm-50">
                          <input
                            type="checkbox"
                            checked={isDone}
                            disabled={busy === m.id}
                            onChange={(e) => toggleModule(m.id, e.target.checked)}
                            className={cn(
                              "h-4 w-4 rounded border-warm-300 text-ink focus:ring-ink"
                            )}
                          />
                          <span className={cn(isDone ? "text-emerald-700 font-bold" : "text-ink")}>
                            {isDone ? "✓ Completed" : "Mark as complete"}
                          </span>
                        </label>
                      )}
                    </div>
                  </CardBody>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
