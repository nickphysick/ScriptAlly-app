/**
 * MIGRATE THE PROJECTION ERA'S TASK DOCUMENTS (finish run, Phase 4 / Branch A).
 *
 * The projection model (22 Aug, one day) gave a note's task its own document, id
 * `notetask-{noteId}`. The date lives on the note itself now, so each survivor migrates:
 *   · LIVE task  → the parent note gains the task's dueDate (paper stamped first — sortNotes
 *                  keeps a dated note only while it is papered), then the task doc is deleted
 *   · DONE task  → deleted; the note reverts to a plain note (the completion already happened,
 *                  and re-dating it would resurrect finished work as live)
 *   · ORPHAN     → (no parent note) deleted, reported
 *
 * ⚠️ HARNESS-SCOPED BY CONSTRUCTION: it signs in as the one account and can reach no other.
 * Pre-launch there are no user accounts; Nick's own dev data, if it ever held one, migrates by
 * running this signed in as that account or by hand. Idempotent — a second run finds nothing.
 *
 *   node tests/e2e/migrateNotetasks.mjs           # migrate
 *   node tests/e2e/migrateNotetasks.mjs --dry     # report only
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";

const env = (file) => Object.fromEntries(
  readFileSync(file, "utf8").split("\n")
    .map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }),
);
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
const PROJECT = dev.VITE_FIREBASE_PROJECT_ID;
if (PROJECT !== "scriptally-dev") throw new Error(`Refusing to touch "${PROJECT}".`);
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
const dry = process.argv.includes("--dry");
console.log(`database: ${dbId || "(default)"} · project: ${PROJECT} · uid ${uid}${dry ? " · DRY RUN" : ""}`);

const snap = await getDocs(collection(db, "users", uid, "tasks"));
const projections = snap.docs.filter((d) => d.id.startsWith("notetask-"));
console.log(`${snap.size} tasks scanned · ${projections.length} projection document(s)`);

for (const p of projections) {
  const t = p.data();
  const noteId = p.id.slice("notetask-".length);
  const noteRef = doc(db, "users", uid, "tasks", noteId);
  const noteSnap = await getDoc(noteRef);
  if (!noteSnap.exists()) {
    console.log(`  ✂️  ${p.id} — ORPHAN (no parent note) → delete`);
    if (!dry) await deleteDoc(p.ref);
    continue;
  }
  if (t.done) {
    console.log(`  ✂️  ${p.id} — DONE → delete; ${noteId} reverts to a plain note`);
    if (!dry) await deleteDoc(p.ref);
    continue;
  }
  const note = noteSnap.data();
  console.log(`  → ${p.id} — LIVE, due ${t.dueDate} → onto ${noteId} (paper ${note.colour ?? "yellow (stamped)"})`);
  if (!dry) {
    /* the paper first, then the date — the same order and the same reason as the app's own
       makeTask: dated-unpapered would leave the Noteboard between the writes */
    if (note.colour === undefined) await updateDoc(noteRef, { colour: "yellow", updatedAt: new Date().toISOString() });
    await updateDoc(noteRef, { dueDate: t.dueDate, updatedAt: new Date().toISOString() });
    await deleteDoc(p.ref);
  }
}
console.log(projections.length === 0 ? "nothing to migrate" : dry ? "dry run complete" : "migrated");
process.exit(0);
