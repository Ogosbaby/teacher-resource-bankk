import { NextResponse } from "next/server";
import { InvalidTransitionError } from "@/lib/content/status";

/**
 * Raised by draft helpers when the local model can't be reached, so the admin
 * UI can say something actionable instead of "500".
 */
export class ProviderUnavailableError extends Error {
  constructor(readonly cause?: unknown) {
    super("The AI provider is unreachable.");
    this.name = "ProviderUnavailableError";
  }
}

/** Convert a thrown error into a sensible HTTP response. */
export function apiError(err: unknown) {
  if (err instanceof InvalidTransitionError) {
    return NextResponse.json({ error: err.message }, { status: 409 });
  }
  if (err instanceof ProviderUnavailableError) {
    return NextResponse.json(
      {
        error:
          "The AI provider is unreachable. If you're running the local model, check that Ollama is running (`ollama serve`).",
      },
      { status: 503 }
    );
  }
  console.error("[api]", err);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

/**
 * Run an AI call, translating connection failures into ProviderUnavailableError.
 * Ollama simply isn't running often enough that a clear message matters.
 */
export async function withProvider<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const code = (err as { cause?: { code?: string }; code?: string })?.cause?.code ??
      (err as { code?: string })?.code;
    const isConn =
      code === "ECONNREFUSED" ||
      code === "ENOTFOUND" ||
      code === "ETIMEDOUT" ||
      /ECONNREFUSED|fetch failed|connection error/i.test(String((err as Error)?.message ?? ""));
    if (isConn) throw new ProviderUnavailableError(err);
    throw err;
  }
}
