import { Breadcrumbs } from "@/components/layout/breadcrumbs";

export const metadata = {
  title: "Teaching Guidance — Teacher Resource Bank",
  description: "Teaching tips, curriculum guidance, and professional development articles for Nigerian educators.",
};

export default function GuidancePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Guidance" }]} />

      <div className="mt-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-ink">Teaching Guidance</h1>
        <p className="mx-auto mt-3 max-w-xl text-warm-600">
          Practical tips, curriculum guidance, and professional development articles
          written by experienced educators for Nigerian classrooms.
        </p>
      </div>

      <div className="mt-12 rounded-oak bg-white p-12 text-center shadow-warm-sm">
        <p className="text-xl">📖</p>
        <p className="mt-3 font-medium text-ink">Guidance articles are coming soon</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-warm-500">
          We&apos;re preparing practical teaching guides and curriculum-focused articles.
          In the meantime, try our AI teaching assistant for quick help.
        </p>
      </div>
    </div>
  );
}
