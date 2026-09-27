/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE COMPARABLE-TITLES FIXTURE (comps v2, 27 Sep) — five comps, and none ═════════════════════
 *
 * Two manuscripts on the harness account, both titled exactly as the mock's (`Murphy's Day Out`),
 * so the header's intro wraps where the mock's does and the §4.3 height comparison is between the
 * same sentence. They are told apart by id, never by title — the page reads the switcher's key.
 *
 *   seed-ms-comps5  the mock's own five comps, in the mock's order: two switched on (1st, 2nd), one
 *                   TV, one with no note and no facets, one from 2019 — every branch the card has.
 *   seed-ms-comps0  no comps at all: the empty state.
 *
 * ⚠️ DELETE-BEFORE-WRITE AND RESTORE IN THE SAME RUN. `setDoc` overwrites the whole document, so a
 * previous run's leftover comps cannot survive into this one; `--restore` deletes both and is called
 * by the suite's own `afterAll`. A measurement that leaves the account changed is not a measurement.
 *
 *   node tests/e2e/seedCompsFixture.mjs            # write both, print the ids
 *   node tests/e2e/seedCompsFixture.mjs --restore  # delete both
 *   node tests/e2e/seedCompsFixture.mjs --dump <id> # print that manuscript's stored comps
 *   node tests/e2e/seedCompsFixture.mjs --feed <id> # count its "Manuscript Updated" feed items
 *
 * ⚠️ `--restore` DELETES THE FIXTURES' FEED ITEMS TOO. Every comp write used to append a
 * "Manuscript Updated" activity, so earlier runs left items on the harness account naming
 * manuscripts that no longer exist — residue a restore that only deletes the manuscripts misses.
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, deleteDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

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

export const FILLED = "seed-ms-comps5";
export const EMPTY = "seed-ms-comps0";

/* The mock's SEED, field for field. Absent fields are OMITTED — Firestore maps reject `undefined`,
   and an empty string would be a recorded value the card then renders. */
const COMPS = [
  { title: "The Tidewater Line", author: "R. Okafor", publisher: "Harvill", year: 2021, media: "book", matchAxis: "single day · close third · coastal", note: "A whole novel on one day on the water, told close to one narrator.", inQuery: true, source: "user" },
  { title: "Salt Road", author: "Imogen Hale", publisher: "Faber", year: 2023, media: "book", matchAxis: "Irish coast · missing brother", note: "Coastal Irish setting, a missing brother, short punchy chapters.", inQuery: true, source: "user" },
  { title: "Nine Miles Out", author: "Callum Reid", publisher: "BBC Two", year: 2022, media: "tv", matchAxis: "ticking clock · tides", note: "The tide as a clock. Same pace I want in the second half.", inQuery: false, source: "user" },
  { title: "Bright Water", author: "Aoife Brennan", publisher: "Tinder Press", year: 2024, media: "book", matchAxis: "family secrets · harbour town", inQuery: false, source: "user" },
  { title: "Kestrel Hour", author: "D. Lindqvist", publisher: "Orion", year: 2019, media: "book", inQuery: false, source: "user" },
];

const base = (id, comps) => ({
  id, userId: uid,
  title: "Murphy's Day Out",
  genre: "Thriller", ageCategory: "Adult",
  wordCount: 50000, logline: "",
  status: "Drafting", statusChangedDate: new Date().toISOString().slice(0, 10),
  comps, shelved: false,
});

const ref = (id) => doc(db, "users", uid, "manuscripts", id);

/* `--dump <id>` prints that manuscript's stored comps as one JSON line — so a lock can assert what
   was WRITTEN, not only what the page drew from its own state. */
const di = process.argv.indexOf("--dump");
if (di > -1) {
  const snap = await getDoc(ref(process.argv[di + 1]));
  console.log(JSON.stringify(snap.exists() ? (snap.data().comps ?? []) : null));
  process.exit(0);
}

const feedFor = async (id) => (await getDocs(query(collection(db, "users", uid, "activities"), where("manuscriptId", "==", id))))
  .docs.filter((d) => d.data().activityType === "Manuscript Updated");

/* `--feed <id>` prints how many "Manuscript Updated" feed items name that manuscript. */
const fi = process.argv.indexOf("--feed");
if (fi > -1) {
  /* ⚠️ A STRING: under Playwright's FORCE_COLOR, console.log of a NUMBER prints ANSI-coloured digits */
  console.log(String((await feedFor(process.argv[fi + 1])).length));
  process.exit(0);
}

if (process.argv.includes("--restore")) {
  for (const id of [FILLED, EMPTY]) {
    const items = await feedFor(id);
    for (const d of items) await deleteDoc(d.ref);
    if (items.length) console.log(`removed ${items.length} feed item(s) naming ${id}`);
    const existed = (await getDoc(ref(id))).exists();
    await deleteDoc(ref(id));
    console.log(existed ? `removed ${id}` : `${id} was already absent`);
  }
  process.exit(0);
}

await deleteDoc(ref(FILLED));
await deleteDoc(ref(EMPTY));
await setDoc(ref(FILLED), base(FILLED, COMPS));
await setDoc(ref(EMPTY), base(EMPTY, []));
console.log(`${FILLED} ${EMPTY}`);
process.exit(0);
