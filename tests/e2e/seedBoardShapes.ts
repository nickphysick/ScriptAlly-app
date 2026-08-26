/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE BOARD IN TWO SHAPES — because the app's own threshold makes them mutually exclusive.
 *
 * ⚠️ THIS IS A FACT ABOUT THE PRODUCT, NOT A LIMITATION OF THE HARNESS. A materials gap raises a
 * SINGLE fill-in card below `BULK_MATERIALS_THRESHOLD` and ONE cohort card at or above it, and the
 * count is global over the account. No single board state shows both, so full coverage is two runs:
 *
 *   npx tsx tests/e2e/seedBoardShapes.ts --shape=a   # sparse — one single-query fill-in card
 *   npx tsx tests/e2e/seedBoardShapes.ts --shape=b   # cohort — the account's natural shape
 *   npx tsx tests/e2e/seedBoardShapes.ts --clean     # put everything back
 *
 * ⚠️ IT CALLS THE APP'S OWN PREDICATE. `queriesMissingMaterials` is imported and run, not restated.
 * The previous fixture reimplemented "is this a gap" and missed that `sendMaterialsRecorded` also
 * passes when a SEND ACTIVITY carries materials — so it kept two queries that were not gaps at all
 * and produced no card, which read exactly like the fixture not working. This is a `.ts` file run
 * through `tsx` for that one reason: so the question is answered by the code that answers it in the
 * app.
 *
 * ⚠️ SUPPRESSION ALSO GOES THROUGH THE APP'S OWN SWITCH. `hasRecordedMaterials(q.materialsWanted)`
 * is what removes a query from the gap set, so writing that field is the app's own mechanism rather
 * than a second rule that could drift from it.
 *
 * ⚠️ SELF-CLEANING, AND IT RESTORES WHAT IT CHANGED — the suppressed queries (to having NO field,
 * never an empty array, because that is what they had), any task flag it cleared to un-hide the kept
 * card, the To-do type preferences, and the seeded task. Every id goes in a restore file; `--clean`
 * touches exactly those and nothing else.
 */
import { readFileSync, existsSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore, doc, getDoc, setDoc, getDocs, deleteDoc, collection, writeBatch, deleteField,
} from "firebase/firestore";
import { queriesMissingMaterials, isBulkMaterialsGap, BULK_MATERIALS_THRESHOLD } from "../../src/lib/queryMaterialsGap";
import { agentPrimary } from "../../src/lib/agentDisplay";
import type { Activity, Agent, Query } from "../../src/types";

const env = (f: string) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("dev only");

const arg = process.argv.slice(2).join(" ");
const SHAPE = /--shape=a/.test(arg) ? "a" : /--shape=b/.test(arg) ? "b" : null;
const CLEAN = /--clean/.test(arg);
if (!SHAPE && !CLEAN) throw new Error("pass --shape=a, --shape=b or --clean");

const RESTORE = "run-artifacts/.board-shape-restore.json";
const TASK_ID = "fixt-dated-task";

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
const ref = (...p: string[]) => doc(db, "users", uid, ...p);
const all = async <T,>(c: string): Promise<T[]> =>
  (await getDocs(collection(db, "users", uid, c))).docs.map((d) => ({ id: d.id, ...d.data() })) as T[];

/**
 * ⚠️ NO `prefsBefore`. An earlier draft carried one and a restore branch that wrote to a placeholder
 * document — dead code pretending to put something back. The fixture does not touch the To-do type
 * preferences, because `todoPrefs` defaults every type to ON and `taskSurvivesMute` returns true for
 * `materials_unrecorded` whatever is muted; both were checked rather than assumed.
 */
interface Restore { suppressed: string[]; clearedFlags: string[]; task: boolean }
const readRestore = (): Restore =>
  existsSync(RESTORE) ? JSON.parse(readFileSync(RESTORE, "utf8")) : { suppressed: [], clearedFlags: [], task: false };
const writeRestore = (r: Restore) => { mkdirSync("run-artifacts", { recursive: true }); writeFileSync(RESTORE, JSON.stringify(r, null, 1)); };

/** un-suppress everything a previous shape suppressed — the shared first step of every mode */
async function unsuppress(r: Restore): Promise<number> {
  let n = 0;
  for (let i = 0; i < r.suppressed.length; i += 400) {
    const b = writeBatch(db);
    /* ⚠️ `deleteField`, NOT an empty array: every id here HAD no `materialsWanted` before the
       fixture wrote one, and leaving `[]` behind would be a field the account never carried —
       behaving identically, which is exactly how a fixture leaves residue nobody notices. */
    for (const id of r.suppressed.slice(i, i + 400)) { b.update(ref("queries", id), { materialsWanted: deleteField() }); n++; }
    await b.commit();
  }
  return n;
}

/** the app's own gap set, computed by the app's own function */
async function gapSet() {
  const [queries, activities, agents, manuscripts] = await Promise.all([
    all<Query>("queries"), all<Activity>("activities"), all<Agent>("agents"),
    all<{ id: string; title: string }>("manuscripts"),
  ]);
  return {
    queries,
    gaps: queriesMissingMaterials({ queries, activities, agents, manuscripts, displayName: agentPrimary }),
  };
}

