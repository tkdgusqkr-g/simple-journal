import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  D1DatabaseAdapter,
  DORealtimeAdapter,
  R2StorageAdapter,
} from "./adapters/cloudflare/index.js";
import {
  CollaborationService,
  DiaryService,
  EntryService,
  UnauthorizedError,
  UserService,
} from "./domain/index.js";
import { authRoutes } from "./api/routes/auth.js";
import { diaryRoutes } from "./api/routes/diaries.js";
import { diaryEntryRoutes, entryRoutes } from "./api/routes/entries.js";
import { memberRoutes } from "./api/routes/members.js";
import { pinRoutes } from "./api/routes/pins.js";
import { searchRoutes } from "./api/routes/search.js";
import { errorHandler } from "./api/middleware/error.js";
import { requireAuth } from "./api/middleware/auth.js";
import { requestLogger } from "./api/middleware/logging.js";
import { FirebaseAuthAdapter } from "./adapters/cloudflare/FirebaseAuth.js";
import type { AppEnv, Services } from "./api/context.js";
import type { Env } from "./env.js";

export { CrdtRoom } from "./api/websocket/crdt-room.js";

const app = new Hono<AppEnv>();

app.use("*", requestLogger);
app.onError(errorHandler);

// Build the services container per request — D1/R2/DO bindings come from env.
app.use("*", async (c, next) => {
  const db = new D1DatabaseAdapter(c.env.DB);
  const storage = new R2StorageAdapter(c.env.FILES);
  const realtime = new DORealtimeAdapter(c.env.CRDT_ROOM);
  const users = new UserService(db);
  const diaries = new DiaryService(db);
  const entries = new EntryService(db, diaries);
  const collab = new CollaborationService(db, diaries, realtime);
  const services: Services = { users, diaries, entries, collab, storage };
  c.set("services", services);
  await next();
});

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const allowed = new Set<string>([
        c.env.WEB_ORIGIN,
        "http://localhost:5173",
        "http://localhost:4173",
      ]);
      return allowed.has(origin) ? origin : null;
    },
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type"],
    credentials: true,
    maxAge: 86400,
  }),
);

// Public routes
app.get("/", (c) =>
  c.json({
    ok: true,
    data: { name: "simple-journal-api", env: c.env.ENVIRONMENT },
  }),
);
app.get("/health", (c) => c.json({ ok: true, data: { status: "ok" } }));

// /api/auth/* and /api/realtime/* manage their own auth.
// Everything else under /api requires a Bearer token.
app.route("/api/auth", authRoutes);

app.use("/api/*", async (c, next) => {
  const path = c.req.path;
  if (path.startsWith("/api/auth") || path.startsWith("/api/realtime")) {
    return next();
  }
  return requireAuth(c, next);
});

app.route("/api/diaries", diaryRoutes);
app.route("/api/diaries", diaryEntryRoutes);
app.route("/api/diaries", memberRoutes);
app.route("/api/entries", entryRoutes);
app.route("/api/entries", pinRoutes);
app.route("/api/search", searchRoutes);

// WebSocket upgrade for realtime collab.
// GET /api/realtime/:entryId  with Upgrade: websocket
// Auth via ?token=<idToken> query param (browsers can't set headers on WS).
app.get("/api/realtime/:entryId", async (c) => {
  const upgrade = c.req.header("Upgrade");
  if (upgrade !== "websocket") {
    throw new UnauthorizedError("expected websocket upgrade");
  }
  const token = c.req.query("token");
  if (!token) throw new UnauthorizedError("missing token query param");

  const provider = new FirebaseAuthAdapter(c.env.FIREBASE_PROJECT_ID);
  const identity = await provider.verifyIdToken(token);
  const user = await c.var.services.users.upsertFromIdentity(identity);

  return c.var.services.collab.joinEntry({
    entryId: c.req.param("entryId"),
    userId: user.id,
    request: c.req.raw,
  });
});

app.notFound((c) =>
  c.json(
    { ok: false, error: { code: "not_found", message: "route not found" } },
    404,
  ),
);

export default {
  fetch: app.fetch,
} satisfies ExportedHandler<Env>;
