/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v26 H7's fixture: TWENTY AGENTS, ONE ADDED IN EACH OF THE LAST TWENTY MONTHS, so the index row under
 * Date added holds more entries than fit and has to scroll (the harness account's agents were added in a few months).
 *
 * ⚠️ SELF-CLEANING: every document carries the `cl26fx-` prefix and a deterministic id; the lock writes them before it
 *    measures and `--clean` removes them in the same run. Through fsTarget, so the emulator by default.
 *
 *   node tests/e2e/seedCl26Months.mjs           # write them
 *   node tests/e2e/seedCl26Months.mjs --clean   # remove them
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
const PREFIX = "cl26fx-";

async function wipe() {
  let gone = 0;
  for (const coll of ["agents", "activities"]) {
    for (const d of (await getDocs(collection(db, "users", uid, coll))).docs) if (d.id.includes(PREFIX)) { await deleteDoc(d.ref); gone++; }
  }
  return gone;
}
if (process.argv.includes("--clean")) { console.log(`cl26fx: removed ${await wipe()}`); process.exit(0); }
await wipe();
const NAMES = ["Ada Quill", "Bea Stroud", "Cass Ingle", "Dot Merrow", "Edie Pask", "Fen Holt", "Gil Avery", "Hal Penrose", "Iva Lusk", "Jem Corder",
  "Kit Barrow", "Lyn Faulk", "Mo Redway", "Nell Upton", "Ona Silk", "Pip Garrow", "Quin Tolley", "Ros Ebb", "Sid Yarrow", "Tam Oake"];
const now = new Date();
for (let i = 0; i < 20; i++) {
  const d = new Date(now.getFullYear(), now.getMonth() - i - 1, 12, 12);
  const id = `${PREFIX}m${String(i).padStart(2, "0")}`;
  await setDoc(doc(db, "users", uid, "agents", id), {
    id, userId: uid, name: NAMES[i], agency: "Months Literary", email: `${id}@example.test`,
    website: "", genres: [], notes: "", agentNotes: "", mswlNotes: "", twitter: "", bluesky: "", instagram: "", socials: [],
    city: "Bath", country: "GB", submissionStatus: "Open", submissionMethod: "Email",
    setAside: false, importedNeedsReview: false, materialsWanted: [],
    dateAdded: d.toISOString(), lastCheckedDate: d.toISOString(),
  });
}
console.log("cl26fx: seeded 20");
process.exit(0);
