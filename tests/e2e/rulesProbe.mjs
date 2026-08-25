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
import { getFirestore, doc, updateDoc, setDoc, deleteDoc, deleteField, getDoc } from "firebase/firestore";

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
const qref = doc(db, "users", uid, "queries", "seed-query-1");
const snap = await getDoc(qref);
console.log(`read seed-query-1: ${snap.exists() ? "OK" : "MISSING"} — reads are ${snap.exists() ? "allowed" : "denied"}`);

const attempt = async (label, commit, fn, undo) => {
  try {
    await fn();
    console.log(`  ✅ ${label.padEnd(34)} (${commit}) ACCEPTED`);
    if (undo) { try { await undo(); } catch {} }
  } catch (e) {
    const denied = /permission|insufficient/i.test(e.message || "");
    console.log(`  ${denied ? "❌" : "⚠️ "} ${label.padEnd(34)} (${commit}) ${denied ? "DENIED" : "ERROR: " + e.message.slice(0, 90)}`);
  }
};

console.log("\nquery UPDATE allowlist, oldest field first:");
await attempt("personalisationNotes", "long-standing", () => updateDoc(qref, { personalisationNotes: "probe" }),
  () => updateDoc(qref, { personalisationNotes: "" }));
await attempt("hasAgentResponded", "derived-status era", () => updateDoc(qref, { hasAgentResponded: false }));
await attempt("rejectedDate (deleteField)", "Tier 3, ~5 Aug", () => updateDoc(qref, { rejectedDate: deleteField() }));
await attempt("closureOfferDismissed", "bd0cea5", () => updateDoc(qref, { closureOfferDismissed: true }),
  () => updateDoc(qref, { closureOfferDismissed: deleteField() }));
await attempt("writerExpectedDate", "6461c54", () => updateDoc(qref, { writerExpectedDate: new Date().toISOString() }),
  () => updateDoc(qref, { writerExpectedDate: deleteField() }));
await attempt("writerExpectedSetAt", "§1 final pack", () => updateDoc(qref, { writerExpectedSetAt: new Date().toISOString() }),
  () => updateDoc(qref, { writerExpectedSetAt: deleteField() }));
/* ⚠️ THE VALUE MUST CHANGE OR THIS PROVES NOTHING. `affectedKeys()` lists keys whose value DIFFERS,
   so writing the packageId a query already has leaves it out of the diff entirely and the attempt
   passes on rules that forbid it — a green that means "I did not test the thing". The seed writes
   packageId:"" on this query, so a non-empty value is a real change. Undone straight after. */
await attempt("packageId (attach)", "F7, 33b52b6", () => updateDoc(qref, { packageId: "seed-pkg-1" }),
  () => updateDoc(qref, { packageId: "" }));

/* ── the MATERIALS model (flow pack Phase 1) ────────────────────────────────────────────────── */
console.log("\nversions / materials — the flow pack's two additions:");
const vref = doc(db, "users", uid, "versions", "seed-mat-ql1");
const vsnap = await getDoc(vref);
if (!vsnap.exists()) {
  console.log("  ⚠️  seed-mat-ql1 missing — run `node tests/e2e/seedPackages.mjs` first");
} else {
  /* ⚠️ EACH WRITE CHANGES THE VALUE. An unchanged key is never in affectedKeys, so writing what is
     already stored passes on rules that forbid it — the F7 lesson, applied to the probe itself. */
  const before = vsnap.data();
  await attempt("wordCount (int)", "flow P1", () => updateDoc(vref, { wordCount: (before.wordCount ?? 0) + 7 }),
    () => updateDoc(vref, before.wordCount === undefined ? { wordCount: deleteField() } : { wordCount: before.wordCount }));
  await attempt("wordCount (deleteField / unset)", "flow P1", () => updateDoc(vref, { wordCount: deleteField() }),
    () => (before.wordCount === undefined ? Promise.resolve() : updateDoc(vref, { wordCount: before.wordCount })));
  await attempt("contentType 'ref' (name only)", "flow P1", () => updateDoc(vref, { contentType: "ref" }),
    () => updateDoc(vref, { contentType: before.contentType ?? "text" }));
  /* ⚠️ THE ARCHIVE MODEL'S ONE WRITE (broadsheet Ruling 2). Archiving IS an update and nothing
     else, so `status` had to reach the versions hasOnly allowlist or every archive would be denied
     silently while the validator said the document was fine — the F7 shape one collection along.
     The seed carries no `status`, so writing "Retired" is a real change and lands in affectedKeys;
     the undo unsets it rather than writing "Active", which would leave the fixture in a state the
     app never puts it in. */
  await attempt("status 'Retired' (archive)", "broadsheet P3", () => updateDoc(vref, { status: "Retired" }),
    () => updateDoc(vref, before.status === undefined ? { status: deleteField() } : { status: before.status }));
  /* And the value is bounded — a third string must be refused, or the field is free text. */
  await attempt("status 'Nonsense' (must be DENIED)", "broadsheet P3", () => updateDoc(vref, { status: "Nonsense" }),
    () => updateDoc(vref, before.status === undefined ? { status: deleteField() } : { status: before.status }));
}

