/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ONE READY AGENT WITH NO GENRES RECORDED, for the Contact list's ready rule (v15 §4; CL15-5 and the section's list).
 *
 * ⚠️ WHY THIS EXISTS. v15's ready rule is "open, not queried, and the genres fit OR are unknown". On the shared
 * account every ready agent FITS — measured 8 Oct: 2 ready, none without genres — so the "or unknown" half is never
 * entered and a lock over that fixture passes on a monoculture. This seeds the one case: an open agent, no query, no
 * genres. (The other half, an open unqueried KNOWN MISMATCH kept out of the set, the account already holds.)
 *
 * ⚠️ SELF-CLEANING, AND THE LOCK THAT USES IT CLEANS IN THE SAME RUN. The document carries the `rdyu-` prefix and a
 * deterministic id; `--clean` removes it and anything a run left against it.
 *
 *   node tests/e2e/seedReadyUnknown.mjs           # write it
 *   node tests/e2e/seedReadyUnknown.mjs --clean   # remove it
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
const PREFIX = "rdyu-";
const DAY = 86_400_000;
const iso = (daysAgo) => new Date(Date.now() - daysAgo * DAY).toISOString();

async function wipe() {
  let gone = 0;
  for (const coll of ["agents", "taskFlags", "activities", "tasks"]) {
    for (const d of (await getDocs(collection(db, "users", uid, coll))).docs) if (d.id.includes(PREFIX)) { await deleteDoc(d.ref); gone++; }
  }
  return gone;
}

if (process.argv.includes("--clean")) { console.log(`rdyu: removed ${await wipe()}`); process.exit(0); }
await wipe();
const AG = `${PREFIX}ag`;
await setDoc(doc(db, "users", uid, "agents", AG), {
  id: AG, userId: uid, name: "Quentin Unsorted", agency: "Unsorted & Vale", email: `${AG}@example.test`,
  website: "", genres: [], notes: "", agentNotes: "", mswlNotes: "", twitter: "", bluesky: "", instagram: "", socials: [],
  city: "Leeds", country: "GB", submissionStatus: "Open", submissionMethod: "Email", responseTimeWeeks: 6,
  noResponseMeansNo: false, setAside: false, importedNeedsReview: false, materialsWanted: ["Query letter"],
  dateAdded: iso(40), lastCheckedDate: iso(5),
});
console.log("rdyu: seeded");
process.exit(0);
