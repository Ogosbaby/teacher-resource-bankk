import fs from "fs/promises";
import path from "path";
import { ObjectNotFoundError, assertSafeKey, type StorageProvider, type StoredObject } from "./types";

/**
 * Filesystem-backed storage for local development.
 *
 * Used automatically when R2 isn't configured, so certificate generation and
 * resource files are testable without cloud credentials. Not for production —
 * it writes under the project directory and doesn't survive a deploy.
 */
export class LocalStorageProvider implements StorageProvider {
  readonly name = "local";
  readonly isRemote = false;

  private root: string;

  constructor(root?: string) {
    this.root = path.resolve(root ?? process.env.STORAGE_LOCAL_DIR ?? ".storage");
  }

  private resolve(key: string): string {
    assertSafeKey(key);
    const full = path.resolve(this.root, key);
    // Belt-and-braces after resolution: the resolved path must stay inside root.
    if (full !== this.root && !full.startsWith(this.root + path.sep)) {
      throw new Error(`Storage key escapes the storage root: ${JSON.stringify(key)}`);
    }
    return full;
  }

  async put(key: string, body: Uint8Array, contentType: string): Promise<void> {
    const file = this.resolve(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body);
    // Sidecar so get() can report the content type, which the filesystem loses.
    await fs.writeFile(`${file}.contenttype`, contentType, "utf8");
  }

  async get(key: string): Promise<StoredObject> {
    const file = this.resolve(key);
    let body: Buffer;
    try {
      body = await fs.readFile(file);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") throw new ObjectNotFoundError(key);
      throw err;
    }

    let contentType = "application/octet-stream";
    try {
      contentType = (await fs.readFile(`${file}.contenttype`, "utf8")).trim() || contentType;
    } catch {
      // Missing sidecar is fine — fall back to the generic type.
    }

    return { body: new Uint8Array(body), contentType };
  }

  async delete(key: string): Promise<void> {
    const file = this.resolve(key);
    await fs.rm(file, { force: true });
    await fs.rm(`${file}.contenttype`, { force: true });
  }
}
