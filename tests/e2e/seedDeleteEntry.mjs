/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ONE CLEAN QUERY FOR THE DELETE-ENTRY LOCKS (fix-delete-entry, D1 and D2), on a manuscript of its own, so an
 * offer recorded on it marks no other query and nothing another lock reads is touched.
 *
 * Every document carries the `fde-` prefix. The query's stored fields are exactly what the app holds for it at
 * rest — the ten fields `recomputeQuery` derives included — so "equal to its starting snapshot" is a fair test.
 *
 *   node tests/e2e/seedDeleteEntry.mjs queried     # a Queried query, nothing else recorded          (D1)
 *   node tests/e2e/seedDeleteEntry.mjs fullreq     # Full Requested, with no send-by date            (D1 · send)
 *   node tests/e2e/seedDeleteEntry.mjs overwrite   # Partial Requested WITH a send-by date           (D2)
 *   node tests/e2e/seedDeleteEntry.mjs --dump      # the query, its log, its feed rows, flags, tasks
 *   node tests/e2e/seedDeleteEntry.mjs --clean     # remove everything
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
const PREFIX = "fde-";
const DAY = 86_400_000;
const AG = `${PREFIX}ag`, Q = `${PREFIX}q`, MS = `${PREFIX}ms`;
const day0 = new Date(); day0.setHours(12, 0, 0, 0);
const at = (daysAgo) => new Date(day0.getTime() - daysAgo * DAY);
const iso = (daysAgo) => at(daysAgo).toISOString();

async function wipe() {
  let gone = 0;
  for (const d of (await getDocs(collection(db, "users", uid, "queries"))).docs) {
    if (!d.id.includes(PREFIX)) continue;
    for (const a of (await getDocs(collection(db, "users", uid, "queries", d.id, "activity"))).docs) { await deleteDoc(a.ref); gone++; }
  }
  for (const coll of ["queries", "agents", "manuscripts", "taskFlags", "activities", "tasks"]) {
    for (const d of (await getDocs(collection(db, "users", uid, coll))).docs) if (d.id.includes(PREFIX) || d.data()?.queryId === Q || d.data()?.relatedRecordId === Q) { await deleteDoc(d.ref); gone++; }
  }
  return gone;
}
const plain = (v) => JSON.parse(JSON.stringify(v, (k, x) => (x && typeof x === "object" && typeof x.toDate === "function" ? x.toDate().toISOString() : x)));
async function dump() {
  const all = (await getDocs(collection(db, "users", uid, "queries"))).docs;
  const q = all.find((d) => d.id === Q);
  const log = (await getDocs(collection(db, "users", uid, "queries", Q, "activity"))).docs.map((d) => ({ id: d.id, ...plain(d.data()) })).sort((a, b) => a.id.localeCompare(b.id));
  const feed = (await getDocs(collection(db, "users", uid, "activities"))).docs.filter((d) => d.data().queryId === Q).map((d) => ({ id: d.id, ...plain(d.data()) })).sort((a, b) => a.id.localeCompare(b.id));
  const flags = (await getDocs(collection(db, "users", uid, "taskFlags"))).docs.filter((d) => d.id.includes(Q) || d.data()?.relatedRecordId === Q).map((d) => d.id).sort();
  const tasks = (await getDocs(collection(db, "users", uid, "tasks"))).docs.filter((d) => d.id.includes(Q) || d.data()?.relatedRecordId === Q || d.data()?.queryId === Q).map((d) => d.id).sort();
  const marked = all.filter((d) => d.data().offerRefQueryId === Q).map((d) => d.id).sort();
  return { query: q ? plain(q.data()) : null, log, feed, flags, tasks, marked };
}

if (process.argv.includes("--dump")) { console.log(JSON.stringify(await dump())); process.exit(0); }
if (process.argv.includes("--clean")) { console.log(`fde: removed ${await wipe()}`); process.exit(0); }
const CASE = process.argv[2];
if (!["queried", "fullreq", "overwrite"].includes(CASE)) throw new Error("say which: queried | fullreq | overwrite");
await wipe();
const b = writeBatch(db);
b.set(doc(db, "users", uid, "manuscripts", MS), {
  id: MS, userId: uid, title: "The Tide Clerk", genre: "Literary Fiction", ageCategory: "Adult", wordCount: 91000,
  logline: "A fixture for the delete-entry locks.", status: "Querying", statusChangedDate: iso(60), comps: [], shelved: false,
});
b.set(doc(db, "users", uid, "agents", AG), {
  id: AG, userId: uid, name: "Idris Kell", agency: "Kell & Marrow", email: `${AG}@example.test`,
  website: "", genres: ["Literary Fiction"], notes: "", agentNotes: "", mswlNotes: "", twitter: "", bluesky: "", instagram: "", socials: [],
  city: "London", country: "GB", submissionStatus: "Open", submissionMethod: "Email", responseTimeWeeks: 8,
  starRating: 4, noResponseMeansNo: false, setAside: false, importedNeedsReview: false, materialsWanted: ["Query letter"],
  dateAdded: iso(30), lastCheckedDate: iso(5),
});
const SENT = 20, REQ = 6;
const requested = CASE === "fullreq" ? "Full Requested" : CASE === "overwrite" ? "Partial Requested" : null;
/* the query at rest: what the journeys and `recomputeQuery` leave on a query in this state */
const q = {
  id: Q, userId: uid, agentId: AG, manuscriptId: MS, dateSent: iso(SENT), status: requested ?? "Queried", sendMethod: "Email",
  personalisationNotes: "", packageId: "", materialsWanted: ["Query letter"],
  revisionRound: 1, hasAgentResponded: !!requested, lastStatusChange: iso(requested ? REQ : SENT),
};
if (requested) { q.responseReceivedAt = iso(REQ); q[CASE === "fullreq" ? "fullRequestedDate" : "partialRequestedDate"] = iso(REQ); }
/* D2's earlier value: the send-by date the FIRST request set, which a second request then writes over */
if (CASE === "overwrite") { q.expectedSendDate = at(-9); q.sendReminderDate = at(-7); }
b.set(doc(db, "users", uid, "queries", Q), q);
const a1 = `${PREFIX}act-sent`;
b.set(doc(db, "users", uid, "activities", a1), { id: a1, userId: uid, queryId: Q, manuscriptId: MS, activityType: "Query Sent", description: "Query sent to Idris Kell at Kell & Marrow", date: iso(SENT), details: "Sent via Email", resultingStatus: "Queried" });
b.set(doc(db, "users", uid, "queries", Q, "activity", a1), { type: "Queried", resultingStatus: "Queried", createdAt: at(SENT), note: "Query sent to Idris Kell at Kell & Marrow", queryId: Q, agentName: "Idris Kell", manuscriptTitle: "The Tide Clerk" });
if (requested) {
  const a2 = `${PREFIX}act-req`;
  b.set(doc(db, "users", uid, "activities", a2), { id: a2, userId: uid, queryId: Q, manuscriptId: MS, activityType: "Status Changed", description: `${requested} by Idris Kell at Kell & Marrow`, date: iso(REQ), details: "", resultingStatus: requested });
  b.set(doc(db, "users", uid, "queries", Q, "activity", a2), { type: requested, resultingStatus: requested, createdAt: at(REQ), note: `${requested} by Idris Kell at Kell & Marrow`, queryId: Q, agentName: "Idris Kell", manuscriptTitle: "The Tide Clerk" });
}
await b.commit();
console.log(`fde: seeded ${CASE}`);
process.exit(0);
