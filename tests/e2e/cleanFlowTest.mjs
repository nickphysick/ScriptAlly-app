/**
 * Remove the materials the flow measurements create, so a re-run starts from the same fixture.
 *
 * ⚠️ WHY THIS EXISTS: the Phase 2 walk creates a material, edits it, and switches its mode. Run
 * twice, the second run finds the first run's leftovers already converted and fails looking for a
 * field that is no longer there — "a probe that alters the fixture it measures makes the next run's
 * baseline its own last run", which rulesProbe already had to learn.
 *
 * It deletes ONLY versions whose name starts with the test prefix, on the dev harness account.
 *
 *   node tests/e2e/cleanFlowTest.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const env = (f) => Object.fromEntries(
  readFileSync(f, "utf8").split("\n").map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }),
);
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("dev only");
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");

const app = initializeApp({
  apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: dev.VITE_FIREBASE_PROJECT_ID, storageBucket: dev.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: dev.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: dev.VITE_FIREBASE_APP_ID,
});
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(
  getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", PASSWORD);

const PREFIX = "Flow ";
const snap = await getDocs(collection(db, "users", user.uid, "versions"));
let n = 0;
for (const d of snap.docs) {
  if ((d.data().versionName ?? "").startsWith(PREFIX)) {
    await deleteDoc(doc(db, "users", user.uid, "versions", d.id));
    n += 1;
  }
}
console.log(`removed ${n} test material(s) named "${PREFIX}…"`);
process.exit(0);
