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
    const orderRef = reference || `TRB-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    let codeToAssign: string = "";
    let isReissued = false;

    // 1. Check if this email already has an issued/active activation code
    try {
      const existingCustomer = await findCustomerByEmail(cleanEmail);
      if (existingCustomer) {
        const [existingCodeRow] = await db
          .select({ code: activationCodes.code })
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
          .orderBy(sql`${activationCodes.createdAt} desc`)
          .limit(1);

        if (existingCodeRow?.code) {
          codeToAssign = existingCodeRow.code;
          isReissued = true;
          console.log(`[checkout] Found existing code ${codeToAssign} for ${cleanEmail}, re-dispatching email.`);
        }
      }
    } catch (checkErr) {
      console.warn("[checkout] Safe pre-check query notice:", checkErr);
    }

    // 2. If no existing code, pick from SHIPPED_BATCH or mint a fresh unguessable code
    if (!codeToAssign) {
      try {
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
    }

    // 3. Record Customer, Order & Code in database (safe / non-blocking)
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

      if (!isReissued) {
        await db.insert(activationCodes).values({
          code: codeToAssign,
          status: "issued",
          customerId: cust.id,
          orderId: order?.id ?? null,
          durationMonths: 3,
          issuedAt: new Date(),
          deliveredTo: cleanEmail,
        });
      }
    } catch (dbErr) {
      console.warn("[checkout] DB logging optional notice:", dbErr);
    }

    // 4. Send email to user with their activation code
    let emailResult: any = null;
    try {
      emailResult = await sendActivationCodeEmail({
        to: cleanEmail,
        customerName: name,
        code: codeToAssign,
        months: 3,
        orderReference: orderRef,
      });
      console.log(`[checkout] Email dispatch to ${cleanEmail}:`, emailResult);
    } catch (emailErr) {
      console.error("[checkout] Email dispatch error:", emailErr);
    }

    return NextResponse.json({
      success: true,
      reference: orderRef,
      code: codeToAssign,
      email: cleanEmail,
      name,
      isReissued,
      emailStatus: emailResult?.status || "sent",
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
