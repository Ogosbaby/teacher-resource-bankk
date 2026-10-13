import { and, asc, eq, gt, isNull, lt, lte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { reminderQueue, subscriptions, users } from "@/lib/db/schema";

/**
 * Renewal reminders.
 *
 * A term pass mints entitlement on the device, so nothing about the app *stops*
 * working when one lapses — which is exactly why a lapse is easy to miss. The
 * reminders are how the teacher hears about it before it happens.
 *
 * Two steps, kept apart on purpose:
 *
 *   1. A scan (`queueRenewalReminders`) looks for subscriptions close to expiry
 *      and *queues* a row per subscription. It decides nothing about delivery and
 *      never sends anything itself, so a scan that runs twice, or on two workers
 *      at once, cannot produce two reminders — the unique index from 0008 is the
 *      backstop, and `onConflictDoNothing` is how the scan respects it.
 *   2. Delivery (`dueReminders` + `markReminderSent`) drains what the scan queued,
 *      one job per row, and is idempotent per row because pg-boss retries.
 *
 * Nothing here is awaited by a request: the scan is a scheduled worker job.
 */

/**
 * How close to expiry a subscription has to be to be worth a nudge. Two weeks is
 * long enough to act on before payday and short enough that the reminder is not
 * arriving while the teacher still has a month of access.
 */
export const REMINDER_WINDOW_DAYS = 14;

export interface DueReminder {
  id: string;
  userId: string;
  subscriptionId: string | null;
  type: string;
  channel: string;
  scheduledFor: Date;
  /** Null until delivered. The handler's guard against sending twice on a retry. */
  sentAt: Date | null;
  email: string;
  name: string;
  expiresAt: Date | null;
}

export interface ScanResult {
  /** Subscriptions that were close to expiry and did not already have a reminder. */
  queued: DueReminder[];
  /** Reminders already on the queue that are due now and unsent. */
  due: string[];
}

/**
 * Queue a renewal reminder for every active subscription expiring inside the
 * window. Returns the rows that were newly created, so the caller can fan them out
 * to the delivery queue — a reminder already queued is skipped silently, which is
 * the whole point of running this on a schedule.
 */
export async function queueRenewalReminders(
  withinDays: number = REMINDER_WINDOW_DAYS
): Promise<DueReminder[]> {
  const now = new Date();
  const cutoff = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);

  const nearing = await db
    .select({
      subscriptionId: subscriptions.id,
      userId: subscriptions.userId,
      expiresAt: subscriptions.expiresAt,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.paymentStatus, "success"),
        gt(subscriptions.expiresAt, now),
        lt(subscriptions.expiresAt, cutoff)
      )
    );

  const queued: DueReminder[] = [];

  for (const row of nearing) {
    const [created] = await db
      .insert(reminderQueue)
      .values({
        userId: row.userId,
        subscriptionId: row.subscriptionId,
        type: "renewal_reminder",
        channel: "email",
        scheduledFor: now,
      })
      .onConflictDoNothing()
      .returning({ id: reminderQueue.id });

    if (!created) continue;

    const [teacher] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, row.userId))
      .limit(1);

    queued.push({
      id: created.id,
      userId: row.userId,
      subscriptionId: row.subscriptionId,
      type: "renewal_reminder",
      channel: "email",
      scheduledFor: now,
      sentAt: null,
      email: teacher?.email ?? "",
      name: teacher?.name ?? "",
      expiresAt: row.expiresAt,
    });
  }

  return queued;
}

/** Unsent reminders that are due now, newest expiry first. */
export async function dueReminders(limit = 100): Promise<DueReminder[]> {
  const rows = await db
    .select({
      id: reminderQueue.id,
      userId: reminderQueue.userId,
      subscriptionId: reminderQueue.subscriptionId,
      type: reminderQueue.type,
      channel: reminderQueue.channel,
      scheduledFor: reminderQueue.scheduledFor,
      sentAt: reminderQueue.sentAt,
      email: users.email,
      name: users.name,
      expiresAt: subscriptions.expiresAt,
    })
    .from(reminderQueue)
    .innerJoin(users, eq(users.id, reminderQueue.userId))
    .leftJoin(subscriptions, eq(subscriptions.id, reminderQueue.subscriptionId))
    .where(and(isNull(reminderQueue.sentAt), lte(reminderQueue.scheduledFor, new Date())))
    .orderBy(asc(subscriptions.expiresAt))
    .limit(limit);

  return rows;
}

export async function reminderById(id: string): Promise<DueReminder | null> {
  const [row] = await db
    .select({
      id: reminderQueue.id,
      userId: reminderQueue.userId,
      subscriptionId: reminderQueue.subscriptionId,
      type: reminderQueue.type,
      channel: reminderQueue.channel,
      scheduledFor: reminderQueue.scheduledFor,
      sentAt: reminderQueue.sentAt,
      email: users.email,
      name: users.name,
      expiresAt: subscriptions.expiresAt,
    })
    .from(reminderQueue)
    .innerJoin(users, eq(users.id, reminderQueue.userId))
    .leftJoin(subscriptions, eq(subscriptions.id, reminderQueue.subscriptionId))
    .where(eq(reminderQueue.id, id))
    .limit(1);

  return row ?? null;
}

/**
 * Mark a reminder delivered. Guarded on `sent_at IS NULL` so a retried job cannot
 * move the timestamp of an already-delivered reminder.
 */
export async function markReminderSent(id: string): Promise<boolean> {
  const rows = await db
    .update(reminderQueue)
    .set({ sentAt: new Date() })
    .where(and(eq(reminderQueue.id, id), isNull(reminderQueue.sentAt)))
    .returning({ id: reminderQueue.id });
  return rows.length > 0;
}

/** Drop a reminder that no longer makes sense (a teacher who has since renewed). */
export async function dropReminder(id: string): Promise<boolean> {
  const rows = await db
    .delete(reminderQueue)
    .where(eq(reminderQueue.id, id))
    .returning({ id: reminderQueue.id });
  return rows.length > 0;
}
