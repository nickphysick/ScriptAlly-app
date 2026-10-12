/**
 * Comparable titles v25 — the harness fixture (dev only). One manuscript, written to the shared
 * harness account under ids of its own (`cv25-…`), shaped like the mock:
 *
 *   · 7 comps: 5 books (one with no publisher, one stored WITHOUT an id), 1 TV, 1 film
 *   · 3 query letters: v1 SENT with nothing recorded · v2 SENT and recorded [Tidewater, Salt Road]
 *     · v3 NOT SENT, recorded [Tidewater, Last Crossing]
 *   · 4 packages: Original (v1) · Standard (v2) · Light (v2 in its first edition) · Coastal (v3)
 *   · 14 queries: 5 with v1, 9 with v2 — resolved by all three routes (recorded versions, the
 *     package edition that went, the package's letter now); 6 of the 9 asked for more
 *
 *   node tests/e2e/seedCompsV25.mjs            # (re)write it — delete-before-write
 *   node tests/e2e/seedCompsV25.mjs --restore  # delete everything it wrote
 *   node tests/e2e/seedCompsV25.mjs --dump     # {"comps":[…],"letters":{id:compIds|null}} as stored (--ms <id> for another manuscript's comps)
 *   node tests/e2e/seedCompsV25.mjs --empty    # also write `cv25-ms-empty` (no comps)
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, deleteDoc, getDoc, getDocs, collection, query, where } from "firebase/firestore";

const env = (file) => Object.fromEntries(
  readFileSync(file, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }),
);
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
const PROJECT = dev.VITE_FIREBASE_PROJECT_ID;
if (PROJECT !== "scriptally-dev") throw new Error(`Refusing to seed "${PROJECT}" — this script is for scriptally-dev only.`);
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: PROJECT, appId: dev.VITE_FIREBASE_APP_ID });
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", PASSWORD);
const uid = user.uid;
const at = (...p) => doc(db, "users", uid, ...p);

export const MS = "cv25-ms";
export const MS_EMPTY = "cv25-ms-empty";
const L1 = "cv25-let-1", L2 = "cv25-let-2", L3 = "cv25-let-3", SYN = "cv25-syn-1";
const day = (d) => `${d}T12:00:00.000Z`;

const COMPS = [
  { id: "cmp_cv25tide", title: "The Tidewater Line", author: "R. Okafor", publisher: "Harvill", year: 2021, matchAxis: "Single day · Close third · Coastal", note: "A whole novel on one day on the water, told close to one narrator.", source: "user" },
  { id: "cmp_cv25salt", title: "Salt Road", author: "Imogen Hale", publisher: "Faber", year: 2023, matchAxis: "Irish coast · Missing brother", note: "Coastal Irish setting, a missing brother, short punchy chapters.", source: "user" },
  { id: "cmp_cv25nine", title: "Nine Miles Out", author: "Callum Reid", publisher: "BBC Two", year: 2022, media: "tv", matchAxis: "Ticking clock · Tides", note: "The tide as a clock. Same pace I want in the second half.", source: "user" },
  { id: "cmp_cv25brit", title: "Bright Water", author: "Aoife Brennan", publisher: "Tinder Press", year: 2024, matchAxis: "Family secrets · Harbour town", source: "user" },
  /* stored before comps had ids: the page gives it one on its next write (lock A1) */
  { title: "Kestrel Hour", author: "D. Lindqvist", publisher: "Orion", year: 2019, source: "user" },
  { id: "cmp_cv25ferr", title: "The Ferry at Dusk", author: "Mairead Quinn", year: 2025, matchAxis: "Donegal · One night", note: "Small-town Donegal, one long night, nobody telling the truth.", source: "user" },
  { id: "cmp_cv25last", title: "Last Crossing", author: "dir. Tom Arden", publisher: "Film4", year: 2023, media: "film", matchAxis: "Single journey", note: "One crossing, real time. The clock I’m borrowing.", source: "user" },
];
const LETTERS = [
  { id: L1, versionName: "Query letter v1", createdDate: day("2026-03-01") },
  { id: L2, versionName: "Query letter v2", createdDate: day("2026-05-20"), compIds: ["cmp_cv25tide", "cmp_cv25salt"] },
  { id: L3, versionName: "Query letter v3", createdDate: day("2026-09-25"), compIds: ["cmp_cv25tide", "cmp_cv25last"] },
];
const PKGS = [
  { id: "cv25-pkg-orig", packageName: "Original", letter: L1 },
  { id: "cv25-pkg-std", packageName: "Standard", letter: L2 },
  /* its letter is v2 in the edition that went; the edition is stored, so the query resolves by EDITION */
  { id: "cv25-pkg-light", packageName: "Light", letter: L2, editions: [{ n: 1, startedAt: day("2026-05-21"), summary: "QL v2", versions: [L2, SYN], queryLetterVersionId: L2, synopsisVersionId: SYN }], edition: 1 },
  { id: "cv25-pkg-coast", packageName: "Coastal", letter: L3 },
];
/* [id, name, agency, status, sent, route] — route: "pkg" (the package's letter now) · "ed" (the edition that went) · "ver" (recorded versions) */
const Q = [
  ["01", "Eleanor Whitfield", "Greenfield Literary", "Rejected", "2026-03-14", "pkg", "cv25-pkg-orig"],
  ["02", "William Tan", "Penrose & Lyle", "Rejected", "2026-04-11", "pkg", "cv25-pkg-orig"],
  ["03", "Priya Raman", "Raman & Rowe", "Queried", "2026-07-01", "pkg", "cv25-pkg-orig"],
  ["04", "Daniel O’Rourke", "Inkwell & Stone", "Queried", "2026-06-20", "pkg", "cv25-pkg-orig"],
  ["05", "Sophie Dunn", "Ashgrove Literary", "Partial Sent", "2026-06-03", "pkg", "cv25-pkg-orig"],
  ["06", "Clara Beaumont", "Harbour Lane", "Partial Requested", "2026-09-02", "ed", "cv25-pkg-light"],
  ["07", "Marcus Reed", "Bloomsbury Quill", "Partial Requested", "2026-09-10", "ver", "cv25-pkg-std"],
  ["08", "Tom Ellery", "Ellery & Finch", "Offer", "2026-08-22", "ed", "cv25-pkg-light"],
  ["09", "Jonathan Marsh", "The Marsh Agency", "Full Requested", "2026-09-24", "ed", "cv25-pkg-light"],
  ["10", "Aisha Kapoor", "The Lantern Agency", "Full Sent", "2026-06-03", "ed", "cv25-pkg-light"],
  ["11", "Hester Quinn", "Quinn Literary", "Partial Sent", "2026-07-12", "ed", "cv25-pkg-light"],
  ["12", "George Ashworth", "Ashworth Literary", "Rejected", "2026-08-20", "ver", "cv25-pkg-std"],
  ["13", "Nadia Hussain", "Northgate Literary", "Queried", "2026-09-30", "pkg", "cv25-pkg-std"],
  ["14", "Fenella Strand", "Brightwater Books", "Queried", "2026-09-28", "ver", "cv25-pkg-std"],
];
const agentId = (n) => `cv25-agent-${n}`, queryId = (n) => `cv25-q-${n}`;

