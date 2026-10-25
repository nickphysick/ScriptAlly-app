/**
 * Query Centre v149.1 — the QC1491 locks' own fixture. The harness account has no query whose story carries a request,
 * the send that answers it, the agent's own words and an undated step; no manuscript without a word count; no query
 * with nothing dated; no requery; no name in capitals. This writes one of each, under `qc1491-`:
 *
 *   qc1491-ms        "The Paper Orchard", Adult · Book club, word count 0 (the rules require an int: 0 is "none")
 *   qc1491-ag        Sophie Dunn — a wishlist, genres (one the book's), a website, no email, ~8 weeks, open
 *   qc1491-q1        to Sophie for the book: Query sent (email) → Full requested → Full sent → R&R (her words) →
 *                    a nudge with no date. Revise & Resubmit, so it is with the writer.
 *   qc1491-q4        to Sophie for the same book, later, `requery: true`  → the row's RESUBMISSION tag
 *   qc1491-q2        to Sophie for another book (seed-ms-1), passed  → "You and Sophie" lists three
 *   qc1491-ag2/-q3   Wren Ashby, no wishlist: a Partial sent query with nothing dated at all
 *   qc1491-caps / qc1491-mixed   "MARGOT ELLIS" and "Imke de Vries", for the name-case migration (L10)
 *
 * Deterministic ids; `--clean` removes every document under the prefix, each query's own log first (a deleted document
 * keeps its subcollection), then feed rows, flags and tasks that name one of them.
 *
 *   node tests/e2e/seedQc1491.mjs          # seed (replaces any earlier copy)
 *   node tests/e2e/seedQc1491.mjs --clean  # remove it
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDocs, deleteDoc, collection, writeBatch } from "firebase/firestore";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(".env.development"); const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("dev only");
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID });
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD);
const uid = user.uid;
const P = "qc1491-";
const DAY = 86_400_000;
const iso = (daysAgo) => new Date(Date.now() - daysAgo * DAY).toISOString();

async function wipe() {
  let gone = 0;
  for (const d of (await getDocs(collection(db, "users", uid, "queries"))).docs) {
    if (!d.id.startsWith(P)) continue;
    for (const a of (await getDocs(collection(db, "users", uid, "queries", d.id, "activity"))).docs) { await deleteDoc(a.ref); gone++; }
  }
  for (const c of ["queries", "agents", "manuscripts", "activities", "taskFlags", "tasks", "dismissedTasks", "journalEntries"]) {
    for (const d of (await getDocs(collection(db, "users", uid, c))).docs) {
      const x = d.data();
      if (d.id.startsWith(P) || String(x.queryId ?? "").startsWith(P) || String(x.relatedRecordId ?? "").startsWith(P)) { await deleteDoc(d.ref); gone++; }
    }
  }
  return gone;
}
if (process.argv.includes("--clean")) { console.log(`qc1491: removed ${await wipe()}`); process.exit(0); }
await wipe();

const b = writeBatch(db);
const put = (path, data) => b.set(doc(db, "users", uid, ...path), data);
const agent = (id, name, o = {}) => ({
  id, userId: uid, name, agency: "Curtis Vane", email: "", website: "", genres: [], notes: "", agentNotes: "", mswlNotes: "", twitter: "", bluesky: "", instagram: "", socials: [],
  submissionStatus: "Open", submissionMethod: "Email", starRating: 4, noResponseMeansNo: false, setAside: false, importedNeedsReview: false,
  materialsWanted: ["Query letter"], dateAdded: iso(400), lastCheckedDate: iso(40), ...o,
});
put(["manuscripts", `${P}ms`], { id: `${P}ms`, userId: uid, title: "The Paper Orchard", genre: "Book club", ageCategory: "Adult", wordCount: 0, logline: "", status: "Querying", statusChangedDate: "2026-01-01", comps: [], shelved: false });
put(["agents", `${P}ag`], agent(`${P}ag`, "Sophie Dunn", { mswlNotes: "Big-hearted book club fiction with a dark edge.", genres: ["Book club", "Historical"], website: "curtisvane.example", responseTimeWeeks: 8 }));
put(["agents", `${P}ag2`], agent(`${P}ag2`, "Wren Ashby", { agency: "Ashby Literary" }));
put(["agents", `${P}caps`], agent(`${P}caps`, "MARGOT ELLIS", { agency: "Ellis & Co" }));
put(["agents", `${P}mixed`], agent(`${P}mixed`, "Imke de Vries", { agency: "De Vries" }));

const q = (id, o) => ({ id, userId: uid, agentId: `${P}ag`, manuscriptId: `${P}ms`, packageId: "", personalisationNotes: "", sendMethod: "Email", ...o });
const steps = (qid, list) => list.forEach((s, i) => {
  const id = `act-${qid}-${i}`;
  put(["queries", qid, "activity", id], { type: s.type, resultingStatus: s.type, createdAt: s.at, note: s.type, queryId: qid, ...(s.key ? { eventKey: s.key } : {}) });
  if (s.at) put(["activities", id], { id, userId: uid, queryId: qid, manuscriptId: s.ms ?? `${P}ms`, activityType: s.type === "Queried" ? "Query Sent" : "Status Changed", description: s.type, date: s.at, details: "", resultingStatus: s.type, ...(s.key ? { eventKey: s.key } : {}) });
});
put(["queries", `${P}q1`], q(`${P}q1`, { status: "Revise & Resubmit", dateSent: iso(300), fullRequestedDate: iso(260), fullSentDate: iso(250), lastStatusChange: iso(120), responseReceivedAt: iso(120), hasAgentResponded: true, rrNotes: "Loved the voice; the middle third drags. Happy to read again." }));
steps(`${P}q1`, [
  { type: "Queried", at: iso(300), key: "query_sent" }, { type: "Full Requested", at: iso(260), key: "full_requested" },
  { type: "Full Sent", at: iso(250), key: "full_sent" }, { type: "Revise & Resubmit", at: iso(120), key: "rr_requested" },
]);
/* a nudge with no date: the log's own nudge type, createdAt "" (a string the rules accept; it reads as no date) */
put(["queries", `${P}q1`, "activity", `act-${P}q1-nudge`], { type: "Nudge sent", createdAt: "", note: "Nudge sent", queryId: `${P}q1` });
put(["queries", `${P}q4`], q(`${P}q4`, { status: "Queried", dateSent: iso(20), requery: true }));
steps(`${P}q4`, [{ type: "Queried", at: iso(20), key: "query_sent" }]);
put(["queries", `${P}q2`], q(`${P}q2`, { manuscriptId: "seed-ms-1", status: "Rejected", dateSent: iso(600), rejectedDate: iso(560), lastStatusChange: iso(560), hasAgentResponded: true }));
steps(`${P}q2`, [{ type: "Queried", at: iso(600), key: "query_sent", ms: "seed-ms-1" }, { type: "Rejected", at: iso(560), key: "pass", ms: "seed-ms-1" }]);
put(["queries", `${P}q3`], q(`${P}q3`, { agentId: `${P}ag2`, status: "Partial Sent" }));
steps(`${P}q3`, [{ type: "Queried", at: "", key: "query_sent" }, { type: "Partial Sent", at: "", key: "partial_sent" }]);
await b.commit();
console.log("qc1491: seeded");
process.exit(0);
