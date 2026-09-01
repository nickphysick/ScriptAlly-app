/**
 * SEED ONE RECORDED REJECTION on the harness account, so the board's `Closed` tab has something to
 * reconcile against.
 *
 * ⚠️ WHY IT EXISTS. `Closed` read 0 on this account, so every check about it was satisfied over an
 * empty set: "Closed holds exactly the closed rows" is 0 = 0, and "a closed card keeps its dashed
 * frame" was asserted over no closed cards at all. A green from an empty population is the fault
 * this whole round is about.
 *
 * ⚠️ IT MAKES A NEW AGENT AND A NEW QUERY rather than rejecting an existing one. Flipping a live
 * query's status would change what every other measurement on this account sees — the row counts,
 * the tab counts, the sort order — and a fixture that quietly rewrites the subject of other checks
 * is worse than no fixture.
 *
 *   node tests/e2e/seedRejection.mjs           # write it
 *   node tests/e2e/seedRejection.mjs --clean   # remove it
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, deleteDoc } from "firebase/firestore";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
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

const AGENT = "rej-agent-1";
const QUERY = "rej-query-1";
/* ⚠️ AN EXISTING MANUSCRIPT, NOT A NEW ONE. The board is manuscript-scoped, so a rejection hung on
   a manuscript of its own is filtered out of the view it exists to populate — seeded, stored,
   correct, and invisible. `seed-ms-1` is the one the board opens on. */
const MS = "seed-ms-1";
const clean = process.argv.includes("--clean");

const iso = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
};

if (clean) {
  await deleteDoc(doc(db, "users", uid, "queries", QUERY));
  await deleteDoc(doc(db, "users", uid, "agents", AGENT));
  console.log("removed the seeded rejection");
  process.exit(0);
}

/* ⚠️ DELETE BEFORE WRITING, SO RE-SEEDING WORKS. `setDoc` over an existing query is an UPDATE as
   far as the rules are concerned, and the update allowlist is narrower than the create one — so a
   second run that changes a field outside it is denied, with a bare PERMISSION_DENIED that reads
   like a credentials fault rather than a rules one. Creating fresh sidesteps it entirely. */
await deleteDoc(doc(db, "users", uid, "queries", QUERY)).catch(() => {});
await deleteDoc(doc(db, "users", uid, "agents", AGENT)).catch(() => {});

/* ⚠️ THE FULL SHAPES, BECAUSE THE RULES VALIDATE THEM. A partial agent or query is denied
   outright — `isValidAgent` / `isValidQuery` require the whole allowlisted set, not a subset — and
   the denial arrives as a bare PERMISSION_DENIED that reads like a credentials problem. */

await setDoc(doc(db, "users", uid, "agents", AGENT), {
  id: AGENT, userId: uid, name: "Imogen Rackham", agency: "Rackham & Hale",
  email: `${AGENT}@example.test`,
  website: "", genres: ["Literary Fiction"], notes: "", agentNotes: "",
  mswlNotes: "", twitter: "", bluesky: "", instagram: "", socials: [],
  city: "London", country: "GB",
  submissionStatus: "Open", submissionMethod: "Email",
  responseTimeWeeks: 8,
  starRating: 4, noResponseMeansNo: false,
  setAside: false, importedNeedsReview: false,
  materialsWanted: ["Query letter"],
  dateAdded: iso(160), lastCheckedDate: iso(20),
});

await setDoc(doc(db, "users", uid, "queries", QUERY), {
  id: QUERY, userId: uid, agentId: AGENT, manuscriptId: MS,
  dateSent: iso(20), status: "Rejected", sendMethod: "Email",
  responseDeadline: iso(20 - 8 * 7),
  personalisationNotes: "", packageId: "", materialsWanted: ["Query letter"],
  /* ⚠️ RECENT ON PURPOSE. A closure drops off the board once it is old enough — the grouping
     returns `null` for it and the row is not drawn at all — so a rejection dated months back
     seeds a Closed tab that stays empty, which is the very thing this fixture exists to fix. */
  rejectedDate: iso(2), lastStatusChange: iso(2),
});

console.log("seeded: one agent and one RECORDED REJECTION on " + MS);
process.exit(0);
