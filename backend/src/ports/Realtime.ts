/**
 * Realtime collaboration port. Returns a WebSocket-capable Response that
 * upgrades the connection and joins the entry's CRDT room.
 *
 * Backed by Cloudflare Durable Objects (one DO instance per entry).
 */
export interface Realtime {
  joinEntryRoom(
    entryId: string,
    request: Request,
    userId: string,
  ): Promise<Response>;
}
