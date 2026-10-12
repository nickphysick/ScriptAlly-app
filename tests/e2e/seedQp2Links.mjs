/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ONE QUERY PER STAND-CARD LINK STATE (Query panel v2, lock V13), so the links are read — and "Keep tracking"
 * and "Remind me later" are pressed — on this lock's own documents and nobody else's rows move.
 *
 *   qp2l-nosent  with the agent, no sent date recorded          → "Add the date you sent it"
 *   qp2l-nowin   with an agent who states no reply window        → "Set a date"
 *   qp2l-year    with the agent for 400 days, a window stated    → "Remind me later" · "Keep tracking"
 *   qp2l-request a partial requested, no send-by date            → "Set a send-by date"
 *
 * Its own prefix, `qp2l-`: `seedQp1Save.mjs` wipes every `qp1s-` document each time P13 seeds, and a second
 * session running that lock removed these mid-run when they shared the prefix.
 *
 *   node tests/e2e/seedQp2Links.mjs           # write them (wipes first, reminders and flags included)
 *   node tests/e2e/seedQp2Links.mjs --dump    # print the year query's flag and its open reminders
 *   node tests/e2e/seedQp2Links.mjs --clean   # remove them
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDocs, deleteDoc, collection, writeBatch } from "firebase/firestore";

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
const PREFIX = "qp2l-";
const DAY = 86_400_000;
const MS = "seed-ms-1";
const day0 = new Date(); day0.setHours(12, 0, 0, 0);
const iso = (daysAgo) => new Date(day0.getTime() - daysAgo * DAY).toISOString();
const mine = (d) => d.id.includes(PREFIX) || String(d.data()?.queryId ?? "").startsWith(PREFIX) || String(d.data()?.relatedRecordId ?? "").startsWith(PREFIX);

