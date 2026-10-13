import { NextResponse } from "next/server";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";

export const dynamic = "force-dynamic";

export async function GET() {
  const candidates = [
    path.join(process.cwd(), "trb.apk"),
    path.join(process.cwd(), "public", "downloads", "trb.apk"),
    path.join(process.cwd(), "app-debug.apk"),
    path.join(process.cwd(), "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk"),
  ];

  const apkPath = candidates.find((p) => existsSync(p));

  if (!apkPath) {
    return NextResponse.json({ error: "APK file not found on host." }, { status: 404 });
  }

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
