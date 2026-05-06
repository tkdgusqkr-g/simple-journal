import type { Realtime } from "../../ports/Realtime.js";
import type { CrdtRoom } from "../../api/websocket/crdt-room.js";

/**
 * Adapter that routes a WebSocket upgrade to the right Durable Object instance
 * (one per entry).
 */
export class DORealtimeAdapter implements Realtime {
  constructor(private readonly namespace: DurableObjectNamespace<CrdtRoom>) {}

  async joinEntryRoom(
    entryId: string,
    request: Request,
    userId: string,
  ): Promise<Response> {
    const id = this.namespace.idFromName(entryId);
    const stub = this.namespace.get(id);
    const url = new URL(request.url);
    url.searchParams.set("userId", userId);
    url.searchParams.set("entryId", entryId);
    return stub.fetch(new Request(url.toString(), request));
  }
}
