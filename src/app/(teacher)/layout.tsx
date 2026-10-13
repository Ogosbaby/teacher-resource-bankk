import { auth } from "@/lib/auth/config";
import { getLatestSubscription } from "@/lib/services/subscriptions.service";
import { TeacherShell } from "@/components/layout/teacher-shell";
import type { SubscriptionState } from "@/components/layout/subscription-badge";

export const dynamic = "force-dynamic";

/**
 * Teacher-facing layout — wraps ALL teacher pages (homepage, subjects, courses, etc.)
 * This is a public layout: guests see it without auth, logged-in users see subscription status.
 */
export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isLoggedIn = !!session?.user;

  let subscriptionState: SubscriptionState = "none";
  let subscriptionDaysLeft: number | undefined;

  if (isLoggedIn) {
    const sub = await getLatestSubscription(session!.user.id);
    if (sub?.expiresAt && sub.paymentStatus === "success") {
      const daysLeft = Math.ceil(
        (new Date(sub.expiresAt).getTime() - Date.now()) / 86_400_000,
      );
      if (daysLeft > 14) {
        subscriptionState = "active";
      } else if (daysLeft > 0) {
        subscriptionState = "expiring";
        subscriptionDaysLeft = daysLeft;
      } else {
        subscriptionState = "expired";
      }
    } else if (sub) {
      subscriptionState = "expired";
    }
  }

  return (
    <TeacherShell
      isLoggedIn={isLoggedIn}
      userName={isLoggedIn ? (session!.user.name ?? undefined) : undefined}
      userRole={session?.user?.role}
      subscriptionState={subscriptionState}
      subscriptionDaysLeft={subscriptionDaysLeft}
    >
      {children}
    </TeacherShell>
  );
}
