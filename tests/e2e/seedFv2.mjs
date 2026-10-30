/**
 * Dashboard first visit v2 — the harness account's first-visit fixtures (dev only).
 *
 *   node tests/e2e/seedFv2.mjs tour-reset        clear the tour flag (todoPrefs.dash.tour), as on a fresh account
 *   node tests/e2e/seedFv2.mjs tour-done         set it
 *   node tests/e2e/seedFv2.mjs stage <s>         User.queryingStage = s ("starting" | "early" | …)
 *   node tests/e2e/seedFv2.mjs status <ms> <st>  Manuscript.status for <ms>
 *   node tests/e2e/seedFv2.mjs dump [ms]         print the stage, the tour flag, the reminder flags and <ms>'s status
 *   node tests/e2e/seedFv2.mjs g1-prep           back up notifyPrefs and the ask's answer, then clear notifyPrefs.nudges
 *                                                and the answer (an account that has never chosen); g1-restore puts both back
 *   node tests/e2e/seedFv2.mjs h1-dump|h1-prep|h1-finish|h1-restore <ms>
 *                                                H1's Getting started on <ms>: what is done; prep backs up and clears its
 *                                                Hide/Close flags and leaves exactly one row (comps) undone; finish ticks it
 *                                                (three comps); restore puts the comps and the flags back exactly
 *   node tests/e2e/seedFv2.mjs between-make|between-clean
 *                                                a book of its own (`fv2-between`) whose one query is closed: a copy of
 *                                                one of the account's own Rejected queries, under a new id
 *   node tests/e2e/seedFv2.mjs draft-clear       delete the kept import review (importDrafts/{uid} and its parts)
 *   node tests/e2e/seedFv2.mjs imports-clean     delete what an F1 import brought in: agents named "Fv2 Sample …",
 *                                                their queries, those queries' logs and their feed rows
 *
 * Every write is one leaf; nothing else on the account is touched. Each lock that uses this puts back what it changed.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, getDocs, setDoc, updateDoc, deleteField, deleteDoc, collection, query, where, writeBatch } from "firebase/firestore";

const env = (file) => Object.fromEntries(readFileSync(file, "utf8").split("\n").map((l) => /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(l)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]));
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
const PASSWORD = process.env.SA_E2E_PASSWORD || local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD");
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("refusing: not the dev project");
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID }, "seed-fv2");
const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.SA_E2E_EMAIL || local.SA_E2E_EMAIL || "harness@scriptally.test", PASSWORD);
const dbId = dev.VITE_FIREBASE_DATABASE_ID && dev.VITE_FIREBASE_DATABASE_ID !== "(default)" ? dev.VITE_FIREBASE_DATABASE_ID : undefined;
const db = dbId ? getFirestore(app, dbId) : getFirestore(app);
const uref = doc(db, "users", user.uid);
const [cmd, a, b] = process.argv.slice(2);

if (cmd === "tour-reset") await updateDoc(uref, { "todoPrefs.dash.tour": deleteField() });
else if (cmd === "tour-done") await updateDoc(uref, { "todoPrefs.dash.tour": "done" });
else if (cmd === "stage") await updateDoc(uref, a === "none" ? { queryingStage: deleteField() } : { queryingStage: a });
else if (cmd === "status") await updateDoc(doc(db, "users", user.uid, "manuscripts", a), { status: b });
else if (cmd === "g1-prep" || cmd === "g1-restore") {
  /* ⚠️ RESTORE IS EXACT: a field that was absent is deleted, never written as empty */
  mkdirSync("tests/e2e/.auth", { recursive: true });
  const file = "tests/e2e/.auth/fv2-g1.json";
  if (cmd === "g1-prep") {
    const d = (await getDoc(uref)).data() ?? {};
    if (!existsSync(file)) writeFileSync(file, JSON.stringify({ notifyPrefs: d.notifyPrefs ?? null, reminder: d.todoPrefs?.dash?.reminder ?? null }));
    await updateDoc(uref, { "notifyPrefs.nudges": deleteField(), "todoPrefs.dash.reminder": deleteField() });
  } else {
    const b = JSON.parse(readFileSync(file, "utf8"));
    await updateDoc(uref, { notifyPrefs: b.notifyPrefs ?? deleteField(), "todoPrefs.dash.reminder": b.reminder ?? deleteField() });
    unlinkSync(file);
  }
} else if (cmd.startsWith("h1-")) {
  const mref = doc(db, "users", user.uid, "manuscripts", a);
  const segId = a.replace(/[^A-Za-z0-9_-]/g, "_");
  const file = `tests/e2e/.auth/fv2-h1-${segId}.json`;
  mkdirSync("tests/e2e/.auth", { recursive: true });
  const m = (await getDoc(mref)).data() ?? {};
  const u0 = (await getDoc(uref)).data() ?? {};
  if (cmd === "h1-dump") {
    const vs = await getDocs(query(collection(db, "users", user.uid, "versions"), where("manuscriptId", "==", a)));
    console.log(JSON.stringify({ comps: (m.comps ?? []).length, versions: [...new Set(vs.docs.map((d) => d.data().componentType))], hidden: u0.todoPrefs?.dash?.gsHidden?.[segId] ?? null, closed: u0.todoPrefs?.dash?.gsClosed?.[segId] ?? null }));
    process.exit(0);
  }
  if (cmd === "h1-prep") {
    if (!existsSync(file)) writeFileSync(file, JSON.stringify({ comps: m.comps ?? null, hidden: u0.todoPrefs?.dash?.gsHidden?.[segId] ?? null, closed: u0.todoPrefs?.dash?.gsClosed?.[segId] ?? null }));
    await updateDoc(uref, { [`todoPrefs.dash.gsHidden.${segId}`]: deleteField(), [`todoPrefs.dash.gsClosed.${segId}`]: deleteField() });
    await updateDoc(mref, { comps: [] });
  } else if (cmd === "h1-finish") {
    await updateDoc(mref, { comps: [
      { title: "The Night Circus", author: "Erin Morgenstern", year: 2011, source: "user" },
      { title: "Piranesi", author: "Susanna Clarke", year: 2020, source: "user" },
      { title: "The Starless Sea", author: "Erin Morgenstern", year: 2019, source: "user" },
    ] });
  } else if (cmd === "h1-unclose") {
    /* FV2 H1's named break: the list kept (the close not stored) */
    await updateDoc(uref, { [`todoPrefs.dash.gsClosed.${segId}`]: deleteField() });
  } else if (cmd === "h1-restore") {
    const b = JSON.parse(readFileSync(file, "utf8"));
    await updateDoc(mref, { comps: b.comps ?? deleteField() });
    await updateDoc(uref, { [`todoPrefs.dash.gsHidden.${segId}`]: b.hidden ?? deleteField(), [`todoPrefs.dash.gsClosed.${segId}`]: b.closed ?? deleteField() });
    /* a map left empty by the restore was not there before this pack: it goes too */
    const d1 = (await getDoc(uref)).data()?.todoPrefs?.dash ?? {};
    const gone = {};
    for (const k of ["gsClosed", "gsHidden"]) if (d1[k] && Object.keys(d1[k]).length === 0) gone[`todoPrefs.dash.${k}`] = deleteField();
    if (Object.keys(gone).length) await updateDoc(uref, gone);
    unlinkSync(file);
  }
} else if (cmd === "between-make") {
  const src = (await getDoc(doc(db, "users", user.uid, "manuscripts", "db60-pre"))).data();
  if (!src) throw new Error("seed db60-pre first (seedDash60.mjs)");
  await setDoc(doc(db, "users", user.uid, "manuscripts", "fv2-between"), { ...src, id: "fv2-between", title: "FV2 Between rounds", status: "Querying" });
  const closed = (await getDocs(query(collection(db, "users", user.uid, "queries"), where("status", "==", "Rejected")))).docs[0];
  if (!closed) throw new Error("the account has no Rejected query to copy");
  await setDoc(doc(db, "users", user.uid, "queries", "fv2-between-q"), { ...closed.data(), id: "fv2-between-q", manuscriptId: "fv2-between" });
} else if (cmd === "between-clean") {
  await deleteDoc(doc(db, "users", user.uid, "queries", "fv2-between-q"));
  await deleteDoc(doc(db, "users", user.uid, "manuscripts", "fv2-between"));
} else if (cmd === "gs-hide" || cmd === "gs-hide-restore") {
  /* DF1-B1's re-point (first visit v2): the goal sheet has the slot only once Getting started is hidden or closed */
  const segId = a.replace(/[^A-Za-z0-9_-]/g, "_");
  const file = `tests/e2e/.auth/fv2-gshide-${segId}.json`;
  mkdirSync("tests/e2e/.auth", { recursive: true });
  if (cmd === "gs-hide") {
    const d = (await getDoc(uref)).data()?.todoPrefs?.dash ?? {};
    if (!existsSync(file)) writeFileSync(file, JSON.stringify({ hidden: d.gsHidden?.[segId] ?? null }));
    await updateDoc(uref, { [`todoPrefs.dash.gsHidden.${segId}`]: true });
  } else {
    const b = JSON.parse(readFileSync(file, "utf8"));
    await updateDoc(uref, { [`todoPrefs.dash.gsHidden.${segId}`]: b.hidden ?? deleteField() });
    const d1 = (await getDoc(uref)).data()?.todoPrefs?.dash ?? {};
    if (d1.gsHidden && Object.keys(d1.gsHidden).length === 0) await updateDoc(uref, { "todoPrefs.dash.gsHidden": deleteField() });
    unlinkSync(file);
  }
} else if (cmd === "notify-whole") {
  /* FV2 G1's named break: the whole notifyPrefs map written, as a Settings-style save would */
  await updateDoc(uref, { notifyPrefs: { nudges: true } });
} else if (cmd === "draft-clear") {
  const parts = await getDocs(collection(db, "importDrafts", user.uid, "parts"));
  for (const p of parts.docs) await deleteDoc(p.ref);
  await deleteDoc(doc(db, "importDrafts", user.uid));
} else if (cmd === "imports-clean") {
  const agents = (await getDocs(collection(db, "users", user.uid, "agents"))).docs.filter((d) => String(d.data().name ?? "").startsWith("Fv2 Sample"));
  const ids = new Set(agents.map((d) => d.id));
  const queries = (await getDocs(collection(db, "users", user.uid, "queries"))).docs.filter((d) => ids.has(d.data().agentId));
  let n = 0;
  for (const q of queries) {
    for (const a of (await getDocs(collection(q.ref, "activity"))).docs) { await deleteDoc(a.ref); n += 1; }
    for (const a of (await getDocs(query(collection(db, "users", user.uid, "activities"), where("queryId", "==", q.id)))).docs) { await deleteDoc(a.ref); n += 1; }
    await deleteDoc(q.ref);
  }
  for (const a of agents) await deleteDoc(a.ref);
  console.log(`removed ${agents.length} agent(s), ${queries.length} quer(ies), ${n} log row(s)`);
} else if (cmd !== "dump") throw new Error(`unknown command ${cmd}`);

const u = (await getDoc(uref)).data() ?? {};
const ms = a && cmd !== "stage" ? (await getDoc(doc(db, "users", user.uid, "manuscripts", a))).data() : null;
console.log(JSON.stringify({
  uid: user.uid, stage: u.queryingStage ?? null, tour: u.todoPrefs?.dash?.tour ?? null,
  nudges: u.notifyPrefs?.nudges ?? null, notify: u.notifyPrefs ?? null, reminder: u.todoPrefs?.dash?.reminder ?? null, gsClosed: u.todoPrefs?.dash?.gsClosed ?? null,
  ...(ms ? { msStatus: ms.status ?? null } : {}),
  draft: await (async () => { const d = (await getDoc(doc(db, "importDrafts", user.uid))).data(); return d ? { file: d.fileName, a: `${d.agentsChecked}/${d.agentsTotal}`, step: d.step, parts: d.parts } : null; })(),
}));
process.exit(0);
