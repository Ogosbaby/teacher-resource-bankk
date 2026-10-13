/**
 * Customers — the people who buy codes.
 *
 * A customer is deliberately *not* a `users` row. Users are accounts that sign
 * in; most customers never do. They pay (often through a sales agent, sometimes
 * on the website) and receive a code, and that is the whole relationship — so the
 * two tables are joined by `customers.user_id` only when a customer later
 * registers, rather than being forced together up front.
 *
 * Email is the identity key, matched case-insensitively, which is why the unique
 * index is on `lower(email)` rather than `email`.
 */
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { customers, orders, salesAgents } from "@/lib/db/schema";

export type Customer = typeof customers.$inferSelect;

export interface UpsertCustomerInput {
  fullName: string;
  email: string;
  phone?: string | null;
  state?: string | null;
  schoolName?: string | null;
  note?: string | null;
  userId?: string | null;
  createdByAgentId?: string | null;
}

/**
 * Create the customer, or return the existing one with that email.
 *
 * Repeat purchases are normal (a teacher renews every term), so an email that
 * already exists must reuse the row rather than fail the checkout. The update
 * only fills in blanks — a name typed at checkout must not overwrite the fuller
 * record a sales agent captured earlier.
 */
export async function upsertCustomerByEmail(input: UpsertCustomerInput): Promise<Customer> {
  const email = input.email.trim();
  const existing = await findCustomerByEmail(email);

  if (existing) {
    const [row] = await db
      .update(customers)
      .set({
        fullName: sql`COALESCE(NULLIF(${customers.fullName}, ''), ${input.fullName})`,
        phone: sql`COALESCE(${customers.phone}, ${input.phone ?? null})`,
        state: sql`COALESCE(${customers.state}, ${input.state ?? null})`,
        schoolName: sql`COALESCE(${customers.schoolName}, ${input.schoolName ?? null})`,
        userId: sql`COALESCE(${customers.userId}, ${input.userId ?? null})`,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, existing.id))
      .returning();
    return row;
  }

  const [row] = await db
    .insert(customers)
    .values({
      fullName: input.fullName,
      email,
      phone: input.phone ?? null,
      state: input.state ?? null,
      schoolName: input.schoolName ?? null,
      note: input.note ?? null,
      userId: input.userId ?? null,
      createdByAgentId: input.createdByAgentId ?? null,
    })
    .returning();
  return row;
}

export async function findCustomerByEmail(email: string): Promise<Customer | null> {
  const [row] = await db
    .select()
    .from(customers)
    .where(sql`lower(${customers.email}) = ${email.trim().toLowerCase()}`)
    .limit(1);
  return row ?? null;
}

export async function findCustomerById(id: string): Promise<Customer | null> {
  const [row] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return row ?? null;
}

/** Link a customer record to the account they registered after buying. */
export async function linkCustomerToUser(customerId: string, userId: string): Promise<void> {
  await db
    .update(customers)
    .set({ userId, updatedAt: new Date() })
    .where(and(eq(customers.id, customerId), sql`${customers.userId} IS NULL`));
}

export interface CustomerRowForList extends Customer {
  agentName: string | null;
  orderCount: number;
  paidKobo: number;
}

export async function listCustomers({
  search,
  agentId,
  limit = 100,
}: { search?: string; agentId?: string; limit?: number } = {}): Promise<CustomerRowForList[]> {
  const where = [];
  if (agentId) where.push(eq(customers.createdByAgentId, agentId));
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    where.push(
      or(
        ilike(customers.fullName, term),
        ilike(customers.email, term),
        ilike(customers.phone, term),
        ilike(customers.schoolName, term)
      )
    );
  }

  const rows = await db
    .select({
      customer: customers,
      agentName: salesAgents.name,
      orderCount: sql<number>`COUNT(${orders.id})`,
      paidKobo: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'paid' THEN ${orders.amountKobo} ELSE 0 END), 0)`,
    })
    .from(customers)
    .leftJoin(salesAgents, eq(customers.createdByAgentId, salesAgents.id))
    .leftJoin(orders, eq(orders.customerId, customers.id))
    .where(where.length ? and(...where) : undefined)
    .groupBy(customers.id, salesAgents.name)
    .orderBy(desc(customers.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    ...r.customer,
    agentName: r.agentName,
    orderCount: Number(r.orderCount),
    paidKobo: Number(r.paidKobo),
  }));
}

export async function customerCount(): Promise<number> {
  const [row] = await db.select({ total: count() }).from(customers);
  return Number(row?.total ?? 0);
}
