/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * seedCorkboardV15 — the Corkboard v15 fixtures (ref design-refs/corkboard-v15/), on the harness account, every
 * document prefixed `cb15seed-`. The page is narrowed to them by the dev review aid (`window.__SA_CB_ONLY =
 * "cb15seed-"`), so nobody else's notes are read or written.
 *
 *   node tests/e2e/seedCorkboardV15.mjs everyday | few | busy | none | started <labels> | snap <file> | restore <file>
 *                                        | prefs | task <id> | tasks <prefix> | deltext <prefix> | tagdefs | clean
 *
 *   everyday  the ref's FULL(): 14 notes, five stacks (agents, comps, letter, synopsis, to-check) and one loose note,
 *             two pinned, two on the to-do list (this week), nine linked — eight to a query or an agent of "Murphy's
 *             Day Out" (cv25-ms, the ref's own book and agents, as the harness account holds them), none to a
 *             manuscript. n4 is the ref's long note (cut at eight lines), n8 carries TWO tags.
 *   few       the ref's FEW(): 3 notes, no tag, no link, no date — the quiet board
 *   busy      60 notes over the five papers and three stacks, 4 pinned
 *   none      no notes (day one)
 *   legacy    adds three notes on the old papers (yellow, pink, sage)
 *   docs      prints every fixture document (the locks compute their expectations from it)
 *   started   todoPrefs.noteboard.started ← the given comma-separated fixture tag labels (none clears it)
 *
 * Each data command clears the fixture first and clears `todoPrefs.noteboard` (view, sort, order, started), so a run
 * starts from Newest first on the Corkboard view. `snap` / `restore` keep the account's own prefs either side.
 * ⚠️ Through fsTarget only: the emulator by default, the dev project with ALLOW_LIVE_FIRESTORE=1, never prod.
 */
import { targetEnv, TARGET_PROJECT } from "./fsTarget.mjs";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, getDocs, collection, query, where, setDoc, updateDoc, deleteDoc, deleteField } from "firebase/firestore";

const env = (file) => Object.fromEntries(
  readFileSync(file, "utf8").split("\n")
    .map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }),
);
const dev = targetEnv();
const local = existsSync(".env.local") ? env(".env.local") : {};
const PROJECT = dev.VITE_FIREBASE_PROJECT_ID;
if (PROJECT !== TARGET_PROJECT) throw new Error(`Refusing to touch "${PROJECT}".`);
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

const P = "cb15seed-";
const day = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d; };
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const iso = (n, minutes = 0) => { const d = day(n); d.setMinutes(d.getMinutes() - minutes); return d.toISOString(); };
/** the Sunday that ends this week (lib/corkboard sundayOf) */
const sunday = () => { const d = day(0); d.setDate(d.getDate() + ((7 - d.getDay()) % 7)); return ymd(d); };

const TAG = (label) => `${P}tag-${label}`;
const LABELS = ["agents", "comps", "letter", "synopsis", "to-check", "ideas"];
const TAGS = LABELS.map((label) => ({ id: TAG(label), label, colour: "latte" }));

