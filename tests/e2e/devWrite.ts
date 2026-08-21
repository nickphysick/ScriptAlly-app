/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OUT-OF-BAND WRITES FOR MEASUREMENT — from Node, never from the page.
 *
 * ⚠️ A `page.evaluate` CANNOT `import("firebase/firestore")`. The served page is a BUNDLE: bare
 * module specifiers were resolved at build time and do not exist at runtime, so the import throws
 * "Failed to resolve module specifier". That is loud when it is the point of the test and SILENT
 * when it is a cleanup — a restore wrapped in `.catch(() => {})` runs never and says nothing, and
 * the next run's baseline is quietly this run's damage. The measure file already runs in Node, so
 * the SDK belongs here.
 *
 * ⚠️ DEV ONLY, AND IT REFUSES ANYTHING ELSE — same guard and same auth path as rulesProbe.mjs.
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, type Firestore } from "firebase/firestore";

const envFile = (file: string): Record<string, string> => Object.fromEntries(
  readFileSync(file, "utf8").split("\n")
    .map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }),
);

let cached: { db: Firestore; uid: string } | null = null;

export async function devDb(): Promise<{ db: Firestore; uid: string }> {
  if (cached) return cached;
  const dev = envFile(".env.development");
  const local = existsSync(".env.local") ? envFile(".env.local") : {};
  const project = dev.VITE_FIREBASE_PROJECT_ID;
  if (project !== "scriptally-dev") throw new Error(`Refusing to write to "${project}".`);
  const password = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
  if (!password) throw new Error("No SA_E2E_PASSWORD in .env.local");

  const app = getApps()[0] ?? initializeApp({
    apiKey: dev.VITE_FIREBASE_API_KEY,
    authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: project,
    storageBucket: dev.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: dev.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: dev.VITE_FIREBASE_APP_ID,
  });
  const dbId = dev.VITE_FIREBASE_DATABASE_ID;
  const db = !dbId || dbId === "(default)" ? getFirestore(app) : getFirestore(app, dbId);
  const { user } = await signInWithEmailAndPassword(
    getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", password);
  cached = { db, uid: user.uid };
  return cached;
}

/** Read one field off a harness-account document. Returns `undefined` when the doc is absent. */
export async function readField(collection: string, id: string, field: string): Promise<unknown> {
  const { db, uid } = await devDb();
  const snap = await getDoc(doc(db, "users", uid, collection, id));
  return snap.exists() ? snap.data()[field] : undefined;
}

/** Write fields onto a harness-account document. The caller is responsible for putting them back. */
export async function patchDoc(collection: string, id: string, fields: Record<string, unknown>): Promise<void> {
  const { db, uid } = await devDb();
  await updateDoc(doc(db, "users", uid, collection, id), fields);
}

/**
 * Remove a material the harness created.
 *
 * ⚠️ FOR SWEEPING A TEST'S OWN LEFTOVERS, NEVER FOR DRIVING THE FEATURE. A drive that deletes
 * through Firestore proves the rules allow it and nothing about the page; the delete branch is
 * exercised by clicking the bin. This exists so a drive that fails half way does not leave a
 * document behind to poison the next run.
 */
export async function deleteVersionDoc(id: string): Promise<void> {
  const { db, uid } = await devDb();
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(doc(db, "users", uid, "versions", id));
}
