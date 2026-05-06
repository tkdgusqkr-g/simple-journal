import type { MiddlewareHandler } from "hono";
import { UnauthorizedError } from "../../domain/errors.js";
import type { AppEnv } from "../context.js";

/**
 * Requires a valid Firebase ID token in Authorization: Bearer <token>.
 * Resolves to a SimpleJournal user and attaches it to ctx.var.user.
 */
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new UnauthorizedError("missing bearer token");
  }
  const token = header.slice("Bearer ".length).trim();
  if (!token) throw new UnauthorizedError("empty bearer token");

  // Auth verification + user upsert is performed via the UserService.
  // The auth route already handles that; here we re-verify and look up.
  const services = c.var.services;
  // Re-import auth provider lazily to keep middleware light.
  const { FirebaseAuthAdapter } = await import(
    "../../adapters/cloudflare/FirebaseAuth.js"
  );
  const provider = new FirebaseAuthAdapter(c.env.FIREBASE_PROJECT_ID);
  const identity = await provider.verifyIdToken(token);
  const user = await services.users.upsertFromIdentity(identity);
  c.set("user", user);
  await next();
};
