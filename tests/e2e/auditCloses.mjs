/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * READ-ONLY. Every query whose derived status is a close, with its whole activity log, so the
 * closes a measurement run created can be told apart from the ones a writer made.
 *
 *   node tests/e2e/auditCloses.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, getDocs, collection } from "firebase/firestore";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("dev only");

const app = initializeApp({
  apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: dev.VITE_FIREBASE_PROJECT_ID, storageBucket: dev.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: dev.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: dev.VITE_FIREBASE_APP_ID,
});
const auth = getAuth(app);
const cred = await signInWithEmailAndPassword(auth,
  process.env.SA_E2E_EMAIL ?? "harness@scriptally.test",
  process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD);
const uid = cred.user.uid;
const db = getFirestore(app);

const all = async (c) => (await getDocs(collection(db, "users", uid, c))).docs.map((d) => ({ id: d.id, ...d.data() }));
const queries = await all("queries");
const agents = await all("agents");
const acts = await all("activities");
const agentOf = (id) => agents.find((a) => a.id === id) || {};

const CLOSED = new Set(["No Response", "Withdrawn", "Rejected"]);
console.log("── queries: " + queries.length + " · activities: " + acts.length);
const closed = queries.filter((q) => CLOSED.has(q.status));
console.log("── closed-status queries: " + closed.length + "\n");

for (const q of closed) {
  const a = agentOf(q.agentId);
  console.log("╔══ " + (a.name || "?") + " · " + (a.agency || "?") + "  [" + q.status + "]  query " + q.id);
  console.log("║  dateSent=" + q.dateSent + "  rejectedDate=" + (q.rejectedDate ?? "-")
    + "  lastStatusChange=" + (q.lastStatusChange ?? "-")
    + "  responseReceivedAt=" + (q.responseReceivedAt ?? "-"));
  const mine = acts.filter((x) => x.queryId === q.id)
    .sort((x, y) => String(x.date ?? "").localeCompare(String(y.date ?? "")));
  for (const x of mine) {
    console.log("║   " + String(x.date ?? "?").slice(0, 24).padEnd(26)
      + String(x.type ?? "?").padEnd(22)
      + "→" + String(x.resultingStatus ?? "-").padEnd(16)
      + " id=" + x.id);
    console.log("║        " + String(x.description ?? "").slice(0, 100));
  }
  console.log("╚══\n");
}
process.exit(0);
