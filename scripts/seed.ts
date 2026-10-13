import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import { subscriptions, terms, users } from "../src/lib/db/schema";

async function upsertUser(
  email: string,
  name: string,
  password: string,
  role: "teacher" | "admin"
) {
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) return existing[0];
  const [created] = await db
    .insert(users)
    .values({ email, name, role, passwordHash: await bcrypt.hash(password, 10) })
    .returning();
  return created;
}

async function main() {
  const admin = await upsertUser(
    process.env.ADMIN_EMAIL ?? "admin@trb.local",
    "Platform Admin",
    process.env.ADMIN_PASSWORD ?? "ChangeMe123!",
    "admin"
  );

  const teacher = await upsertUser(
    "teacher@trb.local",
    "Demo Teacher",
    "Teacher123!",
    "teacher"
  );

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  let term = (
    await db
      .insert(terms)
      .values({
        academicYear: "2024/2025",
        termNumber: 1,
        name: "2024/2025 — Term 1 (demo)",
        startDate: new Date(now - 30 * day).toISOString().slice(0, 10),
        endDate: new Date(now + 45 * day).toISOString().slice(0, 10),
      })
      .onConflictDoNothing()
      .returning()
  )[0];
  if (!term) {
    term = (await db.select().from(terms).where(eq(terms.academicYear, "2024/2025")).limit(1))[0];
  }

  await db
    .insert(subscriptions)
    .values({
      userId: teacher.id,
      termId: term.id,
      amountKobo: 500000,
      paymentStatus: "success",
      expiresAt: new Date(now + 45 * day),
    })
    .onConflictDoNothing();

  console.log("Seed complete:");
  console.log("  admin:  ", admin.email);
  console.log("  teacher:", teacher.email, "(active demo subscription)");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
