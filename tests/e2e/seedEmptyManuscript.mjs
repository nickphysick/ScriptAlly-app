/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ AN EMPTY MANUSCRIPT, BECAUSE THE SHORTEST PAGE IS THE ONE THAT OSCILLATES ═════════════════
 *
 * The book profile's overflow has fallen from 307px to 33px across three amendments, and a page
 * that overflows by less than its chrome sheds when it settles cannot settle stably — Noteboard
 * cycled 37 times at 47px. Every existing fixture manuscript has queries, versions and comps, so
 * the populated case is the TALL one. Nothing in the harness has ever rendered a book with nothing
 * in it, which is the case most likely to under-overflow.
 *
 * ⚠️ IT RESTORES IN THE SAME RUN. A measurement that writes and does not put the account back has
 * stopped being a measurement; `--restore` deletes the fixture and is called by the sweep itself.
 *
 *   node tests/e2e/seedEmptyManuscript.mjs            # create, print the id
 *   node tests/e2e/seedEmptyManuscript.mjs --restore  # delete it
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";

const env = (file) => Object.fromEntries(
  readFileSync(file, "utf8").split("\n")
    .map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }),
);
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
const PROJECT = dev.VITE_FIREBASE_PROJECT_ID;
if (PROJECT !== "scriptally-dev") {
  throw new Error(`Refusing to seed "${PROJECT}" — this script is for scriptally-dev only.`);
}
const EMAIL = process.env.SA_E2E_EMAIL ?? "harness@scriptally.test";
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
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(getAuth(app), EMAIL, PASSWORD);
const uid = user.uid;

/* ⚠️ The id says what it is and that it is disposable, so a stray one is recognisable on sight. */
const MS_ID = "seed-ms-empty";
const ref = doc(db, "users", uid, "manuscripts", MS_ID);

if (process.argv.includes("--restore")) {
  const existed = (await getDoc(ref)).exists();
  await deleteDoc(ref);
  console.log(existed ? `removed ${MS_ID}` : `${MS_ID} was already absent`);
  process.exit(0);
}

/**
 * ⚠️ THE EMPTIEST LEGAL MANUSCRIPT, WHICH IS NOT THE SAME AS THE EMPTIEST DOCUMENT I COULD WRITE.
 * `isValidManuscript` REQUIRES `wordCount is int` and `logline is string`, so omitting them is a
 * PERMISSION_DENIED — which is what the first version of this script got, and it looked exactly
 * like stale rules until the validator was read. They are present and empty: `0` and `""` are what
 * a book nobody has written into actually holds.
 *
 * No pitch, no synopsis, no comps, no children anywhere — the point is the shortest page the
 * profile can render, because a page that overflows by less than its chrome sheds cannot settle.
 */
await setDoc(ref, {
  id: MS_ID, userId: uid,
  title: "Nothing In It Yet",
  genre: "Literary Fiction", ageCategory: "Adult",
  wordCount: 0, logline: "",
  status: "Drafting", statusChangedDate: new Date().toISOString().slice(0, 10),
  comps: [], shelved: false,
});
console.log(MS_ID);
process.exit(0);
