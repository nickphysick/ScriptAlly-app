/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.4 F3's fixtures: TWO SPARSE PROFILES — an agent with a reply time and no genres (the link stays
 * in What they want, Replies in shows the weeks), and one with neither (the link spans both columns). The shared
 * account has one of the second and none of the first, so without these the lock would see one branch only.
 *
 * ⚠️ SELF-CLEANING: the document carries the `cl254fx-` prefix and a deterministic id; the lock writes it before it
 * measures and `--clean` removes it in the same run.
 *
 *   node tests/e2e/seedCl254Sparse.mjs           # write it
 *   node tests/e2e/seedCl254Sparse.mjs --clean   # remove it
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDocs, deleteDoc, collection, setDoc } from "firebase/firestore";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("dev only");
const EMAIL = process.env.SA_E2E_EMAIL ?? "harness@scriptally.test";
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");

const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID });
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(getAuth(app), EMAIL, PASSWORD);
const uid = user.uid;
const PREFIX = "cl254fx-";
const DAY = 86_400_000;
const iso = (daysAgo) => new Date(Date.now() - daysAgo * DAY).toISOString();

async function wipe() {
  let gone = 0;
  for (const coll of ["agents", "taskFlags", "activities", "tasks"]) {
    for (const d of (await getDocs(collection(db, "users", uid, coll))).docs) if (d.id.includes(PREFIX)) { await deleteDoc(d.ref); gone++; }
  }
  return gone;
}

if (process.argv.includes("--clean")) { console.log(`cl254fx: removed ${await wipe()}`); process.exit(0); }
await wipe();
const base = (id, extra) => ({
  id, userId: uid, agency: "Sparrowhawk Literary", email: `${id}@example.test`,
  website: "", genres: [], notes: "", agentNotes: "", mswlNotes: "", twitter: "", bluesky: "", instagram: "", socials: [],
  city: "Bath", country: "GB", submissionStatus: "Open", submissionMethod: "Email",
  setAside: false, importedNeedsReview: false, materialsWanted: [],
  dateAdded: iso(30), lastCheckedDate: iso(4), ...extra,
});
await setDoc(doc(db, "users", uid, "agents", `${PREFIX}rep`), base(`${PREFIX}rep`, { name: "Clara Moss", responseTimeWeeks: 6, noResponseMeansNo: false }));
await setDoc(doc(db, "users", uid, "agents", `${PREFIX}none`), base(`${PREFIX}none`, { name: "Ottoline Vane" }));
console.log("cl254fx: seeded");
process.exit(0);
