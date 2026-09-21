/**
 * Fixtures for the to-do row's completion journeys (to-do row round, 20 Sep).
 *
 * ⚠️ EVERY JOURNEY NEEDS A QUERY IT HAS NOT ALREADY BEEN RUN ON, WHICH THE SHARED FIXTURE STOPS
 * PROVIDING AFTER ONE RUN. A send journey needs a `Full Requested` query with NO send logged — and
 * the moment a probe ticks it, it is a `Full Sent` and the next run meets the duplicate guard
 * instead of the journey. So these are written fresh, with `rj-` ids, and `--clean` removes them.
 *
 * ⚠️ IT SEEDS THE DUPLICATE CASE DELIBERATELY TOO. `rj-dupe` is a `Full Requested` query that ALSO
 * carries a logged full send, which is exactly what `priorSameTypeSend` looks for — so the guard's
 * path can be measured rather than waited for.
 *
 * ⚠️ `--clean` REMOVES THE TASK FLAGS AS WELL AS THE DOCUMENTS, AND THAT HALF WAS MISSING FIRST
 * TIME. Snoozing or dismissing one of these rows writes a `taskFlags` document keyed on the QUERY,
 * not on the query document itself — so deleting the query leaves a flag pointing at nothing, and
 * re-seeding the same id brings the row back already suppressed. The first run after that reads as
 * "the fixture did not seed": the query is there, the row is not, and nothing says why.
 *
 * ⚠️ IT IS ALSO THE REPAIR A MUTATION RUN NEEDS. Proving a lock red here meant disabling the very
 * undo the measurement's `finally` calls — so the mutated run committed a snooze it could not take
 * back, and restoring the SOURCE did not restore the ACCOUNT. Three later cases then spent their
 * full timeouts hunting a row that was no longer on the board: 14.7 minutes, three reds, and every
 * one of them a true statement about a fixture I had broken. **After any mutation run that touches
 * a write path, re-seed before believing the next result.**
 *
 *   node tests/e2e/seedRowJourneys.mjs           seed
 *   node tests/e2e/seedRowJourneys.mjs --clean   remove
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n")
  .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
  .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") {
  throw new Error(`refusing: projectId is ${dev.VITE_FIREBASE_PROJECT_ID}, not scriptally-dev`);
}
const app = initializeApp({
  apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: dev.VITE_FIREBASE_PROJECT_ID, storageBucket: dev.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: dev.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: dev.VITE_FIREBASE_APP_ID });
const { user } = await signInWithEmailAndPassword(getAuth(app),
  process.env.SA_E2E_EMAIL ?? "harness@scriptally.test",
  process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD);
const db = getFirestore(app, dev.VITE_FIREBASE_DATABASE_ID || "(default)");
const uid = user.uid;
const iso = (d) => new Date(Date.now() - d * 86400000).toISOString();
const q = (id) => doc(db, "users", uid, "queries", id);
const a = (id) => doc(db, "users", uid, "agents", id);
const IDS = ["rj-send", "rj-dupe"];
const AGENTS = ["rj-agent-1", "rj-agent-2", "rj-agent-3"];

/**
 * Every `taskFlags` document this fixture's rows can have produced.
 *
 * ⚠️ MATCHED ON THE STORED COMPONENTS, NOT ON THE ID. `flagKeyForTask` builds the id from the task
 * TYPE as well as the record, so there is one possible id per task type a row can raise — a list of
 * ids here would be a second copy of that mapping, free to fall out of step with it. Reading the
 * collection and matching `queryId`/`agentId` asks the question the flag itself answers.
 *
 * ⚠️ AND IT TOUCHES NOTHING ELSE. A sweep by date, or by "recently written", would take flags the
 * app's own surfaces wrote for the shared fixture — which is the account-wide damage this round has
 * already had to decline to do once.
 */
async function clearFlags() {
  const snap = await getDocs(collection(db, "users", uid, "taskFlags"));
  const mine = snap.docs.filter((d) => {
    const f = d.data();
    return IDS.includes(f.queryId) || AGENTS.includes(f.agentId);
  });
  for (const d of mine) await deleteDoc(doc(db, "users", uid, "taskFlags", d.id));
  return mine.length;
}

/**
 * ⚠️ SEEDING REMOVES BEFORE IT WRITES, AND THAT IS NOT TIDINESS — IT IS THE ONLY WAY IT IS
 * IDEMPOTENT. A second `setDoc` on an existing document is an UPDATE, and every one of this app's
 * update rules carries a `hasOnly()` allowlist rather than accepting any valid document: the first
 * seed succeeded as a create and the second was refused with `PERMISSION_DENIED`, naming neither
 * the collection nor the key, on a payload that had not changed a character. Running the seeder
 * twice is the normal case — it is what you reach for after a run leaves residue — so a seeder that
 * only works on an empty account is a seeder that fails exactly when it is needed.
 */
async function removeAll() {
  for (const id of IDS) await deleteDoc(q(id));
  for (const a of ["rj-dupe-sent", "rj-send-asked", "rj-nudge-sent"]) {
    await deleteDoc(doc(db, "users", uid, "activities", a));
  }
  for (const id of AGENTS) await deleteDoc(a(id));
  return clearFlags();
}

