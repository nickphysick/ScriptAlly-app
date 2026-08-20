/**
 * Seed the dev test account with MATERIALS + PACKAGES, so the Submission packages overview can be
 * measured in its populated state as well as its first-visit one.
 *
 * ⚠️ WHY THIS IS SEPARATE FROM `seed.mjs` RATHER THAN FOLDED INTO IT. `seed.mjs` writes every query
 * with `packageId: ""` and other measurements rely on that fixture. Attaching packages to those
 * queries would quietly change a shared baseline; this script only ADDS documents, under its own
 * `seed-pkg*` id prefix, so `seed.mjs` remains the authority on what it owns and either can be
 * re-run without fighting the other.
 *
 * ⚠️ AND THE PACKAGED QUERIES ARE CREATED, NOT UPDATED — that is a RULES constraint, not a style
 * choice. `packageId` is required by `isValidQuery` (so it must be present at create) but is NOT in
 * the query UPDATE allowlist:
 *
 *     incoming().diff(existing()).affectedKeys().hasOnly([... no 'packageId' ...])
 *
 * so an update that CHANGES packageId fails `hasOnly` and the whole write is denied — silently, the
 * way every affectedKeys omission in this codebase has been. Writing new documents sidesteps it
 * honestly instead of appearing to work. (The same gap affects the app itself — see F7 in
 * reports/submission-packages-restructure.md.)
 *
 * ⚠️ DEV ONLY, PROJECT NAMED EXPLICITLY, same rail as `seed.mjs`: `.firebaserc`'s default is PROD.
 *
 *   node tests/e2e/seedPackages.mjs --clean && node tests/e2e/seedPackages.mjs
 *
 * ⚠️ RUN `--clean` FIRST IF THE FIXTURE MAY ALREADY EXIST. `setDoc` over an existing document is an
 * UPDATE at the rules layer, and this script recomputes `createdDate` on every run — a key the
 * versions update allowlist does not carry, so `hasOnly` denies the whole write. It is only
 * idempotent against an absent fixture; clean-then-seed always works.
 *
 * To undo: `node tests/e2e/seedPackages.mjs --clean` removes every document it created.
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, deleteDoc, collection, getDocs, writeBatch } from "firebase/firestore";

const env = (file) => Object.fromEntries(
  readFileSync(file, "utf8").split("\n")
    .map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }),
);

const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
const PROJECT = dev.VITE_FIREBASE_PROJECT_ID;
if (PROJECT !== "scriptally-dev") {
  throw new Error(`Refusing to seed "${PROJECT}" — this script is for scriptally-dev only.`);
}
const EMAIL = process.env.SA_E2E_EMAIL ?? "harness@scriptally.test";
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");
const CLEAN = process.argv.includes("--clean");

const app = initializeApp({
  apiKey: dev.VITE_FIREBASE_API_KEY,
  authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: PROJECT,
  storageBucket: dev.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: dev.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: dev.VITE_FIREBASE_APP_ID,
});
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(getAuth(app), EMAIL, PASSWORD);
const uid = user.uid;
console.log(`signed in as ${EMAIL} on ${PROJECT}`);

const iso = (daysAgo) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();
const MS_ID = "seed-ms-1";

/* The four materials the ref's register draws — two covering letters so the type groups with more
   than one member, and a sample with a real draft so the word count has something to count. */
const MATERIALS = [
  { id: "seed-mat-ql1", componentType: "Query Letter", versionName: "Hook-first", days: 4 },
  { id: "seed-mat-ql2", componentType: "Query Letter", versionName: "Comps-forward", days: 14 },
  { id: "seed-mat-syn", componentType: "Synopsis", versionName: "One-page", days: 6 },
  { id: "seed-mat-pag", componentType: "Sample Pages", versionName: "Chapters 1-3", days: 9,
    draft: "The clockmaker's guild kept its records in a language nobody living could read. ".repeat(40) },
];

const PACKAGES = [
  { id: "seed-pkg-1", packageName: "Standard UK", ql: "seed-mat-ql1", syn: "seed-mat-syn", pag: "seed-mat-pag" },
  { id: "seed-pkg-2", packageName: "Comps-led variant", ql: "seed-mat-ql2", syn: "seed-mat-syn", pag: "seed-mat-pag" },
];

/* Eight sends across the two packages, with a spread of outcomes so replies and requests are real
   rather than all-or-nothing. Statuses are the exact QueryStatus strings the rules accept. */
const SENDS = [
  { pkg: "seed-pkg-1", status: "Queried", days: 30 },
  { pkg: "seed-pkg-1", status: "Queried", days: 28 },
  { pkg: "seed-pkg-1", status: "Full Requested", days: 60 },
  { pkg: "seed-pkg-1", status: "Partial Requested", days: 55 },
  { pkg: "seed-pkg-1", status: "Rejected", days: 70 },
  { pkg: "seed-pkg-1", status: "Rejected", days: 68 },
  { pkg: "seed-pkg-2", status: "Queried", days: 20 },
  { pkg: "seed-pkg-2", status: "Rejected", days: 45 },
];

const ids = {
  versions: MATERIALS.map((m) => m.id),
  packages: PACKAGES.map((p) => p.id),
  queries: SENDS.map((_, i) => `seed-pkgq-${i + 1}`),
};

if (CLEAN) {
  for (const [coll, list] of Object.entries(ids)) {
    for (const id of list) await deleteDoc(doc(db, "users", uid, coll, id));
    console.log(`removed ${list.length} from ${coll}`);
  }
  process.exit(0);
}

{
  const batch = writeBatch(db);
  for (const m of MATERIALS) {
    batch.set(doc(db, "users", uid, "versions", m.id), {
      id: m.id, userId: uid, manuscriptId: MS_ID,
      componentType: m.componentType, versionName: m.versionName,
      fileAttached: false, createdDate: iso(m.days),
      contentType: "text", contentDraft: m.draft ?? "",
    });
  }
  await batch.commit();
  console.log(`wrote ${MATERIALS.length} versions`);
}

{
  const batch = writeBatch(db);
  for (const p of PACKAGES) {
    batch.set(doc(db, "users", uid, "packages", p.id), {
      id: p.id, userId: uid, manuscriptId: MS_ID,
      packageName: p.packageName,
      queryLetterVersionId: p.ql, synopsisVersionId: p.syn, samplePagesVersionId: p.pag,
      status: "Active", createdDate: iso(25),
    });
  }
  await batch.commit();
  console.log(`wrote ${PACKAGES.length} packages`);
}

{
  const batch = writeBatch(db);
  SENDS.forEach((s, i) => {
    const id = `seed-pkgq-${i + 1}`;
    batch.set(doc(db, "users", uid, "queries", id), {
      id, userId: uid, manuscriptId: MS_ID,
      /* reuse seed.mjs's agents — a query needs an agent to render anywhere else in the app */
      agentId: `seed-agent-${(i % 12) + 1}`,
      packageId: s.pkg,
      status: s.status,
      dateSent: iso(s.days).slice(0, 10),
      sendMethod: "Email",
      personalisationNotes: "",
    });
  });
  await batch.commit();
  console.log(`wrote ${SENDS.length} packaged queries`);
}

for (const c of ["versions", "packages", "queries"]) {
  console.log(`  ${c}: ${(await getDocs(collection(db, "users", uid, c))).size} docs on the account`);
}
process.exit(0);
