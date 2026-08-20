/**
 * DOCUMENT-LEVEL READS FOR THE HARNESS ACCOUNT, alongside the browser.
 *
 * ⚠️ "THE ROWS REAPPEARED" IS NOT A RESTORATION. A timeline redraws from derived state, so an undo
 * that wrote back a document with a different note, a different date or a missing twin would look
 * identical on the page. The only honest assertion is on the DOCUMENTS — both stores, plus the
 * derived fields on the query itself, which must recompute back to exactly what they were.
 *
 * Playwright tests run in Node, so this signs in with the same harness credentials the browser uses
 * and reads Firestore directly. It never writes.
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, getDocs, collection, query as fsQuery, where } from "firebase/firestore";

const env = (file: string): Record<string, string> => Object.fromEntries(
  readFileSync(file, "utf8").split("\n")
    .map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }),
);

let cached: { db: any; uid: string } | null = null;

export async function harnessDb(): Promise<{ db: any; uid: string }> {
  if (cached) return cached;
  const dev = env(".env.development");
  const local = existsSync(".env.local") ? env(".env.local") : {};
  const PROJECT = dev.VITE_FIREBASE_PROJECT_ID;
  if (PROJECT !== "scriptally-dev") throw new Error(`Refusing to read "${PROJECT}".`);
  const password = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
  if (!password) throw new Error("No SA_E2E_PASSWORD in .env.local");

  const app = getApps()[0] ?? initializeApp({
    apiKey: dev.VITE_FIREBASE_API_KEY,
    authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: PROJECT,
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

/** Everything a correction can touch on one query, in a form two snapshots can be compared with. */
export interface QuerySnapshot {
  query: Record<string, unknown>;
  /** The authoritative per-query log, by document id. */
  log: Record<string, Record<string, unknown>>;
  /** The global-feed twins for that query, by document id. */
  feed: Record<string, Record<string, unknown>>;
}

export async function snapshotQuery(queryId: string): Promise<QuerySnapshot> {
  const { db, uid } = await harnessDb();
  const q = await getDoc(doc(db, "users", uid, "queries", queryId));
  const log: Record<string, Record<string, unknown>> = {};
  (await getDocs(collection(db, "users", uid, "queries", queryId, "activity")))
    .forEach((d) => { log[d.id] = d.data() as Record<string, unknown>; });
  const feed: Record<string, Record<string, unknown>> = {};
  (await getDocs(fsQuery(collection(db, "users", uid, "activities"), where("queryId", "==", queryId))))
    .forEach((d) => { feed[d.id] = d.data() as Record<string, unknown>; });
  return { query: (q.data() ?? {}) as Record<string, unknown>, log, feed };
}

/**
 * ⚠️ STABLE STRINGIFY, because key order is not part of the fact. Firestore hands fields back in
 * whatever order it likes, and a comparison that treated that as a difference would fail an undo
 * that had restored perfectly.
 */
export const stable = (v: unknown): string => {
  const walk = (x: any): any => {
    if (x === null || typeof x !== "object") return x;
    if (Array.isArray(x)) return x.map(walk);
    return Object.keys(x).sort().reduce((o: any, k) => { o[k] = walk(x[k]); return o; }, {});
  };
  return JSON.stringify(walk(v));
};
