import type { PutOptions, Storage } from "../../ports/Storage.js";

export class R2StorageAdapter implements Storage {
  constructor(private readonly bucket: R2Bucket) {}

  async put(
    key: string,
    value: ArrayBuffer | ReadableStream,
    options?: PutOptions,
  ): Promise<void> {
    await this.bucket.put(key, value, {
      httpMetadata: {
        contentType: options?.contentType,
        cacheControl: options?.cacheControl,
      },
    });
  }

  async get(key: string): Promise<ReadableStream | null> {
    const obj = await this.bucket.get(key);
    return obj?.body ?? null;
  }

  async delete(key: string): Promise<void> {
    await this.bucket.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const head = await this.bucket.head(key);
    return head !== null;
  }
}