if (CLEAN) {
  const r = readRestore();
  const n = await unsuppress(r);
  for (const id of r.clearedFlags) await deleteDoc(ref("taskFlags", id)).catch(() => {});
  if (r.task) await deleteDoc(ref("tasks", TASK_ID)).catch(() => {});
  rmSync(RESTORE, { force: true });
  const { gaps } = await gapSet();
  console.log(`restored ${n} queries · removed ${r.clearedFlags.length} flag(s) · task removed=${r.task}`);
  console.log(`gaps now ${gaps.length} → ${isBulkMaterialsGap(gaps.length) ? "COHORT" : "SPARSE"} shape`);
  process.exit(0);
}

/* every run starts from the account's natural state, so running a shape twice is idempotent */
const prior = readRestore();
const undone = await unsuppress(prior);
const restore: Restore = { suppressed: [], clearedFlags: [], task: false };

const { gaps } = await gapSet();
console.log(`natural gap set (the app's own predicate): ${gaps.length}` + (undone ? `  [un-suppressed ${undone} from a previous run]` : ""));

if (SHAPE === "a") {
  if (!gaps.length) throw new Error("no materials gaps on the account — shape A cannot be built");
  /* ⚠️ ONE, NOT TWO. Below the threshold any count renders singles, but the assertion is "exactly
     one single-query fill-in card", and two would make it "exactly two". The predicate returns
     OLDEST FIRST, so the kept one is the app's own first. */
  const keep = gaps[0];
  const suppress = gaps.slice(1).map((g) => g.queryId);
  for (let i = 0; i < suppress.length; i += 400) {
    const b = writeBatch(db);
    for (const id of suppress.slice(i, i + 400)) b.update(ref("queries", id), { materialsWanted: ["Query letter"] });
    await b.commit();
  }
  restore.suppressed = suppress;

  /* ⚠️ A SLEEPING FLAG WOULD HIDE THE ONE CARD THIS SHAPE EXISTS TO SHOW. The engine filters a
     derived task out before the board sees it, so the fixture would look broken for a reason that
     has nothing to do with the gap count. Cleared and recorded. */
  const flags = await all<{ id: string; snoozedUntil?: unknown }>("taskFlags");
  for (const f of flags) {
    if (String(f.id).includes(keep.queryId) && f.snoozedUntil) {
      await deleteDoc(ref("taskFlags", f.id));
      restore.clearedFlags.push(f.id);
    }
  }
  console.log(`kept ${keep.queryId} (${keep.agentName}) · suppressed ${suppress.length} · cleared ${restore.clearedFlags.length} flag(s)`);
} else {
  console.log(`cohort shape is the account's natural state — nothing suppressed`);
}

/**
 * ⚠️ THE TASK CARRIES A `dueDate`, AND THAT IS THE WHOLE FIX FROM PHASE 2. A DATELESS note has
 * `nature: "note"`, which `boardEligible` removes from every board column by design — the previous
 * fixture seeded exactly that and it could never render. A dated one has `nature: "task"`, renders
 * as a row, and reaches the NOTE journey because `journeyIdFor` keys on `userTaskId` rather than on
 * nature. Both shapes need it; the note assertions are about the journey, not the gap count.
 */
/**
 * ⚠️ DELETE-THEN-CREATE, AND THE SECOND RUN IS WHY. `setDoc` over an EXISTING document is an UPDATE
 * in rules terms, and the update rule allows only a named set of keys to change. This rewrites
 * `createdAt` with a fresh timestamp every run, so the second run's diff carried a key the update
 * allowlist does not list and the whole write was DENIED — the affectedKeys gotcha this repo already
 * records, arriving as a hard permission error rather than a silent one. Deleting first makes every
 * run a CREATE, which is also what makes running a shape twice idempotent.
 */
await deleteDoc(ref("tasks", TASK_ID)).catch(() => {});
const now = new Date().toISOString();
await setDoc(ref("tasks", TASK_ID), {
  id: TASK_ID, userId: uid,
  text: "Ask Marcus Reed about the revised opening",
  done: false, createdAt: now, updatedAt: now, dueDate: now.slice(0, 10),
});
restore.task = true;
writeRestore(restore);

const after = await gapSet();
const bulk = isBulkMaterialsGap(after.gaps.length);
console.log(`\nshape ${SHAPE.toUpperCase()} · gaps ${after.gaps.length} · threshold ${BULK_MATERIALS_THRESHOLD} → ${bulk ? "COHORT card" : "SINGLE card(s)"}`);
if (SHAPE === "a" && (bulk || after.gaps.length !== 1)) throw new Error(`shape A wanted exactly 1 gap, got ${after.gaps.length}`);
if (SHAPE === "b" && !bulk) throw new Error(`shape B wanted the cohort, got ${after.gaps.length} gap(s)`);
console.log(`restore file: ${RESTORE}`);
process.exit(0);
