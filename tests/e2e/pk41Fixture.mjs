/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v41 — the states the SP41 locks need beyond seedPk40.mjs's, on the same `pk40-ms` fixture and the
 * harness account (dev only). Every change here is put back by a plain `node tests/e2e/seedPk40.mjs` (which rewrites the
 * packages and the manuscript) or by `--show-banner`.
 *
 *   node tests/e2e/pk41Fixture.mjs --show-banner    # clear todoPrefs.packages.foundingNoteHidden (the strip shows again)
 *   node tests/e2e/pk41Fixture.mjs --banner         # print whether the strip is dismissed
 *   node tests/e2e/pk41Fixture.mjs --no-active      # pk40-ms with no active package (state 14)
 *   node tests/e2e/pk41Fixture.mjs --no-packages    # delete pk40-ms's packages (state 15)
 *   node tests/e2e/pk41Fixture.mjs --active         # print pk40-ms's activePackageId
 */
import { existsSync, readFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { collection, deleteDoc, deleteField, doc, getDoc, getDocs, getFirestore, updateDoc } from "firebase/firestore";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("dev only");
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID });
const dbId = dev.VITE_FIREBASE_DATABASE_ID;
const db = !dbId || dbId === "(default)" ? getFirestore(app) : getFirestore(app, dbId);
const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", PASSWORD);
const uid = user.uid;
const MS = "pk40-ms";
const has = (f) => process.argv.includes(f);

if (has("--show-banner")) { await updateDoc(doc(db, "users", uid), { "todoPrefs.packages.foundingNoteHidden": deleteField() }); console.log("banner: shown"); }
if (has("--banner")) { const u = (await getDoc(doc(db, "users", uid))).data(); console.log(JSON.stringify({ hidden: u?.todoPrefs?.packages?.foundingNoteHidden === true, plan: u?.plan })); }
if (has("--no-active")) { await updateDoc(doc(db, "users", uid, "manuscripts", MS), { activePackageId: deleteField() }); console.log("pk40-ms: no active package"); }
if (has("--active")) { console.log(JSON.stringify({ active: (await getDoc(doc(db, "users", uid, "manuscripts", MS))).data()?.activePackageId ?? null })); }
if (has("--no-packages")) {
  let n = 0;
  for (const d of (await getDocs(collection(db, "users", uid, "packages"))).docs) if (d.data().manuscriptId === MS) { await deleteDoc(d.ref); n++; }
  await updateDoc(doc(db, "users", uid, "manuscripts", MS), { activePackageId: deleteField() });
  console.log(`pk40-ms: ${n} packages removed`);
}
process.exit(0);
