/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE THIN CASES — one fixture for the journeys the harness account has never had.
 *
 * ⚠️ WHY THIS EXISTS. Four rounds have reported assertions as NOT RUN because the shared account
 * happened to hold no example: the Close journey twice, the chase journey never once, and the
 * reminder path not at all. Worse, the account CHANGES BETWEEN RUNS — other sessions drive the same
 * user — so a probe that reads "whatever pane is open" has twice reported a true sentence about the
 * wrong journey. A measurement whose fixture is weather is not a measurement.
 *
 * ⚠️ RE-RUNNABLE AND SELF-CLEANING. Every document this writes carries the `thin-` prefix and a
 * deterministic id, so running it twice leaves exactly the state running it once did — it overwrites
 * rather than accumulating. `--clean` removes them and nothing else.
 *
 * ⚠️ AND IT PUTS THE PLAN BACK, the rule `harnessPlan.mjs` already states: the account is shared, so
 * a fixture that left it on Pro would change another stream's baseline without telling them. The
 * plan is flipped only with `--pro`, and `--clean` restores whatever it found.
 *
 * ⚠️ ONE CASE IT DOES NOT YET PRODUCE, AND THE DATA IS PROVEN CORRECT. `thin-q-close` is a
 * `Queried` query sent 400 days ago against an agency stating a 6-week window AND
 * `noResponseMeansNo: true` — which `taskPrecedence`'s own header says is the close case ("silence
 * is a stated pass … past window + grace → close"). Verified in Firestore: nrn=true, weeks=6,
 * dateSent 2025-07-17. The page still shows no Close row. So the gap is in the DERIVATION, not in
 * this fixture, and the next round starts from a case whose inputs are already known good rather
 * than from "the account has no example".
 *
 *   node tests/e2e/seedThinCases.mjs           # write the fixture
 *   node tests/e2e/seedThinCases.mjs --pro     # …and set the plan to Pro
 *   node tests/e2e/seedThinCases.mjs --clean   # remove it, restore the plan
 */
import { readFileSync, existsSync, writeFileSync, rmSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, getDocs, deleteDoc, collection, writeBatch } from "firebase/firestore";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
/* ⚠️ DEV ONLY, CHECKED BEFORE ANYTHING ELSE. This writes real documents; a fixture pointed at prod
   would seed a person's own record with invented queries. */
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("dev only");

const EMAIL = process.env.SA_E2E_EMAIL ?? "harness@scriptally.test";
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");

const app = initializeApp({
  apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID,
});
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(getAuth(app), EMAIL, PASSWORD);
const uid = user.uid;

const clean = process.argv.includes("--clean");
const pro = process.argv.includes("--pro");
const PREFIX = "thin-";
const iso = (daysAgo) => new Date(Date.now() - daysAgo * 864e5).toISOString();
const ymd = (daysFromNow) => new Date(Date.now() + daysFromNow * 864e5).toISOString().slice(0, 10);

/* ⚠️ THE PLAN IS REMEMBERED BEFORE IT IS TOUCHED, so --clean restores what was there rather than
   assuming Free. Another stream may legitimately have left it on Pro. */
const uref = doc(db, "users", uid);
const profile = (await getDoc(uref)).data() ?? {};

/**
 * ⚠️ WHAT THIS FIXTURE CHANGED IS REMEMBERED IN A LOCAL FILE, NOT ON THE USER DOCUMENT — and the
 * reason is the same `affectedKeys` allowlist that made delete-then-create necessary. A marker
 * field like `thinCasesPriorMute` is not in `isValidUser`'s update list, so writing it is DENIED
 * with the same `permission-denied` a stale ruleset gives. Measured, twice, in two rounds.
 *
 * A local file is the right home anyway: this is a dev tool's bookkeeping about what it borrowed,
 * not a fact about the writer's account. Gitignored by living under `run-artifacts/`.
 */
