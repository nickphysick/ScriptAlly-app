/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v40 — the fixture the PK40 locks read and write, on a manuscript of its own ("Locks of
 * v40", pk40-ms) so no other page's data moves. Every stage and every figure the page draws has a case:
 *
 *   pk40-std    "Standard"    OUT, active. Letter A, synopsis S, pages V1, extra "Author bio". Six queries, one
 *                             withdrawn: 5 sent · replied 3 · asked for more 2 · full request 1 → 40%.
 *   pk40-std2   "Standard 2"  OUT, copiedFromId pk40-std. Letter B, the rest the same. 4 sent · 1 asked → "1 of 4".
 *   pk40-ready  "Ready one"   READY: letter A and pages V1, no synopsis (a missing synopsis never blocks Ready).
 *   pk40-draft  "Draft one"   DRAFT: empty.
 *   pk40-old    "Old one"     RETIRED, out: letter A, no synopsis, pages V1. One query, passed.
 *   pk40-q12                  one query logged piece by piece (no package): letter A, no synopsis, pages V1.
 *
 * So, by piece (H3, credited from what each query recorded): letter A 7 sent (5 + 1 + 1) · letter B 4 ·
 * synopsis S 9 (5 + 4) · no synopsis 2 (pk40-old's and pk40-q12) · pages V1 11.
 *
 *   node tests/e2e/seedPk40.mjs           # write (clean first)
 *   node tests/e2e/seedPk40.mjs --dump    # print the packages and the manuscript, as stored
 *   node tests/e2e/seedPk40.mjs --clean   # remove every pk40- document
 *   node tests/e2e/seedPk40.mjs --long-name  # write, with the second letter named in 40 characters (v39.2 L7); a plain
 *                                            # write puts the short name back
 *
 * ⚠️ SELF-CLEANING: every document carries the `pk40-` prefix or `manuscriptId: "pk40-ms"`; the locks clean in afterAll.
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, getDocs, deleteDoc, collection, writeBatch } from "firebase/firestore";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("dev only");
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID });
const dbId = dev.VITE_FIREBASE_DATABASE_ID;
const db = !dbId || dbId === "(default)" ? getFirestore(app) : getFirestore(app, dbId);
const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", PASSWORD);
const uid = user.uid;
const PREFIX = "pk40-";
const MS = "pk40-ms";
const iso = (d) => new Date(Date.now() - d * 86_400_000).toISOString();
const day = (d) => iso(d).slice(0, 10);
const ref = (c, id) => doc(db, "users", uid, c, id);

async function clean() {
  let n = 0;
  for (const c of ["queries", "packages", "versions", "manuscripts", "activities"]) {
    const snap = await getDocs(collection(db, "users", uid, c));
    for (const d of snap.docs) {
      const x = d.data();
      if (d.id.startsWith(PREFIX) || x.manuscriptId === MS || x.manuscriptId === "pk40-new") { await deleteDoc(d.ref); n++; }
    }
  }
  return n;
}

if (process.argv.includes("--clean")) { console.log(`removed ${await clean()}`); process.exit(0); }
if (process.argv.includes("--dump")) {
  const out = {};
  for (const id of ["pk40-std", "pk40-std2", "pk40-ready", "pk40-draft", "pk40-old"]) out[id] = (await getDoc(ref("packages", id))).data() ?? null;
  out[MS] = (await getDoc(ref("manuscripts", MS))).data() ?? null;
  const pk = (await getDocs(collection(db, "users", uid, "packages"))).docs.map((d) => d.data()).filter((p) => p.manuscriptId === MS);
  out.all = pk.map((p) => ({ id: p.id, name: p.packageName, copiedFromId: p.copiedFromId ?? null, firstSentAt: !!p.firstSentAt, status: p.status }));
  console.log(JSON.stringify(out));
  process.exit(0);
}

