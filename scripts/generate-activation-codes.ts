/**
 * Mint a signed activation-code batch.
 *
 *   npx tsx scripts/generate-activation-codes.ts --count=12 --months=3
 *
 * Writes `src/lib/offline/activation-batch.json` (committed — it holds only the
 * *public* key and the codes themselves) and keeps the signing key in
 * `.activation-keys/private.pem` (gitignored). Re-running with the same key
 * produces codes the shipped app will trust, so keep that file safe: lose it and
 * you must ship a new batch to rotate the key.
 *
 * Existing codes are preserved by default — pass --fresh to start a new batch.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
  verify,
  type KeyObject,
} from "node:crypto";
import { dirname, resolve } from "node:path";
import {
  canonicalBatchPayload,
  bytesToBase64Url,
  type ActivationCodeEntry,
  type SignedActivationBatch,
} from "../src/lib/offline/activation-batch";

const KEY_DIR = resolve(process.cwd(), ".activation-keys");
const PRIVATE_KEY_PATH = resolve(KEY_DIR, "private.pem");
const OUT_PATH = resolve(process.cwd(), "src/lib/offline/activation-batch.json");

/** No 0/O/1/I/L — these codes get read aloud and typed on phones. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const GROUP_LENGTH = 4;
const GROUPS = 2;

function arg(name: string, fallback: number): number {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const parsed = Number(hit.split("=")[1]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function randomChars(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

function mintCode(): string {
  const groups = Array.from({ length: GROUPS }, () => randomChars(GROUP_LENGTH));
  return `TRB-${groups.join("-")}`;
}

function loadOrCreatePrivateKey(): KeyObject {
  if (existsSync(PRIVATE_KEY_PATH)) {
    return createPrivateKey(readFileSync(PRIVATE_KEY_PATH, "utf8"));
  }
  console.log("No signing key found — generating a new P-256 keypair.");
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  mkdirSync(dirname(PRIVATE_KEY_PATH), { recursive: true });
  writeFileSync(
    PRIVATE_KEY_PATH,
    privateKey.export({ type: "pkcs8", format: "pem" }) as string,
    { mode: 0o600 }
  );
  return privateKey;
}

function main() {
  const count = arg("count", 12);
  const months = arg("months", 3);
  const fresh = process.argv.includes("--fresh");
  const note = process.argv.find((a) => a.startsWith("--note="))?.split("=")[1];

  const privateKey = loadOrCreatePrivateKey();

  // Reuse the existing codes unless we're deliberately starting a new batch —
  // every teacher already holding a code must keep it working.
  const existing: ActivationCodeEntry[] =
    !fresh && existsSync(OUT_PATH)
      ? (JSON.parse(readFileSync(OUT_PATH, "utf8")) as SignedActivationBatch).codes
      : [];

  const seen = new Set(existing.map((c) => c.code));
  const codes = [...existing];
  while (codes.length < count) {
    const code = mintCode();
    if (seen.has(code)) continue;
    seen.add(code);
    codes.push({ code, months, ...(note ? { note } : {}) });
  }

  const issuedAt = new Date().toISOString();
  const unsigned = { version: 1, issuedAt, codes };
  const payload = Buffer.from(canonicalBatchPayload(unsigned), "utf8");
  const signature = sign("sha256", payload, {
    key: privateKey,
    // ieee-p1363 gives raw r‖s, which is exactly what WebCrypto's ECDSA verify
    // expects. Node's default DER encoding would fail verification in the app.
    dsaEncoding: "ieee-p1363",
  });

  // Export the PUBLIC key only. Exporting the private key would emit a JWK with
  // a `d` component, which WebCrypto then imports as a private key — and a
  // private EC key cannot carry the `verify` usage, so every signature check in
  // the app would throw and fail closed. (It did, once. Hence the self-check.)
  const publicKeyObject = createPublicKey(privateKey);
  const publicKey = publicKeyObject.export({ format: "jwk" }) as unknown as JsonWebKey;

  if (!verify("sha256", payload, { key: publicKeyObject, dsaEncoding: "ieee-p1363" }, signature)) {
    throw new Error("Self-check failed: the generated signature does not verify against the public key.");
  }

  const batch: SignedActivationBatch = {
    ...unsigned,
    publicKey,
    signature: bytesToBase64Url(new Uint8Array(signature)),
  };

  writeFileSync(OUT_PATH, `${JSON.stringify(batch, null, 2)}\n`, "utf8");

  console.log(`\nWrote ${codes.length} signed codes to src/lib/offline/activation-batch.json`);
  console.log("Self-check passed: signature verifies against the shipped public key.");
  console.log(`Each grants ${months} month(s).\n`);
  for (const entry of codes) console.log(`  ${entry.code}`);
  console.log("");
}

main();
