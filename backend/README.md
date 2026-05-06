# backend

Cloudflare Workers API (Hono + Drizzle + D1 + R2 + Durable Objects).

Activated in Phase 2.

## Layout

- `src/domain/` — Business logic (portable, no infra deps)
- `src/ports/` — Interface definitions (Database, Storage, Realtime, AuthProvider)
- `src/adapters/cloudflare/` — Cloudflare-specific implementations (D1, R2, Durable Objects, Firebase Auth verification)
- `src/adapters/vps/` — Future VPS implementations (placeholder)
- `src/api/` — Hono router (routes, middleware, websocket)
- `src/db/` — Drizzle schema + migrations
- `src/index.ts` — Worker entry point
