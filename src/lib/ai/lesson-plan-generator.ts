/**
 * Resilient multi-tier Lesson Plan Generator.
 *
 * Tier 1: Local / Cloud Server API (/api/lesson-plans/draft)
 * Tier 2: Option B: In-Browser WebAssembly LLM (@wllama/wllama using downloaded GGUF)
 * Tier 3: Option A (Fallback): Offline Nigerian Curriculum Engine (instant, deterministic, zero-fail)
 */

import { generateOfflineLessonPlan, refineOfflineLessonPlan } from "@/lib/offline/offline-planner";
import { runWllamaInference } from "@/lib/offline/wllama-runner";

export interface PlanGenerationRequest {
  mode: "generate" | "refine";
  topic?: string;
  roughText?: string;
  sourceFileName?: string | null;
  subject?: string | null;
  gradeLevel?: string | null;
  save?: boolean;
}

export interface PlanGenerationResponse {
  ok: boolean;
  draft: {
    title: string;
    subject?: string | null;
    gradeLevel?: string | null;
    body: string;
  };
  structured: boolean;
  modelVersion: string;
  engineUsed: "server-model" | "on-device-wllama" | "offline-curriculum-engine";
  engineNote: string;
  saved?: any;
}

export async function requestLessonPlanGeneration(
  params: PlanGenerationRequest
): Promise<PlanGenerationResponse> {
  // ── Tier 1: Try Server API if reachable ──
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const res = await fetch("/api/lesson-plans/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return {
        ...data,
        engineUsed: "server-model",
        engineNote: "Generated with Connected AI Model",
      };
    }
  } catch (err) {
    console.warn("Tier 1 (Server API) unavailable or timed out, trying Tier 2 (Wasm) / Tier 3 (Offline Engine):", err);
  }

  // ── Tier 2: Option B — Try On-Device WebAssembly LLM (wllama) ──
  try {
    const prompt = params.mode === "generate"
      ? `Generate a standard NERDC Nigerian lesson plan for Subject: "${params.subject || 'General'}", Grade Level: "${params.gradeLevel || 'Basic Education'}", Topic: "${params.topic}". Include Behavioral Objectives, Instructional Materials, Set Induction, Step-by-Step Activities, Evaluation, and Homework.`
      : `Refine and format the following rough teacher notes into a complete NERDC Nigerian lesson plan:\n\n${params.roughText}`;

    const wllamaOutput = await runWllamaInference(prompt);
    if (wllamaOutput && wllamaOutput.length > 100) {
      const title = `${params.subject || 'Lesson'}: ${params.topic || 'Curriculum Study'} (${params.gradeLevel || 'Basic'})`;
      return {
        ok: true,
        draft: {
          title,
          subject: params.subject,
          gradeLevel: params.gradeLevel,
          body: wllamaOutput,
        },
        structured: true,
        modelVersion: "wllama-qwen-local",
        engineUsed: "on-device-wllama",
        engineNote: "Generated with On-Device AI Model (Wasm)",
        saved: null,
      };
    }
  } catch (wasmErr) {
    console.warn("Tier 2 (Option B wllama) not available or failed:", wasmErr);
  }

  // ── Tier 3: Option A (Rock-Solid Fallback) — Offline Nigerian Curriculum Engine ──
  const offlineDraft = params.mode === "refine"
    ? refineOfflineLessonPlan({
        topic: params.topic || "Core Subject Study",
        subject: params.subject,
        gradeLevel: params.gradeLevel,
        roughText: params.roughText,
      })
    : generateOfflineLessonPlan({
        topic: params.topic || "Core Subject Study",
        subject: params.subject,
        gradeLevel: params.gradeLevel,
      });

  return {
    ok: true,
    draft: offlineDraft,
    structured: true,
    modelVersion: "offline-curriculum-engine-v1",
    engineUsed: "offline-curriculum-engine",
    engineNote: "Generated with Built-in Offline Curriculum Engine",
    saved: null,
  };
}
