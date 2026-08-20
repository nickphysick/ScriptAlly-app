/**
 * SEED THE SHAPES THE CORRECTION UI NEEDS, because the general seeder does not produce them.
 *
 * ⚠️ `seed.mjs` WRITES QUERIES WITH NO ACTIVITY DOCUMENTS AT ALL. Every timeline it produces is a
 * synthesised root — a row with no `activityId`, which by design carries no ⋯ — so on a freshly
 * seeded account there is nothing correctable anywhere, and the correction checks report
 * "unexercised" for a reason that has nothing to do with the code under test. That is why the
 * Phase 5 checks could not run, and it would have recurred on the next fresh account.
 *
 * ⚠️ BOTH STORES, UNDER ONE SHARED ID. An entry is a document in the query's own `activity`
 * subcollection (authoritative, keyed by `type`) and a projection in the global `activities` feed
 * (keyed by `activityType` + `resultingStatus`). Seeding one store would produce a timeline the app
 * can render and cannot correct, or a correction that leaves the feed disagreeing — the two-store
 * divergence the whole arrangement exists to avoid.
 *
 * ⚠️ AND EVERY QUERY GETS A REAL `Queried` RUNG. The root guard is POSITIONAL: it refuses to remove
 * the earliest event. Without a real root the earliest event is whatever else was written, so that
 * entry becomes unremovable and the account looks "all guarded" — which is exactly the state the
 * last run ended in.
 *
 *   node tests/e2e/seedCorrection.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, writeBatch, getDocs, collection, deleteDoc } from "firebase/firestore";

const env = (file) => Object.fromEntries(
  readFileSync(file, "utf8").split("\n")
    .map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }),
);
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
const PROJECT = dev.VITE_FIREBASE_PROJECT_ID;
if (PROJECT !== "scriptally-dev") throw new Error(`Refusing to seed "${PROJECT}".`);
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");

const app = initializeApp({
  apiKey: dev.VITE_FIREBASE_API_KEY,
  authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: PROJECT,
  storageBucket: dev.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: dev.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: dev.VITE_FIREBASE_APP_ID,
});
const dbId = dev.VITE_FIREBASE_DATABASE_ID;
const db = !dbId || dbId === "(default)" ? getFirestore(app) : getFirestore(app, dbId);
const { user } = await signInWithEmailAndPassword(
  getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", PASSWORD);
const uid = user.uid;
console.log(`database: ${dbId || "(default)"} · project: ${PROJECT} · uid ${uid}`);

const iso = (daysAgo) => new Date(Date.now() - daysAgo * 864e5).toISOString();
const day = (daysAgo) => iso(daysAgo).slice(0, 10);

/** One entry, written to BOTH stores under one id — the app's own arrangement. */
const entry = (batch, queryId, msId, id, status, daysAgo, description, note = "") => {
  batch.set(doc(db, "users", uid, "queries", queryId, "activity", id), {
    type: status, createdAt: iso(daysAgo), note,
  });
  batch.set(doc(db, "users", uid, "activities", id), {
    id, userId: uid, queryId, manuscriptId: msId,
    activityType: "Status Changed",
    resultingStatus: status,
    description, details: note,
    date: day(daysAgo), createdAt: iso(daysAgo),
  });
};

/**
 * ⚠️ THE FOUR SHAPES ARE NAMED AND FIXED, so a future run does not have to rediscover them by
 * clicking through twenty queries hoping one is suitable.
 *
 *   cor-pair    a request AND the send that answers it → the dependency guard's cascade
 *   cor-closed  a real closure event that can be removed → "removing a closure reopens the query"
 *   cor-move-a  the source for a cross-query move, with a note NAMING ITS OWN AGENT (stale-note)
 *   cor-move-b  the destination, open
 *   cor-move-c  a CLOSED destination → the "does not reopen it" path
 */
