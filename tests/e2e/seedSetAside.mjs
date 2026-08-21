/**
 * SEED THE THREE KINDS OF HIDING, because nothing else produces all three.
 *
 * ⚠️ THE LEDGER'S WHOLE POINT IS THAT IT HOLDS THREE DIFFERENT THINGS — a rule mute, a permanent
 * dismissal and a live dated snooze — and they arrive by three different routes on the board. A
 * measurement that finds whatever the account happens to be carrying exercises one of them and
 * reports the other two as "unexercised", which is indistinguishable from "broken".
 *
 * ⚠️ IT WRITES THE SAME FIELDS THE APP WRITES, AND NOTHING ELSE. `mutedTaskRules` on the profile
 * (what `forkNeverRule`/`hideType` write), `snoozedUntil: MUTED_UNTIL` on a taskFlag (what
 * `forkStale(card, "neverThis")` writes) and a finite future `snoozedUntil` (what `snoozeCard`
 * writes). If a restore works against these it works against the real thing, because they ARE the
 * real thing — this seeds the state, never a lookalike.
 *
 *   node tests/e2e/seedSetAside.mjs          # seed
 *   node tests/e2e/seedSetAside.mjs --clean  # remove exactly what it seeded
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, getDocs, deleteDoc, collection } from "firebase/firestore";

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
console.log(`database: ${dbId || "(default)"} · project: ${PROJECT} · uid ${uid}`);

const MUTED_UNTIL = "3000-01-01T00:00:00.000Z";   // lib/taskFlags — the muted-indefinitely sentinel
/* ⚠️ `no_response_close`, NOT `dq_mswl`, AND THE REASON IS THE MEASUREMENT. The mute is only
   observable if the rule has live subjects: muting one that generates nothing looks identical to
   muting one that works. Measured 21 Aug — every agent on the harness account lacks a wish list and
   the `dq_*` sweeps still produce no cards, while `no_response_close` produces two. Pick the rule
   the data can actually demonstrate. */
const RULE = "no_response_close";                  // one of HIDDEN_RULE_KEYS → "Stale queries"
/* ⚠️ A SECOND RULE, SO TWO CHECKS DO NOT EAT EACH OTHER'S FIXTURE. The generic per-kind restore
   takes a rule row and the board check needs one still muted; with a single seeded rule whichever
   ran first consumed it and the other reported a working feature as broken. Measured twice — once
   in each direction, which is how a shared-state ordering bug announces itself. */
const RULE2 = "dq_materials";                      // → "Missing submission material details"

/**
 * ⚠️ THE DOCUMENT ID IS THE COMPOSITE KEY, AND SEEDING AN ARBITRARY ONE LOOKS EXACTLY LIKE A BROKEN
 * RESTORE. `taskFlagId` (lib/taskFlags) derives the id from the flag's own fields, and `restore`
 * writes through `upsertTaskFlag`, which re-derives it. A seeded doc called anything else is a
 * document the restore never touches: the write succeeds against a NEW canonical doc, the seeded
 * row stays in the ledger, and the measurement reports "the dismissed row did not leave" about
 * working code. Measured 21 Aug — rows went 2 → 2 and the fault was entirely in this file.
 */
const flagId = (k) => [k.taskType, `q_${k.queryId ?? ""}`, `a_${k.agentId ?? ""}`, `r_${k.rule ?? ""}`].join("__");
const clean = process.argv.includes("--clean");

const uref = doc(db, "users", uid);
const profile = (await getDoc(uref)).data() ?? {};
const muted = new Set(profile.mutedTaskRules ?? []);

if (clean) {
  muted.delete(RULE); muted.delete(RULE2);
  const keptTags = (profile.tags ?? []).filter((t) => !t.id.startsWith("seed-tag-"));
  await setDoc(uref, { mutedTaskRules: [...muted], tags: keptTags }, { merge: true });
  /* the ids are re-derived, never remembered — the same rule the restore path follows */
  const gone = [];
  for (const d of (await getDocs(collection(db, "users", uid, "taskFlags"))).docs) {
    const f = d.data();
    if ((f.taskType === "data_quality_poor" || f.taskType === "nudge_overdue") && f.snoozedUntil) {
      await deleteDoc(d.ref); gone.push(d.id);
    }
  }
  console.log(`cleaned: rule un-muted, ${gone.length} hidden flag(s) removed\n  ${gone.join("\n  ")}`);
  process.exit(0);
}

/* ⚠️ REAL SUBJECTS, NOT INVENTED IDS. `flagSubject` resolves the agent and the query to name the
   row; a made-up id would render a row labelled "task" and the label assertion would be measuring
   the fallback rather than the feature. */
const agents = (await getDocs(collection(db, "users", uid, "agents"))).docs;
const queries = (await getDocs(collection(db, "users", uid, "queries"))).docs;
if (!agents.length || !queries.length) throw new Error("no agents or queries — run seed.mjs first");
const agentId = agents[0].id;
const queryId = queries[0].id;

muted.add(RULE); muted.add(RULE2);

/* ⚠️ TAGS TOO, BECAUSE THE OTHER PANE HAS NOTHING TO ACT ON OTHERWISE. Tag management is CRUD over
   `user.tags`, and on an account with no tags the pane renders its empty line — which measures the
   copy and none of the behaviour. Two of them: deleting one must leave the other, or a delete that
   wiped the array would pass a one-tag check. */
const tags = [
  ...(profile.tags ?? []).filter((t) => !t.id.startsWith("seed-tag-")),
  /* ⚠️ THE LABELS OBEY `normaliseTagLabel` — lowercase, no spaces, letters/digits/hyphens. A
     seeded "agents to chase" is a shape the app cannot create, so a measurement over it would be
     testing the renderer against data no user can produce. */
  { id: "seed-tag-a", label: "revisions", colour: "sage" },
  { id: "seed-tag-b", label: "chasing", colour: "pink" },
];
await setDoc(uref, { mutedTaskRules: [...muted], tags }, { merge: true });

/* the permanent dismissal — a record gap the writer said "never, just this" to */
const dismissedKey = { taskType: "data_quality_poor", agentId };
const dismissedId = flagId(dismissedKey);
await setDoc(doc(db, "users", uid, "taskFlags", dismissedId), {
  id: dismissedId, userId: uid, ...dismissedKey, snoozedUntil: MUTED_UNTIL, snoozeCount: 0,
});

/* the live snooze — a nudge put off, with a real return date 9 days out */
const back = new Date(Date.now() + 9 * 864e5).toISOString();
const snoozedKey = { taskType: "nudge_overdue", queryId };
const snoozedId = flagId(snoozedKey);
await setDoc(doc(db, "users", uid, "taskFlags", snoozedId), {
  id: snoozedId, userId: uid, ...snoozedKey, snoozedUntil: back, snoozeCount: 1,
});

console.log(`seeded three kinds:
  rules     · ${RULE} (suppresses the Consider-closing cards) + ${RULE2}
  dismissed · ${dismissedId}  (snoozedUntil = MUTED_UNTIL)
  snoozed   · ${snoozedId}  (back ${back.slice(0, 10)})
  tags      · #revisions (sage) + #chasing (pink)`);
process.exit(0);
