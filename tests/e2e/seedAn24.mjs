/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v24's report states (not a lock fixture): a manuscript whose one query drew one reply, a pass; and a
 * manuscript whose agents state no reply time at all. dev only.
 *
 * ⚠️ IT RESTORES: `restore` deletes every document it wrote — the two manuscripts, their queries, both stores of each
 *    query's log, and the two agents copied without a reply time. Every id starts `seed-an24-`.
 *
 *   node tests/e2e/seedAn24.mjs pass      # "One Pass" — one query, a pass after 30 days
 *   node tests/e2e/seedAn24.mjs notime    # "No Stated Times" — four queries to two agencies that give no time
 *   node tests/e2e/seedAn24.mjs restore
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, getDocs, collection, query, limit, writeBatch, deleteDoc } from "firebase/firestore";

const env = (file) => Object.fromEntries(
  readFileSync(file, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }),
);
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error(`Refusing to seed "${dev.VITE_FIREBASE_PROJECT_ID}" — dev only.`);
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");
const app = initializeApp({
  apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID,
  storageBucket: dev.VITE_FIREBASE_STORAGE_BUCKET, messagingSenderId: dev.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: dev.VITE_FIREBASE_APP_ID,
});
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", PASSWORD);
const uid = user.uid;
const P = "seed-an24-";
const day = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const cmd = process.argv[2];

const MS = { pass: `${P}pass`, notime: `${P}notime` };
const AG = [`${P}ag-1`, `${P}ag-2`];
const QS = {
  pass: [{ id: `${P}q-pass`, agent: 0, sent: 60, steps: [["Rejected", 30]] }],
  notime: [
    { id: `${P}q-n1`, agent: 1, sent: 90, steps: [] },
    { id: `${P}q-n2`, agent: 2, sent: 40, steps: [] },
    { id: `${P}q-n3`, agent: 1, sent: 120, steps: [["Rejected", 70]] },
    { id: `${P}q-n4`, agent: 2, sent: 80, steps: [["Partial Requested", 50]] },
  ],
};

async function manuscript(b, id, title) {
  b.set(doc(db, "users", uid, "manuscripts", id), {
    id, userId: uid, title, genre: "Literary Fiction", ageCategory: "Adult", wordCount: 80000, logline: "",
    status: "Querying", statusChangedDate: day(0), comps: [], shelved: false,
  });
}
function queryWithLog(b, ms, title, q, agentId) {
  const last = q.steps.length ? q.steps[q.steps.length - 1][0] : "Queried";
  b.set(doc(db, "users", uid, "queries", q.id), {
    id: q.id, userId: uid, agentId, manuscriptId: ms, dateSent: day(q.sent), status: last, sendMethod: "Email", personalisationNotes: "", packageId: "",
  });
  const rungs = [["sent", "Queried", q.sent], ...q.steps.map(([s, d], i) => [`r${i}`, s, d])];
  for (const [suffix, status, d] of rungs) {
    const actId = `${q.id}-act-${suffix}`;
    b.set(doc(db, "users", uid, "activities", actId), {
      id: actId, userId: uid, queryId: q.id, manuscriptId: ms, activityType: suffix === "sent" ? "Query Sent" : "Status Changed",
      description: `${status} recorded`, date: day(d), details: "Sent via Email", resultingStatus: status,
    });
    b.set(doc(db, "users", uid, "queries", q.id, "activity", actId), {
      type: status, resultingStatus: status, createdAt: new Date(day(d)), note: `${status} recorded`, queryId: q.id, manuscriptTitle: title,
    });
  }
}

if (cmd === "pass" || cmd === "notime") {
  const b = writeBatch(db);
  const title = cmd === "pass" ? "One Pass" : "No Stated Times";
  await manuscript(b, MS[cmd], title);
  let agentIds = [];
  if (cmd === "pass") {
    /* any agent that states a window, so the one reply is placed */
    const all = await getDocs(query(collection(db, "users", uid, "agents"), limit(40)));
    const a = all.docs.find((d) => (d.data().responseTimeWeeks ?? 0) > 0);
    if (!a) throw new Error("no agent with a stated window");
    agentIds = [a.id];
  } else {
    const all = await getDocs(query(collection(db, "users", uid, "agents"), limit(1)));
    const base = all.docs[0].data();
    for (const [i, id] of AG.entries()) {
      const { responseTimeWeeks: _w, ...rest } = base;
      b.set(doc(db, "users", uid, "agents", id), { ...rest, id, name: `No Time ${i + 1}`, agency: i ? "Quiet Hours Agency" : "Unstated & Co" });
    }
    agentIds = AG;
  }
  for (const q of QS[cmd]) queryWithLog(b, MS[cmd], title, q, agentIds[(q.agent || 1) - 1] ?? agentIds[0]);
  await b.commit();
  console.log(MS[cmd]);
} else if (cmd === "restore") {
  for (const k of ["pass", "notime"]) {
    for (const q of QS[k]) {
      for (const a of (await getDocs(collection(db, "users", uid, "queries", q.id, "activity"))).docs) await deleteDoc(a.ref);
      const rungs = ["sent", ...q.steps.map((_, i) => `r${i}`)];
      for (const s of rungs) await deleteDoc(doc(db, "users", uid, "activities", `${q.id}-act-${s}`));
      await deleteDoc(doc(db, "users", uid, "queries", q.id));
    }
    await deleteDoc(doc(db, "users", uid, "manuscripts", MS[k]));
  }
  for (const id of AG) if ((await getDoc(doc(db, "users", uid, "agents", id))).exists()) await deleteDoc(doc(db, "users", uid, "agents", id));
  console.log("restored");
} else {
  throw new Error(`unknown command ${cmd}`);
}
process.exit(0);
