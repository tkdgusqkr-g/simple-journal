/**
 * Identity provider port. Verifies an inbound id_token and returns the
 * canonical claims the rest of the system needs.
 *
 * Backed by Firebase Auth in production. Tests use an in-memory fake.
 */
export interface AuthProvider {
  verifyIdToken(idToken: string): Promise<VerifiedIdentity>;
}

export interface VerifiedIdentity {
  uid: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  provider: "apple" | "google" | "email";
}
