/**
 * Comparable titles v32 — the harness fixture (CP32 locks; design-refs/comps-v32/). Its own manuscript and ids
 * (`cp32-…`) on the emulator's harness account, built from v30's shape:
 *
 *   · 7 comps: 5 books (one with no publisher, one with no note), 1 TV, 1 film
 *   · 6 query letters:
 *       v1 "Query letter v1"     SENT, nothing recorded, 5 queries                       → the striped band
 *       v2 "Query letter v2"     SENT [Tidewater, Salt Road], 9 queries, 6 asked
 *       hf "Hook-first"          SENT [Tidewater], 5 queries, 1 asked
 *       c4 "Covering letter 4"   SENT [Tidewater, Nine Miles Out], 5 queries, 2 asked    → IN USE (inUseLetterId)
 *       v3 "Query letter v3"     NOT SENT [Tidewater, Last Crossing]
 *       bd "Blank draft"         NOT SENT, recorded as naming none
 *   · so: Salt Road 6/9 = 67% · Tidewater 9/19 = 47% · Nine Miles Out 2/5 = 40% → podium 1 Salt, 2 Tidewater, 3 Nine
 *
 *   node tests/e2e/seedComps32.mjs             # (re)write it — delete-before-write
 *   node tests/e2e/seedComps32.mjs --restore   # delete everything it wrote
 *   node tests/e2e/seedComps32.mjs --dump      # {"comps":[…],"letters":{…},"notify":{…}} as stored
 *   node tests/e2e/seedComps32.mjs --empty     # also write `cp32-ms-empty` (no comps)
 *
 * Variants (each undone by a plain re-seed in the same run):
 *   --variant tie      Covering letter 4 has 6 queries, 4 asked: Salt 67%, Nine 67% (equal 1st), Tidewater 11/20 = 55% (3rd)
 *   --variant two      Covering letter 4 has 3 queries: Nine is under five, so two are ranked and the 3rd place is spare
 *   --variant nosent   no queries at all: nothing ranked, no band
 *
 * ⚠️ EMULATOR ONLY: `targetEnv()` is the demo project unless ALLOW_LIVE_FIRESTORE is set, and this pack never sets it.
 */
import { targetEnv, TARGET_PROJECT } from "./fsTarget.mjs";
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, deleteDoc, getDoc, getDocs, collection, query, where, updateDoc, deleteField } from "firebase/firestore";

const env = (file) => Object.fromEntries(
  readFileSync(file, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }),
);
const dev = targetEnv();
const local = existsSync(".env.local") ? env(".env.local") : {};
const PROJECT = dev.VITE_FIREBASE_PROJECT_ID;
if (PROJECT !== TARGET_PROJECT) throw new Error(`Refusing to seed "${PROJECT}".`);
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: PROJECT, appId: dev.VITE_FIREBASE_APP_ID });
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", PASSWORD);
const uid = user.uid;
const at = (...p) => doc(db, "users", uid, ...p);

export const MS = "cp32-ms";
export const MS_EMPTY = "cp32-ms-empty";
const L1 = "cp32-let-1", L2 = "cp32-let-2", LH = "cp32-let-hf", L4 = "cp32-let-c4", L3 = "cp32-let-3", LB = "cp32-let-bd", SYN = "cp32-syn-1";
const day = (d) => `${d}T12:00:00.000Z`;

