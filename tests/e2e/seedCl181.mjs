/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v18.1 — ONE bare agent for CL181 B3 and B4: a name and an agency and nothing else, so the panel has
 * every quiet "Not recorded" to draw and Housekeeping has every gap an open agent can have (reply time, what to send,
 * genres, wishlist). Dev only, delete-before-write; `--clean` removes it (and any reminder pointing at it).
 *
 *   node tests/e2e/seedCl181.mjs           # seed (or reset) clv181-bare
 *   node tests/e2e/seedCl181.mjs --later   # …and put its wishlist gap off with Housekeeping's "Later" (30 days)
 *   node tests/e2e/seedCl181.mjs --clean   # remove it, and that Later leaf
 *
 * ⚠️ THE LATER LEAF IS THE FIXTURE'S VARIETY: with it, Housekeeping lists three of the agent's gaps while its fields
 *    still have four, so a gap line counted from the fields cannot pass for one read from Housekeeping (CL181 B4).
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { FieldPath, collection, deleteDoc, deleteField, doc, getDocs, getFirestore, query, setDoc, updateDoc, where } from "firebase/firestore";

const env = (p) => Object.fromEntries(readFileSync(p, "utf8").split("\n").filter((l) => l.includes("="))
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
const uid = user.uid;
const ID = "clv181-bare";
const ref = doc(db, "users", uid, "agents", ID);

const tasks = await getDocs(query(collection(db, "users", uid, "tasks"), where("agentId", "==", ID)));
for (const t of tasks.docs) await deleteDoc(t.ref);
await deleteDoc(ref).catch(() => {});
const later = new FieldPath("todoPrefs", "contacts", "later", `${ID}:wishlist`);
await updateDoc(doc(db, "users", uid), later, deleteField()).catch(() => {});
if (process.argv.includes("--clean")) { console.log(`removed ${ID}`); process.exit(0); }
const now = new Date().toISOString();
await setDoc(ref, {
  id: ID, userId: uid, name: "Wren Tallis", agency: "Tallis & Moor", email: "", website: "", genres: [], mswlNotes: "",
  submissionStatus: "Open", submissionMethod: "Email", materialsWanted: [], dateAdded: now, lastCheckedDate: now, notes: "",
});
if (process.argv.includes("--later")) {
  const until = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  await updateDoc(doc(db, "users", uid), later, until);
  console.log(`seeded ${ID}, wishlist put off until ${until}`);
} else console.log(`seeded ${ID}`);
process.exit(0);
