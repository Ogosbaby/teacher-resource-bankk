/**
 * Where the transferred model bytes actually go.
 *
 * The transfer is 491 MB, so nothing here may hold the whole file in memory, and
 * nothing may assume the download finishes in one go — a phone that drops
 * connectivity halfway must be able to continue rather than restart, and a
 * restart costs the teacher mobile data they have already paid for.
 *
 * Two sinks, because the two platforms have genuinely different storage:
 *
 *   - **Native** (the Capacitor app): appended to the app's private files
 *     directory with `@capacitor/filesystem`. `Directory.Data` is chosen over
 *     `Documents` deliberately — it needs no runtime permission prompt, and the
 *     model is app data, not a file the teacher browses to.
 *   - **Web**: chunk rows in IndexedDB. A browser has no filesystem, and
 *     IndexedDB is the one store that persists half a gigabyte without a prompt.
 *
 * Both answer the three questions the transfer asks: how many bytes are already
 * stored, how to append one more chunk, and how to wipe a partial that failed
 * verification. "Already stored" is read back from the sink itself rather than
 * from a counter kept elsewhere, so a cleared cache or a wiped app directory
 * cannot leave the client resuming at an offset whose bytes do not exist.
 */
/** Chunk size for the web sink. Large enough to keep row counts sane, small
 * enough that one transaction is never a memory spike. */
export const CHUNK_BYTES = 4 * 1024 * 1024;

const MODEL_DIR = "models";
const MODEL_FILE = "model.gguf";
const NATIVE_PATH = `${MODEL_DIR}/${MODEL_FILE}`;

const IDB_NAME = "trb-offline-model";
const IDB_VERSION = 1;
const IDB_CHUNKS = "chunks";

export type ModelSinkKind = "native" | "web";

export interface ModelSink {
  readonly kind: ModelSinkKind;
  /** Bytes already stored, contiguous from offset 0. */
  bytesReceived(): Promise<number>;
  append(chunk: Uint8Array): Promise<void>;
  /** Hand every stored byte back, in order, without loading the file at once. */
  readAll(onChunk: (chunk: Uint8Array) => void): Promise<void>;
  clear(): Promise<void>;
}

function isNative(): boolean {
  const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  // Chunked because `String.fromCharCode(...bytes)` blows the argument limit
  // somewhere around 100k elements, and a 4 MB chunk has millions.
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ─── Native: Capacitor Filesystem ─────────────────────────

async function nativeSink(): Promise<ModelSink> {
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const options = { path: NATIVE_PATH, directory: Directory.Data };

  return {
    kind: "native",

    async bytesReceived() {
      try {
        const info = await Filesystem.stat(options);
        return typeof info.size === "number" ? info.size : 0;
      } catch {
        // No file yet: a fresh install, or the app's data directory was cleared.
        return 0;
      }
    },

    async append(chunk) {
      // Ensure the parent directory exists on native filesystem (Android throws "Parent folder doesn't exist" if omitted)
      try {
        await Filesystem.mkdir({
          path: MODEL_DIR,
          directory: Directory.Data,
          recursive: true,
        });
      } catch {
        // Directory may already exist
      }

      // base64 rather than the `Encoding.UTF8` text path: this is binary, and a
      // UTF-8 round trip would corrupt every byte that is not valid UTF-8.
      await Filesystem.appendFile({ ...options, data: bytesToBase64(chunk) });
    },

    async readAll(onChunk) {
      const { data } = await Filesystem.readFile(options);
      if (typeof data !== "string") return;

      // Decoded in slices so a 491 MB base64 string never becomes a second
      // 491 MB buffer in one allocation. The slice is a multiple of 4, so every
      // slice is whole base64 and no group of four characters is split.
      const slice = 1_500_000;
      for (let offset = 0; offset < data.length; offset += slice) {
        onChunk(base64ToBytes(data.slice(offset, offset + slice)));
      }
    },

    async clear() {
      await Filesystem.deleteFile(options).catch(() => {});
    },
  };
}

// ─── Web: IndexedDB ───────────────────────────────────────

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(IDB_CHUNKS)) {
        request.result.createObjectStore(IDB_CHUNKS);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function run<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IDB_CHUNKS, mode);
    const request = work(transaction.objectStore(IDB_CHUNKS));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function webSink(): Promise<ModelSink> {
  const db = await openDb();
  const count = () => run(db, "readonly", (s) => s.count());

  return {
    kind: "web",

    async bytesReceived() {
      const stored = await count();
      if (stored === 0) return 0;

      // The last chunk is only as long as it is; every earlier one is full. The
      // chunk row count is the authority rather than a byte counter, because a
      // crash between writing a chunk and incrementing a counter would otherwise
      // resume past bytes that were never stored, leaving a hole in the middle.
      const last = (await run(db, "readonly", (s) => s.get(stored - 1))) as
        | Uint8Array
        | undefined;
      return (stored - 1) * CHUNK_BYTES + (last ? last.byteLength : 0);
    },

    async append(chunk) {
      // Appended at the current count, so the keys are contiguous by construction
      // and `readAll` can walk them without a gaps check.
      const index = await count();
      await run(db, "readwrite", (s) => s.put(chunk, index));
    },

    async readAll(onChunk) {
      const stored = await count();
      for (let i = 0; i < stored; i++) {
        const chunk = (await run(db, "readonly", (s) => s.get(i))) as
          | Uint8Array
          | undefined;
        if (chunk) onChunk(new Uint8Array(chunk));
      }
    },

    async clear() {
      await run(db, "readwrite", (s) => s.clear());
    },
  };
}

/**
 * The sink for this platform.
 *
 * Memoised, because resolving the native plugin or opening the IndexedDB
 * connection per chunk would cost more than the appends themselves.
 */
let sinkPromise: Promise<ModelSink> | null = null;

export function getModelSink(): Promise<ModelSink> {
  if (!sinkPromise) {
    sinkPromise = (isNative() ? nativeSink() : webSink()).catch((err) => {
      // Let a later call retry instead of caching a rejection.
      sinkPromise = null;
      throw err;
    });
  }
  return sinkPromise;
}

/** Forget the memoised sink, so the next call reopens against a wiped store. */
export function resetModelSink(): void {
  sinkPromise = null;
}
