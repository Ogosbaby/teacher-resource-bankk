import { auth } from "@/lib/auth/config";
import {
  listActiveEnrollments,
  listCompletedEnrollments,
} from "@/lib/services/courses.service";
import { MyLibraryView } from "@/components/library/my-library-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Library — Teacher Resource Bank",
  description: "Your enrolled and completed CPD courses.",
};

export default async function MyLibraryPage() {
  let active: any[] = [];
  let completed: any[] = [];

  try {
    const session = await auth();
    if (session?.user?.id) {
      const [act, comp] = await Promise.all([
        listActiveEnrollments(session.user.id),
        listCompletedEnrollments(session.user.id),
      ]);
      active = act;
      completed = comp;
    }
  } catch {
    // DB offline or no session: client will read local enrollments
  }

  return <MyLibraryView initialActive={active} initialCompleted={completed} />;
}
