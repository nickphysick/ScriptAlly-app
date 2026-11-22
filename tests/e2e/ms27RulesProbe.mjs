/**
 * Manuscripts v27, Step 0: are elevatorPitch, synopsis, setting and series writable on the DEPLOYED
 * dev rules? Writes each to one of the harness account's own manuscripts, clears it with
 * deleteField(), and puts back exactly what was there before.
 *
 *   node tests/e2e/ms27RulesProbe.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, updateDoc, deleteField, getDoc, collection, getDocs } from "firebase/firestore";

const env = (file) => Object.fromEntries(
  readFileSync(file, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }),
);
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("Refusing: not dev.");
const app = initializeApp({
  apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID,
  appId: dev.VITE_FIREBASE_APP_ID,
});
const dbId = dev.VITE_FIREBASE_DATABASE_ID;
const db = !dbId || dbId === "(default)" ? getFirestore(app) : getFirestore(app, dbId);
const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test",
  process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD);
const all = await getDocs(collection(db, "users", user.uid, "manuscripts"));
const target = all.docs[0];
if (!target) throw new Error("The harness account has no manuscript.");
const ref = doc(db, "users", user.uid, "manuscripts", target.id);
const before = (await getDoc(ref)).data();
console.log(`manuscript ${target.id} "${before.title}"`);
let denied = 0;
for (const f of ["elevatorPitch", "synopsis", "setting", "series"]) {
  try {
    await updateDoc(ref, { [f]: `ms27 probe ${f}` });
    await updateDoc(ref, { [f]: deleteField() });
    console.log(`  ✅ ${f}: write and clear ACCEPTED`);
  } catch (e) { denied++; console.log(`  ❌ ${f}: ${e.message.slice(0, 100)}`); }
  finally {
    await updateDoc(ref, { [f]: f in before ? before[f] : deleteField() }).catch(() => {});
  }
}
const after = (await getDoc(ref)).data();
const same = ["elevatorPitch", "synopsis", "setting", "series"].every((f) => JSON.stringify(after[f]) === JSON.stringify(before[f]));
console.log(`restored exactly: ${same}`);
process.exit(denied || !same ? 1 : 0);
