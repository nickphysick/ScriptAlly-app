/**
 * SEED SIX NOTES OF SIX LENGTHS, because the masonry claim is about ARRANGEMENT and an account's
 * own notes cannot be relied on to demonstrate it.
 *
 * ⚠️ IT WRITES WHAT THE APP WRITES AND NOTHING ELSE — a `userTask` with no dueDate is a note, per
 * `isNoteTask`. No colour: `colour` is in firestore.rules and NOT in the deployed ruleset, so a
 * create carrying it would be denied whole (hasOnly). That is the honest limit of this seed, and
 * it is why the three-papers claim is measured on the CASCADE rather than on seeded notes.
 *
 *   node tests/e2e/seedNotes.mjs          # seed
 *   node tests/e2e/seedNotes.mjs --clean  # remove exactly what it seeded
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

const env = (file) => Object.fromEntries(
  readFileSync(file, "utf8").split("\n")
    .map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }),
);
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
const PROJECT = dev.VITE_FIREBASE_PROJECT_ID;
if (PROJECT !== "scriptally-dev") throw new Error(`Refusing to seed "${PROJECT}".`);
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");

const app = initializeApp({
  apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: PROJECT,
  storageBucket: dev.VITE_FIREBASE_STORAGE_BUCKET, messagingSenderId: dev.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: dev.VITE_FIREBASE_APP_ID,
});
const dbId = dev.VITE_FIREBASE_DATABASE_ID;
const db = !dbId || dbId === "(default)" ? getFirestore(app) : getFirestore(app, dbId);
const { user } = await signInWithEmailAndPassword(
  getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", PASSWORD);
const uid = user.uid;
console.log(`database: ${dbId || "(default)"} · project: ${PROJECT} · uid ${uid}`);

/* ⚠️ SIX GENUINELY DIFFERENT LENGTHS. Six identical seeds collapse to one height and one column
   position, and a masonry check over them passes on a page that is not packing at all. One
   carries a NEWLINE, which is the pre-wrap claim's whole subject. */
const NOTES = [
  /* ⚠️ THE THREE PAPERS, WRITTEN THE WAY THE APP WRITES THEM — plain create, then the colour as
     its own update. `isValidUserTask` is keys().hasOnly(), so a create carrying `colour` denies
     the WHOLE document; seeding it in one write would test a path the app never takes and would
     fail outright on any database whose rules predate the field. */
  { n: 9, body: "NBPAPER yellow", colour: "yellow" },
  { n: 10, body: "NBPAPER pink", colour: "pink" },
  { n: 11, body: "NBPAPER sage", colour: "sage" },
  { n: 1, body: "NBPROBE one" },
  { n: 2, body: "NBPROBE two — a line with rather more in it than the first one carried" },
  { n: 3, body: "NBPROBE three\nsecond line\nthird line" },
  { n: 4, body: "NBPROBE four" },
  { n: 5, body: "NBPROBE five, which runs on at considerably greater length than any of the others so that the column packing has something to actually pack; it should wrap over several lines and make its card the tallest on the board by a clear margin." },
  { n: 6, body: "NBPROBE six — middling" },
  /* the pre-wrap PAIR: identical characters, one with a newline where the other has a space.
     Any height difference between them is the `white-space` declaration and nothing else. */
  { n: 7, body: "NBPAIR alpha beta" },
  { n: 8, body: "NBPAIR alpha\nbeta" },
];
/* ⚠️ NOT `notetask-*` — that is the retired projection's namespace and migrateNotetasks.mjs
   deletes strays in it (it classed three of this seeder's own notes as orphans and removed them,
   which is how this comment earned its place). Seed fixtures get their own prefix. */
const id = (n) => `nbseed-${n}`;
const clean = process.argv.includes("--clean");

for (const { n, body, colour } of NOTES) {
  const ref = doc(db, "users", uid, "tasks", id(n));
  if (clean) { await deleteDoc(ref); continue; }
  const at = `2026-08-${String(10 + (n % 20)).padStart(2, "0")}T09:00:00.000Z`;
  await setDoc(ref, {
    id: id(n), userId: uid, text: body, done: false, createdAt: at, updatedAt: at,
  });
  /* the second write, exactly as `setUserTaskColour` does it. Yellow needs none — absence IS
     yellow at the read — but it is seeded anyway so the three cards differ by a STORED value
     rather than one stored and two defaulted. */
  if (colour) {
    try { await updateDoc(ref, { colour, updatedAt: at }); }
    catch { console.log(`  ⚠️  colour "${colour}" denied on ${id(n)} — the rules deploy has not landed`); }
  }
}
console.log(clean ? `removed ${NOTES.length} probe notes` : `seeded ${NOTES.length} probe notes`);
process.exit(0);
