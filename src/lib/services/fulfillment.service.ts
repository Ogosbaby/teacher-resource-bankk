/**
 * Fulfilment — turning money into access.
 *
 * One paid order produces exactly one thing a customer can use: an activation
 * code. The subscription row and the emailed code are both consequences of that,
 * and neither may happen twice, because Paystack will happily tell us about the
 * same payment three times (the browser redirect, the webhook, and a webhook
 * re-delivery) within a few hundred milliseconds.
 *
 * Idempotency is therefore layered:
 *
 *   - `markOrderPaid` only transitions `pending -> paid` once, so only one caller
 *     ever reaches this module in the first place.
 *   - This module then re-checks for an activation code already attached to the
 *     order, so even if two callers do get through, the second finds the first's
 *     code instead of minting another.
 *   - The subscription is written through `syncTermPassForUser`, whose reference
 *     (`order:<reference>`) is unique per order, so it too resolves to a single
 *     row.
 *
 * The customer is issued a code whether or not they have an account yet. Most do
 * not — they install the app and type the code in — so demanding a registration
 * before delivering what they paid for would be the wrong order of events. When
 * they do register later with the same email, `claimPurchasesForUser` attaches
 * their existing purchase to the new account.
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { activationCodes, orders, users } from "@/lib/db/schema";
import { upsertCustomerByEmail } from "@/lib/services/customers.service";
import {
  createActivationCode,
  type ActivationCode,
} from "@/lib/services/activation-codes.service";
import { markOrderPaid, attachOrderProvisioning, type Order } from "@/lib/services/orders.service";
import { syncTermPassForUser, type Subscription } from "@/lib/services/subscriptions.service";
import { sendActivationCodeEmail } from "@/lib/email/activation-code";
import type { EmailResult } from "@/lib/email";

export interface FulfillmentResult {
  order: Order;
  alreadyFulfilled: boolean;
  subscription: Subscription | null;
  activationCode: ActivationCode | null;
  email: EmailResult | null;
}

interface BuyerDetails {
  email: string | null;
  name: string | null;
  phone: string | null;
  state: string | null;
  schoolName: string | null;
}

/** Read the buyer out of an order's metadata blob, defensively. */
function buyerFromOrder(order: Order): BuyerDetails {
  const meta = (order.metadata ?? {}) as Record<string, unknown>;
  const str = (key: string): string | null => {
    const value = meta[key];
    return typeof value === "string" && value.trim() ? value.trim() : null;
  };
  return {
    email: str("email") ?? str("customerEmail"),
    name: str("name") ?? str("customerName"),
    phone: str("phone"),
    state: str("state"),
    schoolName: str("schoolName") ?? str("school"),
  };
}

