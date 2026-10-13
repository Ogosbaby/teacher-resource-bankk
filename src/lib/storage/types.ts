/**
 * Storage abstraction, mirroring the AIProvider pattern: an interface, one or
 * more concrete providers, and a singleton getter. Nothing outside this folder
 * should know which backend is in use.
 */

export interface StoredObject {
  body: Uint8Array;
  contentType: string;
}

export interface StorageProvider {
  /** Identifies the backend, for logs and diagnostics. */
  readonly name: string;
  /** True when this backend is durable/remote rather than dev-local. */
  readonly isRemote: boolean;
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject>;
  delete(key: string): Promise<void>;
}

export class ObjectNotFoundError extends Error {
  constructor(key: string) {
    super(`No stored object at "${key}".`);
    this.name = "ObjectNotFoundError";
  }
}

/**
 * Reject keys that could escape the storage root or point at an absolute path.
 * Keys are always app-generated, but this is the one place a traversal bug would
 * become a filesystem read, so it is checked rather than assumed.
 */
export function assertSafeKey(key: string): void {
  if (!key || key.startsWith("/") || key.startsWith("\\") || key.includes("\0")) {
    throw new Error(`Unsafe storage key: ${JSON.stringify(key)}`);
  }
  if (key.split(/[/\\]/).some((part) => part === "..")) {
    throw new Error(`Unsafe storage key (path traversal): ${JSON.stringify(key)}`);
  }
}
