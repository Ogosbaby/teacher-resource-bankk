import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveSubscriptionApi } from "@/lib/auth/api-guards";
import { apiError } from "@/lib/api/respond";
import {
  completeCourse,
  getEnrollmentOwnedBy,
  moduleBelongsToEnrollment,
  setModuleProgress,
} from "@/lib/services/enrollments.service";

const patchSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("progress"),
    moduleId: z.string().uuid(),
    completed: z.boolean(),
  }),
  z.object({ mode: z.literal("complete") }),
]);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireActiveSubscriptionApi();
  if ("error" in guard) return guard.error;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Ownership is checked first so one teacher can never touch another's progress.
  const enrollment = await getEnrollmentOwnedBy(guard.session.user.id, params.id);
  if (!enrollment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    if (parsed.data.mode === "progress") {
      const belongs = await moduleBelongsToEnrollment(params.id, parsed.data.moduleId);
      if (!belongs) {
        return NextResponse.json(
          { error: "That module is not part of this course." },
          { status: 400 }
        );
      }
      await setModuleProgress(params.id, parsed.data.moduleId, parsed.data.completed);
      return NextResponse.json({ ok: true });
    }

    const result = await completeCourse(guard.session.user.id, params.id);
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: "Finish every module before completing the course.",
          remainingModules: result.remainingModules,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      alreadyCompleted: result.alreadyCompleted ?? false,
      certificateQueued: result.certificateQueued ?? false,
    });
  } catch (err) {
    return apiError(err);
  }
}
