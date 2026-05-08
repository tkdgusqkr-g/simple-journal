import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * D1 (SQLite) schema for SimpleJournal.
 *
 * Conventions:
 * - All ids are nanoid strings (text)
 * - Timestamps are stored as ISO-8601 strings (text) for cross-platform parsing
 * - Tags are stored as JSON-encoded text arrays for now (D1 has no native array)
 * - CRDT entry content is stored as base64-encoded Yjs update bytes
 */

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    authProvider: text("auth_provider", {
      enum: ["apple", "google", "email"],
    }).notNull(),
    firebaseUid: text("firebase_uid").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
    firebaseUidIdx: uniqueIndex("users_firebase_uid_idx").on(t.firebaseUid),
  }),
);

export const diaries = sqliteTable(
  "diaries",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["personal", "shared"] }).notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    ownerIdx: index("diaries_owner_idx").on(t.ownerId),
  }),
);

export const diaryMembers = sqliteTable(
  "diary_members",
  {
    diaryId: text("diary_id")
      .notNull()
      .references(() => diaries.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "editor", "viewer"] }).notNull(),
    joinedAt: text("joined_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.diaryId, t.userId] }),
    userIdx: index("diary_members_user_idx").on(t.userId),
  }),
);

export const entries = sqliteTable(
  "entries",
  {
    id: text("id").primaryKey(),
    diaryId: text("diary_id")
      .notNull()
      .references(() => diaries.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD
    content: text("content").notNull().default(""),
    crdtState: text("crdt_state"), // base64 Yjs snapshot, nullable until first save
    tagsJson: text("tags_json").notNull().default("[]"),
    isPinned: integer("is_pinned", { mode: "boolean" })
      .notNull()
      .default(false),
    pinnedAt: text("pinned_at"),
    pinnedBy: text("pinned_by").references(() => users.id, {
      onDelete: "set null",
    }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    diaryDateIdx: uniqueIndex("entries_diary_date_idx").on(t.diaryId, t.date),
    diaryPinnedIdx: index("entries_diary_pinned_idx").on(t.diaryId, t.isPinned),
    diaryUpdatedIdx: index("entries_diary_updated_idx").on(
      t.diaryId,
      t.updatedAt,
    ),
  }),
);

export const drawings = sqliteTable(
  "drawings",
  {
    id: text("id").primaryKey(),
    entryId: text("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    format: text("format", { enum: ["svg", "json"] }).notNull(),
    r2Key: text("r2_key").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    entryIdx: index("drawings_entry_idx").on(t.entryId),
  }),
);

export const attachments = sqliteTable(
  "attachments",
  {
    id: text("id").primaryKey(),
    entryId: text("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["image", "file"] }).notNull(),
    r2Key: text("r2_key").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    entryIdx: index("attachments_entry_idx").on(t.entryId),
  }),
);

/**
 * FTS-friendly tag index. Tags are also stored on entries.tagsJson for fast read,
 * but this table makes "find entries with tag X" queries efficient.
 */
export const entryTags = sqliteTable(
  "entry_tags",
  {
    entryId: text("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.entryId, t.tag] }),
    tagIdx: index("entry_tags_tag_idx").on(t.tag),
  }),
);

export const inviteLinks = sqliteTable(
  "invite_links",
  {
    token: text("token").primaryKey(),
    diaryId: text("diary_id")
      .notNull()
      .references(() => diaries.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["editor", "viewer"] }).notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: text("expires_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    diaryIdx: index("invite_links_diary_idx").on(t.diaryId),
  }),
);
