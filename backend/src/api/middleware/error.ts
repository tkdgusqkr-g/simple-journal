import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { DomainError } from "../../domain/errors.js";
import type { AppEnv } from "../context.js";

export function errorHandler(err: Error, c: Context<AppEnv>): Response {
  if (err instanceof DomainError) {
    return c.json(
      {
        ok: false,
        error: { code: err.code, message: err.message, details: err.details },
      },
      err.status as 400 | 401 | 403 | 404 | 409 | 500,
    );
  }
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  console.error("[unhandled]", err);
  return c.json(
    {
      ok: false,
      error: { code: "internal_error", message: "internal server error" },
    },
    500,
  );
}
