/**
 * Browser walkthrough of registration and the launch splash.
 *
 *   # in one terminal
 *   PORT=3100 npm run start
 *   # in another
 *   npm run walkthrough
 *
 * Drives a real Chrome against a real server. The other two scripts cover logic;
 * this one covers what only a browser can show: that the steps actually render,
 * that Step 3 really filters, that a refresh mid-flow resumes where the teacher
 * left off, that the splash really blinks before routing, and that the localStorage
 * the flow writes is encrypted.
 *
 * Uses `playwright-core` with the Chrome already installed on the machine, so it
 * needs no browser download.
 */
import "dotenv/config";
import { existsSync } from "node:fs";
import CryptoJS from "crypto-js";
import { chromium, type Browser, type Page } from "playwright-core";
import { SHIPPED_BATCH } from "../src/lib/offline/activation-batch";
import { STORAGE_KEYS } from "../src/lib/offline/keys";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3100";

const CHROME_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

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

function section(title: string): void {
  console.log(`\n${title}`);
}

function findChrome(): string {
  const hit = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!hit) {
    throw new Error(
      `Could not find Chrome. Checked:\n${CHROME_CANDIDATES.map((c) => `  ${c}`).join("\n")}`
    );
  }
  return hit;
}

/** Poll until the predicate holds, so animations don't need fixed sleeps. */
async function until<T>(fn: () => Promise<T | null>, label: string, timeoutMs = 8000): Promise<T> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = await fn();
    if (value) return value;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function visible(page: Page, text: string, timeoutMs = 8000): Promise<boolean> {
  try {
    await page.getByText(text, { exact: false }).first().waitFor({ state: "visible", timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
}

async function absent(page: Page, text: string): Promise<boolean> {
  await page.waitForTimeout(200);
  return (await page.getByText(text, { exact: false }).count()) === 0;
}

async function clickButton(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name, exact: true }).first().click();
}

/**
 * Seed the device's revocation store the way the app writes it.
 *
 * The store is encrypted at rest with the per-install secret as the AES
 * passphrase, so a test cannot poke plain JSON at it. It has to encrypt exactly
 * as `writeEncrypted` does — same library, same passphrase — which is also a
 * useful check in itself: if the storage format ever changes, this stops working
 * rather than silently passing.
 *
 * The whole store is written each time, so successive calls have to name every
 * entry they expect to be there — matching the real store, which is only ever
 * merged into.
 */
async function seedRevocations(page: Page, reasons: Record<string, string>): Promise<void> {
  const secret = await page.evaluate((key) => {
    let value = localStorage.getItem(key);
    if (!value) {
      // The app only creates the secret on its first encrypted write, which a
      // freshly-loaded page may not have done yet.
      value = "e2e0".repeat(16);
      localStorage.setItem(key, value);
    }
    return value;
  }, STORAGE_KEYS.deviceSecret);

  const store: Record<string, { reason: string; revokedAt: number; source: string }> = {};
  for (const [code, reason] of Object.entries(reasons)) {
    store[code] = { reason, revokedAt: Date.now(), source: "server" };
  }

  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, value),
    {
      key: STORAGE_KEYS.activationRevocations,
      value: CryptoJS.AES.encrypt(JSON.stringify(store), secret).toString(),
    }
  );
}

