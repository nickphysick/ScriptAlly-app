/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import { EMULATOR_HOSTS, emulatorTargetError } from "./firebaseTarget";

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
/* ⚠️ EXPORTED SO APP CHECK CAN ATTACH TO THE SAME APP. One Firebase app, not two — a second
   `initializeApp` would give App Check a different instance from the one Auth and Firestore use,
   and its tokens would be minted for an app the backend is not checking. Additive: every existing
   consumer imports `db` or `auth` and is untouched. */
export const app = initializeApp(firebaseConfig);

// Non-prod safety beacon: make the active backend obvious at a glance, so "which project am I on?"
// is never a guessing game again. Production builds (import.meta.env.PROD) stay silent.
if (!import.meta.env.PROD) {
  console.info(`[QueryHawk] backend project: ${firebaseConfig.projectId} (mode=${import.meta.env.MODE}) — NON-PROD`);
}

// Firestore database id. Production uses a NAMED database (ai-studio-…, CRITICAL — the default
// database would be a different, empty store). A dev project typically uses the default
// database: leave VITE_FIREBASE_DATABASE_ID empty or "(default)".
const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID;

/* ⚠️ REFUSED BEFORE ANY SDK IS CREATED: an emulator build naming a real project. */
const targetError = emulatorTargetError(import.meta.env);
if (targetError) throw new Error(`[QueryHawk] ${targetError}`);
/* Read inline (not via usesEmulators) so Vite folds it to a constant and a production bundle drops
   the emulator branch entirely. firebaseTarget.test.ts holds the two readings equal. */
const emulated = import.meta.env.VITE_USE_EMULATORS === "true";

/**
 * ⚠️ THE PERSISTENT CACHE IS WHAT MAKES A RELOAD CHEAP. Without it every reload re-read every
 * document the listeners cover (~660 for a seeded account); with it a reload asks the server only
 * for what changed since the cached snapshot. Loading still waits for the server where it must:
 * `snapshotIsLoaded` in db.tsx refuses an EMPTY cached snapshot, and a cached snapshot with
 * documents is real data. IndexedDB is absent in Node (the unit suites import this file), where
 * the memory cache is the only honest choice.
 */
const localCache =
  typeof indexedDB !== "undefined"
    ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    : memoryLocalCache();
export const db =
  !databaseId || databaseId === "(default)"
    ? initializeFirestore(app, { localCache })
    : initializeFirestore(app, { localCache }, databaseId);

// Initialize Firebase Authentication (bound to this app instance explicitly)
export const auth = getAuth(app);

/* Local work against the emulators (`npm run dev:emu`, `npm run e2e:emu`). Storage's instance is
   the cached one every later `getStorage(app)` returns, so connecting it here covers them all. */
if (emulated) {
  connectFirestoreEmulator(db, EMULATOR_HOSTS.firestore.host, EMULATOR_HOSTS.firestore.port);
  connectAuthEmulator(auth, EMULATOR_HOSTS.auth, { disableWarnings: true });
  connectStorageEmulator(getStorage(app), EMULATOR_HOSTS.storage.host, EMULATOR_HOSTS.storage.port);
}

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
