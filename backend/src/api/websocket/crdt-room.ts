import { DurableObject } from "cloudflare:workers";
import type { Env } from "../../env.js";

interface AttachmentMeta {
  userId: string;
  entryId: string;
}

/**
 * Per-entry collaboration room. One Durable Object instance per entry id.
 *
 * Phase 2: simple broadcast — every message from one client is sent to all
 * other connected clients. WebSocket Hibernation is enabled so idle rooms
 * don't bill compute.
 *
 * Phase 6: replace the broadcast with Yjs document sync (y-protocols sync /
 * awareness messages, persisted snapshots in storage).
 */
export class CrdtRoom extends DurableObject<Env> {
  override async fetch(request: Request): Promise<Response> {
    const upgrade = request.headers.get("Upgrade");
    if (upgrade !== "websocket") {
      return new Response("expected WebSocket upgrade", { status: 426 });
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const entryId = url.searchParams.get("entryId");
    if (!userId || !entryId) {
      return new Response("missing userId or entryId", { status: 400 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ userId, entryId } satisfies AttachmentMeta);

    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(
    ws: WebSocket,
    message: ArrayBuffer | string,
  ): Promise<void> {
    const sender = ws.deserializeAttachment() as AttachmentMeta | null;
    for (const peer of this.ctx.getWebSockets()) {
      if (peer === ws) continue;
      try {
        if (typeof message === "string") {
          peer.send(message);
        } else {
          peer.send(message);
        }
      } catch {
        // peer disconnected; close handler will reap.
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    sender; // reserved for Phase 6 (audit / awareness)
  }

  override async webSocketClose(
    ws: WebSocket,
    code: number,
    _reason: string,
    _wasClean: boolean,
  ): Promise<void> {
    try {
      ws.close(code, "closing");
    } catch {
      // already closed
    }
  }

  override async webSocketError(
    ws: WebSocket,
    _error: unknown,
  ): Promise<void> {
    try {
      ws.close(1011, "error");
    } catch {
      // already closed
    }
  }
}
