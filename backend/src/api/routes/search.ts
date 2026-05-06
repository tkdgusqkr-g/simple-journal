import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../context.js";

const querySchema = z.object({
  q: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  diaryId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const searchRoutes = new Hono<AppEnv>();

/** GET /api/search */
searchRoutes.get("/", async (c) => {
  const parsed = querySchema.safeParse({
    q: c.req.query("q"),
    tags: c.req.query("tags"),
    diaryId: c.req.query("diaryId"),
    from: c.req.query("from"),
    to: c.req.query("to"),
    limit: c.req.query("limit"),
  });
  if (!parsed.success) {
    return c.json({ ok: true, data: { entries: [] } });
  }
  const tags = parsed.data.tags
    ? parsed.data.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : undefined;

  const entries = await c.var.services.entries.search({
    userId: c.var.user.id,
    query: parsed.data.q,
    tags,
    diaryId: parsed.data.diaryId,
    fromDate: parsed.data.from,
    toDate: parsed.data.to,
    limit: parsed.data.limit,
  });
  return c.json({ ok: true, data: { entries } });
});
