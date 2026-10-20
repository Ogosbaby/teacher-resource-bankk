import { NextResponse } from "next/server";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // 1. Try local filesystem (self-hosted / dev)
  const candidates = [
    path.join(process.cwd(), "trb.apk"),
    path.join(process.cwd(), "public", "downloads", "trb.apk"),
    path.join(process.cwd(), "app-debug.apk"),
    path.join(process.cwd(), "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk"),
  ];

  const apkPath = candidates.find((p) => existsSync(p));

  if (apkPath) {
    const stat = statSync(apkPath);
    const stream = createReadStream(apkPath);
    const webStream = Readable.toWeb(stream) as ReadableStream;

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": 'attachment; filename="trb.apk"',
        "Content-Length": String(stat.size),
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  // 2. On Vercel, the APK is served as a static file from public/downloads/
  //    Redirect to the static path so the CDN can serve it.
  const origin = new URL(request.url).origin;
  return NextResponse.redirect(`${origin}/downloads/trb.apk`, 302);
}


export async function HEAD() {
  const candidates = [
    path.join(process.cwd(), "trb.apk"),
    path.join(process.cwd(), "public", "downloads", "trb.apk"),
    path.join(process.cwd(), "app-debug.apk"),
    path.join(process.cwd(), "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk"),
  ];

  const apkPath = candidates.find((p) => existsSync(p));

  if (!apkPath) {
    return new Response(null, { status: 404 });
  }

  const stat = statSync(apkPath);
  return new Response(null, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.android.package-archive",
      "Content-Disposition": 'attachment; filename="trb.apk"',
      "Content-Length": String(stat.size),
    },
  });
}
