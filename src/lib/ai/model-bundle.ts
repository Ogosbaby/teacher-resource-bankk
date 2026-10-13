/**
 * The on-device model, as a file the server can actually hand out.
 *
 * Provisioning used to end at "the host has the model installed" — true on a
 * desktop install, useless to a phone that has to run inference by itself. This
 * module is what makes the transfer real: it locates the GGUF on disk and hands
 * back a path, a size and a content digest, which is everything a ranged,
 * resumable, verifiable download needs.
 *
 * Two sources, in order:
 *
 *   - `LOCAL_MODEL_PATH` — an explicit file. This is the one to use in
 *     production: copy the GGUF next to the app, point the env var at it, and the
 *     transfer does not depend on Ollama being installed on the app server.
 *   - Ollama's blob store — the fast path on a developer machine, where the model
 *     is already there because `ollama create qwen-local -f Modelfile` put it
 *     there. Ollama content-addresses blobs as `sha256-<digest>`, so the manifest
 *     names the exact object to serve.
 *
 * Nothing here is on the hot path of a request: the result is resolved once and
 * cached, because hashing half a gigabyte per request would be absurd.
 */
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";

export interface ModelBundle {
  /** Absolute path on this host. Never sent to a client. */
  path: string;
  sizeBytes: number;
  source: "env" | "ollama";
  /** Model tag this bundle belongs to, for the UI. */
  model: string;
}

async function readableFile(candidate: string): Promise<boolean> {
  try {
    await access(candidate);
    const info = await stat(candidate);
    return info.isFile() && info.size > 0;
  } catch {
    return false;
  }
}

function modelHostRoot(): string {
  const base = process.env.QWEN_BASE_URL || "http://localhost:11434/v1";
  return base.replace(/\/+$/, "").replace(/\/v1$/, "");
}

/**
 * `qwen-local:latest` -> `library/qwen-local` + tag `latest`.
 *
 * Ollama files namespaced models under their namespace and un-namespaced ones
 * under `library/`, so both shapes have to be reconstructed from the tag.
 */
function manifestLocation(model: string): { dir: string; tag: string } {
  const [name, tag = "latest"] = model.split(":");
  const segments = name.split("/");
  return {
    dir: segments.length > 1 ? segments.join(path.sep) : path.join("library", name),
    tag,
  };
}

/**
 * Find the model blob through Ollama's manifest.
 *
 * The manifest is read rather than guessed at because `/api/tags` reports the
 * *manifest* digest, not the blob's — the layer list is the only place the
 * weight file's digest appears.
 */
async function fromOllama(): Promise<string | null> {
  const model = process.env.QWEN_MODEL || "qwen-local";

  try {
    const res = await fetch(`${modelHostRoot()}/api/tags`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;

    const body = (await res.json()) as { models?: { name?: string }[] };
    const installed = (body.models ?? []).find(
      (m) => m.name?.replace(/:latest$/, "") === model.replace(/:latest$/, "")
    );
    if (!installed?.name) return null;

    const modelsDir =
      process.env.OLLAMA_MODELS || path.join(homedir(), ".ollama", "models");
    const { dir, tag } = manifestLocation(installed.name);
    const manifestPath = path.join(
      modelsDir,
      "manifests",
      "registry.ollama.ai",
      dir,
      tag
    );

    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      layers?: { mediaType?: string; digest?: string }[];
    };
    const weights = (manifest.layers ?? []).find((layer) =>
      layer.mediaType?.endsWith(".image.model")
    );
    if (!weights?.digest) return null;

    const blob = path.join(modelsDir, "blobs", weights.digest.replace(":", "-"));
    return (await readableFile(blob)) ? blob : null;
  } catch {
    // Ollama absent, manifest unreadable, permissions — all mean "no bundle".
    return null;
  }
}

async function sha256File(filePath: string): Promise<string | null> {
  try {
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(filePath)) hash.update(chunk as Buffer);
    return hash.digest("hex");
  } catch {
    return null;
  }
}

let cached: ModelBundle | null | undefined;

/**
 * Locate (and cache) the servable model file. `undefined` means "not looked up
 * yet"; `null` means "looked up, and there is nothing to send" — a distinction
 * worth keeping, so a missing file is not re-checked on every request.
 *
 * Cheap: no hashing. The readiness probe runs this on every registration and must
 * not pay a half-gigabyte read for an answer that is one `stat` away.
 */
export async function resolveModelBundle(): Promise<ModelBundle | null> {
  if (cached !== undefined) return cached;

  const model = process.env.QWEN_MODEL || "qwen-local";
  const explicit = process.env.LOCAL_MODEL_PATH?.trim();
  let resolved: { path: string; source: ModelBundle["source"] } | null = null;

  if (explicit) {
    const absolute = path.resolve(explicit);
    if (await readableFile(absolute)) resolved = { path: absolute, source: "env" };
  }
  if (!resolved) {
    const desktopModel = path.join(homedir(), "Desktop", "qwen-model", "qwen2.5-0.5b-instruct-q4_k_m.gguf");
    if (await readableFile(desktopModel)) {
      resolved = { path: desktopModel, source: "env" };
    }
  }
  if (!resolved) {
    const viaOllama = await fromOllama();
    if (viaOllama) resolved = { path: viaOllama, source: "ollama" };
  }

  if (!resolved) {
    cached = null;
    return cached;
  }

  const info = await stat(resolved.path);
  cached = {
    path: resolved.path,
    sizeBytes: info.size,
    source: resolved.source,
    model,
  };
  return cached;
}

let cachedDigest: string | null | undefined;

/**
 * SHA-256 of the bundle, computed once per process on demand.
 *
 * On demand rather than during resolution because the client only needs it when
 * it is actually receiving bytes — and hashing 491 MB to answer "is the model
 * installed?" would be the kind of latency that shows up as a hang in the
 * registration wizard.
 *
 * A digest the client cannot check would make this feature untrustworthy in
 * exactly the case it exists for: a transfer resumed across a flaky connection,
 * where the failure mode is a truncated model that loads and then misbehaves.
 */
export async function modelBundleDigest(bundle: ModelBundle): Promise<string | null> {
  if (cachedDigest !== undefined) return cachedDigest;
  cachedDigest = await sha256File(bundle.path);
  return cachedDigest;
}

/** A byte range of the bundle as a web stream, for a route handler's body. */
export function modelBundleStream(
  bundle: ModelBundle,
  start: number,
  end: number
): ReadableStream<Uint8Array> {
  return Readable.toWeb(
    createReadStream(bundle.path, { start, end })
  ) as unknown as ReadableStream<Uint8Array>;
}
