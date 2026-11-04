/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v26.2's fixture: ONE GAPPY AGENT (no genres, wishlist, materials, reply time or policy; never queried),
 * so the ghost lines and their "+ Add …" buttons have a subject, and the editing locks write to an agent nobody else reads.
 *
 * ⚠️ SELF-CLEANING: every document carries the `cl262fx-` prefix and a deterministic id; the lock writes them before it
 *    measures and `--clean` removes them in the same run. Through fsTarget, so the emulator by default.
 *
 *   node tests/e2e/seedCl262.mjs           # write them
 *   node tests/e2e/seedCl262.mjs --clean   # remove them
 */
import { targetEnv, TARGET_PROJECT } from "./fsTarget.mjs";
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDocs, deleteDoc, collection, setDoc } from "firebase/firestore";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = targetEnv();
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== TARGET_PROJECT) throw new Error("Refusing: not the target project");
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID });
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", PASSWORD);
const uid = user.uid;
const PREFIX = "cl262fx-";

async function wipe() {
  let gone = 0;
  for (const coll of ["agents", "activities"]) {
    for (const d of (await getDocs(collection(db, "users", uid, coll))).docs) if (d.id.includes(PREFIX)) { await deleteDoc(d.ref); gone++; }
  }
  return gone;
}
if (process.argv.includes("--clean")) { console.log(`cl262fx: removed ${await wipe()}`); process.exit(0); }
await wipe();
const id = `${PREFIX}gappy`;
const iso = new Date(Date.now() - 40 * 86_400_000).toISOString();
await setDoc(doc(db, "users", uid, "agents", id), {
  id, userId: uid, name: "Gwen Gappy", agency: "Ghost Lines Literary", email: "",
  website: "", genres: [], notes: "", agentNotes: "", mswlNotes: "", twitter: "", bluesky: "", instagram: "", socials: [],
  city: "Bath", country: "GB", submissionStatus: "Open", submissionMethod: "Email",
  setAside: false, importedNeedsReview: false, materialsWanted: [], dateAdded: iso, lastCheckedDate: iso,
});
console.log("cl262fx: seeded");
process.exit(0);
