import type {
  Diary,
  DiaryMember,
  DiaryRole,
  DiaryType,
} from "@simple-journal/shared-types/domain";
import type { Database, InviteLink } from "../ports/Database.js";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "./errors.js";
import { newDiaryId, newInviteToken, nowIso } from "./ids.js";

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

  async changeType(id: string, userId: string, type: DiaryType): Promise<Diary> {
    await this.requireRole(id, userId, ["owner"]);
    return this.db.updateDiary(id, { type });
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

  // ─── Invite Links ──────────────────────────────────────────────────

  async createInviteLink(input: {
    diaryId: string;
    userId: string;
    role: "editor" | "viewer";
    expiresInDays?: number;
  }): Promise<InviteLink> {
    await this.requireRole(input.diaryId, input.userId, ["owner"]);
    const expiresAt = input.expiresInDays
      ? new Date(Date.now() + input.expiresInDays * 86400000).toISOString()
      : null;
    return this.db.createInviteLink({
      token: newInviteToken(),
      diaryId: input.diaryId,
      role: input.role,
      createdBy: input.userId,
      expiresAt,
    });
  }

  async acceptInviteLink(token: string, userId: string): Promise<void> {
    const link = await this.db.getInviteLink(token);
    if (!link) throw new NotFoundError("invite link", token);
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      throw new ValidationError("invite link has expired");
    }
    await this.db.addMember(link.diaryId, userId, link.role);
  }

  async listInviteLinks(diaryId: string, userId: string): Promise<InviteLink[]> {
    await this.requireRole(diaryId, userId, ["owner"]);
    return this.db.listInviteLinks(diaryId);
  }

  async deleteInviteLink(token: string, userId: string): Promise<void> {
    const link = await this.db.getInviteLink(token);
    if (!link) throw new NotFoundError("invite link", token);
    await this.requireRole(link.diaryId, userId, ["owner"]);
    await this.db.deleteInviteLink(token);
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
