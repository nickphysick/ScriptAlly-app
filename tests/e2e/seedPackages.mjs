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
/**
 * ⚠️ THE SPARSE STATE IS A MODE, NOT A SECOND SCRIPT (recut §4). The re-cut's faults showed at LOW
 * data — an empty type column collapsed, ghosts sat at three heights, the tracking band had nothing
 * to draw — and a fixture that only ever holds four materials and eight sends cannot reach any of
 * them. Two modes off one set of ids means `--clean` still removes everything either mode wrote.
 *
 *   node tests/e2e/seedPackages.mjs            full:   4 materials · 2 packages · 8 sends
 *   node tests/e2e/seedPackages.mjs --sparse   sparse: 2 materials · 1 package  · 0 sends
 */
const SPARSE = process.argv.includes("--sparse");

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
const ALL_MATERIALS = [
  /* ⚠️ ONE MATERIAL WITH A REAL BODY, or the description band's ordinary state is unrepresented:
     the only material carrying a draft was the SAMPLE, which the builder's rail does not list. */
  { id: "seed-mat-ql1", componentType: "Query Letter", versionName: "Hook-first", days: 4,
    draft: "When the tide went out at Ravensmere it took the church with it, and every soul in the "
      + "village agreed not to mention it again. Nell Aubrey was six that summer, and she has been "
      + "mentioning it ever since." },
  { id: "seed-mat-ql2", componentType: "Query Letter", versionName: "Comps-forward", days: 14 },
  { id: "seed-mat-syn", componentType: "Synopsis", versionName: "One-page", days: 6 },
  { id: "seed-mat-pag", componentType: "Sample Pages", versionName: "Chapters 1-3", days: 9,
    draft: "The clockmaker's guild kept its records in a language nobody living could read. ".repeat(40) },
  /* ⚠️ THE LIBRARY CARD HAS THREE SOURCE STATES AND A FIXTURE THAT CARRIES ONE PROVES A THIRD OF IT.
     Every material above is pasted text, so until these two arrived a sweep over the card grid was a
     monoculture wearing a census's clothes: it could not see the attachment branch or the empty one,
     and it passed. Both are real states the app must draw — a file with nothing typed beside it, and
     a material with neither — so they belong in the fixture rather than in a scratch script. */
  { id: "seed-mat-ql3", componentType: "Query Letter", versionName: "Voice-led", days: 2,
    fileAttached: true, fileName: "voice-led-v2.docx", contentType: "ref" },
  { id: "seed-mat-ql4", componentType: "Query Letter", versionName: "Untitled draft", days: 1 },
];

/* ⚠️ SPARSE KEEPS A LETTER AND A SYNOPSIS AND NO SAMPLE — deliberately, because that is what makes
   the Sample pages column EMPTY, which is the state the re-cut's dashed hold exists for. Two
   materials is also the minimum `canBuildPackage` accepts, so the New-package control stays live
   rather than the page landing in its locked branch. */
const MATERIALS = SPARSE ? ALL_MATERIALS.filter((m) => ["seed-mat-ql1", "seed-mat-syn"].includes(m.id)) : ALL_MATERIALS;

const ALL_PACKAGES = [
  { id: "seed-pkg-1", packageName: "Standard UK", ql: "seed-mat-ql1", syn: "seed-mat-syn", pag: "seed-mat-pag" },
  { id: "seed-pkg-2", packageName: "Comps-led variant", ql: "seed-mat-ql2", syn: "seed-mat-syn", pag: "seed-mat-pag" },
  /* ⚠️ A THIRD PACKAGE EXISTS ONLY TO NAME A BOOK VERSION, AND IT HAD TO BE A NEW ONE. No version
     on the fixture was in any package, so `held by N agents` could render only as its absence and
     two of Tracking's panels had nothing to draw. It could not be added to either package above:
     the version slot is frozen once a package has been sent, permanently and by design, so a sent
     package can never gain one. Created with it instead, which is how the app creates them. */
  { id: "seed-pkg-3", packageName: "Prologue-led", ql: "seed-mat-ql1", syn: "seed-mat-syn", pag: "seed-mat-pag",
    bv: "bv-prologue" },
];
/* One package, and its sample slot UNFILLED — the sparse package has no sample to point at. */
const PACKAGES = SPARSE
  ? [{ id: "seed-pkg-1", packageName: "Standard UK", ql: "seed-mat-ql1", syn: "seed-mat-syn", pag: "" }]
  : ALL_PACKAGES;

/* Eight sends across the two packages, with a spread of outcomes so replies and requests are real
   rather than all-or-nothing. Statuses are the exact QueryStatus strings the rules accept. */
/* ⚠️ SPARSE SENDS NOTHING, which is the point: it is the only way to reach the tracking band's
   pre-sent state — the nudge and its two dashed ghost panels. With any send at all those two slots
   never render and cannot be measured. */
