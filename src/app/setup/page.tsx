import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Check = { name: string; configured: boolean; detail: string };

// Presence-only checks. Never render the values themselves — this page is
// reachable without auth.
function envChecks(): Check[] {
  return [
    {
      name: "Neon Postgres connection",
      configured: Boolean(process.env.DATABASE_URL),
      detail: "DATABASE_URL",
    },
    {
      name: "Session signing secret",
      configured: Boolean(process.env.AUTH_SECRET),
      detail: "AUTH_SECRET",
    },
    {
      name: "Local Qwen endpoint",
      configured: Boolean(process.env.QWEN_BASE_URL),
      detail: process.env.QWEN_BASE_URL ?? "QWEN_BASE_URL unset",
    },
    {
      name: "Qwen model tag",
      configured: Boolean(process.env.QWEN_MODEL),
      detail: process.env.QWEN_MODEL ?? "QWEN_MODEL unset",
    },
    {
      name: "Google provider (optional)",
      configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      detail: "Loads only when both client id and secret are set",
    },
  ];
}

const BUILD_STATUS: { feature: string; done: boolean; note: string }[] = [
  { feature: "Offline-first registration wizard", done: true, note: "4 steps, level-filtered subjects, survives refresh" },
  { feature: "Activation-code bypass + device binding", done: true, note: "Code bound to a local device UUID; reuse rejected" },
  { feature: "Encrypted local term pass", done: true, note: "crypto-js AES, 3 months, per-install key" },
  { feature: "Splash + device recognition", done: true, note: "3 blinks, then an offline token check" },
  { feature: "Reformed curriculum data", done: true, note: "Primary / JSS / SSS pools with level-tagged ids" },
  { feature: "Signed activation-code batch", done: true, note: "ECDSA P-256, verified offline and server-side" },
  { feature: "Server sync of the local term pass", done: true, note: "Idempotent per code; cross-account reuse returns 409" },
  { feature: "Sync retry on reconnect", done: true, note: "Online-event loop; a revoked pass is explained to the teacher" },
  { feature: "Local model detection", done: true, note: "Probes Ollama /api/tags via /api/model/local" },
  { feature: "Bundled model transfer", done: false, note: "Only the simulated fallback exists" },
  { feature: "Offline flow + sync E2E + browser walkthrough", done: true, note: "122 checks across npm run verify:offline, verify:sync, walkthrough" },
  { feature: "RAG retrieval + KB router", done: false, note: "content_embeddings currently empty" },
  { feature: "Certificate PDF generation", done: false, note: "Needs a PDF lib + storage" },
  { feature: "Real Paystack checkout", done: false, note: "Deferred by design; demo placeholder only" },
];

export default function SystemSetupPage() {
  const checks = envChecks();
  const configuredCount = checks.filter((c) => c.configured).length;

  return (
    <div className="mx-auto max-w-5xl bg-neutral-50 p-8">
      <PageHeader
        title="System Diagnostics"
        description="Environment configuration and current build status. No secret values are displayed on this page."
        badge={<Badge variant="neutral">Dev only</Badge>}
        actions={
          <Link href="/dashboard">
            <Button size="sm">Go to dashboard →</Button>
          </Link>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-neutral-900">Environment</h3>
              <Badge variant={configuredCount === checks.length ? "published" : "draft"}>
                {configuredCount} / {checks.length} configured
              </Badge>
            </div>
          </CardHeader>
          <CardBody className="divide-y divide-neutral-100">
            {checks.map((c) => (
              <div key={c.name} className="flex items-center justify-between gap-4 py-3 text-sm">
                <span className="font-medium text-neutral-800">{c.name}</span>
                <div className="flex items-center gap-3">
                  <code className="text-xs text-neutral-400">{c.detail}</code>
                  <Badge variant={c.configured ? "published" : "draft"}>
                    {c.configured ? "set" : "missing"}
                  </Badge>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-bold text-neutral-900">Build status</h3>
          </CardHeader>
          <CardBody className="divide-y divide-neutral-100">
            {BUILD_STATUS.map((s) => (
              <div key={s.feature} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-neutral-800">{s.feature}</p>
                  <p className="text-xs text-neutral-400">{s.note}</p>
                </div>
                <Badge variant={s.done ? "published" : "draft"}>{s.done ? "done" : "not built"}</Badge>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-bold text-neutral-900">Local run commands (Git Bash)</h3>
          </CardHeader>
          <CardBody className="space-y-2 rounded-b-xl bg-neutral-900 p-4 font-mono text-xs leading-relaxed text-neutral-200">
            <p className="text-emerald-400"># database is Neon (cloud) — no local or Docker Postgres</p>
            <p>cp .env.example .env</p>
            <p className="text-emerald-400"># apply schema, then seed demo accounts</p>
            <p>npx tsx scripts/migrate-0002.ts</p>
            <p>npm run seed</p>
            <p className="text-emerald-400"># Ollama must already be running for any AI feature</p>
            <p>ollama serve</p>
            <p className="text-emerald-400"># web app + background worker, in two terminals</p>
            <p>npm run dev</p>
            <p>npm run worker</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
