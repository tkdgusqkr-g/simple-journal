import { Hono } from "hono";
import { z } from "zod";
import { NotFoundError, ValidationError } from "../../domain/errors.js";
import type { AppEnv } from "../context.js";

const inviteBody = z.object({
  email: z.string().email(),
  role: z.enum(["editor", "viewer"]),
});

export const memberRoutes = new Hono<AppEnv>();

/** GET /api/diaries/:diaryId/members */
memberRoutes.get("/:diaryId/members", async (c) => {
  const members = await c.var.services.diaries.listMembers(
    c.req.param("diaryId"),
    c.var.user.id,
  );
  return c.json({ ok: true, data: { members } });
});

/** POST /api/diaries/:diaryId/members  body: { email, role } */
memberRoutes.post("/:diaryId/members", async (c) => {
  const parsed = inviteBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new ValidationError("invalid body");

  const target = await c.var.services.users.getByEmail(parsed.data.email);
  if (!target) throw new NotFoundError("user", parsed.data.email);

  const member = await c.var.services.diaries.addMember({
    diaryId: c.req.param("diaryId"),
    actingUserId: c.var.user.id,
    targetUserId: target.id,
    role: parsed.data.role,
  });
  return c.json({ ok: true, data: { member } }, 201);
});

/** DELETE /api/diaries/:diaryId/members/:userId */
memberRoutes.delete("/:diaryId/members/:userId", async (c) => {
  await c.var.services.diaries.removeMember({
    diaryId: c.req.param("diaryId"),
    actingUserId: c.var.user.id,
    targetUserId: c.req.param("userId"),
  });
  return c.json({ ok: true, data: { removed: true } });
});
