/**
 * Best-effort profile sync.
 *
 * Local-first means the server is optional: this is fire-and-forget, never
 * awaited by anything the teacher can see, and a failure is not surfaced because
 * nothing they did depends on it. It only does something if they already have a
 * session — otherwise the request 401s and is silently dropped.
 */
import type { ClassLevel } from "@/lib/content/curriculum";

export async function syncProfileToServer(payload: {
  name: string;
  classLevels: ClassLevel[];
  subjects: string[];
}): Promise<void> {
  try {
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Offline, or no session. Either is fine — the local term pass already
    // unlocked the app.
  }
}
