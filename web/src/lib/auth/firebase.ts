import { env } from "$env/dynamic/public";
import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  GoogleAuthProvider,
  OAuthProvider,
  getAuth,
  type Auth,
} from "firebase/auth";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

export function isFirebaseConfigured(): boolean {
  return Boolean(
    env.PUBLIC_FIREBASE_API_KEY &&
      env.PUBLIC_FIREBASE_AUTH_DOMAIN &&
      env.PUBLIC_FIREBASE_PROJECT_ID &&
      env.PUBLIC_FIREBASE_APP_ID,
  );
}

export function getFirebaseAuth(): Auth {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase not configured. Set PUBLIC_FIREBASE_* environment variables.",
    );
  }
  if (!app) {
    app = initializeApp({
      apiKey: env.PUBLIC_FIREBASE_API_KEY!,
      authDomain: env.PUBLIC_FIREBASE_AUTH_DOMAIN!,
      projectId: env.PUBLIC_FIREBASE_PROJECT_ID!,
      appId: env.PUBLIC_FIREBASE_APP_ID!,
      storageBucket: env.PUBLIC_FIREBASE_STORAGE_BUCKET || undefined,
      messagingSenderId: env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID || undefined,
    });
  }
  if (!auth) {
    auth = getAuth(app);
  }
  return auth;
}

export function googleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

export function appleProvider(): OAuthProvider {
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  return provider;
}
