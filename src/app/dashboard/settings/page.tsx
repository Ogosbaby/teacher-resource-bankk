import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody } from "@/components/ui";
import { ProfileForm } from "@/components/settings/profile-form";

export const metadata = { title: "Settings · Teacher Resource Bank" };

// Auth-only by design — a teacher must be able to fix their own details even
// with a lapsed subscription.
export default async function SettingsPage() {
  const session = await requireSession();
  const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your details, class levels, and subjects."
      />
      <Card>
        <CardBody className="p-6">
          <ProfileForm
            initialName={user?.name ?? ""}
            email={user?.email ?? ""}
            initialClassLevels={user?.classLevels ?? []}
            initialSubjects={user?.subjects ?? []}
          />
        </CardBody>
      </Card>
    </>
  );
}
