/**
 * PACKAGE EDITIONS — PHASE 2 QUERY MIGRATION (docs/contracts/package-editions.md §C3, 28 Sep).
 *
 * Every query without `sentHow` gets one:
 *   · a `packageId`  → `sentHow: 'package'`, `sentPackageEdition: 1` (and `sentPackageId` if absent)
 *   · otherwise      → `sentHow: 'unrecorded'`
 *
 * ⚠️ IT WRITES ONLY THE §C3 FIELDS, AND PROVES IT. Before writing it records each query's status and
 * every date-like field; after writing it re-reads every touched query and refuses (exit 1) if any
 * of those moved. A migration that changed a status or a date is a stop (§S), not a warning.
 *
 * ⚠️ REVERSIBLE. `--apply` writes a backup of exactly which keys it ADDED to
 * reports/packages-journey/migration-<uid>.json; `--revert <that file>` deletes those keys and
 * nothing else. A key that was already present is never touched and never listed.
 *
 * ⚠️ NOT REQUIRED FOR CORRECTNESS. `sentRecordOf` (src/lib/queryActions/sentRecord.ts) reads an
 * unmigrated query with the same defaults, so prod reads right before this runs there. Harness-
 * scoped by construction: it signs in as one account and can reach no other.
 *
 *   node tests/e2e/migrateSentHow.mjs                # dry run (default): counts only
 *   node tests/e2e/migrateSentHow.mjs --apply
 *   node tests/e2e/migrateSentHow.mjs --revert reports/packages-journey/migration-<uid>.json
 *
 * ⚠️ STEP 2 (Nick, 28 Sep): a v1 "Custom" log recorded what went piece by piece, so it is INDIVIDUAL,
 * not unrecorded. `--custom-to-individual` moves every query that reads `sentHow: 'unrecorded'` while
 * carrying a snapshot (`sentMaterials`) and no package to `'individual'`, backing up the value it
 * REPLACED; `--revert` puts it back. Dry run unless `--apply` is passed too.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, updateDoc, getDoc, deleteField } from "firebase/firestore";

const env = (file) => Object.fromEntries(
  readFileSync(file, "utf8").split("\n")
    .map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }),
);
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
const PROJECT = dev.VITE_FIREBASE_PROJECT_ID;
if (PROJECT !== "scriptally-dev") throw new Error(`Refusing to touch "${PROJECT}".`);
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");

const app = initializeApp({
  apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: PROJECT,
  storageBucket: dev.VITE_FIREBASE_STORAGE_BUCKET, messagingSenderId: dev.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: dev.VITE_FIREBASE_APP_ID,
});
const dbId = dev.VITE_FIREBASE_DATABASE_ID;
const db = !dbId || dbId === "(default)" ? getFirestore(app) : getFirestore(app, dbId);
const { user } = await signInWithEmailAndPassword(
  getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", PASSWORD);
const uid = user.uid;
const apply = process.argv.includes("--apply");
const ri = process.argv.indexOf("--revert");
const revertFile = ri > 0 ? process.argv[ri + 1] : null;
console.log(`database: ${dbId || "(default)"} · project: ${PROJECT} · uid ${uid} · ${revertFile ? "REVERT" : apply ? "APPLY" : "DRY RUN"}`);

/* The fields that must not move: status, and anything that is a date. */
const guarded = (d) => {
  const out = { status: d.status ?? null };
  for (const [k, v] of Object.entries(d)) {
    if (/date|Date|At$|On$|Sent$|deadline|Deadline/.test(k)) out[k] = JSON.stringify(v ?? null);
  }
  return out;
};
const sameGuarded = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

