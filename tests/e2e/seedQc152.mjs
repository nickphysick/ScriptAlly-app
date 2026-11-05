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
/* --dump <key>: the query and its log, sorted, as JSON (L9: Undo restores the query byte-for-byte) */
const di = process.argv.indexOf("--dump");
if (di > 0) {
  const { getDoc } = await import("firebase/firestore");
  const Q = `${PREFIX}${process.argv[di + 1]}`;
  const qd = (await getDoc(doc(db, "users", uid, "queries", Q))).data() ?? null;
  const log = (await getDocs(collection(db, "users", uid, "queries", Q, "activity"))).docs.map((d) => [d.id, d.data()]).sort();
  const feed = (await getDocs(collection(db, "users", uid, "activities"))).docs.filter((d) => d.data().queryId === Q).map((d) => [d.id, d.data()]).sort();
  const sortKeys = (o) => (o && typeof o === "object" && !Array.isArray(o) ? Object.fromEntries(Object.keys(o).sort().map((k) => [k, sortKeys(o[k])])) : Array.isArray(o) ? o.map(sortKeys) : o);
  console.log(JSON.stringify(sortKeys({ q: qd, log, feed })));
  process.exit(0);
}
/* --dumpq <queryId>: any query, sorted (v152.1 L12: the refused sibling is left exactly as it was); --agentname <agentId> */
const dq = process.argv.indexOf("--dumpq"), an = process.argv.indexOf("--agentname");
if (dq > 0 || an > 0) {
  const { getDoc } = await import("firebase/firestore");
  const sortKeys = (o) => (o && typeof o === "object" && !Array.isArray(o) ? Object.fromEntries(Object.keys(o).sort().map((k) => [k, sortKeys(o[k])])) : Array.isArray(o) ? o.map(sortKeys) : o);
  if (dq > 0) console.log(JSON.stringify(sortKeys((await getDoc(doc(db, "users", uid, "queries", process.argv[dq + 1]))).data() ?? null)));
  else { const a = (await getDoc(doc(db, "users", uid, "agents", process.argv[an + 1]))).data(); console.log(JSON.stringify(a?.name || a?.agency || "")); }
  process.exit(0);
}
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
  /* §2 — a long thread (L4: the card's height is the same short or long) */
  ["long", "agent", "Full Sent", 6, 150, null, false],
  /* §3 — a full requested, its request step recording what was asked (L9: Mark full sent prefills from it) */
  ["fullreq", "materials", "Full Requested", 8, 40, null, false],
  /* §4 — sent as the harness's own "Comps-led variant" package (L11: change a chip, the link clears on save) */
  ["pkg", "agent", "Queried", 8, 20, null, false],
  /* v152.1 §2 — the thread's cases (QC1521 L2–L10): an R&R with the query's legacy note, a pass with the step's own reply
     note, a withdrawal with its reason, an offer whose writer told six others, an undated imported step beside a send with
     no materials, and a seven-step thread with two nudges (the fold and "2nd nudge") */
  ["rr", "materials", "Revise & Resubmit", 6, 100, null, false],
  ["passed", "closed", "Rejected", 6, 90, null, false],
  ["withdrew", "closed", "Withdrawn", 6, 60, null, false],
  ["offertold", "offer", "Offer", 6, 80, null, false],
  ["undated", "agent", "Partial Sent", 6, 80, null, false],
  ["seven", "agent", "Full Sent", 6, 180, null, false],
  /* v152.1 L10 — an offer and a live sibling on the second manuscript, whose live queries all take the offer marks: on
     seed-ms-1 the harness's seed-pkgq-4 (written by seedPackages.mjs outside the rules) refuses ANY update, and the told
     save is one batch over every sibling, so it fails there whole (reported) */
  ["offer2", "offer", "Offer", 6, 50, null, false],
  ["sib2", "agent", "Queried", 4, 7, null, false],
];
const MSOF = { offer2: "seed-ms-2", sib2: "seed-ms-2" };
/** each fixture agent's first name, so the card's words read as they will for a writer */
const FIRST = { offer: "Olive", materials: "Mira", nudge: "Priya", agent: "Rufus", quiet: "Quinn", nrmn: "Nina", nudgedquiet: "Nell", nudgedwait: "Wren", closed: "Clara", long: "Jonathan", fullreq: "Hannah", pkg: "Felix",
  rr: "Rhea", passed: "Paul", withdrew: "Wanda", offertold: "Tom", undated: "Uma", seven: "Seth", offer2: "Ottilie", sib2: "Simon" };
