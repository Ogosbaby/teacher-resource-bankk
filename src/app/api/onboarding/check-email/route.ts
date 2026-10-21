import { NextResponse } from "next/server";
import { sql, eq, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, customers, activationCodes } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const rawEmail = body?.email;
    if (!rawEmail || typeof rawEmail !== "string") {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const email = rawEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // 1. Check users table (teachers with an account)
    const existingUser = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json({
        exists: true,
        type: "user",
        message: "An account with this email address already exists. Please sign in instead.",
      });
    }

    // 2. Check customers table (teachers who previously registered / purchased)
    const existingCustomer = await db
      .select({ id: customers.id, fullName: customers.fullName })
      .from(customers)
      .where(sql`lower(${customers.email}) = ${email}`)
      .limit(1);

    if (existingCustomer.length > 0) {
      return NextResponse.json({
        exists: true,
        type: "customer",
        message: "This email address is already registered in our system. Please sign in or check your inbox for your activation code.",
      });
    }

    // 3. Check activation codes delivered to this email
    const existingCode = await db
      .select({ id: activationCodes.id, status: activationCodes.status })
      .from(activationCodes)
      .where(
        sql`lower(${activationCodes.deliveredTo}) = ${email}`
      )
      .limit(1);

    if (existingCode.length > 0) {
      return NextResponse.json({
        exists: true,
        type: "code",
        message: "An activation pass has already been issued to this email address.",
      });
    }

    return NextResponse.json({ exists: false });
  } catch (err: any) {
    console.error("[check-email] Error verifying email existence:", err);
    // If database check encounters an issue, return exists: false to not block offline / dev
    return NextResponse.json({ exists: false, error: err?.message });
  }
}

