/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Card offers v1 — the CO locks' own agents, on the EMULATOR only (`assertTarget`), under the harness account. Each is
 * one agent with one query, dated from today so the fixture never drifts:
 *
 *   co1-rt    Queried 21 days ago, an 8-week window, the nudge the log flow writes (a week after the expected date,
 *             off the weekend) — the response-time offer, and "Leave it open" suggested on closing
 *   co1-old   Queried 69 days ago (ten weeks), 8 weeks, "no response means no" — past its date: "Close it as no reply"
 *   co1-full  Full requested — the calm note, never a close option; no email and no website (+ Email, + Website)
 *   co1-wn    Queried 21 days ago, the nudge moved by the writer to a day of their own — Update leaves it alone
 *
 *   node tests/e2e/co1Emu.mjs seed          (re)writes all four, and deletes their activity rows
 *   node tests/e2e/co1Emu.mjs read          prints each query's status, nudgeDate, writer's date and activity rows
 *   node tests/e2e/co1Emu.mjs clean         removes them
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertTarget, EMULATOR_HOSTS, EMULATOR_PROJECT, ROOT } from "./fsTarget.mjs";

assertTarget(EMULATOR_PROJECT);
process.env.FIRESTORE_EMULATOR_HOST = EMULATOR_HOSTS.firestore;
const require = createRequire(resolve(ROOT, "functions/package.json"));
const admin = require("firebase-admin");
const db = admin.initializeApp({ projectId: EMULATOR_PROJECT }, "co1-emu").firestore();
const { uid } = JSON.parse(readFileSync(resolve(ROOT, "tests/emulator-seed/harness.json"), "utf8"));

const DAY = 86_400_000;
const noon = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
const today = noon(new Date());
const daysAgo = (n) => new Date(today.getTime() - n * DAY);
const offWeekend = (d) => (d.getDay() === 6 ? new Date(d.getTime() + 2 * DAY) : d.getDay() === 0 ? new Date(d.getTime() + DAY) : d);
const defaultNudge = (sent, weeks) => noon(offWeekend(new Date(sent.getTime() + weeks * 7 * DAY + 7 * DAY)));

const IDS = ["co1-rt", "co1-old", "co1-full", "co1-wn"];
const NAMES = { "co1-rt": "Sarah Offerton", "co1-old": "Olive Offerton", "co1-full": "Fiona Offerton", "co1-wn": "Nell Offerton" };

async function msId() {
  const s = await db.collection(`users/${uid}/manuscripts`).limit(1).get();
  if (s.empty) throw new Error("the harness account has no manuscript");
  return s.docs[0].id;
}
async function clearActivities(qid) {
  for (const path of [`users/${uid}/queries/${qid}/activity`]) {
    const s = await db.collection(path).get();
    for (const d of s.docs) await d.ref.delete();
  }
  const g = await db.collection(`users/${uid}/activities`).where("queryId", "==", qid).get();
  for (const d of g.docs) await d.ref.delete();
}

const cmd = process.argv[2];
/** a real record of the harness account's, as the shape to start from: whatever the rules require, it already has */
async function template(coll, where) {
  const s = await db.collection(`users/${uid}/${coll}`).where(...where).limit(1).get();
  if (s.empty) throw new Error(`the harness account has no ${coll} to start from`);
  return s.docs[0].data();
}
const STRIP_Q = ["responseDeadline", "writerExpectedDate", "writerExpectedSetAt", "nudgeDate", "lastNudgeSentDate", "closePlan", "replyRestartedOn",
  "nrmnOverride", "partialRequestedDate", "partialSentDate", "fullRequestedDate", "fullSentDate", "responseReceivedAt", "expectedSendDate",
  "offerResponseDeadline", "rejectionFeedbackType", "rejectionFeedbackText", "closingReason", "sentPackageId", "sentPackageEdition", "sentPackageName"];
