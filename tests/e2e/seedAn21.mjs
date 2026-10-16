/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AN21 I1's fixture (Analytics v21): an EMPTY manuscript, and one query added to it while the page is open, so the
 * lock can watch the empty page switch to its populated state without a reload.
 *
 * ⚠️ IT RESTORES IN THE SAME RUN: I1's `afterAll` calls `restore`, which deletes the query and the manuscript. Both
 *    ids say what they are, so a stray one is recognisable on sight. dev only.
 *
 *   node tests/e2e/seedAn21.mjs empty     # create the empty manuscript
 *   node tests/e2e/seedAn21.mjs addq      # add one query to it
 *   node tests/e2e/seedAn21.mjs count     # print how many queries it holds
 *   node tests/e2e/seedAn21.mjs restore   # delete both
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, deleteDoc, getDocs, collection, query, where, limit } from "firebase/firestore";

const env = (file) => Object.fromEntries(
  readFileSync(file, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }),
);
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error(`Refusing to seed "${dev.VITE_FIREBASE_PROJECT_ID}" — dev only.`);
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");
const app = initializeApp({
  apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID,
  storageBucket: dev.VITE_FIREBASE_STORAGE_BUCKET, messagingSenderId: dev.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: dev.VITE_FIREBASE_APP_ID,
});
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", PASSWORD);
const uid = user.uid;
export const MS_ID = "seed-an21-empty";
const Q_ID = "seed-an21-q";
const cmd = process.argv[2];
const msRef = doc(db, "users", uid, "manuscripts", MS_ID);
const qRef = doc(db, "users", uid, "queries", Q_ID);

if (cmd === "empty") {
  /* the emptiest LEGAL manuscript: `isValidManuscript` requires `wordCount is int` and `logline is string` */
  await setDoc(msRef, {
    id: MS_ID, userId: uid, title: "An Empty Analytics Fixture", genre: "Literary Fiction", ageCategory: "Adult",
    wordCount: 0, logline: "", status: "Querying", statusChangedDate: new Date().toISOString().slice(0, 10), comps: [], shelved: false,
  });
  console.log(MS_ID);
} else if (cmd === "addq") {
  const agents = await getDocs(query(collection(db, "users", uid, "agents"), limit(1)));
  const agentId = agents.docs[0]?.id;
  if (!agentId) throw new Error("no agent on the harness account");
  await setDoc(qRef, {
    id: Q_ID, userId: uid, agentId, manuscriptId: MS_ID, dateSent: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10),
    status: "Queried", sendMethod: "Email", personalisationNotes: "", packageId: "",
  });
  console.log(Q_ID);
} else if (cmd === "count") {
  const qs = await getDocs(query(collection(db, "users", uid, "queries"), where("manuscriptId", "==", MS_ID)));
  console.log(String(qs.size));
} else if (cmd === "restore") {
  await deleteDoc(qRef);
  await deleteDoc(msRef);
  console.log("restored");
} else {
  throw new Error(`unknown command ${cmd}`);
}
process.exit(0);
