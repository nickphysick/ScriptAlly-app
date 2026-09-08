/**
 * SEED A QUERYING GOAL, BECAUSE THE HARNESS ACCOUNT HAS NEVER SET ONE.
 *
 * ⚠️ THE GOALS CARD HAS TWO SURFACES AND THE ACCOUNT ONLY EVER SHOWS ONE. With no target set it
 * renders its unset state — a line and a "Set a target" button — so the count, the "of N", the row
 * of slots and the four history bars are all unreachable, and every check of them measures nothing.
 * The ref-diff's type rows for the figure reported "no element in the APP" for exactly this: not a
 * fault, a fixture that has only ever been in one state.
 *
 * It writes the SAME FIELD THE APP WRITES — one `queryingGoals` entry, the shape `appendGoalEntry`
 * produces — and nothing else.
 *
 *   node tests/e2e/seedGoal.mjs          # seed
 *   node tests/e2e/seedGoal.mjs --clean  # remove exactly what it seeded
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, deleteField, collection, getDocs } from "firebase/firestore";

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


/* ⚠️ EFFECTIVE FROM THE START OF THE PERIOD, NOT FROM NOW. `deriveGoalProgress` counts sends inside
   the entry's own period; an entry stamped today would count nothing and the card would render
   "0 of 8" on an account with sends behind it — a true number about the wrong window. */
const TARGET = 8;
const CADENCE = "month";
const EFFECTIVE_FROM = "2026-01-01";

const ref = doc(db, "users", uid);
const snap2 = await getDoc(ref);
const existing = snap2.data()?.queryingGoals ?? [];

if (clean) {
  const kept = existing.filter((e) => e.effectiveFrom !== EFFECTIVE_FROM);
  if (kept.length === existing.length) { console.log("nothing seeded by this script to clean"); }
  else {
    await updateDoc(ref, { queryingGoals: kept.length ? kept : deleteField() });
    console.log(`  cleaned the ${EFFECTIVE_FROM} entry · ${kept.length} left`);
  }
} else if (existing.some((e) => e.effectiveFrom === EFFECTIVE_FROM)) {
  console.log("already seeded");
} else {
  await updateDoc(ref, {
    queryingGoals: [...existing, { target: TARGET, cadence: CADENCE, effectiveFrom: EFFECTIVE_FROM }],
  });
  console.log(`  seeded ${TARGET} per ${CADENCE} from ${EFFECTIVE_FROM}`);
}
process.exit(0);
