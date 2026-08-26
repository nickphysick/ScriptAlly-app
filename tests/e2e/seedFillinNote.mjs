/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE TWO MISSING FIXTURES — a single-query fill-in card, and a user Note.
 *
 * ⚠️ WHY. Seven assertions across `steerRound`, `finishRound` and the journey round read NOT RUN
 * because the shared account has never held either. An assertion that cannot be exercised is not a
 * lock, it is a comment: it goes green on an absence and stays green through any regression.
 *
 * ⚠️ THE FILL-IN CARD IS THE AWKWARD ONE, AND THE REASON IS WORTH KNOWING BEFORE YOU RUN THIS. The
 * single-query card is raised only BELOW `BULK_MATERIALS_THRESHOLD` (3) gaps — at or above it the
 * board shows ONE cohort card instead — and the count is GLOBAL, over every query on the account.
 * This account carries ~29. So there is no way to make one single card appear without suppressing
 * the others, and this writes `materialsWanted` on every gap query bar two.
 *
 * ⚠️ WHICH MEANS THE BOARD CHANGES SHAPE FOR EVERY SESSION ON THIS ACCOUNT WHILE IT IS APPLIED —
 * no cohort card, two fill-in cards. That is not a side effect to discover later; it is the whole
 * mechanism. Apply it, measure, and `--clean` immediately. It is the same bargain `seedThinCases`
 * makes with the Pro plan, one size larger.
 *
 * ⚠️ IT DOES NOT REIMPLEMENT THE GAP PREDICATE. `queriesMissingMaterials` has half a dozen clauses
 * — terminal status, a resolvable agent and manuscript, a send activity carrying materials — and a
 * second copy here would drift from it silently, which is the fault this repo records as "a test
 * that hands a function an input its callers cannot produce". Instead it suppresses gaps the way
 * the APP does: `sendMaterialsRecorded` returns true for any query whose `materialsWanted` is
 * non-empty, so writing that field removes a query from the gap set whatever the other clauses say.
 *
 * ⚠️ SELF-CLEANING, AND THE RESTORE IS A FILE. Every id it touched is recorded in
 * `run-artifacts/.fillin-note-restore.json`; `--clean` deletes the field on exactly those and
 * nothing else. It never guesses a prior value — it only ever touched queries that HAD none.
 *
 *   node tests/e2e/seedFillinNote.mjs           # apply
 *   node tests/e2e/seedFillinNote.mjs --clean   # put the account back
 */
import { readFileSync, existsSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, getDocs, deleteDoc, collection, writeBatch, deleteField } from "firebase/firestore";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("dev only");

const CLEAN = process.argv.includes("--clean");
const RESTORE = "run-artifacts/.fillin-note-restore.json";
const NOTE_ID = "fixt-note-1";
/** how many gap queries to LEAVE, so the single-query card renders rather than the cohort */
const LEAVE = 2;

const app = initializeApp({
  apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: dev.VITE_FIREBASE_PROJECT_ID, storageBucket: dev.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: dev.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: dev.VITE_FIREBASE_APP_ID,
});
const cred = await signInWithEmailAndPassword(getAuth(app),
  process.env.SA_E2E_EMAIL ?? "harness@scriptally.test",
  process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD);
const db = getFirestore(app);
const uid = cred.user.uid;
const ref = (...p) => doc(db, "users", uid, ...p);

if (CLEAN) {
  await deleteDoc(ref("tasks", NOTE_ID)).catch(() => {});
  console.log("removed the note " + NOTE_ID);
  if (existsSync(RESTORE)) {
    const ids = JSON.parse(readFileSync(RESTORE, "utf8")).suppressed ?? [];
    let n = 0;
    for (let i = 0; i < ids.length; i += 400) {
      const b = writeBatch(db);
      /* ⚠️ `deleteField`, NOT an empty array. Every id in this file HAD no materialsWanted before
         the fixture wrote one, so putting back an empty array would leave a field the account never
         carried — and `hasRecordedMaterials([])` is false, so it would even behave the same, which
         is exactly how a fixture leaves permanent residue nobody notices. */
      for (const id of ids.slice(i, i + 400)) { b.update(ref("queries", id), { materialsWanted: deleteField() }); n++; }
      await b.commit();
    }
    rmSync(RESTORE, { force: true });
    console.log("restored " + n + " queries to having no recorded materials");
  } else {
    console.log("no restore file — nothing to put back");
  }
  process.exit(0);
}

const queries = (await getDocs(collection(db, "users", uid, "queries"))).docs.map((d) => ({ id: d.id, ...d.data() }));
/* the app's own test for "this query has materials on it" is a non-empty array */
const TERMINAL = new Set(["Rejected", "Withdrawn", "No Response"]);
const bare = queries.filter((q) => !(Array.isArray(q.materialsWanted) && q.materialsWanted.length > 0))
  .sort((a, b) => a.id.localeCompare(b.id));
/**
 * ⚠️ THE TWO KEPT MUST ACTUALLY BE GAPS, or the fixture suppresses everything and produces NOTHING.
 * Choosing by id alone could keep two closed queries — a terminal query is never a gap — and the
 * board would then show no fill-in card at all, which reads exactly like the fixture not working.
 * This is a filter for CHOOSING only; suppression still goes through the app's own switch, so a
 * mistake here costs a card that does not appear rather than a wrong claim. Verify on the board.
 */
const gapLike = (q) => !TERMINAL.has(q.status) && !!q.dateSent && !!q.agentId && !!q.manuscriptId;
console.log("queries: " + queries.length + " · without recorded materials: " + bare.length);
if (bare.length <= LEAVE) {
  console.log("already at or below the threshold — nothing to suppress");
} else {
  const candidates = bare.filter(gapLike);
  if (candidates.length < LEAVE) throw new Error("only " + candidates.length + " gap-like queries — cannot leave " + LEAVE);
  const keep = candidates.slice(0, LEAVE).map((q) => q.id);
  const suppress = bare.filter((q) => !keep.includes(q.id)).map((q) => q.id);
  console.log("leaving " + keep.length + " gap(s): " + keep.join(", "));
  console.log("suppressing " + suppress.length + " by writing materialsWanted");
  for (let i = 0; i < suppress.length; i += 400) {
    const b = writeBatch(db);
    for (const id of suppress.slice(i, i + 400)) b.update(ref("queries", id), { materialsWanted: ["Query letter"] });
    await b.commit();
  }
  mkdirSync("run-artifacts", { recursive: true });
  writeFileSync(RESTORE, JSON.stringify({ suppressed: suppress, keep, at: "applied by seedFillinNote.mjs" }, null, 1));
  console.log("restore file written: " + RESTORE);
}

/* ⚠️ A NOTE, NOT A TASK — the two natures are derived from `dueDate`, so its ABSENCE is what makes
   this a note. Giving it a date would seed the other fixture and leave the note cases still NOT RUN. */
const now = new Date().toISOString();
await setDoc(ref("tasks", NOTE_ID), {
  id: NOTE_ID, userId: uid,
  text: "Ask Marcus Reed about the revised opening",
  done: false, createdAt: now, updatedAt: now,
});
console.log("wrote the note " + NOTE_ID);
console.log("\n⚠️  THE BOARD IS NOW A DIFFERENT SHAPE FOR EVERY SESSION ON THIS ACCOUNT.");
console.log("    Measure, then: node tests/e2e/seedFillinNote.mjs --clean");
process.exit(0);
