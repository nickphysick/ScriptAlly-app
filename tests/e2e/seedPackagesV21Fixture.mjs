/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE SUBMISSION-PACKAGES v2.1 FIXTURE (28 Sep) — four states, all prefixed `pkg21-` ══════════
 *
 * §P.5: this run's own data only. Every id starts `pkg21-`; nothing here reads, writes or wipes the
 * query-actions session's fixtures, and the agents are this fixture's own (never `seed-agent-N`), so a
 * query count on a shared agent cannot move under another session's lock.
 *
 *   pkg21-ms-filled   the v2 mock's four packages (Autumn round sent + used for new queries · Agents
 *                     with MSWL sent · Winter draft unsent · Spring round sent + RETIRED), three
 *                     letters, two synopses, three versions, 18 packaged queries.
 *   pkg21-ms-retired  every package retired (two, one sent) — the "Nothing in use" state (E4).
 *   pkg21-ms-none     materials and ZERO packages — the empty state.
 *   pkg21-ms-putaway  one letter already put away (status Retired) and a package still holding it — the
 *                     Put away section's rendered lock (v2's deferred item).
 *   pkg21-agent-plain an agent that states NO materials, so no package can match its guidelines (V9).
 *
 * ⚠️ DELETE-BEFORE-WRITE, RESTORE IN THE SAME RUN. `--restore` deletes everything above plus any
 * package, material or feed item a run created on the four manuscripts.
 *
 *   node tests/e2e/seedPackagesV21Fixture.mjs             write all four
 *   node tests/e2e/seedPackagesV21Fixture.mjs --restore   delete everything this fixture owns
 *   node tests/e2e/seedPackagesV21Fixture.mjs --dump <ms> print that manuscript's packages, materials,
 *                                                          book versions and activePackageId
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

const F = "pkg21-ms-filled", R = "pkg21-ms-retired", N = "pkg21-ms-none", P = "pkg21-ms-putaway";
const MSS = [F, R, N, P];
const DAY = 86400000;
const iso = (daysAgo) => new Date(Date.now() - daysAgo * DAY).toISOString();
const words = (n) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");

const AGENTS = [
  { id: "pkg21-agent-a", name: "Pkgtwentyone Arden", materials: ["Query letter", "Synopsis"] },
  { id: "pkg21-agent-b", name: "Pkgtwentyone Bexley", materials: ["Query letter"] },
  { id: "pkg21-agent-plain", name: "Pkgtwentyone Plainagent", materials: [] },
];

