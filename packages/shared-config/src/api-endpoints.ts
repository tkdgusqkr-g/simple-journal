/**
 * Environment-aware API endpoint configuration.
 *
 * Domain decisions:
 * - dev / beta uses Cloudflare default subdomains (no custom domain)
 * - prod uses custom domain decided in Phase 7
 */

export type Environment = "local" | "dev" | "prod";

export interface ApiEndpoints {
  api: string;
  websocket: string;
  web: string;
}

const ENDPOINTS: Record<Environment, ApiEndpoints> = {
  local: {
    api: "http://localhost:8787",
    websocket: "ws://localhost:8787",
    web: "http://localhost:5173",
  },
  dev: {
    api: "https://simple-journal-api.tkdgusqkr-g.workers.dev",
    websocket: "wss://simple-journal-api.tkdgusqkr-g.workers.dev",
    web: "https://simple-journal.pages.dev",
  },
  prod: {
    // Updated in Phase 7 once the production domain is purchased.
    api: "https://api.simplejournal.com",
    websocket: "wss://ws.simplejournal.com",
    web: "https://simplejournal.com",
  },
};

export function getEndpoints(env: Environment): ApiEndpoints {
  return ENDPOINTS[env];
}

export function resolveEnvironment(value: string | undefined): Environment {
  if (value === "prod" || value === "production") return "prod";
  if (value === "local" || value === "development") return "local";
  return "dev";
}
