/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query card v167 — the cards the ghost-bar, profile-drawer and mid-journey locks read: an agent with Nothing recorded,
 * one with Some, one with Everything (the longest reply time, "About 26 weeks"), a pending request with nothing sent,
 * a second query to the "Some" agent (lock 9: a profile save shows on the other query too), and an offer and a pass
 * (lock 10: their footers' journeys).
 * ⚠️ Emulator only (fsTarget), and SELF-CLEANING: every document carries the `q167-` prefix; `--clean` removes them,
 *    each query's activity log first. The measure cleans in the same run.
 *
 *   node tests/e2e/seedQc167.mjs              # write them
 *   node tests/e2e/seedQc167.mjs --clean      # remove them
 *   node tests/e2e/seedQc167.mjs --agent <k>  # print one agent's profile fields, as JSON (lock 9: written once)
 *   node tests/e2e/seedQc167.mjs --query <k>  # print one query and its activity ids, as JSON (lock 10: nothing written)
 */
import { targetEnv, TARGET_PROJECT } from "./fsTarget.mjs";
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, getDocs, deleteDoc, collection, writeBatch } from "firebase/firestore";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = targetEnv();
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== TARGET_PROJECT) throw new Error("emulator only");
const EMAIL = process.env.SA_E2E_EMAIL ?? "harness@scriptally.test";
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");

const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID });
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(getAuth(app), EMAIL, PASSWORD);
const uid = user.uid;
const PREFIX = "q167-";
const DAY = 86_400_000;
const NOW = Date.now();
const iso = (daysAgo) => new Date(NOW - daysAgo * DAY).toISOString();

async function wipe() {
  let gone = 0;
  for (const d of (await getDocs(collection(db, "users", uid, "queries"))).docs) {
    if (!d.id.startsWith(PREFIX)) continue;
    for (const a of (await getDocs(collection(db, "users", uid, "queries", d.id, "activity"))).docs) { await deleteDoc(a.ref); gone++; }
  }
  for (const coll of ["queries", "agents", "taskFlags", "activities", "tasks", "journalEntries"]) {
    for (const d of (await getDocs(collection(db, "users", uid, coll))).docs) {
      const x = d.data();
      if (d.id.startsWith(PREFIX) || String(x.queryId ?? "").startsWith(PREFIX) || String(x.agentId ?? "").startsWith(PREFIX)) { await deleteDoc(d.ref); gone++; }
    }
  }
  return gone;
}
if (process.argv.includes("--clean")) { console.log(`q167: removed ${await wipe()}`); process.exit(0); }
const ai = process.argv.indexOf("--agent");
if (ai > 0) {
  const a = (await getDoc(doc(db, "users", uid, "agents", `${PREFIX}ag-${process.argv[ai + 1]}`))).data() ?? null;
  const pick = a ? { responseTimeWeeks: a.responseTimeWeeks ?? null, noResponseMeansNo: a.noResponseMeansNo ?? null, submissionMethod: a.submissionMethod ?? null, materialsWanted: a.materialsWanted ?? null, updatedAt: a.updatedAt ?? null } : null;
  console.log(JSON.stringify(pick));
  process.exit(0);
}
const qi = process.argv.indexOf("--query");
if (qi > 0) {
  const Q = `${PREFIX}${process.argv[qi + 1]}`;
  const q = (await getDoc(doc(db, "users", uid, "queries", Q))).data() ?? null;
  const log = (await getDocs(collection(db, "users", uid, "queries", Q, "activity"))).docs.map((d) => d.id).sort();
  console.log(JSON.stringify({ status: q?.status ?? null, log }));
  process.exit(0);
}
await wipe();

