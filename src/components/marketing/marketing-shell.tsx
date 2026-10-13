import { Navbar } from "./navbar";
import { Footer } from "./footer";

/**
 * @deprecated Use TeacherShell from @/components/layout/teacher-shell instead.
 * Kept for backwards compatibility with any remaining imports.
 */
export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
