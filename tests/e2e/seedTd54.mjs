/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v54 — the batch locks' fixture: sets the saved guidelines (`materialsWanted`) of named agents, and puts them
 * back. Emulator or dev only (fsTarget's `targetEnv`); refuses anything else.
 *
 *   node tests/e2e/seedTd54.mjs set '{"<agentId>":["Query letter","First 3 chapters"],"<agentId>":[]}'
 *   node tests/e2e/seedTd54.mjs read '["<agentId>", …]'          # prints {id: materialsWanted}
 *   node tests/e2e/seedTd54.mjs query '["<queryId>", …]'         # prints {id: materialsWanted} for queries
 *   node tests/e2e/seedTd54.mjs restore-queries '{"<queryId>":[…]}'
 *   node tests/e2e/seedTd54.mjs date '{"<queryId>":"<ISO>"}'      # dateSent; prints what each held before
 *   node tests/e2e/seedTd54.mjs view '"one"' | '"table"' | 'null'   # todoPrefs.batchView (null removes it)
 *
 * ⚠️ A `set` prints what each agent held before it, and the lock writes that back in its afterAll: a fixture must leave
 *    the account as it found it.
 */
import { targetEnv, TARGET_PROJECT } from "./fsTarget.mjs";
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, deleteField } from "firebase/firestore";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = targetEnv();
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== TARGET_PROJECT) throw new Error("dev or emulator only");
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");

const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID });
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", PASSWORD);
const uid = user.uid;
const [cmd, arg] = process.argv.slice(2);
const data = JSON.parse(arg ?? "null");
const out = {};
if (cmd === "set") {
  for (const [id, mats] of Object.entries(data)) {
    const ref = doc(db, "users", uid, "agents", id);
    out[id] = (await getDoc(ref)).data()?.materialsWanted ?? [];
    await updateDoc(ref, { materialsWanted: mats });
  }
} else if (cmd === "read") {
  for (const id of data) out[id] = (await getDoc(doc(db, "users", uid, "agents", id))).data()?.materialsWanted ?? [];
} else if (cmd === "query") {
  for (const id of data) out[id] = (await getDoc(doc(db, "users", uid, "queries", id))).data()?.materialsWanted ?? null;
} else if (cmd === "restore-queries") {
  for (const [id, mats] of Object.entries(data)) await updateDoc(doc(db, "users", uid, "queries", id), { materialsWanted: mats ?? [] });
} else if (cmd === "date") {
  for (const [id, iso] of Object.entries(data)) {
    const ref = doc(db, "users", uid, "queries", id);
    out[id] = (await getDoc(ref)).data()?.dateSent ?? null;
    await updateDoc(ref, { dateSent: iso ?? deleteField() });
  }
} else if (cmd === "view") {
  const ref = doc(db, "users", uid);
  out.before = (await getDoc(ref)).data()?.todoPrefs?.batchView ?? null;
  await updateDoc(ref, { "todoPrefs.batchView": data ?? deleteField() });
} else throw new Error("usage: set | read | query | restore-queries | date | view");
console.log(JSON.stringify(out));
process.exit(0);
