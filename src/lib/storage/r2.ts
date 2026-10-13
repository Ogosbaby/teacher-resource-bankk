import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { ObjectNotFoundError, assertSafeKey, type StorageProvider, type StoredObject } from "./types";

/**
 * S3-compatible storage (Cloudflare R2 in practice, but anything speaking the S3
 * API works — only the endpoint changes).
 *
 * Configured from the environment; see .env.example. `forcePathStyle` is off
 * because R2 uses virtual-hosted-style addressing.
 */
export class R2StorageProvider implements StorageProvider {
  readonly name = "r2";
  readonly isRemote = true;

  private client: S3Client;
  private bucket: string;

  constructor(config: {
    endpoint: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    region?: string;
  }) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region ?? "auto",
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async put(key: string, body: Uint8Array, contentType: string): Promise<void> {
    assertSafeKey(key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
  }

  async get(key: string): Promise<StoredObject> {
    assertSafeKey(key);
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key })
      );
      if (!res.Body) throw new ObjectNotFoundError(key);

      const bytes = await res.Body.transformToByteArray();
      return { body: bytes, contentType: res.ContentType ?? "application/octet-stream" };
    } catch (err) {
      if ((err as { name?: string }).name === "NoSuchKey") throw new ObjectNotFoundError(key);
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    assertSafeKey(key);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