/* letters and synopses — the mock's names; `text` is the saved body the drawer shows */
const LETTER = "Dear [Agent],\n\nI am seeking representation for MURPHY'S DAY OUT.\n\nFerry skipper Liam Murphy has until the tide turns.";
const MATS = [
  { id: "pkg21-l3", ms: F, t: "Query Letter", name: "Query letter v3", w: 310, d: 28, text: LETTER },
  { id: "pkg21-l2", ms: F, t: "Query Letter", name: "Query letter v2", w: 355, d: 117 },
  { id: "pkg21-l1", ms: F, t: "Query Letter", name: "Query letter v1", w: 402, d: 210 },
  { id: "pkg21-s1", ms: F, t: "Synopsis", name: "Synopsis, 1 page", w: 480, d: 30 },
  { id: "pkg21-s3", ms: F, t: "Synopsis", name: "Synopsis, 3 pages", w: 1420, d: 105 },
  { id: "pkg21-rl1", ms: R, t: "Query Letter", name: "Query letter v1", w: 330, d: 90 },
  { id: "pkg21-rs1", ms: R, t: "Synopsis", name: "Synopsis, 1 page", w: 470, d: 88 },
  { id: "pkg21-nl1", ms: N, t: "Query Letter", name: "Query letter v1", w: 310, d: 12 },
  { id: "pkg21-ns1", ms: N, t: "Synopsis", name: "Synopsis, 1 page", w: 480, d: 10 },
  { id: "pkg21-pla", ms: P, t: "Query Letter", name: "Query letter v2", w: 300, d: 20 },
  { id: "pkg21-plb", ms: P, t: "Query Letter", name: "Query letter v1 (old)", w: 390, d: 120, away: true },
  { id: "pkg21-ps1", ms: P, t: "Synopsis", name: "Synopsis, 1 page", w: 480, d: 40 },
];
const BV = {
  [F]: [
    { id: "pkg21-v1", name: "Prologue first", kind: "initial", createdDate: iso(208).slice(0, 10) },
    { id: "pkg21-v2", name: "Dual timeline edit", kind: "revision", createdDate: iso(105).slice(0, 10), note: "Cut the prologue; opens on the ferry." },
    { id: "pkg21-v3", name: "Fast-paced opening", kind: "revision", createdDate: iso(25).slice(0, 10) },
  ],
  [R]: [{ id: "pkg21-rv1", name: "First draft", kind: "initial", createdDate: iso(95).slice(0, 10) }],
  [N]: [{ id: "pkg21-nv1", name: "First draft", kind: "initial", createdDate: iso(20).slice(0, 10) }],
  [P]: [{ id: "pkg21-pv1", name: "First draft", kind: "initial", createdDate: iso(60).slice(0, 10) }],
};
const PKGS = [
  { id: "pkg21-p1", ms: F, name: "Autumn round", ql: "pkg21-l3", syn: "pkg21-s1", bv: "pkg21-v3", other: "Author bio in the email body", note: "Sending in batches of five, Tuesdays.", sent: 22, status: "Active" },
  { id: "pkg21-p2", ms: F, name: "Agents with MSWL", ql: "pkg21-l2", syn: "pkg21-s3", bv: "pkg21-v2", sent: 103, status: "Active" },
  { id: "pkg21-p4", ms: F, name: "Winter draft", ql: "pkg21-l3", syn: "pkg21-s3", bv: "pkg21-v3", note: "For agents who ask for a longer synopsis.", status: "Active" },
  { id: "pkg21-p3", ms: F, name: "Spring round", ql: "pkg21-l1", syn: "", bv: "pkg21-v1", sent: 203, status: "Retired" },
  { id: "pkg21-r1", ms: R, name: "First round", ql: "pkg21-rl1", syn: "pkg21-rs1", bv: "pkg21-rv1", sent: 80, status: "Retired" },
  { id: "pkg21-r2", ms: R, name: "Letter only", ql: "pkg21-rl1", syn: "", status: "Retired" },
  { id: "pkg21-pp1", ms: P, name: "Early round", ql: "pkg21-plb", syn: "pkg21-ps1", bv: "pkg21-pv1", sent: 110, status: "Active" },
];
const ACTIVE = { [F]: "pkg21-p1", [P]: "pkg21-pp1" };
/* packaged queries: [package, status, daysAgo, agent] */
const SENDS = [
  ...Array(5).fill(["pkg21-p1", "Queried", 20]), ["pkg21-p1", "Partial Requested", 21], ["pkg21-p1", "Partial Requested", 19], ["pkg21-p1", "Full Requested", 22],
  ["pkg21-p2", "Queried", 90], ["pkg21-p2", "Partial Sent", 100], ...Array(3).fill(["pkg21-p2", "Rejected", 101]),
  ...Array(5).fill(["pkg21-p3", "Rejected", 200]),
  ["pkg21-r1", "Rejected", 78], ["pkg21-pp1", "Queried", 100],
];
const QIDS = SENDS.map((_, i) => `pkg21-q${i + 1}`);
const pkgMs = Object.fromEntries(PKGS.map((p) => [p.id, p.ms]));

const msRef = (id) => doc(db, "users", uid, "manuscripts", id);
const col = (name, ms) => getDocs(query(collection(db, "users", uid, name), where("manuscriptId", "==", ms)));

