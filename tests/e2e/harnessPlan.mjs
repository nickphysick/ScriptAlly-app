/**
 * Read — and historically set — the dev harness account's plan.
 *
 * ⚠️ THE SET HALF IS DEAD, AND DELIBERATELY SO (found 25 Sep, Contact list v11 P5). The user
 * rules now hold `incoming().plan == existing().plan` — a client may not change its own plan,
 * because a plan change is a billing event — so `node harnessPlan.mjs Pro` is DENIED on dev.
 * That guard is right and this helper does not argue with it: the READ half survives (suites
 * assert their premise's plan), and a measurement that needs a Pro window now needs a server-side
 * arrangement or a Pro fixture account, neither of which exists yet. The flip → prove → restore
 * paragraph that stood here described the pre-guard era.
 *
 *   node tests/e2e/harnessPlan.mjs          # read (works)
 *   node tests/e2e/harnessPlan.mjs Pro      # DENIED by the billing guard — kept so the denial
 *                                           # is observable rather than remembered
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("dev only");

const app = initializeApp({
  apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: dev.VITE_FIREBASE_PROJECT_ID, storageBucket: dev.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: dev.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: dev.VITE_FIREBASE_APP_ID,
});
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(
  getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test",
  process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD);

const ref = doc(db, "users", user.uid);
const before = (await getDoc(ref)).data()?.plan;
const want = process.argv[2];
if (!want) { console.log(`plan: ${before}`); process.exit(0); }
if (!["Free", "Pro"].includes(want)) throw new Error(`plan must be Free or Pro, got "${want}"`);
await updateDoc(ref, { plan: want });
console.log(`plan: ${before} → ${(await getDoc(ref)).data()?.plan}`);
process.exit(0);
