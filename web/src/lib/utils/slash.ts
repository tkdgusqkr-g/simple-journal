/**
 * Slash command engine for the entry textarea.
 *
 * Notion-style: typing `/` opens a popup with date-related commands; the
 * selected command inserts a new entry (or jumps to an existing one).
 *
 * Commands:
 *   /today       — create or jump to today's entry
 *   /yesterday   — create or jump to yesterday's entry
 *   /date        — open a mini calendar to pick any date
 *   /YYYY-MM-DD  — direct ISO date input
 */

import { isValidIsoDate, todayIso, yesterdayIso } from "./date.js";

export type SlashAction =
  | { kind: "createDate"; date: string }
  | { kind: "openDatePicker" };

export interface SlashCommand {
  id: string;
  label: string;
  hint: string;
  /** Lowercase tokens this command matches as the user types after `/`. */
  tokens: string[];
  resolve: () => SlashAction;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: "today",
    label: "Today",
    hint: "Insert today's entry",
    tokens: ["today", "tod", "t"],
    resolve: () => ({ kind: "createDate", date: todayIso() }),
  },
  {
    id: "yesterday",
    label: "Yesterday",
    hint: "Insert yesterday's entry",
    tokens: ["yesterday", "yes", "y"],
    resolve: () => ({ kind: "createDate", date: yesterdayIso() }),
  },
  {
    id: "date",
    label: "Pick a date…",
    hint: "Open a calendar",
    tokens: ["date", "d", "calendar", "cal"],
    resolve: () => ({ kind: "openDatePicker" }),
  },
];

/**
 * Returns the slash trigger info if the cursor is currently inside a
 * slash command (e.g. `/tod` with cursor right after the d).
 *
 * Notion-style: any `/` opens the menu regardless of surrounding text.
 * The "query" is everything from the `/` up to the cursor, stopping at
 * whitespace so the menu hides as soon as the user types a space.
 *
 * Limit scan length so a one-off slash deep in a long paragraph
 * doesn't keep matching forever.
 */
export interface SlashTrigger {
  slashIndex: number;
  query: string;
}

const MAX_SCAN = 40;

export function detectSlashTrigger(
  text: string,
  cursor: number,
): SlashTrigger | null {
  const start = Math.max(0, cursor - MAX_SCAN);
  for (let i = cursor - 1; i >= start; i--) {
    const ch = text[i];
    if (ch === "/") {
      return { slashIndex: i, query: text.slice(i + 1, cursor) };
    }
    if (ch === " " || ch === "\n" || ch === "\t") return null;
  }
  return null;
}

export interface SlashSuggestion {
  id: string;
  label: string;
  hint: string;
  resolve: () => SlashAction;
}

export function suggestionsFor(query: string): SlashSuggestion[] {
  const q = query.trim().toLowerCase();

  // ISO date typed directly takes top priority.
  if (q && isValidIsoDate(q)) {
    return [
      {
        id: `iso-${q}`,
        label: q,
        hint: "Insert this date",
        resolve: () => ({ kind: "createDate", date: q }),
      },
      ...SLASH_COMMANDS,
    ];
  }

  if (!q) return [...SLASH_COMMANDS];

  return SLASH_COMMANDS.filter((c) =>
    c.tokens.some((t) => t.startsWith(q)),
  );
}