const COMPS = [
  { id: "cmp_cp32tide", title: "The Tidewater Line", author: "R. Okafor", publisher: "Harvill", year: 2021, matchAxis: "Single day · Close third · Coastal", note: "A whole novel on one day on the water, told close to one narrator.", source: "user" },
  { id: "cmp_cp32salt", title: "Salt Road", author: "Imogen Hale", publisher: "Faber", year: 2023, matchAxis: "Irish coast · Missing brother", note: "Coastal Irish setting, a missing brother, short punchy chapters.", source: "user" },
  { id: "cmp_cp32nine", title: "Nine Miles Out", author: "Callum Reid", publisher: "BBC Two", year: 2022, media: "tv", matchAxis: "Ticking clock · Tides", note: "The tide as a clock. Same pace I want in the second half.", source: "user" },
  { id: "cmp_cp32brit", title: "Bright Water", author: "Aoife Brennan", publisher: "Tinder Press", year: 2024, matchAxis: "Family secrets · Harbour town", source: "user" },
  { id: "cmp_cp32kest", title: "Kestrel Hour", author: "D. Lindqvist", publisher: "Orion", year: 2019, source: "user" },
  { id: "cmp_cp32ferr", title: "The Ferry at Dusk", author: "Mairead Quinn", year: 2025, matchAxis: "Donegal · One night", note: "Small-town Donegal, one long night, nobody telling the truth.", source: "user" },
  { id: "cmp_cp32last", title: "Last Crossing", author: "dir. Tom Arden", publisher: "Film4", year: 2023, media: "film", matchAxis: "Single journey", note: "One crossing, real time. The clock I’m borrowing.", source: "user" },
];
const vi = process.argv.indexOf("--variant");
const VARIANT = vi > -1 ? process.argv[vi + 1] : null;
const LETTERS = [
  { id: L1, versionName: "Query letter v1", createdDate: day("2026-03-01") },
  { id: L2, versionName: "Query letter v2", createdDate: day("2026-05-20"), compIds: ["cmp_cp32tide", "cmp_cp32salt"] },
  { id: LH, versionName: "Hook-first", createdDate: day("2026-06-10"), compIds: ["cmp_cp32tide"] },
  { id: L4, versionName: "Covering letter 4", createdDate: day("2026-08-01"), compIds: ["cmp_cp32tide", "cmp_cp32nine"] },
  { id: L3, versionName: "Query letter v3", createdDate: day("2026-09-25"), compIds: ["cmp_cp32tide", "cmp_cp32last"] },
  { id: LB, versionName: "Blank draft", createdDate: day("2026-09-20"), compIds: [] },
];
const PKGS = [
  { id: "cp32-pkg-1", packageName: "Original", letter: L1 },
  { id: "cp32-pkg-2", packageName: "Standard", letter: L2 },
  { id: "cp32-pkg-hf", packageName: "Hook", letter: LH },
  { id: "cp32-pkg-c4", packageName: "Covering", letter: L4 },
];
/* [n, name, agency, status, sent, package] — every query resolves through its package's letter */
const V1 = [
  ["01", "Eleanor Whitfield", "Greenfield Literary", "Rejected", "2026-03-14"],
  ["02", "William Tan", "Penrose & Lyle", "Rejected", "2026-04-11"],
  ["03", "Priya Raman", "Raman & Rowe", "Queried", "2026-07-01"],
  ["04", "Daniel O’Rourke", "Inkwell & Stone", "Queried", "2026-06-20"],
  ["05", "Sophie Dunn", "Ashgrove Literary", "Partial Sent", "2026-06-03"],
].map((q) => [...q, "cp32-pkg-1"]);
const V2 = [
  ["06", "Clara Beaumont", "Harbour Lane", "Partial Requested", "2026-09-02"],
  ["07", "Marcus Reed", "Bloomsbury Quill", "Partial Requested", "2026-09-10"],
  ["08", "Tom Ellery", "Ellery & Finch", "Offer", "2026-08-22"],
  ["09", "Jonathan Marsh", "The Marsh Agency", "Full Requested", "2026-09-24"],
  ["10", "Aisha Kapoor", "The Lantern Agency", "Full Sent", "2026-06-03"],
  ["11", "Hester Quinn", "Quinn Literary", "Partial Sent", "2026-07-12"],
  ["12", "George Ashworth", "Ashworth Literary", "Rejected", "2026-08-20"],
  ["13", "Nadia Hussain", "Northgate Literary", "Queried", "2026-09-30"],
  ["14", "Fenella Strand", "Brightwater Books", "Queried", "2026-09-28"],
].map((q) => [...q, "cp32-pkg-2"]);
const HF = [
  ["15", "Aidan Keane", "Keane Literary", "Full Requested", "2026-06-14"],
  ["16", "Dev Ghosh", "Lantern House", "Queried", "2026-07-09"],
  ["17", "Hattie Bell", "Bell Rowan", "Rejected", "2026-07-09"],
  ["18", "Iona Craig", "Craig & Mull", "Rejected", "2026-07-15"],
  ["19", "Noel Tierney", "Tierney Associates", "Queried", "2026-07-15"],
].map((q) => [...q, "cp32-pkg-hf"]);
const C4_ALL = [
  ["20", "Freya Dalgleish", "Tideway Literary", "Partial Requested", "2026-10-01"],
  ["21", "Priya Nair", "Nair Associates", "Full Requested", "2026-10-01"],
  ["22", "Owen Hartigan", "Hartigan & Lowe", "Queried", "2026-10-06"],
  ["23", "Sadia Akhtar", "Northlight", "Rejected", "2026-08-28"],
  ["24", "Edie Whitlock", "Whitlock Pryce", "Rejected", "2026-09-03"],
  ["25", "Rosa Salter", "Salter & Byrne", "Partial Requested", "2026-10-08"],
  ["26", "Lena Moretti", "Quay Street", "Partial Requested", "2026-10-09"],
].map((q) => [...q, "cp32-pkg-c4"]);
/* default: 20–24 (2 asked of 5) · tie: 20–22, 24–26 (4 of 6) · two: 20–22 (2 of 3) */
const C4 = VARIANT === "tie" ? C4_ALL.filter((q) => q[0] !== "23") : VARIANT === "two" ? C4_ALL.slice(0, 3) : C4_ALL.slice(0, 5);
const ALL_Q = [...V1, ...V2, ...HF, ...C4_ALL];
const Q = VARIANT === "nosent" ? [] : [...V1, ...V2, ...HF, ...C4];
const agentId = (n) => `cp32-agent-${n}`, queryId = (n) => `cp32-q-${n}`;