/* [key, first name, agent profile, query status, materials sent with the query, a note] */
const NONE = { materialsWanted: [] };
const SOME = { responseTimeWeeks: 8, submissionMethod: "Email", materialsWanted: [] };
const ALL = { responseTimeWeeks: 26, noResponseMeansNo: true, submissionMethod: "Online Form", materialsWanted: ["Query letter", "Synopsis (2 pages)", "First 3 chapters", "A one-page CV"] };
const FIXTURES = [
  ["nothing", "Nell", NONE, "Queried", null, null, "nothing"],
  ["pending", "Pip", NONE, "Partial Requested", null, null, "pending"],
  ["some", "Sami", SOME, "Queried", [{ kind: "letter" }], null, "some"],
  ["some2", "Sami", SOME, "Queried", [{ kind: "letter" }], null, "some"],
  ["everything", "Evie", ALL, "Queried", [{ kind: "letter" }, { kind: "synopsis" }, { kind: "sample", unit: "chapters", n: 3 }], "Met Evie at the Bath festival.", "everything"],
  /* lock 10's other footers: an offer (Answer an offer) and a pass (Reopen) */
  ["offer", "Ola", SOME, "Offer", [{ kind: "letter" }], null, "offer"],
  ["passed", "Pat", SOME, "Rejected", [{ kind: "letter" }], null, "passed"],
];
const seen = new Set();
for (const [key, first, prof, status, mats, note, agentKey] of FIXTURES) {
  const b = writeBatch(db);
  const AG = `${PREFIX}ag-${agentKey}`, Q = `${PREFIX}${key}`;
  const name = `${first} Lark`;
  if (!seen.has(AG)) {
    seen.add(AG);
    b.set(doc(db, "users", uid, "agents", AG), {
      id: AG, userId: uid, name, agency: "Lark & Field", email: `${AG}@example.test`,
      website: "", genres: ["Literary Fiction"], notes: "", agentNotes: "", mswlNotes: "", twitter: "", bluesky: "", instagram: "", socials: [],
      city: "London", country: "GB", submissionStatus: "Open", submissionMethod: "", starRating: 3, setAside: false, importedNeedsReview: false,
      dateAdded: iso(200), lastCheckedDate: iso(5), ...prof,
    });
  }
  const sentAgo = key === "some2" ? 20 : 30;
  const q = { id: Q, userId: uid, agentId: AG, manuscriptId: "seed-ms-1", dateSent: iso(sentAgo), status, sendMethod: "Email",
    personalisationNotes: `QC167 fixture: ${key}`, packageId: "", materialsWanted: [] };
  const steps = [["sent", "Queried", "Query Sent", sentAgo, mats]];
  if (status === "Partial Requested") { steps.push(["preq", "Partial Requested", "Status Changed", 4, null]); q.expectedSendDate = iso(-7); q.lastStatusChange = iso(4); }
  if (status === "Offer") { steps.push(["offer", "Offer", "Status Changed", 6, null]); q.offerResponseDeadline = iso(-6); q.lastStatusChange = iso(6); }
  if (status === "Rejected") { steps.push(["pass", "Rejected", "Status Changed", 10, null]); q.lastStatusChange = iso(10); }
  for (const [sk, res, type, ago, m] of steps) {
    const act = `${Q}-${sk}`;
    b.set(doc(db, "users", uid, "activities", act), { id: act, userId: uid, queryId: Q, manuscriptId: "seed-ms-1", activityType: type, description: `${res} · ${name}`, date: iso(ago), details: "", resultingStatus: res });
    b.set(doc(db, "users", uid, "queries", Q, "activity", act), { type: res, resultingStatus: res, createdAt: new Date(iso(ago)), note: `${res} · ${name}`, queryId: Q, agentName: name, manuscriptTitle: "seed", ...(m ? { materials: m } : {}) });
  }
  b.set(doc(db, "users", uid, "queries", Q), q);
  if (note) b.set(doc(db, "users", uid, "journalEntries", `${Q}-note`), { id: `${Q}-note`, userId: uid, queryId: Q, entryText: note, createdAt: iso(2) });
  await b.commit().catch((e) => { console.error(`q167: ${key} refused: ${e.code}`); throw e; });
}
console.log(`q167: seeded ${FIXTURES.length}`);
process.exit(0);
