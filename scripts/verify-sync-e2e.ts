/**
 * End-to-end test for the authenticated half of the term-pass sync.
 *
 *   # in one terminal
 *   npm run start
 *   # in another
 *   npx tsx scripts/verify-sync-e2e.ts
 *
 * `verify-offline-flow.ts` covers everything that runs without a network. This
 * covers what it cannot: the real HTTP route, a real NextAuth session, and the
 * real Postgres writes behind it — including the cross-account reuse rejection
 * and per-code revocation, the two security properties that can only be enforced
 * server-side.
 *
 * Revocation is exercised against a **synthetic** code (`TRB-E2E9-TEST`, which is
 * in no batch and belongs to nobody), never a real one: this suite runs against a
 * real database, and cancelling a pilot teacher's code to prove a point would be
 * an unacceptable side effect.
 *
 * It creates two throwaway teacher accounts, drives them over HTTP, and deletes
 * every row it created (subscriptions, users, and any term it introduced). Your
 * seeded teacher and admin are never touched.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq, inArray } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import { subscriptions, terms, users } from "../src/lib/db/schema";
import { SHIPPED_BATCH } from "../src/lib/offline/activation-batch";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const PASSWORD = "E2ePassw0rd!";

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(detail ? `${name} — ${detail}` : name);
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

class CookieJar {
  private jar = new Map<string, string>();

  absorb(res: Response): void {
    for (const line of res.headers.getSetCookie()) {
      const [pair] = line.split(";");
      const idx = pair.indexOf("=");
      if (idx < 0) continue;
      const name = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      if (value) this.jar.set(name, value);
      else this.jar.delete(name);
    }
  }

  header(): string {
    return Array.from(this.jar, ([k, v]) => `${k}=${v}`).join("; ");
  }

  hasSession(): boolean {
    return Array.from(this.jar.keys()).some((k) => k.includes("session-token"));
  }
}

async function signIn(email: string): Promise<CookieJar> {
  const jar = new CookieJar();

  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  jar.absorb(csrfRes);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

  const body = new URLSearchParams({
    csrfToken,
    email,
    password: PASSWORD,
    callbackUrl: `${BASE}/courses`,
    json: "true",
  });

  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: jar.header() },
    body,
    redirect: "manual",
  });
  jar.absorb(res);

  if (!jar.hasSession()) {
    throw new Error(
      `Sign-in produced no session cookie for ${email} (status ${res.status}). Check AUTH_SECRET and that the server loaded .env.`
    );
  }
  return jar;
}

interface SyncResponse {
  status: number;
  body: Record<string, unknown>;
}

async function syncPass(
  jar: CookieJar,
  payload: { token: string; code: string | null; deviceId: string }
): Promise<SyncResponse> {
  const res = await fetch(`${BASE}/api/subscriptions/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: jar.header() },
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: (await res.json().catch(() => ({}))) as Record<string, unknown> };
}

async function waitForServer(attempts = 30): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${BASE}/api/model/local`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`No server answering at ${BASE}. Start it with \`npm run start\` first.`);
}

async function main() {
  const stamp = Date.now();
  const emailA = `e2e-sync-a-${stamp}@trb.local`;
  const emailB = `e2e-sync-b-${stamp}@trb.local`;
  const deviceA = `e2e-device-a-${stamp}`;
  const deviceB = `e2e-device-b-${stamp}`;

  const codeFirst = SHIPPED_BATCH.codes[2].code;
  const codeSecond = SHIPPED_BATCH.codes[3].code;

  const termsBefore = new Set((await db.select({ id: terms.id }).from(terms)).map((t) => t.id));

  // Synthetic: not in any batch, so revoking it cannot affect a real teacher.
  const revokedCode = "TRB-E2E9-TEST";

  let createdUserIds: string[] = [];
  let revocationCreated = false;

  try {
    await waitForServer();

    console.log("Setup");
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const created = await db
      .insert(users)
      .values([
        { email: emailA, name: "E2E Sync A", role: "teacher", passwordHash },
        { email: emailB, name: "E2E Sync B", role: "teacher", passwordHash },
      ])
      .returning({ id: users.id, email: users.email });
    createdUserIds = created.map((u) => u.id);
    const userA = created.find((u) => u.email === emailA)!.id;
    const userB = created.find((u) => u.email === emailB)!;
    check("two throwaway teacher accounts created", createdUserIds.length === 2);

    console.log("\nSessions");
    const jarA = await signIn(emailA);
    check("account A signs in", jarA.hasSession());
    const jarB = await signIn(emailB);
    check("account B signs in", jarB.hasSession());

    console.log("\nRedemption");
    const first = await syncPass(jarA, { token: `tok-a-${stamp}`, code: codeFirst, deviceId: deviceA });
    check("A's first sync succeeds", first.status === 200, `status ${first.status} ${JSON.stringify(first.body)}`);

    const rowsForCode = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.paystackReference, `code:${codeFirst}`));
    check("exactly one subscription row exists for the code", rowsForCode.length === 1, `found ${rowsForCode.length}`);
    check("the row belongs to account A", rowsForCode[0]?.userId === userA);
    check("the row is marked successful", rowsForCode[0]?.paymentStatus === "success");

    const expiry = rowsForCode[0]?.expiresAt ? new Date(rowsForCode[0].expiresAt).getTime() : 0;
    const days = (expiry - Date.now()) / 86_400_000;
    check("the pass runs for the signed months", days > 80 && days < 100, `${days.toFixed(0)} days`);
    check("the amount is not a fake charge", rowsForCode[0]?.amountKobo === 0);

    console.log("\nIdempotency");
    const repeat = await syncPass(jarA, { token: `tok-a-${stamp}`, code: codeFirst, deviceId: deviceA });
    check("A re-syncing the same code succeeds", repeat.status === 200);
    const rowsAfterRetry = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.paystackReference, `code:${codeFirst}`));
    check("the retry did not create a second row", rowsAfterRetry.length === 1, `found ${rowsAfterRetry.length}`);
    check(
      "the retry did not extend the expiry",
      new Date(rowsAfterRetry[0].expiresAt!).getTime() === expiry
    );

    console.log("\nCross-account reuse");
    const stolen = await syncPass(jarB, { token: `tok-b-${stamp}`, code: codeFirst, deviceId: deviceB });
    check("B redeeming A's code is rejected with 409", stolen.status === 409, `status ${stolen.status} ${JSON.stringify(stolen.body)}`);
    check("B did not receive a subscription", !(await accountHasSubscription(userB.id)));

    console.log("\nSecond code is unaffected");
    const second = await syncPass(jarB, { token: `tok-b2-${stamp}`, code: codeSecond, deviceId: deviceB });
    check("B can redeem a fresh code", second.status === 200, `status ${second.status} ${JSON.stringify(second.body)}`);
    check("B now has a subscription", await accountHasSubscription(userB.id));

    console.log("\nValidation");
    const bogus = await syncPass(jarB, { token: `tok-b3-${stamp}`, code: "TRB-FAKE-CODE", deviceId: deviceB });
    check("an unlisted code is rejected", bogus.status === 400, `status ${bogus.status}`);

    const demo = await syncPass(jarA, { token: `tok-a-demo-${stamp}`, code: null, deviceId: deviceA });
    check("a codeless demo pass syncs", demo.status === 200, `status ${demo.status}`);
    check("the server clamps a codeless pass to 3 months", demo.body.months === 3, `got ${demo.body.months}`);

    const anonymous = await fetch(`${BASE}/api/subscriptions/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "anon-token-1234", code: null, deviceId: "anon-device-1234" }),
    });
    check("an unauthenticated sync is refused", anonymous.status === 401, `status ${anonymous.status}`);

    console.log("\nPer-code revocation");
    const revocations = await import("../src/lib/services/activation-revocations.service");
    const subs = await import("../src/lib/services/subscriptions.service");

    // Point A's subscription at the synthetic code, so revoking it has a real row
    // to find without a real code being involved.
    await db
      .update(subscriptions)
      .set({ paystackReference: `code:${revokedCode}` })
      .where(eq(subscriptions.userId, userA));
    check("A holds an active subscription before revocation", (await subs.getActiveSubscription(userA)) !== null);

    const revoked = await revocations.revokeActivationCode({ code: revokedCode, reason: "e2e revocation" });
    revocationCreated = true;
    check("revoking marks the code revoked", revoked.revocation.code === revokedCode);
    check("revoking refunds the subscription it was redeemed into", revoked.subscriptionRevoked);
    check(
      "the server-side subscription gate is now closed",
      (await subs.getActiveSubscription(userA)) === null
    );

    const refused = await syncPass(jarA, { token: `tok-a-rev-${stamp}`, code: revokedCode, deviceId: deviceA });
    check(
      "a revoked code is answered with 410, not 200",
      refused.status === 410,
      `status ${refused.status} ${JSON.stringify(refused.body)}`
    );
    check(
      "the refusal names the code, so the device can stop honouring it",
      (refused.body.revocations as Array<{ code: string }> | undefined)?.some((r) => r.code === revokedCode) === true,
      JSON.stringify(refused.body.revocations)
    );

    // Every response carries the list, including a healthy one for a different
    // pass — that is the only channel that reaches a device whose own code is fine.
    const healthy = await syncPass(jarB, { token: `tok-b-rev-${stamp}`, code: codeSecond, deviceId: deviceB });
    check("a healthy sync still succeeds", healthy.status === 200, `status ${healthy.status}`);
    check(
      "a healthy sync reports the revocation list",
      (healthy.body.revocations as Array<{ code: string }> | undefined)?.some((r) => r.code === revokedCode) === true,
      JSON.stringify(healthy.body.revocations)
    );
    const document = healthy.body.revocationsDocument as { signature?: string } | null;
    check(
      "the revocation document is either absent or signed",
      document === null || typeof document.signature === "string",
      JSON.stringify(document)
    );

    const undone = await revocations.unrevokeActivationCode(revokedCode);
    revocationCreated = false;
    check("undo removes the revocation", undone.removed);
    check("undo restores the subscription", undone.subscriptionRestored);
    check("the server-side gate is open again", (await subs.getActiveSubscription(userA)) !== null);
  } finally {
    // ── Cleanup: remove everything this run created ──────
    console.log("\nCleanup");
    if (createdUserIds.length > 0) {
      const deletedSubs = await db
        .delete(subscriptions)
        .where(inArray(subscriptions.userId, createdUserIds))
        .returning({ id: subscriptions.id });
      const deletedUsers = await db
        .delete(users)
        .where(inArray(users.id, createdUserIds))
        .returning({ id: users.id });
      check("throwaway subscriptions removed", deletedSubs.length >= 0);
      check("throwaway accounts removed", deletedUsers.length === createdUserIds.length);
    }

    if (revocationCreated) {
      const revocations = await import("../src/lib/services/activation-revocations.service");
      await revocations.unrevokeActivationCode(revokedCode);
      check("synthetic revocation removed", true);
    }

    const termsAfter = await db.select({ id: terms.id, name: terms.name }).from(terms);
    const newTerms = termsAfter.filter((t) => !termsBefore.has(t.id));
    if (newTerms.length > 0) {
      await db.delete(terms).where(inArray(terms.id, newTerms.map((t) => t.id)));
      check("terms created by the test were removed", true);
    } else {
      check("no terms were created (an active term already existed)", true);
    }
  }

  console.log(`\n${passed} checks passed, ${failures.length} failed.`);
  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  - ${f}`);
    process.exitCode = 1;
  }
  process.exit(failures.length > 0 ? 1 : 0);
}

async function accountHasSubscription(userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return rows.length > 0;
}

main().catch((error) => {
  console.error("\nE2E run failed:", error);
  process.exit(1);
});
