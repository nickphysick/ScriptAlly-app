/**
 * Seed the dev test account so measurements run against a page with content.
 *
 * ⚠️ WHY THIS EXISTS: EVERY PLAYWRIGHT FIGURE SO FAR WAS TAKEN ON EMPTY PAGES. Nothing scrolled,
 * `safeToStrip` was false everywhere, and — the one that actually misled — Submission packages
 * rendered NO `.wsh-acts` at all, because its `actionsSlot` is gated on an active manuscript. So
 * the measurement said "all six headers identical" while the elements that differ were absent
 * from the DOM. An empty account does not just weaken a measurement; it hides the subject.
 *
 * ⚠️ IT WRITES THROUGH THE CLIENT SDK AS THE TEST USER, so `firestore.rules` validates every
 * document. A malformed record is REJECTED rather than stored — the rules are the schema check,
 * which is why nothing here re-implements one.
 *
 * ⚠️ DEV ONLY, AND THE PROJECT IS NAMED EXPLICITLY. Reads `.env.development`, whose projectId is
 * scriptally-dev; it refuses to run against anything else. `.firebaserc`'s default is PROD, and a
 * bare config resolving there is the documented way this goes wrong.
 *
 *   node tests/e2e/seed.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, collection, getDocs, getDoc, writeBatch } from "firebase/firestore";

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

const iso = (daysAgo) => new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);
const path = (coll) => collection(db, "users", uid, coll);

/* ── one manuscript ─────────────────────────────────────────────────────────────────────── */
const MS_ID = "seed-ms-1";
await setDoc(doc(db, "users", uid, "manuscripts", MS_ID), {
  id: MS_ID, userId: uid,
  title: "The Smoke Test",
  genre: "Literary Fiction", ageCategory: "Adult",
  wordCount: 92000,
  logline: "A measurement that agreed with itself for a whole day.",
  status: "Querying", statusChangedDate: iso(90), comps: [], shelved: false,
});

/* ── a dozen agents ─────────────────────────────────────────────────────────────────────── */
const NAMES = [
  ["Elinor Hale", "Cavendish & Roe"], ["Tom Ellery", "Curtis Vane"],
  ["Marcus Reed", "Reed & Partners"], ["Priya Nair", "Northbank Literary"],
  ["Joan Whitfield", "Whitfield Agency"], ["Sam Okoro", "Okoro Bell"],
  ["Rachel Lin", "Lin Literary"], ["David Marsh", "Marsh & Co"],
  ["Ana Duarte", "Duarte Words"], ["Peter Vance", "Vance Associates"],
  ["Iris Kwan", "Kwan & Hall"], ["Noah Bright", "Bright Literary"],
];
const AGENT_IDS = [];
{
  /**
   * ⚠️ `dateAdded` IS IMMUTABLE, AND RECOMPUTING IT IS WHAT BROKE THIS SEEDER (dev-rules, Phase 0).
   *
   * The agents' update allowlist (`firestore.rules:653`) does not include `dateAdded` — the date an
   * agent was added is not something a later write should rewrite, and that rule is right. But this
   * file wrote `iso(120 - i * 3)`, a date relative to TODAY, and `set` without merge over an agent
   * that already exists is an UPDATE whose `affectedKeys()` is a VALUE diff. On the day this was
   * first run the recomputed value matched what it had just written; every day after, it differed by
   * the days elapsed, `dateAdded` became an affected key, and the batch was refused — atomically, so
   * all twelve agents failed together and the account could not be restored at all.
   *
   * It had been failing that way, silently, for as long as the file existed. Nothing was wrong with
   * the rules and nothing was wrong with the data.
   *
   * ⚠️ SO THE STORED VALUE WINS WHERE THERE IS ONE. A fresh account gets the intended spread of
   * dates; an existing agent keeps the `dateAdded` it already has, so the key never enters the diff
   * and the seeder is idempotent on any day. A fixed constant would NOT do — it would differ from
   * what these agents already carry and be refused exactly the same way on the next run.
   */
  const existingAdded = new Map();
  for (let i = 0; i < NAMES.length; i++) {
    const snap = await getDoc(doc(db, "users", uid, "agents", `seed-agent-${i + 1}`));
    if (snap.exists() && typeof snap.data().dateAdded === "string") {
      existingAdded.set(i, snap.data().dateAdded);
    }
  }
  const batch = writeBatch(db);
  NAMES.forEach(([name, agency], i) => {
    const id = `seed-agent-${i + 1}`;
    AGENT_IDS.push(id);
    batch.set(doc(db, "users", uid, "agents", id), {
      id, userId: uid, name, agency,
      email: `${name.split(" ")[0].toLowerCase()}@example.com`,
      website: "", genres: ["Literary Fiction"], notes: "", agentNotes: "",
      mswlNotes: "", twitter: "", bluesky: "", instagram: "", socials: [],
      city: "London", country: "GB",
      submissionStatus: i % 5 === 0 ? "Closed" : "Open",
      submissionMethod: "Email",
      responseTimeWeeks: 8,
      starRating: (i % 5) + 1,
      noResponseMeansNo: i % 3 === 0,
      setAside: false, importedNeedsReview: false,
      materialsWanted: ["Query letter", "Synopsis"],
      dateAdded: existingAdded.get(i) ?? iso(120 - i * 3), lastCheckedDate: iso(10),
    });
  });
  await batch.commit();
  console.log(`wrote ${AGENT_IDS.length} agents`);
}