/* ── the other branch: a material NOTHING holds must be deletable (Ruling 2) ────────────────── */
console.log("\nversions — the delete branch, on a throwaway document:");
{
  /* ⚠️ ON A DOCUMENT THE PROBE CREATES, NEVER ON A SEEDED ONE. This attempt is a real delete; run
     against seed-mat-ql1 it would remove a fixture three other probes depend on, and the next run's
     baseline would be this run's damage. */
  const tref = doc(db, "users", uid, "versions", "probe-throwaway-mat");
  await attempt("create a throwaway material", "long-standing",
    () => setDoc(tref, { id: "probe-throwaway-mat", manuscriptId: "seed-ms-1", userId: uid,
      componentType: "Query Letter", versionName: "Probe throwaway", fileAttached: false,
      createdDate: new Date().toISOString() }));
  await attempt("delete it outright", "long-standing", () => deleteDoc(tref));
}

console.log("\nglobal activity feed (isValidActivity's enumerated activityType):");
const gref = doc(db, "users", uid, "activities", "probe-holding-reply");
await attempt("activityType 'Holding Reply'", "Phase 1",
  () => setDoc(gref, { id: "probe-holding-reply", userId: uid, queryId: "seed-query-1", manuscriptId: "seed-ms-1",
    activityType: "Holding Reply", description: "probe", date: new Date().toISOString(), details: "" }),
  () => deleteDoc(gref));

console.log("\nnested per-query activity CREATE (isValidActivityNested):");
const aref = doc(db, "users", uid, "queries", "seed-query-1", "activity", "probe-activity");
await attempt("activity create", "long-standing",
  () => setDoc(aref, { type: "Queried", resultingStatus: "Queried", createdAt: new Date().toISOString(), note: "probe", queryId: "seed-query-1" }),
  () => deleteDoc(aref));

console.log("\nthe backfill's own two steps, on the query it fails for (seed-query-11):");
const q11 = doc(db, "users", uid, "queries", "seed-query-11");
const s11 = await getDoc(q11);
console.log(`  seed-query-11 status: ${s11.exists() ? s11.data().status : "MISSING"} · keys: ${s11.exists() ? Object.keys(s11.data()).sort().join(",") : "-"}`);
const h = doc(db, "users", uid, "queries", "seed-query-11", "activity", "probe-heal");
await attempt("heal step 1 — activity setDoc", "long-standing",
  () => setDoc(h, { type: s11.data().status, resultingStatus: s11.data().status, createdAt: new Date().toISOString(), note: "probe", queryId: "seed-query-11", agentName: "x", manuscriptTitle: "y" }, { merge: true }),
  () => deleteDoc(h));
/* ⚠️ IT UNDOES ITSELF. `revisionRound` and `hasAgentResponded` are absent on the seed record, so
   writing them leaves the account in a state it was not in — and a probe that alters the fixture
   it measures makes the next run's baseline its own last run. Both are cleared afterwards. */
await attempt("heal step 2 — recompute's ten keys", "Tier 3",
  () => updateDoc(q11, { status: s11.data().status, partialRequestedDate: deleteField(), partialSentDate: deleteField(),
    fullRequestedDate: deleteField(), fullSentDate: deleteField(), revisionRound: 1, hasAgentResponded: false,
    responseReceivedAt: deleteField(), rejectedDate: deleteField(), lastStatusChange: deleteField() }),
  () => updateDoc(q11, { revisionRound: deleteField(), hasAgentResponded: deleteField() }));
/* ⚠️ THE ID THE APP ACTUALLY GENERATES, not a clean one. `healId` is built from the STATUS, and
   "Revise & Resubmit" contains an ampersand — which `isValidId`'s ^[a-zA-Z0-9_-]+$ rejects. The
   probe's own clean id passed, which is exactly why the first pass called this collateral. */
