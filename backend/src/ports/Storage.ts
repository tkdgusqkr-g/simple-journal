/**
 * Object storage port. Backed by Cloudflare R2 in production, but the
 * surface is intentionally small so it can be implemented over S3 or local
 * disk later.
 */
export interface Storage {
  put(key: string, value: ArrayBuffer | ReadableStream, options?: PutOptions): Promise<void>;
  get(key: string): Promise<ReadableStream | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  signedUrl?(key: string, expiresInSeconds: number): Promise<string>;
}

export interface PutOptions {
  contentType?: string;
  cacheControl?: string;
}