const SENDS = SPARSE ? [] : [
  { pkg: "seed-pkg-1", status: "Queried", days: 30 },
  { pkg: "seed-pkg-1", status: "Queried", days: 28 },
  { pkg: "seed-pkg-1", status: "Full Requested", days: 60 },
  { pkg: "seed-pkg-1", status: "Partial Requested", days: 55 },
  { pkg: "seed-pkg-1", status: "Rejected", days: 70 },
  { pkg: "seed-pkg-1", status: "Rejected", days: 68 },
  { pkg: "seed-pkg-2", status: "Queried", days: 20 },
  { pkg: "seed-pkg-2", status: "Rejected", days: 45 },
  /* ⚠️ TWO SENDS THAT ARE STILL OUT, EACH NAMING THE VERSION IT CARRIED. `holdings()` reads the
     last SEND activity's `bookVersionId` on a query still in a holding status, so a fixture whose
     every query has been answered has no holders at all — which is what left `held by N agents`
     unmeasurable on a page and two of Tracking's panels empty. */
  { pkg: "seed-pkg-3", status: "Full Sent", days: 40, bv: "bv-prologue" },
  { pkg: "seed-pkg-3", status: "Partial Sent", days: 35, bv: "bv-prologue" },
];

/**
 * ⚠️ THE FIXTURE WRITES ITS OWN ACTIVITY LOG, and it did not until §4 measured the ledger.
 * Eight packaged queries existed with a spread of outcomes and NOT ONE activity document behind
 * them, so "Latest activity" rendered empty on a page reporting 8 sent and 2 replied — correctly,
 * because nothing typed existed, and uselessly, because the panel could not be measured at all.
 * A seed that creates records without the events that produced them leaves whole features
 * unmeasurable while looking complete. (Same shape as the note against `seed.mjs`, which writes no
 * activity docs either — hence `seedCorrection.mjs`.)
 *
 * ⚠️ EVERY SEND GETS ITS `Query Sent`; a query whose status moved past Queried also gets the event
 * that moved it. That is what `recomputeQuery` would have written, so the fixture is the shape the
 * app produces rather than a convenient one.
 */
const EVENTS = SENDS.flatMap((s, i) => {
  const qid = `seed-pkgq-${i + 1}`;
  const rows = [{
    id: `seed-pkgact-${i + 1}-sent`, queryId: qid,
    activityType: "Query Sent", resultingStatus: "Queried", days: s.days,
    description: `Query sent`,
  }];
  if (s.status !== "Queried") {
    rows.push({
      id: `seed-pkgact-${i + 1}-out`, queryId: qid,
      activityType: "Status Changed", resultingStatus: s.status,
      /* the outcome lands AFTER the send — a fortnight, so the ordering is unambiguous */
      days: Math.max(0, s.days - 14),
      description: `Status changed to ${s.status}`,
      /* the version rides the SEND activity, which is where `holdings()` reads it from */
      ...(s.bv ? { bookVersionId: s.bv } : {}),
    });
  }
  return rows;
});

/* ⚠️ `--clean` SPANS BOTH MODES. Cleaning the sparse set must still remove the full set's records,
   or switching modes leaves the previous mode's leftovers behind and the next measurement reads a
   state neither mode describes. The id lists are the union, not the current mode's. */
const ids = {
  versions: ALL_MATERIALS.map((m) => m.id),
  packages: ALL_PACKAGES.map((p) => p.id),
  queries: Array.from({ length: 8 }, (_, i) => `seed-pkgq-${i + 1}`),
  activities: Array.from({ length: 8 }, (_, i) => [`seed-pkgact-${i + 1}-sent`, `seed-pkgact-${i + 1}-out`]).flat(),
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
      fileAttached: m.fileAttached ?? false, createdDate: iso(m.days),
      contentType: m.contentType ?? "text", contentDraft: m.draft ?? "",
      ...(m.fileName ? { fileName: m.fileName } : {}),
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
      /* omitted, never "" — absent means the writer has not named an ordering */
      ...(p.bv ? { bookVersionId: p.bv } : {}),
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

{
  const batch = writeBatch(db);
  for (const e of EVENTS) {
    batch.set(doc(db, "users", uid, "activities", e.id), {
      id: e.id, userId: uid, queryId: e.queryId, manuscriptId: MS_ID,
      activityType: e.activityType, resultingStatus: e.resultingStatus,
      description: e.description, date: iso(e.days), details: "",
      ...(e.bookVersionId ? { bookVersionId: e.bookVersionId } : {}),
    });
  }
  await batch.commit();
  console.log(`wrote ${EVENTS.length} activities`);
}

for (const c of ["versions", "packages", "queries", "activities"]) {
  console.log(`  ${c}: ${(await getDocs(collection(db, "users", uid, c))).size} docs on the account`);
}
process.exit(0);
