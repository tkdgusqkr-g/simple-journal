/**
 * Worker bindings (D1, R2, Durable Objects, env vars / secrets).
 * Mirrored from wrangler.toml. Loaded as `c.env` in Hono handlers.
 */

import type { CrdtRoom } from "./api/websocket/crdt-room.js";

export interface Env {
  // D1 binding
  DB: D1Database;
  // R2 binding
  FILES: R2Bucket;
  // Durable Object binding for CRDT rooms
  CRDT_ROOM: DurableObjectNamespace<CrdtRoom>;

  // Vars
  ENVIRONMENT: "local" | "dev" | "prod";
  WEB_ORIGIN: string;

  // Secrets (set via `wrangler secret put` or GitHub Actions)
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
}
