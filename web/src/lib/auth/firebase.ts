import {
  PUBLIC_FIREBASE_API_KEY,
  PUBLIC_FIREBASE_APP_ID,
  PUBLIC_FIREBASE_AUTH_DOMAIN,
  PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  PUBLIC_FIREBASE_PROJECT_ID,
  PUBLIC_FIREBASE_STORAGE_BUCKET,
} from "$env/static/public";
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
    PUBLIC_FIREBASE_API_KEY &&
      PUBLIC_FIREBASE_AUTH_DOMAIN &&
      PUBLIC_FIREBASE_PROJECT_ID &&
      PUBLIC_FIREBASE_APP_ID,
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
      apiKey: PUBLIC_FIREBASE_API_KEY,
      authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: PUBLIC_FIREBASE_PROJECT_ID,
      appId: PUBLIC_FIREBASE_APP_ID,
      storageBucket: PUBLIC_FIREBASE_STORAGE_BUCKET || undefined,
      messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID || undefined,
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
