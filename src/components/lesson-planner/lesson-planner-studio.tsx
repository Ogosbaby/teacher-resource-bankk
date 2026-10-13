"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button, Badge } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractTextFromFile } from "@/lib/client/extract-text";
import { getTeacherProfile, loadDraft, readEncrypted, writeEncrypted, STORAGE_KEYS } from "@/lib/offline";
import { getSubjectsForLevels, CLASS_LEVELS, type ClassLevel } from "@/lib/content/curriculum";
import { requestLessonPlanGeneration } from "@/lib/ai/lesson-plan-generator";

interface DraftPreview {
  title: string;
  subject?: string;
  gradeLevel?: string;
  body: string;
  engineNote?: string;
}

interface SavedPlan {
  id: string;
  title: string;
  subject: string | null;
  gradeLevel: string | null;
  topic: string | null;
  body: string;
  source: string;
  sourceFileName: string | null;
  updatedAt: string;
}

type Mode = "generate" | "refine";

const SOURCE_LABEL: Record<string, string> = {
  ai_generated: "AI-generated",
  ai_refined: "AI-refined from upload",
  manual: "Manual",
};

export function LessonPlannerStudio({ userName }: { userName?: string }) {
  const [mode, setMode] = useState<Mode>("generate");

  // Registered class levels & subject choices
  const [levelOptions, setLevelOptions] = useState<ClassLevel[]>(CLASS_LEVELS);
  const [subjectOptions, setSubjectOptions] = useState<{ id: string; label: string }[]>([]);

  // Shared/generation fields
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");

  // Upload/refine fields
  const [fileName, setFileName] = useState<string | null>(null);
  const [roughText, setRoughText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<DraftPreview | null>(null);
  const [editableBody, setEditableBody] = useState("");
  const [editing, setEditing] = useState(false);

  const [plans, setPlans] = useState<SavedPlan[] | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SavedPlan | null>(null);

  useEffect(() => {
    const prof = getTeacherProfile() || loadDraft();
    const levels = prof?.classLevels?.length ? prof.classLevels : CLASS_LEVELS;
    setLevelOptions(levels);
    const initialLevel = levels[0];
    setGradeLevel(initialLevel);

    const subs = getSubjectsForLevels([initialLevel]);
    setSubjectOptions(subs.map((s) => ({ id: s.id, label: s.label })));
    if (subs.length > 0) {
      setSubject(subs[0].label);
    }
    void loadPlans();
  }, []);

  function handleLevelChange(newLevel: string) {
    setGradeLevel(newLevel);
    const subs = getSubjectsForLevels([newLevel as ClassLevel]);
    setSubjectOptions(subs.map((s) => ({ id: s.id, label: s.label })));
    if (subs.length > 0) {
      setSubject(subs[0].label);
    }
  }

  async function loadPlans() {
    const local = readEncrypted<SavedPlan[]>(STORAGE_KEYS.savedLessonPlans) ?? [];
    try {
      const res = await fetch("/api/lesson-plans");
      if (res.ok) {
        const data = await res.json();
        const serverPlans: SavedPlan[] = data.plans ?? [];
        const mergedMap = new Map<string, SavedPlan>();
        for (const p of local) mergedMap.set(p.id, p);
        for (const p of serverPlans) mergedMap.set(p.id, p);
        const combined = Array.from(mergedMap.values());
        setPlans(combined);
        writeEncrypted(STORAGE_KEYS.savedLessonPlans, combined);
        return;
      }
    } catch {
      // Offline fallback
    }
    setPlans(local);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setExtracting(true);
    setFileName(file.name);
    try {
      const text = await extractTextFromFile(file);
      setRoughText(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that file.");
      setRoughText("");
    } finally {
      setExtracting(false);
    }
  }

  async function generateOrRefine(save: boolean) {
    setError(null);

    if (mode === "generate" && topic.trim().length < 3) {
      setError("Describe the topic in at least 3 characters.");
      return;
    }
    if (mode === "refine" && roughText.trim().length < 20) {
      setError("Upload a rough draft first, or paste in enough text to refine.");
      return;
    }

    setBusy(true);
    setPreview(null);
    setSelectedPlan(null);

    try {
      const response = await requestLessonPlanGeneration({
        mode,
        topic: topic || undefined,
        roughText: mode === "refine" ? roughText : undefined,
        sourceFileName: mode === "refine" ? fileName : undefined,
        subject: subject || null,
        gradeLevel: gradeLevel || null,
        save,
      });

      const draft: DraftPreview = {
        title: response.draft.title,
        subject: response.draft.subject ?? subject ?? undefined,
        gradeLevel: response.draft.gradeLevel ?? gradeLevel ?? undefined,
        body: response.draft.body,
        engineNote: response.engineNote,
      };

      setPreview(draft);
      setEditableBody(draft.body);
      setEditing(false);

      if (save) {
        const planId = `plan_${Date.now()}`;
        const newPlan: SavedPlan = {
          id: planId,
          title: draft.title,
          body: draft.body,
          subject: draft.subject ?? subject ?? null,
          gradeLevel: draft.gradeLevel ?? gradeLevel ?? null,
          topic: topic || null,
          source: mode === "generate" ? "ai_generated" : "ai_refined",
          sourceFileName: fileName || null,
          updatedAt: new Date().toISOString(),
        };

        const existing = readEncrypted<SavedPlan[]>(STORAGE_KEYS.savedLessonPlans) ?? [];
        writeEncrypted(STORAGE_KEYS.savedLessonPlans, [newPlan, ...existing.filter((p) => p.id !== planId)]);
        await loadPlans();
        setSelectedPlan(newPlan);
      }
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong generating that plan.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdits() {
    if (!preview) return;
    setBusy(true);
    setError(null);

    const planId = selectedPlan?.id || `plan_${Date.now()}`;
    const newPlan: SavedPlan = {
      id: planId,
      title: preview.title,
      body: editableBody,
      subject: preview.subject ?? subject ?? null,
      gradeLevel: preview.gradeLevel ?? gradeLevel ?? null,
      topic: topic || null,
      source: mode === "generate" ? "ai_generated" : "ai_refined",
      sourceFileName: fileName,
      updatedAt: new Date().toISOString(),
    };

    // Save locally immediately
    const currentLocal = readEncrypted<SavedPlan[]>(STORAGE_KEYS.savedLessonPlans) ?? [];
    const updatedLocal = [newPlan, ...currentLocal.filter((p) => p.id !== planId)];
    writeEncrypted(STORAGE_KEYS.savedLessonPlans, updatedLocal);
    setPlans(updatedLocal);
    setSelectedPlan(newPlan);
    setEditing(false);

    try {
      const res = await fetch("/api/lesson-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: preview.title,
          body: editableBody,
          subject: preview.subject ?? subject ?? null,
          gradeLevel: preview.gradeLevel ?? gradeLevel ?? null,
          topic: topic || null,
          source: mode === "generate" ? "ai_generated" : "ai_refined",
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.saved) {
        setSelectedPlan(data.saved as SavedPlan);
        await loadPlans();
      }
    } catch {
      // Local copy already preserved
    } finally {
      setBusy(false);
    }
  }

  async function deletePlan(id: string) {
    const currentLocal = readEncrypted<SavedPlan[]>(STORAGE_KEYS.savedLessonPlans) ?? [];
    const updated = currentLocal.filter((p) => p.id !== id);
    writeEncrypted(STORAGE_KEYS.savedLessonPlans, updated);
    setPlans(updated);
    if (selectedPlan?.id === id) setSelectedPlan(null);

    try {
      await fetch(`/api/lesson-plans/${id}`, { method: "DELETE" });
    } catch {}
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      {/* Main studio */}
      <div className="space-y-6">
        {/* Mode toggle */}
        <div className="inline-flex rounded-2xl border border-warm-200 bg-white p-1 shadow-warm-sm">
          {(
            [
              ["generate", "Create with AI"],
              ["refine", "Upload & refine"],
            ] as [Mode, string][]
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                mode === m ? "bg-ink text-white" : "text-warm-600 hover:bg-warm-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="rounded-oak bg-white p-6 shadow-warm-sm">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <Label htmlFor="topic">
                {mode === "generate" ? "Topic" : "Topic (optional, helps the AI focus)"}
              </Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Teaching fractions with everyday materials"
              />
            </div>
            <div>
              <Label htmlFor="grade">Class level</Label>
              <select
                id="grade"
                value={gradeLevel}
                onChange={(e) => handleLevelChange(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-warm-300 bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/20"
              >
                {levelOptions.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <select
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-warm-300 bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/20"
              >
                {subjectOptions.map((opt) => (
                  <option key={opt.id} value={opt.label}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {mode === "refine" && (
            <div className="mt-4 rounded-xl border border-dashed border-warm-300 p-4">
              <Label htmlFor="file">Rough draft (PDF, .txt, or .md)</Label>
              <input
                ref={fileInputRef}
                id="file"
                type="file"
                accept=".pdf,.txt,.md,text/plain,application/pdf"
                onChange={handleFileChange}
                className="mt-1.5 block w-full text-sm text-warm-600 file:mr-3 file:rounded-xl file:border-0 file:bg-mint-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink hover:file:bg-mint-200"
              />
              <p className="mt-2 text-xs text-warm-500">
                Parsed entirely in your browser — the file itself is never uploaded to a server,
                only the extracted text is sent to the AI to refine.
              </p>
              {extracting && <p className="mt-2 text-xs text-warm-500">Reading {fileName}…</p>}
              {!extracting && roughText && (
                <p className="mt-2 text-xs text-mint-700">
                  ✓ Extracted {roughText.length.toLocaleString()} characters from {fileName}
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => generateOrRefine(false)} isLoading={busy}>
              Preview
            </Button>
            <Button onClick={() => generateOrRefine(true)} isLoading={busy}>
              {mode === "generate" ? "Generate & save" : "Refine & save"}
            </Button>
          </div>
          <p className="mt-3 text-xs text-warm-400">
            Uses the on-platform AI model. If generation fails, the model may be temporarily
            unavailable — try again shortly.
          </p>
        </div>

        {/* Draft preview / editor */}
        {preview && (
          <div className="rounded-oak bg-white p-6 shadow-warm-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="ai">AI</Badge>
                <h2 className="font-semibold text-ink">{preview.title}</h2>
              </div>
              <div className="flex gap-2">
                {!editing ? (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                ) : (
                  <Button size="sm" onClick={saveEdits} isLoading={busy}>
                    Save changes
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-1 flex gap-2 text-xs text-warm-500">
              {preview.subject && <span>{preview.subject}</span>}
              {preview.gradeLevel && <span>· {preview.gradeLevel}</span>}
            </div>

            {editing ? (
              <textarea
                value={editableBody}
                onChange={(e) => setEditableBody(e.target.value)}
                rows={18}
                className="mt-4 w-full rounded-xl border border-warm-300 p-3 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-mint-300"
              />
            ) : (
              <div className="prose prose-sm mt-4 max-w-none">
                <ReactMarkdown>{editableBody}</ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Saved plans sidebar */}
      <aside className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-warm-500">
          Your saved lesson plans
        </h2>
        {plans === null && <p className="text-sm text-warm-400">Loading…</p>}
        {plans?.length === 0 && (
          <p className="rounded-xl border border-dashed border-warm-300 p-4 text-sm text-warm-500">
            Nothing saved yet — generate or refine a plan and it will show up here.
          </p>
        )}
        {plans?.map((p) => (
          <div
            key={p.id}
            className={`cursor-pointer rounded-xl border p-3 transition-colors ${
              selectedPlan?.id === p.id
                ? "border-mint-400 bg-mint-50"
                : "border-warm-200 bg-white hover:border-warm-300"
            }`}
            onClick={() => {
              setSelectedPlan(p);
              setPreview({ title: p.title, subject: p.subject ?? undefined, gradeLevel: p.gradeLevel ?? undefined, body: p.body });
              setEditableBody(p.body);
              setEditing(false);
            }}
          >
            <p className="text-sm font-medium text-ink">{p.title}</p>
            <p className="mt-0.5 text-xs text-warm-500">
              {SOURCE_LABEL[p.source] ?? p.source} · {new Date(p.updatedAt).toLocaleDateString()}
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void deletePlan(p.id);
              }}
              className="mt-2 text-xs text-red-500 hover:underline"
            >
              Delete
            </button>
          </div>
        ))}
      </aside>
    </div>
  );
}
