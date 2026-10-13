import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { getActiveSubscription } from "@/lib/services/subscriptions.service";
import type { UserRole } from "@/types/next-auth";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  return session;
}

/**
 * Role gate for the internal LMS.
 *
 * There is no customer-facing admin area any more: course authoring, customers,
 * payments, activation codes and app releases all live behind this gate, and a
 * customer who lands here is sent to the app instead.
 */
export async function requireRole(role: UserRole | UserRole[]) {
  const session = await requireSession();
  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(session.user.role)) redirect("/courses");
  return session;
}

/** Any internal operator — admin or sales agent. */
export async function requireInternal() {
  return requireRole(["admin", "sales_agent"]);
}

/**
 * Publishing content is an admin action. A sales agent can register customers
 * and issue codes but must not be able to ship unreviewed course material.
 */
export async function requireContentAdmin() {
  return requireRole("admin");
}

/** Live DB check. Used only in dashboard/learn/layout.tsx and mutation routes.
 *  Certificates + billing pages must NEVER call this — auth only, by design. */
export async function requireActiveSubscription() {
  const session = await requireSession();
  const subscription = await getActiveSubscription(session.user.id);
  if (!subscription) redirect("/dashboard/billing?reason=inactive");
  return { session, subscription };
}
