import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { terms } from "@/lib/db/schema";

export type Term = typeof terms.$inferSelect;

/** Get the currently active term (there should be at most one). */
export async function getActiveTerm(): Promise<Term | null> {
  const rows = await db
    .select()
    .from(terms)
    .where(eq(terms.isActive, true))
    .orderBy(desc(terms.startDate))
    .limit(1);
  return rows[0] ?? null;
}

/** List all terms, newest first. */
export async function listTerms(): Promise<Term[]> {
  return db
    .select()
    .from(terms)
    .orderBy(desc(terms.academicYear), desc(terms.termNumber));
}

/** Create a new term. */
export async function createTerm(data: {
  academicYear: string;
  termNumber: number;
  name: string;
  startDate: string;
  endDate: string;
}): Promise<Term> {
  const [term] = await db.insert(terms).values(data).returning();
  return term;
}

/** Update a term's active status. */
export async function setTermActive(termId: string, isActive: boolean): Promise<void> {
  await db
    .update(terms)
    .set({ isActive })
    .where(eq(terms.id, termId));
}
