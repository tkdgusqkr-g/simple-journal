import { Hono } from "hono";
import { z } from "zod";
import { ValidationError } from "../../domain/errors.js";
import type { AppEnv } from "../context.js";

const upsertBody = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  content: z.string(),
  tags: z.array(z.string()).optional(),
});

const updateBody = z.object({
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Diary-scoped entry routes. Mount at /api/diaries.
 * - GET    /api/diaries/:diaryId/entries
 * - POST   /api/diaries/:diaryId/entries
 */
export const diaryEntryRoutes = new Hono<AppEnv>();

diaryEntryRoutes.get("/:diaryId/entries", async (c) => {
  const cursor = c.req.query("cursor") ?? undefined;
  const limitParam = c.req.query("limit");
  const limit =
    limitParam && Number.isFinite(Number(limitParam))
      ? Number(limitParam)
      : undefined;
  const result = await c.var.services.entries.listInDiary({
    diaryId: c.req.param("diaryId"),
    userId: c.var.user.id,
    cursor,
    limit,
  });
  return c.json({ ok: true, data: result });
});

diaryEntryRoutes.post("/:diaryId/entries", async (c) => {
  const parsed = upsertBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new ValidationError("invalid body");
  const entry = await c.var.services.entries.upsertOnDate({
    diaryId: c.req.param("diaryId"),
    userId: c.var.user.id,
    date: parsed.data.date,
    content: parsed.data.content,
    tags: parsed.data.tags,
  });
  return c.json({ ok: true, data: { entry } });
});

/**
 * Entry-id-scoped routes. Mount at /api/entries.
 * - GET    /api/entries/:id
 * - PATCH  /api/entries/:id
 * - DELETE /api/entries/:id
 */
export const entryRoutes = new Hono<AppEnv>();

entryRoutes.get("/:id", async (c) => {
  const entry = await c.var.services.entries.getById(
    c.req.param("id"),
    c.var.user.id,
  );
  return c.json({ ok: true, data: { entry } });
});

entryRoutes.patch("/:id", async (c) => {
  const parsed = updateBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new ValidationError("invalid body");
  const entry = await c.var.services.entries.update(
    c.req.param("id"),
    c.var.user.id,
    parsed.data,
  );
  return c.json({ ok: true, data: { entry } });
});

entryRoutes.delete("/:id", async (c) => {
  await c.var.services.entries.remove(c.req.param("id"), c.var.user.id);
  return c.json({ ok: true, data: { deleted: true } });
});