/* the ref's FULL(), in its order (`at` = days ago); links are the harness account's cv25 records */
const Q = (id) => ({ queryId: id });
const A = (id) => ({ agentId: id });
export const EVERYDAY = [
  { n: 1, c: "butter", t: "Clara Beaumont asked for the first three chapters. Send them as one Word file, double spaced, with the title in the file name.", tags: ["agents"], link: Q("cv25-q-06"), pinned: true, due: true, at: 6 },
  { n: 2, c: "blush", t: "Letter opening: lead with Murphy and the bus, not the backstory. Two readers said the same thing.", tags: ["letter"], pinned: true, at: 12 },
  { n: 3, c: "powder", t: "Word count in the letter says 82,000. The manuscript is now 79,400. Change it before the next batch goes out.", tags: ["letter"], due: true, at: 0 },
  { n: 4, c: "blush", t: "Questions for the call with Tom Ellery:\n\nHow hands-on is the editing?\nWhich editors would see it first?\nWhat happens if it doesn’t sell?\nHow often would we speak?\nWho else at the agency would I work with?\nWhat would change in the book before it goes out?\nHow long before it goes on submission?", tags: ["agents"], link: Q("cv25-q-08"), at: 1 },
  { n: 5, c: "powder", t: "Jonathan Marsh said on a podcast that he likes a one-line pitch at the very top of the letter.", tags: ["agents"], link: Q("cv25-q-09"), at: 2 },
  { n: 6, c: "butter", t: "Synopsis is at 640 words. Harbour Lane want one page, so it needs to come down to about 500.", tags: ["synopsis"], at: 3 },
  { n: 7, c: "sand", t: "Comp idea: something funny and warm from the last three years. Look along the new fiction shelf at the library on Saturday.", tags: ["comps"], at: 4 },
  { n: 8, c: "stone", t: "Inkwell & Stone open to submissions again on 1 December.", tags: ["agents", "to-check"], link: Q("cv25-q-04"), at: 5 },
  { n: 9, c: "butter", t: "Writing group meets on the first Thursday. Bring the new first page.", tags: [], at: 8 },
  { n: 10, c: "stone", t: "Eleanor Whitfield passed, but said she’d be glad to see the next book. Keep the email.", tags: ["agents"], link: Q("cv25-q-01"), at: 4 },
  { n: 11, c: "butter", t: "Check whether The Lantern Agency want the synopsis pasted into the email or attached.", tags: ["to-check"], link: A("cv25-agent-10"), at: 14 },
  { n: 12, c: "blush", t: "Most agents close over Christmas, from about 18 December. Get the next five out before then.", tags: ["to-check"], at: 9 },
  { n: 13, c: "powder", t: "Read the first chapter of both comps again before the next letter goes out.", tags: ["comps"], at: 16 },
  { n: 14, c: "sand", t: "Clara’s assistant is called Josie. Reply to her, not the general inbox.", tags: ["agents"], link: A("cv25-agent-06"), at: 5 },
];
export const FEW = [
  { n: 1, c: "butter", t: "Check whether Harbour Lane want the synopsis pasted in or attached.", tags: [], at: 0 },
  { n: 2, c: "blush", t: "Letter: try opening with the one-line pitch.", tags: [], at: 1 },
  { n: 3, c: "powder", t: "Writing group meets on the first Thursday. Bring the new first page.", tags: [], at: 3 },
];
const PAPERS = ["butter", "blush", "powder", "sand", "stone"];
const BUSY = Array.from({ length: 60 }, (_, i) => ({
  n: i + 1, c: PAPERS[i % 5],
  t: `Busy note ${i + 1}. ${["A short one.", "Something to check before the next batch goes out to the agents on the list.", "Ask the writing group about the title, and whether the first page lands.", "Comp idea from the library shelf."][i % 4]}`,
  tags: i % 3 === 0 ? ["agents"] : i % 3 === 1 ? ["letter"] : i % 7 === 0 ? [] : ["comps"],
  pinned: i < 4, at: Math.floor(i / 3), m: i,
}));

const id = (n, set) => `${P}${set}${n}`;
async function clean() {
  const hits = await getDocs(query(collection(db, "users", uid, "tasks"), where("id", ">=", P), where("id", "<", "cb15seed.")));
  for (const d of hits.docs) await deleteDoc(d.ref);
  return hits.size;
}
async function write(set, notes) {
  const removed = await clean();
  const snap = await getDoc(userRef);
  const tags = (snap.data()?.tags ?? []).filter((t) => !String(t.id).startsWith(P));
  await updateDoc(userRef, { tags: [...tags, ...TAGS], "todoPrefs.noteboard": deleteField() });
  const due = sunday();
  for (const x of notes) {
    const at = iso(-x.at, x.m ?? x.n);
    await setDoc(taskRef(id(x.n, set)), {
      id: id(x.n, set), userId: uid, text: x.t, done: false, createdAt: at, updatedAt: at, colour: x.c,
      ...(x.tags.length ? { tags: x.tags.map(TAG) } : {}), ...(x.link ?? {}), ...(x.pinned ? { pinned: true } : {}),
      ...(x.due ? { dueDate: due } : {}),
    });
  }
  return removed;
}