async function wipe() {
  let gone = 0;
  for (const d of (await getDocs(collection(db, "users", uid, "queries"))).docs) {
    if (!d.id.includes(PREFIX)) continue;
    for (const a of (await getDocs(collection(db, "users", uid, "queries", d.id, "activity"))).docs) { await deleteDoc(a.ref); gone++; }
  }
  for (const coll of ["queries", "agents", "taskFlags", "activities", "tasks", "journalEntries"]) {
    for (const d of (await getDocs(collection(db, "users", uid, coll))).docs) if (mine(d)) { await deleteDoc(d.ref); gone++; }
  }
  return gone;
}
if (process.argv.includes("--dump")) {
  const qs = (await getDocs(collection(db, "users", uid, "queries"))).docs.filter((d) => d.id.includes(PREFIX));
  const tasks = (await getDocs(collection(db, "users", uid, "tasks"))).docs.filter(mine).map((d) => ({ text: d.data().text, queryId: d.data().queryId, done: !!d.data().done }));
  /* a Timestamp has its own toJSON, so a replacer never sees it: walk the value instead */
  const plain = (v) => (v && typeof v === "object" ? (typeof v.toDate === "function" ? v.toDate().toISOString() : Array.isArray(v) ? v.map(plain) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]))) : v);
  const log = {};
  for (const d of qs) log[d.id] = (await getDocs(collection(db, "users", uid, "queries", d.id, "activity"))).docs.map((a) => a.id).sort();
  const feed = (await getDocs(collection(db, "users", uid, "activities"))).docs.filter(mine).map((d) => d.id).sort();
  console.log(JSON.stringify({ docs: Object.fromEntries(qs.map((d) => [d.id, plain(d.data())])), log, feed, queries: Object.fromEntries(qs.map((d) => [d.id, { dateSent: d.data().dateSent ?? null, keep: d.data().closureOfferDismissed ?? null, expected: d.data().writerExpectedDate ?? null }])), tasks }));
  process.exit(0);
}
if (process.argv.includes("--clean")) { console.log(`qp2l: removed ${await wipe()}`); process.exit(0); }
await wipe();
const b = writeBatch(db);
const agent = (id, name, agency, weeks) => b.set(doc(db, "users", uid, "agents", id), {
  id, userId: uid, name, agency, email: `${id}@example.test`,
  website: "", genres: ["Literary Fiction"], notes: "", agentNotes: "", mswlNotes: "", twitter: "", bluesky: "", instagram: "", socials: [],
  city: "London", country: "GB", submissionStatus: "Open", submissionMethod: "Email", ...(weeks ? { responseTimeWeeks: weeks } : {}),
  starRating: 3, setAside: false, importedNeedsReview: false, materialsWanted: ["Query letter"],
  dateAdded: iso(30), lastCheckedDate: iso(5),
});
const AG = `${PREFIX}ag`, AG2 = `${PREFIX}ag-nowin`;
agent(AG, "Petra Nwosu", "Nwosu & Hale", 8);
agent(AG2, "Oran Achterberg", "Achterberg Literary", 0);
const mk = (id, agentId, who, sentDays) => {
  b.set(doc(db, "users", uid, "queries", id), {
    id, userId: uid, agentId, manuscriptId: MS, status: "Queried", sendMethod: "Email",
    ...(sentDays == null ? {} : { dateSent: iso(sentDays), lastStatusChange: iso(sentDays) }),
    personalisationNotes: "", packageId: "", materialsWanted: ["Query letter"], revisionRound: 1, hasAgentResponded: false,
  });
  if (sentDays == null) return;
  const a = `${id}-sent`;
  b.set(doc(db, "users", uid, "activities", a), { id: a, userId: uid, queryId: id, manuscriptId: MS, activityType: "Query Sent", description: `Query sent to ${who}`, date: iso(sentDays), details: "Sent via Email", resultingStatus: "Queried" });
  b.set(doc(db, "users", uid, "queries", id, "activity", a), { type: "Queried", resultingStatus: "Queried", createdAt: new Date(iso(sentDays)), note: `Query sent to ${who}`, queryId: id, agentName: who.split(" at ")[0], manuscriptTitle: "seed" });
};
mk(`${PREFIX}nosent`, AG, "Petra Nwosu at Nwosu & Hale", null);
/* 45 days, not 20: feed drawer B6 reads the 30 days to 11 Oct, and a send dated inside them adds a day to it */
mk(`${PREFIX}nowin`, AG2, "Oran Achterberg at Achterberg Literary", 45);
mk(`${PREFIX}year`, AG, "Petra Nwosu at Nwosu & Hale", 400);
/* a request the writer owes, with no send-by date. Both entries are dated outside feed drawer B6's 30 days. */
{
  const id = `${PREFIX}request`, who = "Oran Achterberg at Achterberg Literary";
  b.set(doc(db, "users", uid, "queries", id), {
    id, userId: uid, agentId: AG2, manuscriptId: MS, status: "Partial Requested", sendMethod: "Email", dateSent: iso(70),
    personalisationNotes: "", packageId: "", materialsWanted: ["Query letter"], revisionRound: 1,
    hasAgentResponded: true, lastStatusChange: iso(45), partialRequestedDate: iso(45), responseReceivedAt: iso(45),
  });
  for (const [k, type, d, words, actType] of [["sent", "Queried", 70, `Query sent to ${who}`, "Query Sent"], ["req", "Partial Requested", 45, `Partial requested by ${who}`, "Status Changed"]]) {
    const a = `${id}-${k}`;
    b.set(doc(db, "users", uid, "activities", a), { id: a, userId: uid, queryId: id, manuscriptId: MS, activityType: actType, description: words, date: iso(d), details: "", resultingStatus: type });
    b.set(doc(db, "users", uid, "queries", id, "activity", a), { type, resultingStatus: type, createdAt: new Date(iso(d)), note: words, queryId: id, agentName: "Oran Achterberg", manuscriptTitle: "seed" });
  }
}
await b.commit();
console.log("qp2l: seeded");
process.exit(0);
