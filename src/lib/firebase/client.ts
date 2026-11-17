import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let firestore: Firestore | undefined;

function getClientConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

function assertClientConfig() {
  const config = getClientConfig();
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Firebase client configuration is missing: ${missing.join(", ")}`);
  }

  return config as Record<string, string>;
}

export function getFirebaseClientApp() {
  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(assertClientConfig());
  }
  return app;
}

export function getFirebaseClientAuth() {
  auth ??= getAuth(getFirebaseClientApp());
  return auth;
}

export function getFirebaseClientFirestore() {
  firestore ??= getFirestore(getFirebaseClientApp());
  return firestore;
}
