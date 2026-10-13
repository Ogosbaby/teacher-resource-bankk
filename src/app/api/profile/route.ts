import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

const patchSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  classLevels: z.array(z.string()).optional(),
  subjects: z.array(z.string()).optional(),
});

/** Update the signed-in teacher's own profile. Never accepts an email or role change. */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid profile data." }, { status: 400 });
  }

  const { name, classLevels, subjects } = parsed.data;
  await db
    .update(users)
    .set({
      ...(name !== undefined ? { name } : {}),
      ...(classLevels !== undefined ? { classLevels } : {}),
      ...(subjects !== undefined ? { subjects } : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ ok: true });
}
