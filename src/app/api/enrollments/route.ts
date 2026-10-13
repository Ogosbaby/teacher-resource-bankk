import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { enroll } from "@/lib/services/enrollments.service";

const schema = z.object({ courseId: z.string().min(1) });

/** Enroll the teacher in a course (online or local). */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid courseId is required." }, { status: 400 });
  }

  const { courseId } = parsed.data;

  try {
    const session = await auth();
    if (session?.user?.id) {
      const id = await enroll(session.user.id, courseId);
      if (id) {
        return NextResponse.json({ ok: true, enrollmentId: id }, { status: 201 });
      }
    }
  } catch (err) {
    // Proceed to return client enrollment ID if DB is unavailable or id isn't in DB
  }

  return NextResponse.json({
    ok: true,
    enrollmentId: `local-${courseId}`,
    isLocal: true,
  }, { status: 200 });
}
