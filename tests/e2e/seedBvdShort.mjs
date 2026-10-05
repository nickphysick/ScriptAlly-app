/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ONE SHORT RUNNING BAR for the Birds-eye drawer (Query Centre v126.2.1, QC126-2.9).
 *
 * ⚠️ WHY THIS EXISTS. The rule "a running bar's sentence that sits after the bar carries its
 * distance" has no subject on the shared account: measured at 1101 and 1512 across 6W / 3M / 6M,
 * every dated running bar is 212px or wider, so its sentence always fits inside and the branch is
 * never entered. A lock over that fixture passes on nothing. This seeds the one case — an agency
 * stating a two-week window, queried three days ago — so the bar is ~70px at 6M and ~147px at 3M.
 *
 * ⚠️ SELF-CLEANING, AND THE LOCK THAT USES IT CLEANS IN THE SAME RUN. Every document carries the
 * `bvds-` prefix and a deterministic id; `--clean` removes them, the query's own activity log first
 * (deleting a document does not delete its subcollection).
 *
 *   node tests/e2e/seedBvdShort.mjs           # write it
 *   node tests/e2e/seedBvdShort.mjs --clean   # remove it
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
const PREFIX = "bvds-";
const DAY = 86_400_000;
const iso = (daysAgo) => new Date(Date.now() - daysAgo * DAY).toISOString();

async function wipe() {
  let gone = 0;
  for (const d of (await getDocs(collection(db, "users", uid, "queries"))).docs) {
    if (!d.id.includes(PREFIX)) continue;
    for (const a of (await getDocs(collection(db, "users", uid, "queries", d.id, "activity"))).docs) { await deleteDoc(a.ref); gone++; }
  }
  for (const coll of ["queries", "agents", "taskFlags", "activities", "tasks"]) {
    for (const d of (await getDocs(collection(db, "users", uid, coll))).docs) if (d.id.includes(PREFIX)) { await deleteDoc(d.ref); gone++; }
  }
  return gone;
}

if (process.argv.includes("--clean")) { console.log(`bvds: removed ${await wipe()}`); process.exit(0); }
await wipe();
const AG = `${PREFIX}ag`, Q = `${PREFIX}q`, MS = "seed-ms-1", SENT = 3;
const b = writeBatch(db);
b.set(doc(db, "users", uid, "agents", AG), {
  id: AG, userId: uid, name: "Selma Brisk", agency: "Brisk & Short", email: `${AG}@example.test`,
  website: "", genres: ["Literary Fiction"], notes: "", agentNotes: "", mswlNotes: "", twitter: "", bluesky: "", instagram: "", socials: [],
  city: "London", country: "GB", submissionStatus: "Open", submissionMethod: "Email", responseTimeWeeks: 2,
  starRating: 4, noResponseMeansNo: false, setAside: false, importedNeedsReview: false, materialsWanted: ["Query letter"],
  dateAdded: iso(30), lastCheckedDate: iso(5),
});
b.set(doc(db, "users", uid, "queries", Q), {
  id: Q, userId: uid, agentId: AG, manuscriptId: MS, dateSent: iso(SENT), status: "Queried", sendMethod: "Email",
  responseDeadline: iso(SENT - 14), personalisationNotes: "", packageId: "", materialsWanted: ["Query letter"],
});
const act = `${PREFIX}act-sent`;
b.set(doc(db, "users", uid, "activities", act), { id: act, userId: uid, queryId: Q, manuscriptId: MS, activityType: "Query Sent", description: "Query sent to Selma Brisk at Brisk & Short", date: iso(SENT), details: "Sent via Email", resultingStatus: "Queried" });
b.set(doc(db, "users", uid, "queries", Q, "activity", act), { type: "Queried", resultingStatus: "Queried", createdAt: new Date(iso(SENT)), note: "Query sent to Selma Brisk at Brisk & Short", queryId: Q, agentName: "Selma Brisk", manuscriptTitle: "seed" });
await b.commit();
console.log("bvds: seeded");
process.exit(0);
