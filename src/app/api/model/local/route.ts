import { NextResponse } from "next/server";
import { getLocalModelStatus } from "@/lib/ai/local-model";

/**
 * Reports whether the locally hosted model is ready.
 *
 * Deliberately unauthenticated: the registration wizard calls this *before* a
 * teacher has an account, and its payload is a boolean plus a model tag — no
 * user data, no secrets. It reveals only whether the host has the model
 * installed, which is public information on a self-hosted deployment.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getLocalModelStatus();
  return NextResponse.json(status, {
    // Readiness genuinely changes (Ollama starting, a model being pulled), but
    // there is no value in re-probing on every navigation.
    headers: { "Cache-Control": "no-store" },
  });
}
