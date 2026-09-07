/**
 * SEED A QUERY THAT HAS ALREADY BEEN NUDGED — Gone quiet's second feeder.
 *
 * ⚠️ THE ACCOUNT HAS NO `lastNudgeSentDate` ANYWHERE, so one whole branch of `taskCategory` is
 * unreachable on this fixture. Gone quiet's five cards are all `no_response_close`, and a
 * measurement over them passes for the stale-window feeder twice while reporting itself as
 * covering both. That is the monoculture fault this repo already records: the probe is correct,
 * the population is healthy, the assertion genuinely evaluates, and the branch that distinguishes
 * the two states is never entered.
 *
 * ⚠️ AND THE FIELD IT WRITES IS THE ONE THE APP WRITES. `logNudge` always sets `lastNudgeSentDate`
 * ("the nudge did happen"); `nudgeDate` is the writer's booked check-in, absent where they declined
 * one. Both are needed to reach the branch — the check-in date is what makes `replyTask` answer
 * "nudge" at all, and the sent date is what makes it a SECOND one. Seeding only the first would
 * produce no task; only the second, an ordinary nudge.
 *
 * ⚠️ IT TARGETS A QUERY THAT ALREADY RAISES A NUDGE, rather than manufacturing one. The point is
 * to move an existing card from Nudges to Gone quiet, which is the transition under test; inventing
 * a query would test a shape the account does not otherwise hold.
 *
 *   node tests/e2e/seedNudgedQuery.mjs          # seed
 *   node tests/e2e/seedNudgedQuery.mjs --clean  # remove exactly what it seeded
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, updateDoc, deleteField, collection, getDocs } from "firebase/firestore";

const env = (file) => Object.fromEntries(
  readFileSync(file, "utf8").split("\n")
    .map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }),
);
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
const PROJECT = dev.VITE_FIREBASE_PROJECT_ID;
if (PROJECT !== "scriptally-dev") throw new Error(`Refusing to seed "${PROJECT}".`);
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
const { user } = await signInWithEmailAndPassword(
  getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", PASSWORD);
const uid = user.uid;
const clean = process.argv.includes("--clean");
console.log(`database: ${dbId || "(default)"} · project: ${PROJECT} · uid ${uid}`);

/* ⚠️ NO MARKER FIELD, AND THAT IS A RULES CONSTRAINT RATHER THAN A PREFERENCE. The query-update
   allowlist is a `hasOnly([...])`, so ONE unlisted key denies the WHOLE write — the affectedKeys
   gotcha this repo records. `lastNudgeSentDate` and `nudgeDate` are both on the list; a
   `nudgeSeedMark` of my own would not be, and the seeder would fail on every query it touched.

   ⚠️ SO `--clean` TAKES THE ID, AND WILL NOT SWEEP. The first version keyed off "this account has
   no `lastNudgeSentDate` of its own, so anything holding one is mine" — which was FALSE, and the
   first `--clean` run proved it by deleting fields from TWO queries. `thin-q-remind` had acquired
   a `lastNudgeSentDate` at some point from the app itself, and the sweep took its `nudgeDate` with
   it — a field `seedThinCases.mjs` owns and documents. Restored by hand; nothing else was lost.

   A sweep cannot tell "mine" from "looks like mine". The id can, and the seed run prints it:

     node tests/e2e/seedNudgedQuery.mjs --clean thin-q-close

   Passing no id is refused rather than treated as "all", because the destructive reading of an
   omitted argument is exactly the shape that caused this. */
const DAY = 86_400_000;

const snap = await getDocs(collection(db, "users", uid, "queries"));

if (clean) {
  const id = process.argv.find((a) => a !== "--clean" && !a.startsWith("-") && !a.endsWith(".mjs")
    && !a.includes("/"));
  if (!id) {
    console.log("--clean needs the id the seed run printed, e.g. --clean thin-q-close");
    console.log("(refusing to sweep: a sweep cannot tell a query it seeded from one that merely looks seeded)");
    process.exit(1);
  }
  const d = snap.docs.find((x) => x.id === id);
  if (!d) { console.log(`no query "${id}" on this account`); process.exit(1); }
  await updateDoc(doc(db, "users", uid, "queries", id), {
    lastNudgeSentDate: deleteField(), nudgeDate: deleteField(),
  });
  console.log(`  cleaned ${id}`);
  console.log("cleaned 1");
  process.exit(0);
}

/* ⚠️ A QUERY STILL AWAITING A REPLY, WITH A SEND OLD ENOUGH TO BE PAST ANY WINDOW. `replyTask`
   returns "none" for anything that is not the agent's turn, so a replied-to or closed query would
   silently seed nothing and the branch would still be unreached — which reads exactly like the
   seeder working. The status check is what stops that. */
const AWAITING = new Set(["Queried", "Partial Sent", "Full Sent"]);
const target = snap.docs.find((d) => {
  const q = d.data();
  if (!AWAITING.has(q.status)) return false;
  if (q.lastNudgeSentDate) return false;
  const sent = Date.parse(q.dateSent);
  return Number.isFinite(sent) && Date.now() - sent > 120 * DAY;
});

if (!target) {
  console.log("no awaiting query old enough to have been nudged — seeded nothing");
  process.exit(1);
}

/* nudged 30 days ago, with a check-in booked for 14 days ago: the chase HAPPENED and the date the
   writer asked to be reminded on has come round. That is the whole of the second feeder. */
const nudged = new Date(Date.now() - 30 * DAY).toISOString();
const checkIn = new Date(Date.now() - 14 * DAY).toISOString().slice(0, 10);
await updateDoc(doc(db, "users", uid, "queries", target.id), {
  lastNudgeSentDate: nudged, nudgeDate: checkIn,
});
console.log(`  ${target.id} · ${target.data().status} · nudged ${nudged.slice(0, 10)} · check-in ${checkIn}`);
console.log("seeded 1");
process.exit(0);