async function clean() {
  for (const n of ALL_Q.map((q) => q[0])) { await deleteDoc(at("queries", queryId(n))); await deleteDoc(at("agents", agentId(n))); }
  /* the Scout's one leaf, written by the page (CP32 SC1) */
  await updateDoc(doc(db, "users", uid), { "notifyPrefs.comps": deleteField() }).catch(() => undefined);
  /* a "New version" made by a measurement is a version of this manuscript under an id of the app's own */
  const mine = await getDocs(query(collection(db, "users", uid, "versions"), where("manuscriptId", "==", MS)));
  for (const d of mine.docs) await deleteDoc(d.ref);
  for (const p of PKGS) await deleteDoc(at("packages", p.id));
  for (const id of [MS, MS_EMPTY]) {
    const feed = await getDocs(query(collection(db, "users", uid, "activities"), where("manuscriptId", "==", id)));
    for (const d of feed.docs) await deleteDoc(d.ref);
    await deleteDoc(at("manuscripts", id));
  }
}
const ms = (id, comps, extra = {}) => ({
  id, userId: uid, title: "Murphy's Day Out", genre: "Thriller", ageCategory: "Adult", wordCount: 50000, logline: "",
  status: "Querying", statusChangedDate: "2026-03-01", comps, shelved: false, ...extra,
});

if (process.argv.includes("--dump")) {
  const mi = process.argv.indexOf("--ms");
  const m = await getDoc(at("manuscripts", mi > -1 ? process.argv[mi + 1] : MS));
  const letters = {};
  const vs = await getDocs(query(collection(db, "users", uid, "versions"), where("manuscriptId", "==", MS)));
  for (const d of vs.docs) if (d.data().componentType === "Query Letter") letters[d.id] = { name: d.data().versionName, compIds: d.data().compIds ?? null };
  const u = await getDoc(doc(db, "users", uid));
  console.log(JSON.stringify({ comps: m.exists() ? (m.data().comps ?? []) : null, letters, notify: u.data()?.notifyPrefs ?? {} }));
  process.exit(0);
}
await clean();
if (process.argv.includes("--restore")) { console.log("removed the comps v32 fixture"); process.exit(0); }

const put = (path, data) => setDoc(at(...path), data).catch((e) => { console.error(`DENIED writing ${path.join("/")}: ${e.code}`); throw e; });
await put(["manuscripts", MS], ms(MS, COMPS, { inUseLetterId: L4 }));
if (process.argv.includes("--empty")) await put(["manuscripts", MS_EMPTY], ms(MS_EMPTY, []));
for (const l of LETTERS) {
  await put(["versions", l.id], {
    id: l.id, manuscriptId: MS, userId: uid, componentType: "Query Letter", versionName: l.versionName, fileAttached: false,
    createdDate: l.createdDate, contentType: "text", contentDraft: "Dear agent,", wordCount: 2, ...(l.compIds ? { compIds: l.compIds } : {}),
  });
}
await put(["versions", SYN], { id: SYN, manuscriptId: MS, userId: uid, componentType: "Synopsis", versionName: "Synopsis, 1 page", fileAttached: false, createdDate: day("2026-03-01"), contentType: "text", contentDraft: "It begins on the water.", wordCount: 5 });
for (const p of PKGS) {
  await put(["packages", p.id], {
    id: p.id, manuscriptId: MS, userId: uid, packageName: p.packageName, queryLetterVersionId: p.letter, synopsisVersionId: SYN, samplePagesVersionId: "",
    status: "Active", createdDate: day("2026-03-02"),
  });
}
for (const [n, name, agency, status, sent, pkg] of Q) {
  await put(["agents", agentId(n)], {
    id: agentId(n), userId: uid, name, agency, email: "", website: "", genres: ["Thriller"], mswlNotes: "", submissionStatus: "Open",
    submissionMethod: "Email", materialsWanted: ["Query Letter", "Synopsis"], dateAdded: day("2026-02-01"), lastCheckedDate: day("2026-02-01"), notes: "",
  });
  await put(["queries", queryId(n)], {
    id: queryId(n), userId: uid, manuscriptId: MS, agentId: agentId(n), status, dateSent: day(sent), personalisationNotes: "", sendMethod: "Email",
    packageId: pkg, ...(status !== "Queried" ? { lastStatusChange: day(sent) } : {}),
  });
}
console.log(`comps v32 fixture ready${VARIANT ? ` (variant ${VARIANT})` : ""}: ${MS} · ${COMPS.length} comps · ${LETTERS.length} letters · ${PKGS.length} packages · ${Q.length} queries`);
process.exit(0);
