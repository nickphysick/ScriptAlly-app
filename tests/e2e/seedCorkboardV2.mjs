/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * seedCorkboardV2 — the Corkboard v2 fixture (ref design-refs/corkboard-v13/): the ref's thirteen notes on the harness
 * account, prefixed `cb2seed-`, with the ref's colours, tags, one pinned note, one note on the to-do list and four
 * links (two agents, a query, a manuscript) to records the harness account really has. The page is narrowed to them
 * by the dev review aid (`window.__SA_CB_ONLY = "cb2seed-"`), so nobody else's notes are touched.
 *
 *   node tests/e2e/seedCorkboardV2.mjs seed | clean | snap <file> | restore <file> | prefs | task <id> | legacy | sweep
 *
 * `legacy` writes three notes with the OLD papers (yellow, pink, sage) for lock CB1.
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

const day = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d; };
const ymd = (n) => { const d = day(n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const iso = (n) => day(n).toISOString();

const TAG = (label) => `cb2seed-tag-${label}`;
const TAGS = ["agents", "calls", "comps", "manuscript", "strategy", "synopsis"].map((label) => ({ id: TAG(label), label, colour: "latte" }));
/* the ref's NOTES, in its order; `at` = days ago */
const NOTES = [
  { n: 1, colour: "butter", text: "Ask Jo if the synopsis gives away the ending too early", tags: ["synopsis"], at: -28 },
  { n: 2, colour: "powder", text: "Harlow Agency reopens to submissions 1 Nov. Wants letter, synopsis and first three chapters.", tags: ["agents"], at: -7, link: { queryId: "cor-move-a" } },
  { n: 3, colour: "blush", text: "Word count on the title page still says 88,400. It’s 92,000 now.", tags: ["manuscript"], at: -26, link: { manuscriptId: "cv25-ms" } },
  { n: 4, colour: "butter", text: "Priya Nair said on a podcast she’s looking for small-town secrets. Mention it in the letter?", tags: ["agents"], at: -31, link: { agentId: "clv-fx-never" } },
  { n: 5, colour: "sand", text: "Read the letter aloud before sending every batch", tags: [], at: -33, pinned: true },
  { n: 6, colour: "blush", text: "Comp idea: the lighthouse keeper one. Check its publication year — needs to be under five years old.", tags: ["comps"], at: -35, due: 6 },
  /* n7 carries NO colour: it reads Butter, and Turn into a task must stamp one (lock CB9) */
  { n: 7, colour: null, text: "Festival pitch slot: 24 Oct, 2.40pm. Bring two printed copies of the first page.", tags: [], at: -29 },
  /* n8 carries TWO tags, so a move between piles can be seen to keep the second (lock CB8) */
  { n: 8, colour: "powder", text: "Batch plan: 6–8 at a time. If a batch comes back quiet, look at the letter before sending the next one.", tags: ["strategy", "comps"], at: -23 },
  { n: 9, colour: "butter", text: "Full sent to Marsh on 1 Oct", tags: [], at: -36, link: { agentId: "clv-fx-stale" } },
  { n: 10, colour: "sand", text: "Before saying yes to an offer: ask for time to tell the other agents with the full (1–2 weeks is normal).", tags: ["calls"], at: -20 },
  { n: 11, colour: "blush", text: "Ask the writing group about the title. Is it too light for the genre?", tags: ["manuscript"], at: -19 },
  { n: 12, colour: "stone", text: "Query window: Monday to Wednesday mornings", tags: ["strategy"], at: -17 },
  { n: 13, colour: "butter", text: "Notes from the agent panel at the festival: most of them said the first page matters more than the letter. Two said they stop reading at the first unclear sentence. One said she reads the synopsis last, only if the pages work. Nobody minded a comp that was slightly off, as long as it was recent. Several said personalisation helps when it’s real, but a line about their client list that could apply to anyone is worse than nothing.", tags: ["strategy"], at: -12 },
];
const LEGACY = [
  { n: 1, colour: "yellow", text: "An old yellow note" },
  { n: 2, colour: "pink", text: "An old pink note" },
  { n: 3, colour: "sage", text: "An old sage note" },
];
const noteId = (n) => `cb2seed-n${n}`;
const legacyId = (n) => `cb2seed-old${n}`;

const [cmd = "seed", arg] = process.argv.slice(2);

async function clean() {
  const hits = await getDocs(query(collection(db, "users", uid, "tasks"), where("id", ">=", "cb2seed-"), where("id", "<", "cb2seed.")));
  for (const d of hits.docs) await deleteDoc(d.ref);
  return hits.size;
}

if (cmd === "seed" || cmd === "clean") {
  const removed = await clean();
  const snap = await getDoc(userRef);
  const tags = (snap.data()?.tags ?? []).filter((t) => !String(t.id).startsWith("cb2seed-"));
  if (cmd === "clean") {
    await updateDoc(userRef, { tags });
    console.log(`removed ${removed} cb2seed task(s) and the fixture's tag definitions`);
  } else {
    await updateDoc(userRef, { tags: [...tags, ...TAGS] });
    for (const x of NOTES) {
      const at = iso(x.at);
      await setDoc(taskRef(noteId(x.n)), {
        id: noteId(x.n), userId: uid, text: x.text, done: false, createdAt: at, updatedAt: at, ...(x.colour ? { colour: x.colour } : {}),
        ...(x.tags.length ? { tags: x.tags.map(TAG) } : {}), ...(x.link ?? {}), ...(x.pinned ? { pinned: true } : {}),
        ...(x.due !== undefined ? { dueDate: ymd(x.due) } : {}),
      });
    }
    console.log(`seeded ${NOTES.length} notes (1 pinned, 1 on the to-do list, 4 linked), ${TAGS.length} tags · uid ${uid}`);
  }
} else if (cmd === "legacy") {
  for (const x of LEGACY) {
    const at = iso(-40 - x.n);
    await setDoc(taskRef(legacyId(x.n)), { id: legacyId(x.n), userId: uid, text: x.text, done: false, createdAt: at, updatedAt: at, colour: x.colour });
  }
  console.log("seeded 3 legacy-paper notes");
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
  /* every task the harness account holds whose text starts with the argument — a lock's own residue */
  const hits = await getDocs(collection(db, "users", uid, "tasks"));
  console.log(JSON.stringify(hits.docs.map((d) => d.data()).filter((t) => String(t.text ?? "").startsWith(arg))));
} else if (cmd === "deltext") {
  /* remove every task whose text starts with the argument (a lock's own residue: kept examples, probe tasks) */
  const hits = await getDocs(collection(db, "users", uid, "tasks"));
  let n = 0;
  for (const d of hits.docs) if (String(d.data().text ?? "").startsWith(arg)) { await deleteDoc(d.ref); n++; }
  console.log(`deleted ${n} task(s) starting "${arg}"`);
} else if (cmd === "droptag") {
  const snap = await getDoc(userRef);
  const all = snap.data()?.tags ?? [];
  const tags = all.filter((t) => String(t.label).toLowerCase() !== String(arg).toLowerCase());
  await updateDoc(userRef, { tags });
  console.log(`dropped ${all.length - tags.length} tag definition(s) labelled "${arg}"`);
} else if (cmd === "tagdefs") {
  console.log(JSON.stringify((await getDoc(userRef)).data()?.tags ?? []));
} else if (cmd === "rules") {
  /* CB14: the deployed (or emulated) rules take the five papers, the old three and `pinned`, and refuse anything else */
  const out = { accepted: [], refused: [], pinned: null };
  for (const colour of ["butter", "blush", "powder", "sand", "stone", "yellow", "pink", "sage", "green"]) {
    const id = `cb2seed-rule-${colour}`;
    try {
      await setDoc(taskRef(id), { id, userId: uid, text: "CB2 PROBE rule", done: false, createdAt: iso(0), updatedAt: iso(0) });
      await updateDoc(taskRef(id), { colour, updatedAt: iso(0) });
      out.accepted.push(colour);
    } catch { out.refused.push(colour); }
  }
  try { await updateDoc(taskRef("cb2seed-rule-butter"), { pinned: true, updatedAt: iso(0) }); out.pinned = "accepted"; } catch { out.pinned = "refused"; }
  try { await updateDoc(taskRef("cb2seed-rule-butter"), { agentId: "clv-fx-never", updatedAt: iso(0) }); out.link = "accepted"; } catch { out.link = "refused"; }
  for (const colour of ["butter", "blush", "powder", "sand", "stone", "yellow", "pink", "sage", "green"]) await deleteDoc(taskRef(`cb2seed-rule-${colour}`));
  console.log(JSON.stringify(out));
} else if (cmd === "few") {
  /* Corkboard v2.1: a "just started" board — three notes, no piles. f1 and f2 carry no tag; f3's FIRST tag is
     "calls" and its second is "strategy", so the "strategy" def is in use while no pile has it first (CB18).
     Any def labelled "agents" is dropped (emulator only), so Start a pile #agents must mint it through newTag. */
  await clean();
  const snap = await getDoc(userRef);
  const keep = (snap.data()?.tags ?? []).filter((t) => !String(t.id).startsWith("cb2seed-") && String(t.label).toLowerCase() !== "agents");
  const few = TAGS.filter((t) => t.label === "calls" || t.label === "strategy");
  await updateDoc(userRef, { tags: [...keep, ...few], "todoPrefs.noteboard.started": deleteField() });
  const F = [
    { n: 1, colour: "butter", text: "Check whether Harlow want the synopsis pasted in or attached", tags: [], at: -2 },
    { n: 2, colour: "blush", text: "Priya Nair — mention the podcast in the letter", tags: [], at: -1 },
    { n: 3, colour: "powder", text: "Call notes: the agent panel liked recent comps", tags: ["calls", "strategy"], at: -3 },
  ];
  for (const x of F) {
    const at = iso(x.at);
    await setDoc(taskRef(`cb2seed-f${x.n}`), { id: `cb2seed-f${x.n}`, userId: uid, text: x.text, done: false, createdAt: at, updatedAt: at, colour: x.colour, ...(x.tags.length ? { tags: x.tags.map(TAG) } : {}) });
  }
  console.log("seeded the few-notes board (3 notes, 1 pile)");
} else if (cmd === "started") {
  /* set (or with no argument, clear) todoPrefs.noteboard.started to the given comma-separated fixture tag LABELS */
  const ids = arg ? arg.split(",").map(TAG) : null;
  await updateDoc(userRef, { "todoPrefs.noteboard.started": ids ?? deleteField() });
  console.log(`started → ${ids ? ids.join(", ") : "absent"}`);
} else if (cmd === "sweep") {
  const hits = await getDocs(collection(db, "users", uid, "tasks"));
  let n = 0;
  for (const d of hits.docs) if (/^CB2 (PROBE|MUTATION)/.test(String(d.data().text ?? ""))) { await deleteDoc(d.ref); n++; }
  console.log(`swept ${n} probe task(s)`);
} else {
  throw new Error(`unknown command ${cmd}`);
}
process.exit(0);
