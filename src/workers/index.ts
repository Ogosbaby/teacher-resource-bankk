import "dotenv/config";
import PgBoss from "pg-boss";
import { QUEUES } from "@/lib/jobs/queue";
import { handleEmbedContent } from "@/lib/jobs/embed-content";
import { handleIssueCertificate } from "@/lib/jobs/issue-certificate";
import { handleRenewalReminder, handleRenewalScan } from "@/lib/jobs/renewal-reminder";

/**
 * Background worker. Run alongside the web app:
 *
 *   npm run dev      # web
 *   npm run worker   # this process
 *
 * Jobs are enqueued by the app and processed here. If this process is not
 * running, jobs stay queued (they are not lost) and are picked up when it starts.
 * Enqueueing never fails a request — see src/lib/jobs/queue.ts.
 */
async function main() {
  const boss = new PgBoss({ connectionString: process.env.DATABASE_URL });
  boss.on("error", (err) => console.error("[worker] pg-boss error:", err));

  await boss.start();

  await boss.work(QUEUES.embedContent, handleEmbedContent);
  console.log(`[worker] registered handler: ${QUEUES.embedContent}`);

  await boss.work(QUEUES.issueCertificate, handleIssueCertificate);
  console.log(`[worker] registered handler: ${QUEUES.issueCertificate}`);

  await boss.work(QUEUES.renewalReminder, handleRenewalReminder);
  console.log(`[worker] registered handler: ${QUEUES.renewalReminder}`);

  await boss.work(QUEUES.renewalScan, handleRenewalScan);
  console.log(`[worker] registered handler: ${QUEUES.renewalScan}`);

  // Daily at 06:00. The cron lives in Postgres, not in this process, so several
  // workers cannot each schedule their own scan and it survives a restart — and
  // running the scan twice would be harmless anyway (its writes are idempotent).
  await boss.schedule(QUEUES.renewalScan, "0 6 * * *");
  console.log(`[worker] scheduled: ${QUEUES.renewalScan} daily at 06:00`);

  console.log("[worker] ready — waiting for jobs");
}

main().catch((err) => {
  console.error("[worker] failed to start:", err);
  process.exit(1);
});