await clean();
const b = writeBatch(db);
b.set(ref("manuscripts", MS), {
  id: MS, userId: uid, title: "Locks of v40", genre: "Literary Fiction", ageCategory: "Adult", wordCount: 80000, logline: "",
  status: "Querying", statusChangedDate: day(60), comps: [], shelved: false, activePackageId: "pk40-std",
  extras: [{ id: "pk40-ext", name: "Author bio" }],
  bookVersions: [
    { id: "pk40-v0", name: "Original", kind: "draft", createdDate: day(200), num: 0, original: true },
    { id: "pk40-v1", name: "Fast-paced opening", kind: "draft", createdDate: day(90), num: 1, parentId: "pk40-v0", changes: ["Cut the prologue"] },
  ],
  inUseBookVersionId: "pk40-v1",
});
const mat = (id, name, days, type) => b.set(ref("versions", id), {
  id, userId: uid, manuscriptId: MS, componentType: type, versionName: name, fileAttached: false,
  createdDate: iso(days), contentType: "text", contentDraft: `${name} — Dear agent, …`, wordCount: 4,
});
mat("pk40-let-a", "Hook-first", 80, "Query Letter");
/* v39.2 L7: a 40-character name, to prove the materials row never cuts a name off */
const LONG_NAME = "Comps-forward, for agents who ask for it";
mat("pk40-let-b", process.argv.includes("--long-name") ? LONG_NAME : "Comps-forward", 40, "Query Letter");
mat("pk40-syn", "One-page", 80, "Synopsis");
const pkg = (id, name, o) => b.set(ref("packages", id), {
  id, userId: uid, manuscriptId: MS, packageName: name, queryLetterVersionId: "", synopsisVersionId: "",
  samplePagesVersionId: "", status: "Active", createdDate: iso(70), edition: 1, icon: "box", extraIds: [], ...o,
});
pkg("pk40-std", "Standard", { queryLetterVersionId: "pk40-let-a", synopsisVersionId: "pk40-syn", bookVersionId: "pk40-v1", extraIds: ["pk40-ext"], otherMaterials: "Author bio", firstSentAt: iso(60), icon: "crown", note: "For most UK agents" });
pkg("pk40-std2", "Standard 2", { queryLetterVersionId: "pk40-let-b", synopsisVersionId: "pk40-syn", bookVersionId: "pk40-v1", extraIds: ["pk40-ext"], otherMaterials: "Author bio", firstSentAt: iso(30), icon: "crown", note: "Same as Standard, new letter", copiedFromId: "pk40-std", createdDate: iso(35) });
pkg("pk40-ready", "Ready one", { queryLetterVersionId: "pk40-let-a", bookVersionId: "pk40-v1", icon: "globe", createdDate: iso(10) });
pkg("pk40-draft", "Draft one", { createdDate: iso(5), icon: "flask" });
/* brand new: a manuscript of its own with nothing on it yet */
b.set(ref("manuscripts", "pk40-new"), { id: "pk40-new", userId: uid, title: "Blank of v40", genre: "Literary Fiction", ageCategory: "Adult", wordCount: 80000, logline: "", status: "Querying", statusChangedDate: day(2), comps: [], shelved: false });
pkg("pk40-old", "Old one", { queryLetterVersionId: "pk40-let-a", bookVersionId: "pk40-v1", firstSentAt: iso(150), status: "Retired", retiredAt: iso(100), createdDate: iso(160) });

const NAMES = { "pk40-std": "Standard", "pk40-std2": "Standard 2", "pk40-old": "Old one" };
let n = 0;
const q = (pk, status, days, versions, extra = {}) => {
  n++;
  const id = `pk40-q${n}`;
  const base = {
    id, userId: uid, agentId: `seed-agent-${((n - 1) % 12) + 1}`, manuscriptId: MS, dateSent: day(days), status, sendMethod: "Email",
    personalisationNotes: "", sentVersions: versions, bookVersionId: "pk40-v1", ...extra,
  };
  b.set(ref("queries", id), pk
    ? { ...base, packageId: pk, sentHow: "package", sentPackageId: pk, sentPackageEdition: 1, sentPackageName: NAMES[pk], sentMaterials: `${NAMES[pk]}: Query letter` }
    : { ...base, packageId: "", sentHow: "individual", sentMaterials: "Query letter Hook-first" });
};
/* Standard: 6 queries, one withdrawn → 5 sent; replied 3 (pass, partial, full); asked for more 2; full 1 */
for (const s of ["Queried", "Rejected", "Partial Requested", "Full Requested", "No Response", "Withdrawn"]) q("pk40-std", s, 55, ["pk40-let-a", "pk40-syn"]);
/* Standard 2: 4 sent, 1 asked for more → "1 of 4", unranked */
for (const s of ["Partial Requested", "Queried", "Rejected", "Queried"]) q("pk40-std2", s, 25, ["pk40-let-b", "pk40-syn"]);
/* Old one: retired, one query, no synopsis */
q("pk40-old", "Rejected", 140, ["pk40-let-a"]);
/* one query sent piece by piece: letter A, no synopsis */
q(null, "Queried", 20, ["pk40-let-a"]);
await b.commit();
console.log(`wrote ${MS}: 5 packages (out ×2, ready, draft, retired), 3 materials, ${n} queries`);
process.exit(0);
