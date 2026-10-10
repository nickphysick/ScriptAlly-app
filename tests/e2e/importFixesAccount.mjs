/**
 * The import-fixes walk's account work (IF1 · U2). Signs in as the dedicated EMPTY fixture account
 * from node, snapshots what it holds, puts it back into set-up, and afterwards removes every
 * document the walk created and proves the counts match the snapshot.
 * The password is read from the environment or .env.local and is never printed.
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection } from "firebase/firestore";
import { EMPTY_EMAIL } from "./ms21Fixture.mjs";

const env = (file) => Object.fromEntries(readFileSync(file, "utf8").split("\n").map((l) => /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(l)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]));
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
const PASSWORD = process.env.SA_E2E_PASSWORD || local.SA_E2E_PASSWORD;
const COLLECTIONS = ["activities", "agents", "manuscripts", "versions", "packages", "queries", "taskFlags", "tasks"];

export const ACCOUNT_EMAIL = EMPTY_EMAIL;

let cached;
export async function session() {
  if (cached) return cached;
  if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in the environment or .env.local");
  if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("refusing: not the dev project");
  const app = initializeApp({
    apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID,
    appId: dev.VITE_FIREBASE_APP_ID,
  }, "import-fixes-walk");
  const { user } = await signInWithEmailAndPassword(getAuth(app), EMPTY_EMAIL, PASSWORD);
  const dbId = dev.VITE_FIREBASE_DATABASE_ID && dev.VITE_FIREBASE_DATABASE_ID !== "(default)" ? dev.VITE_FIREBASE_DATABASE_ID : undefined;
  cached = { db: dbId ? getFirestore(app, dbId) : getFirestore(app), uid: user.uid };
  return cached;
}

/** Every document id the account holds, by collection (query history counted under its query). */
export async function snapshot() {
  const { db, uid } = await session();
  const ids = {}; const counts = {};
  for (const c of COLLECTIONS) {
    const snap = await getDocs(collection(db, "users", uid, c));
    ids[c] = snap.docs.map((d) => d.id).sort();
    counts[c] = ids[c].length;
    if (c === "queries") {
      let n = 0;
      for (const d of snap.docs) n += (await getDocs(collection(db, "users", uid, "queries", d.id, "activity"))).size;
      counts["queries/activity"] = n;
    }
  }
  const user = (await getDoc(doc(db, "users", uid))).data() ?? null;
  return { ids, counts, user };
}

/** Put the account back into set-up, so the next sign-in opens the journey. */
export async function enterSetup() {
  const { db, uid } = await session();
  await updateDoc(doc(db, "users", uid), { onboardingComplete: false });
}

/** What the walk left, read from the store: the queries and the one activity line. */
export async function readImported(before) {
  const { db, uid } = await session();
  const queries = (await getDocs(collection(db, "users", uid, "queries"))).docs.filter((d) => !before.ids.queries.includes(d.id)).map((d) => d.data());
  const lines = (await getDocs(collection(db, "users", uid, "activities"))).docs.filter((d) => !before.ids.activities.includes(d.id)).map((d) => d.data().description);
  // the import's own line; set-up also records that the manuscript was added
  return { queries, lines: lines.filter((l) => / import · /.test(l ?? "")), allLines: lines };
}

/** Remove every document created since `before`, restore the user document, and return the counts. */
export async function restore(before) {
  const { db, uid } = await session();
  for (const c of COLLECTIONS) {
    const snap = await getDocs(collection(db, "users", uid, c));
    for (const d of snap.docs) {
      if (before.ids[c].includes(d.id)) continue;
      if (c === "queries") for (const a of (await getDocs(collection(db, "users", uid, "queries", d.id, "activity"))).docs) await deleteDoc(a.ref);
      await deleteDoc(d.ref);
    }
  }
  if (before.user) await setDoc(doc(db, "users", uid), before.user);
  return (await snapshot()).counts;
}
