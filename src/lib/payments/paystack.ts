/**
 * Paystack, behind a thin seam.
 *
 * The website is the internal LMS/ops surface, but it is also where a customer
 * pays: `/pricing` opens a Paystack checkout, Paystack redirects back to
 * `/api/subscriptions/verify`, and a webhook confirms the same payment out of
 * band. Both of those paths call in here.
 *
 * Three rules shape this module:
 *
 *   1. **Amounts are kobo.** Paystack's API is in the smallest currency unit, so
 *      NGN 5,000 is 500000. Every amount that crosses this boundary is an
 *      integer number of kobo; never a float naira value.
 *   2. **The secret key never leaves the server.** Nothing here is importable
 *      from a client component — it reads `PAYSTACK_SECRET_KEY`, which is only
 *      ever set in the server environment.
 *   3. **A verify response is the only truth.** A browser redirect back from
 *      Paystack proves nothing on its own (anyone can hit that URL with any
 *      reference), so `verifyTransaction` re-asks Paystack directly rather than
 *      trusting what the query string says.
 *
 * Like the AI and storage seams, an unconfigured deployment reports that it is
 * unconfigured rather than throwing — callers decide whether that is fatal.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const PAYSTACK_API = "https://api.paystack.co";

export function isPaystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY?.trim());
}

/** Public key is safe to expose; used by inline checkout if we ever add it. */
export function paystackPublicKey(): string | null {
  return process.env.PAYSTACK_PUBLIC_KEY?.trim() || null;
}

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set.");
  return key;
}

/**
 * Where Paystack should send the customer after a successful payment.
 *
 * Must be an absolute URL and must be registered against the account. Falls back
 * to `NEXT_PUBLIC_SITE_URL` so a deployment only has to set one site-wide value.
 */
export function paystackCallbackUrl(reference: string): string | null {
  const base =
    process.env.PAYSTACK_CALLBACK_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!base) return null;
  return `${base.replace(/\/+$/, "")}/api/subscriptions/verify?reference=${encodeURIComponent(reference)}`;
}

export type PaystackResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

interface PaystackEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
}

async function call<T>(path: string, init?: RequestInit): Promise<PaystackResult<T>> {
  if (!isPaystackConfigured()) {
    return { ok: false, error: "PAYSTACK_SECRET_KEY is not set" };
  }
  try {
    const res = await fetch(`${PAYSTACK_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
    const body = (await res.json().catch(() => null)) as PaystackEnvelope<T> | null;
    if (!res.ok || !body?.status) {
      return { ok: false, error: body?.message || `Paystack responded ${res.status}` };
    }
    return { ok: true, data: body.data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface InitializedTransaction {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

/**
 * Start a transaction and hand back the URL to send the customer to.
 *
 * `reference` is supplied by the caller rather than generated here, because it is
 * the join key between our `orders` row and Paystack's record — the webhook and
 * the redirect both arrive holding it, and neither can look our row up without
 * it. It must be unique across the Paystack account: reusing one is rejected by
 * Paystack, which is a useful second line of defence against double-charging.
 */
export async function initTransaction({
  email,
  amountKobo,
  reference,
  metadata,
}: {
  email: string;
  amountKobo: number;
  reference: string;
  metadata?: Record<string, unknown>;
}): Promise<PaystackResult<InitializedTransaction>> {
  const callbackUrl = paystackCallbackUrl(reference);
  const result = await call<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email,
      amount: amountKobo,
      reference,
      currency: "NGN",
      ...(callbackUrl ? { callback_url: callbackUrl } : {}),
      ...(metadata ? { metadata } : {}),
    }),
  });

  if (!result.ok) return result;
  return {
    ok: true,
    data: {
      authorizationUrl: result.data.authorization_url,
      accessCode: result.data.access_code,
      reference: result.data.reference,
    },
  };
}

export interface VerifiedTransaction {
  reference: string;
  status: "success" | "failed" | "abandoned" | "ongoing" | "reversed" | string;
  amountKobo: number;
  currency: string;
  paidAt: string | null;
  channel: string | null;
  customerEmail: string | null;
  customerName: string | null;
  gatewayResponse: string | null;
  metadata: Record<string, unknown> | null;
}

/**
 * Ask Paystack what actually happened to a reference.
 *
 * This is the only thing the verify route trusts. The customer arrives holding a
 * reference from a redirect, and a redirect can be forged — but a `success` here
 * comes from Paystack's own API over an authenticated connection, so it cannot.
 */
export async function verifyTransaction(
  reference: string
): Promise<PaystackResult<VerifiedTransaction>> {
  const result = await call<{
    reference: string;
    status: string;
    amount: number;
    currency: string;
    paid_at: string | null;
    channel: string | null;
    gateway_response: string | null;
    metadata: Record<string, unknown> | null;
    customer: { email?: string; first_name?: string; last_name?: string } | null;
  }>(`/transaction/verify/${encodeURIComponent(reference)}`, { method: "GET" });

  if (!result.ok) return result;

  const d = result.data;
  const name = d.customer
    ? [d.customer.first_name, d.customer.last_name].filter(Boolean).join(" ") || null
    : null;

  return {
    ok: true,
    data: {
      reference: d.reference,
      status: d.status,
      amountKobo: d.amount,
      currency: d.currency,
      paidAt: d.paid_at,
      channel: d.channel,
      customerEmail: d.customer?.email ?? null,
      customerName: name,
      gatewayResponse: d.gateway_response,
      metadata: d.metadata ?? null,
    },
  };
}

/**
 * Verify a webhook actually came from Paystack.
 *
 * Paystack signs the **raw request body** (not a re-serialised object) with
 * HMAC-SHA512 keyed on the secret key and sends it as `x-paystack-signature`.
 * Reading the body with `req.json()` first and re-stringifying it would change
 * key order and whitespace and break every signature, so the route must hand us
 * the bytes it received.
 *
 * Compared with `timingSafeEqual`: a plain `===` on a signature leaks, byte by
 * byte, how much of a guess was right.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  if (!isPaystackConfigured()) return false;

  try {
    const expected = createHmac("sha512", secretKey()).update(rawBody, "utf8").digest("hex");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature.trim().toLowerCase(), "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Our own order reference. Paystack requires uniqueness across the account, so it
 * carries a timestamp and random suffix; the `TRB` prefix makes it greppable in
 * both the Paystack dashboard and our logs.
 */
export function generateOrderReference(now = Date.now()): string {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TRB-${now.toString(36).toUpperCase()}-${random}`;
}
