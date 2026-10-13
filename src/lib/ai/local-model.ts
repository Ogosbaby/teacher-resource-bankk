/**
 * Server-side probe for the locally hosted model.
 *
 * The app's Step 4 "download" is really a *provisioning* step. A browser cannot
 * read or install a multi-hundred-megabyte GGUF, so the honest question to ask is
 * "is the local model actually available to serve requests?" — and the only
 * component that can answer that is the server, which talks to Ollama.
 *
 * Ollama is queried through its native API rather than the OpenAI-compatible one
 * because only `/api/tags` reports installed models and their sizes. The
 * OpenAI-compatible base URL is reused and its `/v1` suffix stripped, so there is
 * still a single env var pointing at the model host.
 *
 * This also answers the second question — "and can we *send* the phone the file?"
 * — by locating the GGUF on disk (see `model-bundle.ts`). Two questions, one
 * request, because the wizard has to decide between a real transfer and the
 * simulated fallback before it shows the teacher anything.
 */
import { resolveModelBundle } from "@/lib/ai/model-bundle";
export interface LocalModelStatus {
  /** The tag the app is configured to use. */
  model: string;
  /** Whether the Ollama host answered at all. */
  reachable: boolean;
  /** Whether `model` is present and therefore usable for inference. */
  ready: boolean;
  sizeBytes: number | null;
  /** Human-readable explanation, safe to show in the UI. */
  detail: string;
  /**
   * Whether this host can hand the GGUF to a device that has to run the model
   * itself. False on a deployment that only serves inference, where the wizard's
   * transfer has nowhere to read from and falls back to the simulated ticker.
   */
  transferable: boolean;
  /** Exact byte count of the transferable file, when there is one. */
  transferBytes: number | null;
}

/** `http://localhost:11434/v1` -> `http://localhost:11434` */
function modelHostRoot(): string {
  const base = process.env.QWEN_BASE_URL || "http://localhost:11434/v1";
  return base.replace(/\/+$/, "").replace(/\/v1$/, "");
}

/** Ollama reports `qwen-local:latest`; the env var may say `qwen-local`. */
function sameModel(a: string, b: string): boolean {
  const strip = (s: string) => s.replace(/:latest$/, "");
  return strip(a) === strip(b);
}

export async function getLocalModelStatus(): Promise<LocalModelStatus> {
  const model = process.env.QWEN_MODEL || "qwen-local";
  const root = modelHostRoot();

  try {
    const res = await fetch(`${root}/api/tags`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });

    if (!res.ok) {
      return {
        model,
        reachable: true,
        ready: false,
        sizeBytes: null,
        detail: `Ollama answered ${res.status}.`,
        ...(await transferInfo()),
      };
    }

    const body = (await res.json()) as { models?: { name?: string; size?: number }[] };
    const hit = (body.models ?? []).find((m) => m.name && sameModel(m.name, model));

    if (!hit) {
      return {
        model,
        reachable: true,
        ready: false,
        sizeBytes: null,
        detail: `Ollama is running but "${model}" isn't installed. Build it with: ollama create ${model} -f Modelfile`,
        ...(await transferInfo()),
      };
    }

    return {
      model,
      reachable: true,
      ready: true,
      sizeBytes: typeof hit.size === "number" ? hit.size : null,
      detail: `${hit.name} is installed and ready for offline inference.`,
      ...(await transferInfo()),
    };
  } catch {
    return {
      model,
      reachable: false,
      ready: false,
      sizeBytes: null,
      detail: `Could not reach the model host at ${root}. Start it with: ollama serve`,
      ...(await transferInfo()),
    };
  }
}

/**
 * Whether a device can pull the model from this host, and how big it is.
 *
 * Wrapped so a failure to locate the file can never take down the readiness probe:
 * "Ollama is serving the model" and "the phone can download it" are separate
 * questions, and the wizard needs the first one answered even if the second is a
 * no.
 */
async function transferInfo(): Promise<{
  transferable: boolean;
  transferBytes: number | null;
}> {
  try {
    const bundle = await resolveModelBundle();
    return { transferable: Boolean(bundle), transferBytes: bundle?.sizeBytes ?? null };
  } catch {
    return { transferable: false, transferBytes: null };
  }
}