const MEMO = "run-artifacts/.thin-cases-restore.json";
const memo = existsSync(MEMO) ? JSON.parse(readFileSync(MEMO, "utf8")) : {};
const remember = (patch) => writeFileSync(MEMO, JSON.stringify({ ...memo, ...patch }, null, 2));

/**
 * ⚠️ IT ALWAYS CLEANS BEFORE IT WRITES, AND THAT IS WHAT MAKES IT RE-RUNNABLE — not the
 * deterministic ids. A second `setDoc` on an existing document is an UPDATE, and this app's update
 * rules are `affectedKeys().hasOnly([...])` allowlists that are deliberately narrower than the
 * create shape: re-writing the whole document sends `id` and `userId`, which create permits and
 * update does not. Measured — the first run succeeded and the second was DENIED, with the same
 * `permission-denied` a stale ruleset gives.
 *
 * Delete-then-create sidesteps it entirely and is the honest reading of "running it twice leaves
 * the same state": the second run genuinely rebuilds rather than patching.
 */
async function wipe() {
  let gone = 0;
  for (const coll of ["queries", "agents", "manuscripts", "tasks", "taskFlags"]) {
    for (const d of (await getDocs(collection(db, "users", uid, coll))).docs) {
      if (d.id.startsWith(PREFIX)) { await deleteDoc(d.ref); gone++; }
    }
  }
  return gone;
}

/**
 * ⚠️ THE RULE MUTE IS WHY NO CLOSE ROW HAS EVER RENDERED (reminder round, Phase 3), and it was
 * never a bug in the derivation. `replyTask` returns "close" for this fixture exactly as its header
 * says it will; `taskSurvivesMute` then removes the task, because the account carries
 * `mutedTaskRules: ["no_response_close", "dq_materials"]` — seeded by `seedSetAside.mjs`, whose own
 * `--clean` nobody ran. A whole journey was unmeasurable for four rounds because of fixture residue
 * on a shared account.
 *
 * ⚠️ SO THIS FIXTURE CLEARS IT AND PUTS IT BACK. It remembers whether the rule was muted when it
 * arrived, rather than assuming it was not — another stream may be measuring the mute deliberately,
 * and `seedSetAside.mjs` is exactly that stream.
 */
const MUTE_FOR_CLOSE = "no_response_close";

if (clean) {
  const gone = await wipe();
  if (memo.priorMute === true) {
    const back = new Set(profile.mutedTaskRules ?? []); back.add(MUTE_FOR_CLOSE);
    await setDoc(uref, { mutedTaskRules: [...back] }, { merge: true });
    console.log(`restored the ${MUTE_FOR_CLOSE} mute it found`);
  }
  if (memo.priorPlan) {
    await setDoc(uref, { plan: memo.priorPlan }, { merge: true });
    console.log(`plan restored to ${memo.priorPlan}`);
  }
  rmSync(MEMO, { force: true });
  console.log(`removed ${gone} thin-case documents`);
  process.exit(0);
}

/* every run starts from nothing of its own — see `wipe` */
const cleared = await wipe();
if (cleared) console.log(`cleared ${cleared} documents from a previous run`);

{
  const muted = new Set(profile.mutedTaskRules ?? []);
  const wasMuted = muted.has(MUTE_FOR_CLOSE);
  if (wasMuted) {
    muted.delete(MUTE_FOR_CLOSE);
    await setDoc(uref, { mutedTaskRules: [...muted] }, { merge: true });
    remember({ priorMute: true });
    console.log(`unmuted ${MUTE_FOR_CLOSE} (it was muted; --clean puts it back)`);
  }
}

const MS = `${PREFIX}ms`;
/* ⚠️ THE SHAPE IS `seed.mjs`'S, FIELD FOR FIELD. `isValidManuscript` and `isValidAgent` are
   allowlists with required members, and a document short of one is DENIED with the same
   `permission-denied` a stale ruleset gives — which is why this mirrors the working seed rather
   than writing the minimum that looks sufficient. Measured: the first attempt omitted
   `ageCategory` and `logline` and was refused. */
