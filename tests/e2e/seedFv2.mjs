/**
 * Dashboard first visit v2 — the harness account's first-visit fixtures (dev only).
 *
 *   node tests/e2e/seedFv2.mjs tour-reset        clear the tour flag (todoPrefs.dash.tour), as on a fresh account
 *   node tests/e2e/seedFv2.mjs tour-done         set it
 *   node tests/e2e/seedFv2.mjs stage <s>         User.queryingStage = s ("starting" | "early" | …)
 *   node tests/e2e/seedFv2.mjs status <ms> <st>  Manuscript.status for <ms>
 *   node tests/e2e/seedFv2.mjs dump [ms]         print the stage, the tour flag, the reminder flags and <ms>'s status
 *   node tests/e2e/seedFv2.mjs draft-clear       delete the kept import review (importDrafts/{uid} and its parts)
 *   node tests/e2e/seedFv2.mjs imports-clean     delete what an F1 import brought in: agents named "Fv2 Sample …",
 *                                                their queries, those queries' logs and their feed rows
 *
 * Every write is one leaf; nothing else on the account is touched. Each lock that uses this puts back what it changed.
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, getDocs, updateDoc, deleteField, deleteDoc, collection, query, where, writeBatch } from "firebase/firestore";

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
else if (cmd === "draft-clear") {
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
  nudges: u.notifyPrefs?.nudges ?? null, asked: u.todoPrefs?.dash?.reminderAsked ?? null, gsClosed: u.todoPrefs?.dash?.gsClosed ?? null,
  ...(ms ? { msStatus: ms.status ?? null } : {}),
  draft: await (async () => { const d = (await getDoc(doc(db, "importDrafts", user.uid))).data(); return d ? { file: d.fileName, a: `${d.agentsChecked}/${d.agentsTotal}`, step: d.step, parts: d.parts } : null; })(),
}));
process.exit(0);
