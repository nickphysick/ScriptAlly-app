/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v26's fixtures (tests/e2e/analyticsV26.measure.ts and the report's screenshots). Each is a manuscript of its
 * own on the harness account, with agents of its own, so nothing on "The Smoke Test" moves.
 *
 *   node tests/e2e/seedAn26.mjs mock      # "v26 Sample" — the mock's 27 queries: genres, notes, five nudges
 *   node tests/e2e/seedAn26.mjs nogenre   # "v26 No Genres" — the same 27, every agent with no genres recorded
 *   node tests/e2e/seedAn26.mjs nine      # "v26 Nine" — exactly 9 queries, 5 replies (rounds of 3)
 *   node tests/e2e/seedAn26.mjs five      # "v26 Five, No Nudges" — 5 replies, no nudge sent
 *   node tests/e2e/seedAn26.mjs four      # "v26 Four Replies" — 4 replies (Early, with replies)
 *   node tests/e2e/seedAn26.mjs early     # "v26 Early" — five waiting queries, no reply
 *   node tests/e2e/seedAn26.mjs dayone    # "v26 Day One" — a manuscript with no queries
 *   node tests/e2e/seedAn26.mjs restore   # deletes every document above
 *
 * ⚠️ THE EMULATOR BY DEFAULT (fsTarget's `targetEnv`). Every id starts `seed-an26-`; `restore` deletes them all.
 * ⚠️ DATES ARE DAYS BEFORE TODAY, written as whole ISO days, so a fixture read the day it is seeded reads as designed.
 */
import { targetEnv, harnessPassword } from "./fsTarget.mjs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDocs, collection, query, limit, writeBatch } from "firebase/firestore";
import { ROOT } from "./fsTarget.mjs";

const env = targetEnv();
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN, projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET, messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: env.VITE_FIREBASE_APP_ID,
});
const db = getFirestore(app);
const { email } = JSON.parse(readFileSync(resolve(ROOT, "tests/emulator-seed/harness.json"), "utf8"));
const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.SA_E2E_EMAIL ?? email, harnessPassword());
const uid = user.uid;
const P = "seed-an26-";
const DAY = 86400000;
const iso = (n) => new Date(Date.now() - n * DAY).toISOString().slice(0, 10) + "T12:00:00.000Z";
const W = 7;
const CRIME = "Crime and thriller", LIT = "Literary fiction", COMM = "Commercial fiction";

/* [sentDaysAgo, genre, note, steps: [status, daysAfterSend][]] — the unit fixture's sample (lib/analyticsV26.test.ts) */
const SAMPLE = [
  [330, CRIME, 0, [["No Response", 30 * W]]],
  [320, LIT, 0, [["No Response", 22 * W]]],
  [310, COMM, 0, [["No Response", 18 * W]]],
  [300, LIT, 0, [["No Response", 15 * W]]],
  [294, CRIME, 1, []],
  [290, CRIME, 1, [["Partial Requested", 11 * W], ["Partial Sent", 11 * W + 2], ["Rejected", 11 * W + 30]]],
  [280, LIT, 0, [["Rejected", 9 * W]]],
  [270, COMM, 0, [["Rejected", 13 * W]]],
  [217, CRIME, 0, []],
  [210, LIT, 1, [["Rejected", 7 * W]]],
  [200, CRIME, 1, [["Partial Requested", 6 * W], ["Partial Sent", 6 * W + 3]]],
  [190, CRIME, 1, [["Full Requested", 8 * W], ["Full Sent", 8 * W + 4]]],
  [180, CRIME, 1, [["Full Requested", 3 * W], ["Full Sent", 3 * W + 5], ["Offer", 3 * W + 40]]],
  [175, COMM, 0, [["Partial Requested", 7 * W], ["Rejected", 7 * W + 20]]],
  [168, LIT, 0, []], [133, CRIME, 0, []], [112, LIT, 1, []], [98, COMM, 0, []],
  [70, CRIME, 0, []],
  [63, LIT, 1, [["Partial Requested", 2 * W]]],
  [56, COMM, 0, []],
  [49, CRIME, 0, [["Partial Requested", 5 * W], ["Partial Sent", 5 * W + 1]]],
  [42, CRIME, 1, []], [28, LIT, 1, []], [21, COMM, 0, []], [14, CRIME, 0, []], [7, COMM, 1, []],
];
/* five nudges on the sample: [index, daysBeforeToday] — three answered 9, 6 and 4 days later, two not */
const NUDGES = [[7, 270 - 13 * W + 9], [6, 280 - 9 * W + 6], [11, 190 - 8 * W + 4], [4, 100], [15, 60]];
const NAMES = ["Harriet Lowe", "Tom Ashby", "Priya Nair", "Ellis Ward", "Naomi Clarke", "Ben Okafor", "Ruth Pemberton", "Isla Grant", "Dan Whitlock",
  "Maya Sinclair", "Joss Hale", "Carys Bowen", "Owen Marr", "Leah Stone", "Kit Farrow", "Grace Hill", "Sam Adeyemi", "Nell Hartley", "Rob Sutton",
  "Anya Petrov", "Jude Mercer", "Cleo Marsh", "Hugh Barlow", "Tess Okoro", "Will Draper", "Mina Shah", "Eve Calloway"];
