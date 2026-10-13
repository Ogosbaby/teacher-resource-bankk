"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardBody, Badge } from "@/components/ui";
import { PRELOADED_CPD_COURSES } from "@/lib/content/cpd-courses";

export interface LibraryItem {
  id: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  courseDescription: string | null;
  status: "active" | "completed";
  completedAt?: string | null;
  progressPercent: number;
  completedModules: number;
  totalModules: number;
}

export function MyLibraryView({
  initialActive = [],
  initialCompleted = [],
}: {
  initialActive?: any[];
  initialCompleted?: any[];
}) {
  const [activeItems, setActiveItems] = useState<LibraryItem[]>([]);
  const [completedItems, setCompletedItems] = useState<LibraryItem[]>([]);
  const [activeTab, setActiveTab] = useState<"in_progress" | "certificates">("in_progress");

  useEffect(() => {
    // 1. Convert server items
    const serverMap = new Map<string, LibraryItem>();

    for (const item of initialActive) {
      serverMap.set(item.courseSlug ?? item.id, {
        id: item.id,
        courseId: item.courseId ?? item.id,
        courseTitle: item.courseTitle ?? "Course",
        courseSlug: item.courseSlug ?? item.slug ?? "",
        courseDescription: item.courseDescription ?? null,
        status: "active",
        progressPercent: 0,
        completedModules: 0,
        totalModules: 0,
      });
    }

    for (const item of initialCompleted) {
      serverMap.set(item.courseSlug ?? item.id, {
        id: item.id,
        courseId: item.courseId ?? item.id,
        courseTitle: item.courseTitle ?? "Course",
        courseSlug: item.courseSlug ?? item.slug ?? "",
        courseDescription: item.courseDescription ?? null,
        status: "completed",
        completedAt: item.completedAt ? new Date(item.completedAt).toISOString() : null,
        progressPercent: 100,
        completedModules: 1,
        totalModules: 1,
      });
    }

    // 2. Read local enrollments and progress
    try {
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem("trb.enrolled_courses");
        const enrolledIds: string[] = raw ? JSON.parse(raw) : [];

        for (const enrolledId of enrolledIds) {
          const preloaded = PRELOADED_CPD_COURSES.find(
            (c) => c.id === enrolledId || c.slug === enrolledId
          );
          if (!preloaded) continue;

          // Check completion
          const isDone = window.localStorage.getItem(`trb.course_completed.${preloaded.id}`) === "true";
          const progressRaw = window.localStorage.getItem(`trb.course_progress.${preloaded.id}`);
          const doneModules: string[] = progressRaw ? JSON.parse(progressRaw) : [];
          const totalMods = preloaded.modules?.length ?? 1;
          const completedMods = isDone ? totalMods : doneModules.length;
          const pct = Math.min(100, Math.round((completedMods / totalMods) * 100));

          serverMap.set(preloaded.slug, {
            id: `local-${preloaded.id}`,
            courseId: preloaded.id,
            courseTitle: preloaded.title,
            courseSlug: preloaded.slug,
            courseDescription: preloaded.description,
            status: isDone ? "completed" : "active",
            progressPercent: pct,
            completedModules: completedMods,
            totalModules: totalMods,
          });
        }
      }
    } catch {}

    const all = Array.from(serverMap.values());
    setActiveItems(all.filter((i) => i.status === "active"));
    setCompletedItems(all.filter((i) => i.status === "completed"));
  }, [initialActive, initialCompleted]);

  const isEmpty = activeItems.length === 0 && completedItems.length === 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">My Library</h1>
          <p className="mt-1 text-sm text-warm-500">Your enrolled courses and earned certificates.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-5 flex gap-2 border-b border-warm-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("in_progress")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "in_progress" ? "bg-ink text-white" : "bg-warm-100 text-warm-700 hover:bg-warm-200"
          }`}
        >
          In Progress ({activeItems.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("certificates")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "certificates" ? "bg-ink text-white" : "bg-warm-100 text-warm-700 hover:bg-warm-200"
          }`}
        >
          Certificates ({completedItems.length})
        </button>
      </div>

      {isEmpty ? (
        <div className="mt-8 rounded-2xl border border-dashed border-warm-300 bg-white p-10 text-center shadow-warm-sm">
          <p className="text-3xl">📚</p>
          <p className="mt-3 font-semibold text-ink">No courses in your library yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-warm-500">
            Browse our CPD courses and tap &ldquo;Enroll&rdquo; to start learning anytime.
          </p>
          <Link
            href="/courses"
            className="mt-5 inline-flex rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-warm-800"
          >
            Explore Courses
          </Link>
        </div>
      ) : activeTab === "in_progress" ? (
        <div className="mt-6 space-y-4">
          {activeItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-warm-500">No active courses in progress.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {activeItems.map((item) => (
                <Link key={item.id} href={`/courses/${item.courseSlug}`} className="group block">
                  <Card className="h-full transition-all hover:border-warm-400 hover:shadow-warm-sm">
                    <CardBody className="p-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="active">In Progress</Badge>
                        <span className="text-xs text-warm-400">
                          {item.completedModules} of {item.totalModules} modules
                        </span>
                      </div>
                      <h3 className="mt-2 text-base font-semibold text-ink group-hover:text-warm-900">
                        {item.courseTitle}
                      </h3>
                      {item.courseDescription && (
                        <p className="mt-1 line-clamp-2 text-xs text-warm-500">
                          {item.courseDescription}
                        </p>
                      )}
                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-warm-100">
                        <div
                          className="h-full rounded-full bg-ink transition-all"
                          style={{ width: `${item.progressPercent}%` }}
                        />
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {completedItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-warm-500">
              Complete a course to earn and view your completion certificate here.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {completedItems.map((item) => (
                <Card key={item.id} className="h-full">
                  <CardBody className="p-4">
                    <Badge variant="published">Completed</Badge>
                    <h3 className="mt-2 text-base font-semibold text-ink">{item.courseTitle}</h3>
                    <p className="mt-2 text-xs text-emerald-700">✓ Course completed</p>
                    <Link
                      href={`/courses/${item.courseSlug}`}
                      className="mt-3 inline-block text-xs font-medium text-ink underline"
                    >
                      Review Course Material →
                    </Link>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
