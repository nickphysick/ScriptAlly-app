/**
 * Read or set the dev harness account's plan, so the Pro-gated package write can be exercised.
 *
 * ⚠️ IT PUTS THE PLAN BACK. `addPackage` refuses on FREE, so proving the builder needs PRO — but the
 * harness fixture is shared with other streams, so leaving it flipped would change their baseline
 * without telling them. Every use is flip → prove → restore, and the current value is printed first.
 *
 *   node tests/e2e/harnessPlan.mjs          # read
 *   node tests/e2e/harnessPlan.mjs Pro      # set
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
