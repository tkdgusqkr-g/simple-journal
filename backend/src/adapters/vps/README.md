# vps adapters (placeholder)

Future home for non-Cloudflare implementations of the ports defined in
`src/ports/`. Activate when migrating off Cloudflare to a self-hosted VPS:

- `PostgresDatabase.ts` (Drizzle on `node-postgres`)
- `S3Storage.ts` (or `LocalDiskStorage.ts`)
- `SocketIORealtime.ts` (or `WsRealtime.ts`)
- `FirebaseAuth.ts` reused, since verification only needs the public JWKS

The `domain/` and `api/` layers are infra-agnostic and require no changes.