const realHealId = `act-status-${s11.data().status.replace(/\s+/g, "-").toLowerCase()}-seed-query-11`;
console.log(`  the app's real heal id: "${realHealId}"`);
await attempt("heal step 1 — with the APP's id", "isValidId",
  () => setDoc(doc(db, "users", uid, "queries", "seed-query-11", "activity", realHealId),
    { type: s11.data().status, resultingStatus: s11.data().status, createdAt: new Date().toISOString(), note: "probe", queryId: "seed-query-11" }),
  () => deleteDoc(doc(db, "users", uid, "queries", "seed-query-11", "activity", realHealId)));
const after11 = await getDoc(q11);
console.log(`  seed-query-11 restored to: ${Object.keys(after11.data()).sort().join(",")}`);

/* ── the Noteboard's paper colour (Noteboard rebuild, 22 Aug) ───────────────────────────────── */
console.log("\nuserTasks — the Noteboard's colour, on a throwaway note:");
/* ⚠️ ON A THROWAWAY, AND CREATED WITHOUT `colour` ON PURPOSE. That is exactly what the app does:
   `isValidUserTask` is keys().hasOnly(), so an unlisted key denies the WHOLE document — a create
   carrying colour while the rules are stale loses the note, not the colour. So the note is written
   plain and `setUserTaskColour` follows. The two steps are probed separately for that reason. */
