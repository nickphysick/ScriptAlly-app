/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase config is environment-driven (.env.production / .env.development), so dev builds
// can target a separate Firebase project without ever touching production data. The production
// values mirror firebase-applet-config.json exactly — that file remains on disk as reference
// but is no longer imported.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? "",
};

// Initialize the Firebase app
const app = initializeApp(firebaseConfig);

// Non-prod safety beacon: make the active backend obvious at a glance, so "which project am I on?"
// is never a guessing game again. Production builds (import.meta.env.PROD) stay silent.
if (!import.meta.env.PROD) {
  console.info(`[ScriptAlly] backend project: ${firebaseConfig.projectId} (mode=${import.meta.env.MODE}) — NON-PROD`);
}

// Firestore database id. Production uses a NAMED database (ai-studio-…, CRITICAL — the default
// database would be a different, empty store). A dev project typically uses the default
// database: leave VITE_FIREBASE_DATABASE_ID empty or "(default)" and getFirestore is called
// without an id.
const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID;
export const db =
  !databaseId || databaseId === "(default)"
    ? getFirestore(app)
    : getFirestore(app, databaseId);

// Initialize Firebase Authentication (bound to this app instance explicitly)
export const auth = getAuth(app);

// Error Handling Infrastructure as per Skill Requirements
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  // Diagnostic record WITHOUT user PII. The previous version gathered the full auth context
  // (uid, email, emailVerified, provider emails) and both logged it and threw it as the Error
  // message — leaking PII into the browser console and into error strings that propagate to the
  // UI/telemetry. Keep only what actually helps debugging: the operation, path, and the
  // underlying message. Still throws (callers depend on this for control flow).
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
  };
  console.error(`Firestore error [${errInfo.operationType}]${path ? ` ${path}` : ""}: ${errInfo.error}`);
  throw new Error(`Firestore ${errInfo.operationType} failed${path ? ` at ${path}` : ""}: ${errInfo.error}`);
}
