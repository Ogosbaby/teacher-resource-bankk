/**
 * Provisioning the on-device AI model.
 *
 * The teacher must never wait on this. Registration kicks it off and moves on;
 * the progress indicator is informational.
 *
 * Three outcomes, in order of preference:
 *
 *  1. **Already served here** — `/api/model/local` says the host has the model, so
 *     the device has nothing to fetch and provisioning completes instantly with
 *     the true size. This is the desktop/browser case: inference happens on the
 *     server, and pulling half a gigabyte to a laptop that will never run it
 *     locally would be pure waste.
 *  2. **A real transfer** — when the device has to run the model itself (the
 *     native app) or the host has no model to serve, the GGUF is streamed from
 *     `/api/model/local/bundle`: ranged, resumable, and verified against the
 *     SHA-256 the server reports. See `model-store.ts` for where the bytes land
 *     and `digest.ts` for why verification is incremental.
 *  3. **The simulated ticker** — a host with no bundle to send. It stays because
 *     the honest failure is still a functioning UI, and it says so.
 */
import { STORAGE_KEYS } from "./keys";
import { readEncrypted, writeEncrypted } from "./crypto";
import { createByteHasher } from "./digest";
import { CHUNK_BYTES, getModelSink, resetModelSink } from "./model-store";

export type ModelStatus = "idle" | "downloading" | "ready" | "error";

export interface ModelState {
  status: ModelStatus;
  /** 0–100 */
  progress: number;
  bytesDownloaded: number;
  totalBytes: number;
  updatedAt: number;
  /** Result of the server-side probe, when it ran. */
  detail?: string;
  /** True when a locally installed model was detected rather than transferred. */
  local?: boolean;
  /** True when bytes were streamed to this device rather than found here. */
  transferred?: boolean;
  /** Whether the transferred bytes matched the server's digest. */
  verified?: boolean;
  /** Where the bytes went, when they were transferred. */
  sink?: "native" | "web";
  error?: string;
}

/**
 * Size used for the simulated path. Matches the qwen2.5-0.5b-instruct Q4_K_M
 * GGUF this project ships against, so even the fallback shows a truthful number.
 */
export const MODEL_SIZE_BYTES = 491_400_032;

const IDLE: ModelState = {
  status: "idle",
  progress: 0,
  bytesDownloaded: 0,
  totalBytes: MODEL_SIZE_BYTES,
  updatedAt: 0,
};

export function getModelState(): ModelState {
  return readEncrypted<ModelState>(STORAGE_KEYS.localModel) ?? IDLE;
}