async function clean() {
  for (const n of Q.map((q) => q[0])) { await deleteDoc(at("queries", queryId(n))); await deleteDoc(at("agents", agentId(n))); }
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
const ms = (id, comps) => ({
  id, userId: uid, title: "Murphy's Day Out", genre: "Thriller", ageCategory: "Adult", wordCount: 50000, logline: "",
  status: "Querying", statusChangedDate: "2026-03-01", comps, shelved: false,
});

if (process.argv.includes("--dump")) {
  /* `--ms <id>` dumps another of the fixture's manuscripts (the empty one, for comps v26's AD6) */
  const mi = process.argv.indexOf("--ms");
  const m = await getDoc(at("manuscripts", mi > -1 ? process.argv[mi + 1] : MS));
  const letters = {};
  const vs = await getDocs(query(collection(db, "users", uid, "versions"), where("manuscriptId", "==", MS)));
  for (const d of vs.docs) if (d.data().componentType === "Query Letter") letters[d.id] = { name: d.data().versionName, compIds: d.data().compIds ?? null };
  console.log(JSON.stringify({ comps: m.exists() ? (m.data().comps ?? []) : null, letters }));
  process.exit(0);
}
await clean();
if (process.argv.includes("--restore")) { console.log("removed the comps v25 fixture"); process.exit(0); }

const put = (path, data) => setDoc(at(...path), data).catch((e) => { console.error(`DENIED writing ${path.join("/")}: ${e.code}`); throw e; });
await put(["manuscripts", MS], ms(MS, COMPS));
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
    status: "Active", createdDate: day("2026-03-02"), ...(p.editions ? { editions: p.editions, edition: p.edition } : {}),
  });
}
for (const [n, name, agency, status, sent, route, pkg] of Q) {
  await put(["agents", agentId(n)], {
    id: agentId(n), userId: uid, name, agency, email: "", website: "", genres: ["Thriller"], mswlNotes: "", submissionStatus: "Open",
    submissionMethod: "Email", materialsWanted: ["Query Letter", "Synopsis"], dateAdded: day("2026-02-01"), lastCheckedDate: day("2026-02-01"), notes: "",
  });
  const p = PKGS.find((x) => x.id === pkg);
  await put(["queries", queryId(n)], {
    id: queryId(n), userId: uid, manuscriptId: MS, agentId: agentId(n), status, dateSent: day(sent), personalisationNotes: "", sendMethod: "Email",
    packageId: route === "ver" ? "" : pkg,
    ...(route === "ed" ? { sentHow: "package", sentPackageId: pkg, sentPackageEdition: 1, sentPackageName: p.packageName } : {}),
    ...(route === "ver" ? { sentHow: "individual", sentVersions: [p.letter, SYN], sentMaterials: "Query letter, synopsis", sentPackageName: p.packageName } : {}),
    ...(status !== "Queried" ? { lastStatusChange: day(sent) } : {}),
  });
}
console.log(`comps v25 fixture ready: ${MS} · ${COMPS.length} comps · ${LETTERS.length} letters · ${PKGS.length} packages · ${Q.length} queries`);
process.exit(0);
