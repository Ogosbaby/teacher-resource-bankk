import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/guards";
import { getLatestSubscription } from "@/lib/services/subscriptions.service";
import { db } from "@/lib/db/client";
import { terms } from "@/lib/db/schema";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, Card, CardBody } from "@/components/ui";

function formatNaira(kobo: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(kobo / 100);
}

// Auth-only — no requireActiveSubscription() call. A lapsed subscriber must
// still be able to reach this page to renew.
export default async function BillingPage() {
  const session = await requireSession();
  const sub = await getLatestSubscription(session.user.id);

  const term = sub
    ? (await db.select().from(terms).where(eq(terms.id, sub.termId)).limit(1))[0]
    : null;

  return (
    <>
      <PageHeader title="Billing" description="Your subscription status for the current term." />
      <Card className="max-w-lg">
        <CardBody>
          {!sub ? (
            <>
              <Badge variant="expired">No subscription</Badge>
              <p className="mt-3 text-sm text-neutral-600">
                You don&apos;t have an active subscription. Course, resource, and chat access
                unlocks once your ₦5,000 term payment is confirmed — the Paystack checkout
                flow is the next build milestone.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Badge variant={sub.paymentStatus}>{sub.paymentStatus}</Badge>
                <span className="text-sm text-neutral-500">{term?.name}</span>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Amount</dt>
                  <dd className="font-medium text-neutral-900">{formatNaira(sub.amountKobo)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Access until</dt>
                  <dd className="font-medium text-neutral-900">
                    {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString("en-NG") : "—"}
                  </dd>
                </div>
              </dl>
            </>
          )}
        </CardBody>
      </Card>

      {sub?.paymentStatus === "success" && (
        <Card className="mt-6 max-w-lg">
          <CardBody>
            <h2 className="font-semibold text-ink">Get the app</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Take your lesson notes, saved lesson plans, and course progress offline with the
              desktop and Android apps.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="/downloads?platform=windows"
                className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
              >
                Download App for Desktop (Windows)
              </a>
              <a
                href="/downloads?platform=android"
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-400"
              >
                Download App for Android
              </a>
            </div>
          </CardBody>
        </Card>
      )}
    </>
  );
}