async function main() {
  const executablePath = findChrome();
  const browser: Browser = await chromium.launch({ executablePath, headless: true });

  // Uncaught exceptions are always a failure. Browser "Failed to load resource"
  // messages are not automatically: the app ships no favicon, so Chrome's own
  // /favicon.ico request 404s on every page load. Real server breakage is caught
  // separately by watching for 5xx from the API, which is the signal that matters.
  const pageErrors: string[] = [];
  const apiServerErrors: string[] = [];
  const track = (page: Page) => {
    page.on("pageerror", (err) => pageErrors.push(String(err)));
    page.on("console", (msg) => {
      const text = msg.text();
      if (msg.type() === "error" && !/Failed to load resource/i.test(text)) {
        pageErrors.push(text);
      }
    });
    page.on("response", (res) => {
      if (res.status() >= 500 && res.url().includes("/api/")) {
        apiServerErrors.push(`${res.status()} ${res.url()}`);
      }
    });
  };

  try {
    // ── Walkthrough 1: validation, filtering, bypass, act ──
    const context = await browser.newContext();
    const page = await context.newPage();
    track(page);

    section("Step 1 — validation");
    await page.goto(`${BASE}/sign-up`, { waitUntil: "domcontentloaded" });
    check("wizard renders", await visible(page, "Let's get you set up"));

    await clickButton(page, "Continue");
    check("empty name is rejected", await visible(page, "Your name is required."));

    await page.fill("#name", "Ada Obi");
    await page.fill("#email", "not-an-email");
    await clickButton(page, "Continue");
    check("malformed email is rejected", await visible(page, "Enter a valid email address."));

    await page.fill("#email", "ada@example.com");
    await clickButton(page, "Continue");
    check("valid details advance to Step 2", await visible(page, "What levels do you teach?"));

    section("Step 2 — class levels");
    await clickButton(page, "JSS");
    check("selection is confirmed back to the teacher", await visible(page, "1 level selected"));

    await clickButton(page, "Continue");
    check("advances to Step 3", await visible(page, "What subjects do you teach?"));

    section("Step 3 — subjects are filtered by level");
    check("JSS subject is offered", await visible(page, "Intermediate Science"));
    check("JSS practical trades are offered", await visible(page, "Practical Trade"));
    check("SSS-only subject is absent", await absent(page, "Further Mathematics"));
    check("SSS-only Physics is absent", await absent(page, "Physics"));
    check("Primary-only subject is absent", await absent(page, "Pre-Vocational Studies"));

    // Pick a JSS subject, then change the level underneath it.
    await clickButton(page, "Intermediate Science");
    check("subject selection registers", await visible(page, "1 subject selected"));

    await clickButton(page, "Back");
    check("returns to Step 2", await visible(page, "What levels do you teach?"));
    await clickButton(page, "JSS");
    await clickButton(page, "Primary");
    await clickButton(page, "Continue");

    section("Step 3 — changing levels drops stale subjects");
    check("Primary subject now offered", await visible(page, "Pre-Vocational Studies"));
    check("replaced level's subject is gone", await absent(page, "Intermediate Science"));
    // Deselecting JSS must have dropped the JSS subject that was selected, so the
    // count is back to the empty-state prompt rather than "1 subject selected".
    check("stale selection was dropped", await absent(page, "1 subject selected"));
    check("empty selection prompt is shown again", await visible(page, "Tap all the subjects you teach"));

    await clickButton(page, "Mathematics");
    await clickButton(page, "Continue");
    check("advances to Step 4", await visible(page, "Nigerian Academic Term Pass"));
    check("placeholder price shown", await visible(page, "₦5,000"));

    section("Activation bypass");
    await clickButton(page, "Input Activation Code");
    check("bypass opens", await visible(page, "Already have a code?"));

    await page.fill("#activation-bypass", "TRB-ZZZZ-ZZZZ");
    await clickButton(page, "Apply");
    check("unknown code is rejected", await visible(page, "We don't recognise that code."));

    await page.fill("#activation-bypass", "not-a-code");
    await clickButton(page, "Apply");
    check("malformed code is rejected", await visible(page, "It should look like TRB-XXXX-XXXX."));

    const goodCode = SHIPPED_BATCH.codes[4].code;
    await page.fill("#activation-bypass", goodCode);
    await clickButton(page, "Apply");
    check("valid code skips the remaining steps", await visible(page, "Your term pass is active"));
    check("the granted code is confirmed", await visible(page, goodCode));

    section("Model provisioning");
    check(
      "locally installed model is detected (not a fake transfer)",
      await visible(page, "using the model already installed on this device", 12000)
    );

    section("Storage is encrypted at rest");
    const storage = await page.evaluate(() => {
      const out: Record<string, string> = {};
      for (const key of Object.keys(localStorage)) out[key] = localStorage.getItem(key) ?? "";
      return out;
    });
    const storageKeys = Object.keys(storage);
    check("device token written", storageKeys.includes("trb.device.token"));
    check("term pass written", storageKeys.includes("trb.term.pass"));
    check("code binding written", storageKeys.includes("trb.activation.bindings"));
    check(
      "activation code is not stored in plaintext",
      !storage["trb.activation.bindings"].includes(goodCode)
    );
    check(
      "term pass is not stored in plaintext",
      !storage["trb.term.pass"].includes(goodCode) && !storage["trb.term.pass"].includes("expiresAt")
    );
    check("draft was cleared on completion", !storageKeys.includes("trb.registration.draft"));

    section("Handoff to the app");
    await clickButton(page, "Go to my courses");
    await until(async () => page.url().includes("/courses"), "navigation to /courses", 10000);
    check("lands on the course catalog", page.url().includes("/courses"));

    // ── Walkthrough 2: draft survives a refresh ──
    section("Refresh mid-flow resumes the wizard");
    const freshContext = await browser.newContext();
    const fresh = await freshContext.newPage();
    track(fresh);

    await fresh.goto(`${BASE}/sign-up`, { waitUntil: "domcontentloaded" });
    await fresh.fill("#name", "Bola Ade");
    await fresh.fill("#email", "bola@example.com");
    await clickButton(fresh, "Continue");
    await clickButton(fresh, "SSS");
    await clickButton(fresh, "Continue");
    check("reached Step 3 with SSS", await visible(fresh, "Digital Technologies"));

    await fresh.reload({ waitUntil: "domcontentloaded" });
    check("refresh returns to Step 3", await visible(fresh, "What subjects do you teach?"));
    check("SSS selection survived the refresh", await visible(fresh, "Digital Technologies"));
    check("name survived the refresh", await absent(fresh, "Let's get you set up"));

    await freshContext.close();

    // ── Walkthrough 3: splash + device recognition ──
    section("Launch splash routes an unregistered device to registration");
    const splashContext = await browser.newContext();
    const splash = await splashContext.newPage();
    track(splash);

    const startedAt = Date.now();
    await splash.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
    check("splash is shown immediately on launch", await visible(splash, "Opening your classroom", 4000));
    await until(async () => splash.url().includes("/sign-up"), "splash to route to /sign-up", 15000);
    const splashMs = Date.now() - startedAt;
    check(
      "splash held the screen for the full blink cycle",
      splashMs >= 3000,
      `routed after ${splashMs}ms`
    );
    await splashContext.close();

    section("Launch splash routes a registered device into the app");
    const knownContext = await browser.newContext();
    const known = await knownContext.newPage();
    track(known);

    // Register this device by completing registration quickly via the bypass.
    await known.goto(`${BASE}/sign-up`, { waitUntil: "domcontentloaded" });
    await known.evaluate((key) => {
      sessionStorage.setItem(key, "1");
    }, STORAGE_KEYS.splashShown);
    await clickButton(known, "Input Activation Code");
    await known.fill("#activation-bypass", SHIPPED_BATCH.codes[5].code);
    await clickButton(known, "Apply");
    check("second device activates too", await visible(known, "Your term pass is active"));

    await known.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
    await until(async () => known.url().includes("/courses"), "recognised device to reach /courses", 15000);
    check("recognised device goes straight to the app", known.url().includes("/courses"));
    await knownContext.close();

    // ── Walkthrough 4: per-code revocation, in a real browser ──
    section("A revoked code is refused, with no network involved");
    const revokedContext = await browser.newContext();
    const revokedPage = await revokedContext.newPage();
    track(revokedPage);

    const revokedCode = SHIPPED_BATCH.codes[6].code;
    const healthyCode = SHIPPED_BATCH.codes[7].code;

    await revokedPage.goto(`${BASE}/sign-up`, { waitUntil: "domcontentloaded" });
    await seedRevocations(revokedPage, { [revokedCode]: "refunded, duplicate purchase" });
    await revokedPage.reload({ waitUntil: "domcontentloaded" });

    await clickButton(revokedPage, "Input Activation Code");
    await revokedPage.fill("#activation-bypass", revokedCode);
    await clickButton(revokedPage, "Apply");
    check("a revoked code is refused", await visible(revokedPage, "has been cancelled"));
    check("the revoked code does not unlock anything", await absent(revokedPage, "Your term pass is active"));

    await revokedPage.fill("#activation-bypass", healthyCode);
    await clickButton(revokedPage, "Apply");
    check("a code that is not revoked still works", await visible(revokedPage, "Your term pass is active"));

    // Now revoke the code this device has just used — the case that could not be
    // handled before: a pass already granted for a code cancelled later.
    await seedRevocations(revokedPage, {
      [revokedCode]: "refunded, duplicate purchase",
      [healthyCode]: "refunded after activation",
    });
    await revokedPage.reload({ waitUntil: "domcontentloaded" });
    check(
      "a revoked pass is removed on the next launch",
      await visible(revokedPage, "Your previous pass was removed")
    );
    check("the teacher is told why", await visible(revokedPage, "refunded after activation"));

    const swept = await revokedPage.evaluate(
      (keys) => keys.map((key) => localStorage.getItem(key)),
      [STORAGE_KEYS.termPass, STORAGE_KEYS.deviceToken]
    );
    check("the term pass is gone", swept[0] === null);
    check("the device is no longer recognised", swept[1] === null);

    await clickButton(revokedPage, "Input Activation Code");
    await revokedPage.fill("#activation-bypass", healthyCode);
    await clickButton(revokedPage, "Apply");
    check(
      "a cancelled code cannot be re-redeemed",
      await visible(revokedPage, "has been cancelled")
    );
    await revokedContext.close();

    await context.close();

    section("Console hygiene");
    check("no uncaught page errors", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
    check("no API 5xx responses", apiServerErrors.length === 0, apiServerErrors.slice(0, 3).join(" | "));
  } finally {
    await browser.close();
  }

  console.log(`\n${passed} checks passed, ${failures.length} failed.`);
  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  - ${f}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("\nWalkthrough crashed:", error);
  process.exitCode = 1;
});
