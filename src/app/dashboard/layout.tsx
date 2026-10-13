import { requireInternal } from "@/lib/auth/guards";
import { getLatestSubscription } from "@/lib/services/subscriptions.service";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import type { NavNotification } from "@/components/layout/top-nav";

export const dynamic = "force-dynamic";

// Applies to EVERYTHING under /dashboard: the Learn tab, my-learning, billing,
// certificates and the nested /dashboard/learn/* subtree.
//
// Internal operator gating only: customers must use the Android application.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireInternal();

  return (
    <DashboardShell notifications={await renewalNotifications(session.user.id)}>
      {children}
    </DashboardShell>
  );
}

/** Real notifications derived from the live subscription row — nothing hardcoded. */
async function renewalNotifications(
  userId: string,
): Promise<NavNotification[]> {
  const sub = await getLatestSubscription(userId);
  if (!sub?.expiresAt || sub.paymentStatus !== "success") return [];

  const daysLeft = Math.ceil(
    (new Date(sub.expiresAt).getTime() - Date.now()) / 86_400_000,
  );
  if (daysLeft > 30) return [];

  return [
    {
      id: "renewal",
      title:
        daysLeft > 0
          ? `Your term pass expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`
          : "Your term pass has expired",
      detail: "Renew to keep course, resource bank, and assistant access.",
    },
  ];
}
