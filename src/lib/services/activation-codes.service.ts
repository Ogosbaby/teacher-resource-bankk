/**
 * Activation codes — the server's side of the entitlement key.
 *
 * A code is what a customer buys. It is minted here, delivered to them, and typed
 * into the installed app, where it is validated offline against the signed batch
 * and bound to one device. This module is the authoritative record of every code:
 * who it was issued to, whether it has been used, and whether it has been
 * cancelled.
 *
 * Two sources of truth coexist, and the order between them matters:
 *
 *   - **This table** is authoritative for anything the platform minted itself — a
 *     code issued from a Paystack order, or handed out by a sales agent. It can
 *     revoke and expire codes without shipping anything.
 *   - **The signed batch** (`SRC/lib/offline/activation-batch.json`) is what the
 *     app validates against with no network. Batch codes are what the pilot ships
 *     with, and they stay valid even if the server is unreachable.
 *
 * So resolution checks the table first, then falls back to the batch. A code the
 * table has cancelled is cancelled even if the batch still lists it, because a
 * cancellation is the safe direction to be wrong in — it only ever removes
 * access.
 */
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { activationCodes, activationRevocations, activationCodeStatus } from "@/lib/db/schema";
import { normaliseCode } from "@/lib/offline/device";
import { SHIPPED_BATCH, isShippedBatchTrusted } from "@/lib/offline/activation-batch";

export type ActivationCodeStatus = (typeof activationCodeStatus.enumValues)[number];
export type ActivationCode = typeof activationCodes.$inferSelect;

/** No 0/O/1/I/L — these get read aloud over the phone and typed on a keypad. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const GROUP_LENGTH = 4;
const GROUPS = 2;

/**
 * Mint a fresh `TRB-XXXX-XXXX` code.
 *
 * `crypto.getRandomValues` rather than `Math.random`: these are bearer tokens for
 * a term of access, so they need to be unguessable, not merely unique.
 */
export function mintActivationCode(): string {
  const bytes = new Uint8Array(GROUP_LENGTH * GROUPS);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    if (i > 0 && i % GROUP_LENGTH === 0) out += "-";
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `TRB-${out}`;
}

export interface CreateActivationCodeInput {
  months?: number;
  customerId?: string | null;
  userId?: string | null;
  salesAgentId?: string | null;
  orderId?: string | null;
  termId?: string | null;
  note?: string | null;
  createdBy?: string | null;
  deliveryChannel?: "email" | "agent" | "manual";
  deliveredTo?: string | null;
}

/**
 * Insert a code, retrying on the (astronomically unlikely) collision of a minted
 * code that already exists. The unique index is what actually guarantees
 * uniqueness; the loop is just so a collision is not a 500.
 */
export async function createActivationCode(
  input: CreateActivationCodeInput = {}
): Promise<ActivationCode> {
  const months = input.months ?? 3;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = mintActivationCode();
    const [row] = await db
      .insert(activationCodes)
      .values({
        code,
        status: "issued",
        durationMonths: months,
        customerId: input.customerId ?? null,
        userId: input.userId ?? null,
        salesAgentId: input.salesAgentId ?? null,
        orderId: input.orderId ?? null,
        termId: input.termId ?? null,
        note: input.note ?? null,
        createdBy: input.createdBy ?? null,
        deliveryChannel: input.deliveryChannel ?? "email",
        deliveredTo: input.deliveredTo ?? null,
        issuedAt: new Date(),
      })
      .onConflictDoNothing({ target: activationCodes.code })
      .returning();

    if (row) return row;
  }

  throw new Error("Could not mint a unique activation code.");
}

export async function findActivationCode(rawCode: string): Promise<ActivationCode | null> {
  const [row] = await db
    .select()
    .from(activationCodes)
    .where(eq(activationCodes.code, normaliseCode(rawCode)))
    .limit(1);
  return row ?? null;
}

export interface CodeEntitlement {
  /** The code is real — either minted here or listed in the signed batch. */
  known: boolean;
  /** Months a redemption grants. Decided server-side, never by the client. */
  months: number;
  revoked: boolean;
  revokedReason?: string;
  /** True when this code came from the DB rather than the shipped batch. */
  managed: boolean;
  row?: ActivationCode;
}

