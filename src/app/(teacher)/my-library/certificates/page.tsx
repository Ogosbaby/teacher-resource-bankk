import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { certificates } from "@/lib/db/schema";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardBody } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Certificates — Teacher Resource Bank" };

export default async function CertificatesPage() {
  let certs: any[] = [];
  try {
    const session = await auth();
    if (session?.user?.id) {
      certs = await db
        .select()
        .from(certificates)
        .where(eq(certificates.userId, session.user.id))
        .orderBy(desc(certificates.issuedAt));
    }
  } catch {
    // Handled gracefully for device token or offline users
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "My Library", href: "/my-library" },
          { label: "Certificates" },
        ]}
      />

      <div className="mt-6">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Certificates</h1>
        <p className="mt-2 text-warm-600">
          Your earned certificates — always available, even if your term pass lapses.
        </p>
      </div>

      {certs.length === 0 ? (
        <div className="mt-8 rounded-oak bg-white p-12 text-center shadow-warm-sm">
          <p className="text-xl">🏅</p>
          <p className="mt-3 font-medium text-ink">No certificates yet.</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-warm-500">
            Finish every module in a CPD course and mark it complete — your certificate is
            generated automatically and stays here permanently.
          </p>
          <Link
            href="/courses"
            className="mt-5 inline-flex rounded-2xl bg-ink px-6 py-3 text-sm font-medium text-white transition-all hover:bg-warm-800"
          >
            Browse courses
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {certs.map((c) => (
            <Card key={c.id}>
              <CardBody>
                <p className="text-xs font-medium uppercase tracking-widest text-warm-400">
                  Certificate of completion
                </p>
                <h2 className="mt-2 font-semibold leading-snug text-ink">{c.titleSnapshot}</h2>
                <p className="mt-1 text-sm text-warm-500">
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
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-warm-300 px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-ink"
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

                <p className="mt-4 text-[11px] leading-relaxed text-warm-400">
                  AI-assisted content, reviewed by Teacher Resource Bank.
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
