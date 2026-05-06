import type { Hono } from "hono";
import type { User } from "@simple-journal/shared-types/domain";
import type { Env } from "../env.js";
import type {
  CollaborationService,
  DiaryService,
  EntryService,
  UserService,
} from "../domain/index.js";
import type { Storage } from "../ports/Storage.js";

export interface Services {
  users: UserService;
  diaries: DiaryService;
  entries: EntryService;
  collab: CollaborationService;
  storage: Storage;
}

/** Variables attached to the Hono context. */
export interface Variables {
  services: Services;
  user: User;
}

/** Hono app type alias used everywhere. */
export type AppEnv = { Bindings: Env; Variables: Variables };
export type App = Hono<AppEnv>;
