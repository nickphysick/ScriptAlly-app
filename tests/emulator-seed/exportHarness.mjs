/**
 * ONE-OFF: copy the harness account from LIVE scriptally-dev into `harness.json`, the emulator's seed.
 *
 * ⚠️ THIS IS THE ONLY SCRIPT THAT IS MEANT TO READ LIVE FIRESTORE, and it reads every document in the
 * account exactly once (~800 reads, about a third of a penny). Run it only when the committed seed has
 * to be refreshed from dev on purpose:
 *
 *   ALLOW_LIVE_FIRESTORE=1 node tests/emulator-seed/exportHarness.mjs
 *
 * The password is never written to the file; the seeder takes it from .env.local at seed time.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, doc, getDoc, getDocs, Timestamp } from "firebase/firestore";
import { targetEnv, harnessPassword, DEV_PROJECT, ROOT } from "../e2e/fsTarget.mjs";

const dev = targetEnv();
if (dev.VITE_FIREBASE_PROJECT_ID !== DEV_PROJECT) throw new Error("exportHarness reads the live dev project; run it with ALLOW_LIVE_FIRESTORE=1.");
const EMAIL = process.env.SA_E2E_EMAIL ?? "harness@scriptally.test";
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID }, "export-harness");
const { user } = await signInWithEmailAndPassword(getAuth(app), EMAIL, harnessPassword());
const db = getFirestore(app);
const uid = user.uid;

/** Firestore values → JSON, with Timestamps tagged so the seeder can restore them exactly. */
const enc = (v) => {
  if (v instanceof Timestamp) return { __ts: [v.seconds, v.nanoseconds] };
  if (Array.isArray(v)) return v.map(enc);
  if (v && typeof v === "object") {
    if (typeof v.path === "string" && typeof v.firestore === "object") throw new Error(`DocumentReference at ${v.path}: not supported by the seed format`);
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)]));
  }
  return v;
};

const docs = {};
let reads = 0;
const put = (path, data) => { docs[path] = enc(data); };
const readCol = async (path) => {
  const snap = await getDocs(collection(db, path));
  reads += Math.max(1, snap.size);
  snap.forEach((d) => put(`${path}/${d.id}`, d.data()));
  return snap.docs.map((d) => d.id);
};

const u = await getDoc(doc(db, "users", uid)); reads++;
if (u.exists()) put(`users/${uid}`, u.data());
const ent = await getDoc(doc(db, "users", uid, "private", "entitlement")); reads++;
if (ent.exists()) put(`users/${uid}/private/entitlement`, ent.data());
for (const c of ["manuscripts", "versions", "attachments", "packages", "activities", "journalEntries", "notes", "tasks", "dismissedTasks", "taskFlags", "scoutDecisions", "scoutShares"]) {
  await readCol(`users/${uid}/${c}`);
}
for (const id of await readCol(`users/${uid}/agents`)) await readCol(`users/${uid}/agents/${id}/notes`);
for (const id of await readCol(`users/${uid}/queries`)) await readCol(`users/${uid}/queries/${id}/activity`);
await readCol("communityAgents");

const out = resolve(ROOT, "tests/emulator-seed/harness.json");
writeFileSync(out, JSON.stringify({ exportedFrom: DEV_PROJECT, exportedAt: new Date().toISOString(), uid, email: EMAIL, docs }, null, 0) + "\n");
console.log(`wrote ${Object.keys(docs).length} documents (${reads} billed reads) to ${out}`);
process.exit(0);
