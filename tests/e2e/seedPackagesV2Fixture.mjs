/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE SUBMISSION-PACKAGES v2 FIXTURE (27 Sep) — the mock's four packages, and none ════════════
 *
 * Two manuscripts titled as the mock's own (`Murphy's Day Out`), told apart by id:
 *
 *   seed-ms-pkgv2   three letters, two synopses, three book versions, and the mock's four packages:
 *                   Autumn round (sent, active, "used for new queries") · Agents with MSWL (sent) ·
 *                   Winter draft (unsent) · Spring round (sent, RETIRED); 18 packaged queries across
 *                   Queried / Requested / Sent / Closed, on seed.mjs's agents.
 *   seed-ms-pkgv2e  materials (a letter, a synopsis, a version) and ZERO packages — the empty state.
 *
 * ⚠️ DELETE-BEFORE-WRITE, RESTORE IN THE SAME RUN: every id is fixed and prefixed `pv2`, the default
 * run deletes them all first, and `--restore` deletes them (plus any package the page CREATED on
 * either fixture manuscript, and their feed items) and is called by the suite's own afterAll.
 *
 *   node tests/e2e/seedPackagesV2Fixture.mjs             write both
 *   node tests/e2e/seedPackagesV2Fixture.mjs --restore   delete everything this fixture owns
 *   node tests/e2e/seedPackagesV2Fixture.mjs --dump      print the fixture's packages + activePackageId
 *   node tests/e2e/seedPackagesV2Fixture.mjs --plan      print the harness account's plan
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, deleteDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

const env = (file) => Object.fromEntries(
  readFileSync(file, "utf8").split("\n")
    .map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }),
);
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
const PROJECT = dev.VITE_FIREBASE_PROJECT_ID;
if (PROJECT !== "scriptally-dev") throw new Error(`Refusing to seed "${PROJECT}" — this script is for scriptally-dev only.`);
const EMAIL = process.env.SA_E2E_EMAIL ?? "harness@scriptally.test";
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");

const app = initializeApp({
  apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: PROJECT,
  storageBucket: dev.VITE_FIREBASE_STORAGE_BUCKET, messagingSenderId: dev.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: dev.VITE_FIREBASE_APP_ID,
});
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(getAuth(app), EMAIL, PASSWORD);
const uid = user.uid;

const FILLED = "seed-ms-pkgv2";
const EMPTY = "seed-ms-pkgv2e";
const DAY = 86400000;
const iso = (daysAgo) => new Date(Date.now() - daysAgo * DAY).toISOString();
const words = (n) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");

/* letters and synopses: users/{uid}/versions — the mock's names and word counts */
const MATS = [
  { id: "pv2-l3", ms: FILLED, t: "Query Letter", name: "Query letter v3", w: 310, d: 28 },
  { id: "pv2-l2", ms: FILLED, t: "Query Letter", name: "Query letter v2", w: 355, d: 117 },
  { id: "pv2-l1", ms: FILLED, t: "Query Letter", name: "Query letter v1", w: 402, d: 210 },
  { id: "pv2-s1", ms: FILLED, t: "Synopsis", name: "Synopsis, 1 page", w: 480, d: 30 },
  { id: "pv2-s3", ms: FILLED, t: "Synopsis", name: "Synopsis, 3 pages", w: 1420, d: 105 },
  { id: "pv2e-l1", ms: EMPTY, t: "Query Letter", name: "Query letter v1", w: 310, d: 12 },
  { id: "pv2e-s1", ms: EMPTY, t: "Synopsis", name: "Synopsis, 1 page", w: 480, d: 10 },
];
/* book versions: Manuscript.bookVersions (no word count — BookVersion has none) */
const BV = {
  [FILLED]: [
    { id: "pv2-v1", name: "Prologue first", kind: "initial", createdDate: iso(208) },
    { id: "pv2-v2", name: "Dual timeline edit", kind: "revision", createdDate: iso(105) },
    { id: "pv2-v3", name: "Fast-paced opening", kind: "revision", createdDate: iso(25) },
  ],
  [EMPTY]: [{ id: "pv2e-v1", name: "First draft", kind: "initial", createdDate: iso(20) }],
};
const PKGS = [
  { id: "pv2-p1", name: "Autumn round", ql: "pv2-l3", syn: "pv2-s1", bv: "pv2-v3", other: "Author bio in the email body", note: "Sending in batches of five, Tuesdays.", sent: 22, status: "Active" },
  { id: "pv2-p2", name: "Agents with MSWL", ql: "pv2-l2", syn: "pv2-s3", bv: "pv2-v2", sent: 103, status: "Active" },
  { id: "pv2-p4", name: "Winter draft", ql: "pv2-l3", syn: "pv2-s3", bv: "pv2-v3", note: "For agents who ask for a longer synopsis.", status: "Active" },
  { id: "pv2-p3", name: "Spring round", ql: "pv2-l1", syn: "", bv: "pv2-v1", sent: 203, status: "Retired" },
];
/* 18 packaged queries: Queried · Partial/Full Requested · Partial Sent · Rejected (closed) */
const SENDS = [
  ...Array(5).fill(["pv2-p1", "Queried", 20]), ["pv2-p1", "Partial Requested", 21], ["pv2-p1", "Partial Requested", 19], ["pv2-p1", "Full Requested", 22],
  ["pv2-p2", "Queried", 90], ["pv2-p2", "Partial Sent", 100], ...Array(3).fill(["pv2-p2", "Rejected", 101]),
  ...Array(5).fill(["pv2-p3", "Rejected", 200]),
];
const QIDS = SENDS.map((_, i) => `pv2-q${i + 1}`);

const msRef = (id) => doc(db, "users", uid, "manuscripts", id);

async function clearAll() {
  for (const m of MATS) await deleteDoc(doc(db, "users", uid, "versions", m.id));
  for (const q of QIDS) await deleteDoc(doc(db, "users", uid, "queries", q));
  for (const ms of [FILLED, EMPTY]) {
    /* every package on a fixture manuscript — including ones the page created during a run */
    for (const d of (await getDocs(query(collection(db, "users", uid, "packages"), where("manuscriptId", "==", ms)))).docs) await deleteDoc(d.ref);
    for (const d of (await getDocs(query(collection(db, "users", uid, "versions"), where("manuscriptId", "==", ms)))).docs) await deleteDoc(d.ref);
    for (const d of (await getDocs(query(collection(db, "users", uid, "activities"), where("manuscriptId", "==", ms)))).docs) await deleteDoc(d.ref);
    await deleteDoc(msRef(ms));
  }
}

/* `--plan` prints the harness account's plan — P1 needs to know it is proving access on FREE */
if (process.argv.includes("--plan")) {
  console.log(String((await getDoc(doc(db, "users", uid))).data()?.plan ?? "none"));
  process.exit(0);
}

if (process.argv.includes("--dump")) {
  const pk = (await getDocs(query(collection(db, "users", uid, "packages"), where("manuscriptId", "==", FILLED)))).docs.map((d) => d.data());
  const ms = (await getDoc(msRef(FILLED))).data();
  console.log(JSON.stringify({ activePackageId: ms?.activePackageId ?? null, packages: pk.map((p) => ({ id: p.id, name: p.packageName, ql: p.queryLetterVersionId, syn: p.synopsisVersionId, bv: p.bookVersionId ?? null, status: p.status, sent: !!p.firstSentAt, note: p.note ?? null })) }));
  process.exit(0);
}

await clearAll();
if (process.argv.includes("--restore")) { console.log("pv2 fixture removed"); process.exit(0); }

const base = (id, pkgActive) => ({
  id, userId: uid, title: "Murphy's Day Out", genre: "Thriller", ageCategory: "Adult",
  wordCount: 50000, logline: "", status: "Querying", statusChangedDate: iso(0).slice(0, 10),
  comps: [], shelved: false, bookVersions: BV[id], ...(pkgActive ? { activePackageId: pkgActive } : {}),
});
await setDoc(msRef(FILLED), base(FILLED, "pv2-p1"));
await setDoc(msRef(EMPTY), base(EMPTY, null));
for (const m of MATS) {
  await setDoc(doc(db, "users", uid, "versions", m.id), {
    id: m.id, userId: uid, manuscriptId: m.ms, componentType: m.t, versionName: m.name,
    fileAttached: false, createdDate: iso(m.d), contentType: "text", contentDraft: words(m.w), wordCount: m.w,
  });
}
for (const p of PKGS) {
  await setDoc(doc(db, "users", uid, "packages", p.id), {
    id: p.id, userId: uid, manuscriptId: FILLED, packageName: p.name,
    queryLetterVersionId: p.ql, synopsisVersionId: p.syn, samplePagesVersionId: "",
    ...(p.bv ? { bookVersionId: p.bv } : {}), ...(p.other ? { otherMaterials: p.other } : {}),
    ...(p.note ? { note: p.note } : {}), ...(p.sent ? { firstSentAt: iso(p.sent) } : {}),
    status: p.status, createdDate: iso((p.sent ?? 5) + 2),
  });
}
for (let i = 0; i < SENDS.length; i++) {
  const [pkg, status, d] = SENDS[i];
  const reqd = status === "Partial Requested" || status === "Partial Sent" ? { partialRequestedDate: iso(d - 12).slice(0, 10) }
    : status === "Full Requested" ? { fullRequestedDate: iso(d - 10).slice(0, 10) } : {};
  const rej = status === "Rejected" ? { rejectedDate: iso(d - 35).slice(0, 10) } : {};
  await setDoc(doc(db, "users", uid, "queries", QIDS[i]), {
    id: QIDS[i], userId: uid, manuscriptId: FILLED, agentId: `seed-agent-${(i % 12) + 1}`,
    packageId: pkg, status, dateSent: iso(d).slice(0, 10), sendMethod: "Email", personalisationNotes: "",
    ...(status !== "Queried" ? { hasAgentResponded: true } : {}), ...reqd, ...rej,
  });
}
console.log(`${FILLED} ${EMPTY}`);
process.exit(0);
