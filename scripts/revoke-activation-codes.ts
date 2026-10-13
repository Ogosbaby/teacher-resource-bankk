/**
 * Revoke (or un-revoke) a single activation code.
 *
 *   npm run codes:revoke -- --code=TRB-XXXX-XXXX --reason="refunded"
 *   npm run codes:revoke -- --code=TRB-XXXX-XXXX --reason="refunded" --no-db
 *   npm run codes:revoke -- --code=TRB-XXXX-XXXX --undo
 *   npm run codes:revoke -- --list
 *
 * A code grants entitlement offline, so removing one has to happen in two places,
 * and this script is the only thing that writes both:
 *
 *   1. `src/lib/offline/activation-revocations.json` — the signed list that ships
 *      in the bundle. This is what reaches a device with no connection, and it is
 *      why the file is committed and why the signature has to be produced here,
 *      with the private key that stays on this machine.
 *   2. The `activation_revocations` table — what the sync route reports to devices
 *      that check in, so a phone picks up a cancellation without waiting for an
 *      app update. Skipped with `--no-db`, which is also how the empty shipped list
 *      was bootstrapped.
 *
 * The file is written **before** the database on purpose: revoking is the
 * conservative direction, so an interrupted run should leave a code cancelled
 * offline rather than live everywhere. If the database write then fails, the
 * script says so and exits non-zero — the two are out of step and re-running it
 * fixes that, because both writes are idempotent.
 *
 * The database half goes through `activation-revocations.service.ts`, so the row
 * this writes and the row the sync route reads cannot drift apart, and so the
 * subscription that the code was redeemed into is marked refunded — cancelling a
 * code the server would still honour is only half a revocation.
 */
import "dotenv/config";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createPrivateKey, createPublicKey, verify, type KeyObject } from "node:crypto";
import { resolve } from "node:path";
import { SHIPPED_BATCH, isValidCodeFormat } from "../src/lib/offline/activation-batch";
import { signRevocationDocumentWithKey } from "../src/lib/offline/sign-revocations";
import {
  canonicalRevocationPayload,
  type RevocationEntry,
  type SignedRevocationList,
} from "../src/lib/offline/revocation-document";

const KEY_PATH = resolve(process.cwd(), ".activation-keys/private.pem");
const OUT_PATH = resolve(process.cwd(), "src/lib/offline/activation-revocations.json");

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
}

