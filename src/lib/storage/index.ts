import { LocalStorageProvider } from "./local";
import { R2StorageProvider } from "./r2";
import type { StorageProvider } from "./types";

/**
 * Storage singleton. R2 when fully configured, otherwise local filesystem so
 * development works without cloud credentials.
 *
 * Unlike the AI provider this does not hard-fail when unconfigured: falling back
 * keeps certificate generation usable locally, and the chosen backend is exposed
 * via `name`/`isRemote` so the UI can be honest about where files went.
 */
let provider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (provider) return provider;

  // R2 is configured by account id + bucket name, which is what .env.example and
  // the README document; the legacy R2_ENDPOINT/R2_BUCKET pair still wins when
  // set, because an explicit endpoint is how anything other than Cloudflare (or a
  // custom domain) gets addressed.
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const endpoint =
    process.env.R2_ENDPOINT?.trim() ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);
  const bucket = process.env.R2_BUCKET?.trim() || process.env.R2_BUCKET_NAME?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();

  if (endpoint && bucket && accessKeyId && secretAccessKey) {
    provider = new R2StorageProvider({
      endpoint,
      bucket,
      accessKeyId,
      secretAccessKey,
      region: process.env.R2_REGION?.trim() || "auto",
    });
  } else {
    provider = new LocalStorageProvider();
  }

  return provider;
}

/** Whether the remote backend is in use — surfaced in the admin UI. */
export function isRemoteStorageConfigured(): boolean {
  return getStorageProvider().isRemote;
}

/**
 * Object key for a certificate PDF.
 *
 * Keyed on the *target* (course or learning path id) rather than the certificate
 * row id, so re-running the issuing job overwrites the same object instead of
 * orphaning a file — the job is retryable by design.
 */
export function certificateKey(userId: string, targetId: string): string {
  return `certificates/${userId}/${targetId}.pdf`;
}

/**
 * Object key for a resource's uploaded file.
 *
 * Keyed on the resource **id**, not its slug: the slug is derived from the title
 * and changes when a resource is renamed, which would strand the file under the
 * old key with no record of where it went. The filename is part of the key so a
 * download that ignores `Content-Disposition` still lands as something
 * recognisable — and re-uploading the same name overwrites the same
 * object, which is what keeps an interrupted upload from leaving two files behind.
 */
export function resourceFileKey(resourceId: string, fileName: string): string {
  return `resources/${resourceId}/${fileName}`;
}

export type { StorageProvider, StoredObject } from "./types";
export { ObjectNotFoundError } from "./types";
