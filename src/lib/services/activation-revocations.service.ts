import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { activationRevocations, subscriptions } from "@/lib/db/schema";
import { normaliseCode } from "@/lib/offline/device";
import type { RevocationEntry } from "@/lib/offline/activation-revocations";

/**
 * Server-side activation-code revocation.
 *
 * This table is the source of truth for "which codes have been cancelled", and
 * both delivery channels are derived from it: the sync route reports the list to
 * devices that check in, and `npm run codes:revoke` re-signs the list that ships
 * in the bundle. Nothing here decides entitlement — a revocation only ever
 * removes access, so a device acting on a stale list is a teacher who keeps
 * access a little longer, which is the safe direction to fail in.
 */

export interface RevokeResult {
  revocation: RevocationEntry;
  /** True when a server-side subscription for this code was marked refunded. */
  subscriptionRevoked: boolean;
}

export interface UnrevokeResult {
  removed: boolean;
  subscriptionRestored: boolean;
}

/** Cap on a single response. The table holds cancellations, not history. */
const MAX_REVOCATIONS = 500;

/**
 * The `paystackReference` a synced code is filed under. Shared with
 * `/api/subscriptions/sync` so the row a revocation has to find is the row the
 * sync actually wrote — the format is a join key, not a label.
 */
export function codeReference(code: string): string {
  return `code:${normaliseCode(code)}`;
}

function toEntry(row: typeof activationRevocations.$inferSelect): RevocationEntry {
  return {
    code: row.code,
    reason: row.reason,
    revokedAt: row.revokedAt.toISOString(),
  };
}

/** Newest first, so a capped response still carries the most recent cancellations. */
export async function listRevocations(limit = MAX_REVOCATIONS): Promise<RevocationEntry[]> {
  const rows = await db
    .select()
    .from(activationRevocations)
    .orderBy(desc(activationRevocations.revokedAt))
    .limit(limit);
  return rows.map(toEntry);
}

export async function isCodeRevoked(code: string): Promise<boolean> {
  const [row] = await db
    .select({ code: activationRevocations.code })
    .from(activationRevocations)
    .where(eq(activationRevocations.code, normaliseCode(code)))
    .limit(1);
  return Boolean(row);
}

/**
 * Cancel a code.
 *
 * Deliberately idempotent and first-write-wins (`onConflictDoNothing`): the reason
 * and timestamp recorded the first time are the ones that stand, because a second
 * revocation of the same code is a duplicate report, not a new event. That also
 * matches the device-side store, which keeps the first reason it was given.
 *
 * Cancelling the code is not enough on its own: a device stops honouring it, but
 * the subscription it was redeemed into is still sitting there as `success`, and
 * `getActiveSubscription` — the only thing the subscription gate trusts — would
 * keep letting that account into the learning area from any other phone. So the
 * matching row is marked `refunded` in the same breath. `expiresAt` is left
 * exactly as it was: what was granted stays on the record, both for billing and
 * so an undo has something to restore.
 */
export async function revokeActivationCode({
  code,
  reason,
  revokedBy = null,
}: {
  code: string;
  reason: string;
  revokedBy?: string | null;
}): Promise<RevokeResult> {
  const normalised = normaliseCode(code);

  await db
    .insert(activationRevocations)
    .values({ code: normalised, reason, revokedBy })
    .onConflictDoNothing();

  const [row] = await db
    .select()
    .from(activationRevocations)
    .where(eq(activationRevocations.code, normalised))
    .limit(1);

  const refunded = await db
    .update(subscriptions)
    .set({ paymentStatus: "refunded", updatedAt: new Date() })
    .where(eq(subscriptions.paystackReference, codeReference(normalised)))
    .returning({ id: subscriptions.id });

  return { revocation: toEntry(row), subscriptionRevoked: refunded.length > 0 };
}

/**
 * Undo a revocation.
 *
 * Two limits worth knowing before reaching for it. On the **server** the restore
 * cannot tell a revocation-refund from a real refund — both are just
 * `paymentStatus = 'refunded'` — so it restores rows in that state and could
 * therefore re-open an account that was refunded for a genuine chargeback. And on
 * the **device** nothing changes at all: a phone that already learned about the
 * revocation keeps refusing the code, because the store is monotonic and the sync
 * response never removes an entry. So undo helps the next install, not the phones
 * already out there.
 */
export async function unrevokeActivationCode(code: string): Promise<UnrevokeResult> {
  const normalised = normaliseCode(code);

  const removed = await db
    .delete(activationRevocations)
    .where(eq(activationRevocations.code, normalised))
    .returning({ code: activationRevocations.code });

  const restored = await db
    .update(subscriptions)
    .set({ paymentStatus: "success", updatedAt: new Date() })
    .where(
      and(
        eq(subscriptions.paystackReference, codeReference(normalised)),
        eq(subscriptions.paymentStatus, "refunded")
      )
    )
    .returning({ id: subscriptions.id });

  return { removed: removed.length > 0, subscriptionRestored: restored.length > 0 };
}
