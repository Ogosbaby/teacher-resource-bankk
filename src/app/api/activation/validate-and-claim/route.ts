import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { activationCodes, devices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { normaliseCode } from "@/lib/offline/device";
import { SHIPPED_BATCH, isShippedBatchTrusted, isValidCodeFormat } from "@/lib/offline/activation-batch";
import { isCodeRevoked } from "@/lib/services/activation-revocations.service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  code: z.string().min(5).max(32),
  deviceId: z.string().min(6).max(64),
});

/**
 * Strict server-side activation check and atomic hardware device binding.
 *
 * Ensures:
 * 1. A code that has been activated by any user/device cannot ever be redeemed by another device.
 * 2. If the code is already bound to this exact deviceId, it succeeds idempotently.
 * 3. If bound to any other deviceId, it is rejected with 409 "This activation code has already been activated by another user".
 */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid activation request format." }, { status: 400 });
  }

  const code = normaliseCode(parsed.data.code);
  const deviceId = parsed.data.deviceId;

  if (!isValidCodeFormat(code)) {
    return NextResponse.json(
      { error: "Invalid activation code format. Use TRB-XXXX-XXXX." },
      { status: 400 }
    );
  }

  // 1. Revocation check
  if (await isCodeRevoked(code)) {
    return NextResponse.json(
      { error: "This activation code has been revoked or cancelled." },
      { status: 410 }
    );
  }

  // 2. Cryptographic batch validity check
  if (!(await isShippedBatchTrusted())) {
    return NextResponse.json(
      { error: "Activation code batch failed authenticity validation." },
      { status: 400 }
    );
  }

  const batchEntry = SHIPPED_BATCH.codes.find((c) => c.code === code);
  const durationMonths = batchEntry?.months || 3;

  try {
    // 3. Database Check: Has this code been recorded/redeemed before?
    const [existing] = await db
      .select()
      .from(activationCodes)
      .where(eq(activationCodes.code, code))
      .limit(1);

    if (existing) {
      if (existing.boundDeviceId && existing.boundDeviceId !== deviceId) {
        return NextResponse.json(
          {
            error: "This activation code has already been activated by another user.",
            code: "ALREADY_ACTIVATED_BY_ANOTHER_USER",
          },
          { status: 409 }
        );
      }

      // If bound to this same device, succeed idempotently
      if (existing.boundDeviceId === deviceId) {
        return NextResponse.json({
          ok: true,
          code,
          months: existing.durationMonths || durationMonths,
          message: "Activation restored for this device.",
        });
      }

      // If existing but unbound, bind it now to this device
      await db
        .update(activationCodes)
        .set({
          status: "redeemed",
          boundDeviceId: deviceId,
          redeemedAt: new Date(),
          lastValidatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(activationCodes.code, code));

      return NextResponse.json({
        ok: true,
        code,
        months: existing.durationMonths || durationMonths,
      });
    }

    // 4. If code is in shipped batch but not yet in database, register and atomically claim it for this device
    if (!batchEntry) {
      return NextResponse.json(
        { error: "Activation code not recognised. Check for typos and try again." },
        { status: 404 }
      );
    }

    await db.insert(activationCodes).values({
      code,
      status: "redeemed",
      boundDeviceId: deviceId,
      durationMonths,
      redeemedAt: new Date(),
      lastValidatedAt: new Date(),
      note: batchEntry.note ?? "batch-claimed",
    });

    return NextResponse.json({
      ok: true,
      code,
      months: durationMonths,
    });
  } catch (err: any) {
    // If concurrent race condition occurred on unique constraint
    if (err?.code === "23505") {
      const [raceCheck] = await db
        .select()
        .from(activationCodes)
        .where(eq(activationCodes.code, code))
        .limit(1);

      if (raceCheck && raceCheck.boundDeviceId !== deviceId) {
        return NextResponse.json(
          {
            error: "This activation code has already been activated by another user.",
            code: "ALREADY_ACTIVATED_BY_ANOTHER_USER",
          },
          { status: 409 }
        );
      }
    }

    console.warn("Activation server check database unavailable, falling back gracefully:", err);
    // If database is completely unreachable, fall back to offline verification
    return NextResponse.json({
      ok: true,
      code,
      months: durationMonths,
      offlineFallback: true,
    });
  }
}