/**
 * Decide what a code is worth, and whether it is still alive.
 *
 * Cancellation is checked in both places a code can be cancelled: the legacy
 * `activation_revocations` table (which the batch-based pilot used, and which
 * `npm run codes:revoke` still rebuilds from) and the code row's own status.
 */
export async function resolveCodeEntitlement(rawCode: string): Promise<CodeEntitlement> {
  const code = normaliseCode(rawCode);

  const [revocation] = await db
    .select()
    .from(activationRevocations)
    .where(eq(activationRevocations.code, code))
    .limit(1);

  const row = await findActivationCode(code);

  if (row) {
    const cancelled = row.status === "revoked" || row.status === "suspended" || Boolean(row.revokedAt);
    const expired =
      row.status === "expired" || (row.expiresAt ? row.expiresAt.getTime() < Date.now() : false);
    return {
      known: true,
      months: row.durationMonths || 3,
      revoked: cancelled || Boolean(revocation) || expired,
      revokedReason:
        row.revokedReason ??
        (expired ? "Expired" : undefined) ??
        revocation?.reason ??
        undefined,
      managed: true,
      row,
    };
  }

  // Not minted here — fall back to the signed batch the app itself validates
  // against, so the two sides agree on what is valid.
  if (!(await isShippedBatchTrusted())) {
    return { known: false, months: 0, revoked: false, managed: false };
  }
  const entry = SHIPPED_BATCH.codes.find((c) => c.code === code);
  if (!entry) {
    return { known: false, months: 0, revoked: false, managed: false };
  }
  return {
    known: true,
    months: entry.months || 3,
    revoked: Boolean(revocation),
    revokedReason: revocation?.reason,
    managed: false,
  };
}

/**
 * Record that a code was redeemed, and onto which account and device.
 *
 * First write wins: a code redeemed once is not re-stamped by a later sync, so
 * `redeemedAt` keeps meaning "when this code was first used".
 */
export async function markActivationCodeRedeemed({
  code,
  userId,
  deviceId,
  subscriptionId,
}: {
  code: string;
  userId: string;
  deviceId?: string | null;
  subscriptionId?: string | null;
}): Promise<void> {
  await db
    .update(activationCodes)
    .set({
      status: "redeemed",
      redeemedAt: sql`COALESCE(${activationCodes.redeemedAt}, now())`,
      boundUserId: sql`COALESCE(${activationCodes.boundUserId}, ${userId})`,
      userId: sql`COALESCE(${activationCodes.userId}, ${userId})`,
      boundDeviceId: sql`COALESCE(${activationCodes.boundDeviceId}, ${deviceId ?? null})`,
      subscriptionId: sql`COALESCE(${activationCodes.subscriptionId}, ${subscriptionId ?? null})`,
      lastValidatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(activationCodes.code, normaliseCode(code)));
}

/** Bump the "we saw this code again" timestamp on a successful sync. */
export async function touchActivationCode(code: string): Promise<void> {
  await db
    .update(activationCodes)
    .set({ lastValidatedAt: new Date(), updatedAt: new Date() })
    .where(eq(activationCodes.code, normaliseCode(code)));
}

export interface ActivationCodeFilters {
  status?: ActivationCodeStatus;
  search?: string;
  customerId?: string;
  salesAgentId?: string;
  limit?: number;
}

/** Internal-LMS listing. Search matches code, recipient or customer email. */
export async function listActivationCodes(
  filters: ActivationCodeFilters = {}
): Promise<ActivationCode[]> {
  const where = [];
  if (filters.status) where.push(eq(activationCodes.status, filters.status));
  if (filters.customerId) where.push(eq(activationCodes.customerId, filters.customerId));
  if (filters.salesAgentId) where.push(eq(activationCodes.salesAgentId, filters.salesAgentId));
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    where.push(
      or(
        ilike(activationCodes.code, term),
        ilike(activationCodes.deliveredTo, term),
        ilike(activationCodes.note, term)
      )
    );
  }

  return db
    .select()
    .from(activationCodes)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(activationCodes.createdAt))
    .limit(filters.limit ?? 100);
}

export async function activationCodeCounts(): Promise<Record<string, number>> {
  const rows = await db
    .select({ status: activationCodes.status, total: count() })
    .from(activationCodes)
    .groupBy(activationCodes.status);

  const out: Record<string, number> = {};
  for (const row of rows) out[row.status] = Number(row.total);
  return out;
}