async function findUserByEmail(email: string): Promise<{ id: string } | null> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${email.toLowerCase()}`)
    .limit(1);
  return row ?? null;
}

async function findCodeForOrder(orderId: string): Promise<ActivationCode | null> {
  const [row] = await db
    .select()
    .from(activationCodes)
    .where(eq(activationCodes.orderId, orderId))
    .orderBy(desc(activationCodes.createdAt))
    .limit(1);
  return row ?? null;
}

/**
 * Deliver a paid order.
 *
 * Safe to call more than once for the same order; the second call reports
 * `alreadyFulfilled` and hands back what the first one created.
 */
export async function fulfillPaidOrder(order: Order): Promise<FulfillmentResult> {
  const existingCode = await findCodeForOrder(order.id);
  if (existingCode) {
    return {
      order,
      alreadyFulfilled: true,
      subscription: null,
      activationCode: existingCode,
      email: null,
    };
  }

  const buyer = buyerFromOrder(order);

  // The customer record is what the internal LMS lists and what a sales agent
  // gets credited for, so it exists even when the purchase had no account behind
  // it.
  const customer = buyer.email
    ? await upsertCustomerByEmail({
        fullName: buyer.name ?? buyer.email,
        email: buyer.email,
        phone: buyer.phone,
        state: buyer.state,
        schoolName: buyer.schoolName,
        userId: order.userId,
        createdByAgentId: order.salesAgentId,
      })
    : null;

  // Attach the entitlement to an account when there is one. Two ways there is:
  // the order was placed from a signed-in session, or the buyer already has an
  // account under the email they paid with.
  const account = order.userId
    ? { id: order.userId }
    : buyer.email
      ? await findUserByEmail(buyer.email)
      : null;

  const months = 3;
  let subscription: Subscription | null = null;
  if (account) {
    subscription = await syncTermPassForUser(account.id, {
      reference: `order:${order.reference}`,
      months,
    });
  }

  const code = await createActivationCode({
    months,
    customerId: customer?.id ?? null,
    userId: account?.id ?? null,
    salesAgentId: order.salesAgentId,
    orderId: order.id,
    termId: subscription?.termId ?? order.termId ?? null,
    note: `Order ${order.reference}`,
    deliveryChannel: "email",
    deliveredTo: buyer.email,
  });

  if (subscription) {
    await db
      .update(activationCodes)
      .set({ subscriptionId: subscription.id, updatedAt: new Date() })
      .where(eq(activationCodes.id, code.id));
  }

  await attachOrderProvisioning(order.id, {
    subscriptionId: subscription?.id ?? null,
    termId: subscription?.termId ?? null,
  });

  // Email last: everything above is the delivery itself, and a bounced message
  // must not undo it. The result is recorded so an operator can resend.
  let email: EmailResult | null = null;
  if (buyer.email) {
    email = await sendActivationCodeEmail({
      to: buyer.email,
      customerName: buyer.name,
      code: code.code,
      months,
      expiresAt: subscription?.expiresAt ?? null,
      orderReference: order.reference,
    });

    await db
      .update(activationCodes)
      .set({
        deliveryStatus:
          email.status === "sent" ? "sent" : email.status === "skipped" ? "skipped" : "failed",
        deliveryAttempts: sql`${activationCodes.deliveryAttempts} + 1`,
        lastDeliveryAt: new Date(),
        deliveryError: email.status === "failed" ? email.error : null,
        updatedAt: new Date(),
      })
      .where(eq(activationCodes.id, code.id));
  }

  const [refreshed] = await db.select().from(orders).where(eq(orders.id, order.id)).limit(1);

  return {
    order: refreshed ?? order,
    alreadyFulfilled: false,
    subscription,
    activationCode: code,
    email,
  };
}

/**
 * Record a gateway-confirmed payment and deliver it, in one call.
 *
 * The two routes that can learn about a payment — the redirect handler and the
 * webhook — both funnel through here so they cannot drift apart. Whichever
 * arrives second finds the order already paid and does nothing.
 */
export async function recordPaymentAndFulfill({
  reference,
  providerReference,
  paidAt,
}: {
  reference: string;
  providerReference?: string | null;
  paidAt?: Date | null;
}): Promise<{ found: boolean; result?: FulfillmentResult; alreadyPaid?: boolean }> {
  const [order] = await db.select().from(orders).where(eq(orders.reference, reference)).limit(1);
  if (!order) return { found: false };

  const { order: paidOrder, alreadyPaid } = await markOrderPaid(order.id, {
    providerReference,
    paidAt,
  });

  if (alreadyPaid) {
    const code = await findCodeForOrder(paidOrder.id);
    return {
      found: true,
      alreadyPaid: true,
      result: {
        order: paidOrder,
        alreadyFulfilled: true,
        subscription: null,
        activationCode: code,
        email: null,
      },
    };
  }

  return { found: true, alreadyPaid: false, result: await fulfillPaidOrder(paidOrder) };
}

/**
 * Attach any earlier purchase to a freshly-registered account.
 *
 * A customer who buys first and registers afterwards would otherwise be invisible
 * to the server: their code works in the app, but their account looks unpaid and
 * the app's sync has nothing to agree with. Called from onboarding once the
 * account exists.
 *
 * Returns the number of orders attached.
 */
export async function claimPurchasesForUser(email: string, userId: string): Promise<number> {
  const customer = await upsertCustomerByEmail({
    fullName: email,
    email,
    userId,
  });

  const paid = await db
    .select()
    .from(orders)
    .where(and(eq(orders.customerId, customer.id), eq(orders.status, "paid")));

  let attached = 0;
  for (const order of paid) {
    if (!order.userId) {
      await db
        .update(orders)
        .set({ userId, updatedAt: new Date() })
        .where(eq(orders.id, order.id));
    }

    const code = await findCodeForOrder(order.id);
    if (!code) continue;

    if (!code.userId) {
      await db
        .update(activationCodes)
        .set({ userId, updatedAt: new Date() })
        .where(eq(activationCodes.id, code.id));
    }

    // Grant the account the term the code bought, so server-side gates agree with
    // the pass already living on the device.
    await syncTermPassForUser(userId, {
      reference: `order:${order.reference}`,
      months: code.durationMonths || 3,
    });
    attached += 1;
  }

  return attached;
}
