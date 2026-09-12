/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SEED THE DUE DATES THE HARNESS ACCOUNT DOES NOT HOLD — a task due today, one four days ahead, one
 * twelve days ahead — and hold the stored list view so a measurement can put it back.
 *
 * ⚠️ WHY IT EXISTS: THE ACCOUNT IS A MONOCULTURE FOR DUE DATES. Its two dated tasks are both in the
 * past, so every dated row on the list is overdue. The "Due today" and "N days to go" branches — and
 * the When grouping's "Due this week" and "Coming up" — would never be entered, and a green about
 * them would prove nothing. This writes the SAME document the composer writes (a dated user task),
 * under FIXED ids, and `--clean` removes exactly those ids and nothing else.
 *
 * ⚠️ AND THE VIEW HELPERS EXIST BECAUSE A MEASUREMENT THAT WRITES MUST RESTORE IN THE SAME RUN. A head
 * click writes `todoPrefs.listView` — the harness account's stored view, which thirty-odd other
 * suites depend on. `readListView` takes the exact stored object before; `restoreListView` writes it
 * back after, or deletes the key where there was none.
 *
 *   node tests/e2e/seedDueDates.mjs          # seed
 *   node tests/e2e/seedDueDates.mjs --clean  # remove exactly what it seeded
 * or from a spec:  seedDueDates() · cleanDueDates() · readListView() · restoreListView(v)
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, deleteDoc, updateDoc, deleteField } from "firebase/firestore";

const env = (file) => Object.fromEntries(
  readFileSync(file, "utf8").split("\n")
    .map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }),
);

/** the three seeds — fixed ids, so the clean can only ever delete these */
export const DUE_SEEDS = [
  { id: "seed-due-today", days: 0, text: "Due probe · due today" },
  { id: "seed-due-ahead4", days: 4, text: "Due probe · four days ahead" },
  { id: "seed-due-ahead12", days: 12, text: "Due probe · twelve days ahead" },
];

/** a local calendar day `days` from today — the same local reading the app's `dueDate` takes */
export const localDay = (days) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * ⚠️ ONE SIGN-IN PER PROCESS, AND THIS IS NOT AN OPTIMISATION. Every exported helper needs the
 * account, and the first form of this signed in inside each of them — four password verifications
 * per measurement run. Six mutation runs later Firebase answered `auth/quota-exceeded`, the SDK
 * carried on unauthenticated, and the writes came back PERMISSION_DENIED: two runs measured nothing
 * and reported it as "nothing went red", which reads exactly like a check that cannot fail.
 */
let session = null;
async function connect() {
  if (session) return session;
  const dev = env(".env.development");
  const local = existsSync(".env.local") ? env(".env.local") : {};
  const PROJECT = dev.VITE_FIREBASE_PROJECT_ID;
  /* ⚠️ THE SAME REFUSAL EVERY SEEDER MAKES — a write pointed at prod by a stray env is not a thing
     to find out about afterwards */
  if (PROJECT !== "scriptally-dev") throw new Error(`Refusing to touch "${PROJECT}" — scriptally-dev only.`);
  const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
  if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");
  const app = initializeApp({
    apiKey: dev.VITE_FIREBASE_API_KEY,
    authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: PROJECT,
    storageBucket: dev.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: dev.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: dev.VITE_FIREBASE_APP_ID,
  }, `due-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const dbId = dev.VITE_FIREBASE_DATABASE_ID;
  const db = !dbId || dbId === "(default)" ? getFirestore(app) : getFirestore(app, dbId);
  const { user } = await signInWithEmailAndPassword(
    getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", PASSWORD);
  session = { db, uid: user.uid };
  return session;
}

/** @returns {Promise<{ id: string, dueDate: string }[]>} what was written */
export async function seedDueDates() {
  const { db, uid } = await connect();
  /* ⚠️ A LEFTOVER IS DELETED BEFORE IT IS WRITTEN, because `setDoc` over an existing document is an
     UPDATE — and the update rule's allowlist does not admit `createdAt`, which this writes fresh
     every time. So one run that failed to clean up would have denied every run after it, for a
     reason that names neither the leftover nor the rule. */
  await cleanDueDates();
  const now = new Date().toISOString();
  const out = [];
  for (const s of DUE_SEEDS) {
    const dueDate = localDay(s.days);
    await setDoc(doc(db, "users", uid, "tasks", s.id),
      { id: s.id, userId: uid, text: s.text, done: false, createdAt: now, updatedAt: now, dueDate });
    out.push({ id: s.id, dueDate });
  }
  return out;
}

/** @returns {Promise<string[]>} the ids removed — only ever the three seeds */
export async function cleanDueDates() {
  const { db, uid } = await connect();
  const gone = [];
  for (const s of DUE_SEEDS) {
    const ref = doc(db, "users", uid, "tasks", s.id);
    if ((await getDoc(ref)).exists()) { await deleteDoc(ref); gone.push(s.id); }
  }
  return gone;
}

/** the stored list view exactly as it is, or null where the account has none */
export async function readListView() {
  const { db, uid } = await connect();
  const snap = await getDoc(doc(db, "users", uid));
  const v = snap.data()?.todoPrefs?.listView;
  return v === undefined ? null : v;
}

/** write the view back exactly — or delete the key, where there was none to begin with */
export async function restoreListView(v) {
  const { db, uid } = await connect();
  await updateDoc(doc(db, "users", uid), { "todoPrefs.listView": v == null ? deleteField() : v });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const clean = process.argv.includes("--clean");
  const res = clean ? await cleanDueDates() : await seedDueDates();
  console.log(clean ? `cleaned ${res.length}: ${res.join(", ")}` : res.map((r) => `  ${r.id} → ${r.dueDate}`).join("\n"));
  process.exit(0);
}
