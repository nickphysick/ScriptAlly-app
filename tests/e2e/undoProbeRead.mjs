/**
 * Read back the task `completionUndo.measure.ts` just completed and undid, and print its STORED
 * fields. This is the half a browser cannot honestly assert: the pane's row re-renders from a
 * derived board, so "it looks un-crossed" is not "the record says so".
 *
 *   npx playwright test tests/e2e/completionUndo.measure.ts   # drives it
 *   node tests/e2e/undoProbeRead.mjs                          # reads the record
 *
 * ⚠️ DEV ONLY, and it refuses to run anywhere else.
 */
import { readFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, getDocs, collection } from "firebase/firestore";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));

const dev = env(".env.development");
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") { console.error("refusing: not scriptally-dev"); process.exit(1); }
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID });
const { user } = await signInWithEmailAndPassword(getAuth(app), "harness@scriptally.test", env(".env.local").SA_E2E_PASSWORD);
const db = getFirestore(app);

const title = readFileSync("/tmp/sa-undo-probe-title.txt", "utf8").trim();
/* ⚠️ THE COLLECTION IS `tasks`, NOT `userTasks` — the TYPE is `UserTask`, the path is not.
   `db.tsx:688` subscribes to `users/{uid}/tasks`, and guessing from the type name earned a
   permission-denied on a collection that does not exist. */
const snap = await getDocs(collection(db, "users", user.uid, "tasks"));
const hits = [];
snap.forEach((d) => { const x = d.data(); if ((x.text ?? x.title ?? "") === title) hits.push([d.id, x]); });

if (!hits.length) { console.error(`no task titled ${JSON.stringify(title)} — nothing to assert`); process.exit(1); }
const [id, t] = hits[0];
console.log(`task ${id}`);
console.log(`  text        : ${JSON.stringify(t.text ?? t.title)}`);
console.log(`  done        : ${JSON.stringify(t.done)}`);
console.log(`  completedAt : ${JSON.stringify(t.completedAt ?? null)}`);
console.log("");
const reverted = t.done === false || t.done === undefined;
console.log(reverted
  ? "✅ UNDO REVERTED THE RECORD — done is not true after pressing Undo."
  : "❌ UNDO DID NOT REVERT — the record still reads done: true.");
process.exit(reverted ? 0 : 2);
