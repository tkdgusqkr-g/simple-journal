import type {
  Diary,
  DiaryMember,
  DiaryRole,
  DiaryType,
  Entry,
  ISODate,
  ISODateTime,
  User,
} from "@simple-journal/shared-types/domain";

export interface CreateUserInput {
  id: string;
  email: string;
  name: string;
  authProvider: User["authProvider"];
  firebaseUid: string;
}

export interface CreateDiaryInput {
  id: string;
  name: string;
  ownerId: string;
  type: DiaryType;
}

export interface CreateEntryInput {
  id: string;
  diaryId: string;
  date: ISODate;
  content: string;
  tags: string[];
  authorId: string;
}

export interface UpdateEntryInput {
  content?: string;
  tags?: string[];
  crdtState?: string | null;
}

export interface ListEntriesOptions {
  diaryId: string;
  cursor?: string;
  limit?: number;
}

export interface ListEntriesResult {
  entries: Entry[];
  nextCursor: string | null;
}

export interface SearchEntriesOptions {
  userId: string;
  query?: string;
  tags?: string[];
  diaryId?: string;
  fromDate?: ISODate;
  toDate?: ISODate;
  limit?: number;
}

export interface PinUpdate {
  pinned: boolean;
  pinnedAt: ISODateTime | null;
  pinnedBy: string | null;
}

export interface InviteLink {
  token: string;
  diaryId: string;
  role: "editor" | "viewer";
  createdBy: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateInviteLinkInput {
  token: string;
  diaryId: string;
  role: "editor" | "viewer";
  createdBy: string;
  expiresAt: string | null;
}

/**
 * Storage port. Backed by Drizzle + D1 in production. Tests can swap with
 * an in-memory fake.
 */
export interface Database {
  // Users
  getUserById(id: string): Promise<User | null>;
  getUserByFirebaseUid(uid: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(input: CreateUserInput): Promise<User>;

  // Diaries
  listDiariesForUser(userId: string): Promise<Diary[]>;
  getDiaryById(id: string): Promise<Diary | null>;
  createDiary(input: CreateDiaryInput): Promise<Diary>;
  updateDiary(id: string, patch: { name?: string; type?: DiaryType }): Promise<Diary>;
  deleteDiary(id: string): Promise<void>;

  // Members
  listMembers(diaryId: string): Promise<DiaryMember[]>;
  addMember(
    diaryId: string,
    userId: string,
    role: DiaryRole,
  ): Promise<DiaryMember>;
  removeMember(diaryId: string, userId: string): Promise<void>;
  getMember(diaryId: string, userId: string): Promise<DiaryMember | null>;

  // Entries
  listEntries(opts: ListEntriesOptions): Promise<ListEntriesResult>;
  getEntryById(id: string): Promise<Entry | null>;
  getEntryByDate(diaryId: string, date: ISODate): Promise<Entry | null>;
  createEntry(input: CreateEntryInput): Promise<Entry>;
  updateEntry(id: string, patch: UpdateEntryInput): Promise<Entry>;
  deleteEntry(id: string): Promise<void>;
  setEntryPin(id: string, update: PinUpdate): Promise<Entry>;
  searchEntries(opts: SearchEntriesOptions): Promise<Entry[]>;

  // Invite links
  createInviteLink(input: CreateInviteLinkInput): Promise<InviteLink>;
  getInviteLink(token: string): Promise<InviteLink | null>;
  listInviteLinks(diaryId: string): Promise<InviteLink[]>;
  deleteInviteLink(token: string): Promise<void>;
}
