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

for (const c of ["manuscripts", "agents", "queries"]) {
  console.log(`  ${c}: ${(await getDocs(path(c))).size} docs on the account`);
}
process.exit(0);
