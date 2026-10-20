/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v141.1 — SIX AGENT-COURT QUERIES ON THE NUDGE WINDOW'S EDGES, for QC1411 L2 and L3.
 *
 * ⚠️ WHY THIS EXISTS. The shared account has nothing within a day of either boundary (the reply date, and the end of
 *    the nudge window, 28 days past it), so a lock over it cannot tell `<` from `<=`, or 28 days from 29. These sit on
 *    the edges against a FIXED clock `--t <ms>`, which the lock gives the page too: an agency stating a two-week
 *    window, and a query sent so its expected date is T + 1 day, T, T − 1 day, T − 28 days, T − 28.5 days, T − 29 days.
 * ⚠️ SELF-CLEANING, AND THE LOCK CLEANS IN THE SAME RUN: every document carries the `q1411-` prefix; `--clean` removes
 *    them, each query's own activity log first.
 *
 *   node tests/e2e/seedQc1411.mjs --t 1792000000000   # write them against that clock
 *   node tests/e2e/seedQc1411.mjs --clean             # remove them
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDocs, deleteDoc, collection, writeBatch } from "firebase/firestore";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("dev only");
const EMAIL = process.env.SA_E2E_EMAIL ?? "harness@scriptally.test";
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");

const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID });
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(getAuth(app), EMAIL, PASSWORD);
const uid = user.uid;
const PREFIX = "q1411-";
const DAY = 86_400_000;
const WINDOW_DAYS = 14;

async function wipe() {
  let gone = 0;
  for (const d of (await getDocs(collection(db, "users", uid, "queries"))).docs) {
    if (!d.id.startsWith(PREFIX)) continue;
    for (const a of (await getDocs(collection(db, "users", uid, "queries", d.id, "activity"))).docs) { await deleteDoc(a.ref); gone++; }
  }
  for (const coll of ["queries", "agents", "taskFlags", "activities", "tasks"]) {
    for (const d of (await getDocs(collection(db, "users", uid, coll))).docs) if (d.id.startsWith(PREFIX)) { await deleteDoc(d.ref); gone++; }
  }
  return gone;
}

if (process.argv.includes("--clean")) { console.log(`q1411: removed ${await wipe()}`); process.exit(0); }
const ti = process.argv.indexOf("--t");
const T = ti > 0 ? Number(process.argv[ti + 1]) : NaN;
if (!Number.isFinite(T)) throw new Error("--t <ms> is required: the clock the lock gives the page");
await wipe();

/** [key, days past the expected date (negative: before it), the agent's display name] */
export const EDGES = [["before1", -1, "Ada Before"], ["at0", 0, "Bea Ondate"], ["past1", 1, "Cal Pastone"], ["at28", 28, "Dot Lastday"], ["past28h", 28.5, "Eve Halfover"], ["past29", 29, "Fay Gonequiet"]];
const MS = "seed-ms-1";
const b = writeBatch(db);
const AG = `${PREFIX}ag`;
b.set(doc(db, "users", uid, "agents", AG), {
  id: AG, userId: uid, name: "Edge Agency Desk", agency: "Edge & Window", email: `${AG}@example.test`,
  website: "", genres: ["Literary Fiction"], notes: "", agentNotes: "", mswlNotes: "", twitter: "", bluesky: "", instagram: "", socials: [],
  city: "London", country: "GB", submissionStatus: "Open", submissionMethod: "Email", responseTimeWeeks: WINDOW_DAYS / 7,
  starRating: 3, noResponseMeansNo: false, setAside: false, importedNeedsReview: false, materialsWanted: ["Query letter"],
  dateAdded: new Date(T - 120 * DAY).toISOString(), lastCheckedDate: new Date(T - 5 * DAY).toISOString(),
});
for (const [key, past, name] of EDGES) {
  const Q = `${PREFIX}${key}`;
  const sent = new Date(T - (WINDOW_DAYS + past) * DAY).toISOString();
  b.set(doc(db, "users", uid, "queries", Q), {
    id: Q, userId: uid, agentId: AG, manuscriptId: MS, dateSent: sent, status: "Queried", sendMethod: "Email",
    personalisationNotes: `QC1411 edge: ${past} days past the reply date`, packageId: "", materialsWanted: ["Query letter"],
  });
  const act = `${PREFIX}${key}-sent`;
  b.set(doc(db, "users", uid, "activities", act), { id: act, userId: uid, queryId: Q, manuscriptId: MS, activityType: "Query Sent", description: `Query sent to ${name} at Edge & Window`, date: sent, details: "Sent via Email", resultingStatus: "Queried" });
  b.set(doc(db, "users", uid, "queries", Q, "activity", act), { type: "Queried", resultingStatus: "Queried", createdAt: new Date(sent), note: `Query sent to ${name} at Edge & Window`, queryId: Q, agentName: name, manuscriptTitle: "seed" });
}
await b.commit();
console.log(`q1411: seeded ${EDGES.length} against ${new Date(T).toISOString()}`);
process.exit(0);