const [cmd = "everyday", arg] = process.argv.slice(2);
if (cmd === "everyday") { await write("e", EVERYDAY); console.log(`seeded everyday: ${EVERYDAY.length} notes · uid ${uid}`); }
else if (cmd === "few") { await write("f", FEW); console.log("seeded just started: 3 notes"); }
else if (cmd === "busy") { await write("b", BUSY); console.log("seeded busy: 60 notes"); }
else if (cmd === "legacy") {
  /* three notes on the OLD papers (yellow, pink, sage), added to whatever is seeded: they must read as butter, blush
     and powder with no write on load (lock C19) */
  for (const [n, c] of [[1, "yellow"], [2, "pink"], [3, "sage"]]) {
    const at = iso(-40 - n);
    await setDoc(taskRef(id(n, "old")), { id: id(n, "old"), userId: uid, text: `An old ${c} note`, done: false, createdAt: at, updatedAt: at, colour: c });
  }
  console.log("seeded 3 legacy-paper notes");
} else if (cmd === "none") { await write("x", []); console.log("seeded day one: no notes"); }
else if (cmd === "clean") {
  const removed = await clean();
  const snap = await getDoc(userRef);
  await updateDoc(userRef, { tags: (snap.data()?.tags ?? []).filter((t) => !String(t.id).startsWith(P)) });
  console.log(`removed ${removed} fixture note(s) and the fixture's tag definitions`);
} else if (cmd === "started") {
  const ids = arg ? arg.split(",").map(TAG) : null;
  await updateDoc(userRef, { "todoPrefs.noteboard.started": ids ?? deleteField() });
  console.log(`started → ${ids ? ids.join(", ") : "absent"}`);
} else if (cmd === "snap") {
  const nb = (await getDoc(userRef)).data()?.todoPrefs?.noteboard;
  writeFileSync(arg, JSON.stringify({ present: nb !== undefined, value: nb ?? null }));
  console.log(`snapshot → ${arg}`);
} else if (cmd === "restore") {
  const { present, value } = JSON.parse(readFileSync(arg, "utf8"));
  await updateDoc(userRef, { "todoPrefs.noteboard": present ? value : deleteField() });
  console.log(`restored todoPrefs.noteboard (${present ? "value" : "absent"})`);
} else if (cmd === "prefs") {
  console.log(JSON.stringify((await getDoc(userRef)).data()?.todoPrefs?.noteboard ?? null));
} else if (cmd === "task") {
  const s = await getDoc(taskRef(arg));
  console.log(s.exists() ? JSON.stringify(s.data()) : "absent");
} else if (cmd === "tasks") {
  const hits = await getDocs(collection(db, "users", uid, "tasks"));
  console.log(JSON.stringify(hits.docs.map((d) => d.data()).filter((t) => String(t.text ?? "").startsWith(arg))));
} else if (cmd === "deltext") {
  const hits = await getDocs(collection(db, "users", uid, "tasks"));
  let n = 0;
  for (const d of hits.docs) if (String(d.data().text ?? "").startsWith(arg)) { await deleteDoc(d.ref); n++; }
  console.log(`deleted ${n} task(s) starting "${arg}"`);
} else if (cmd === "docs") {
  /* every fixture document as stored, so a lock computes what it expects through lib/corkboard, as the page does */
  const hits = await getDocs(query(collection(db, "users", uid, "tasks"), where("id", ">=", P), where("id", "<", "cb15seed.")));
  console.log(JSON.stringify(hits.docs.map((d) => d.data())));
} else if (cmd === "tagdefs") {
  console.log(JSON.stringify((await getDoc(userRef)).data()?.tags ?? []));
} else {
  throw new Error(`unknown command ${cmd}`);
}
process.exit(0);
