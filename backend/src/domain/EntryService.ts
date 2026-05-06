import type { Entry, ISODate } from "@simple-journal/shared-types/domain";
import type {
  Database,
  ListEntriesResult,
  UpdateEntryInput,
} from "../ports/Database.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "./errors.js";
import { newEntryId, nowIso } from "./ids.js";
import type { DiaryService } from "./DiaryService.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TAGS = 32;
const MAX_TAG_LENGTH = 40;

export class EntryService {
  constructor(
    private readonly db: Database,
    private readonly diaries: DiaryService,
  ) {}

  async listInDiary(input: {
    diaryId: string;
    userId: string;
    cursor?: string;
    limit?: number;
  }): Promise<ListEntriesResult> {
    await this.diaries.requireRole(input.diaryId, input.userId, [
      "owner",
      "editor",
      "viewer",
    ]);
    return this.db.listEntries({
      diaryId: input.diaryId,
      cursor: input.cursor,
      limit: input.limit ?? 50,
    });
  }

  async getById(id: string, userId: string): Promise<Entry> {
    const entry = await this.db.getEntryById(id);
    if (!entry) throw new NotFoundError("entry", id);
    await this.diaries.requireRole(entry.diaryId, userId, [
      "owner",
      "editor",
      "viewer",
    ]);
    return entry;
  }

  async upsertOnDate(input: {
    diaryId: string;
    userId: string;
    date: ISODate;
    content: string;
    tags?: string[];
  }): Promise<Entry> {
    await this.diaries.requireRole(input.diaryId, input.userId, [
      "owner",
      "editor",
    ]);
    if (!ISO_DATE.test(input.date)) {
      throw new ValidationError("date must be YYYY-MM-DD");
    }
    const tags = this.validateTags(input.tags ?? []);

    const existing = await this.db.getEntryByDate(input.diaryId, input.date);
    if (existing) {
      return this.db.updateEntry(existing.id, {
        content: input.content,
        tags,
      });
    }
    return this.db.createEntry({
      id: newEntryId(),
      diaryId: input.diaryId,
      date: input.date,
      content: input.content,
      tags,
      authorId: input.userId,
    });
  }

  async update(
    id: string,
    userId: string,
    patch: UpdateEntryInput,
  ): Promise<Entry> {
    const entry = await this.db.getEntryById(id);
    if (!entry) throw new NotFoundError("entry", id);
    await this.diaries.requireRole(entry.diaryId, userId, ["owner", "editor"]);

    const next: UpdateEntryInput = { ...patch };
    if (patch.tags) next.tags = this.validateTags(patch.tags);
    return this.db.updateEntry(id, next);
  }

  async remove(id: string, userId: string): Promise<void> {
    const entry = await this.db.getEntryById(id);
    if (!entry) throw new NotFoundError("entry", id);
    await this.diaries.requireRole(entry.diaryId, userId, ["owner", "editor"]);
    await this.db.deleteEntry(id);
  }

  async setPin(id: string, userId: string, pinned: boolean): Promise<Entry> {
    const entry = await this.db.getEntryById(id);
    if (!entry) throw new NotFoundError("entry", id);
    // Any member of the diary can pin/unpin (shared pin model).
    await this.diaries.requireRole(entry.diaryId, userId, [
      "owner",
      "editor",
      "viewer",
    ]);
    return this.db.setEntryPin(id, {
      pinned,
      pinnedAt: pinned ? nowIso() : null,
      pinnedBy: pinned ? userId : null,
    });
  }

  async search(input: {
    userId: string;
    query?: string;
    tags?: string[];
    diaryId?: string;
    fromDate?: ISODate;
    toDate?: ISODate;
    limit?: number;
  }): Promise<Entry[]> {
    if (input.diaryId) {
      await this.diaries.requireRole(input.diaryId, input.userId, [
        "owner",
        "editor",
        "viewer",
      ]);
    }
    if (input.fromDate && !ISO_DATE.test(input.fromDate)) {
      throw new ValidationError("fromDate must be YYYY-MM-DD");
    }
    if (input.toDate && !ISO_DATE.test(input.toDate)) {
      throw new ValidationError("toDate must be YYYY-MM-DD");
    }
    return this.db.searchEntries({
      userId: input.userId,
      query: input.query?.trim() || undefined,
      tags: input.tags,
      diaryId: input.diaryId,
      fromDate: input.fromDate,
      toDate: input.toDate,
      limit: input.limit ?? 50,
    });
  }

  private validateTags(tags: string[]): string[] {
    if (tags.length > MAX_TAGS) {
      throw new ValidationError(`at most ${MAX_TAGS} tags allowed`);
    }
    const cleaned = tags
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    for (const tag of cleaned) {
      if (tag.length > MAX_TAG_LENGTH) {
        throw new ValidationError(
          `tag '${tag}' exceeds ${MAX_TAG_LENGTH} characters`,
        );
      }
    }
    const unique = Array.from(new Set(cleaned));
    if (unique.length !== cleaned.length) {
      throw new ConflictError("duplicate tags are not allowed");
    }
    return unique;
  }

  /** Reserved for future use to avoid `unused`-style accidents in callers. */
  protected unused(): ForbiddenError {
    return new ForbiddenError();
  }
}