const AGENCIES = ["Lowe & Marsh", "Greenway Literary", "Calder Agency", "Ward & Finch", "Harbour Lane Literary", "Finch Row", "Pemberton Associates",
  "North Quay Agency", "Whitlock & Rowe", "Sinclair Literary", "Tidewater Agency", "Bowen Books", "Marr Literary", "Stone & Abbey", "Farrow Agency",
  "Grant Hill", "Larkfield Literary", "Hartley & Voss", "Millrace Agency", "Kestrel Lane", "Mercer Literary", "Fennel & Rye", "Barlow Associates",
  "Quayside Books", "Draper & Lowe", "Old Mill Literary", "Calloway Agency"];

const FIX = {
  mock: { title: "v26 Sample", rows: SAMPLE.map((r, i) => [i, ...r]), nudges: NUDGES, extra: true, genres: true },
  nogenre: { title: "v26 No Genres", rows: SAMPLE.map((r, i) => [i, ...r]), nudges: NUDGES, extra: false, genres: false },
  /* nine: the second run alone; index 0 (passed 161 days ago) is nudged 100 days ago, AFTER its reply: never counted */
  nine: { title: "v26 Nine", rows: SAMPLE.slice(9, 18).map((r, i) => [i, ...r]), nudges: [[2, 190 - 8 * W + 4], [0, 100]], extra: false, genres: true },
  /* inside: Everyday, and every waiting query inside the slowest reply (13 wks): no beyond card */
  inside: { title: "v26 All Inside", rows: [5, 6, 7, 9, 10, 11, 12, 13, 18, 20, 22].map((j, i) => [i, ...SAMPLE[j]]), nudges: [], extra: false, genres: true },
  /* eight: Everyday with 8 dated queries: no rounds */
  eight: { title: "v26 Eight", rows: [5, 6, 7, 9, 10, 11, 12, 13].map((j, i) => [i, ...SAMPLE[j]]), nudges: [], extra: false, genres: true },
  five: { title: "v26 Five, No Nudges", rows: [...SAMPLE.slice(9, 18), ...SAMPLE.slice(18).filter((r) => !r[3].length)].map((r, i) => [i, ...r]), nudges: [], extra: false, genres: true },
  /* four: three replies from the first run, one from the third (2 wks) */
  four: { title: "v26 Four Replies", rows: [5, 6, 7, 8, 18, 19, 20, 22, 23, 24, 25, 26].map((j, i) => [i, ...SAMPLE[j]]), nudges: [], extra: false, genres: true },
  early: { title: "v26 Early", rows: [1, 2, 3, 5, 6].map((w, i) => [i, w * W, LIT, 0, []]), nudges: [], extra: false, genres: true },
  dayone: { title: "v26 Day One", rows: [], nudges: [], extra: false, genres: true },
};
const ms = (k) => `${P}${k}`;

