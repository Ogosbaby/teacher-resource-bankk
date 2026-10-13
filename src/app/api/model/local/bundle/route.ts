import { NextResponse } from "next/server";
import {
  modelBundleDigest,
  modelBundleStream,
  resolveModelBundle,
} from "@/lib/ai/model-bundle";

/**
 * Stream the on-device model to a client that has to run inference by itself.
 *
 * Ranged on purpose. Half a gigabyte over a phone connection *will* be
 * interrupted, and the alternative to `Range` is starting again from zero — which
 * on a Nigerian mobile data bundle is a cost the teacher pays. The client sends
 * `Range: bytes=<received>-` and gets the rest; a bare GET is answered as a 200
 * with the whole file, so `curl` and a plain browser download still work.
 *
 * Unauthenticated, matching the probe route beside it: the registration wizard
 * asks for this *before* an account exists, and the payload is an open-weight
 * model file plus its size and digest. There is nothing user-specific in it.
 *
 * The digest travels in a header so a client can verify what it assembled rather
 * than trusting the connection it came over.
 */
export const dynamic = "force-dynamic";

function notAvailable(detail: string) {
  return NextResponse.json({ error: detail }, { status: 404 });
}

export async function GET(req: Request) {
  const bundle = await resolveModelBundle();
  if (!bundle) {
    return notAvailable(
      "No model bundle on this host. Set LOCAL_MODEL_PATH, or install the model in Ollama."
    );
  }

  const total = bundle.sizeBytes;
  const rangeHeader = req.headers.get("range");
  const isRange = Boolean(rangeHeader);

  let start = 0;
  let end = total - 1;

  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
    if (!match) {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${total}` },
      });
    }

    // `bytes=<n>-` is what a resuming client sends; `bytes=-<n>` (a suffix range)
    // is not something this feature asks for, and answering it as "the whole file"
    // would be a silent lie about the range served.
    if (match[1] === "") return notAvailable("Suffix ranges are not supported.");
    start = Number.parseInt(match[1], 10);
    if (match[2] !== "") end = Number.parseInt(match[2], 10);

    if (
      Number.isNaN(start) ||
      Number.isNaN(end) ||
      start < 0 ||
      start >= total ||
      end < start
    ) {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${total}` },
      });
    }
    end = Math.min(end, total - 1);
  }

  const length = end - start + 1;

  const headers: Record<string, string> = {
    "Content-Type": "application/octet-stream",
    "Content-Disposition": 'attachment; filename="qwen2.5-0.5b-instruct-q4_k_m.gguf"',
    "Content-Length": String(length),
    "Accept-Ranges": "bytes",
    // Immutable: the digest is part of the entity tag, so a changed file gets a
    // different tag instead of being served stale from a cache.
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Model-Name": bundle.model,
    "X-Model-Size": String(total),
  };
  // Only hashed when there is a body to go with it — see the note on
  // `modelBundleDigest`. Sent on every chunk so a client that resumes can still
  // learn what it is reassembling.
  const digest = await modelBundleDigest(bundle);
  if (digest) headers["X-Model-Sha256"] = digest;
  if (isRange) headers["Content-Range"] = `bytes ${start}-${end}/${total}`;

  return new Response(modelBundleStream(bundle, start, end), {
    status: isRange ? 206 : 200,
    headers,
  });
}

/** Lets a client ask "is there anything to fetch?" without opening a stream. */
export async function HEAD() {
  const bundle = await resolveModelBundle();
  if (!bundle) return new NextResponse(null, { status: 404 });

  // HEAD stays cheap: no digest, because a HEAD is the "is anything there?"
  // question and hashing the file to answer it would defeat the point.
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Content-Length": String(bundle.sizeBytes),
      "Accept-Ranges": "bytes",
      "X-Model-Name": bundle.model,
      "X-Model-Source": bundle.source,
    },
  });
}
