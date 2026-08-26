/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PROVE THE FIXTURE — idempotent, and leaves nothing behind.
 *
 * ⚠️ A FIXTURE THAT CANNOT BE RE-RUN IS A FIXTURE WHOSE SECOND RUN MEASURES THE FIRST ONE'S RESIDUE,
 * and one that does not restore is a measurement that changed the account it was measuring. Both
 * have happened here — a Phase 8 case left three queries closed, and the previous fixture wrote a
 * field the account never carried. So this asserts what the brief asks, field by field:
 *
 *   · running a shape TWICE from a populated state leaves identical documents
 *   · `--clean` returns the account to exactly what it was, on every field of every document it
 *     could have touched
 *
 *   npx tsx tests/e2e/proveShapes.ts a
 *   npx tsx tests/e2e/proveShapes.ts b
 */
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, getDocs, collection } from "firebase/firestore";

const env = (f: string) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("dev only");

const SHAPE = process.argv[2];
if (SHAPE !== "a" && SHAPE !== "b") throw new Error("pass a or b");

const app = initializeApp({
  apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: dev.VITE_FIREBASE_PROJECT_ID, storageBucket: dev.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: dev.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: dev.VITE_FIREBASE_APP_ID,
});
const cred = await signInWithEmailAndPassword(getAuth(app),
  process.env.SA_E2E_EMAIL ?? "harness@scriptally.test",
  process.env.SA_E2E_PASSWORD ?? (local.SA_E2E_PASSWORD as string));
const db = getFirestore(app);
const uid = cred.user.uid;

/**
 * ⚠️ EVERY FIELD, NOT A SUMMARY. A snapshot of counts would pass on a fixture that swapped one
 * document for another — which is exactly the class of residue this is written to catch. `createdAt`
 * and `updatedAt` are excluded on the fixture's OWN task only: it is delete-then-created each run,
 * so its timestamps are expected to move and comparing them would report a working fixture as leaky.
 */
const TASK_ID = "fixt-dated-task";
async function snap(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const c of ["queries", "tasks", "taskFlags"]) {
    const docs = (await getDocs(collection(db, "users", uid, c))).docs;
    for (const d of docs) {
      const data = { ...(d.data() as Record<string, unknown>) };
      if (c === "tasks" && d.id === TASK_ID) { delete data.createdAt; delete data.updatedAt; }
      out[`${c}/${d.id}`] = JSON.stringify(data, Object.keys(data).sort());
    }
  }
  return out;
}
const diff = (a: Record<string, string>, b: Record<string, string>) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out: string[] = [];
  for (const k of [...keys].sort()) {
    if (!(k in a)) out.push(`  ADDED    ${k}`);
    else if (!(k in b)) out.push(`  REMOVED  ${k}`);
    else if (a[k] !== b[k]) out.push(`  CHANGED  ${k}\n     was ${a[k].slice(0, 110)}\n     now ${b[k].slice(0, 110)}`);
  }
  return out;
};
const run = (...args: string[]) =>
  execFileSync("npx", ["tsx", "tests/e2e/seedBoardShapes.ts", ...args], { stdio: "pipe" }).toString().trim();

console.log(`── proving shape ${SHAPE.toUpperCase()}`);
/**
 * ⚠️ CLEAN FIRST, OR THE BASELINE IS A PREVIOUS RUN. The first version snapshotted whatever was
 * there and reported a REMOVED document as residue — it was the fixture's own task, left by an
 * earlier shape, which `--clean` then correctly took away. A proof that starts from someone else's
 * leftovers measures the leftovers.
 */
run("--clean");
const before = await snap();
console.log(`   account before: ${Object.keys(before).length} documents`);

run(`--shape=${SHAPE}`);
const first = await snap();
run(`--shape=${SHAPE}`);
const second = await snap();

const idem = diff(first, second);
console.log(`\n1 · IDEMPOTENT — running it twice leaves identical documents: ${idem.length === 0 ? "YES" : "NO"}`);
for (const l of idem.slice(0, 10)) console.log(l);

run("--clean");
const after = await snap();
const residue = diff(before, after);
console.log(`\n2 · NO RESIDUE — the account after matches the account before, field by field: ${residue.length === 0 ? "YES" : "NO"}`);
for (const l of residue.slice(0, 10)) console.log(l);

console.log(`\n   documents compared: ${Object.keys(before).length}`);
process.exit(idem.length === 0 && residue.length === 0 ? 0 : 1);
