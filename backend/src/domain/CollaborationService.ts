import type { Database } from "../ports/Database.js";
import type { Realtime } from "../ports/Realtime.js";
import { NotFoundError } from "./errors.js";
import type { DiaryService } from "./DiaryService.js";

export class CollaborationService {
  constructor(
    private readonly db: Database,
    private readonly diaries: DiaryService,
    private readonly realtime: Realtime,
  ) {}

  /**
   * Join (or create) the realtime collaboration room for an entry. The caller
   * must have edit access to the parent diary.
   */
  async joinEntry(input: {
    entryId: string;
    userId: string;
    request: Request;
  }): Promise<Response> {
    const entry = await this.db.getEntryById(input.entryId);
    if (!entry) throw new NotFoundError("entry", input.entryId);
    await this.diaries.requireRole(entry.diaryId, input.userId, [
      "owner",
      "editor",
    ]);
    return this.realtime.joinEntryRoom(
      input.entryId,
      input.request,
      input.userId,
    );
  }
}
