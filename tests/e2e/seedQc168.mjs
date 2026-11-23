/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query card v168 — the cards the one-way-to-edit locks read: Ava Lark's query (Queried with three things, the full
 * asked for with Ava's words, the full sent), two notes on it, and Ava's own old notes string (the agent card's note);
 * Bram Lark, a second agent to move the query to (and back).
 * ⚠️ Emulator only (fsTarget), and SELF-CLEANING: every document carries the `q168-` prefix; `--clean` removes them,
 *    each query's activity log first. The measure cleans in the same run.
 *
 *   node tests/e2e/seedQc168.mjs              # write them
 *   node tests/e2e/seedQc168.mjs --clean      # remove them
 *   node tests/e2e/seedQc168.mjs --read       # print the query, its log and its notes, as JSON (nothing written)
 *   node tests/e2e/seedQc168.mjs --restore-note n2   # put a deleted note back exactly as seeded
 */
import { targetEnv, TARGET_PROJECT } from "./fsTarget.mjs";
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, getDocs, deleteDoc, setDoc, collection, writeBatch } from "firebase/firestore";

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
const PREFIX = "q168-";
const DAY = 86_400_000;
const NOW = Date.now();
const iso = (daysAgo) => new Date(NOW - daysAgo * DAY).toISOString();
const Q = `${PREFIX}main`, AVA = `${PREFIX}ag-ava`, BRAM = `${PREFIX}ag-bram`;
const NOTES = {
  n1: { text: "Met Ava at the Bath festival. Ava remembered the pitch.", ago: 30 },
  n2: { text: "Ask about the second book if this goes well.", ago: 12 },
};
const noteDoc = (k) => ({ id: `${Q}-${k}`, userId: uid, queryId: Q, entryText: NOTES[k].text, createdAt: iso(NOTES[k].ago) });

async function wipe() {
  let gone = 0;
  for (const d of (await getDocs(collection(db, "users", uid, "queries"))).docs) {
    if (!d.id.startsWith(PREFIX)) continue;
    for (const a of (await getDocs(collection(db, "users", uid, "queries", d.id, "activity"))).docs) { await deleteDoc(a.ref); gone++; }
  }
  for (const coll of ["queries", "agents", "taskFlags", "activities", "tasks", "journalEntries"]) {
    for (const d of (await getDocs(collection(db, "users", uid, coll))).docs) {
      const x = d.data();
      if (d.id.startsWith(PREFIX) || String(x.queryId ?? "").startsWith(PREFIX) || String(x.agentId ?? "").startsWith(PREFIX)) { await deleteDoc(d.ref); gone++; }
    }
  }
  return gone;
}
if (process.argv.includes("--clean")) { console.log(`q168: removed ${await wipe()}`); process.exit(0); }
if (process.argv.includes("--read")) {
  const q = (await getDoc(doc(db, "users", uid, "queries", Q))).data() ?? null;
  const log = Object.fromEntries((await getDocs(collection(db, "users", uid, "queries", Q, "activity"))).docs.map((d) => {
    const x = d.data();
    return [d.id, { materials: x.materials ?? null, replyNote: x.replyNote ?? null, at: x.createdAt?.toDate?.().toISOString?.() ?? String(x.createdAt ?? "") }];
  }));
  const notes = Object.fromEntries((await getDocs(collection(db, "users", uid, "journalEntries"))).docs
    .filter((d) => String(d.data().queryId ?? "") === Q).map((d) => [d.id, d.data().entryText ?? null]));
  const ava = (await getDoc(doc(db, "users", uid, "agents", AVA))).data() ?? null;
  console.log(JSON.stringify({ agentId: q?.agentId ?? null, status: q?.status ?? null, log, notes,
    ava: ava ? { responseTimeWeeks: ava.responseTimeWeeks ?? null, noResponseMeansNo: ava.noResponseMeansNo ?? null, notes: ava.notes ?? null } : null }));
  process.exit(0);
}
const ri = process.argv.indexOf("--restore-note");
if (ri > 0) {
  const k = process.argv[ri + 1];
  await setDoc(doc(db, "users", uid, "journalEntries", `${Q}-${k}`), noteDoc(k));
  console.log(`q168: restored ${k}`);
  process.exit(0);
}
await wipe();

const b = writeBatch(db);
const agent = (id, name, extra = {}) => ({
  id, userId: uid, name, agency: "Lark & Field", email: `${id}@example.test`,
  website: "", genres: ["Literary Fiction"], notes: "", agentNotes: "", mswlNotes: "", twitter: "", bluesky: "", instagram: "", socials: [],
  city: "London", country: "GB", submissionStatus: "Open", submissionMethod: "Email", responseTimeWeeks: 8, starRating: 3, setAside: false,
  importedNeedsReview: false, dateAdded: iso(200), lastCheckedDate: iso(5), materialsWanted: ["Query letter", "Synopsis (2 pages)", "First 3 chapters"], ...extra,
});
b.set(doc(db, "users", uid, "agents", AVA), agent(AVA, "Ava Lark", { notes: "Ava prefers a short synopsis, one page if it can be." }));
b.set(doc(db, "users", uid, "agents", BRAM), agent(BRAM, "Bram Lark"));
b.set(doc(db, "users", uid, "queries", Q), {
  id: Q, userId: uid, agentId: AVA, manuscriptId: "seed-ms-1", dateSent: iso(40), status: "Full Sent", sendMethod: "Email",
  personalisationNotes: "QC168 fixture", packageId: "", materialsWanted: [], lastStatusChange: iso(18),
});
const STEPS = [
  ["sent", "Queried", "Query Sent", 40, [{ kind: "letter" }, { kind: "synopsis" }, { kind: "sample", unit: "chapters", n: 3 }], null],
  ["freq", "Full Requested", "Status Changed", 20, null, "Loved the opening. Please send the full when you can."],
  ["fsent", "Full Sent", "Status Changed", 18, [{ kind: "full" }], null],
];
for (const [sk, res, type, ago, m, words] of STEPS) {
  const act = `${Q}-${sk}`;
  b.set(doc(db, "users", uid, "activities", act), { id: act, userId: uid, queryId: Q, manuscriptId: "seed-ms-1", activityType: type, description: `${res} · Ava Lark`, date: iso(ago), details: "", resultingStatus: res });
  b.set(doc(db, "users", uid, "queries", Q, "activity", act), { type: res, resultingStatus: res, createdAt: new Date(iso(ago)), note: `${res} · Ava Lark`, queryId: Q, agentName: "Ava Lark", manuscriptTitle: "seed",
    ...(m ? { materials: m } : {}), ...(words ? { replyNote: words } : {}) });
}
for (const k of Object.keys(NOTES)) b.set(doc(db, "users", uid, "journalEntries", `${Q}-${k}`), noteDoc(k));
await b.commit().catch((e) => { console.error(`q168: refused: ${e.code}`); throw e; });
console.log("q168: seeded");
process.exit(0);
