/**
 * THE CORKBOARD FIXTURE (Corkboard v1) — `cbseed-*` documents on the shared dev harness account, which the
 * CB1 locks narrow the page to with `window.__SA_CB_ONLY = "cbseed-"` (lib/corkboardReviewAid, dev builds).
 *
 *   node tests/e2e/seedCorkboard.mjs seed            # 8 notes (one turned into a task), 3 open own tasks, 1 done
 *   node tests/e2e/seedCorkboard.mjs clean           # remove exactly what it seeded, tag definitions included
 *   node tests/e2e/seedCorkboard.mjs snap <file>     # todoPrefs.noteboard → file (absent is recorded as absent)
 *   node tests/e2e/seedCorkboard.mjs restore <file>  # file → todoPrefs.noteboard, EXACTLY (absent means delete)
 *   node tests/e2e/seedCorkboard.mjs prefs           # print todoPrefs.noteboard
 *   node tests/e2e/seedCorkboard.mjs layout <json>   # set todoPrefs.noteboard.layout to this map (a lock's arrangement)
 *   node tests/e2e/seedCorkboard.mjs task <id>       # print one user task document (or "absent")
 *   node tests/e2e/seedCorkboard.mjs sweep           # delete tasks a MUTATION run left behind (text "CB MUTATION …")
 *
 * ⚠️ IT WRITES WHAT THE APP WRITES: a plain create, then the colour as its own update (a create carrying
 *    `colour` is the path the app never takes). A dateless task is a note; a dated one with a paper is a note
 *    that became a task; a dated one with none is the To-do list's own task.
 * ⚠️ DATES ARE RELATIVE TO TODAY, so the fixture means the same thing whenever it is seeded.
 * ⚠️ PREFERENCES ARE WRITTEN BY LEAF (`todoPrefs.noteboard`), never the whole `todoPrefs` map: other pages
 *    and other sessions own its siblings.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, getDocs, collection, query, where, setDoc, updateDoc, deleteDoc, deleteField } from "firebase/firestore";

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
const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", PASSWORD);
const uid = user.uid;
const userRef = doc(db, "users", uid);
const taskRef = (id) => doc(db, "users", uid, "tasks", id);

const day = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d; };
const ymd = (n) => { const d = day(n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const iso = (n) => day(n).toISOString();

const TAGS = [
  { id: "cbseed-tag-synopsis", label: "synopsis", colour: "butter" },
  { id: "cbseed-tag-agents", label: "agents", colour: "pink" },
  { id: "cbseed-tag-comps", label: "comps", colour: "sage" },
  { id: "cbseed-tag-manuscript", label: "manuscript", colour: "latte" },
];
/* the reference's eight notes, in its order; `at` is days ago (so "Pinned {date}" is real) */
const NOTES = [
  { n: 1, text: "Ask Jo if the synopsis gives away the ending too early", colour: "yellow", tag: "synopsis", at: -3 },
  { n: 2, text: "Priya Nair said on a podcast she's looking for small-town secrets. Mention it in the letter?", colour: "pink", tag: "agents", at: -6 },
  { n: 3, text: "Festival pitch slot: 24 Oct, 2.40pm. Bring two printed copies of the first page", colour: "sage", at: -4 },
  { n: 4, text: "Harlow Agency reopens to submissions 1 Nov", colour: "pink", at: -12 },
  { n: 5, text: "Comp idea: the lighthouse keeper one. Check its publication year", colour: "sage", tag: "comps", at: -10, due: 4 },
  { n: 6, text: "Word count on the title page still says 92,000. It's 88,400 now", colour: "yellow", tag: "manuscript", at: -1 },
  { n: 7, text: "Read the query letter aloud before sending the next batch\nhttps://example.com/reading-aloud", colour: "yellow", at: -8 },
  { n: 8, text: "Ask the writing group about the title. Is it too light for the genre?", colour: "pink", tag: "manuscript", at: -14 },
];
/* the writer's own dated tasks — NOT notes: dated, no paper */
const TASKS = [
  { n: 1, text: "Read chapters 1–3 aloud", due: 3 },
  { n: 2, text: "Book a one-to-one at the writing festival", due: 11 },
  { n: 3, text: "Update the bio paragraph", due: 14 },
  { n: 4, text: "Trim the synopsis to one page", due: -2, doneAt: -1 },
];
const noteId = (n) => `cbseed-n${n}`;
const ownId = (n) => `cbseed-t${n}`;

