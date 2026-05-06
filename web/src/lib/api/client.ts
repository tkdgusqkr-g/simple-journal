import {
  PUBLIC_API_BASE_URL,
  PUBLIC_ENVIRONMENT,
} from "$env/static/public";
import {
  getEndpoints,
  resolveEnvironment,
} from "@simple-journal/shared-config";

interface ApiOk<T> {
  ok: true;
  data: T;
}
interface ApiErr {
  ok: false;
  error: { code: string; message: string; details?: Record<string, unknown> };
}
type ApiEnvelope<T> = ApiOk<T> | ApiErr;

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

class ApiClient {
  private idToken: string | null = null;

  baseUrl(): string {
    if (PUBLIC_API_BASE_URL) return PUBLIC_API_BASE_URL.replace(/\/$/, "");
    const env = resolveEnvironment(PUBLIC_ENVIRONMENT);
    return getEndpoints(env).api.replace(/\/$/, "");
  }

  setIdToken(token: string | null): void {
    this.idToken = token;
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    init?: RequestInit,
  ): Promise<T> {
    const headers = new Headers(init?.headers);
    if (this.idToken) headers.set("Authorization", `Bearer ${this.idToken}`);
    if (body !== undefined) headers.set("Content-Type", "application/json");

    const res = await fetch(`${this.baseUrl()}${path}`, {
      ...init,
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : init?.body,
    });

    let parsed: ApiEnvelope<T> | undefined;
    try {
      parsed = (await res.json()) as ApiEnvelope<T>;
    } catch {
      parsed = undefined;
    }

    if (!res.ok || !parsed?.ok) {
      const code = parsed && !parsed.ok ? parsed.error.code : "http_error";
      const message =
        parsed && !parsed.ok ? parsed.error.message : `HTTP ${res.status}`;
      const details = parsed && !parsed.ok ? parsed.error.details : undefined;
      throw new ApiError(code, message, res.status, details);
    }
    return parsed.data;
  }

  get<T>(path: string, init?: RequestInit): Promise<T> {
    return this.request<T>("GET", path, undefined, init);
  }
  post<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
    return this.request<T>("POST", path, body, init);
  }
  patch<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
    return this.request<T>("PATCH", path, body, init);
  }
  delete<T>(path: string, init?: RequestInit): Promise<T> {
    return this.request<T>("DELETE", path, undefined, init);
  }
}

export const apiClient = new ApiClient();
