/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v27 — the filled account's extra state for MSV27, on top of seedManuscriptsV21.mjs --only filled:
 * the book gains a synopsis (so the guide reads 3 of 4: details, logline and synopsis done, the pitch not), and the
 * account's Manuscripts guide state is cleared. `--clean` removes the synopsis, the pitch and the guide state again.
 *
 * ⚠️ DEV ONLY, and only the dedicated ms21-filled account (nothing else signs in as it).
 *
 *   node tests/e2e/ms27Fixture.mjs           apply
 *   node tests/e2e/ms27Fixture.mjs --clean   put back
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, updateDoc, deleteField } from "firebase/firestore";
import { FILLED_EMAIL, MS_ID } from "./ms21Fixture.mjs";

const env = (file) => Object.fromEntries(
  readFileSync(file, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }),
);
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("Refusing: not dev.");
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID });
const dbId = dev.VITE_FIREBASE_DATABASE_ID;
const db = !dbId || dbId === "(default)" ? getFirestore(app) : getFirestore(app, dbId);
const { user } = await signInWithEmailAndPassword(getAuth(app), FILLED_EMAIL, process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD);
const ms = doc(db, "users", user.uid, "manuscripts", MS_ID);
const me = doc(db, "users", user.uid);
const clean = process.argv.includes("--clean");
if (clean) {
  await updateDoc(ms, { synopsis: deleteField(), elevatorPitch: deleteField() });
} else {
  await updateDoc(ms, {
    synopsis: "Saturday, on the coast. A skipper runs the morning ferry as his father did.\n\nWhen his brother fails to show, he has until the evening ebb.",
    elevatorPitch: deleteField(),
  });
}
await updateDoc(me, { "todoPrefs.manuscripts.guide": deleteField() });
console.log(clean ? "ms27 fixture removed" : "ms27 fixture applied");
process.exit(0);
