import { Hono } from "hono";
import { z } from "zod";
import { FirebaseAuthAdapter } from "../../adapters/cloudflare/FirebaseAuth.js";
import { UnauthorizedError } from "../../domain/errors.js";
import type { AppEnv } from "../context.js";

const verifyBody = z.object({ idToken: z.string().min(1) });

export const authRoutes = new Hono<AppEnv>();

/**
 * POST /api/auth/verify
 * Body: { idToken: string }
 * Verifies the Firebase ID token, upserts the user, returns the canonical user.
 */
authRoutes.post("/verify", async (c) => {
  const parsed = verifyBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    throw new UnauthorizedError("invalid body");
  }
  const provider = new FirebaseAuthAdapter(c.env.FIREBASE_PROJECT_ID);
  const identity = await provider.verifyIdToken(parsed.data.idToken);
  const user = await c.var.services.users.upsertFromIdentity(identity);
  return c.json({ ok: true, data: { user } });
});
