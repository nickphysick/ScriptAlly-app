/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Contact list's page guide state on the harness account (v18.3 §F): todoPrefs.contacts.guide
 *   { done: { add, search, pin, open, edit, hk }, seen, hidden }   (v19 §K adds pin)
 *
 *   node tests/e2e/guideFlags.mjs                  # print it
 *   node tests/e2e/guideFlags.mjs --clear          # remove the whole guide map (one dotted leaf)
 *   node tests/e2e/guideFlags.mjs --seen           # mark it seen (so the first-visit open does not fire)
 *   node tests/e2e/guideFlags.mjs --done add,open  # tick those items
 *   node tests/e2e/guideFlags.mjs --restore '<json>'  # put back exactly what a --print gave (null = absent)
 *   …add `--page queries` to any of these for the Query Centre's guide (v139): todoPrefs.queries.guide
 *
 * Dev only: it refuses any other project.
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, deleteField, arrayRemove } from "firebase/firestore";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("dev only");
const EMAIL = process.env.SA_E2E_EMAIL ?? "harness@scriptally.test";
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID });
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(getAuth(app), EMAIL, PASSWORD);
const ref = doc(db, "users", user.uid);
/* v139 — `--page queries` reads and writes the Query Centre's guide (todoPrefs.queries.guide) instead */
const PAGE = process.argv.includes("--page") ? process.argv[process.argv.indexOf("--page") + 1] : "contacts";
if (PAGE !== "contacts" && PAGE !== "queries") throw new Error("--page contacts|queries");
const G = `todoPrefs.${PAGE}.guide`;
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
if (process.argv.includes("--clear")) await updateDoc(ref, { [G]: deleteField() });
if (process.argv.includes("--seen")) await updateDoc(ref, { [`${G}.seen`]: true });
const d = arg("--done");
if (d) await updateDoc(ref, Object.fromEntries(d.split(",").filter(Boolean).map((k) => [`${G}.done.${k}`, true])));
const r = arg("--restore");
if (r) { const v = JSON.parse(r); await updateDoc(ref, { [G]: v == null ? deleteField() : v }); }
const g = (await getDoc(ref)).data()?.todoPrefs?.[PAGE]?.guide ?? null;
console.log(JSON.stringify(g));
process.exit(0);
