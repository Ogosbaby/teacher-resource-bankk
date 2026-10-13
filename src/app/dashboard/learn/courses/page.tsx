import { redirect } from "next/navigation";

// The Learn tab IS the course catalog now, so this older child route just
// forwards — keeps any existing bookmarks working.
export default function CoursesPage() {
  redirect("/dashboard/learn");
}
