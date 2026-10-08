/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE "ALL QUERIED" STATE for the Contact list's next-step section (v15 §4, lock 6; CL15-6), in its two fixtures.
 *
 * ⚠️ WHY THIS EXISTS. The section's third state shows only when no agent on the list is ready and none is reopening.
 * On the shared account's own manuscript there are ready agents, so the state — its sentence, its split line, its
 * reason note, the Discover coming-soon panel and its stored request — never renders there. This seeds ONE extra
 * manuscript (a genre no agent on the account takes) and a query for it from the agents the fixture names:
 *
 *   A   every agent on the list has a query            → "… has gone to all N agents on your list.", no note
 *   B   every agent but three, each with genres recorded → "… has gone to N−3 of your N agents." and
 *       "The other 3 don't take {genres}." One of the queries is Withdrawn, so the split line has its fourth part.
 *
 * The lock opens the page with this manuscript in scope (`scriptally_active_manuscript_id`, in its own context).
 *
 * ⚠️ SELF-CLEANING, AND THE LOCK THAT USES IT CLEANS IN THE SAME RUN. Every document carries the `aqfx-` prefix and a
 * deterministic id; `--clean` removes them — each query's own activity log first (deleting a document does not delete
 * its subcollection) — and removes the `notifyPrefs.discover` leaf the lock's "Tell me when it's ready" press writes,
 * so the account is back to its exact prior state (absent means deleted, not false).
 *
 *   node tests/e2e/seedAllQueried.mjs A         # everyone queried
 *   node tests/e2e/seedAllQueried.mjs B         # three known mismatches left unqueried
 *   node tests/e2e/seedAllQueried.mjs --clean   # remove it
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDocs, deleteDoc, collection, writeBatch, setDoc, updateDoc, deleteField } from "firebase/firestore";

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
const PREFIX = "aqfx-";
const DAY = 86_400_000;
const iso = (daysAgo) => new Date(Date.now() - daysAgo * DAY).toISOString();

async function wipe() {
  let gone = 0;
  for (const d of (await getDocs(collection(db, "users", uid, "queries"))).docs) {
    if (!d.id.includes(PREFIX)) continue;
    for (const a of (await getDocs(collection(db, "users", uid, "queries", d.id, "activity"))).docs) { await deleteDoc(a.ref); gone++; }
  }
  for (const coll of ["queries", "manuscripts", "taskFlags", "activities", "tasks"]) {
    for (const d of (await getDocs(collection(db, "users", uid, coll))).docs) if (d.id.includes(PREFIX)) { await deleteDoc(d.ref); gone++; }
  }
  return gone;
}

if (process.argv.includes("--clean")) {
  const gone = await wipe();
  /* the lock's "Tell me when it's ready" press: the leaf did not exist before, so it is removed, not set false */
  await updateDoc(doc(db, "users", uid), { "notifyPrefs.discover": deleteField() }).catch(() => {});
  console.log(`aqfx: removed ${gone}`);
  process.exit(0);
}
const MODE = process.argv[2];
if (MODE !== "A" && MODE !== "B") throw new Error("say which fixture: A, B or --clean");
await wipe();
const MS = `${PREFIX}ms`;
await setDoc(doc(db, "users", uid, "manuscripts", MS), {
  id: MS, userId: uid, title: "The Salt Ledger", genre: "Western", ageCategory: "Adult", wordCount: 88000,
  logline: "A fixture for the Contact list's all-queried state.", status: "Querying", statusChangedDate: iso(60), comps: [], shelved: false,
});
const agents = (await getDocs(collection(db, "users", uid, "agents"))).docs.map((d) => ({ id: d.id, ...d.data() }))
  .sort((a, b) => a.id.localeCompare(b.id));
/* B: three agents whose genres ARE recorded (and are not the book's) stay unqueried — the known mismatches */
const left = MODE === "B" ? agents.filter((a) => (a.genres ?? []).length > 0 && !(a.genres ?? []).some((g) => /western/i.test(g))).slice(0, 3).map((a) => a.id) : [];
if (MODE === "B" && left.length !== 3) throw new Error(`fixture B needs three agents with genres recorded; found ${left.length}`);
const queried = agents.filter((a) => !left.includes(a.id));
/* a spread for the split line: most are still reading, some asked for more, some passed; B has one withdrawn */
const statusFor = (i) => (MODE === "B" && i === 1 ? "Withdrawn" : i % 7 === 3 ? "Full Requested" : i % 5 === 2 ? "Rejected" : "Queried");
let b = writeBatch(db), n = 0;
const put = async (ref, data) => { b.set(ref, data); if (++n % 300 === 0) { await b.commit(); b = writeBatch(db); } };
for (const [i, a] of queried.entries()) {
  const Q = `${PREFIX}q-${a.id}`.replace(/[^a-zA-Z0-9_-]/g, "-"), sent = 20 + i, status = statusFor(i);
  const who = a.name || a.agency || "the agent";
  await put(doc(db, "users", uid, "queries", Q), {
    id: Q, userId: uid, agentId: a.id, manuscriptId: MS, dateSent: iso(sent), status, sendMethod: "Email",
    responseDeadline: iso(sent - 56), personalisationNotes: "", packageId: "", materialsWanted: ["Query letter"],
  });
  const a1 = `${PREFIX}act-sent-${Q}`;
  await put(doc(db, "users", uid, "activities", a1), { id: a1, userId: uid, queryId: Q, manuscriptId: MS, activityType: "Query Sent", description: `Query sent to ${who}`, date: iso(sent), details: "Sent via Email", resultingStatus: "Queried" });
  await put(doc(db, "users", uid, "queries", Q, "activity", a1), { type: "Queried", resultingStatus: "Queried", createdAt: new Date(iso(sent)), note: `Query sent to ${who}`, queryId: Q, agentName: who, manuscriptTitle: "The Salt Ledger" });
  if (status !== "Queried") {
    const a2 = `${PREFIX}act-now-${Q}`;
    await put(doc(db, "users", uid, "activities", a2), { id: a2, userId: uid, queryId: Q, manuscriptId: MS, activityType: "Status Changed", description: `${status}: ${who}`, date: iso(sent - 10), details: "", resultingStatus: status });
    await put(doc(db, "users", uid, "queries", Q, "activity", a2), { type: status, resultingStatus: status, createdAt: new Date(iso(sent - 10)), note: `${status}: ${who}`, queryId: Q, agentName: who, manuscriptTitle: "The Salt Ledger" });
  }
}
await b.commit();
console.log(`aqfx: seeded ${MODE} — ${agents.length} agents, ${queried.length} queried, ${left.length} left unqueried (${left.join(", ")})`);
process.exit(0);