if (revertFile) {
  const plan = JSON.parse(readFileSync(revertFile, "utf8"));
  if (plan.uid !== uid) throw new Error(`Backup is for ${plan.uid}, signed in as ${uid}.`);
  let n = 0;
  for (const { id, added = [], restore = {} } of plan.changes) {
    const ref = doc(db, "users", uid, "queries", id);
    const before = await getDoc(ref);
    if (!before.exists()) { console.log(`  skip ${id} — gone`); continue; }
    const g = guarded(before.data());
    await updateDoc(ref, { ...Object.fromEntries(added.map((k) => [k, deleteField()])), ...restore });
    const after = guarded((await getDoc(ref)).data());
    if (!sameGuarded(g, after)) { console.error(`  ✗ ${id}: a guarded field moved on revert`); process.exit(1); }
    n++;
  }
  console.log(`reverted ${n} of ${plan.changes.length}`);
  process.exit(0);
}

if (process.argv.includes("--custom-to-individual")) {
  const all = await getDocs(collection(db, "users", uid, "queries"));
  const hits = all.docs.filter((d) => { const q = d.data(); return q.sentHow === "unrecorded" && !q.packageId && typeof q.sentMaterials === "string" && q.sentMaterials.trim(); });
  console.log(JSON.stringify({ scanned: all.size, customToIndividual: hits.length, ids: hits.map((d) => d.id) }));
  if (!apply) { console.log("dry run: nothing written"); process.exit(0); }
  mkdirSync("reports/packages-journey", { recursive: true });
  const backup = `reports/packages-journey/migration-custom-${uid}.json`;
  writeFileSync(backup, JSON.stringify({ uid, at: new Date().toISOString(), mode: "custom-to-individual", changes: hits.map((d) => ({ id: d.id, restore: { sentHow: "unrecorded" } })) }, null, 2));
  console.log(`backup written: ${backup}`);
  let moved = 0;
  for (const d of hits) {
    const g = guarded(d.data());
    await updateDoc(d.ref, { sentHow: "individual" });
    if (!sameGuarded(g, guarded((await getDoc(d.ref)).data()))) { console.error(`  ✗ ${d.id}: status or a date moved`); moved++; }
  }
  if (moved) { console.error(`STOP: ${moved} moved. Revert with --revert ${backup}`); process.exit(1); }
  console.log(`moved ${hits.length} to individual; status and every date unchanged`);
  process.exit(0);
}

const snap = await getDocs(collection(db, "users", uid, "queries"));
const changes = [];
const counts = { scanned: snap.size, alreadySet: 0, package: 0, unrecorded: 0 };
for (const d of snap.docs) {
  const q = d.data();
  if (q.sentHow != null) { counts.alreadySet++; continue; }
  const write = {};
  if (q.packageId) {
    write.sentHow = "package";
    if (q.sentPackageEdition == null) write.sentPackageEdition = 1;
    if (!q.sentPackageId) write.sentPackageId = q.packageId;
    counts.package++;
  } else {
    write.sentHow = "unrecorded";
    counts.unrecorded++;
  }
  changes.push({ id: d.id, added: Object.keys(write), write, guard: guarded(q) });
}
console.log(JSON.stringify(counts));
if (!apply) { console.log("dry run: nothing written"); process.exit(0); }

mkdirSync("reports/packages-journey", { recursive: true });
const backup = `reports/packages-journey/migration-${uid}.json`;
writeFileSync(backup, JSON.stringify({ uid, at: new Date().toISOString(), counts, changes: changes.map(({ id, added }) => ({ id, added })) }, null, 2));
console.log(`backup written: ${backup}`);

let moved = 0;
for (const c of changes) {
  const ref = doc(db, "users", uid, "queries", c.id);
  await updateDoc(ref, c.write);
  const after = guarded((await getDoc(ref)).data());
  if (!sameGuarded(c.guard, after)) { console.error(`  ✗ ${c.id}: status or a date moved`); moved++; }
}
if (moved) { console.error(`STOP: ${moved} query(ies) had a guarded field move. Revert with --revert ${backup}`); process.exit(1); }
console.log(`migrated ${changes.length}; status and every date unchanged on all of them`);
process.exit(0);
