import type {
  Diary,
  DiaryMember,
  DiaryRole,
  DiaryType,
  Entry,
  ISODate,
} from "@simple-journal/shared-types/domain";
import { apiClient } from "./client.js";

export const diariesApi = {
  list: () =>
    apiClient.get<{ diaries: Diary[] }>("/api/diaries").then((r) => r.diaries),

  create: (input: { name: string; type: DiaryType }) =>
    apiClient
      .post<{ diary: Diary }>("/api/diaries", input)
      .then((r) => r.diary),

  rename: (id: string, name: string) =>
    apiClient
      .patch<{ diary: Diary }>(`/api/diaries/${id}`, { name })
      .then((r) => r.diary),

  remove: (id: string) =>
    apiClient.delete<{ deleted: boolean }>(`/api/diaries/${id}`),

  members: (id: string) =>
    apiClient
      .get<{ members: DiaryMember[] }>(`/api/diaries/${id}/members`)
      .then((r) => r.members),

  invite: (id: string, email: string, role: DiaryRole) =>
    apiClient.post<{ member: DiaryMember }>(`/api/diaries/${id}/members`, {
      email,
      role,
    }),

  removeMember: (id: string, userId: string) =>
    apiClient.delete<{ removed: boolean }>(
      `/api/diaries/${id}/members/${userId}`,
    ),
};

export const entriesApi = {
  listInDiary: (
    diaryId: string,
    opts?: { cursor?: string; limit?: number },
  ) => {
    const params = new URLSearchParams();
    if (opts?.cursor) params.set("cursor", opts.cursor);
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    const path = `/api/diaries/${diaryId}/entries${qs ? `?${qs}` : ""}`;
    return apiClient.get<{ entries: Entry[]; nextCursor: string | null }>(
      path,
    );
  },

  upsert: (
    diaryId: string,
    input: { date: ISODate; content: string; tags?: string[] },
  ) =>
    apiClient
      .post<{ entry: Entry }>(`/api/diaries/${diaryId}/entries`, input)
      .then((r) => r.entry),

  get: (id: string) =>
    apiClient.get<{ entry: Entry }>(`/api/entries/${id}`).then((r) => r.entry),

  update: (id: string, patch: { content?: string; tags?: string[] }) =>
    apiClient
      .patch<{ entry: Entry }>(`/api/entries/${id}`, patch)
      .then((r) => r.entry),

  remove: (id: string) =>
    apiClient.delete<{ deleted: boolean }>(`/api/entries/${id}`),

  setPin: (id: string, pinned: boolean) =>
    apiClient
      .post<{ entry: Entry }>(`/api/entries/${id}/pin`, { pinned })
      .then((r) => r.entry),

  search: (params: {
    q?: string;
    tags?: string[];
    diaryId?: string;
    from?: ISODate;
    to?: ISODate;
    limit?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.tags?.length) qs.set("tags", params.tags.join(","));
    if (params.diaryId) qs.set("diaryId", params.diaryId);
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
    if (params.limit) qs.set("limit", String(params.limit));
    const path = `/api/search${qs.toString() ? `?${qs.toString()}` : ""}`;
    return apiClient
      .get<{ entries: Entry[] }>(path)
      .then((r) => r.entries);
  },
};
