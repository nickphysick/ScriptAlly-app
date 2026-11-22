/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.3 E5's fixture: ONE AGENT WHOSE GENRES CANNOT ALL FIT THE ROW'S CELL — seven long genres — so the
 * fitted pills have to drop whole pills and say "+n". The shared account's agents hold short genres that fit at both
 * widths, so without it the lock would pass on a monoculture.
 *
 * ⚠️ SELF-CLEANING: the document carries the `cl253fx-` prefix and a deterministic id; the lock writes it before it
 * measures and `--clean` removes it in the same run.
 *
 *   node tests/e2e/seedCl253Genres.mjs           # write it
 *   node tests/e2e/seedCl253Genres.mjs --clean   # remove it
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
const PREFIX = "cl253fx-";
const DAY = 86_400_000;
const iso = (daysAgo) => new Date(Date.now() - daysAgo * DAY).toISOString();

async function wipe() {
  let gone = 0;
  for (const coll of ["agents", "taskFlags", "activities", "tasks"]) {
    for (const d of (await getDocs(collection(db, "users", uid, coll))).docs) if (d.id.includes(PREFIX)) { await deleteDoc(d.ref); gone++; }
  }
  return gone;
}

if (process.argv.includes("--clean")) { console.log(`cl253fx: removed ${await wipe()}`); process.exit(0); }
await wipe();
const AG = `${PREFIX}ag`;
await setDoc(doc(db, "users", uid, "agents", AG), {
  id: AG, userId: uid, name: "Perpetua Longlist", agency: "Longlist & Many", email: `${AG}@example.test`,
  website: "", genres: ["Literary fiction", "Historical fiction", "Speculative fiction", "Science fiction", "Upmarket fiction", "Book club fiction", "Psychological thriller"], notes: "", agentNotes: "", mswlNotes: "", twitter: "", bluesky: "", instagram: "", socials: [],
  city: "Leeds", country: "GB", submissionStatus: "Open", submissionMethod: "Email", responseTimeWeeks: 6,
  noResponseMeansNo: false, setAside: false, importedNeedsReview: false, materialsWanted: ["Query letter"],
  dateAdded: iso(40), lastCheckedDate: iso(5),
});
console.log("cl253fx: seeded");
process.exit(0);
