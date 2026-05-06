/**
 * Core domain models for SimpleJournal.
 *
 * These types are the source of truth shared between backend and clients.
 * Swift / Kotlin equivalents are generated from this file via scripts/generate-types.sh.
 */

export type ISODateTime = string;
export type ISODate = string;

export type AuthProvider = "apple" | "google" | "email";

export interface User {
  id: string;
  email: string;
  name: string;
  authProvider: AuthProvider;
  createdAt: ISODateTime;
}

export type DiaryType = "personal" | "shared";

export interface Diary {
  id: string;
  name: string;
  ownerId: string;
  type: DiaryType;
  createdAt: ISODateTime;
}

export type DiaryRole = "owner" | "editor" | "viewer";

export interface DiaryMember {
  diaryId: string;
  userId: string;
  role: DiaryRole;
  joinedAt: ISODateTime;
}

export interface Entry {
  id: string;
  diaryId: string;
  date: ISODate;
  content: string;
  tags: string[];
  isPinned: boolean;
  pinnedAt: ISODateTime | null;
  pinnedBy: string | null;
  authorId: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type DrawingFormat = "svg" | "json";

export interface Drawing {
  id: string;
  entryId: string;
  position: number;
  format: DrawingFormat;
  dataRef: string;
}

export type AttachmentType = "image" | "file";

export interface Attachment {
  id: string;
  entryId: string;
  type: AttachmentType;
  r2Key: string;
}
