import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTeacherApi } from "@/lib/auth/api-guards";
import {
  findSubscriptionByReference,
  syncTermPassForUser,
} from "@/lib/services/subscriptions.service";
import {
  codeReference,
  isCodeRevoked,
  listRevocations,
} from "@/lib/services/activation-revocations.service";
import { SHIPPED_BATCH, isShippedBatchTrusted } from "@/lib/offline/activation-batch";
import { signRevocationDocument } from "@/lib/offline/sign-revocations";

/**
 * Mirror a device-minted term pass up to the server.
 *
 * This is the server-optional half of local-first: the device already unlocked
 * itself offline, and this route exists so the rest of the platform (billing,
 * server-gated routes) agrees with it. It is called as a background best-effort
 * sync and nothing in the UI waits on it.
 *
 * The security posture is the important part. The client tells us *which* code it
 * redeemed, never *how long* the pass should be — the duration comes from the
 * signed batch, re-verified here with the same verifier the app uses. A forged or
 * unlisted code is rejected, and the shipped batch is rejected outright if its
 * signature fails, so an edited bundle cannot mint a longer pass than the signed
 * batch allows.
 *
 * It is also one of the two channels that carry per-code revocations, and the only
 * one that can reach a device whose own code is fine. The list goes out on every
 * response, and the pass-carrying code is checked against it before anything else
 * happens: a code the server has cancelled has to be reported as cancelled even
 * when it is no longer in the shipped batch at all, which is exactly what
 * rotating the batch leaves behind. The document is signed when the server holds
 * the signing key (`ACTIVATION_SIGNING_KEY`), so a TLS-intercepting proxy cannot
 * cancel a teacher's code on their device without forging a signature it does not
 * have; the plain list is only a fallback for a server without its key.
 */

export const dynamic = "force-dynamic";

/** Ceiling for a pass with no code — matches the demo grant. */
const MAX_UNCODED_MONTHS = 3;

const bodySchema = z.object({
  token: z.string().min(8).max(128),
  code: z.string().max(32).nullable(),
  deviceId: z.string().min(8).max(64),
});

export async function POST(req: Request) {
  const guard = await requireTeacherApi();
  if ("error" in guard) return guard.error;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid term pass payload." }, { status: 400 });
  }

  const { token, code, deviceId } = parsed.data;

  // Built before the response is chosen because it travels with all of them. A
  // device can only refuse a cancelled code if it has learned that the code was
  // cancelled, and a successful sync of somebody else's healthy pass is a
  // perfectly good moment to tell it.
  const revocations = await listRevocations();
  const revocationsDocument = revocations.length > 0 ? signRevocationDocument(revocations) : null;

  // Revocation is checked before the code list and before the batch signature
  // check: the code may no longer be in the batch at all, and "cancelled" is the
  // more useful answer than "unknown" when it is.
  if (code && (await isCodeRevoked(code))) {
    return NextResponse.json(
      {
        error: "This activation code has been revoked.",
        revocations,
        revocationsDocument,
      },
      { status: 410 }
    );
  }

  let months = MAX_UNCODED_MONTHS;
  if (code) {
    if (!(await isShippedBatchTrusted())) {
      return NextResponse.json(
        { error: "The activation list failed its integrity check." },
        { status: 400 }
      );
    }
    const entry = SHIPPED_BATCH.codes.find((c) => c.code === code);
    if (!entry) {
      return NextResponse.json({ error: "Unknown activation code." }, { status: 400 });
    }
    months = entry.months || MAX_UNCODED_MONTHS;
  }

  // Idempotency key: one code grants one term, and one device's demo pass grants
  // one term. Retries resolve to the same row instead of stacking.
  const reference = code ? codeReference(code) : `pass:${deviceId}`;

  // This is the real cross-device check. A single device cannot know a code was
  // redeemed on someone else's phone — it has no record of it — so the only place
  // reuse-across-devices can actually be enforced is here, where all redemptions
  // meet. Returning 409 (rather than silently handing back the other account's
  // row, which is what the idempotency lookup alone would do) is what lets the
  // client block the code and revoke its locally-minted pass.
  const existing = await findSubscriptionByReference(reference);
  if (existing && existing.userId !== guard.session.user.id) {
    return NextResponse.json(
      {
        error: "This activation code has already been activated on another account.",
        revocations,
        revocationsDocument,
      },
      { status: 409 }
    );
  }

  try {
    const subscription = await syncTermPassForUser(guard.session.user.id, { reference, months });
    return NextResponse.json({
      ok: true,
      months,
      expiresAt: subscription.expiresAt,
      syncedToken: token,
      revocations,
      revocationsDocument,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not sync the term pass." },
      { status: 500 }
    );
  }
}
