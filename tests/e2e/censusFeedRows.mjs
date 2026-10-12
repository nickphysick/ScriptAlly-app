/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * READ-ONLY CENSUS (fix-delete-entry): for every entry in every query's log on the harness account, can the
 * delete path find its feed row — and how? Writes nothing.
 *
 *   npx esbuild src/lib/entryDelete.ts --bundle --format=esm --outfile=/tmp/entryDelete.mjs
 *   node tests/e2e/censusFeedRows.mjs /tmp/entryDelete.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, getDocs, collection } from "firebase/firestore";

const { feedRowsFor } = await import(pathToFileURL(process.argv[2]).href);
const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("dev only");
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID });
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD);
const uid = user.uid;
const ms = (v) => (v && typeof v.toMillis === "function" ? v.toMillis() : typeof v === "string" ? Date.parse(v) || 0 : typeof v === "number" ? v : 0);

const feedAll = (await getDocs(collection(db, "users", uid, "activities"))).docs.map((d) => ({ id: d.id, ...d.data() }));
const queries = (await getDocs(collection(db, "users", uid, "queries"))).docs;
const tally = { logEntryId: 0, sameId: 0, typeAndTime: 0, none: 0 };
let entries = 0, noneWithCandidate = 0, noneNoRow = 0; const unmatched = []; const claimedRows = new Set();
let feedRowsOnQueries = 0;
for (const q of queries) {
  const log = (await getDocs(collection(db, "users", uid, "queries", q.id, "activity"))).docs.map((d) => { const x = d.data(); return { id: d.id, kind: String(x.resultingStatus ?? x.type ?? ""), eventKey: typeof x.eventKey === "string" ? x.eventKey : undefined, timeMs: ms(x.createdAt) }; });
  const feed = feedAll.filter((f) => f.queryId === q.id).map((x) => ({ id: x.id, logEntryId: x.logEntryId, resultingStatus: x.resultingStatus, activityType: x.activityType, eventKey: x.eventKey, timeMs: ms(x.date) }));
  feedRowsOnQueries += feed.length;
  for (const e of log) {
    entries++;
    const m = feedRowsFor(log, [e.id], feed);
    const how = m.how[e.id]; tally[how]++;
    for (const r of m.rows) claimedRows.add(r);
    if (how === "none") {
      const kindOf = (r) => (r.activityType === "Nudge Sent" ? "Nudge sent" : r.resultingStatus ?? "");
      const cand = feed.filter((r) => kindOf(r) === e.kind && !log.some((l) => l.id === r.id || l.id === r.logEntryId)).length;
      if (cand) { noneWithCandidate++; unmatched.push(`${q.id} · ${e.kind} · ${e.id} (${cand} row(s) of that type, counts disagree)`); } else noneNoRow++;
    }
  }
}
const statusRows = feedAll.filter((f) => queries.some((q) => q.id === f.queryId) && (f.resultingStatus || f.activityType === "Nudge Sent"));
const neverClaimed = statusRows.filter((f) => !claimedRows.has(f.id));
console.log(JSON.stringify({ queries: queries.length, logEntries: entries, feedRowsOnThoseQueries: feedRowsOnQueries, foundBy: tally, none: { noFeedRowOfThatTypeExists: noneNoRow, aRowExistsButCannotBeMatched: noneWithCandidate }, statusOrNudgeFeedRowsNoEntryClaims: neverClaimed.length, unmatched: unmatched.slice(0, 40) }, null, 1));
process.exit(0);
