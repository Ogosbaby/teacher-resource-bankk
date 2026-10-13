import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

const createSchema = z.object({
  mode: z.literal("create"),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  classLevels: z.array(z.string()).min(1),
  subjects: z.array(z.string()).min(1),
});

const updateSchema = z.object({
  mode: z.literal("update"),
  classLevels: z.array(z.string()).min(1),
  subjects: z.array(z.string()).min(1),
});

export async function POST(req: Request) {
  const raw = await req.json().catch(() => null);
  const parsed = z.union([createSchema, updateSchema]).safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid onboarding data." }, { status: 400 });
  }

  if (parsed.data.mode === "create") {
    const email = parsed.data.email.toLowerCase();
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const [created] = await db
      .insert(users)
      .values({
        name: parsed.data.name,
        email,
        passwordHash: await bcrypt.hash(parsed.data.password, 10),
        role: "teacher",
        classLevels: parsed.data.classLevels,
        subjects: parsed.data.subjects,
      })
      .returning();

    // No subscription is granted here any more. Entitlement is minted on the
    // device as an encrypted 3-month term pass and synced up when online.
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  // update mode — requires an authenticated session (existing account continuing the wizard)
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "You must be signed in to continue." }, { status: 401 });
  }

  await db
    .update(users)
    .set({ classLevels: parsed.data.classLevels, subjects: parsed.data.subjects, updatedAt: new Date() })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ ok: true });
}