function has(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function fromBase64Url(value: string): Buffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

function readExisting(): RevocationEntry[] {
  if (!existsSync(OUT_PATH)) return [];
  const current = JSON.parse(readFileSync(OUT_PATH, "utf8")) as SignedRevocationList;
  return current.revokedCodes ?? [];
}

/**
 * The signing key, which must already exist and must match the key the shipped
 * batch was signed with. Both checks are refusals rather than repairs: generating
 * a fresh key here would produce a list the app silently ignores (the signature
 * would not verify against the batch's public key), and that failure mode —
 * a revocation that looks applied but is not — is the one worth being loud about.
 */
function loadSigningKey(): KeyObject {
  if (!existsSync(KEY_PATH)) {
    console.error(
      `No signing key at ${KEY_PATH}.\n` +
        "Revocations are signed with the same key as the code batch, so this file has to exist.\n" +
        "Mint a batch first (npm run codes:generate), or restore the key from your backup."
    );
    process.exit(1);
  }

  const key = createPrivateKey(readFileSync(KEY_PATH, "utf8"));
  const { x, y } = createPublicKey(key).export({ format: "jwk" }) as JsonWebKey;

  if (x !== SHIPPED_BATCH.publicKey.x || y !== SHIPPED_BATCH.publicKey.y) {
    console.error(
      "This key does not match the public key in the shipped batch.\n" +
        "Anything signed with it will be rejected by the app, so the revocation would have no effect.\n" +
        "Re-generate the batch with this key (npm run codes:generate) before revoking."
    );
    process.exit(1);
  }

  return key;
}

function writeList(key: KeyObject, entries: RevocationEntry[]): SignedRevocationList {
  const list = signRevocationDocumentWithKey(key, entries);

  // Self-check, the same way codes:generate does it: a signature that does not
  // verify against the batch's public key is worse than no file at all.
  const payload = Buffer.from(canonicalRevocationPayload(list), "utf8");
  const signature = fromBase64Url(list.signature);
  const publicKey = createPublicKey(key);
  const ok = verify("sha256", payload, { key: publicKey, dsaEncoding: "ieee-p1363" }, signature);

  if (!ok) {
    console.error("Self-check failed: the generated signature does not verify. Nothing was written.");
    process.exit(1);
  }

  writeFileSync(OUT_PATH, `${JSON.stringify(list, null, 2)}\n`, "utf8");
  return list;
}

/** The database half, through the service the sync route reads from. */
async function writeDatabase(code: string, reason: string, undo: boolean): Promise<string> {
  const service = await import("../src/lib/services/activation-revocations.service");

  if (undo) {
    const { removed, subscriptionRestored } = await service.unrevokeActivationCode(code);
    return [removed ? "row removed" : "no row was present", subscriptionRestored ? "subscription restored" : null]
      .filter(Boolean)
      .join(", ");
  }

  const { subscriptionRevoked } = await service.revokeActivationCode({ code, reason });
  return subscriptionRevoked
    ? "row written, subscription for this code marked refunded"
    : "row written (no subscription had been synced for this code)";
}

function printList(): void {
  const entries = readExisting();
  if (entries.length === 0) {
    console.log("No codes are revoked in the shipped list.");
    return;
  }
  console.log(`${entries.length} revoked code(s) in src/lib/offline/activation-revocations.json:\n`);
  for (const entry of entries) {
    console.log(`  ${entry.code}  ${entry.revokedAt ?? ""}  ${entry.reason ?? ""}`);
  }
}

async function main() {
  if (has("list")) {
    printList();
    return;
  }

  const rawCode = arg("code");
  const noDb = has("no-db");
  const undo = has("undo");
  const reason = arg("reason");

  // No --code means "re-sign whatever is already there". That is how the empty
  // shipped list was created, and how the file is regenerated after a key change.
  if (!rawCode) {
    const key = loadSigningKey();
    const list = writeList(key, readExisting());
    console.log(
      `Re-signed ${list.revokedCodes.length} revoked code(s) into src/lib/offline/activation-revocations.json`
    );
    console.log("Self-check passed: signature verifies against the shipped batch's public key.");
    return;
  }

  const code = rawCode.trim().toUpperCase();
  if (!isValidCodeFormat(code)) {
    console.error(`"${rawCode}" is not a well-formed code. Codes look like TRB-XXXX-XXXX.`);
    process.exit(1);
  }

  if (!undo && !reason?.trim()) {
    console.error(
      "A revocation needs a --reason: it is what the teacher is shown when their pass is removed,\n" +
        'and it is the only record of why. Example: --reason="refunded, duplicate purchase"'
    );
    process.exit(1);
  }

  // A typo here cancels the wrong teacher's code, and the shipped list cannot tell
  // us about codes added by a newer batch. Warn rather than refuse: revoking a code
  // that has already been rotated out of the batch is legitimate.
  if (!SHIPPED_BATCH.codes.some((entry) => entry.code === code)) {
    console.warn(
      `Note: ${code} is not in this build's signed batch. Continuing, because a code rotated out\n` +
        "of the batch may still be redeemed on an older install."
    );
  }

  const key = loadSigningKey();
  const existing = readExisting();
  const without = existing.filter((entry) => entry.code.trim().toUpperCase() !== code);
  const alreadyRevoked = without.length !== existing.length;

  const next = undo
    ? without
    : [...without, { code, reason: reason!.trim(), revokedAt: new Date().toISOString() }];

  if (!undo && alreadyRevoked) {
    console.warn(`Note: ${code} was already revoked in the shipped list; its recorded reason stands.`);
  }

  const list = writeList(key, next);
  console.log(`${undo ? "Un-revoked" : "Revoked"} ${code}.`);
  console.log(`  shipped list: ${list.revokedCodes.length} revoked code(s) — signature self-check passed`);

  if (noDb) {
    console.log("  database:     skipped (--no-db)");
    return;
  }

  try {
    console.log(`  database:     ${await writeDatabase(code, reason?.trim() ?? "", undo)}`);
  } catch (error) {
    console.error(`  database:     FAILED — ${error instanceof Error ? error.message : String(error)}`);
    console.error(
      "\nThe shipped list was written, so devices that install this build will refuse the code.\n" +
        "The database was not updated, so devices that check in will not learn about it.\n" +
        "Set DATABASE_URL and re-run this command (both writes are idempotent)."
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    "\nDevices learn about this from the sync route immediately; the shipped list only takes effect\n" +
      "once this build ships. Commit the regenerated JSON file."
  );
}

main()
  .then(() => {
    console.log("");
    // Explicit exit: the database half opens a pg pool, and an idle pool keeps
    // the event loop alive. Same reason `seed.ts` exits rather than waiting.
    process.exit(process.exitCode ?? 0);
  })
  .catch((error) => {
    console.error("\nRevocation failed:", error);
    process.exit(1);
  });