if (process.argv.includes("--clean")) {
  const flags = await removeAll();
  console.log("removed", IDS.length, "queries,", AGENTS.length, "agents and", flags, "task flags");
  process.exit(0);
}

const cleared = await removeAll();

const MS = "seed-ms-1";

/* ⚠️ THE SHAPES ARE `seed.mjs`'S, NOT RECONSTRUCTED. `isValidAgent` requires `website`,
   `mswlNotes`, `submissionMethod`, `materialsWanted`, `dateAdded`, `lastCheckedDate` and `notes`
   even when empty, and `isValidQuery` requires `packageId` — a payload missing any of them is
   denied with one message that names none of them. */
const agent = (id, name, agency, weeks) => ({
  id, userId: uid, name, agency,
  email: `${name.split(" ")[0].toLowerCase()}@example.com`,
  website: "", genres: ["Literary Fiction"], notes: "", agentNotes: "",
  mswlNotes: "", twitter: "", bluesky: "", instagram: "", socials: [],
  city: "London", country: "GB",
  submissionStatus: "Open", submissionMethod: "Email",
  responseTimeWeeks: weeks, starRating: 4, noResponseMeansNo: false,
  setAside: false, importedNeedsReview: false,
  materialsWanted: ["Query letter", "Synopsis"],
  dateAdded: iso(120), lastCheckedDate: iso(10),
});

await setDoc(a("rj-agent-1"), agent("rj-agent-1", "Imogen Vale", "Vale & Wick", 6));
await setDoc(a("rj-agent-2"), agent("rj-agent-2", "Tobias Hark", "Hark Literary", 8));

/* the send journey's own query: a full requested, never sent */
await setDoc(q("rj-send"), {
  id: "rj-send", userId: uid, agentId: "rj-agent-1", manuscriptId: MS, packageId: "",
  status: "Full Requested", sendMethod: "Email", personalisationNotes: "",
  dateSent: iso(60), lastStatusChange: iso(9), fullRequestedDate: iso(9),
});

/* the duplicate guard's: a full requested that ALREADY carries a logged full send.
   ⚠️ `priorSameTypeSend` reads the GLOBAL feed for `Materials Sent` + `resultingStatus: Full Sent`
   — not the query's own subcollection — so that is the document that has to exist. */
await setDoc(q("rj-dupe"), {
  id: "rj-dupe", userId: uid, agentId: "rj-agent-2", manuscriptId: MS, packageId: "",
  status: "Full Requested", sendMethod: "Email", personalisationNotes: "",
  dateSent: iso(70), lastStatusChange: iso(12), fullRequestedDate: iso(12),
});
await setDoc(doc(db, "users", uid, "activities", "rj-dupe-sent"), {
  id: "rj-dupe-sent", userId: uid, queryId: "rj-dupe", manuscriptId: MS,
  activityType: "Materials Sent", resultingStatus: "Full Sent", date: iso(5), details: "",
  description: "Full manuscript sent to Tobias Hark",
});

/**
 * ⚠️ NO NUDGE FIXTURE HERE, AND THE ATTEMPT IS RECORDED BECAUSE THE NEXT PERSON WILL TRY IT TOO.
 * `nudge_overdue` is a DERIVED `Task`, built in `db.tsx`'s generator, which chooses between a CLOSE
 * suggestion and a NUDGE for the same query. Two seeds were tried and both came back as closes: a
 * query 84 days out against a 6-week window (long past it), and one 70 days out against a 16-week
 * window (still inside it), each carrying `lastNudgeSentDate` and a `nudgeDate` two days in the
 * past — which the generator's own comment calls *"the writer's own reminder date — raises the SAME
 * nudge when it arrives"*. Both landed in "Gone quiet".
 *
 * So the input that flips that decision is something else — `noResponseMeansNo` on the agent,
 * `scheduledReminder` over `userTasks`, or `repliedSinceMs` — and finding it is a job for whoever
 * next needs the nudge journey on a page, not a guess to leave seeded. **A fixture that raises the
 * wrong card is worse than none: it adds a fourth quiet row and looks like it worked.**
 */

/**
 * ⚠️ AND THE FEED'S "Send it →" IS OFFERED BY `markSentOffered`, WHICH NEEDS A REQUEST EVENT IN THE
 * FEED — not merely a query sitting at a requested status. It reads an ACTIVITY whose resulting
 * status is a request and checks the query still stands there, so `rj-send` raised a board card and
 * no feed link: the board reads the query, the feed reads the log. Seeding the event is what makes
 * the two agree, and it is the same divergence that let a link be drawn over a suppressed task.
 */
await setDoc(doc(db, "users", uid, "activities", "rj-send-asked"), {
  id: "rj-send-asked", userId: uid, queryId: "rj-send", manuscriptId: MS,
  activityType: "Status Changed", resultingStatus: "Full Requested", date: iso(9), details: "",
  description: "Imogen Vale asked for the full manuscript",
});

console.log(`seeded rj-send (never sent, with a request in the feed), rj-dupe (already has a full send); cleared ${cleared} task flags`);
process.exit(0);
