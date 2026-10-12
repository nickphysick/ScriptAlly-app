/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * cbStore — the CB1 locks' own reads and writes of the dev harness account, from the test process.
 *
 * ⚠️ ONE SIGN-IN PER RUN. The first version shelled out to `seedCorkboard.mjs` for every read; each call is a
 *    password sign-in, a run made dozens, and Firebase throttled the account mid-suite — the seeder then
 *    failed and the cases that depended on it died reading as broken locks (the e2e sign-in throttle, met
 *    from a new direction). Here the app is initialised once and every helper reuses it.
 * ⚠️ DEV ONLY, AND LEAF WRITES ONLY: it refuses any project but scriptally-dev, and it writes
 *    `todoPrefs.noteboard` (and its children) by field path, never the `todoPrefs` map other pages share.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { deleteField, doc, getDoc, getFirestore, setDoc, updateDoc, type Firestore } from "firebase/firestore";

const env = (file: string): Record<string, string> => Object.fromEntries(
  readFileSync(file, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }),
);

let ready: Promise<{ app: FirebaseApp; db: Firestore; uid: string }> | null = null;
function store() {
  if (!ready) {
    ready = (async () => {
      const dev = env(".env.development");
      const local = existsSync(".env.local") ? env(".env.local") : {};
      if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error(`Refusing to touch "${dev.VITE_FIREBASE_PROJECT_ID}".`);
      const password = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
      if (!password) throw new Error("No SA_E2E_PASSWORD in .env.local");
      const app = initializeApp({
        apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID,
        storageBucket: dev.VITE_FIREBASE_STORAGE_BUCKET, messagingSenderId: dev.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: dev.VITE_FIREBASE_APP_ID,
      }, `cb-${process.pid}`);
      const id = dev.VITE_FIREBASE_DATABASE_ID;
      const db = !id || id === "(default)" ? getFirestore(app) : getFirestore(app, id);
      const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", password);
      return { app, db, uid: user.uid };
    })();
  }
  return ready;
}

export interface NbPrefs { layout?: Record<string, { x: number; y: number }>; view?: string; order?: string[]; dismissedExamples?: string[] }

/** `todoPrefs.noteboard`, or null when the account has none. */
export async function prefs(): Promise<NbPrefs | null> {
  const { db, uid } = await store();
  return ((await getDoc(doc(db, "users", uid))).data()?.todoPrefs?.noteboard as NbPrefs | undefined) ?? null;
}
/** Record `todoPrefs.noteboard` as it is (absent is recorded as absent). */
export async function snap(file: string): Promise<void> {
  const nb = await prefs();
  writeFileSync(file, JSON.stringify({ present: nb !== null, value: nb }));
}
/** Put `todoPrefs.noteboard` back EXACTLY as the snapshot has it — absent means the key is deleted. */
export async function restore(file: string): Promise<void> {
  const { db, uid } = await store();
  const { present, value } = JSON.parse(readFileSync(file, "utf8")) as { present: boolean; value: NbPrefs | null };
  await updateDoc(doc(db, "users", uid), { "todoPrefs.noteboard": present ? value : deleteField() });
}
/** A lock's arrangement: the whole `layout` map. */
export async function setLayout(layout: Record<string, { x: number; y: number }>): Promise<void> {
  const { db, uid } = await store();
  await updateDoc(doc(db, "users", uid), { "todoPrefs.noteboard.layout": layout });
}
/** One user task document, or null. */
export async function task(id: string): Promise<Record<string, unknown> | null> {
  const { db, uid } = await store();
  const s = await getDoc(doc(db, "users", uid, "tasks", id));
  return s.exists() ? (s.data() as Record<string, unknown>) : null;
}
/** Put one user task document back, whole (a case's own clean-up when its undo did not run). */
export async function putTask(id: string, data: Record<string, unknown>): Promise<void> {
  const { db, uid } = await store();
  await setDoc(doc(db, "users", uid, "tasks", id), data);
}
/** Patch one user task document (a case's own fixture change; it puts the document back itself). */
export async function patchTask(id: string, patch: Record<string, unknown>): Promise<void> {
  const { db, uid } = await store();
  await updateDoc(doc(db, "users", uid, "tasks", id), patch);
}
