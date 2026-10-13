import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { getActiveSubscription } from "@/lib/services/subscriptions.service";

/**
 * Guards for API route handlers.
 *
 * The middleware matcher deliberately excludes /api (it must stay Edge-safe and
 * DB-free), so route handlers cannot rely on it for authorization and must check
 * here instead.
 *
 * Usage:
 *   const guard = await requireTeacherApi();
 *   if ("error" in guard) return guard.error;
 *   guard.session.user.id
 */

/**
 * Any signed-in user. For resources gated by auth alone — certificates and
 * billing — which must stay reachable after a subscription lapses.
 */
export async function requireSessionApi() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  return { session } as const;
}

/**
 * Operators only.
 *
 * The mirror of `requireTeacherApi`, and the guard for anything that writes to the
 * shared content the teachers read — the resource bank is published material, so
 * an upload to it is an authoring action rather than a teacher's own work.
 */
export async function requireAdminApi() {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  if (session.user.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }

  return { session } as const;
}

export async function requireTeacherApi() {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  if (session.user.role !== "teacher") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }

  return { session } as const;
}

/**
 * Teacher session AND a live subscription — mirrors the Server Component check in
 * dashboard/learn/layout.tsx for the mutation routes under it.
 */
export async function requireActiveSubscriptionApi() {
  const guard = await requireTeacherApi();
  if ("error" in guard) return guard;

  const subscription = await getActiveSubscription(guard.session.user.id);
  if (!subscription) {
    return {
      error: NextResponse.json(
        { error: "An active term pass is required for this action." },
        { status: 402 }
      ),
    } as const;
  }

  return { session: guard.session, subscription } as const;
}