/* ── twenty queries across the pipeline ─────────────────────────────────────────────────── */
const STATUSES = [
  "Queried", "Queried", "Queried", "Queried", "Queried", "Queried",
  "Partial Requested", "Partial Sent", "Full Requested", "Full Sent",
  "Revise & Resubmit", "Offer",
  "Rejected", "Rejected", "Rejected", "Rejected",
  "Withdrawn", "No Response", "Queried", "Partial Requested",
];
{
  const batch = writeBatch(db);
  STATUSES.forEach((status, i) => {
    const id = `seed-query-${i + 1}`;
    batch.set(doc(db, "users", uid, "queries", id), {
      id, userId: uid,
      agentId: AGENT_IDS[i % AGENT_IDS.length],
      manuscriptId: MS_ID,
      dateSent: iso(100 - i * 4),
      status,
      sendMethod: "Email",
      personalisationNotes: "",
      packageId: "",
    });
  });
  await batch.commit();
  console.log(`wrote ${STATUSES.length} queries`);
}

/* ══ THREE CALENDAR FIXTURES THE ACCOUNT COULD NOT PRODUCE (Porcelain fix pack, Phase 2) ══════
 *
 * ⚠️ THEY EXIST BECAUSE THE LAST RUN'S ACCEPTANCE HAD TO SAY "not exercised" ABOUT THREE OF ITS
 * OWN CLAIMS. The near step, the hollow overrun and a passed named end were all covered by unit
 * tests over `fillFor` and by nothing on a rendered page — and a unit test cannot see a painted
 * tone. An honest gap in a report is better than a green that means nothing, but it is not as
 * good as closing it.
 *
 * ⚠️ EVERY DATE IS RELATIVE TO TODAY, so the fixtures stay in the state they were built for on
 * every day the seeder is run. A fixed date would drift out of its own case within a fortnight
 * and the acceptance would quietly stop measuring what it names.
 *
 * ⚠️ AND THE SENDS ARE INSIDE THE WINDOW ON PURPOSE for the near case. A stretch that begins
 * before the window's left edge is drawn from that edge, so its fill is a fraction of the VISIBLE
 * span rather than of the stated one — a real property of the drawing, and one a fixture must not
 * sit on top of if it means to measure the threshold.
 */
{
  const CAL = [
    /* ⚠️ THE NEAR STEP: 13 days elapsed against a 14-day window ≈ 93%, inside [85, 100).
       `responseTimeWeeks` IS AN INT in the rules (`firestore.rules:349`), so the window can only
       be a whole number of weeks — a fractional 1.6 was denied, and denied ATOMICALLY, taking all
       three fixtures with it. Two weeks is the shortest window that leaves room for a fraction
       above 85% that is not also 100%.
       ⚠️ AND BOTH ENDS SIT INSIDE THE 3-MONTH WINDOW (which opens 22 days back) on purpose: a
       stretch beginning before the left edge is drawn FROM that edge, so its fill is a fraction of
       what shows rather than of the stated span, and a fixture for a threshold must not sit on
       top of that. */
    { id: "seed-cal-near", name: "Wren Ashcombe", agency: "Ashcombe Literary",
      weeks: 2, sentDaysAgo: 13, status: "Queried" },
    /* a passed named end at a plausible distance: 48 days out on a 4-week window, so the date
       passed 20 days ago and the bar runs full to it and hollow past it */
    { id: "seed-cal-passed20", name: "Cormac Bligh", agency: "Bligh & Sons",
      weeks: 4, sentDaysAgo: 48, status: "Queried" },
    /* ⚠️ THE EXTREME, AND THE ONLY SHAPE THAT PUTS A LABEL ON A HOLLOW PIECE. The named end is far
       outside the window, so the whole run is past it and the run's words have nowhere solid to
       sit. It must be WRITER-held: an agent-held stretch whose date has passed is `quiet`, which
       has its own hatch and is exempted from the hollow treatment — so a `Queried` fixture here
       produced one quiet bar and no hollow label at all, which is how the first attempt at this
       fixture measured nothing. */
    { id: "seed-cal-passed865", name: "Ottoline Frayn", agency: "Frayn Agency",
      weeks: 4, sentDaysAgo: 893, status: "Full Requested" },
    /* ⚠️ A REMINDER THAT HAS NOT FALLEN DUE — the only shape that reaches `Needs you soon`, and
       the board had nothing in that group at all, so the claim "a future reminder is not an ask"
       was unexercised and the sweep reported zero rows rather than failing. Twelve weeks out with
       a reminder in a fortnight: nothing is owed yet, and the row must carry a dash. */
    { id: "seed-cal-soon", name: "Hester Blaine", agency: "Blaine & Vole",
      weeks: 12, sentDaysAgo: 20, status: "Queried", nudgeInDays: 14 },
  ];
  const kept = new Map();
  for (const c of CAL) {
    const snap = await getDoc(doc(db, "users", uid, "agents", c.id));
    if (snap.exists() && typeof snap.data().dateAdded === "string") kept.set(c.id, snap.data().dateAdded);
  }
  const batch = writeBatch(db);
  for (const c of CAL) {
    batch.set(doc(db, "users", uid, "agents", c.id), {
      id: c.id, userId: uid, name: c.name, agency: c.agency,
      email: `${c.name.split(" ")[0].toLowerCase()}@example.com`,
      website: "", genres: ["Literary Fiction"], notes: "", agentNotes: "",
      mswlNotes: "", twitter: "", bluesky: "", instagram: "", socials: [],
      city: "London", country: "GB",
      submissionStatus: "Open", submissionMethod: "Email",
      responseTimeWeeks: c.weeks,
      starRating: 4, noResponseMeansNo: false,
      setAside: false, importedNeedsReview: false,
      materialsWanted: ["Query letter", "Synopsis"],
      /* ⚠️ `dateAdded` IS IMMUTABLE — the stored value wins where there is one, for the reason
         spelled out at the agents batch above: a value recomputed from today enters the update
         diff on every later run and the whole batch is refused, atomically and silently. */
      dateAdded: kept.get(c.id) ?? iso(200), lastCheckedDate: iso(5),
    });
    batch.set(doc(db, "users", uid, "queries", `${c.id}-q`), {
      id: `${c.id}-q`, userId: uid,
      agentId: c.id, manuscriptId: MS_ID,
      dateSent: iso(c.sentDaysAgo),
      status: c.status, sendMethod: "Email",
      personalisationNotes: "", packageId: "",
      ...(c.nudgeInDays ? { nudgeDate: iso(-c.nudgeInDays) } : {}),
    });
  }
  await batch.commit();
  console.log(`wrote ${CAL.length} calendar fixtures (near step, passed end ×2, future reminder)`);
}

