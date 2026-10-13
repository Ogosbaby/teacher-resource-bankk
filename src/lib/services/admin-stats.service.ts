import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { kbArticles, subscriptions, users } from "@/lib/db/schema";
import { countCoursesByStatus } from "@/lib/services/courses.service";
import { countPathsByStatus } from "@/lib/services/paths.service";
import { countResourcesByStatus } from "@/lib/services/resources.service";
import { countEmbeddings } from "@/lib/services/embeddings.service";
import { countExemplars } from "@/lib/services/kb-router.service";
import { embeddingModelName } from "@/lib/ai/embedding";
import { type ContentStatus } from "@/lib/content/status";

export interface StatusCounts {
  draft: number;
  in_review: number;
  published: number;
  archived: number;
}

const EMPTY: StatusCounts = { draft: 0, in_review: 0, published: 0, archived: 0 };

function toCounts(rows: { status: ContentStatus; n: number }[]): StatusCounts {
  const out = { ...EMPTY };
  for (const r of rows) out[r.status] = Number(r.n);
  return out;
}

export interface AdminOverview {
  courses: StatusCounts;
  paths: StatusCounts;
  resources: StatusCounts;
  kb: StatusCounts;
  usersByRole: { teacher: number; admin: number; sales_agent?: number };
  activeSubscriptions: number;
  awaitingReview: number;
}

/** Real counts for the admin overview — no placeholder numbers. */
export async function getAdminOverview(): Promise<AdminOverview> {
  const [courseRows, pathRows, resourceRows, kbRows, roleRows, subRows] = await Promise.all([
    countCoursesByStatus(),
    countPathsByStatus(),
    countResourcesByStatus(),
    db
      .select({ status: kbArticles.status, n: sql<number>`count(*)::int` })
      .from(kbArticles)
      .groupBy(kbArticles.status),
    db.select({ role: users.role, n: sql<number>`count(*)::int` }).from(users).groupBy(users.role),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(subscriptions)
      .where(
        sql`${subscriptions.paymentStatus} = 'success' and ${subscriptions.expiresAt} > now()`
      ),
  ]);

  const courses = toCounts(courseRows);
  const paths = toCounts(pathRows);
  const resources = toCounts(resourceRows);
  const kb = toCounts(kbRows);

  const usersByRole = { teacher: 0, admin: 0, sales_agent: 0 };
  for (const r of roleRows) {
    if (r.role in usersByRole) {
      usersByRole[r.role as keyof typeof usersByRole] = Number(r.n);
    }
  }

  return {
    courses,
    paths,
    resources,
    kb,
    usersByRole,
    activeSubscriptions: Number(subRows[0]?.n ?? 0),
    awaitingReview: courses.in_review + paths.in_review + resources.in_review + kb.in_review,
  };
}

export interface RetrievalStatus {
  embeddingModel: string | null;
  exemplarCount: number;
  resourceChunks: number;
  helpChunks: number;
  /** Everything needed for grounded answers is in place. */
  ready: boolean;
}

/**
 * Live diagnostics for the RAG pipeline. Surfaced in the admin UI so a missing
 * embedding model is visible there rather than only in server logs.
 */
export async function getRetrievalStatus(): Promise<RetrievalStatus> {
  const [exemplarCount, chunks] = await Promise.all([countExemplars(), countEmbeddings()]);
  const embeddingModel = embeddingModelName() || null;

  return {
    embeddingModel,
    exemplarCount,
    resourceChunks: chunks.resource,
    helpChunks: chunks.help,
    ready: Boolean(embeddingModel) && exemplarCount > 0,
  };
}

/** Admin user list with each teacher's latest subscription status. */
export async function listUsersForAdmin() {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      classLevels: users.classLevels,
      subjects: users.subjects,
      createdAt: users.createdAt,
      subscriptionStatus: sql<
        string | null
      >`(select s.payment_status::text from ${subscriptions} s where s.user_id = ${users.id} order by s.created_at desc limit 1)`,
      subscriptionExpiresAt: sql<
        string | null
      >`(select s.expires_at::text from ${subscriptions} s where s.user_id = ${users.id} order by s.created_at desc limit 1)`,
    })
    .from(users)
    .orderBy(desc(users.createdAt));
}

/** Admin subscription list, newest first, with the subscriber attached. */
export async function listSubscriptionsForAdmin() {
  return db
    .select({
      id: subscriptions.id,
      amountKobo: subscriptions.amountKobo,
      paymentStatus: subscriptions.paymentStatus,
      paystackReference: subscriptions.paystackReference,
      expiresAt: subscriptions.expiresAt,
      createdAt: subscriptions.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(subscriptions)
    .innerJoin(users, eq(subscriptions.userId, users.id))
    .orderBy(desc(subscriptions.createdAt));
}
