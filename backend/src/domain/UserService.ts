import type { User } from "@simple-journal/shared-types/domain";
import type { Database } from "../ports/Database.js";
import type { VerifiedIdentity } from "../ports/AuthProvider.js";
import { newUserId } from "./ids.js";

export class UserService {
  constructor(private readonly db: Database) {}

  /**
   * Resolve a verified identity to a SimpleJournal user, creating one on first
   * sign-in. Idempotent on the firebase uid.
   */
  async upsertFromIdentity(identity: VerifiedIdentity): Promise<User> {
    const existing = await this.db.getUserByFirebaseUid(identity.uid);
    if (existing) return existing;

    return this.db.createUser({
      id: newUserId(),
      email: identity.email,
      name: identity.name ?? identity.email.split("@")[0]!,
      authProvider: identity.provider,
      firebaseUid: identity.uid,
    });
  }

  async getById(id: string): Promise<User | null> {
    return this.db.getUserById(id);
  }

  async getByEmail(email: string): Promise<User | null> {
    return this.db.getUserByEmail(email);
  }
}
