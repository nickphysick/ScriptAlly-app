/**
 * WHICH RULES ARE LIVE ON THE DATABASE DEV ACTUALLY READS?
 *
 * The canary proved a writer-date write is denied; it could not say WHY. A denial has several
 * possible causes and they call for different fixes: the rules not deployed, the rules deployed to
 * the OTHER database in this project (the documented dual-DB trap), or a document that fails
 * validation for an unrelated reason. This isolates them by attempting one field at a time and
 * naming the commit each field arrived in, so the answer is a VINTAGE rather than a yes/no.
 *
 * ⚠️ IT WRITES ONLY TO THE HARNESS ACCOUNT'S OWN SEED DATA, and undoes every write it makes.
 * Same auth path and same guard as seed.mjs: dev project named explicitly, refuses anything else.
 *
 *   node tests/e2e/rulesProbe.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, updateDoc, collection, getDocs } from "firebase/firestore";

const env = (file) => Object.fromEntries(
  readFileSync(file, "utf8").split("\n")
    .map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }),
);
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
const PROJECT = dev.VITE_FIREBASE_PROJECT_ID;
if (PROJECT !== "scriptally-dev") throw new Error(`Refusing to probe "${PROJECT}".`);
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");

const app = initializeApp({
  apiKey: dev.VITE_FIREBASE_API_KEY,
  authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: PROJECT,
  storageBucket: dev.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: dev.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: dev.VITE_FIREBASE_APP_ID,
});
const dbId = dev.VITE_FIREBASE_DATABASE_ID;
const db = !dbId || dbId === "(default)" ? getFirestore(app) : getFirestore(app, dbId);
console.log(`database: ${dbId || "(default)"} · project: ${PROJECT}`);

const { user } = await signInWithEmailAndPassword(
  getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", PASSWORD);
const uid = user.uid;

/**
 * ⚠️ READ-ONLY UNLESS `--migrate` IS PASSED. The audit answers F-Q; the migration is a separate,
 * explicit act, because "how many are affected" is a question you ask BEFORE deciding to change
 * anything, and a script that answers it by changing them cannot be run twice for the same answer.
 */
const MIGRATE = process.argv.includes("--migrate");

const snap = await getDocs(collection(db, "users", uid, "queries"));
const isMarked = (m) => typeof m !== "string" && !!m?.fromPackageId;

const rows = snap.docs.map((d) => {
  const q = d.data();
  const list = q.materialsWanted ?? [];
  return {
    id: d.id,
    packageId: q.packageId ?? undefined,
    linked: !!(q.packageId && q.packageId.length),
    loose: list.filter((m) => !isMarked(m)),
    marked: list.filter(isMarked),
    total: list.length,
  };
});

const both      = rows.filter((r) => r.linked && r.total > 0);
const linkOnly  = rows.filter((r) => r.linked && r.total === 0);
const looseOnly = rows.filter((r) => !r.linked && r.total > 0);
const neither   = rows.filter((r) => !r.linked && r.total === 0);
const snapshots = rows.filter((r) => r.marked.length > 0);

console.log(`\nqueries: ${rows.length}`);
console.log(`  package link ONLY        ${linkOnly.length}`);
console.log(`  loose materials ONLY     ${looseOnly.length}`);
console.log(`  ⚠️ BOTH (D-D4 migrates)   ${both.length}`);
console.log(`  neither                  ${neither.length}`);
console.log(`  carrying snapshot marks  ${snapshots.length}`);

if (both.length) {
  console.log("\nthe both-holders — packageId WINS, the loose list is dropped:");
  for (const r of both) {
    console.log(`  ${r.id}  packageId=${JSON.stringify(r.packageId)}  dropping ${r.total}: ${JSON.stringify(r.loose.map((m) => (typeof m === "string" ? m : m.material)))}`);
  }
}
if (snapshots.length) {
  console.log("\nsnapshot-marked (the model D-D1 replaces):");
  for (const r of snapshots) console.log(`  ${r.id}  ${r.marked.length} marked item(s)`);
}

if (!MIGRATE) { console.log("\nread-only. Pass --migrate to apply."); process.exit(0); }

console.log("\nmigrating…");
let n = 0;
for (const r of both) {
  /* ⚠️ THE LINK WINS AND THE LIST IS UNSET, never emptied to []. An empty array is a stored claim
     that the writer listed nothing; absence is the honest encoding of "this query answers with its
     package". `materialsWanted` is optional in the type, so deleteField is legal here — unlike the
     three package slots, whose keys `isValidPackage` requires. */
  const { deleteField } = await import("firebase/firestore");
  await updateDoc(doc(db, "users", uid, "queries", r.id), { materialsWanted: deleteField() });
  console.log(`  ${r.id}: dropped ${r.total} loose item(s), kept packageId ${JSON.stringify(r.packageId)}`);
  n++;
}
/* ⚠️ RE-READ RATHER THAN TRUST THE WRITES. */
const after = await getDocs(collection(db, "users", uid, "queries"));
const stillBoth = after.docs.filter((d) => {
  const q = d.data();
  return !!(q.packageId && q.packageId.length) && (q.materialsWanted ?? []).length > 0;
});
console.log(`\nmigrated ${n} · re-read: ${after.size} queries, ${stillBoth.length} still holding both`);
process.exit(stillBoth.length ? 1 : 0);
