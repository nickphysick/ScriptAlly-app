/**
 * Contact list v11 — the account fixture the §11.3 lock stands on.
 *
 * The harness account seeds every agent WITH a query, so the "Never queried" count card had a
 * population of zero and its filter case could prove nothing (measured 25 Sep: never = 0 of 24).
 * Per the fixture-not-seed rule, `seed.mjs` is untouched (§12); this sibling adds ONE deterministic
 * never-queried agent, the way `seedThinCases.mjs` adds its own cases: dev-only, delete-before-
 * write, `--clean` removes it.
 *
 * The record doubles as a Housekeeping fixture for P6: no wishlist and no materials (two real
 * gaps), but NO reply-time gap — `responseTimeWeeks` ABSENT is the writer's "Unknown" and is not
 * flagged (ruling c; agentDataQualityNeeds flags only the quick-add stub 0).
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, deleteDoc } from "firebase/firestore";

const env = (p) => Object.fromEntries(readFileSync(p, "utf8").split("\n").filter((l) => l.includes("="))
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

const ID = "clv-fx-never";
const ref = doc(db, "users", uid, "agents", ID);

if (process.argv.includes("--clean")) {
  await deleteDoc(ref);
  console.log(`removed ${ID}`);
  process.exit(0);
}

await deleteDoc(ref).catch(() => {});
await setDoc(ref, {
  id: ID,
  userId: uid,
  name: "Imogen Vale",
  agency: "Vale & Winter Literary",
  email: "",
  website: "",
  genres: ["Thriller", "Suspense"],
  mswlNotes: "",
  submissionStatus: "Open",
  submissionMethod: "Email",
  materialsWanted: [],
  dateAdded: new Date().toISOString(),
  lastCheckedDate: new Date().toISOString(),
  notes: "",
});
console.log(`seeded ${ID} (never queried; wishlist + materials gaps; reply time deliberately unstated)`);
process.exit(0);
