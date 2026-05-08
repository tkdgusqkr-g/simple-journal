import { Hono } from "hono";
import { z } from "zod";
import { ValidationError } from "../../domain/errors.js";
import type { AppEnv } from "../context.js";

const createBody = z.object({
  role: z.enum(["editor", "viewer"]),
  expiresInDays: z.number().int().min(1).max(90).optional(),
});

export const inviteRoutes = new Hono<AppEnv>();

/** POST /api/diaries/:diaryId/invite-links */
inviteRoutes.post("/:diaryId/invite-links", async (c) => {
  const parsed = createBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new ValidationError("invalid body");
  const link = await c.var.services.diaries.createInviteLink({
    diaryId: c.req.param("diaryId"),
    userId: c.var.user.id,
    role: parsed.data.role,
    expiresInDays: parsed.data.expiresInDays,
  });
  return c.json({ ok: true, data: { link } }, 201);
});

/** GET /api/diaries/:diaryId/invite-links */
inviteRoutes.get("/:diaryId/invite-links", async (c) => {
  const links = await c.var.services.diaries.listInviteLinks(
    c.req.param("diaryId"),
    c.var.user.id,
  );
  return c.json({ ok: true, data: { links } });
});

/** DELETE /api/diaries/:diaryId/invite-links/:token */
inviteRoutes.delete("/:diaryId/invite-links/:token", async (c) => {
  await c.var.services.diaries.deleteInviteLink(
    c.req.param("token"),
    c.var.user.id,
  );
  return c.json({ ok: true, data: { deleted: true } });
});

/** POST /api/invite/:token — accept an invite link (authenticated) */
inviteRoutes.post("/accept/:token", async (c) => {
  await c.var.services.diaries.acceptInviteLink(
    c.req.param("token"),
    c.var.user.id,
  );
  return c.json({ ok: true, data: { joined: true } });
});
