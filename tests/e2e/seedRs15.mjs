/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v15 — the reference's own example book (tests/e2e/rs15Data.mjs, from design-refs/responses-v15), on six
 * manuscripts of their own, so the page can be measured against the mock with the mock's figures:
 *
 *   rs15-ms-full   "Murphy’s Day Out"   34 queried: 7 asked for more (4 your move), 11 passed (5 with a note, one after
 *                                       the full, one after a partial), 4 no reply, 12 still out; one R&R with a note
 *   rs15-ms-early  "Early Days"         9 queried: a partial request, a pass, 7 still out (the ref's EARLY)
 *   rs15-ms-none   "Nothing Back Yet"   the 12 still out, nothing answered
 *   rs15-ms-off    "Kept Off"           the full set, with Sarah Kendrick's pass kept off the collection (offWall)
 *   rs15-ms-one    "One Note"           a pass with a note, a partial request, three still out
 *   rs15-ms-asks   "Only Asks"          two requests, three still out: no rejection, no note
 *
 * ⚠️ EMULATOR BY DEFAULT, through fsTarget (`targetEnv()`); a live run needs ALLOW_LIVE_FIRESTORE=1 and prod is refused.
 * ⚠️ EVERY DATE IS RELATIVE TO TODAY. The reference's clock is 17 Nov 2026; each date is stored as that many days before
 *    (or after) today, so the fixture keeps its state on every day it is run.
 * ⚠️ SELF-CLEANING. Every document carries the `rs15-` prefix and a deterministic id; `--clean` removes them all, with
 *    each query's activity log and the feed rows. A run deletes before it writes. The lock runs `--clean` in afterAll.
 *
 *   node tests/e2e/seedRs15.mjs          # write
 *   node tests/e2e/seedRs15.mjs --clean  # remove
 */
import { targetEnv, TARGET_PROJECT } from "./fsTarget.mjs";
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDocs, collection, writeBatch } from "firebase/firestore";
import { FULL, EARLY, WAITING, REF_TODAY } from "./rs15Data.mjs";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = targetEnv();
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== TARGET_PROJECT) throw new Error("Refusing: not the target project");
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID });
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", PASSWORD);
const uid = user.uid;

const PREFIX = "rs15-";
const DAY = 86_400_000;
const REF_MS = Date.UTC(2026, REF_TODAY[0] - 1, REF_TODAY[1], 12);
/** a reference [month, day] as days before today (negative = ahead) */
const ago = (md) => Math.round((REF_MS - Date.UTC(2026, md[0] - 1, md[1], 12)) / DAY);
/* ⚠️ ANCHORED AT TODAY'S NOON, NOT NOW: a date written late at night crossed midnight (BST) and moved a month header */
const NOON = (() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d.getTime(); })();
const at = (daysAgo) => new Date(NOON - daysAgo * DAY).toISOString();
const slug = (s) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

async function clean() {
  /* batched: one write per 400 deletes (a delete per round trip took minutes on the emulator) */
  const refs = [];
  /* each query's activity log, read concurrently (one round trip each, in sequence, took minutes) */
  const mine = (await getDocs(collection(db, "users", uid, "queries"))).docs.filter((d) => d.id.startsWith(PREFIX));
  const logs = await Promise.all(mine.map((d) => getDocs(collection(db, "users", uid, "queries", d.id, "activity"))));
  mine.forEach((d, k) => { for (const a of logs[k].docs) refs.push(a.ref); refs.push(d.ref); });
  for (const c of ["agents", "manuscripts", "activities"]) {
    for (const d of (await getDocs(collection(db, "users", uid, c))).docs) {
      const x = d.data();
      if (d.id.startsWith(PREFIX) || (c === "activities" && String(x.queryId ?? "").startsWith(PREFIX))) refs.push(d.ref);
    }
  }
  for (let k = 0; k < refs.length; k += 400) {
    const b = writeBatch(db);
    for (const r of refs.slice(k, k + 400)) b.delete(r);
    await b.commit();
  }
  console.log(`rs15: removed ${refs.length}`);
}
if (process.argv.includes("--clean")) { await clean(); process.exit(0); }
/* H1's live switch: a pass recorded on the empty book's first query, two days ago (the next full run rewrites it) */
if (process.argv.includes("--answer-one")) {
  const id = "rs15-q-none-theo-blake", d = new Date(NOON - 2 * DAY).toISOString();
  const b = writeBatch(db);
  b.update(doc(db, "users", uid, "queries", id), { status: "Rejected", rejectedDate: d, lastStatusChange: d, rejectionFeedbackType: "form" });
  b.set(doc(db, "users", uid, "queries", id, "activity", "act-1-rejected"), { type: "Rejected", resultingStatus: "Rejected", createdAt: new Date(NOON - 2 * DAY), note: "Rejected", queryId: id, eventKey: "pass" });
  b.set(doc(db, "users", uid, "activities", "rs15-act-none-theo-blake-1"), {
    id: "rs15-act-none-theo-blake-1", userId: uid, queryId: id, manuscriptId: "rs15-ms-none", activityType: "Status Changed",
    description: "Rejected · Theo Blake", date: d, details: "", resultingStatus: "Rejected", eventKey: "pass",
  });
  await b.commit();
  console.log("rs15: answered one");
  process.exit(0);
}
await clean();

