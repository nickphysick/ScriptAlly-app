/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Controls: entry v1 — five queries, each with its own agent, for tests/e2e/controlsEntry.measure.ts. Written as the
 * harness through the client SDK, so the emulator's firestore.rules judge every write (the entry's keys included).
 * ⚠️ Emulator only (fsTarget), and SELF-CLEANING: every document carries the `ce1-` prefix; `--clean` removes them,
 *    each query's activity log first.
 *
 *   fr   Full requested 3 days ago, no Send by           + a CHASER today, "Send by" in 10 days, with words
 *   q    Queried 236 days ago, gone quiet                 + a HOLDING reply today, "Reply expected by" in 52 days
 *   n    Queried 236 days ago, gone quiet                 + a NOTE today, no date
 *   rm   Queried 20 days ago, a reminder in 5 days        + a HOLDING reply today, "Reply expected by" in 40 days
 *   ra   as rm, but the reminder was SET after the entry   + a HOLDING reply yesterday, in 40 days (follow-up 2: stays put)
 *
 *   node tests/e2e/seedCe1.mjs            # the five queries, no entries
 *   node tests/e2e/seedCe1.mjs --entries  # add the five entries (both stores, the same id)
 *   node tests/e2e/seedCe1.mjs --clean    # remove everything ce1-
 */
