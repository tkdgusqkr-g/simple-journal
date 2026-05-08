import type {
  Diary,
  DiaryMember,
  DiaryRole,
  DiaryType,
  Entry,
  ISODate,
  User,
} from "@simple-journal/shared-types/domain";
import { and, asc, desc, eq, gte, inArray, like, lte, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type {
  CreateDiaryInput,
  CreateEntryInput,
  CreateUserInput,
  Database,
  ListEntriesOptions,
  ListEntriesResult,
  PinUpdate,
  SearchEntriesOptions,
  UpdateEntryInput,
} from "../../ports/Database.js";
import * as schema from "../../db/schema.js";

type Drizzle = ReturnType<typeof drizzle<typeof schema>>;

interface EntryRow {
  id: string;
  diaryId: string;
  date: string;
  content: string;
  tagsJson: string;
  isPinned: boolean;
  pinnedAt: string | null;
  pinnedBy: string | null;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

const toUser = (row: typeof schema.users.$inferSelect): User => ({
  id: row.id,
  email: row.email,
  name: row.name,
  authProvider: row.authProvider,
  createdAt: row.createdAt,
});

const toDiary = (row: typeof schema.diaries.$inferSelect): Diary => ({
  id: row.id,
  name: row.name,
  ownerId: row.ownerId,
  type: row.type,
  createdAt: row.createdAt,
});

const toMember = (
  row: typeof schema.diaryMembers.$inferSelect,
): DiaryMember => ({
  diaryId: row.diaryId,
  userId: row.userId,
  role: row.role,
  joinedAt: row.joinedAt,
});

const toEntry = (row: EntryRow): Entry => {
  let tags: string[] = [];
  try {
    const parsed = JSON.parse(row.tagsJson);
    if (Array.isArray(parsed)) tags = parsed.filter((t): t is string => typeof t === "string");
  } catch {
    tags = [];
  }
  return {
    id: row.id,
    diaryId: row.diaryId,
    date: row.date,
    content: row.content,
    tags,
    isPinned: row.isPinned,
    pinnedAt: row.pinnedAt,
    pinnedBy: row.pinnedBy,
    authorId: row.authorId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

export class D1DatabaseAdapter implements Database {
  private readonly db: Drizzle;

  constructor(d1: D1Database) {
    this.db = drizzle(d1, { schema });
  }

  // ── Users ─────────────────────────────────────────────────────────────

  async getUserById(id: string): Promise<User | null> {
    const rows = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    return rows[0] ? toUser(rows[0]) : null;
  }

  async getUserByFirebaseUid(uid: string): Promise<User | null> {
    const rows = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.firebaseUid, uid))
      .limit(1);
    return rows[0] ? toUser(rows[0]) : null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const rows = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    return rows[0] ? toUser(rows[0]) : null;
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const now = new Date().toISOString();
    const [row] = await this.db
      .insert(schema.users)
      .values({
        id: input.id,
        email: input.email,
        name: input.name,
        authProvider: input.authProvider,
        firebaseUid: input.firebaseUid,
        createdAt: now,
      })
      .returning();
    if (!row) throw new Error("createUser: insert returned no rows");
    return toUser(row);
  }

  // ── Diaries ───────────────────────────────────────────────────────────

  async listDiariesForUser(userId: string): Promise<Diary[]> {
    const rows = await this.db
      .select({ d: schema.diaries })
      .from(schema.diaries)
      .innerJoin(
        schema.diaryMembers,
        eq(schema.diaries.id, schema.diaryMembers.diaryId),
      )
      .where(eq(schema.diaryMembers.userId, userId))
      .orderBy(desc(schema.diaries.createdAt));
    return rows.map((r) => toDiary(r.d));
  }

  async getDiaryById(id: string): Promise<Diary | null> {
    const rows = await this.db
      .select()
      .from(schema.diaries)
      .where(eq(schema.diaries.id, id))
      .limit(1);
    return rows[0] ? toDiary(rows[0]) : null;
  }

  async createDiary(input: CreateDiaryInput): Promise<Diary> {
    const now = new Date().toISOString();
    const [row] = await this.db
      .insert(schema.diaries)
      .values({
        id: input.id,
        name: input.name,
        ownerId: input.ownerId,
        type: input.type,
        createdAt: now,
      })
      .returning();
    if (!row) throw new Error("createDiary: insert returned no rows");
    return toDiary(row);
  }

  async updateDiary(id: string, patch: { name?: string; type?: DiaryType }): Promise<Diary> {
    const set: Partial<typeof schema.diaries.$inferInsert> = {};
    if (patch.name) set.name = patch.name;
    if (patch.type) set.type = patch.type;
    const [row] = await this.db
      .update(schema.diaries)
      .set(set)
      .where(eq(schema.diaries.id, id))
      .returning();
    if (!row) throw new Error(`updateDiary: no diary ${id}`);
    return toDiary(row);
  }

  async deleteDiary(id: string): Promise<void> {
    await this.db.delete(schema.diaries).where(eq(schema.diaries.id, id));
  }

  // ── Members ───────────────────────────────────────────────────────────

  async listMembers(diaryId: string): Promise<DiaryMember[]> {
    const rows = await this.db
      .select()
      .from(schema.diaryMembers)
      .where(eq(schema.diaryMembers.diaryId, diaryId));
    return rows.map(toMember);
  }

  async addMember(
    diaryId: string,
    userId: string,
    role: DiaryRole,
  ): Promise<DiaryMember> {
    const now = new Date().toISOString();
    const [row] = await this.db
      .insert(schema.diaryMembers)
      .values({ diaryId, userId, role, joinedAt: now })
      .onConflictDoUpdate({
        target: [schema.diaryMembers.diaryId, schema.diaryMembers.userId],
        set: { role },
      })
      .returning();
    if (!row) throw new Error("addMember: insert returned no rows");
    return toMember(row);
  }

  async removeMember(diaryId: string, userId: string): Promise<void> {
    await this.db
      .delete(schema.diaryMembers)
      .where(
        and(
          eq(schema.diaryMembers.diaryId, diaryId),
          eq(schema.diaryMembers.userId, userId),
        ),
      );
  }

  async getMember(
    diaryId: string,
    userId: string,
  ): Promise<DiaryMember | null> {
    const rows = await this.db
      .select()
      .from(schema.diaryMembers)
      .where(
        and(
          eq(schema.diaryMembers.diaryId, diaryId),
          eq(schema.diaryMembers.userId, userId),
        ),
      )
      .limit(1);
    return rows[0] ? toMember(rows[0]) : null;
  }

  // ── Entries ───────────────────────────────────────────────────────────

  async listEntries(opts: ListEntriesOptions): Promise<ListEntriesResult> {
    const limit = Math.min(opts.limit ?? 50, 200);
    // Cursor: ISO date of last seen entry (descending order).
    const conditions = [eq(schema.entries.diaryId, opts.diaryId)];
    if (opts.cursor) conditions.push(lte(schema.entries.date, opts.cursor));

    const rows = await this.db
      .select()
      .from(schema.entries)
      .where(and(...conditions))
      .orderBy(desc(schema.entries.isPinned), desc(schema.entries.date))
      .limit(limit + 1);

    const slice = rows.slice(0, limit);
    const nextCursor =
      rows.length > limit ? rows[limit]!.date : null;

    return {
      entries: slice.map(toEntry),
      nextCursor,
    };
  }

  async getEntryById(id: string): Promise<Entry | null> {
    const rows = await this.db
      .select()
      .from(schema.entries)
      .where(eq(schema.entries.id, id))
      .limit(1);
    return rows[0] ? toEntry(rows[0]) : null;
  }

  async getEntryByDate(
    diaryId: string,
    date: ISODate,
  ): Promise<Entry | null> {
    const rows = await this.db
      .select()
      .from(schema.entries)
      .where(
        and(
          eq(schema.entries.diaryId, diaryId),
          eq(schema.entries.date, date),
        ),
      )
      .limit(1);
    return rows[0] ? toEntry(rows[0]) : null;
  }

  async createEntry(input: CreateEntryInput): Promise<Entry> {
    const now = new Date().toISOString();
    const [row] = await this.db
      .insert(schema.entries)
      .values({
        id: input.id,
        diaryId: input.diaryId,
        date: input.date,
        content: input.content,
        tagsJson: JSON.stringify(input.tags),
        isPinned: false,
        pinnedAt: null,
        pinnedBy: null,
        authorId: input.authorId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    if (!row) throw new Error("createEntry: insert returned no rows");
    await this.replaceEntryTags(input.id, input.tags);
    return toEntry(row);
  }

  async updateEntry(id: string, patch: UpdateEntryInput): Promise<Entry> {
    const update: Partial<typeof schema.entries.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };
    if (patch.content !== undefined) update.content = patch.content;
    if (patch.tags !== undefined) update.tagsJson = JSON.stringify(patch.tags);
    if (patch.crdtState !== undefined) update.crdtState = patch.crdtState;

    const [row] = await this.db
      .update(schema.entries)
      .set(update)
      .where(eq(schema.entries.id, id))
      .returning();
    if (!row) throw new Error(`updateEntry: no entry ${id}`);
    if (patch.tags !== undefined) {
      await this.replaceEntryTags(id, patch.tags);
    }
    return toEntry(row);
  }

  async deleteEntry(id: string): Promise<void> {
    await this.db.delete(schema.entries).where(eq(schema.entries.id, id));
  }

  async setEntryPin(id: string, update: PinUpdate): Promise<Entry> {
    const [row] = await this.db
      .update(schema.entries)
      .set({
        isPinned: update.pinned,
        pinnedAt: update.pinnedAt,
        pinnedBy: update.pinnedBy,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.entries.id, id))
      .returning();
    if (!row) throw new Error(`setEntryPin: no entry ${id}`);
    return toEntry(row);
  }

  async searchEntries(opts: SearchEntriesOptions): Promise<Entry[]> {
    const limit = Math.min(opts.limit ?? 50, 200);

    // Restrict to diaries the user is a member of.
    const memberRows = await this.db
      .select({ diaryId: schema.diaryMembers.diaryId })
      .from(schema.diaryMembers)
      .where(eq(schema.diaryMembers.userId, opts.userId));
    const memberDiaryIds = memberRows.map((r) => r.diaryId);
    if (memberDiaryIds.length === 0) return [];

    const conditions = [inArray(schema.entries.diaryId, memberDiaryIds)];
    if (opts.diaryId) conditions.push(eq(schema.entries.diaryId, opts.diaryId));
    if (opts.fromDate) conditions.push(gte(schema.entries.date, opts.fromDate));
    if (opts.toDate) conditions.push(lte(schema.entries.date, opts.toDate));

    if (opts.query) {
      const pattern = `%${opts.query}%`;
      conditions.push(
        or(
          like(schema.entries.content, pattern),
          like(schema.entries.tagsJson, pattern),
        )!,
      );
    }

    let entryIdsForTags: string[] | null = null;
    if (opts.tags && opts.tags.length > 0) {
      const tagRows = await this.db
        .select({ entryId: schema.entryTags.entryId })
        .from(schema.entryTags)
        .where(inArray(schema.entryTags.tag, opts.tags));
      entryIdsForTags = Array.from(new Set(tagRows.map((r) => r.entryId)));
      if (entryIdsForTags.length === 0) return [];
      conditions.push(inArray(schema.entries.id, entryIdsForTags));
    }

    const rows = await this.db
      .select()
      .from(schema.entries)
      .where(and(...conditions))
      .orderBy(desc(schema.entries.date), asc(schema.entries.id))
      .limit(limit);

    return rows.map(toEntry);
  }

  private async replaceEntryTags(
    entryId: string,
    tags: string[],
  ): Promise<void> {
    await this.db
      .delete(schema.entryTags)
      .where(eq(schema.entryTags.entryId, entryId));
    if (tags.length > 0) {
      await this.db
        .insert(schema.entryTags)
        .values(tags.map((tag) => ({ entryId, tag })));
    }
  }
}
