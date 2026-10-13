import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { subscriptions, terms } from "@/lib/db/schema";

export type Subscription = typeof subscriptions.$inferSelect;

/**
 * Server-side subscription reads.
 *
 * The 45-day demo grant that used to live here is gone. Entitlement is now
 * minted on the device as an encrypted term pass (`@/lib/offline/term-pass`) and
 * synced up to this table when a connection is available — so the server mirrors
 * the device's pass rather than inventing one.
 */

/** Live DB check — the only thing requireActiveSubscription trusts. */
export async function getActiveSubscription(userId: string): Promise<Subscription | null> {
  const rows = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.paymentStatus, "success"),
        gt(subscriptions.expiresAt, new Date())
      )
    )
    .orderBy(desc(subscriptions.expiresAt))
    .limit(1);
  return rows[0] ?? null;
}

/** Latest sub regardless of status — for the billing page display. */
export async function getLatestSubscription(userId: string): Promise<Subscription | null> {
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Find the subscription a given sync reference was already applied to. The route
 * uses this to tell "my own retry" apart from "someone else redeemed this code".
 */
export async function findSubscriptionByReference(reference: string): Promise<Subscription | null> {
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.paystackReference, reference))
    .limit(1);
  return row ?? null;
}

function addMonths(from: number, months: number): number {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d.getTime();
}

/**
 * Resolve the term a device-minted pass belongs to, creating a rolling one if no
 * term is currently active. `subscriptions.termId` is NOT NULL, so every pass a
 * device syncs has to land inside some term.
 */
async function getOrCreateActiveTerm() {
  const [active] = await db.select().from(terms).where(eq(terms.isActive, true)).limit(1);
  if (active) return active;

  const now = new Date();
  const end = new Date(now);
  end.setMonth(end.getMonth() + 4);
  const academicYear = `${now.getFullYear()}/${now.getFullYear() + 1}`;

  const [created] = await db
    .insert(terms)
    .values({
      academicYear,
      termNumber: 1,
      name: `${academicYear} — Term 1 (device pass)`,
      startDate: now.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      isActive: true,
    })
    .onConflictDoNothing()
    .returning();
  if (created) return created;

  // Lost a race with a concurrent caller — take whichever term won.
  const [fallback] = await db.select().from(terms).where(eq(terms.isActive, true)).limit(1);
  return fallback;
}

/**
 * Mirror a device-minted term pass onto the server.
 *
 * Two things make this safe to retry:
 *
 *  - `reference` is the idempotency key. Re-syncing the same code (or the same
 *    device's demo pass) resolves to the same reference and returns the existing
 *    row instead of granting a second term. Without it, every retry — and the
 *    client is designed to retry whenever it comes back online — would silently
 *    extend the subscription.
 *  - `months` is decided by the caller from a **signed** code, never accepted
 *    from the client payload. See /api/subscriptions/sync.
 *
 * The expiry deliberately extends from the current active expiry rather than from
 * now, so syncing early never costs a teacher time they already paid for.
 */
export async function syncTermPassForUser(
  userId: string,
  { reference, months }: { reference: string; months: number }
): Promise<Subscription> {
  const [alreadySynced] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.paystackReference, reference))
    .limit(1);
  if (alreadySynced) return alreadySynced;

  const term = await getOrCreateActiveTerm();
  if (!term) throw new Error("Could not resolve an active term for the term pass.");

  const current = await getActiveSubscription(userId);
  const base =
    current?.expiresAt && current.expiresAt.getTime() > Date.now()
      ? current.expiresAt.getTime()
      : Date.now();
  const expiresAt = new Date(addMonths(base, months));

  const [row] = await db
    .insert(subscriptions)
    .values({
      userId,
      termId: term.id,
      amountKobo: 0,
      paymentStatus: "success",
      paystackReference: reference,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: [subscriptions.userId, subscriptions.termId],
      set: {
        paymentStatus: "success",
        expiresAt,
        paystackReference: reference,
        updatedAt: new Date(),
      },
    })
    .returning();

  return row;
}