/** the v152.1 fixtures' steps: [key, type, days ago (null: undated), extra log fields] */
const NUDGE = "Nudge sent", TOLD = "Told other agents";
/** the day at local noon, ISO — how the app stores a day (lib/queryActions/dates dayIso) */
const dayIso = (daysAgo) => { const d = new Date(NOW - daysAgo * DAY); d.setHours(12, 0, 0, 0); return d.toISOString(); };
const STEPS1521 = {
  rr: [["sent", "Queried", 100], ["freq", "Full Requested", 70], ["fsent", "Full Sent", 50], ["rr", "Revise & Resubmit", 10]],
  passed: [["sent", "Queried", 90], ["freq", "Full Requested", 40], ["fsent", "Full Sent", 30], ["pass", "Rejected", 10, { replyNote: "Beautifully written, but I didn’t fall for it quite enough." }]],
  withdrew: [["sent", "Queried", 60], ["wd", "Withdrawn", 5]],
  offertold: [["sent", "Queried", 80], ["offer", "Offer", 10, { replyNote: "I’d love to represent this book." }], ["told", TOLD, 9, { toldCount: 6, toldDeadline: dayIso(-8), eventKey: "offer_told" }]],
  undated: [["sent", "Queried", 80], ["preq", "Partial Requested", null], ["psent", "Partial Sent", 20]],
  seven: [["sent", "Queried", 180], ["n1", NUDGE, 150], ["n2", NUDGE, 130], ["preq", "Partial Requested", 110], ["psent", "Partial Sent", 90], ["freq", "Full Requested", 60], ["fsent", "Full Sent", 20]],
};
const QUERY1521 = {
  rr: { rrNotes: "Loved the voice. The middle sags; tighten the second act and I’d read it again.", fullRequestedDate: iso(70), fullSentDate: iso(50) },
  passed: { fullRequestedDate: iso(40), fullSentDate: iso(30), rejectionFeedbackType: "detailed", rejectionFeedbackText: "An older note the step’s own words replace." },
  withdrew: { closingReason: "Withdrew my submission", closingNotes: "An offer elsewhere" },
  offertold: { offerResponseDeadline: iso(-5) },
  undated: { partialSentDate: iso(20) },
  seven: { partialRequestedDate: iso(110), partialSentDate: iso(90), fullRequestedDate: iso(60), fullSentDate: iso(20), lastNudgeSentDate: iso(130) },
};
const MS = "seed-ms-1";
for (const [key, , status, weeks, sentAgo, nudgeAgo, nrmn] of FIXTURES) {
  const b = writeBatch(db);
  const AG = `${PREFIX}ag-${key}`, Q = `${PREFIX}${key}`;
  const name = `${FIRST[key]} Vale`;
  b.set(doc(db, "users", uid, "agents", AG), {
    id: AG, userId: uid, name, agency: "State & Window", email: `${AG}@example.test`,
    website: "", genres: ["Literary Fiction"], notes: "", agentNotes: "", mswlNotes: "", twitter: "", bluesky: "", instagram: "", socials: [],
    city: "London", country: "GB", submissionStatus: "Open", submissionMethod: "Email", responseTimeWeeks: weeks,
    starRating: 3, noResponseMeansNo: nrmn, setAside: false, importedNeedsReview: false, materialsWanted: ["Query letter", "Synopsis"],
    dateAdded: iso(200), lastCheckedDate: iso(5),
  });
  const sent = iso(sentAgo);
  const MSK = MSOF[key] ?? MS;
  const q = { id: Q, userId: uid, agentId: AG, manuscriptId: MSK, dateSent: sent, status, sendMethod: "Email",
    personalisationNotes: `QC152 fixture: ${key}`, packageId: "", materialsWanted: ["Query letter"] };
  if (nudgeAgo != null) q.lastNudgeSentDate = iso(nudgeAgo);
  const steps = [["sent", "Queried", "Query Sent", sentAgo, `Query sent to ${name} at State & Window`]];
  if (status === "Offer") steps.push(["offer", "Offer", "Status Changed", 6, `${name} made an offer`]);
  if (status === "Partial Requested") steps.push(["preq", "Partial Requested", "Status Changed", 4, `${name} asked for a partial`]);
  if (status === "Full Requested") { steps.push(["freq", "Full Requested", "Status Changed", 9, `${name} asked for the full`]); q.fullRequestedDate = iso(9); q.expectedSendDate = iso(-5); }
  if (status === "Rejected") steps.push(["pass", "Rejected", "Status Changed", 20, `${name} passed`]);
  if (key === "long") {
    steps.push(["preq", "Partial Requested", "Status Changed", 120, `${name} asked for a partial`], ["psent", "Partial Sent", "Status Changed", 100, `Partial sent to ${name}`],
      ["freq", "Full Requested", "Status Changed", 60, `${name} asked for the full`], ["fsent", "Full Sent", "Status Changed", 20, `Full sent to ${name}`]);
    Object.assign(q, { partialRequestedDate: iso(120), partialSentDate: iso(100), fullRequestedDate: iso(60), fullSentDate: iso(20) });
  }
  if (status === "Offer") q.offerResponseDeadline = iso(-6);
  if (key === "pkg") Object.assign(q, { packageId: "seed-pkg-2", sentHow: "package", sentPackageId: "seed-pkg-2", sentPackageEdition: 1, sentPackageName: "Comps-led variant" });
  if (status === "Partial Requested") q.expectedSendDate = iso(-7);
  /* v152.1 — its own steps and fields */
  if (STEPS1521[key]) {
    Object.assign(q, QUERY1521[key] ?? {});
    const STATUSES = ["Queried", "Partial Requested", "Partial Sent", "Full Requested", "Full Sent", "Revise & Resubmit", "Offer", "Rejected", "Withdrawn", "No Response"];
    let last = null;
    for (const [sk, type, ago, extra] of STEPS1521[key]) {
      const act = `${Q}-${sk}`, st = STATUSES.includes(type);
      const created = ago == null ? "" : new Date(iso(ago));
      b.set(doc(db, "users", uid, "queries", Q, "activity", act), { type, ...(st ? { resultingStatus: type } : {}), createdAt: created, note: `${type} · ${name}`, queryId: Q, agentName: name, manuscriptTitle: "seed",
        ...(sk === "sent" ? { materials: [{ kind: "letter" }, { kind: "synopsis" }, { kind: "sample", unit: "pages", n: 10 }] } : {}), ...(extra ?? {}) });
      if (st && ago != null) {
        b.set(doc(db, "users", uid, "activities", act), { id: act, userId: uid, queryId: Q, manuscriptId: MSK, activityType: sk === "sent" ? "Query Sent" : "Status Changed", description: `${type} · ${name}`, date: iso(ago), details: "", resultingStatus: type });
        last = ago;
      }
    }
    if (status !== "Queried" && last != null) q.lastStatusChange = iso(last);
    b.set(doc(db, "users", uid, "queries", Q), q);
    await b.commit().catch((e) => { console.error(`q152: ${key} refused: ${e.code}`); throw e; });
    continue;
  }
  for (const [sk, res, type, ago, desc] of steps) {
    const act = `${Q}-${sk}`;
    b.set(doc(db, "users", uid, "activities", act), { id: act, userId: uid, queryId: Q, manuscriptId: MSK, activityType: type, description: desc, date: iso(ago), details: "", resultingStatus: res });
    /* §3: the full request records what was asked, on both stores (the v152 step materials) */
    const mats = sk === "freq" && key === "fullreq" ? { materials: [{ kind: "full" }, { kind: "synopsis" }] }
      : sk === "sent" && key === "pkg" ? { materials: [{ kind: "letter", name: "Comps-forward" }, { kind: "synopsis", name: "One-page" }] } : {};
    b.set(doc(db, "users", uid, "queries", Q, "activity", act), { type: res, resultingStatus: res, createdAt: new Date(iso(ago)), note: desc, queryId: Q, agentName: name, manuscriptTitle: "seed", ...mats });
  }
  if (status !== "Queried") q.lastStatusChange = iso(steps[steps.length - 1][3]);
  b.set(doc(db, "users", uid, "queries", Q), q);
  await b.commit().catch((e) => { console.error(`q152: ${key} refused: ${e.code}`); throw e; });
}
console.log(`q152: seeded ${FIXTURES.length}`);
process.exit(0);
