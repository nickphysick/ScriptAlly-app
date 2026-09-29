/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The manuscript switcher's shelved branch (switcher v2, S3): the harness account has no shelved book,
 * so the SHELVED group would never be exercised. This shelves `seed-ms-empty` ("Nothing In It Yet",
 * from seedEmptyManuscript.mjs) for the run and puts it back.
 *
 *   node tests/e2e/seedSwitcherShelved.mjs            shelve it
 *   node tests/e2e/seedSwitcherShelved.mjs --restore  unshelve it
 *
 * ⚠️ ONLY `shelved` MOVES. Its `status` stays "Drafting", so the book is shelved through the one
 * predicate (`isShelvedPresentation`: status Shelved OR shelved === true) by the flag alone.
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, updateDoc, getDoc } from "firebase/firestore";


const env = (file) => Object.fromEntries(
  readFileSync(file, "utf8").split("\n")
    .map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }),
);
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
const PROJECT = dev.VITE_FIREBASE_PROJECT_ID;
if (PROJECT !== "scriptally-dev") throw new Error(`Refusing to probe "${PROJECT}".`);
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");

const app = initializeApp({
  apiKey: dev.VITE_FIREBASE_API_KEY,
  authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: PROJECT,
  storageBucket: dev.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: dev.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: dev.VITE_FIREBASE_APP_ID,
});
const dbId = dev.VITE_FIREBASE_DATABASE_ID;
const db = !dbId || dbId === "(default)" ? getFirestore(app) : getFirestore(app, dbId);
console.log(`database: ${dbId || "(default)"} · project: ${PROJECT}`);

const { user } = await signInWithEmailAndPassword(
  getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", PASSWORD);
const uid = user.uid;

const ref = doc(db, "users", uid, "manuscripts", "seed-ms-empty");
const snap = await getDoc(ref);
if (!snap.exists()) throw new Error("seed-ms-empty is missing — run seedEmptyManuscript.mjs first");
const RESTORE = process.argv.includes("--restore");
await updateDoc(ref, { shelved: !RESTORE });
console.log(`seed-ms-empty shelved=${!RESTORE}`);
process.exit(0);
