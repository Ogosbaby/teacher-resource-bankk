import type PgBoss from "pg-boss";
import { QUEUES, enqueue } from "@/lib/jobs/queue";
import { sendEmail } from "@/lib/email";
import { renewalReminderEmail } from "@/lib/email/renewal-reminder";
import {
  REMINDER_WINDOW_DAYS,
  dropReminder,
  dueReminders,
  markReminderSent,
  queueRenewalReminders,
  reminderById,
  type DueReminder,
} from "@/lib/services/reminders.service";

/**
 * Renewal reminders, as worker jobs.
 *
 * `renewal-scan` runs on a schedule (registered in `src/workers/index.ts`) and
 * only queues rows — it sends nothing, so re-running it is free. `renewal-reminder`
 * delivers one row and is retried by pg-boss, which is why every step in it has to
 * be safe to repeat.
 *
 * Delivery deliberately re-checks the subscription before sending. A reminder can
 * sit on the queue for a while, and the one thing worse than no reminder is
 * telling a teacher their pass is about to lapse after they renewed it — so a
 * reminder that is no longer true is dropped rather than sent.
 */

export interface RenewalScanJob {
  withinDays?: number;
}

export interface RenewalReminderJob {
  reminderId: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function handleRenewalScan(job: PgBoss.Job<RenewalScanJob>): Promise<void> {
  const queued = await queueRenewalReminders(job.data?.withinDays);

  // Everything due and unsent, not only what this scan just created: a reminder
  // queued by an earlier run whose delivery job was lost still gets picked up.
  const due = await dueReminders();
  for (const reminder of due) {
    await enqueue<RenewalReminderJob>(QUEUES.renewalReminder, { reminderId: reminder.id });
  }

  console.log(
    `[reminder] scan: ${queued.length} newly queued, ${due.length} due for delivery`
  );
}

export async function handleRenewalReminder(
  job: PgBoss.Job<RenewalReminderJob>
): Promise<void> {
  const reminder = await reminderById(job.data.reminderId);

  if (!reminder) {
    console.log(`[reminder] ${job.data.reminderId} no longer exists — skipping`);
    return;
  }
  if (reminder.sentAt) {
    console.log(`[reminder] ${reminder.id} already delivered — skipping`);
    return;
  }

  const now = Date.now();
  const expiresAt = reminder.expiresAt?.getTime() ?? 0;
  const stillNearingExpiry = expiresAt > now && expiresAt < now + REMINDER_WINDOW_DAYS * DAY_MS;

  if (!stillNearingExpiry) {
    // Renewed, or already lapsed while the reminder waited. Either way the message
    // would be wrong, and wrong is worse than silent.
    await dropReminder(reminder.id);
    console.log(`[reminder] ${reminder.id} dropped — the subscription is no longer near expiry`);
    return;
  }

  await deliverRenewalReminder(reminder);
  await markReminderSent(reminder.id);

  const days = Math.max(1, Math.round((expiresAt - now) / DAY_MS));
  console.log(`[reminder] renewal reminder delivered to ${reminder.email} (${days} day(s) left)`);
}

/**
 * Deliver one reminder.
 *
 * Three outcomes, and the difference between them matters:
 *
 *  - **sent** — done, and the caller marks the row.
 *  - **skipped** — no email provider is configured. Logged and treated as
 *    delivered, because retrying forever against a missing API key helps nobody,
 *    and the log is honest about what did not happen.
 *  - **failed** — the provider refused it. This *throws*, so pg-boss retries the
 *    job and the row stays unsent rather than being marked delivered for a
 *    message that never left.
 */
export async function deliverRenewalReminder(reminder: DueReminder): Promise<void> {
  const result = await sendEmail(renewalReminderEmail(reminder));

  if (result.status === "sent") {
    console.log(`[reminder] renewal reminder sent to ${reminder.email} (id ${result.id ?? "unknown"})`);
    return;
  }

  if (result.status === "skipped") {
    console.log(
      `[reminder] would email ${reminder.email}: "Your term pass ends on ` +
        `${reminder.expiresAt?.toISOString().slice(0, 10) ?? "soon"} — enter a new activation ` +
        `code to keep your courses open." (not sent: ${result.reason}; set RESEND_API_KEY to send)`
    );
    return;
  }

  throw new Error(`Could not send the renewal reminder to ${reminder.email}: ${result.error}`);
}