import { targetEnv, TARGET_PROJECT } from "./fsTarget.mjs";
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDocs, deleteDoc, collection, writeBatch } from "firebase/firestore";

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
const P = "ce1-";
const DAY = 86_400_000;
const NOW = Date.now();
/** the day at local noon, ISO — how the app stores a day */
const noon = (daysAgo) => { const d = new Date(NOW - daysAgo * DAY); d.setHours(12, 0, 0, 0); return d; };
const iso = (daysAgo) => noon(daysAgo).toISOString();
const ymd = (daysAgo) => { const d = noon(daysAgo); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

async function wipe() {
  let gone = 0;
  for (const d of (await getDocs(collection(db, "users", uid, "queries"))).docs) {
    if (!d.id.startsWith(P)) continue;
    for (const a of (await getDocs(collection(db, "users", uid, "queries", d.id, "activity"))).docs) { await deleteDoc(a.ref); gone++; }
  }
  for (const coll of ["queries", "agents", "taskFlags", "activities", "tasks"]) {
    for (const d of (await getDocs(collection(db, "users", uid, coll))).docs) {
      if (d.id.startsWith(P) || (coll !== "agents" && String(d.data().queryId ?? "").startsWith(P))) { await deleteDoc(d.ref); gone++; }
    }
  }
  return gone;
}
if (process.argv.includes("--clean")) { console.log(`ce1: removed ${await wipe()}`); process.exit(0); }

/** [key, first, last, agency, status, days since sent, days since the request (or null), query extras] */
export const FIXTURES = [
  ["fr", "Imogen", "Faraday", "Faraday & Sloane", "Full Requested", 236, 3, {}],
  ["q", "Jules", "Okafor", "Okafor Literary", "Queried", 236, null, {}],
  ["n", "Nadia", "Brook", "Brook House", "Queried", 236, null, {}],
  ["rm", "Rafe", "Moss", "Moss & Hale", "Queried", 20, null, { nudgeDate: ymd(-5) }],
  /* follow-up 2 — the reminder SET AFTER the entry (stamped now; its entry is dated yesterday): it stays put */
  ["ra", "Ada", "Reyes", "Reyes Literary", "Queried", 20, null, { nudgeDate: ymd(-5), nudgeSetAt: new Date(NOW).toISOString() }],
];
/** [key, kind, new date (days ahead, or null), their words] — all dated today */
export const ENTRIES = [
  ["fr", "chaser", 10, "Any news on the manuscript? I’m reading through December and would love to see it before the break."],
  ["q", "holding", 52, "Still on my pile, I’m afraid. I hope to get to it in the new year."],
  ["n", "note", null, "I’m away until 7 December, so there’s no rush."],
  ["rm", "holding", 40, "Reading now — give me a few weeks."],
  ["ra", "holding", 40, "Reading now — back to you in the new year.", 1],
];
const MS = "seed-ms-1";
const title = (kind, first, status) => kind === "holding" ? `${first} sent a holding reply` : kind === "note" ? `${first} sent a note`
  : status === "Full Requested" ? `${first} chased the full` : status === "Partial Requested" ? `${first} chased the partial` : `${first} sent a chaser`;

if (process.argv.includes("--entries")) {
  const b = writeBatch(db);
  for (const [key, kind, ahead, words, daysAgo] of ENTRIES) {
    const [, first, last, , status] = FIXTURES.find((f) => f[0] === key);
    const Q = `${P}${key}`, act = `${Q}-entry`, at = new Date(NOW - (daysAgo ? daysAgo * DAY : 60_000)).toISOString();
    const date = ahead == null ? null : ymd(-ahead);
    b.set(doc(db, "users", uid, "queries", Q, "activity", act), { type: "Agent reply", createdAt: at, note: "", queryId: Q, agentName: `${first} ${last}`,
      replyKind: kind, ...(date ? { replyDate: date } : {}), replyNote: words });
    b.set(doc(db, "users", uid, "activities", act), { id: act, userId: uid, queryId: Q, manuscriptId: MS, activityType: "Agent Reply",
      description: title(kind, first, status), date: at, details: words, replyKind: kind, ...(date ? { replyDate: date } : {}) });
  }
  await b.commit().catch((e) => { console.error(`ce1: entries refused: ${e.code}`); throw e; });
  console.log(`ce1: ${ENTRIES.length} entries written`);
  process.exit(0);
}

await wipe();
for (const [key, first, last, agency, status, sentAgo, reqAgo, extra] of FIXTURES) {
  const b = writeBatch(db);
  const AG = `${P}ag-${key}`, Q = `${P}${key}`, name = `${first} ${last}`;
  b.set(doc(db, "users", uid, "agents", AG), {
    id: AG, userId: uid, name, agency, email: `${AG}@example.test`,
    website: "", genres: ["Literary Fiction"], notes: "", agentNotes: "", mswlNotes: "", twitter: "", bluesky: "", instagram: "", socials: [],
    city: "London", country: "GB", submissionStatus: "Open", submissionMethod: "Email", responseTimeWeeks: 8,
    starRating: 3, noResponseMeansNo: false, setAside: false, importedNeedsReview: false, materialsWanted: ["Query letter", "Synopsis"],
    dateAdded: iso(300), lastCheckedDate: iso(5),
  });
  const q = { id: Q, userId: uid, agentId: AG, manuscriptId: MS, dateSent: iso(sentAgo), status, sendMethod: "Email",
    personalisationNotes: `CE1 fixture: ${key}`, packageId: "", materialsWanted: ["Query letter"], ...extra };
  const steps = [["sent", "Queried", "Query Sent", sentAgo, `Query sent to ${name} at ${agency}`]];
  if (reqAgo != null) {
    steps.push(["freq", status, "Status Changed", reqAgo, `${name} asked for the full`]);
    Object.assign(q, { fullRequestedDate: iso(reqAgo), lastStatusChange: iso(reqAgo), hasAgentResponded: true, responseReceivedAt: iso(reqAgo) });
  }
  for (const [sk, res, type, ago, desc] of steps) {
    const act = `${Q}-${sk}`;
    b.set(doc(db, "users", uid, "activities", act), { id: act, userId: uid, queryId: Q, manuscriptId: MS, activityType: type, description: desc, date: iso(ago), details: "", resultingStatus: res });
    b.set(doc(db, "users", uid, "queries", Q, "activity", act), { type: res, resultingStatus: res, createdAt: new Date(iso(ago)), note: desc, queryId: Q, agentName: name, manuscriptTitle: "seed" });
  }
  b.set(doc(db, "users", uid, "queries", Q), q);
  await b.commit().catch((e) => { console.error(`ce1: ${key} refused: ${e.code}`); throw e; });
}
console.log(`ce1: seeded ${FIXTURES.length}`);
process.exit(0);
