import type {
  Diary,
  DiaryMember,
  DiaryRole,
  DiaryType,
} from "@simple-journal/shared-types/domain";
import type { Database } from "../ports/Database.js";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "./errors.js";
import { newDiaryId } from "./ids.js";

export class DiaryService {
  constructor(private readonly db: Database) {}

  async listForUser(userId: string): Promise<Diary[]> {
    return this.db.listDiariesForUser(userId);
  }

  async create(input: {
    userId: string;
    name: string;
    type: DiaryType;
  }): Promise<Diary> {
    const trimmed = input.name.trim();
    if (!trimmed) throw new ValidationError("name is required");
    if (trimmed.length > 80) {
      throw new ValidationError("name must be 80 characters or fewer");
    }

    const diary = await this.db.createDiary({
      id: newDiaryId(),
      name: trimmed,
      ownerId: input.userId,
      type: input.type,
    });
    await this.db.addMember(diary.id, input.userId, "owner");
    return diary;
  }

  async rename(id: string, userId: string, name: string): Promise<Diary> {
    await this.requireRole(id, userId, ["owner", "editor"]);
    const trimmed = name.trim();
    if (!trimmed) throw new ValidationError("name is required");
    return this.db.updateDiary(id, { name: trimmed });
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.requireRole(id, userId, ["owner"]);
    await this.db.deleteDiary(id);
  }

  async listMembers(id: string, userId: string): Promise<DiaryMember[]> {
    await this.requireRole(id, userId, ["owner", "editor", "viewer"]);
    return this.db.listMembers(id);
  }

  async addMember(input: {
    diaryId: string;
    actingUserId: string;
    targetUserId: string;
    role: DiaryRole;
  }): Promise<DiaryMember> {
    await this.requireRole(input.diaryId, input.actingUserId, ["owner"]);
    if (input.role === "owner") {
      throw new ValidationError("ownership cannot be granted by invitation");
    }
    return this.db.addMember(input.diaryId, input.targetUserId, input.role);
  }

  async removeMember(input: {
    diaryId: string;
    actingUserId: string;
    targetUserId: string;
  }): Promise<void> {
    if (input.actingUserId === input.targetUserId) {
      // Self-leave is always allowed.
      const self = await this.db.getMember(input.diaryId, input.actingUserId);
      if (!self) throw new NotFoundError("member", input.targetUserId);
      if (self.role === "owner") {
        throw new ForbiddenError("owner cannot leave; transfer ownership first");
      }
    } else {
      await this.requireRole(input.diaryId, input.actingUserId, ["owner"]);
    }
    await this.db.removeMember(input.diaryId, input.targetUserId);
  }

  /**
   * Read-side authorization helper.
   */
  async requireRole(
    diaryId: string,
    userId: string,
    allowed: DiaryRole[],
  ): Promise<DiaryMember> {
    const member = await this.db.getMember(diaryId, userId);
    if (!member) {
      const exists = await this.db.getDiaryById(diaryId);
      if (!exists) throw new NotFoundError("diary", diaryId);
      throw new ForbiddenError("not a member of this diary");
    }
    if (!allowed.includes(member.role)) {
      throw new ForbiddenError(`role '${member.role}' is not permitted`);
    }
    return member;
  }
}
