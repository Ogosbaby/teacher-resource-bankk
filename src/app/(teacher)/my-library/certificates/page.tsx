import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { certificates } from "@/lib/db/schema";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { CertificatesView } from "@/components/certificates/certificates-view";

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

      <CertificatesView serverCerts={certs} />
    </div>
  );
}
