/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DO THE TWO ACTIVITY STORES AGREE? — read-only, per query.
 *
 * ⚠️ THE SOURCE LOCK PROVES NO PRIMITIVE STILL WRITES ONE STORE ALONE. It cannot prove that the
 * account's data is consistent, and it never could — that is a fact about documents, not code. This
 * reads both and compares them, which is the seam the whole family of faults lives on.
 *
 * Reports three things per query, and the first is the one that matters:
 *   ORPHAN PROJECTION — a feed row whose event is not in the authoritative log. This is what an undo
 *                      used to leave: the timeline shows a close the derived status does not have.
 *   ORPHAN LOG       — an authoritative doc with no projection. Less visible and more dangerous:
 *                      `recomputeQuery` derives from something the dashboard never shows.
 *   DIVERGENT IDS    — the same event under two ids. Not a fault in itself; it is what made every
 *                      delete-by-id primitive miss, and it is the residue `recordMaterialsSent` left
 *                      before it was paired.
 *
 *   node tests/e2e/auditActivityStores.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, getDocs, collection } from "firebase/firestore";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("dev only");

const app = initializeApp({
  apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: dev.VITE_FIREBASE_PROJECT_ID, storageBucket: dev.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: dev.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: dev.VITE_FIREBASE_APP_ID,
});
const cred = await signInWithEmailAndPassword(getAuth(app),
  process.env.SA_E2E_EMAIL ?? "harness@scriptally.test",
  process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD);
const db = getFirestore(app);
const uid = cred.user.uid;

const all = async (...p) => (await getDocs(collection(db, "users", uid, ...p))).docs.map((d) => ({ id: d.id, ...d.data() }));
const queries = await all("queries");
const feed = await all("activities");
const iso = (v) => (v && v.toDate ? v.toDate().toISOString() : (typeof v === "string" ? v : ""));
/* an event's identity ACROSS the stores: the query, the status it produced, and the day it happened.
   Not the id — the ids are exactly what diverged. */
/**
 * ⚠️ THE KEY IS (QUERY, STATUS), NOT (QUERY, STATUS, DAY), AND THE FIRST RUN IS WHY. With the day in
 * it, a SEED that wrote its feed row and its log doc on two different dates showed up as an orphan
 * projection AND an orphan log — the same event counted twice as two faults. Measured: 38 and 28
 * against 38 paired, most of them seed date mismatches rather than anything a delete did.
 *
 * ⚠️ THE COST OF LOOSENING IT IS STATED RATHER THAN HIDDEN: two rejections on one query collapse to
 * one key, so a genuine orphan among duplicates is invisible. The counts below are therefore a
 * FLOOR on agreement, not a proof of it — which is the honest shape for a consistency audit and the
 * reason the source lock exists beside it.
 */
const key = (queryId, status) => `${queryId}|${status ?? "-"}`;

let orphanProj = 0, orphanLog = 0, divergent = 0, pairs = 0;
const lines = [];
for (const q of queries) {
  const log = await all("queries", q.id, "activity");
  const proj = feed.filter((a) => a.queryId === q.id);
  if (!log.length && !proj.length) continue;

  const logKeys = new Map();
  for (const d of log) logKeys.set(key(q.id, d.resultingStatus ?? d.type), d.id);
  const projKeys = new Map();
  for (const a of proj) projKeys.set(key(q.id, a.resultingStatus), a.id);

  for (const [k, id] of projKeys) {
    if (!logKeys.has(k)) { orphanProj++; lines.push(`  ORPHAN PROJECTION  ${q.id}  ${k}  feed=${id}`); }
    else { pairs++; if (logKeys.get(k) !== id) { divergent++; lines.push(`  DIVERGENT IDS      ${q.id}  ${k}  log=${logKeys.get(k)} feed=${id}`); } }
  }
  for (const [k, id] of logKeys) {
    if (!projKeys.has(k)) { orphanLog++; lines.push(`  ORPHAN LOG         ${q.id}  ${k}  log=${id}`); }
  }
}
console.log(`── activity stores · ${queries.length} queries · ${pairs} paired events`);
console.log(`   orphan projections: ${orphanProj}   orphan logs: ${orphanLog}   divergent ids: ${divergent}\n`);
for (const l of lines.slice(0, 40)) console.log(l);
if (lines.length > 40) console.log(`  … and ${lines.length - 40} more`);
process.exit(0);
