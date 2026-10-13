import { requireActiveSubscription } from "@/lib/auth/guards";

// Wraps ONLY /dashboard/learn/* (courses, paths, resources, chat).
// Real folder, not a route group — the whole reason we're not using
// parentheses anymore is to avoid invisible-folder URL collisions.
export default async function LearnLayout({ children }: { children: React.ReactNode }) {
  await requireActiveSubscription();
  return <>{children}</>;
}