const S = { q: "Queried", pr: "Partial Requested", ps: "Partial Sent", fr: "Full Requested", fs: "Full Sent", rr: "Revise & Resubmit", of: "Offer", x: "Rejected", nr: "No Response" };
const FIELD = { "Queried": "dateSent", "Partial Requested": "partialRequestedDate", "Partial Sent": "partialSentDate", "Full Requested": "fullRequestedDate", "Full Sent": "fullSentDate", "Rejected": "rejectedDate", "Offer": "offerDate" };
const KEY = { "Queried": "query_sent", "Partial Requested": "partial_requested", "Full Requested": "full_requested", "Revise & Resubmit": "rr_requested", "Partial Sent": "partial_sent", "Full Sent": "full_sent", "Offer": "offer", "Rejected": "pass", "No Response": "closed_no_reply" };
const TYPE = { "Queried": "Query Sent", "Partial Sent": "Materials Sent", "Full Sent": "Materials Sent" };

/** the steps a reference item implies, as [status, daysAgo]: the query, a first request `fr` days in, the answer */
function steps(i) {
  const sent = ago(i.sent), out = [[S.q, sent]];
  if (i.fr) {
    const full = i.k === "rr" || (i.far >= 2 && i.k === "passed");
    out.push([full ? S.fr : S.pr, sent - i.fr], [full ? S.fs : S.ps, sent - i.fr - 2]);
  }
  const fin = { offer: S.of, fullReq: S.fr, partReq: S.pr, rr: S.rr, fullSent: S.fs, partSent: S.ps, passed: S.x, noReply: S.nr }[i.k];
  if (fin === S.fs || fin === S.ps) out.push([fin === S.fs ? S.fr : S.pr, ago(i.at)], [fin, ago(i.mine)]);
  else out.push([fin, ago(i.at)]);
  return out;
}

const writes = [];
const put = (coll, id, data) => writes.push([doc(db, "users", uid, coll, id), data]);
const putAct = (qid, id, data) => writes.push([doc(db, "users", uid, "queries", qid, "activity", id), data]);

/* one agent per name, shared across the manuscripts */
const agents = new Map();
const agentOf = (name, agency, weeks, nrmn) => {
  const id = `rs15-agent-${slug(name)}`;
  if (!agents.has(id)) {
    agents.set(id, true);
    put("agents", id, {
      id, userId: uid, name, agency, email: `${slug(name).split("-")[0]}@example.com`,
      website: "", genres: ["Crime"], notes: "", agentNotes: "", mswlNotes: "", twitter: "", bluesky: "", instagram: "", socials: [],
      city: "London", country: "GB", submissionStatus: "Open", submissionMethod: "Email", starRating: 3,
      ...(weeks ? { responseTimeWeeks: weeks } : {}),
      noResponseMeansNo: !!nrmn, setAside: false, importedNeedsReview: false, materialsWanted: ["Query letter", "Synopsis"],
      dateAdded: at(300), lastCheckedDate: at(10),
    });
  }
  return id;
};
const ms = (id, title) => put("manuscripts", id, {
  id, userId: uid, title, genre: "Crime", ageCategory: "Adult", wordCount: 82000, logline: "",
  status: "Querying", statusChangedDate: new Date().toISOString().slice(0, 10), comps: [], shelved: false,
});