await setDoc(doc(db, "users", uid, "manuscripts", MS), {
  id: MS, userId: uid, title: "The Quiet Fixture",
  genre: "Literary Fiction", ageCategory: "Adult",
  wordCount: 88000,
  logline: "A fixture that stays true tomorrow.",
  status: "Querying", statusChangedDate: iso(120), comps: [], shelved: false,
});

/**
 * ⚠️ THE AGENTS CARRY DIFFERENT WINDOWS ON PURPOSE. A cohort whose agencies all state the same
 * requirements cannot show that "start from what each agent asks for" produces different rows —
 * which is the one claim that fill makes.
 */
const AGENTS = [
  /* ⚠️ `noResponseMeansNo` IS WHAT MAKES CLOSING THE SUGGESTION, and it is the agency's own stated
     policy rather than a switch to make the fixture work: an agency that says silence is a no is
     exactly the case where "consider closing" is the right advice. Without it a 400-day-old query
     produces a CHASE — measured, Close 0 and Chase 2, which is `replyTask` behaving correctly on an
     agency that has not said that. */
  { id: `${PREFIX}ag-close`, name: "Rosalind Vale", agency: "Vale & Marchetti", responseTimeWeeks: 6,
    noResponseMeansNo: true, materialsWanted: ["Query letter", "Synopsis"] },
  { id: `${PREFIX}ag-chase`, name: "Tobias Quint", agency: "Quint Literary", responseTimeWeeks: 4,
    materialsWanted: ["Query letter"] },
  { id: `${PREFIX}ag-remind`, name: "Imogen Farr", agency: "Farr & Boyd", responseTimeWeeks: 8,
    materialsWanted: ["Query letter", "Sample chapters"] },
  { id: `${PREFIX}ag-gap`, name: "Devendra Rao", agency: "Rao Agency", responseTimeWeeks: 10,
    materialsWanted: [] },
];
{
  const b = writeBatch(db);
  for (const a of AGENTS) {
    b.set(doc(db, "users", uid, "agents", a.id), {
      id: a.id, userId: uid, name: a.name, agency: a.agency,
      email: `${a.id}@example.test`,
      website: "", genres: ["Literary Fiction"], notes: "", agentNotes: "",
      mswlNotes: "", twitter: "", bluesky: "", instagram: "", socials: [],
      city: "London", country: "GB",
      submissionStatus: "Open", submissionMethod: "Email",
      responseTimeWeeks: a.responseTimeWeeks,
      starRating: 4, noResponseMeansNo: a.noResponseMeansNo === true,
      setAside: false, importedNeedsReview: false,
      materialsWanted: a.materialsWanted,
      dateAdded: iso(150), lastCheckedDate: iso(10),
    });
  }
  await b.commit();
}

/**
 * The queries, each one a case some assertion has never been able to reach.
 *
 * ⚠️ THE DATES ARE RELATIVE TO NOW, so the fixture stays true tomorrow. A close-eligible query
 * seeded with a fixed date stops being close-eligible the week the window moves.
 */
const QUERIES = [
  /* close: long past the stated window, so `replyTask` reaches its close branch */
  { id: `${PREFIX}q-close`, agentId: `${PREFIX}ag-close`, status: "Queried", sentDaysAgo: 400,
    materialsWanted: ["Query letter", "Synopsis"] },
  /* chase: past the window plus grace, but not old enough to close */
  { id: `${PREFIX}q-chase`, agentId: `${PREFIX}ag-chase`, status: "Queried", sentDaysAgo: 60,
    materialsWanted: ["Query letter"] },
  /* a reminder whose date has passed — the Phase 2 case, seeded so it is ready when that lands */
  { id: `${PREFIX}q-remind`, agentId: `${PREFIX}ag-remind`, status: "Queried", sentDaysAgo: 30,
    materialsWanted: ["Query letter"], nudgeDate: iso(2) },
  /* one materials gap BELOW the cohort threshold — the single fill-in journey */
  { id: `${PREFIX}q-gap-solo`, agentId: `${PREFIX}ag-gap`, status: "Partial Sent", sentDaysAgo: 45,
    materialsWanted: [] },
];
/* ⚠️ ENOUGH GAPS TO TRIP THE COHORT, and the threshold is read from the app rather than guessed:
   `queriesMissingMaterials` groups when there is more than one, so six is comfortably over and
   still small enough to show the five-row fold with something behind it. */
