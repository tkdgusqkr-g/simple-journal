/**
 * Yjs CRDT document shape for collaborative entries.
 *
 * The actual structure is constructed at runtime by Yjs (Y.Doc, Y.Text, Y.Map).
 * These TypeScript types document the intended logical schema.
 */

export interface EntryCrdtSnapshot {
  schemaVersion: 1;
  text: string;
  drawings: CrdtDrawingRef[];
}

export interface CrdtDrawingRef {
  id: string;
  position: number;
  dataRef: string;
}

export const CRDT_SCHEMA_VERSION = 1 as const;
