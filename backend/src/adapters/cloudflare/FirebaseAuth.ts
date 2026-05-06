import { createRemoteJWKSet, jwtVerify } from "jose";
import type {
  AuthProvider,
  VerifiedIdentity,
} from "../../ports/AuthProvider.js";
import { UnauthorizedError } from "../../domain/errors.js";

const FIREBASE_ISSUER_PREFIX = "https://securetoken.google.com/";
const FIREBASE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

interface FirebasePayload {
  iss: string;
  aud: string;
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  firebase?: {
    sign_in_provider?: string;
    identities?: Record<string, unknown>;
  };
}

/**
 * Verifies Firebase ID tokens via the public JWKS endpoint. The Cloudflare
 * Workers `jose` package fetches and caches keys per isolate.
 *
 * Note: this adapter never needs the service account private key for
 * verification — it only needs the project id (to validate the audience and
 * issuer). The private key is reserved for Admin SDK operations not yet used.
 */
export class FirebaseAuthAdapter implements AuthProvider {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(private readonly projectId: string) {
    this.jwks = createRemoteJWKSet(new URL(FIREBASE_JWKS_URL));
  }

  async verifyIdToken(idToken: string): Promise<VerifiedIdentity> {
    let payload: FirebasePayload;
    try {
      const result = await jwtVerify<FirebasePayload>(idToken, this.jwks, {
        issuer: `${FIREBASE_ISSUER_PREFIX}${this.projectId}`,
        audience: this.projectId,
      });
      payload = result.payload;
    } catch (err) {
      throw new UnauthorizedError(
        `invalid id_token: ${err instanceof Error ? err.message : "unknown"}`,
      );
    }

    if (!payload.sub) throw new UnauthorizedError("token missing sub");
    if (!payload.email) throw new UnauthorizedError("token missing email");

    return {
      uid: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified === true,
      name: payload.name ?? null,
      provider: this.mapProvider(payload.firebase?.sign_in_provider),
    };
  }

  private mapProvider(
    firebaseProvider: string | undefined,
  ): VerifiedIdentity["provider"] {
    switch (firebaseProvider) {
      case "apple.com":
        return "apple";
      case "google.com":
        return "google";
      case "password":
      case "email":
      case "emailLink":
        return "email";
      default:
        return "email";
    }
  }
}
