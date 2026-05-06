import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../context.js";

export const requestLogger: MiddlewareHandler<AppEnv> = async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(
    `[${c.req.method}] ${c.req.path} → ${c.res.status} (${ms}ms)`,
  );
};