/* ⚠️ ONE DATED TASK, so the Calendar's per-task row has a subject. The board renders one row per
   dated task now — title as the name, `Your task` beneath it, TICK IT OFF wired to `quickDone` —
   and none of that can be measured on an account with no task due. The title is deliberately long
   enough to make `barFit` choose between its three forms on a real chip. */
{
  const TASK_ID = "seed-cal-task";
  /* the collection is `tasks` — `users/{uid}/tasks`, the canonical stored to-do object */
  /* ⚠️ `createdAt` IS NOT IN THE UPDATE ALLOWLIST, and recomputing it from today is the SAME
     trap this file already records at `dateAdded` above — arriving a second time, in a different
     collection, through a different field. `affectedKeys()` is a VALUE diff: on the day this is
     first written the recomputed value matches, and every day after it differs by the elapsed
     time, `createdAt` enters the diff, and the write is refused. The stored value wins where
     there is one, which makes the seeder idempotent on any day. */
  const had = await getDoc(doc(db, "users", uid, "tasks", TASK_ID));
  await setDoc(doc(db, "users", uid, "tasks", TASK_ID), {
    id: TASK_ID, userId: uid,
    text: "Reread the O'Rourke pages before Thursday",
    done: false,
    dueDate: iso(-2),
    createdAt: (had.exists() && had.data().createdAt)
      || new Date(Date.now() - 5 * 86_400_000).toISOString(),
    updatedAt: new Date().toISOString(),
  });
  /* ⚠️ A CARRIED TASK — one whose date has PASSED and which is still not done. It is the only
     shape that puts two chips on one row: a ghost on the day it fell due, and the live item on
     today. The board had none, so "does a task draw twice" could not be answered on it at all. */
  const CARRIED_ID = "seed-cal-carried";
  const hadC = await getDoc(doc(db, "users", uid, "tasks", CARRIED_ID));
  await setDoc(doc(db, "users", uid, "tasks", CARRIED_ID), {
    id: CARRIED_ID, userId: uid,
    text: "Chase the Blaine partial",
    done: false,
    dueDate: iso(5),
    createdAt: (hadC.exists() && hadC.data().createdAt)
      || new Date(Date.now() - 20 * 86_400_000).toISOString(),
    updatedAt: new Date().toISOString(),
  });
  console.log("wrote 2 dated tasks (one due ahead, one carried)");
}

for (const c of ["manuscripts", "agents", "queries"]) {
  console.log(`  ${c}: ${(await getDocs(path(c))).size} docs on the account`);
}
process.exit(0);
