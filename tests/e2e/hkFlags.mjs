/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Housekeeping's two per-account flags on the harness account (Contact list v17.1 and v18):
 *   todoPrefs.contacts.hkIntroSeen        the intro has been shown (v18 §F.3)
 *   todoPrefs.contacts.tabDismissedAtGaps the floating tab's dismissal (v17.1 §D)
 *
 *   node tests/e2e/hkFlags.mjs           # print both
 *   node tests/e2e/hkFlags.mjs --clear   # remove both (each a dotted leaf; nothing else in todoPrefs is touched)
 *   node tests/e2e/hkFlags.mjs --unsettle <agentId>   # take "<agentId>:reply" out of the settled list ("They don't say")
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
if (process.argv.includes("--clear")) {
  await updateDoc(ref, { "todoPrefs.contacts.hkIntroSeen": deleteField(), "todoPrefs.contacts.tabDismissedAtGaps": deleteField() });
}
const un = process.argv.indexOf("--unsettle");
if (un > 0 && process.argv[un + 1]) await updateDoc(ref, { "todoPrefs.contacts.settled": arrayRemove(`${process.argv[un + 1]}:reply`) });
const c = (await getDoc(ref)).data()?.todoPrefs?.contacts ?? {};
console.log(JSON.stringify({ hkIntroSeen: c.hkIntroSeen ?? null, tabDismissedAtGaps: c.tabDismissedAtGaps ?? null, settled: c.settled ?? [] }));
process.exit(0);
