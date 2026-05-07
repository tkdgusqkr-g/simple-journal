import { browser } from "$app/environment";
import type { User } from "@simple-journal/shared-types/domain";
import {
  signInWithEmailLink,
  signInWithPopup,
  signOut,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  appleProvider,
  getFirebaseAuth,
  googleProvider,
  isFirebaseConfigured,
} from "./firebase.js";
import { apiClient } from "../api/client.js";

const EMAIL_LS_KEY = "sj.signin.email";

interface AuthState {
  status: "loading" | "anonymous" | "authenticated";
  user: User | null;
  firebaseUser: FirebaseUser | null;
  error: string | null;
}

function createAuthStore() {
  let state = $state<AuthState>({
    status: "loading",
    user: null,
    firebaseUser: null,
    error: null,
  });

  let initialized = false;

  function init(): void {
    if (initialized || !browser) return;
    initialized = true;

    if (!isFirebaseConfigured()) {
      state.status = "anonymous";
      state.error =
        "Firebase is not configured. Set PUBLIC_FIREBASE_* env vars to enable login.";
      return;
    }

    const auth = getFirebaseAuth();

    auth.onIdTokenChanged(async (fbUser) => {
      // Firebase fires this on every token refresh (~hourly) — avoid
      // re-poking reactive state when nothing actually changed, which
      // can cascade into runaway $effect re-runs in pages that depend
      // on authStore.status.
      if (!fbUser) {
        if (state.status !== "anonymous") {
          state.firebaseUser = null;
          state.status = "anonymous";
          state.user = null;
        }
        apiClient.setIdToken(null);
        return;
      }
      try {
        const idToken = await fbUser.getIdToken();
        apiClient.setIdToken(idToken);

        // If we already have a verified user for this firebase uid, just
        // refresh the bearer token and skip the verify roundtrip + the
        // state.user reassignment.
        if (
          state.status === "authenticated" &&
          state.user &&
          state.firebaseUser?.uid === fbUser.uid
        ) {
          if (state.firebaseUser !== fbUser) state.firebaseUser = fbUser;
          return;
        }

        const result = await apiClient.post<{ user: User }>(
          "/api/auth/verify",
          { idToken },
        );
        state.firebaseUser = fbUser;
        state.user = result.user;
        state.status = "authenticated";
        state.error = null;
      } catch (err) {
        state.error = err instanceof Error ? err.message : "auth failed";
        state.status = "anonymous";
        state.user = null;
        state.firebaseUser = null;
        apiClient.setIdToken(null);
      }
    });

    void completeEmailLinkSignInIfNeeded();
  }

  async function signInWithGoogle(): Promise<void> {
    state.error = null;
    try {
      await signInWithPopup(getFirebaseAuth(), googleProvider());
    } catch (err) {
      state.error = err instanceof Error ? err.message : "Google sign-in failed";
      throw err;
    }
  }

  async function signInWithApple(): Promise<void> {
    state.error = null;
    try {
      await signInWithPopup(getFirebaseAuth(), appleProvider());
    } catch (err) {
      state.error = err instanceof Error ? err.message : "Apple sign-in failed";
      throw err;
    }
  }

  async function sendEmailLink(email: string, returnUrl: string): Promise<void> {
    state.error = null;
    const trimmed = email.trim();
    if (!trimmed) throw new Error("email is required");
    await sendSignInLinkToEmail(getFirebaseAuth(), trimmed, {
      url: returnUrl,
      handleCodeInApp: true,
    });
    if (browser) localStorage.setItem(EMAIL_LS_KEY, trimmed);
  }

  async function completeEmailLinkSignInIfNeeded(): Promise<void> {
    if (!browser) return;
    const auth = getFirebaseAuth();
    if (!isSignInWithEmailLink(auth, window.location.href)) return;

    let email = localStorage.getItem(EMAIL_LS_KEY);
    if (!email) {
      email = window.prompt("Enter the email you used to sign in:");
      if (!email) return;
    }
    try {
      await signInWithEmailLink(auth, email, window.location.href);
      localStorage.removeItem(EMAIL_LS_KEY);
      // Clean the URL.
      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState({}, "", url.toString());
    } catch (err) {
      state.error =
        err instanceof Error ? err.message : "email link sign-in failed";
    }
  }

  async function logout(): Promise<void> {
    await signOut(getFirebaseAuth());
  }

  return {
    get status() {
      return state.status;
    },
    get user() {
      return state.user;
    },
    get firebaseUser() {
      return state.firebaseUser;
    },
    get error() {
      return state.error;
    },
    init,
    signInWithGoogle,
    signInWithApple,
    sendEmailLink,
    logout,
  };
}

export const authStore = createAuthStore();
