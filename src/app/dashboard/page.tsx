import { redirect } from "next/navigation";

// "Learn" is the default active tab, so /dashboard lands there. The Learn
// subtree enforces the subscription check, which bounces lapsed teachers to
// /dashboard/billing instead — no redirect loop, since billing sits outside it.
export default function DashboardIndexPage() {
  redirect("/dashboard/learn");
}