const MS_ID = "seed-ms-1";
const SHAPES = [
  { id: "cor-pair", agent: "seed-agent-1", status: "Partial Sent", rows: [
    ["Queried", 60, "Query sent to Elinor Hale"],
    ["Partial Requested", 40, "Partial requested by Elinor Hale"],
    ["Partial Sent", 35, "Partial sent to Elinor Hale"],
  ] },
  { id: "cor-closed", agent: "seed-agent-2", status: "Rejected", rows: [
    ["Queried", 80, "Query sent to Tom Ellery"],
    ["Full Requested", 55, "Full requested by Tom Ellery"],
    ["Rejected", 20, "Rejected by Tom Ellery"],
  ] },
  { id: "cor-move-a", agent: "seed-agent-3", status: "Partial Requested", rows: [
    ["Queried", 70, "Query sent to Marcus Reed"],
    ["Partial Requested", 30, "Partial requested by Marcus Reed", "Marcus asked for the first fifty pages."],
  ] },
  { id: "cor-move-b", agent: "seed-agent-4", status: "Queried", rows: [
    ["Queried", 65, "Query sent to Priya Nair"],
  ] },
  /* ⚠️ A2·3 CONSUMES AN ENTRY PERMANENTLY — the write that retires a pending undo is exactly the
     write that makes the first removal unrecoverable, so that check cannot put its own data back.
     It gets a shape of its own with two independently removable SENDS (no request, so no cascade
     folds them into one act), and re-running this seeder is a precondition of the §A suite. */
  { id: "cor-undo", agent: "seed-agent-6", status: "Full Sent", rows: [
    ["Queried", 95, "Query sent to Rachel Lin"],
    ["Partial Sent", 62, "Partial sent to Rachel Lin"],
    ["Full Sent", 28, "Full sent to Rachel Lin"],
  ] },
  /* ⚠️ THE CLOSURE IS RECENT ON PURPOSE. Card 11's claim is about an event arriving BEFORE the
     closure — that is the case that must not reopen the query. cor-move-a's request is 30 days old,
     so this closure sits at 10 days and the moved event lands underneath it. Dated the other way
     round the move genuinely DOES reopen the query, correctly, and a check written that way
     measures the opposite of what card 11 says. */
  { id: "cor-move-c", agent: "seed-agent-5", status: "Rejected", rows: [
    ["Queried", 90, "Query sent to Joan Whitfield"],
    ["Rejected", 10, "Rejected by Joan Whitfield"],
  ] },
];

/* ⚠️ RESEEDING CLEARS THE OLD ENTRIES FIRST. Writing over a shape that already holds documents
   leaves whatever a previous run's corrections added, and the count a check asserts stops being
   the count the seed guarantees. */
for (const s of SHAPES) {
  const existing = await getDocs(collection(db, "users", uid, "queries", s.id, "activity"));
  for (const d of existing.docs) {
    await deleteDoc(d.ref).catch(() => {});
    await deleteDoc(doc(db, "users", uid, "activities", d.id)).catch(() => {});
  }
}

const batch = writeBatch(db);
for (const s of SHAPES) {
  const first = s.rows[s.rows.length - 1];
  batch.set(doc(db, "users", uid, "queries", s.id), {
    id: s.id, userId: uid, agentId: s.agent, manuscriptId: MS_ID,
    dateSent: day(s.rows[0][1]), status: s.status,
    sendMethod: "Email", personalisationNotes: "", packageId: "",
  });
  s.rows.forEach(([status, daysAgo, description, note], i) =>
    entry(batch, s.id, MS_ID, `${s.id}-e${i + 1}`, status, daysAgo, description, note ?? ""));
  void first;
}
await batch.commit();

console.log("\nthe seed now GUARANTEES:");
for (const s of SHAPES) console.log(`  ${s.id.padEnd(12)} ${String(s.rows.length).padStart(2)} entries · ${s.status}`);
console.log(`
  cor-pair    request + the send answering it   → the dependency guard's cascade
  cor-closed  a removable closure event         → removing it reopens the query
  cor-move-a  move SOURCE, note names its agent → the stale-note check
  cor-move-b  move DESTINATION, open
  cor-move-c  move DESTINATION, closed          → "this does not reopen it"
  cor-undo    two removable sends               → a newer write retires a pending undo (CONSUMES one entry per run)
  every query carries a REAL Queried rung, so the root guard has a root and every LATER entry is removable.`);
process.exit(0);