async function seed(k) {
  const f = FIX[k];
  const b = writeBatch(db);
  const base = (await getDocs(query(collection(db, "users", uid, "agents"), limit(1)))).docs[0]?.data() ?? {};
  b.set(doc(db, "users", uid, "manuscripts", ms(k)), {
    id: ms(k), userId: uid, title: f.title, genre: "Crime", ageCategory: "Adult", wordCount: 90000, logline: "",
    status: "Querying", statusChangedDate: iso(0).slice(0, 10), comps: [], shelved: false,
  });
  const agentDoc = (id, name, agency, genres) => ({
    ...base, id, userId: uid, name, agency, genres, subGenres: [], responseTimeWeeks: 6, email: "", website: "",
  });
  for (const [i, sent, genre, note, steps] of f.rows) {
    const aid = `${P}${k}-ag-${i}`, qid = `${P}${k}-q-${i}`;
    /* a second genre on every queried agent, so grouping by any genre but the first would move every row */
    b.set(doc(db, "users", uid, "agents", aid), agentDoc(aid, NAMES[i % NAMES.length], AGENCIES[i % AGENCIES.length], f.genres ? [genre, "Book club fiction"] : []));
    const last = steps.length ? steps[steps.length - 1][0] : "Queried";
    const nudge = f.nudges.find(([ix]) => ix === i);
    b.set(doc(db, "users", uid, "queries", qid), {
      id: qid, userId: uid, agentId: aid, manuscriptId: ms(k), dateSent: iso(sent), status: last, sendMethod: "Email",
      personalisationNotes: note ? "Loved your talk at the festival" : "", packageId: "",
      ...(nudge ? { lastNudgeSentDate: iso(nudge[1]) } : {}),
    });
    const rungs = [["sent", "Queried", sent], ...steps.map(([s, d], j) => [`r${j}`, s, sent - d])];
    for (const [suffix, status, d] of rungs) {
      const actId = `${qid}-act-${suffix}`;
      b.set(doc(db, "users", uid, "activities", actId), {
        id: actId, userId: uid, queryId: qid, manuscriptId: ms(k), activityType: suffix === "sent" ? "Query Sent" : "Status Changed",
        description: `${status} recorded`, date: iso(d), details: "Sent via Email", resultingStatus: status,
      });
      b.set(doc(db, "users", uid, "queries", qid, "activity", actId), {
        type: status, resultingStatus: status, createdAt: new Date(iso(d)), note: `${status} recorded`, queryId: qid, manuscriptTitle: f.title,
      });
    }
    if (nudge) {
      const actId = `${qid}-act-nudge`;
      b.set(doc(db, "users", uid, "activities", actId), {
        id: actId, userId: uid, queryId: qid, manuscriptId: ms(k), activityType: "Nudge Sent", eventKey: "nudge_sent",
        description: "Nudge sent", date: iso(nudge[1]), details: "",
      });
    }
  }
  if (f.extra) {
    /* seven unqueried agents who list crime first, one who lists it second, two who take other things */
    const ex = [...Array(7).fill([CRIME]), [LIT, CRIME], [LIT], [COMM]];
    ex.forEach((g, j) => { const id = `${P}${k}-ex-${j}`; b.set(doc(db, "users", uid, "agents", id), agentDoc(id, `Unqueried ${j + 1}`, `Open Door ${j + 1}`, g)); });
  }
  await b.commit();
  console.log(ms(k));
}

async function restore() {
  let n = 0;
  for (const coll of ["activities", "queries", "agents", "manuscripts"]) {
    const snap = await getDocs(collection(db, "users", uid, coll));
    const mine = snap.docs.filter((d) => d.id.startsWith(P));
    for (let i = 0; i < mine.length; i += 400) {
      const b = writeBatch(db);
      for (const d of mine.slice(i, i + 400)) {
        if (coll === "queries") for (const a of (await getDocs(collection(db, "users", uid, "queries", d.id, "activity"))).docs) b.delete(a.ref);
        b.delete(d.ref);
        n++;
      }
      await b.commit();
    }
  }
  console.log(`restored (${n} documents)`);
}

const cmd = process.argv[2];
if (cmd === "restore") await restore();
else if (cmd === "all") { for (const k of Object.keys(FIX)) await seed(k); }
else if (cmd in FIX) await seed(cmd);
else throw new Error(`unknown command ${cmd}`);
process.exit(0);
