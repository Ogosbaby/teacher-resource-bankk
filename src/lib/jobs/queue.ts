import PgBoss from "pg-boss";

/**
 * Postgres-backed job queue (no Redis in this project).
 *
 * pg-boss v9 auto-creates queues on first send/work, so there is no explicit
 * createQueue step.
 */
export const QUEUES = {
  embedContent: "embed-content",
  issueCertificate: "issue-certificate",
  /** Scheduled: queues renewal reminders. Sends nothing itself. */
  renewalScan: "renewal-scan",
  /** One job per queued reminder, so a single failure retries alone. */
  renewalReminder: "renewal-reminder",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

let bossPromise: Promise<PgBoss> | null = null;

/** Lazily start a shared boss instance for the current process. */
export function getBoss(): Promise<PgBoss> {
  if (!bossPromise) {
    bossPromise = (async () => {
      const boss = new PgBoss({ connectionString: process.env.DATABASE_URL });
      boss.on("error", (err) => console.error("[pg-boss] error:", err));
      await boss.start();
      return boss;
    })().catch((err) => {
      // Allow a later call to retry instead of caching the rejection.
      bossPromise = null;
      throw err;
    });
  }
  return bossPromise;
}

/**
 * Enqueue a job, never throwing.
 *
 * Publishing content must not fail because the worker is down or the queue is
 * unreachable — the job is a nice-to-have side effect, not part of the write.
 * A failed enqueue is logged and reported via the null return.
 */
export async function enqueue<T extends object>(
  queue: QueueName,
  data: T
): Promise<string | null> {
  try {
    const boss = await getBoss();
    return await boss.send(queue, data);
  } catch (err) {
    console.error(`[pg-boss] could not enqueue "${queue}":`, err);
    return null;
  }
}
