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
import { collection, deleteDoc, doc, getDocs, getFirestore, query, setDoc, where } from "firebase/firestore";

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

/* The v11 fixture set — clv- ids, delete-before-write, restorable by re-running. P6 adds the
   three Housekeeping subjects; re-seeding is the RESTORE for any measurement that stamps or
   edits them (the stale wishlist's stamp in particular). */
const stamp = () => new Date().toISOString();
const base = (id, fields) => ({
  id, userId: uid, email: "", website: "", genres: [], mswlNotes: "",
  submissionStatus: "Open", submissionMethod: "Email", materialsWanted: [],
  dateAdded: stamp(), lastCheckedDate: stamp(), notes: "",
  ...fields,
});
const FX = [
  base("clv-fx-never", {
    name: "Imogen Vale", agency: "Vale & Winter Literary",
    genres: ["Thriller", "Suspense"],
    /* never queried; wishlist + materials gaps; reply time deliberately unstated (ruling c) */
  }),
  base("clv-fx-stub0", {
    name: "Edda Kron", agency: "Kron Literary",
    genres: ["Thriller"], mswlNotes: "High-concept suspense with a one-line hook.",
    mswlCheckedAt: stamp(),
    responseTimeWeeks: 0, /* the quick-add stub — the ONE flagged reply state, and no live query */
    materialsWanted: ["Query letter"],
  }),
  base("clv-fx-stale", {
    name: "Ingrid Marsh", agency: "Marsh & Weir",
    city: "York", country: "GB",
    genres: ["Literary fiction"], mswlNotes: "Quiet novels with a strong sense of place.",
    mswlCheckedAt: new Date(Date.now() - 200 * 86_400_000).toISOString(), /* 200 days — stale */
    responseTimeWeeks: 10, starRating: 4,
    materialsWanted: ["Query letter", "Synopsis"],
  }),
  base("clv-fx-reopen", {
    name: "Tomas Keller", agency: "Keller Rights",
    city: "Berlin", country: "DE",
    submissionStatus: "Closed", reopensOn: "2026-11-01", /* REMIND ME's set-the-task branch */
    genres: ["Crime"], responseTimeWeeks: 8,
    materialsWanted: ["Query letter"],
  }),
];

/* the reminders any REMIND ME measurement created against the fixture — removed on every run,
   clean or seed, so a task cannot outlive the subject it points at */
const fxIds = FX.map((f) => f.id);
const tasks = await getDocs(query(collection(db, "users", uid, "tasks"), where("agentId", "in", fxIds)));
for (const t of tasks.docs) await deleteDoc(t.ref);
if (tasks.size) console.log(`removed ${tasks.size} fixture reminder task(s)`);

if (process.argv.includes("--clean")) {
  for (const f of FX) await deleteDoc(doc(db, "users", uid, "agents", f.id));
  console.log(`removed ${FX.length} fixture agents`);
  process.exit(0);
}

for (const f of FX) {
  const r = doc(db, "users", uid, "agents", f.id);
  await deleteDoc(r).catch(() => {});
  await setDoc(r, f);
}
console.log(`seeded ${FX.length} fixture agents (${fxIds.join(", ")})`);
process.exit(0);