const STRIP_A = ["noResponseMeansNo", "reopensOn", "pinned", "setAside", "agencyUnknown", "submissionMethodOther", "notePreview", "importedNeedsReview", "fieldSources"];

if (cmd === "seed") {
  const ms = await msId();
  const qT = await template("queries", ["status", "==", "Queried"]);
  const aT = await template("agents", ["submissionStatus", "==", "Open"]);
  for (const k of STRIP_Q) delete qT[k];
  for (const k of STRIP_A) delete aT[k];
  for (const id of IDS) {
    const nrn = id === "co1-old";
    const agent = {
      ...aT, notes: "",
      id, userId: uid, name: NAMES[id], agency: "Harbour Lane Literary", email: id === "co1-full" ? "" : `${id}@harbourlane.test`, website: "",
      responseTimeWeeks: 8, submissionStatus: "Open", submissionMethod: "Email", genres: ["Thriller"], mswlNotes: "Dark, twisty crime.",
      materialsWanted: ["Query letter", "Synopsis"], starRating: 3, dateAdded: daysAgo(120).toISOString(), lastCheckedDate: daysAgo(30).toISOString(),
      ...(nrn ? { noResponseMeansNo: true } : {}),
    };
    await db.doc(`users/${uid}/agents/${id}`).set(agent);
    const sent = id === "co1-old" ? daysAgo(69) : daysAgo(21);
    const q = {
      ...qT,
      id: `${id}-q`, userId: uid, agentId: id, manuscriptId: ms, sendMethod: "Email", materialsWanted: ["Query letter"],
      personalisationNotes: "", packageId: "", dateSent: sent.toISOString(),
      status: id === "co1-full" ? "Full Requested" : "Queried",
      ...(id === "co1-full" ? { fullRequestedDate: daysAgo(7).toISOString(), lastStatusChange: daysAgo(7).toISOString() } : { lastStatusChange: sent.toISOString() }),
      ...(id === "co1-rt" || id === "co1-old" ? { nudgeDate: defaultNudge(sent, 8).toISOString() } : {}),
      ...(id === "co1-wn" ? { nudgeDate: noon(new Date(today.getTime() + 60 * DAY)).toISOString() } : {}),
    };
    await db.doc(`users/${uid}/queries/${id}-q`).set(q);
    await clearActivities(`${id}-q`);
  }
  console.log("seeded");
} else if (cmd === "read") {
  const out = {};
  for (const id of IDS) {
    const q = (await db.doc(`users/${uid}/queries/${id}-q`).get()).data() ?? null;
    const acts = (await db.collection(`users/${uid}/queries/${id}-q/activity`).get()).docs.map((d) => d.data());
    const feed = (await db.collection(`users/${uid}/activities`).where("queryId", "==", `${id}-q`).get()).docs.map((d) => d.data());
    out[id] = q && {
      status: q.status, nudgeDate: q.nudgeDate ?? null, writerExpectedDate: q.writerExpectedDate ?? null, writerExpectedSetAt: q.writerExpectedSetAt ?? null,
      dateSent: q.dateSent ?? null, activity: acts.map((a) => ({ type: a.type ?? null, eventKey: a.eventKey ?? null, resultingStatus: a.resultingStatus ?? null })),
      feed: feed.map((a) => ({ eventKey: a.eventKey ?? null, resultingStatus: a.resultingStatus ?? null })),
    };
    const a = (await db.doc(`users/${uid}/agents/${id}`).get()).data();
    if (out[id]) out[id].agent = a ? { weeks: a.responseTimeWeeks ?? null, door: a.submissionStatus ?? null } : null;
  }
  console.log(JSON.stringify(out));
} else if (cmd === "clean") {
  for (const id of IDS) {
    await clearActivities(`${id}-q`);
    await db.doc(`users/${uid}/queries/${id}-q`).delete();
    await db.doc(`users/${uid}/agents/${id}`).delete();
  }
  console.log("cleaned");
} else {
  console.error("usage: co1Emu.mjs seed|read|clean");
  process.exit(2);
}
process.exit(0);
