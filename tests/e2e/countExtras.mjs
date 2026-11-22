/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v26 — the otherMaterials migration's before and after, on the dev harness account (read only).
 * A package is UNMIGRATED when it has `otherMaterials` text and no `extraIds`; migrated when its `extraIds` name the
 * extra its text became.  node tests/e2e/countExtras.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, getDocs, collection } from "firebase/firestore";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("dev only");
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID });
const dbId = dev.VITE_FIREBASE_DATABASE_ID;
const db = !dbId || dbId === "(default)" ? getFirestore(app) : getFirestore(app, dbId);
const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD);
const pk = (await getDocs(collection(db, "users", user.uid, "packages"))).docs.map((d) => d.data());
const ms = (await getDocs(collection(db, "users", user.uid, "manuscripts"))).docs.map((d) => d.data());
const text = pk.filter((p) => (p.otherMaterials ?? "").trim());
const out = {
  packages: pk.length,
  withText: text.length,
  unmigrated: text.filter((p) => !Array.isArray(p.extraIds)).length,
  migrated: text.filter((p) => Array.isArray(p.extraIds) && p.extraIds.length).length,
  sentWithText: text.filter((p) => p.firstSentAt).length,
  manuscriptsWithExtras: ms.filter((m) => Array.isArray(m.extras) && m.extras.length).map((m) => ({ id: m.id, extras: m.extras.map((e) => e.name) })),
  byManuscript: Object.fromEntries([...new Set(text.map((p) => p.manuscriptId))].map((id) => [id, text.filter((p) => p.manuscriptId === id).map((p) => `${p.packageName}: "${p.otherMaterials}"${Array.isArray(p.extraIds) ? " ✓" : ""}`)])),
};
console.log(JSON.stringify(out, null, 1));
process.exit(0);
