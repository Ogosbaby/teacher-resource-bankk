import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = body?.email?.toLowerCase?.();
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  return NextResponse.json({ exists: existing.length > 0 });
}
