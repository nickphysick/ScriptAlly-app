/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v29 — read, set and put back the harness books' fields MSV29 seeds (tests/e2e/manuscriptsV29.measure.ts).
 * ⚠️ EMULATOR ONLY. It refuses a live target even with ALLOW_LIVE_FIRESTORE=1: the states it writes (no logline, a
 *    45-character title, Shelved) are fixtures, never something to leave on a shared account. Every e2e:emu run imports
 *    the committed snapshot and exports nothing, and MSV29 still restores what it wrote in the same run.
 *
 *   node tests/e2e/ms29Fixture.mjs --get <msId>                 print the fields (absent keys left out)
 *   node tests/e2e/ms29Fixture.mjs --set <msId> '<json>'         write them; a value of "__delete__" deletes the key
 *   node tests/e2e/ms29Fixture.mjs --feed <msId>                 the ids of the book's "updated" feed rows
 */
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, deleteField, collection, getDocs, query, where } from "firebase/firestore";
import { targetEnv, TARGET_PROJECT, EMULATOR_PROJECT, harnessPassword } from "./fsTarget.mjs";

const env = targetEnv();
if (TARGET_PROJECT !== EMULATOR_PROJECT || env.VITE_FIREBASE_PROJECT_ID !== EMULATOR_PROJECT) throw new Error("Refusing: ms29Fixture writes to the emulator only.");
export const KEYS = ["title", "genre", "subGenres", "ageCategory", "wordCount", "logline", "elevatorPitch", "synopsis", "series", "status", "shelved", "shelvedReason", "statusChangedDate"];

const app = initializeApp({ apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN, projectId: env.VITE_FIREBASE_PROJECT_ID, appId: env.VITE_FIREBASE_APP_ID });
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(getAuth(app), "harness@scriptally.test", harnessPassword());
const [cmd, id, arg] = process.argv.slice(2);
if (!/^[a-zA-Z0-9_-]+$/.test(id ?? "")) throw new Error("a manuscript id");
const ms = doc(db, "users", user.uid, "manuscripts", id);
const read = async () => { const d = (await getDoc(ms)).data() ?? {}; return Object.fromEntries(KEYS.filter((k) => k in d).map((k) => [k, d[k]])); };

if (cmd === "--get") console.log(JSON.stringify(await read()));
else if (cmd === "--set") {
  const want = JSON.parse(arg);
  await updateDoc(ms, Object.fromEntries(Object.entries(want).map(([k, v]) => [k, v === "__delete__" ? deleteField() : v])));
  console.log(JSON.stringify(await read()));
} else if (cmd === "--feed") {
  const snap = await getDocs(query(collection(db, "users", user.uid, "activities"), where("manuscriptId", "==", id)));
  console.log(JSON.stringify(snap.docs.filter((d) => d.data().activityType === "Manuscript Updated" || /updated a manuscript/.test(d.data().description ?? "")).map((d) => d.id).sort()));
} else throw new Error("usage: --get | --set | --feed");
process.exit(0);
