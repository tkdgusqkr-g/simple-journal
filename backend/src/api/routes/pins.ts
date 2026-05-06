import { Hono } from "hono";
import { z } from "zod";
import { ValidationError } from "../../domain/errors.js";
import type { AppEnv } from "../context.js";

const body = z.object({ pinned: z.boolean() });

export const pinRoutes = new Hono<AppEnv>();

/** POST /api/entries/:id/pin */
pinRoutes.post("/:id/pin", async (c) => {
  const parsed = body.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new ValidationError("invalid body");
  const entry = await c.var.services.entries.setPin(
    c.req.param("id"),
    c.var.user.id,
    parsed.data.pinned,
  );
  return c.json({ ok: true, data: { entry } });
});
