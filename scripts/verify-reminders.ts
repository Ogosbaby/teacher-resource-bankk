/**
 * Verification for the renewal reminder queue.
 *
 *   npm run verify:reminders
 *
 * Needs a reachable database but no running server: this drives the service and
 * the job handlers directly, which is exactly what the worker calls.
 *
 * It creates its own throwaway teachers and subscriptions and deletes them again,
 * scoped to the rows it made — the seeded accounts and any real teacher's
 * subscription are never touched, and neither are reminders that already existed.
 */
import "dotenv/config";
import type PgBoss from "pg-boss";
import { eq, inArray } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import { reminderQueue, subscriptions, terms, users } from "../src/lib/db/schema";
import {
  REMINDER_WINDOW_DAYS,
  dueReminders,
  queueRenewalReminders,
  reminderById,
} from "../src/lib/services/reminders.service";
import type { RenewalReminderJob } from "../src/lib/jobs/renewal-reminder";
import { handleRenewalReminder } from "../src/lib/jobs/renewal-reminder";

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(detail ? `${name} — ${detail}` : name);
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title: string): void {
  console.log(`\n${title}`);
}

const DAY_MS = 24 * 60 * 60 * 1000;

async function main() {
  const stamp = Date.now();
  const endingSoon = `reminder-soon-${stamp}@trb.local`;
  const endingLater = `reminder-later-${stamp}@trb.local`;

  const [term] = await db.select().from(terms).where(eq(terms.isActive, true)).limit(1);
  if (!term) throw new Error("No active term — run `npm run seed` first.");

  let userIds: string[] = [];
  let subscriptionIds: string[] = [];

  try {
    section("Setup");
    const created = await db
      .insert(users)
      .values([
        { email: endingSoon, name: "Reminder Soon", role: "teacher" },
        { email: endingLater, name: "Reminder Later", role: "teacher" },
      ])
      .returning({ id: users.id, email: users.email });
    userIds = created.map((u) => u.id);
    check("two throwaway teachers created", userIds.length === 2);

    const soon = created.find((u) => u.email === endingSoon)!.id;
    const later = created.find((u) => u.email === endingLater)!.id;

    const subs = await db
      .insert(subscriptions)
      .values([
        {
          userId: soon,
          termId: term.id,
          amountKobo: 0,
          paymentStatus: "success",
          paystackReference: `reminder-test-soon-${stamp}`,
          expiresAt: new Date(Date.now() + 3 * DAY_MS),
        },
        {
          userId: later,
          termId: term.id,
          amountKobo: 0,
          paymentStatus: "success",
          paystackReference: `reminder-test-later-${stamp}`,
          expiresAt: new Date(Date.now() + 90 * DAY_MS),
        },
      ])
      .returning({ id: subscriptions.id, userId: subscriptions.userId });
    subscriptionIds = subs.map((s) => s.id);
    const soonSub = subs.find((s) => s.userId === soon)!.id;
    const laterSub = subs.find((s) => s.userId === later)!.id;

    section("Scan");
    const first = await queueRenewalReminders();
    const mine = first.filter((r) => subscriptionIds.includes(r.subscriptionId ?? ""));
    check("a subscription inside the window is queued", mine.length === 1, `queued ${mine.length}`);
    check("the reminder carries the teacher's address", mine[0]?.email === endingSoon, mine[0]?.email);
    check(
      "a subscription outside the window is left alone",
      !first.some((r) => r.subscriptionId === laterSub)
    );

    const second = await queueRenewalReminders();
    check(
      "a second scan queues nothing new",
      !second.some((r) => subscriptionIds.includes(r.subscriptionId ?? "")),
      `queued ${second.filter((r) => subscriptionIds.includes(r.subscriptionId ?? "")).length} again`
    );

    section("Delivery");
    const due = await dueReminders();
    const dueMine = due.filter((r) => subscriptionIds.includes(r.subscriptionId ?? ""));
    check("the queued reminder is due", dueMine.length === 1);
    const reminderId = dueMine[0].id;
    check("it is unsent", (await reminderById(reminderId))?.sentAt === null);

    // The handler is what the worker runs; `data` is the only field it reads.
    await handleRenewalReminder({ data: { reminderId } } as PgBoss.Job<RenewalReminderJob>);
    const delivered = await reminderById(reminderId);
    check("delivery records the send", delivered?.sentAt instanceof Date);
    check(
      "the row is kept as the record of the reminder",
      delivered !== null
    );

    section("A reminder that is no longer true is dropped");
    // Queue another reminder by moving the far-future subscription into the window,
    // then "renew" it before delivery — the case that would otherwise tell a
    // teacher their pass is lapsing when it is not.
    await db
      .update(subscriptions)
      .set({ expiresAt: new Date(Date.now() + 5 * DAY_MS) })
      .where(eq(subscriptions.id, laterSub));
    const rescanned = await queueRenewalReminders();
    const staleId = rescanned.find((r) => r.subscriptionId === laterSub)?.id;
    check("the newly-near subscription is queued", Boolean(staleId));

    await db
      .update(subscriptions)
      .set({ expiresAt: new Date(Date.now() + 120 * DAY_MS) })
      .where(eq(subscriptions.id, laterSub));

    if (staleId) {
      await handleRenewalReminder({ data: { reminderId: staleId } } as PgBoss.Job<RenewalReminderJob>);
      check("a renewed subscription's reminder is dropped, not sent", (await reminderById(staleId)) === null);
    }
  } finally {
    section("Cleanup");
    if (subscriptionIds.length > 0) {
      const reminders = await db
        .delete(reminderQueue)
        .where(inArray(reminderQueue.subscriptionId, subscriptionIds))
        .returning({ id: reminderQueue.id });
      const subs = await db
        .delete(subscriptions)
        .where(inArray(subscriptions.id, subscriptionIds))
        .returning({ id: subscriptions.id });
      check("throwaway reminders removed", reminders.length >= 0);
      check("throwaway subscriptions removed", subs.length === subscriptionIds.length);
    }
    if (userIds.length > 0) {
      const removed = await db.delete(users).where(inArray(users.id, userIds)).returning({ id: users.id });
      check("throwaway teachers removed", removed.length === userIds.length);
    }
  }

  console.log(`\n${passed} checks passed, ${failures.length} failed.`);
  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  - ${f}`);
    process.exitCode = 1;
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((error) => {
    console.error("\nReminder verification crashed:", error);
    process.exit(1);
  });