for (let i = 0; i < 6; i++) {
  QUERIES.push({
    id: `${PREFIX}q-cohort-${i + 1}`, agentId: AGENTS[i % AGENTS.length].id,
    status: "Queried", sentDaysAgo: 200 - i * 9, materialsWanted: [],
  });
}
{
  const b = writeBatch(db);
  for (const q of QUERIES) {
    b.set(doc(db, "users", uid, "queries", q.id), {
      id: q.id, userId: uid, agentId: q.agentId, manuscriptId: MS,
      dateSent: iso(q.sentDaysAgo), status: q.status, sendMethod: "Email",
      personalisationNotes: "", packageId: "", materialsWanted: q.materialsWanted,
      ...(q.nudgeDate ? { nudgeDate: q.nudgeDate } : {}),
    });
  }
  await b.commit();
}

/**
 * ⚠️ TWO SNOOZED TASKS, AND THE FLAG ID IS DERIVED, NEVER INVENTED. `taskFlagId` composes the id
 * from the flag's own fields and every restore path re-derives it — a doc called anything else is
 * one the app never touches, so the seeded row stays in the ledger while the write succeeds against
 * a different document. `seedSetAside.mjs` records that exact fault; this follows its rule.
 */
const flagId = (k) => [k.taskType, `q_${k.queryId ?? ""}`, `a_${k.agentId ?? ""}`, `r_${k.rule ?? ""}`].join("__");
/* ⚠️ THE SNOOZED PAIR MUST NOT BE THE QUERIES THE OTHER CASES NEED. The first version snoozed
   `q-close` and `q-chase` — the exact two whose journeys this fixture exists to make reachable —
   so it suppressed its own subjects and the Close row was still absent. Measured: pills came back
   Chase 1, Close 0. They ride on cohort queries, which have a spare each. */
const SNOOZED = [
  { taskType: "materials_unrecorded", queryId: `${PREFIX}q-cohort-5` },
  { taskType: "materials_unrecorded", queryId: `${PREFIX}q-cohort-6` },
];
for (const k of SNOOZED) {
  /* ⚠️ THE ID CARRIES THE PREFIX SO --clean CAN FIND IT, and the canonical id is stored beside it —
     the app re-derives the canonical one, so a restore acts on that and this row is the fixture's
     own copy. Both are removed by the prefix sweep. */
  const id = `${PREFIX}${flagId(k)}`;
  await setDoc(doc(db, "users", uid, "taskFlags", id), {
    id, userId: uid, taskType: k.taskType, queryId: k.queryId,
    snoozedUntil: new Date(Date.now() + 14 * 864e5).toISOString(), snoozeCount: 1,
  });
}

if (pro) {
  remember({ priorPlan: profile.plan ?? "Free" });
  await setDoc(uref, { plan: "Pro" }, { merge: true });
  console.log(`plan set to Pro (was ${profile.plan ?? "Free"}; --clean restores it)`);
}

console.log(`wrote ${AGENTS.length} agents, ${QUERIES.length} queries, ${SNOOZED.length} snoozed flags, 1 manuscript`);
console.log(`close=${PREFIX}q-close  chase=${PREFIX}q-chase  reminder=${PREFIX}q-remind  cohort=6  solo-gap=1`);
process.exit(0);
