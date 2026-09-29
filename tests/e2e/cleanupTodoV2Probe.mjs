/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Removes every user task a To-do list v2 measurement wrote on the dev harness account — matched
 * by the probe prefix, so a run leaves NOTHING behind. `node tests/e2e/cleanupTodoV2Probe.mjs`
 * prints what it deleted. Dev only; refuses any other project.
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { collection, deleteDoc, getDocs, getFirestore } from "firebase/firestore";

export const PROBE_PREFIX = "Zz v2 probe";

const env = (p) => Object.fromEntries(readFileSync(p, "utf8").split("\n").filter((l) => l.includes("="))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(new URL("../../.env.development", import.meta.url).pathname);
const localPath = new URL("../../.env.local", import.meta.url).pathname;
const local = existsSync(localPath) ? env(localPath) : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("dev only");

const EMAIL = process.env.SA_E2E_EMAIL ?? "harness@scriptally.test";
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");

const app = initializeApp({
  apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID,
});
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(getAuth(app), EMAIL, PASSWORD);
const tasks = await getDocs(collection(db, "users", user.uid, "tasks"));
let n = 0;
for (const d of tasks.docs) {
  const t = d.data();
  if (typeof t.text === "string" && t.text.startsWith(PROBE_PREFIX)) { await deleteDoc(d.ref); n += 1; }
}
console.log(`cleanupTodoV2Probe: deleted ${n} task(s)`);
process.exit(0);
