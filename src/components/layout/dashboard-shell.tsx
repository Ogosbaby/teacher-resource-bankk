import { TopNav, type NavItem, type NavNotification } from "./top-nav";

// "Learn" is the default tab and owns the whole /dashboard/learn/* subtree
// (catalog, learning paths, resource bank), so it prefix-matches its children.
const teacherNav: NavItem[] = [
  { label: "Learn", href: "/dashboard/learn" },
  { label: "My Learning", href: "/dashboard/my-learning" },
  { label: "Certificates", href: "/dashboard/certificates" },
];

export function DashboardShell({
  children,
  notifications = [],
}: {
  children: React.ReactNode;
  notifications?: NavNotification[];
}) {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <TopNav
        items={teacherNav}
        brandLabel="Teacher Resource Bank"
        brandHref="/dashboard/learn"
        roleLabel="Teacher"
        notifications={notifications}
      />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