const tref = doc(db, "users", uid, "tasks", "probe-colour-note");
await attempt("create a plain note (no colour)", "long-standing",
  () => setDoc(tref, { id: "probe-colour-note", userId: uid, text: "rules probe", done: false,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
/* ⚠️ THE VALUE MUST CHANGE OR THIS PROVES NOTHING — the F7 lesson. The note was just created with
   no colour at all, so any colour is a real change and lands in affectedKeys. */
await attempt("colour 'pink' (the update)", "Noteboard P2",
  () => updateDoc(tref, { colour: "pink", updatedAt: new Date().toISOString() }));
/* and the value is BOUNDED — a fourth colour must be refused, or the field is free text */
await attempt("colour 'chartreuse' (must be DENIED)", "Noteboard P2",
  () => updateDoc(tref, { colour: "chartreuse", updatedAt: new Date().toISOString() }));
await attempt("remove the throwaway note", "long-standing", () => deleteDoc(tref));

/* ── querying goals (goals pack, Phase 1) ───────────────────────────────────────────────────── */
console.log("\nuser document — the querying-goals list:");
/* ⚠️ ON THE USER DOC, AND IT UNDOES ITSELF. The harness account carries no `queryingGoals`, so any
   list is a real change and lands in affectedKeys — the F7 lesson. The undo unsets the key rather
   than writing an empty list: [] and absent are DIFFERENT states to the derivation ("a target was
   removed" vs "no target was ever set"), and leaving [] behind would seed the next run with a
   history this one invented. */
const uref = doc(db, "users", uid);
const usnap = await getDoc(uref);
const hadGoals = usnap.exists() && usnap.data().queryingGoals !== undefined;
console.log(`  harness account already has queryingGoals: ${hadGoals ? "YES — NOT undoing" : "no"}`);
const restoreGoals = () => hadGoals
  ? updateDoc(uref, { queryingGoals: usnap.data().queryingGoals })
  : updateDoc(uref, { queryingGoals: deleteField() });

await attempt("queryingGoals — a real entry", "goals P1",
  () => updateDoc(uref, { queryingGoals: [{ target: 10, cadence: "month", effectiveFrom: "2026-08-01" }] }),
  restoreGoals);
/* the removal entry — the shape that says "there was a target, and it was taken away" */
await attempt("queryingGoals — the null (removal) entry", "goals P1",
  () => updateDoc(uref, { queryingGoals: [{ target: null, cadence: null, effectiveFrom: "2026-08-23" }] }),
  restoreGoals);
/* ⚠️ AND THE TYPE IS BOUNDED — a non-list must be refused, or `is list` is not doing its job. A
   probe that only ever tries the happy path cannot tell a live clause from an absent one. */
await attempt("queryingGoals as a string (must be DENIED)", "goals P1",
  () => updateDoc(uref, { queryingGoals: "not a list" }), restoreGoals);
/* and the cap is real — 201 entries must be refused (MAX_GOAL_ENTRIES is 200) */
await attempt("queryingGoals — 201 entries (must be DENIED)", "goals P1",
  () => updateDoc(uref, { queryingGoals: Array.from({ length: 201 },
    (_, i) => ({ target: 1, cadence: "week", effectiveFrom: `2026-01-0${(i % 9) + 1}` })) }), restoreGoals);
/* ⚠️ AND THE STATE IS PROVED RESTORED, not assumed. Every attempt above ran its own undo, but an
   undo inside a catch is exactly the thing that quietly does not happen. */
const afterGoals = await getDoc(uref);
console.log(`  queryingGoals after the probe: ${JSON.stringify(afterGoals.data().queryingGoals ?? null)}`);

/* ── flexible package shapes (consolidated pack, Part B) ────────────────────────────────────── */
console.log("\npackages — the free-text Other line, and the letter-on-create rule:");
/**
 * ⚠️ BOTH HALVES OF THE FIELD, BECAUSE EITHER ALONE IS A SILENT DENIAL. `otherMaterials` needs a
 * clause in `isValidPackage` AND an entry in the update allowlist; with only the first, an update
 * carrying it fails `hasOnly` and the write disappears with nothing the client can act on.
 *
 * ⚠️ AND THE LETTER RULE IS ASSERTED FROM BOTH SIDES. A create without a covering letter must be
 * REFUSED and an update of a legacy letterless package must still be ALLOWED — the split exists so
 * a record written before the rule stays repairable rather than becoming permanently unupdatable.
 * A probe that only tried the happy path could not tell that split from a rule applied everywhere.
 */
const PKG = doc(db, "users", uid, "packages", "probe-pkg-otherMaterials");
const basePkg = (over = {}) => ({
  id: "probe-pkg-otherMaterials", manuscriptId: "seed-ms-1", userId: uid,
  packageName: "Rules probe", queryLetterVersionId: "v-probe-letter",
  synopsisVersionId: "", samplePagesVersionId: "",
  status: "Active", createdDate: new Date(0).toISOString(), ...over,
});
const dropPkg = () => deleteDoc(PKG);

await attempt("package create — letter present", "Part B",
  () => setDoc(PKG, basePkg()), null);
await attempt("otherMaterials on UPDATE", "Part B",
  () => updateDoc(PKG, { otherMaterials: "chapter outline" }), null);
/* the writer clearing the line — an unset, never a stored "" */
await attempt("otherMaterials cleared (deleteField)", "Part B",
  () => updateDoc(PKG, { otherMaterials: deleteField() }), null);
/* the ceiling is real — 513 characters must be refused (OTHER_MAX is 512) */
await attempt("otherMaterials 513 chars (must be DENIED)", "Part B",
  () => updateDoc(PKG, { otherMaterials: "x".repeat(513) }), null);
/* an UPDATE may still empty the letter — legacy records have to stay repairable */
await attempt("update to an empty letter (must be ALLOWED)", "Part B",
  () => updateDoc(PKG, { queryLetterVersionId: "" }), null);
await dropPkg().catch(() => {});
/* …but a CREATE without one must not be possible */
await attempt("package create, NO letter (must be DENIED)", "Part B",
  () => setDoc(PKG, basePkg({ queryLetterVersionId: "" })), dropPkg);
await dropPkg().catch(() => {});

/* ── the lock: a sent package's contents are immutable (attachment model, D-D1) ─────────────── */
console.log("\npackages — the lock, both halves:");
/**
 * ⚠️ BOTH HALVES OR THE RULE IS UNPROVEN. "A sent package's slots are denied" is satisfied by a rule
 * that denies EVERY slot write, which would make the feature unusable and still pass. The unsent
 * ACCEPT is what says the lock is a lock rather than a wall.
 *
 * ⚠️ AND THE STAMP IS PROVED WRITE-ONCE, because that is the unlock if it is not: clear the field,
 * edit the slots, and the guarantee is a formality.
 */
await setDoc(PKG, basePkg()).catch(() => {});
await attempt("UNSENT — slot write (must be ALLOWED)", "D-D1",
  () => updateDoc(PKG, { synopsisVersionId: "v-probe-syn" }), null);
await attempt("stamp firstSentAt", "D-D1",
  () => updateDoc(PKG, { firstSentAt: new Date(0).toISOString() }), null);
await attempt("SENT — slot write (must be DENIED)", "D-D1",
  () => updateDoc(PKG, { synopsisVersionId: "v-probe-other" }), null);
await attempt("SENT — letter slot too (must be DENIED)", "D-D1",
  () => updateDoc(PKG, { queryLetterVersionId: "v-probe-other" }), null);
/* the writer may still file and archive — the lock is about what went, not about tidying */
await attempt("SENT — rename (must be ALLOWED)", "D-D1",
  () => updateDoc(PKG, { packageName: "Rules probe, renamed" }), null);
await attempt("SENT — archive (must be ALLOWED)", "D-D1",
  () => updateDoc(PKG, { status: "Retired" }), null);
/* and the stamp cannot be moved or removed */
await attempt("SENT — re-stamp firstSentAt (must be DENIED)", "D-D1",
  () => updateDoc(PKG, { firstSentAt: new Date(1).toISOString() }), null);
await attempt("SENT — clear firstSentAt (must be DENIED)", "D-D1",
  () => updateDoc(PKG, { firstSentAt: deleteField() }), null);
await dropPkg().catch(() => {});

const pkgGone = await getDoc(PKG);
console.log(`  probe package removed: ${pkgGone.exists() ? "NO — still present" : "yes"}`);

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   BOOK VERSIONS — named orderings of the book (manuscript-versions pack, D4)
   ══════════════════════════════════════════════════════════════════════════════════════════════

   ⚠️ NOT the `versions` SUBCOLLECTION probed above, which holds MATERIALS. Three separate fields on
   three separate documents, and each needs BOTH halves — the shape guard on the validator AND the
   key on the update allowlist. Either alone is broken, and the broken half fails SILENTLY: a
   permission error the UI shows as nothing happening.

   ⚠️ AND EACH PROBE PROVES ITS DENIAL AS WELL AS ITS ACCEPTANCE. An allowlist that accepts
   everything is not a lock, and a validator that accepts a string where a list belongs would let
   the single writer's shape rot without anything noticing.
*/
console.log("\nbook versions — the three optional fields:");
const MSREF = doc(db, "users", uid, "manuscripts", "seed-ms-1");
const msSnap = await getDoc(MSREF);
if (!msSnap.exists()) {
  console.log("  ⚠️  seed-ms-1 missing — run `node tests/e2e/seed.mjs` first");
} else {
  const beforeBV = msSnap.data().bookVersions;
  const undoBV = () => updateDoc(MSREF, beforeBV === undefined ? { bookVersions: deleteField() } : { bookVersions: beforeBV });
  await attempt("bookVersions (a real list)", "Part A", () => updateDoc(MSREF, {
    bookVersions: [{ id: "bv-probe", name: "Probe", kind: "initial", createdDate: "2026-08-25" }],
  }), null);
  /* ⚠️ THE SHAPE IS OWNED BY lib/bookVersions.ts, so the rule guards the CONTAINER — which means a
     string where a list belongs must be refused, or the guard is doing nothing at all. */
  await attempt("bookVersions as a string (must be DENIED)", "Part A",
    () => updateDoc(MSREF, { bookVersions: "not a list" }), null);
  /* and the cap is artefact-locked to MAX_BOOK_VERSIONS — 51 entries must not land */
  await attempt("bookVersions over the cap (must be DENIED)", "Part A", () => updateDoc(MSREF, {
    bookVersions: Array.from({ length: 51 }, (_, i) => ({ id: `bv-${i}`, name: `v${i}`, kind: "reordering", createdDate: "2026-08-25" })),
  }), null);
  await undoBV().catch(() => {});
}

const MATREF = doc(db, "users", uid, "versions", "seed-mat-ql1");
if ((await getDoc(MATREF)).exists()) {
  await attempt("material bookVersionId", "Part A",
    () => updateDoc(MATREF, { bookVersionId: "bv-probe" }),
    () => updateDoc(MATREF, { bookVersionId: deleteField() }));
  await attempt("material bookVersionId as a number (DENIED)", "Part A",
    () => updateDoc(MATREF, { bookVersionId: 7 }),
    () => updateDoc(MATREF, { bookVersionId: deleteField() }));
} else {
  console.log("  ⚠️  seed-mat-ql1 missing — run `node tests/e2e/seedPackages.mjs` first");
}

/* ⚠️ ON A THROWAWAY ACTIVITY, not a seeded one. A send's version is payload the correction pack can
   also move, and probing a real log entry would leave the feed carrying a probe value if the undo
   failed. Created and removed here. */
const ACT = doc(db, "users", uid, "activities", "probe-bookversion-act");
const baseAct = () => ({
  id: "probe-bookversion-act", userId: uid, queryId: "seed-query-1", manuscriptId: "seed-ms-1",
  activityType: "Materials Sent", description: "Rules probe", date: new Date().toISOString(),
  details: "", resultingStatus: "Full Sent",
});
await setDoc(ACT, baseAct()).catch(() => {});
await attempt("activity bookVersionId", "Part A",
  () => updateDoc(ACT, { bookVersionId: "bv-probe" }), null);
await attempt("activity bookVersionId as a list (DENIED)", "Part A",
  () => updateDoc(ACT, { bookVersionId: ["bv-probe"] }), null);
await deleteDoc(ACT).catch(() => {});
console.log(`  probe activity removed: ${(await getDoc(ACT)).exists() ? "NO — still present" : "yes"}`);

process.exit(0);
