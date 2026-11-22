/**
 * QC149-L10's own query: a partial request sent forty days ago and asked for twenty days ago, recorded as the Standard UK
 * package. ⚠️ IT EXISTS BECAUSE THE SHARED FIXTURES SIT AT THE RULES' CEILING: a query document holding ~24 fields can
 * no longer take a package correction (the rules validate every stored field on each write and run out of budget —
 * measured 24 Oct, reported in reports/qc-v149/REPORT.md). This one holds sixteen, so the lock measures the card rather
 * than how full the shared account happens to be. Deterministic ids under `qc149l10-`; `--clean` removes the query, its
 * own log (a deleted document keeps its subcollection), its feed rows, flags and tasks, and its agent.
 *
 *   node tests/e2e/seedQc149L10.mjs          # seed (replaces any earlier copy)
 *   node tests/e2e/seedQc149L10.mjs --clean  # remove it
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
const PREFIX = "qc149l10-";
const DAY = 86_400_000;
const iso = (daysAgo) => new Date(Date.now() - daysAgo * DAY).toISOString();

async function wipe() {
  let gone = 0;
  for (const d of (await getDocs(collection(db, "users", uid, "queries"))).docs) {
    if (!d.id.includes(PREFIX)) continue;
    for (const a of (await getDocs(collection(db, "users", uid, "queries", d.id, "activity"))).docs) { await deleteDoc(a.ref); gone++; }
  }
  for (const coll of ["queries", "agents", "taskFlags", "activities", "tasks", "dismissedTasks", "journalEntries"]) {
    for (const d of (await getDocs(collection(db, "users", uid, coll))).docs) {
      const x = d.data();
      if (d.id.includes(PREFIX) || String(x.queryId ?? "").includes(PREFIX) || String(x.relatedRecordId ?? "").includes(PREFIX)) { await deleteDoc(d.ref); gone++; }
    }
  }
  return gone;
}

if (process.argv.includes("--clean")) { console.log(`qc149l10: removed ${await wipe()}`); process.exit(0); }
await wipe();
const AG = `${PREFIX}ag`, Q = `${PREFIX}q`, MS = "seed-ms-1", SENT = 40, REQ = 20;
const b = writeBatch(db);
b.set(doc(db, "users", uid, "agents", AG), {
  id: AG, userId: uid, name: "Ida Lindqvist", agency: "Lindqvist Literary", email: `${AG}@example.test`,
  website: "", genres: ["Literary Fiction"], notes: "", agentNotes: "", mswlNotes: "", twitter: "", bluesky: "", instagram: "", socials: [],
  city: "London", country: "GB", submissionStatus: "Open", submissionMethod: "Email", responseTimeWeeks: 8,
  starRating: 4, noResponseMeansNo: false, setAside: false, importedNeedsReview: false, materialsWanted: ["Query letter"],
  dateAdded: iso(60), lastCheckedDate: iso(5),
});
b.set(doc(db, "users", uid, "queries", Q), {
  id: Q, userId: uid, agentId: AG, manuscriptId: MS, dateSent: iso(SENT).slice(0, 10), status: "Partial Requested", sendMethod: "Email",
  partialRequestedDate: iso(REQ), lastStatusChange: iso(REQ), hasAgentResponded: true, personalisationNotes: "",
  packageId: "seed-pkg-1", sentHow: "package", sentPackageId: "seed-pkg-1", sentPackageEdition: 1, sentPackageName: "Standard UK",
});
const steps = [
  { id: `act-status-queried-${Q}`, type: "Query Sent", status: "Queried", key: "query_sent", at: iso(SENT), note: "Query sent to Ida Lindqvist at Lindqvist Literary" },
  { id: `act-status-partial-requested-${Q}`, type: "Status Changed", status: "Partial Requested", key: "partial_requested", at: iso(REQ), note: "Ida Lindqvist asked for a partial" },
];
for (const s of steps) {
  b.set(doc(db, "users", uid, "activities", s.id), { id: s.id, userId: uid, queryId: Q, manuscriptId: MS, activityType: s.type, description: s.note, date: s.at, details: "", resultingStatus: s.status, eventKey: s.key });
  b.set(doc(db, "users", uid, "queries", Q, "activity", s.id), { type: s.status, resultingStatus: s.status, createdAt: new Date(s.at), note: s.note, queryId: Q, eventKey: s.key });
}
await b.commit();
console.log("qc149l10: seeded", Q);
process.exit(0);
