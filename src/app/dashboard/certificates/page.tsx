import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { certificates } from "@/lib/db/schema";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody } from "@/components/ui";

export const metadata = { title: "Certificates · Teacher Resource Bank" };

// Auth-only by design — earned certificates must remain accessible even
// when the subscription lapses. No subscription check here, ever.
export default async function CertificatesPage() {
  const session = await requireSession();
  const certs = await db
    .select()
    .from(certificates)
    .where(eq(certificates.userId, session.user.id))
    .orderBy(desc(certificates.issuedAt));

  return (
    <>
      <PageHeader
        title="Certificates"
        description="Your earned certificates — always available, even if your term pass lapses."
      />

      {certs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center">
          <p className="font-medium text-ink">No certificates yet.</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
            Finish every module in a course and mark it complete — your certificate is
            generated automatically and stays here permanently.
          </p>
          <Link
            href="/dashboard/learn"
            className="mt-5 inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Browse courses
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {certs.map((c) => (
            <Card key={c.id}>
              <CardBody>
                <p className="text-xs font-medium uppercase tracking-widest text-neutral-400">
                  Certificate of completion
                </p>
                <h2 className="mt-2 font-semibold leading-snug text-ink">
                  {c.titleSnapshot}
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Awarded to {c.recipientNameSnapshot} · Completed{" "}
                  {new Date(c.completionDate).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </p>

                <a
                  href={`/api/certificates/${c.id}/download`}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-ink"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                    <path
                      d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Download PDF
                </a>

                <p className="mt-4 text-[11px] leading-relaxed text-neutral-400">
                  AI-assisted content, reviewed by Teacher Resource Bank.
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
