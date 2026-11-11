/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v55 — the tray head locks' fixture: reads and sets the two saved tray prefs (todoPrefs.trayGrouping and
 * todoPrefs.trayCollapsed), and reads a query's request dates. Emulator or dev only (fsTarget's `targetEnv`).
 *
 *   node tests/e2e/seedTd55.mjs prefs '{"trayGrouping":"agent","trayCollapsed":true}'   # null removes a pref; prints before
 *   node tests/e2e/seedTd55.mjs read-prefs null
 *   node tests/e2e/seedTd55.mjs query '["<queryId>"]'   # prints the dates the days-waiting figure is read from
 *
 * ⚠️ `prefs` prints what the account held before, and the lock writes that back in its afterAll.
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
const userRef = doc(db, "users", uid);
const KEYS = ["trayGrouping", "trayCollapsed"];
if (cmd === "prefs") {
  const tp = (await getDoc(userRef)).data()?.todoPrefs ?? {};
  for (const k of KEYS) if (k in data) out[k] = tp[k] ?? null;
  const patch = {};
  for (const [k, v] of Object.entries(data)) if (KEYS.includes(k)) patch[`todoPrefs.${k}`] = v ?? deleteField();
  await updateDoc(userRef, patch);
} else if (cmd === "read-prefs") {
  const tp = (await getDoc(userRef)).data()?.todoPrefs ?? {};
  for (const k of KEYS) out[k] = tp[k] ?? null;
} else if (cmd === "query") {
  for (const id of data) {
    const q = (await getDoc(doc(db, "users", uid, "queries", id))).data() ?? {};
    out[id] = { status: q.status ?? null, fullRequestedDate: q.fullRequestedDate ?? null, partialRequestedDate: q.partialRequestedDate ?? null, lastStatusChange: q.lastStatusChange ?? null, dateSent: q.dateSent ?? null };
  }
} else throw new Error("usage: prefs | read-prefs | query");
console.log(JSON.stringify(out));
process.exit(0);