export function isModelReady(): boolean {
  return getModelState().status === "ready";
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${Math.round(bytes / 1e3)} KB`;
}

interface HostedModelStatus {
  ready: boolean;
  sizeBytes: number | null;
  detail?: string;
  /** Whether this host can stream the GGUF to a device that must run it itself. */
  transferable?: boolean;
  /** Exact byte count of that file. */
  transferBytes?: number | null;
}

async function probeHostedModel(): Promise<HostedModelStatus | null> {
  try {
    const res = await fetch("/api/model/local", { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as HostedModelStatus;
  } catch {
    // Offline, or the route is unreachable — fall through to the simulated path.
    return null;
  }
}

/**
 * Whether to pull the model onto this device when the host could also serve it.
 *
 * `auto` is the honest default — a browser that can use the server's model does,
 * and the native app always takes its own copy because its whole point is working
 * with no server. The other two exist to exercise the transfer on a desktop, where
 * the model is already installed and the real path would otherwise never run.
 */
function transferPolicy(): "auto" | "always" | "native" {
  const configured = process.env.NEXT_PUBLIC_MODEL_TRANSFER;
  return configured === "always" || configured === "native" ? configured : "auto";
}

function wantsTransfer(hosted: HostedModelStatus | null): boolean {
  if (hosted?.transferable && hosted.transferBytes) return true;
  switch (transferPolicy()) {
    case "always":
      return true;
    case "native":
      return isNativePlatform() || !hosted?.ready;
    default:
      return isNativePlatform() || !hosted?.ready;
  }
}

function isNativePlatform(): boolean {
  const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

const TICK_MS = 220;
const TICKS = 40; // ~8.8s simulated transfer

function runSimulatedTransfer(publish: (s: ModelState) => void): () => void {
  let tick = 0;

  publish({
    ...IDLE,
    status: "downloading",
    detail: "Preparing the on-device model in the background.",
    updatedAt: Date.now(),
  });

  const interval = window.setInterval(() => {
    tick += 1;
    const progress = Math.min(100, Math.round((tick / TICKS) * 100));

    publish({
      status: progress >= 100 ? "ready" : "downloading",
      progress,
      bytesDownloaded: Math.round((MODEL_SIZE_BYTES * progress) / 100),
      totalBytes: MODEL_SIZE_BYTES,
      detail: progress >= 100 ? "Ready for offline inference." : undefined,
      updatedAt: Date.now(),
    });

    if (progress >= 100) window.clearInterval(interval);
  }, TICK_MS);

  return () => window.clearInterval(interval);
}

/**
 * Stream the GGUF onto this device.
 *
 * Resumable by asking the sink what it already holds and sending that as the
 * `Range` offset — never a counter kept in localStorage, so a cleared cache means
 * starting over rather than resuming into a hole.
 *
 * The digest is fed as bytes arrive rather than hashed at the end. Hashing at the
 * end would stall the progress bar at 100% for as long as the hash takes on a
 * phone, which reads as a hang.
 */
function runBundledTransfer(
  totalBytes: number,
  publish: (state: ModelState) => void,
  isCancelled: () => boolean
): { cancel: () => void } {
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  void (async () => {
    const fail = (message: string) => {
      publish({
        status: "error",
        progress: 0,
        bytesDownloaded: 0,
        totalBytes,
        error: message,
        detail: message,
        updatedAt: Date.now(),
      });
    };

    try {
      const sink = await getModelSink();

      let received = await sink.bytesReceived();
      if (received > totalBytes) {
        // Something else is sitting in the store — a different build's model, or a
        // partial from a longer file. It cannot be resumed against this one.
        await sink.clear();
        received = 0;
      }

      const hasher = createByteHasher();
      if (received > 0) {
        // Re-hash what is already stored so the digest still covers the whole
        // file. Costs a pass over the partial on resume, which is the price of
        // verifying a file that arrived in pieces.
        await sink.readAll((chunk) => hasher.update(chunk));
      }

      publish({
        status: "downloading",
        progress: Math.round((received / totalBytes) * 100),
        bytesDownloaded: received,
        totalBytes,
        sink: sink.kind,
        detail:
          received > 0
            ? `Resuming at ${formatBytes(received)} — already downloaded, not charged twice.`
            : "Downloading the on-device model…",
        updatedAt: Date.now(),
      });

      const cdnUrl =
        process.env.NEXT_PUBLIC_MODEL_DOWNLOAD_URL ||
        "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf";

      let res: Response;
      try {
        res = await fetch("/api/model/local/bundle", {
          cache: "no-store",
          headers: received > 0 ? { Range: `bytes=${received}-` } : {},
        });
        if (res.status !== 200 && res.status !== 206) {
          throw new Error("Local route unavailable");
        }
      } catch {
        // Fall back directly to the high-speed CDN hosted model
        res = await fetch(cdnUrl, {
          cache: "no-store",
          headers: received > 0 ? { Range: `bytes=${received}-` } : {},
        });
      }

      if (res.status !== 200 && res.status !== 206) {
        fail("The model host has nothing to send right now.");
        return;
      }
      const expectedDigest = res.headers.get("X-Model-Sha256");
      if (!res.body) {
        fail("The model transfer could not be opened.");
        return;
      }

      reader = res.body.getReader();
      let pending: Uint8Array[] = [];
      let pendingBytes = 0;

      const flush = async () => {
        if (pendingBytes === 0) return;
        const chunk = new Uint8Array(pendingBytes);
        let offset = 0;
        for (const part of pending) {
          chunk.set(part, offset);
          offset += part.byteLength;
        }
        pending = [];
        pendingBytes = 0;

        await sink.append(chunk);
        hasher.update(chunk);
        received += chunk.byteLength;
        publish({
          status: "downloading",
          progress: Math.round((received / totalBytes) * 100),
          bytesDownloaded: received,
          totalBytes,
          sink: sink.kind,
          updatedAt: Date.now(),
        });
      };

      for (;;) {
        const { done, value } = await reader.read();
        if (isCancelled()) {
          // Keep what was written: the next attempt resumes from it.
          await reader.cancel().catch(() => {});
          return;
        }
        if (done) break;
        if (!value?.byteLength) continue;

        pending.push(value);
        pendingBytes += value.byteLength;
        if (pendingBytes >= CHUNK_BYTES) await flush();
      }
      await flush();

      if (received !== totalBytes) {
        // A short read with a 200/206 is a truncated transfer, not a completed one.
        // Reported as an error so the wizard does not call it ready; the bytes stay
        // on disk for a resume.
        fail(
          `The model transfer stopped early (${formatBytes(received)} of ${formatBytes(totalBytes)}). It will continue next time.`
        );
        return;
      }

      let verified: boolean | undefined;
      if (expectedDigest) {
        verified = hasher.hex() === expectedDigest.toLowerCase();
        if (!verified) {
          // A corrupt file is worse than no file: it loads and then misbehaves.
          // Wipe it so the next attempt starts clean instead of "resuming" onto
          // bytes that will never verify.
          await sink.clear();
          fail("The downloaded model failed its integrity check. Please try again.");
          return;
        }
      }

      publish({
        status: "ready",
        progress: 100,
        bytesDownloaded: received,
        totalBytes,
        transferred: true,
        sink: sink.kind,
        ...(verified === undefined ? {} : { verified }),
        detail: verified
          ? "Model downloaded and verified — it runs on this device with no connection."
          : "Model downloaded. No checksum was offered by the host.",
        updatedAt: Date.now(),
      });
    } catch (err) {
      fail(`The model download could not finish: ${(err as Error).message}`);
    }
  })();

  return {
    cancel: () => {
      void reader?.cancel().catch(() => {});
    },
  };
}

/**
 * Start provisioning. Returns a cancel function. Safe to call twice — the second
 * call is a no-op while one is in flight or already complete.
 */
export function provisionLocalModel(onProgress?: (state: ModelState) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const current = getModelState();
  if (current.status === "ready" || current.status === "downloading") return () => {};

  let cancelled = false;
  let stopTicker: null | (() => void) = null;
  let stopTransfer: null | (() => void) = null;

  const publish = (state: ModelState) => {
    if (cancelled) return;
    writeEncrypted(STORAGE_KEYS.localModel, state);
    onProgress?.(state);
  };

  void (async () => {
    const hosted = await probeHostedModel();
    if (cancelled) return;

    if (wantsTransfer(hosted)) {
      const totalBytes = hosted?.transferBytes ?? MODEL_SIZE_BYTES;
      stopTransfer = runBundledTransfer(totalBytes, publish, () => cancelled).cancel;
      return;
    }

    if (hosted?.ready) {
      // Already installed on the model host — nothing to transfer.
      const totalBytes = hosted.sizeBytes ?? MODEL_SIZE_BYTES;
      publish({
        status: "ready",
        progress: 100,
        bytesDownloaded: totalBytes,
        totalBytes,
        local: true,
        detail: hosted.detail ?? "Local model detected.",
        updatedAt: Date.now(),
      });
      return;
    }

    stopTicker = runSimulatedTransfer(publish);
  })();

  return () => {
    cancelled = true;
    stopTicker?.();
    stopTransfer?.();
  };
}

/**
 * Throw away a transferred model — the partial case as much as a complete one.
 *
 * A wiped store has to reset the memoised sink too, otherwise the next attempt
 * would keep using a handle to the rows that were just deleted.
 */
export async function discardTransferredModel(): Promise<void> {
  const sink = await getModelSink();
  await sink.clear();
  resetModelSink();
  writeEncrypted(STORAGE_KEYS.localModel, IDLE);
}
