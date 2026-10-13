/**
 * Offline-flow verification.
 *
 *   npm run verify:offline
 *
 * Runs the real offline modules — encryption, device recognition, signed-batch
 * activation, term passes, the registration draft — against an in-memory
 * localStorage shim. Nothing is mocked except the browser storage API, so a
 * passing run is evidence the flow genuinely works without a network.
 *
 * This is not a substitute for clicking through the UI, and it cannot exercise
 * the two server-side halves (the term-pass sync route and the model probe),
 * which need a running database and Ollama. Those are listed as skipped at the
 * end rather than silently omitted.
 */
import { existsSync, readFileSync } from "node:fs";
import { createPrivateKey } from "node:crypto";
import { resolve } from "node:path";

class MemoryStorage {
  private map = new Map<string, string>();

  get length() {
    return this.map.size;
  }
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  clear(): void {
    this.map.clear();
  }
  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }
}

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

globalThis.window = { localStorage: new MemoryStorage() } as unknown as Window & typeof globalThis;

async function main() {
  const crypto = await import("../src/lib/offline/crypto");
  const keys = await import("../src/lib/offline/keys");
  const device = await import("../src/lib/offline/device");
  const activation = await import("../src/lib/offline/activation");
  const batch = await import("../src/lib/offline/activation-batch");
  const revocations = await import("../src/lib/offline/activation-revocations");
  const termPass = await import("../src/lib/offline/term-pass");
  const sync = await import("../src/lib/offline/sync");
  const draft = await import("../src/lib/offline/registration-draft");
  const localModel = await import("../src/lib/offline/local-model");
  const curriculum = await import("../src/lib/content/curriculum");

  const store = globalThis.window.localStorage;

  // ── Encryption ────────────────────────────────────────
  section("Encryption");
  const secret = { name: "Ada Obi", email: "ada@example.com", subjects: ["jss_mathematics"] };
  crypto.writeEncrypted("test.secret", secret);
  const roundTripped = crypto.readEncrypted<typeof secret>("test.secret");
  check("round-trips a nested object", JSON.stringify(roundTripped) === JSON.stringify(secret));

  const raw = store.getItem("test.secret") ?? "";
  check("plaintext is not present in storage", !raw.includes("ada@example.com") && !raw.includes("Ada Obi"));
  check("ciphertext is non-trivial", raw.length > 32);

  const tampered = `${raw.slice(0, -2)}${raw.slice(-2) === "AA" ? "BB" : "AA"}`;
  store.setItem("test.secret", tampered);
  check("tampered ciphertext decrypts to null", crypto.readEncrypted("test.secret") === null);

  // A different install secret must not open another install's data.
  const previousSecret = store.getItem(keys.STORAGE_KEYS.deviceSecret);
  store.setItem(keys.STORAGE_KEYS.deviceSecret, "0000deadbeef0000deadbeef0000deadbeef0000deadbeef0000deadbeef0000dead");
  crypto.writeEncrypted("test.secret", secret);
  store.setItem(keys.STORAGE_KEYS.deviceSecret, previousSecret ?? "");
  check("data written under another install key is unreadable", crypto.readEncrypted("test.secret") === null);

  store.clear();

  // ── Device recognition ────────────────────────────────
  section("Device recognition");
  const firstId = device.getDeviceId();
  check("device id is stable across calls", firstId === device.getDeviceId());
  check("device is not recognised before registration", device.isRecognisedDevice() === false);

  const token = device.registerDevice();
  check("registration issues a valid token", device.isDeviceTokenValid(token));
  check("device is recognised after registration", device.isRecognisedDevice() === true);
  check("token is bound to this device", token.deviceId === firstId);

  const stored = device.getDeviceToken();
  check("token is persisted", stored !== null);
  check(
    "token from a different device id is rejected",
    device.isDeviceTokenValid({ ...token, deviceId: "00000000-0000-4000-8000-000000000000" }) === false
  );
  check(
    "expired token is rejected",
    device.isDeviceTokenValid({ ...token, expiresAt: Date.now() - 1000 }) === false
  );

  // ── Signed activation batch ───────────────────────────
  section("Signed activation batch");
  check("shipped batch verifies against its signature", await batch.verifyActivationBatch(batch.SHIPPED_BATCH));
  check("batch ships codes", batch.SHIPPED_BATCH.codes.length > 0);

  const forged = {
    ...batch.SHIPPED_BATCH,
    codes: [...batch.SHIPPED_BATCH.codes, { code: "TRB-FAKE-CODE", months: 120 }],
  };
  check("an added code invalidates the signature", (await batch.verifyActivationBatch(forged)) === false);

  const bumped = {
    ...batch.SHIPPED_BATCH,
    codes: batch.SHIPPED_BATCH.codes.map((c, i) => (i === 0 ? { ...c, months: 120 } : c)),
  };
  check("inflated months invalidate the signature", (await batch.verifyActivationBatch(bumped)) === false);

  // ── Redemption ────────────────────────────────────────
  section("Activation redemption");
  const validCode = batch.SHIPPED_BATCH.codes[0].code;
  const validMonths = batch.SHIPPED_BATCH.codes[0].months;

  check("malformed code is rejected", (await activation.redeemActivationCode("nope")).reason === "malformed");
  check(
    "well-formed but unlisted code is rejected",
    (await activation.redeemActivationCode("TRB-ZZZZ-ZZZZ")).reason === "unknown"
  );

  const redeemed = await activation.redeemActivationCode(validCode.toLowerCase());
  check("valid code redeems", redeemed.ok, JSON.stringify(redeemed));
  check("months come from the signed batch", redeemed.months === validMonths);
  check("code is bound to this device", device.isCodeBoundToThisDevice(validCode));

  const again = await activation.redeemActivationCode(validCode);
  check("re-redeeming on the same device is idempotent", again.ok === true);

  // Simulate a second install by swapping the device id while KEEPING the binding
  // map. That is exactly — and only — the case a local check can catch: a binding
  // it has seen, recorded against a different device id. A genuinely fresh install
  // has no record at all, which is why cross-device enforcement is the server's job
  // (see /api/subscriptions/sync) rather than something this layer pretends to do.
  const secondDeviceId = "11111111-1111-4111-8111-111111111111";
  crypto.writePlain(keys.STORAGE_KEYS.deviceId, secondDeviceId);
  check("second install has a different device id", device.getDeviceId() === secondDeviceId);
  check("the first device's token no longer validates", device.isRecognisedDevice() === false);

  const stolen = await activation.redeemActivationCode(validCode);
  check(
    "code bound to another device id is rejected",
    stolen.reason === "already-bound-elsewhere",
    JSON.stringify(stolen)
  );

  // The server-rejection path: once the sync route answers 409, the code must stay
  // refused offline as well, or the next reconnect would re-accept it.
  const serverBlockedCode = batch.SHIPPED_BATCH.codes[1].code;
  device.blockCodeLocally(serverBlockedCode);
  const blocked = await activation.redeemActivationCode(serverBlockedCode);
  check(
    "a server-blocked code is refused offline",
    blocked.reason === "already-bound-elsewhere",
    JSON.stringify(blocked)
  );

  // ── Term pass ─────────────────────────────────────────
  section("Term pass");
  store.clear();
  device.getDeviceId();
  check("no pass before activation", termPass.isTermPassActive() === false);

  const pass = termPass.grantTermPass(validCode, validMonths);
  check("pass is active after activation", termPass.isTermPassActive() === true);
  check("pass carries the code", pass.code === validCode);
  check("pass is bound to this device", pass.deviceId === device.getDeviceId());

  const monthsOut = (pass.expiresAt - pass.issuedAt) / (24 * 60 * 60 * 1000);
  check("pass runs for the granted months", Math.abs(monthsOut - validMonths * 30.4) < 4, `${monthsOut.toFixed(1)} days`);

  const extended = termPass.grantTermPass(validCode, validMonths);
  check("extending adds on top of the current expiry", extended.expiresAt > pass.expiresAt);
  check("extension keeps the original issue date", extended.issuedAt === pass.issuedAt);

  crypto.writeEncrypted(keys.STORAGE_KEYS.termPass, { ...extended, expiresAt: Date.now() - 1000 });
  check("an expired pass is inactive", termPass.isTermPassActive() === false);

  crypto.writeEncrypted(keys.STORAGE_KEYS.termPass, {
    ...extended,
    deviceId: "00000000-0000-4000-8000-000000000000",
  });
  check("a pass minted on another device is inactive", termPass.isTermPassActive() === false);

  // ── Revocation ────────────────────────────────────────
  // Two channels feed one store: the signed list in the bundle (verifiable here)
  // and the sync route (needs a server, so only the merge step is exercised).
  section("Revocation");
  check(
    "the shipped revocation list verifies",
    await revocations.verifyRevocationList(revocations.SHIPPED_REVOCATIONS)
  );

  const codes = batch.SHIPPED_BATCH.codes;
  const edited = {
    ...revocations.SHIPPED_REVOCATIONS,
    revokedCodes: [{ code: codes[0].code }],
  };
  check(
    "a code added to the shipped list breaks its signature",
    (await revocations.verifyRevocationList(edited)) === false
  );

  store.clear();
  check("a fresh install has nothing revoked", revocations.isCodeRevoked(codes[0].code) === false);
  check(
    "an unverified list records nothing",
    (await revocations.recordSignedRevocations(edited)) === 0
  );

  const learned = revocations.recordRevocations([{ code: codes[2].code, reason: "refunded" }], "server");
  check("a revoked code is recorded", learned === 1 && revocations.isCodeRevoked(codes[2].code));
  check("the reason is kept for the teacher", revocations.revocationFor(codes[2].code)?.reason === "refunded");
  check(
    "the revocation store is encrypted at rest",
    !(store.getItem(keys.STORAGE_KEYS.activationRevocations) ?? "").includes(codes[2].code)
  );

  check(
    "a revoked code cannot be redeemed",
    (await activation.redeemActivationCode(codes[2].code)).reason === "revoked"
  );

  revocations.recordRevocations([{ code: codes[2].code, reason: "second report" }], "server");
  check(
    "revocation is monotonic — the first reason stands",
    revocations.revocationFor(codes[2].code)?.reason === "refunded"
  );

  // A pass already granted for a revoked code has to be dropped, and the device
  // token with it: a "recognised" device walks straight past the splash.
  device.registerDevice(codes[2].code);
  termPass.grantTermPass(codes[2].code);
  check("the pass is live before reconciliation", termPass.isTermPassActive());

  const explain = revocations.reconcileTermPassWithRevocations();
  check("reconciliation drops the pass", termPass.isTermPassActive() === false);
  check("reconciliation drops device recognition", device.isRecognisedDevice() === false);
  check("the teacher is told why", typeof explain === "string" && explain.includes("refunded"));
  check(
    "the code stays blocked on this device",
    device.isCodeBoundToThisDevice(codes[2].code) === false
  );

  store.clear();
  termPass.grantTermPass(codes[0].code);
  check(
    "a pass for a healthy code is left alone",
    revocations.reconcileTermPassWithRevocations() === null && termPass.isTermPassActive()
  );

  // Signing needs the private key, which is gitignored — skipped on a machine that
  // has never minted a batch.
  const keyPath = resolve(process.cwd(), ".activation-keys", "private.pem");
  let signedDoc: typeof revocations.SHIPPED_REVOCATIONS | null = null;

  if (existsSync(keyPath)) {
    const signRevocations = await import("../src/lib/offline/sign-revocations");
    signedDoc = signRevocations.signRevocationDocumentWithKey(
      createPrivateKey(readFileSync(keyPath, "utf8")),
      [{ code: codes[4].code, reason: "chargeback" }]
    );

    check("a freshly signed list verifies in the app", await revocations.verifyRevocationList(signedDoc));
    check(
      "stripping a code out of a signed list fails",
      (await revocations.verifyRevocationList({ ...signedDoc, revokedCodes: [] })) === false
    );
    check(
      "adding a code to a signed list fails",
      (await revocations.verifyRevocationList({
        ...signedDoc,
        revokedCodes: [...signedDoc.revokedCodes, { code: "TRB-AAAA-AAAA" }],
      })) === false
    );
    check(
      "a verified signed list is recorded",
      (await revocations.recordSignedRevocations(signedDoc)) === 1 &&
        revocations.isCodeRevoked(codes[4].code)
    );
  } else {
    console.log("  skip signed-list round trip          — no .activation-keys/private.pem here");
  }

  // ── Revocation over the wire ──────────────────────────
  // The sync *route* needs a server (see verify:sync), but the client's side of
  // that contract does not: it is just fetch plus the store, so it is exercised
  // here against stubbed responses.
  section("Revocation over the wire");
  store.clear();
  device.getDeviceId();
  termPass.grantTermPass(codes[5].code);

  const realFetch = globalThis.fetch;
  const respond = (status: number, body: unknown) => {
    globalThis.fetch = async () => new Response(JSON.stringify(body), { status });
  };

  try {
    // A healthy sync still teaches the device about other codes' cancellations.
    respond(200, { ok: true, months: 3, revocations: [{ code: codes[1].code, reason: "chargeback" }] });
    check("a healthy sync succeeds", (await sync.syncTermPassWithServer()) === "synced");
    check("revocations in a 200 response are recorded", revocations.isCodeRevoked(codes[1].code));
    check("the healthy pass is marked synced", Boolean(termPass.getTermPass()?.syncedAt));

    // A forged signed document must be ignored, and must not fall back to the
    // unsigned list it arrived with either.
    if (signedDoc) {
      respond(200, {
        ok: true,
        months: 3,
        revocations: [{ code: codes[0].code, reason: "also forged" }],
        revocationsDocument: { ...signedDoc, revokedCodes: [{ code: codes[0].code, reason: "forged" }] },
      });
      await sync.syncTermPassWithServer();
      check("a forged revocation document is ignored", revocations.isCodeRevoked(codes[0].code) === false);

      respond(200, { ok: true, months: 3, revocations: [], revocationsDocument: signedDoc });
      await sync.syncTermPassWithServer();
      check("a verifiable revocation document is honoured", revocations.isCodeRevoked(codes[4].code));
    }

    // 410: the server has cancelled the code this pass was minted from.
    respond(410, { error: "This activation code has been revoked.", revocations: [] });
    check("a cancelled code reports 'revoked'", (await sync.syncTermPassWithServer()) === "revoked");
    check("the pass is dropped", termPass.getTermPass() === null);
    check("the device is no longer recognised", device.isRecognisedDevice() === false);
    check("the teacher is given a reason", (termPass.getTermPassRevocation()?.reason ?? "").length > 0);
    check("the code stays revoked on this device", revocations.isCodeRevoked(codes[5].code));
  } finally {
    globalThis.fetch = realFetch;
  }

  // ── Registration draft ────────────────────────────────
  section("Registration draft");
  store.clear();
  check("no draft on a fresh install", draft.loadDraft() === null);

  draft.saveDraft({ step: 3, name: "Ada", email: "ada@example.com", classLevels: ["JSS"], subjects: ["jss_maths"] });
  const loaded = draft.loadDraft();
  check("draft survives a reload", loaded?.step === 3 && loaded.name === "Ada");
  check("draft is encrypted at rest", !(store.getItem(keys.STORAGE_KEYS.registrationDraft) ?? "").includes("ada@example.com"));

  draft.saveDraft({ step: 4 });
  check("patching a draft keeps earlier fields", draft.loadDraft()?.name === "Ada" && draft.loadDraft()?.step === 4);

  check(
    "deselecting a level drops its subjects",
    JSON.stringify(draft.reconcileSubjects(["Primary"], ["jss_mathematics", "primary_mathematics"])) ===
      JSON.stringify(["primary_mathematics"])
  );
  check("no levels selected means no subjects survive", draft.reconcileSubjects([], ["jss_maths"]).length === 0);

  draft.clearDraft();
  check("clearing the draft removes it", draft.loadDraft() === null);

  // ── Curriculum level isolation ────────────────────────
  section("Curriculum level isolation");
  const jssSubjects = curriculum.getSubjectsForLevels(["JSS"]);
  check("JSS pool is non-empty", jssSubjects.length > 0);
  check("JSS pool contains only JSS ids", jssSubjects.every((s) => s.level === "JSS" && s.id.startsWith("jss_")));

  const mixed = curriculum.getSubjectsForLevels(["Primary", "SSS"]);
  check("multi-level selection returns only those levels", mixed.every((s) => s.level === "Primary" || s.level === "SSS"));
  check("multi-level selection excludes unselected levels", !mixed.some((s) => s.level === "JSS"));

  const ids = curriculum.ALL_SUBJECTS.map((s) => s.id);
  check("subject ids are unique across levels", new Set(ids).size === ids.length);
  check(
    "every id is level-prefixed",
    curriculum.ALL_SUBJECTS.every((s) => s.id.startsWith(`${s.level.toLowerCase()}_`))
  );

  // SSS requires 8–9 subjects: 5 compulsory (4 tagged Core + exactly one
  // mandatory practical trade) plus electives from the specialisation tracks.
  const sssCore = curriculum.SUBJECTS_BY_LEVEL.SSS.filter((s) => s.track === "Core");
  const sssTrades = curriculum.SUBJECTS_BY_LEVEL.SSS.filter(
    (s) => s.group === "Mandatory Practical Trade"
  );
  check("SSS lists the 4 core subjects", sssCore.length === 4, `found ${sssCore.length}`);
  check("SSS offers a mandatory practical trade", sssTrades.length > 0);
  const sssTracks = new Set(curriculum.SUBJECTS_BY_LEVEL.SSS.map((s) => s.track));
  check(
    "SSS exposes all three specialisation tracks",
    (["Sciences and Mathematics", "Humanities and Arts", "Business and Commercial"] as const).every((t) =>
      sssTracks.has(t)
    )
  );
  check("Physics is SSS-only", !curriculum.getSubjectsForLevels(["Primary", "JSS"]).some((s) => s.id === "sss_physics"));
  check(
    "every class resolves to a subject pool",
    curriculum.CLASSES.every((c) => curriculum.getSubjectsForClass(c.slug).length > 0)
  );

  // ── Model state ───────────────────────────────────────
  section("Model state");
  store.clear();
  check("model starts idle", localModel.getModelState().status === "idle");
  check("model is not ready initially", localModel.isModelReady() === false);
  check("byte formatting is readable", localModel.formatBytes(localModel.MODEL_SIZE_BYTES) === "491 MB");

  // ── Skipped ───────────────────────────────────────────
  section("Skipped (needs a running environment)");
  console.log("  skip POST /api/subscriptions/sync   — the route needs a session and a live database (see verify:sync)");
  console.log("  skip GET  /api/model/local          — requires Ollama to be running");
  console.log("  skip wizard + splash rendering      — requires a browser");

  // ── Result ────────────────────────────────────────────
  console.log(`\n${passed} checks passed, ${failures.length} failed.`);
  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  - ${f}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("\nVerification crashed:", error);
  process.exitCode = 1;
});