async function clearAll() {
  for (const q of QIDS) await deleteDoc(doc(db, "users", uid, "queries", q));
  for (const ms of MSS) {
    for (const name of ["packages", "versions", "activities", "queries"]) {
      for (const d of (await col(name, ms)).docs) await deleteDoc(d.ref);
    }
    await deleteDoc(msRef(ms));
  }
  for (const a of AGENTS) await deleteDoc(doc(db, "users", uid, "agents", a.id));
  /* The app's self-heal writes an "Agent Added" feed row for every agent it finds without one
     (`act-added-agent-<agentId>`, no manuscriptId), so the per-manuscript sweep above cannot reach it.
     Left behind, it is a feed line naming an agent that no longer exists (found 28 Sep: three). */
  for (const a of AGENTS) await deleteDoc(doc(db, "users", uid, "activities", `act-added-agent-${a.id}`));
}

if (process.argv.includes("--dump")) {
  const ms = process.argv[process.argv.indexOf("--dump") + 1] ?? F;
  const m = (await getDoc(msRef(ms))).data();
  const pk = (await col("packages", ms)).docs.map((d) => d.data());
  const vs = (await col("versions", ms)).docs.map((d) => d.data());
  console.log(JSON.stringify({
    activePackageId: m?.activePackageId ?? null,
    bookVersions: (m?.bookVersions ?? []).map((b) => ({ id: b.id, name: b.name, note: b.note ?? null })),
    materials: vs.map((v) => ({ id: v.id, name: v.versionName, status: v.status ?? "Active" })),
    packages: pk.map((p) => ({ id: p.id, name: p.packageName, ql: p.queryLetterVersionId, syn: p.synopsisVersionId, bv: p.bookVersionId ?? null, status: p.status, sent: !!p.firstSentAt })),
  }));
  process.exit(0);
}

await clearAll();
if (process.argv.includes("--restore")) { console.log("pkg21 fixture removed"); process.exit(0); }

for (const a of AGENTS) {
  await setDoc(doc(db, "users", uid, "agents", a.id), {
    id: a.id, userId: uid, name: a.name, agency: "Pkg21 Literary", email: "", website: "", genres: [],
    mswlNotes: "", submissionStatus: "Open", submissionMethod: "Email", materialsWanted: a.materials,
    dateAdded: iso(300), lastCheckedDate: iso(300), notes: "",
  });
}
for (const ms of MSS) {
  await setDoc(msRef(ms), {
    id: ms, userId: uid, title: "Murphy's Day Out", genre: "Thriller", ageCategory: "Adult",
    wordCount: 50000, logline: "", status: "Querying", statusChangedDate: iso(0).slice(0, 10),
    comps: [], shelved: false, bookVersions: BV[ms], ...(ACTIVE[ms] ? { activePackageId: ACTIVE[ms] } : {}),
  });
}
for (const m of MATS) {
  await setDoc(doc(db, "users", uid, "versions", m.id), {
    id: m.id, userId: uid, manuscriptId: m.ms, componentType: m.t, versionName: m.name,
    fileAttached: false, createdDate: iso(m.d), contentType: "text", contentDraft: m.text ?? words(m.w), wordCount: m.w,
    ...(m.away ? { status: "Retired" } : {}),
  });
}
for (const p of PKGS) {
  await setDoc(doc(db, "users", uid, "packages", p.id), {
    id: p.id, userId: uid, manuscriptId: p.ms, packageName: p.name,
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
    id: QIDS[i], userId: uid, manuscriptId: pkgMs[pkg], agentId: AGENTS[i % 2].id,
    packageId: pkg, status, dateSent: iso(d).slice(0, 10), sendMethod: "Email", personalisationNotes: "",
    ...(status !== "Queried" ? { hasAgentResponded: true } : {}), ...reqd, ...rej,
  });
}
console.log(MSS.join(" "));
process.exit(0);