function query(tag, msId, i, opts = {}) {
  const id = `rs15-q-${tag}-${slug(i.n)}`;
  const st = steps(i);
  const status = st[st.length - 1][0];
  const dates = {};
  for (const [s, d] of st) if (FIELD[s]) dates[FIELD[s]] = at(d);
  const extra = {};
  if (status === S.x) Object.assign(extra, i.note ? { rejectionFeedbackType: "detailed", rejectionFeedbackText: i.note } : { rejectionFeedbackType: "form" });
  if (status === S.rr && i.note) extra.rrNotes = i.note;
  if (status === S.of && i.due) extra.offerResponseDeadline = at(ago(i.due));
  const agentId = agentOf(i.n, i.a, 8, status === S.nr);
  put("queries", id, {
    id, userId: uid, agentId, manuscriptId: msId, ...dates, status, lastStatusChange: at(st[st.length - 1][1]),
    sendMethod: "Email", personalisationNotes: "", packageId: "", materialsWanted: ["Query letter", "Synopsis"], ...extra,
  });
  st.forEach(([s, d], k) => {
    const off = opts.offWall && s === S.x ? { offWall: true } : {};
    putAct(id, `act-${k}-${slug(s)}`, { type: s, resultingStatus: s, createdAt: new Date(NOON - d * DAY), note: s, queryId: id, eventKey: KEY[s], ...off });
    put("activities", `rs15-act-${tag}-${slug(i.n)}-${k}`, {
      id: `rs15-act-${tag}-${slug(i.n)}-${k}`, userId: uid, queryId: id, manuscriptId: msId, activityType: TYPE[s] ?? "Status Changed",
      description: `${s} · ${i.n}`, date: at(d), details: "", resultingStatus: s, eventKey: KEY[s], ...off,
    });
  });
}
function waiting(tag, msId, w) {
  const [name, agency, sent, weeks] = w;
  const id = `rs15-q-${tag}-${slug(name)}`;
  const d = ago(sent);
  put("queries", id, {
    id, userId: uid, agentId: agentOf(name, agency, weeks, false), manuscriptId: msId, dateSent: at(d), status: S.q, lastStatusChange: at(d),
    sendMethod: "Email", personalisationNotes: "", packageId: "", materialsWanted: ["Query letter", "Synopsis"],
  });
  putAct(id, "act-0-queried", { type: S.q, resultingStatus: S.q, createdAt: new Date(NOON - d * DAY), note: S.q, queryId: id, eventKey: KEY[S.q] });
  put("activities", `rs15-act-${tag}-${slug(name)}-0`, {
    id: `rs15-act-${tag}-${slug(name)}-0`, userId: uid, queryId: id, manuscriptId: msId, activityType: "Query Sent",
    description: `Queried · ${name}`, date: at(d), details: "", resultingStatus: S.q, eventKey: KEY[S.q],
  });
}

ms("rs15-ms-full", "Murphy’s Day Out");
ms("rs15-ms-early", "Early Days");
ms("rs15-ms-none", "Nothing Back Yet");
ms("rs15-ms-off", "Kept Off");
ms("rs15-ms-one", "One Note");
ms("rs15-ms-asks", "Only Asks");
for (const i of FULL) { query("full", "rs15-ms-full", i); query("off", "rs15-ms-off", i, { offWall: i.n === "Sarah Kendrick" }); }
for (const w of WAITING) { waiting("full", "rs15-ms-full", w); waiting("off", "rs15-ms-off", w); waiting("none", "rs15-ms-none", w); }
for (const i of EARLY) query("early", "rs15-ms-early", i);
for (const w of WAITING.slice(0, 7)) waiting("early", "rs15-ms-early", w);
const byName = (n) => FULL.find((x) => x.n === n);
for (const n of ["Eleanor Whitlock", "Clara Beaumont"]) query("one", "rs15-ms-one", byName(n));
for (const n of ["Clara Beaumont", "Jonathan Marsh"]) query("asks", "rs15-ms-asks", byName(n));
for (const w of WAITING.slice(0, 3)) { waiting("one", "rs15-ms-one", w); waiting("asks", "rs15-ms-asks", w); }

for (let k = 0; k < writes.length; k += 400) {
  const b = writeBatch(db);
  for (const [ref, data] of writes.slice(k, k + 400)) b.set(ref, data);
  await b.commit();
}
console.log(`rs15: wrote ${writes.length} documents`);
process.exit(0);
