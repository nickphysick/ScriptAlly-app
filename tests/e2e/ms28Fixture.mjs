/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v28 — read and put back the fields MSV28 writes on the ms21-filled book (series, genre, subGenres,
 * ageCategory, wordCount, logline). ⚠️ DEV ONLY, and only the dedicated ms21-filled account.
 *
 *   node tests/e2e/ms28Fixture.mjs --get                 print the fields (absent keys are left out)
 *   node tests/e2e/ms28Fixture.mjs --snap <file>         save them
 *   node tests/e2e/ms28Fixture.mjs --restore <file>      put them back exactly: a key absent then is deleted now
 *   node tests/e2e/ms28Fixture.mjs --age "<value>"       store a raw ageCategory (E2's legacy values)
 *   node tests/e2e/ms28Fixture.mjs --logline "<text>"    store a logline ("" empties it, as the drawer does: v28.1 A3)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, deleteField } from "firebase/firestore";
import { FILLED_EMAIL, MS_ID } from "./ms21Fixture.mjs";

const env = (file) => Object.fromEntries(
  readFileSync(file, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }),
);
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("Refusing: not dev.");
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID });
const dbId = dev.VITE_FIREBASE_DATABASE_ID;
const db = !dbId || dbId === "(default)" ? getFirestore(app) : getFirestore(app, dbId);
const { user } = await signInWithEmailAndPassword(getAuth(app), FILLED_EMAIL, process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD);
const ms = doc(db, "users", user.uid, "manuscripts", MS_ID);
const KEYS = ["series", "genre", "subGenres", "ageCategory", "wordCount", "logline"];
const read = async () => { const d = (await getDoc(ms)).data() ?? {}; return Object.fromEntries(KEYS.filter((k) => k in d).map((k) => [k, d[k]])); };
const [cmd, arg] = process.argv.slice(2);
if (cmd === "--get") console.log(JSON.stringify(await read()));
else if (cmd === "--snap") { writeFileSync(arg, JSON.stringify(await read())); console.log("snapped"); }
else if (cmd === "--restore") {
  const was = JSON.parse(readFileSync(arg, "utf8"));
  await updateDoc(ms, Object.fromEntries(KEYS.map((k) => [k, k in was ? was[k] : deleteField()])));
  const now = await read();
  if (JSON.stringify(now) !== JSON.stringify(Object.fromEntries(KEYS.filter((k) => k in was).map((k) => [k, was[k]])))) throw new Error(`restore mismatch: ${JSON.stringify(now)}`);
  console.log("restored");
} else if (cmd === "--age") { await updateDoc(ms, { ageCategory: arg }); console.log("age set"); }
else if (cmd === "--logline") { await updateDoc(ms, { logline: arg ?? "" }); console.log("logline set"); /* the rules require the key: empty is "", as the drawer writes it */ }
else throw new Error("usage: --get | --snap <file> | --restore <file> | --age <value>");
process.exit(0);
