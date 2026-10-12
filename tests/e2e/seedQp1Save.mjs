/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ONE QUERY FOR THE SAVE LOCK (Query panel v1, QP1 P13): a Queried query of its own, so recording a response
 * through the panel changes nothing another lock reads.
 *
 * Every document carries the `qp1s-` prefix. `--clean` removes them (the query's activity log first).
 * `--dump` prints the query document and its two logs, sorted, for a before-and-after comparison.
 *
 *   node tests/e2e/seedQp1Save.mjs           # write it
 *   node tests/e2e/seedQp1Save.mjs --dump    # print its state
 *   node tests/e2e/seedQp1Save.mjs --clean   # remove it
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
const PREFIX = "qp1s-";
const DAY = 86_400_000;
const AG = `${PREFIX}ag`, Q = `${PREFIX}q`, MS = "seed-ms-1", SENT = 5;
/* fixed to the day, so a re-seed inside one run writes the same documents */
const day0 = new Date(); day0.setHours(12, 0, 0, 0);
const iso = (daysAgo) => new Date(day0.getTime() - daysAgo * DAY).toISOString();

async function wipe() {
  let gone = 0;
  for (const d of (await getDocs(collection(db, "users", uid, "queries"))).docs) {
    if (!d.id.includes(PREFIX)) continue;
    for (const a of (await getDocs(collection(db, "users", uid, "queries", d.id, "activity"))).docs) { await deleteDoc(a.ref); gone++; }
  }
  for (const coll of ["queries", "agents", "taskFlags", "activities", "tasks"]) {
    for (const d of (await getDocs(collection(db, "users", uid, coll))).docs) if (d.id.includes(PREFIX) || d.data()?.queryId === Q || d.data()?.relatedRecordId === Q) { await deleteDoc(d.ref); gone++; }
  }
  return gone;
}
const plain = (v) => JSON.parse(JSON.stringify(v, (k, x) => (x && typeof x === "object" && typeof x.toDate === "function" ? x.toDate().toISOString() : x)));
async function dump() {
  const q = (await getDocs(collection(db, "users", uid, "queries"))).docs.find((d) => d.id === Q);
  const log = (await getDocs(collection(db, "users", uid, "queries", Q, "activity"))).docs.map((d) => ({ id: d.id, ...plain(d.data()) })).sort((a, b) => a.id.localeCompare(b.id));
  const feed = (await getDocs(collection(db, "users", uid, "activities"))).docs.filter((d) => d.data().queryId === Q).map((d) => ({ id: d.id, ...plain(d.data()) })).sort((a, b) => a.id.localeCompare(b.id));
  const flags = (await getDocs(collection(db, "users", uid, "taskFlags"))).docs.filter((d) => d.id.includes(Q) || d.data()?.relatedRecordId === Q).map((d) => d.id).sort();
  return { query: q ? plain(q.data()) : null, log, feed, flags };
}

if (process.argv.includes("--dump")) { console.log(JSON.stringify(await dump())); process.exit(0); }
if (process.argv.includes("--clean")) { console.log(`qp1s: removed ${await wipe()}`); process.exit(0); }
await wipe();
const b = writeBatch(db);
b.set(doc(db, "users", uid, "agents", AG), {
  id: AG, userId: uid, name: "Petra Nwosu", agency: "Nwosu & Hale", email: `${AG}@example.test`,
  website: "", genres: ["Literary Fiction"], notes: "", agentNotes: "", mswlNotes: "", twitter: "", bluesky: "", instagram: "", socials: [],
  city: "London", country: "GB", submissionStatus: "Open", submissionMethod: "Email", responseTimeWeeks: 8,
  starRating: 4, noResponseMeansNo: false, setAside: false, importedNeedsReview: false, materialsWanted: ["Query letter"],
  dateAdded: iso(30), lastCheckedDate: iso(5),
});
b.set(doc(db, "users", uid, "queries", Q), {
  id: Q, userId: uid, agentId: AG, manuscriptId: MS, dateSent: iso(SENT), status: "Queried", sendMethod: "Email",
  /* ⚠️ NO `responseDeadline`: it is a retired stored field. The app's expected-date migration drops an
     agency-derived one on load, so a fixture that writes it loses it the moment the page opens — which P13 first
     read as the delete-entry flow failing to put it back. */
  personalisationNotes: "", packageId: "", materialsWanted: ["Query letter"],
});
const act = `${PREFIX}act-sent`;
b.set(doc(db, "users", uid, "activities", act), { id: act, userId: uid, queryId: Q, manuscriptId: MS, activityType: "Query Sent", description: "Query sent to Petra Nwosu at Nwosu & Hale", date: iso(SENT), details: "Sent via Email", resultingStatus: "Queried" });
b.set(doc(db, "users", uid, "queries", Q, "activity", act), { type: "Queried", resultingStatus: "Queried", createdAt: new Date(iso(SENT)), note: "Query sent to Petra Nwosu at Nwosu & Hale", queryId: Q, agentName: "Petra Nwosu", manuscriptTitle: "seed" });
await b.commit();
console.log("qp1s: seeded");
process.exit(0);