const [cmd = "seed", arg] = process.argv.slice(2);

if (cmd === "seed" || cmd === "clean") {
  const snap = await getDoc(userRef);
  const tags = (snap.data()?.tags ?? []).filter((t) => !String(t.id).startsWith("cbseed-"));
  for (const x of NOTES) await deleteDoc(taskRef(noteId(x.n)));
  for (const x of TASKS) await deleteDoc(taskRef(ownId(x.n)));
  if (cmd === "clean") {
    await updateDoc(userRef, { tags });
    console.log(`removed ${NOTES.length} notes, ${TASKS.length} tasks and ${TAGS.length} tag definitions`);
  } else {
    await updateDoc(userRef, { tags: [...tags, ...TAGS] });
    for (const x of NOTES) {
      const at = iso(x.at);
      await setDoc(taskRef(noteId(x.n)), {
        id: noteId(x.n), userId: uid, text: x.text, done: false, createdAt: at, updatedAt: at,
        ...(x.tag ? { tags: [`cbseed-tag-${x.tag}`] } : {}),
      });
      await updateDoc(taskRef(noteId(x.n)), { colour: x.colour, updatedAt: at });
      if (x.due !== undefined) await updateDoc(taskRef(noteId(x.n)), { dueDate: ymd(x.due), updatedAt: at });
    }
    for (const x of TASKS) {
      const at = iso(-5);
      await setDoc(taskRef(ownId(x.n)), {
        id: ownId(x.n), userId: uid, text: x.text, done: !!x.doneAt, createdAt: at, updatedAt: at, dueDate: ymd(x.due),
        ...(x.doneAt ? { completedAt: iso(x.doneAt) } : {}),
      });
    }
    console.log(`seeded ${NOTES.length} notes (1 on the to-do list), ${TASKS.length} own tasks (1 done), ${TAGS.length} tags · uid ${uid}`);
  }
} else if (cmd === "snap") {
  const nb = (await getDoc(userRef)).data()?.todoPrefs?.noteboard;
  writeFileSync(arg, JSON.stringify({ present: nb !== undefined, value: nb ?? null }));
  console.log(`snapshot → ${arg} (${nb === undefined ? "absent" : Object.keys(nb).join(",")})`);
} else if (cmd === "restore") {
  const { present, value } = JSON.parse(readFileSync(arg, "utf8"));
  await updateDoc(userRef, { "todoPrefs.noteboard": present ? value : deleteField() });
  console.log(`restored todoPrefs.noteboard (${present ? "value" : "absent"})`);
} else if (cmd === "prefs") {
  console.log(JSON.stringify((await getDoc(userRef)).data()?.todoPrefs?.noteboard ?? null));
} else if (cmd === "layout") {
  await updateDoc(userRef, { "todoPrefs.noteboard.layout": JSON.parse(arg) });
  console.log("layout set");
} else if (cmd === "view") {
  await updateDoc(userRef, { "todoPrefs.noteboard.view": arg === "none" ? deleteField() : arg });
  console.log(`view ${arg}`);
} else if (cmd === "task") {
  const s = await getDoc(taskRef(arg));
  console.log(s.exists() ? JSON.stringify(s.data()) : "absent");
} else if (cmd === "sweep") {
  /* a mutation that makes the page write a document it should not defeats that run's own clean-up, so the
     residue is named by its text and removed here */
  const hits = await getDocs(query(collection(db, "users", uid, "tasks"), where("text", ">=", "CB MUTATION"), where("text", "<", "CB MUTATIOO")));
  for (const d of hits.docs) await deleteDoc(d.ref);
  console.log(`swept ${hits.size} mutation residue task(s)`);
} else {
  throw new Error(`unknown command ${cmd}`);
}
process.exit(0);
