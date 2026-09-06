/**
 * SEED THE REQUEST DATES A REQUESTED QUERY IS SUPPOSED TO CARRY.
 *
 * ⚠️ THE ACCOUNT HOLDS QUERIES WHOSE STATUS SAYS AN AGENT ASKED FOR SOMETHING AND WHOSE RECORD
 * DOES NOT SAY WHEN. `seed.mjs` writes `dateSent` and `status` and nothing else, so a query at
 * "Full Requested" has no `fullRequestedDate` — which is not a shape the app itself produces: it
 * writes the date on the status change. Everything derived from that anchor is therefore absent
 * on this account, silently and correctly: `waitAnchorMs` returns NaN, the pane's facts lose
 * their date row, and the Quick Look header's "since 2 April · 22 weeks" line does not render.
 *
 * ⚠️ WHICH IS INDISTINGUISHABLE FROM THE FEATURE BEING BROKEN, and that is why this exists. The
 * tightened round's P4.5 checks that the header's elapsed matches the date beside it; over seven
 * cards with no date it could only ever report "0 of 7" — a monoculture, passing or failing for a
 * reason that has nothing to do with the code.
 *
 * It writes the SAME FIELD THE APP WRITES, on queries the seed owns, and nothing else.
 *
 *   node tests/e2e/seedRequestDates.mjs          # seed
 *   node tests/e2e/seedRequestDates.mjs --clean  # remove exactly what it seeded
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, deleteField, collection, getDocs } from "firebase/firestore";

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
  apiKey: dev.VITE_FIREBASE_API_KEY,
  authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: PROJECT,
  storageBucket: dev.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: dev.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: dev.VITE_FIREBASE_APP_ID,
});
const dbId = dev.VITE_FIREBASE_DATABASE_ID;
const db = !dbId || dbId === "(default)" ? getFirestore(app) : getFirestore(app, dbId);
const { user } = await signInWithEmailAndPassword(
  getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", PASSWORD);
const uid = user.uid;
const clean = process.argv.includes("--clean");
console.log(`database: ${dbId || "(default)"} · project: ${PROJECT} · uid ${uid}`);

/* ⚠️ THE STATUS DECIDES THE FIELD, and the date is derived from the query's OWN `dateSent` rather
   than from today: a request that predates the send would be incoherent data, and one stamped
   "today" would make every elapsed read zero. Halfway between the send and now is a real interval
   that the header can state and a check can verify. */
const FIELD = { "Full Requested": "fullRequestedDate", "Partial Requested": "partialRequestedDate" };

const snap = await getDocs(collection(db, "users", uid, "queries"));
let touched = 0;
for (const d of snap.docs) {
  const q = d.data();
  const field = FIELD[q.status];
  if (!field) continue;
  if (clean) {
    if (!q[field]) continue;
    await updateDoc(doc(db, "users", uid, "queries", d.id), { [field]: deleteField() });
    console.log(`  cleaned ${d.id} · ${field}`);
    touched += 1;
    continue;
  }
  if (q[field]) { console.log(`  ${d.id} already carries ${field} — left alone`); continue; }
  const sent = Date.parse(q.dateSent);
  if (!Number.isFinite(sent)) { console.log(`  ${d.id} has no parsable dateSent — skipped`); continue; }
  const when = new Date(sent + (Date.now() - sent) / 2).toISOString();
  await updateDoc(doc(db, "users", uid, "queries", d.id), { [field]: when });
  console.log(`  ${d.id} · ${q.status} → ${field} = ${when}`);
  touched += 1;
}
console.log(clean ? `cleaned ${touched}` : `seeded ${touched}`);
process.exit(0);
