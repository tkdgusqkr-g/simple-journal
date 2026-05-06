/**
 * REST API request / response contracts.
 *
 * These mirror routes defined in backend/src/api/routes/*.
 */

import type {
  Diary,
  DiaryMember,
  DiaryRole,
  DiaryType,
  Entry,
  ISODate,
  User,
} from "./domain.js";

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

export interface VerifyAuthRequest {
  idToken: string;
}

export interface VerifyAuthResponse {
  user: User;
}

export interface CreateDiaryRequest {
  name: string;
  type: DiaryType;
}

export interface UpdateDiaryRequest {
  name?: string;
}

export interface ListDiariesResponse {
  diaries: Diary[];
}

export interface CreateEntryRequest {
  date: ISODate;
  content: string;
  tags?: string[];
}

export interface UpdateEntryRequest {
  content?: string;
  tags?: string[];
}

export interface ListEntriesQuery {
  diaryId: string;
  cursor?: string;
  limit?: number;
}

export interface ListEntriesResponse {
  entries: Entry[];
  nextCursor: string | null;
}

export interface TogglePinRequest {
  entryId: string;
  pinned: boolean;
}

export interface InviteMemberRequest {
  diaryId: string;
  email: string;
  role: DiaryRole;
}

export interface ListMembersResponse {
  members: DiaryMember[];
}

export interface SearchQuery {
  query?: string;
  tags?: string[];
  diaryId?: string;
  fromDate?: ISODate;
  toDate?: ISODate;
}

export interface SearchResponse {
  entries: Entry[];
}
