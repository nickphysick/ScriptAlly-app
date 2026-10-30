/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FEED v1 — the three states the harness account does not have, each written and put back by the lock that
 * needs it (tests/e2e/dashFeedV1.measure.ts), in the same run.
 *
 *   node tests/e2e/seedDf1.mjs nogoal            → queryingGoals: [] (no goal in force), the old list kept
 *   node tests/e2e/seedDf1.mjs nogoal --restore
 *   node tests/e2e/seedDf1.mjs mats <queryId>    → that query sent as "Package B" with three materials
 *   node tests/e2e/seedDf1.mjs mats <queryId> --restore
 *   node tests/e2e/seedDf1.mjs scout-clear       → notifyPrefs.scout removed (the Scout's request not yet made)
 *
 * ⚠️ RESTORE IS EXACT: a field that was absent is deleted, never written as empty. The backups live in
 * tests/e2e/.auth/ (gitignored) under a path derived from the mode, so two modes cannot share one.
 * ⚠️ DEV ONLY, AS THE HARNESS USER.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, deleteField } from "firebase/firestore";

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
const uid = user.uid;

const [mode, arg, flag] = process.argv.slice(2);
const restore = process.argv.includes("--restore");
mkdirSync("tests/e2e/.auth", { recursive: true });
const backup = (name) => `tests/e2e/.auth/df1-${name}.json`;
const userRef = doc(db, "users", uid);

if (mode === "nogoal") {
  if (restore) {
    const b = JSON.parse(readFileSync(backup("goals"), "utf8"));
    await updateDoc(userRef, { queryingGoals: b.had ? b.value : deleteField() });
    console.log("restored queryingGoals", b.had ? `(${b.value.length} entries)` : "(absent)");
  } else {
    const snap = await getDoc(userRef);
    const v = snap.data()?.queryingGoals;
    if (!existsSync(backup("goals"))) writeFileSync(backup("goals"), JSON.stringify({ had: v !== undefined, value: v ?? null }));
    await updateDoc(userRef, { queryingGoals: [] });
    console.log("queryingGoals → [] (backup kept)");
  }
} else if (mode === "mats") {
  if (!arg || arg.startsWith("--")) throw new Error("mats needs a query id");
  const ref = doc(db, "users", uid, "queries", arg);
  const KEYS = ["sentHow", "sentPackageId", "sentPackageName", "sentMaterials", "sentVersions"];
  const file = backup(`mats-${arg.replace(/[^a-zA-Z0-9_-]/g, "_")}`);
  if (restore) {
    const b = JSON.parse(readFileSync(file, "utf8"));
    await updateDoc(ref, Object.fromEntries(KEYS.map((k) => [k, k in b ? b[k] : deleteField()])));
    console.log("restored", arg);
  } else {
    const d = (await getDoc(ref)).data();
    if (!d) throw new Error(`no query ${arg}`);
    if (!existsSync(file)) writeFileSync(file, JSON.stringify(Object.fromEntries(KEYS.filter((k) => d[k] !== undefined).map((k) => [k, d[k]]))));
    await updateDoc(ref, {
      sentHow: "package", sentPackageId: "df1-pkg-b", sentPackageName: "Package B",
      sentMaterials: "Package B package: Query letter Version 3 · Synopsis One page · First 3 chapters", sentVersions: [],
    });
    console.log("seeded materials on", arg);
  }
} else if (mode === "scout-clear") {
  await updateDoc(userRef, { "notifyPrefs.scout": deleteField() });
  console.log("notifyPrefs.scout removed");
} else {
  throw new Error(`unknown mode ${mode} ${flag ?? ""}`);
}
process.exit(0);
