/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v152 — one query per state (§1.1–1.2), for QC152 L1–L3: an offer, materials requested, nudge due, with the
 * agent, gone quiet, closed, plus a "no reply means no" agent past its reply date, a nudged-then-quiet query and a
 * nudged-within-the-window query. Dated relative to now; each query has its own agent so a row is found by its id.
 * ⚠️ Emulator only (fsTarget), and SELF-CLEANING: every document carries the `q152-` prefix; `--clean` removes them,
 *    each query's activity log first. The lock cleans in the same run.
 *
 *   node tests/e2e/seedQc152.mjs          # write them
 *   node tests/e2e/seedQc152.mjs --clean  # remove them
 */
import { targetEnv, TARGET_PROJECT } from "./fsTarget.mjs";
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDocs, deleteDoc, deleteField, collection, writeBatch, updateDoc } from "firebase/firestore";

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
const PREFIX = "q152-";
const DAY = 86_400_000;
const NOW = Date.now();

async function wipe() {
  let gone = 0;
  for (const d of (await getDocs(collection(db, "users", uid, "queries"))).docs) {
    if (!d.id.startsWith(PREFIX)) continue;
    for (const a of (await getDocs(collection(db, "users", uid, "queries", d.id, "activity"))).docs) { await deleteDoc(a.ref); gone++; }
  }
  for (const coll of ["queries", "agents", "taskFlags", "activities", "tasks"]) {
    for (const d of (await getDocs(collection(db, "users", uid, coll))).docs) if (d.id.startsWith(PREFIX)) { await deleteDoc(d.ref); gone++; }
  }
  await updateDoc(doc(db, "users", uid), { "todoPrefs.queries.quietWeeks": deleteField() }).catch(() => {});
  return gone;
}
if (process.argv.includes("--clean")) { console.log(`q152: removed ${await wipe()}`); process.exit(0); }
await wipe();

const iso = (daysAgo) => new Date(NOW - daysAgo * DAY).toISOString();
/** [key, state it must land in, status, the agent's weeks, days since sent, days since the nudge (or null), no reply means no] */
export const FIXTURES = [
  ["offer", "offer", "Offer", 6, 50, null, false],
  ["materials", "materials", "Partial Requested", 6, 30, null, false],
  ["nudge", "nudge", "Queried", 2, 21, null, false],
  ["agent", "agent", "Queried", 4, 7, null, false],
  ["quiet", "quiet", "Queried", 2, 54, null, false],
  ["nrmn", "quiet", "Queried", 2, 17, null, true],
  ["nudgedquiet", "quiet", "Queried", 2, 84, 35, false],
  ["nudgedwait", "agent", "Queried", 2, 54, 20, false],
  ["closed", "closed", "Rejected", 6, 60, null, false],
];
const MS = "seed-ms-1";
for (const [key, , status, weeks, sentAgo, nudgeAgo, nrmn] of FIXTURES) {
  const b = writeBatch(db);
  const AG = `${PREFIX}ag-${key}`, Q = `${PREFIX}${key}`;
  const name = `V152 ${key[0].toUpperCase()}${key.slice(1)}`;
  b.set(doc(db, "users", uid, "agents", AG), {
    id: AG, userId: uid, name, agency: "State & Window", email: `${AG}@example.test`,
    website: "", genres: ["Literary Fiction"], notes: "", agentNotes: "", mswlNotes: "", twitter: "", bluesky: "", instagram: "", socials: [],
    city: "London", country: "GB", submissionStatus: "Open", submissionMethod: "Email", responseTimeWeeks: weeks,
    starRating: 3, noResponseMeansNo: nrmn, setAside: false, importedNeedsReview: false, materialsWanted: ["Query letter", "Synopsis"],
    dateAdded: iso(200), lastCheckedDate: iso(5),
  });
  const sent = iso(sentAgo);
  const q = { id: Q, userId: uid, agentId: AG, manuscriptId: MS, dateSent: sent, status, sendMethod: "Email",
    personalisationNotes: `QC152 fixture: ${key}`, packageId: "", materialsWanted: ["Query letter"] };
  if (nudgeAgo != null) q.lastNudgeSentDate = iso(nudgeAgo);
  const steps = [["sent", "Queried", "Query Sent", sentAgo, `Query sent to ${name} at State & Window`]];
  if (status === "Offer") steps.push(["offer", "Offer", "Status Changed", 6, `${name} made an offer`]);
  if (status === "Partial Requested") steps.push(["preq", "Partial Requested", "Status Changed", 4, `${name} asked for a partial`]);
  if (status === "Rejected") steps.push(["pass", "Rejected", "Status Changed", 20, `${name} passed`]);
  for (const [sk, res, type, ago, desc] of steps) {
    const act = `${Q}-${sk}`;
    b.set(doc(db, "users", uid, "activities", act), { id: act, userId: uid, queryId: Q, manuscriptId: MS, activityType: type, description: desc, date: iso(ago), details: "", resultingStatus: res });
    b.set(doc(db, "users", uid, "queries", Q, "activity", act), { type: res, resultingStatus: res, createdAt: new Date(iso(ago)), note: desc, queryId: Q, agentName: name, manuscriptTitle: "seed" });
  }
  if (status !== "Queried") q.lastStatusChange = iso(steps[steps.length - 1][3]);
  b.set(doc(db, "users", uid, "queries", Q), q);
  await b.commit().catch((e) => { console.error(`q152: ${key} refused: ${e.code}`); throw e; });
}
console.log(`q152: seeded ${FIXTURES.length}`);
process.exit(0);
