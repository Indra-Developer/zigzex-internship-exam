import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App | undefined;
let auth: Auth | undefined;
let firestore: Firestore | undefined;

function readEnvironmentValue(name: string) {
  const value = process.env[name]?.trim();
  if (!value) return undefined;

  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }

  return value;
}

function getAdminApp() {
  if (!app) {
    const projectId = readEnvironmentValue("FIREBASE_PROJECT_ID");
    const clientEmail = readEnvironmentValue("FIREBASE_CLIENT_EMAIL");
    const privateKey = readEnvironmentValue("FIREBASE_PRIVATE_KEY")?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "Firebase Admin configuration is missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.",
      );
    }

    if (!privateKey.includes("-----BEGIN PRIVATE KEY-----") || !privateKey.includes("-----END PRIVATE KEY-----")) {
      throw new Error("FIREBASE_PRIVATE_KEY is invalid. Paste the complete service-account private key.");
    }

    app =
      getApps()[0] ??
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
  }
  return app;
}

export function getFirebaseAdminAuth() {
  auth ??= getAuth(getAdminApp());
  return auth;
}

export function getFirebaseAdminFirestore() {
  firestore ??= getFirestore(getAdminApp());
  return firestore;
}
