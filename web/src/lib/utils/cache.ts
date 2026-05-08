/**
 * Lightweight localStorage cache for the per-diary text doc, so the
 * editor can show the user's last-seen content instantly on page load
 * while the network round-trip happens in the background.
 *
 * Keyed by diary id. Stores the latest known Entry as JSON. Failures
 * (quota, JSON, missing localStorage) are silent — caching is a
 * best-effort speed-up, never a correctness requirement.
 */

import type { Entry } from "@simple-journal/shared-types/domain";

const PREFIX = "sj:diary:";

export interface CachedDiary {
  entry: Entry;
  cachedAt: number;
}

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    // Touching localStorage in some sandboxes throws; check first.
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readDiaryCache(diaryId: string): CachedDiary | null {
  const ls = safeStorage();
  if (!ls) return null;
  try {
    const raw = ls.getItem(PREFIX + diaryId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedDiary;
    if (
      parsed &&
      typeof parsed.cachedAt === "number" &&
      parsed.entry &&
      typeof parsed.entry.id === "string" &&
      typeof parsed.entry.content === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeDiaryCache(diaryId: string, entry: Entry): void {
  const ls = safeStorage();
  if (!ls) return;
  try {
    const payload: CachedDiary = { entry, cachedAt: Date.now() };
    ls.setItem(PREFIX + diaryId, JSON.stringify(payload));
  } catch {
    // Quota or serialization error — drop silently.
  }
}

export function clearDiaryCache(diaryId: string): void {
  const ls = safeStorage();
  if (!ls) return;
  try {
    ls.removeItem(PREFIX + diaryId);
  } catch {
    // ignore
  }
}
