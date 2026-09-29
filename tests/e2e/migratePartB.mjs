/**
 * PACKAGES THROUGH THE JOURNEY — PART B MIGRATIONS (28 Sep). Three, each reversible, each counted.
 *
 *   --package-name   Every query recorded as a package send without `sentPackageName` gets the name
 *                    its `sentMaterials` summary carries as a prefix ("Standard package: …") — the name
 *                    as it was on the day (Nick, 28 Sep). A query with no prefix is LEFT: the only
 *                    other name is the package's live one, which is not what it was called then.
 *   --stale-stamps   Every package carrying `firstSentAt` that no query points at (`packageId` or
 *                    `sentPackageId`) — a lock left by an undone log — is listed, and cleared.
 *   --editions       Counts only. A package with no `edition` reads as its 1st edition, started on its
 *                    createdDate (§C5, `editionsOf`), so nothing is written: a sent package's edition
 *                    fields are frozen by the rules outside a bump, and a backfill would have to be a
 *                    second path round them for a value the reader already supplies.
 *
 * ⚠️ STATUS AND EVERY DATE ARE GUARDED on the query migration: read before, re-read after, and a
 * STOP (exit 1) if any moved. The stamp migration touches packages only.
 *
 * ⚠️ `--apply` writes a backup to reports/packages-journey/; `--revert <file>` puts back exactly
 * what it records. Dry run is the default. Harness-scoped: it signs in as one account.
 *
 *   node tests/e2e/migratePartB.mjs --package-name [--apply]
 *   node tests/e2e/migratePartB.mjs --stale-stamps [--apply]
 *   node tests/e2e/migratePartB.mjs --editions
 *   node tests/e2e/migratePartB.mjs --revert reports/packages-journey/<file>.json
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

/* mirrors readSummary (src/lib/queryActions/packages.ts) — the prefix, and never a "Based on" line */
const prefixName = (s) => {
  const t = String(s ?? "");
  const m = / package: /.exec(t);
  return m && !t.startsWith("Based on ") ? t.slice(0, m.index).trim() || null : null;
};
mkdirSync("reports/packages-journey", { recursive: true });

if (revertFile) {
  const plan = JSON.parse(readFileSync(revertFile, "utf8"));
  if (plan.uid !== uid) throw new Error(`Backup is for ${plan.uid}, signed in as ${uid}.`);
  let n = 0;
  for (const { id, added = [], restore = {} } of plan.changes) {
    const ref = doc(db, "users", uid, plan.collection, id);
    const before = await getDoc(ref);
    if (!before.exists()) { console.log(`  skip ${id} — gone`); continue; }
    const g = guarded(before.data());
    await updateDoc(ref, { ...Object.fromEntries(added.map((k) => [k, deleteField()])), ...restore });
    if (plan.collection === "queries" && !sameGuarded(g, guarded((await getDoc(ref)).data()))) { console.error(`  ✗ ${id}: a guarded field moved on revert`); process.exit(1); }
    n++;
  }
  console.log(`reverted ${n} of ${plan.changes.length} (${plan.collection})`);
  process.exit(0);
}

if (process.argv.includes("--package-name")) {
  const all = await getDocs(collection(db, "users", uid, "queries"));
  const counts = { scanned: all.size, packageSends: 0, alreadyNamed: 0, fromPrefix: 0, noPrefixLeft: 0 };
  const hits = [];
  for (const d of all.docs) {
    const q = d.data();
    const isPkg = q.sentHow === "package" || (q.sentHow == null && q.packageId);
    if (!isPkg) continue;
    counts.packageSends++;
    if (typeof q.sentPackageName === "string" && q.sentPackageName.trim()) { counts.alreadyNamed++; continue; }
    const name = prefixName(q.sentMaterials);
    if (!name) { counts.noPrefixLeft++; continue; }
    counts.fromPrefix++;
    hits.push({ d, name });
  }
  console.log(JSON.stringify(counts));
  if (!apply) { console.log("dry run: nothing written"); process.exit(0); }
  const backup = `reports/packages-journey/migration-name-${uid}.json`;
  writeFileSync(backup, JSON.stringify({ uid, at: new Date().toISOString(), collection: "queries", mode: "package-name", counts, changes: hits.map(({ d }) => ({ id: d.id, added: ["sentPackageName"] })) }, null, 2));
  console.log(`backup written: ${backup}`);
  let moved = 0;
  for (const { d, name } of hits) {
    const g = guarded(d.data());
    await updateDoc(d.ref, { sentPackageName: name });
    if (!sameGuarded(g, guarded((await getDoc(d.ref)).data()))) { console.error(`  ✗ ${d.id}: status or a date moved`); moved++; }
  }
  if (moved) { console.error(`STOP: ${moved} moved. Revert with --revert ${backup}`); process.exit(1); }
  console.log(`named ${hits.length}; status and every date unchanged`);
  process.exit(0);
}

if (process.argv.includes("--stale-stamps")) {
  const [pk, qs] = await Promise.all([getDocs(collection(db, "users", uid, "packages")), getDocs(collection(db, "users", uid, "queries"))]);
  const held = new Set();
  for (const d of qs.docs) { const q = d.data(); for (const k of ["packageId", "sentPackageId"]) if (q[k]) held.add(q[k]); }
  const stamped = pk.docs.filter((d) => d.data().firstSentAt);
  const stale = stamped.filter((d) => !held.has(d.id));
  console.log(JSON.stringify({ packages: pk.size, stamped: stamped.length, stale: stale.length, list: stale.map((d) => ({ id: d.id, name: d.data().packageName, firstSentAt: d.data().firstSentAt })) }, null, 1));
  if (!apply) { console.log("dry run: nothing written"); process.exit(0); }
  const backup = `reports/packages-journey/migration-stamps-${uid}.json`;
  writeFileSync(backup, JSON.stringify({ uid, at: new Date().toISOString(), collection: "packages", mode: "stale-stamps", changes: stale.map((d) => ({ id: d.id, restore: { firstSentAt: d.data().firstSentAt } })) }, null, 2));
  console.log(`backup written: ${backup}`);
  for (const d of stale) await updateDoc(d.ref, { firstSentAt: deleteField() });
  console.log(`cleared ${stale.length} stale stamp(s)`);
  process.exit(0);
}

if (process.argv.includes("--editions")) {
  const pk = await getDocs(collection(db, "users", uid, "packages"));
  const withEd = pk.docs.filter((d) => d.data().edition != null).length;
  console.log(JSON.stringify({ packages: pk.size, withEdition: withEd, readAsFirstEdition: pk.size - withEd, written: 0 }));
  process.exit(0);
}
console.error("Name a mode: --package-name, --stale-stamps, --editions, or --revert <file>.");
process.exit(1);
