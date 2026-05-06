import { Hono } from "hono";
import { z } from "zod";
import { ValidationError } from "../../domain/errors.js";
import type { AppEnv } from "../context.js";

const createBody = z.object({
  name: z.string().min(1).max(80),
  type: z.enum(["personal", "shared"]),
});

const updateBody = z.object({
  name: z.string().min(1).max(80),
});

export const diaryRoutes = new Hono<AppEnv>();

diaryRoutes.get("/", async (c) => {
  const diaries = await c.var.services.diaries.listForUser(c.var.user.id);
  return c.json({ ok: true, data: { diaries } });
});

diaryRoutes.post("/", async (c) => {
  const parsed = createBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new ValidationError("invalid body");
  const diary = await c.var.services.diaries.create({
    userId: c.var.user.id,
    name: parsed.data.name,
    type: parsed.data.type,
  });
  return c.json({ ok: true, data: { diary } }, 201);
});

diaryRoutes.patch("/:id", async (c) => {
  const parsed = updateBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new ValidationError("invalid body");
  const diary = await c.var.services.diaries.rename(
    c.req.param("id"),
    c.var.user.id,
    parsed.data.name,
  );
  return c.json({ ok: true, data: { diary } });
});

diaryRoutes.delete("/:id", async (c) => {
  await c.var.services.diaries.remove(c.req.param("id"), c.var.user.id);
  return c.json({ ok: true, data: { deleted: true } });
});
