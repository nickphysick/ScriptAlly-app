/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Reseeds `seed-ms-1`'s book versions on the DEV fixture.
 *
 * ⚠️ THEY WENT MISSING AND THE LOSS COULD NOT BE ATTRIBUTED. On 27 Aug the manuscript carried three;
 * a day later the field was absent entirely. Nothing in this repo's history removes it, and the
 * sessions running that day each restored what they seeded. Recorded here rather than left for the
 * next reader to rediscover, because the SYMPTOM points nowhere near the cause: with fewer than two
 * versions `versionsActive` is false, so every version surface hides itself — the rail's Versions
 * section renders empty, and two of Tracking's three panels do not render at all. Both read as
 * regressions and neither is one.
 *
 *   node tests/e2e/seedBookVersions.mjs           reseed the three
 *   node tests/e2e/seedBookVersions.mjs --clear   remove them again
 *
 * The ids are stable and are what packages point at through `bookVersionId`.
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, updateDoc, setDoc, deleteDoc, deleteField, getDoc } from "firebase/firestore";


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

const { deleteField: df } = await import("firebase/firestore");
const CLEAR = process.argv.includes("--clear");
/* ⚠️ ONE VERSION CARRIES A NOTE AND TWO DO NOT, DELIBERATELY. A note-less version is the ordinary
   state and the card says so in words; a version WITH a note shows it, in the same band. With all
   three note-less, a sweep over the description band could only ever see one of those two. */
const VERSIONS = [
  { id: "bv-prologue", name: "Prologue-first",      kind: "reordering", createdDate: "2026-03-02",
    note: "Opens on the flood, and holds the guild back until chapter four." },
  { id: "bv-world",    name: "Worldbuilding-first", kind: "reordering", createdDate: "2026-05-11" },
  { id: "bv-rr",       name: "Post-R&R (T. Marsh)", kind: "revision",   createdDate: "2026-07-20" },
];
const ref = doc(db, "users", uid, "manuscripts", "seed-ms-1");
const before = (await getDoc(ref)).data()?.bookVersions;
console.log(`before: ${Array.isArray(before) ? JSON.stringify(before.map((v) => v.name)) : JSON.stringify(before ?? null)}`);
await updateDoc(ref, CLEAR ? { bookVersions: df() } : { bookVersions: VERSIONS });
const after = (await getDoc(ref)).data()?.bookVersions;
console.log(`after : ${Array.isArray(after) ? JSON.stringify(after.map((v) => v.name)) : JSON.stringify(after ?? null)}`);
process.exit(0);
