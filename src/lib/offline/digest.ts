/**
 * Incremental SHA-256 over bytes, for verifying a transfer that is far too big to
 * buffer.
 *
 * Why not `crypto.subtle.digest`: it takes the whole message at once, and the
 * message here is 491 MB. On a phone that is not a slow call, it is an
 * out-of-memory crash. Nothing in the WebCrypto surface hashes a stream, so the
 * only options are an incremental pure-JS hash or no verification at all — and no
 * verification means a truncated download yields a model file that loads and then
 * misbehaves, which is worse than a download that fails loudly.
 *
 * crypto-js is already a dependency (it backs the localStorage encryption), so
 * this adds no new one. The one subtlety is the conversion below.
 */
import CryptoJS from "crypto-js";

export interface ByteHasher {
  update(bytes: Uint8Array): void;
  /** Lowercase hex digest. Calling it finalises the hasher. */
  hex(): string;
}

/**
 * Pack bytes into the 32-bit words crypto-js hashes over.
 *
 * `CryptoJS.lib.WordArray.create` treats whatever it is handed as an array of
 * *words*, not bytes — handing it a `Uint8Array` would re-group every four bytes
 * into one and hash the wrong message. So the grouping is done explicitly here,
 * big-endian, with the final partial word zero-padded and `sigBytes` telling
 * crypto-js how many of those bytes are real.
 */
function toWordArray(bytes: Uint8Array): CryptoJS.lib.WordArray {
  const words: number[] = [];
  let i = 0;

  for (; i + 3 < bytes.length; i += 4) {
    words.push(
      (((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0)
    );
  }

  const remainder = bytes.length - i;
  if (remainder > 0) {
    let last = 0;
    for (let j = 0; j < remainder; j++) last |= bytes[i + j] << (24 - j * 8);
    words.push(last >>> 0);
  }

  return CryptoJS.lib.WordArray.create(words, bytes.length);
}

export function createByteHasher(): ByteHasher {
  const hasher = CryptoJS.algo.SHA256.create();

  return {
    update(bytes) {
      if (bytes.length > 0) hasher.update(toWordArray(bytes));
    },
    hex() {
      return hasher.finalize().toString(CryptoJS.enc.Hex);
    },
  };
}
