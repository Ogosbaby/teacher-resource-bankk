import { NextResponse } from "next/server";
import { z } from "zod";
import { sql, and, or, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { orders, customers, activationCodes, users } from "@/lib/db/schema";
import { mintActivationCode } from "@/lib/services/activation-codes.service";
import { upsertCustomerByEmail, findCustomerByEmail } from "@/lib/services/customers.service";
import { sendActivationCodeEmail } from "@/lib/email/activation-code";
import { SHIPPED_BATCH } from "@/lib/offline/activation-batch";

export const dynamic = "force-dynamic";

const CheckoutSchema = z.object({
  name: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  schoolName: z.string().optional(),
  classLevels: z.array(z.string()).optional(),
  subjects: z.array(z.string()).optional(),
  plan: z.string().default("term"),
  reference: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = CheckoutSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { name, email, phone, schoolName, classLevels, subjects, reference } = parsed.data;
    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${cleanEmail}`)
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        {
          error: "An account with this email address already exists. Please sign in to your account.",
          alreadyRegistered: true,
        },
        { status: 409 }
      );
    }

    // Check if customer already has an active activation pass
    const existingCustomer = await findCustomerByEmail(cleanEmail);
    if (existingCustomer) {
      const existingCodes = await db
        .select({ id: activationCodes.id })
        .from(activationCodes)
        .where(
          and(
            eq(activationCodes.customerId, existingCustomer.id),
            or(
              eq(activationCodes.status, "issued"),
              eq(activationCodes.status, "active"),
              eq(activationCodes.status, "redeemed")
            )
          )
        )
        .limit(1);

      if (existingCodes.length > 0) {
        return NextResponse.json(
          {
            error: "This email address is already registered with an active activation code. Please check your inbox or sign in.",
            alreadyRegistered: true,
          },
          { status: 409 }
        );
      }
    }

    // 1. Pick a code: prefer a cryptographically signed batch code so it works 100% offline
    // in the installed APK, or mint a fresh one if batch codes are exhausted
    let codeToAssign: string = "";

    try {
      // Find unused code from SHIPPED_BATCH
      const usedCodesInDb = await db
        .select({ code: activationCodes.code })
        .from(activationCodes);
      const usedSet = new Set(usedCodesInDb.map((c) => c.code.toUpperCase()));

      const availableBatchCode = SHIPPED_BATCH.codes.find(
        (c) => !usedSet.has(c.code.toUpperCase())
      );

      if (availableBatchCode) {
        codeToAssign = availableBatchCode.code;
      } else {
        codeToAssign = mintActivationCode();
      }
    } catch (e) {
      // Fallback to first available batch code or minted code
      codeToAssign = SHIPPED_BATCH.codes[0]?.code || mintActivationCode();
    }

    // 2. Record Customer & Order in database
    const orderRef = reference || `TRB-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    try {
      const cust = await upsertCustomerByEmail({
        fullName: name,
        email: cleanEmail,
        phone: phone || null,
        schoolName: schoolName || null,
      });

      const [order] = await db
        .insert(orders)
        .values({
          reference: orderRef,
          provider: "paystack",
          providerReference: reference || null,
          customerId: cust.id,
          amountKobo: 500000, // ₦5,000 in kobo
          status: "paid",
          paidAt: new Date(),
          metadata: { name, email: cleanEmail, phone, schoolName, classLevels, subjects, code: codeToAssign },
        })
        .returning();

      await db.insert(activationCodes).values({
        code: codeToAssign,
        status: "issued",
        customerId: cust.id,
        orderId: order.id,
        durationMonths: 3,
        issuedAt: new Date(),
        deliveredTo: cleanEmail,
      });
    } catch (dbErr) {
      console.warn("[checkout] DB logging optional notice:", dbErr);
    }

    // 3. Send email to user with their activation code
    try {
      const emailResult = await sendActivationCodeEmail({
        to: cleanEmail,
        customerName: name,
        code: codeToAssign,
        months: 3,
        orderReference: orderRef,
      });
      console.log(`[checkout] Email dispatch to ${cleanEmail}:`, emailResult);
    } catch (emailErr) {
      console.warn("[checkout] Email dispatch error:", emailErr);
    }

    return NextResponse.json({
      success: true,
      reference: orderRef,
      code: codeToAssign,
      email: cleanEmail,
      name,
      classLevels: classLevels || [],
      subjects: subjects || [],
    });
  } catch (error: any) {
    console.error("Checkout process error:", error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
