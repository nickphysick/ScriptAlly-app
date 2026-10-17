/**
 * Dashboard v60 — the pre-query fixture: a manuscript of its own with NO queries on it (`db60-pre`).
 * Agents are account-wide, so "agents on file, no queries" is this manuscript on the shared account;
 * "day one" adds the dev aid `__SA_DASH_NO_AGENTS`. Nothing else on the account is touched.
 *
 *   node tests/e2e/seedDash60.mjs          create (or reset) the manuscript, bare
 *   node tests/e2e/seedDash60.mjs --full   ...with one of each material, two comps and one book version
 *                                          (every "Ready for lift off?" tile but the import done)
 *   node tests/e2e/seedDash60.mjs --clean  remove it, and every version written for it
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, deleteDoc, getDocs, collection, query, where } from "firebase/firestore";

const env = (file) => Object.fromEntries(readFileSync(file, "utf8").split("\n").map((l) => /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(l)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]));
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
const PASSWORD = process.env.SA_E2E_PASSWORD || local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD");
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("refusing: not the dev project");
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID }, "seed-dash60");
const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.SA_E2E_EMAIL || local.SA_E2E_EMAIL || "harness@scriptally.test", PASSWORD);
const dbId = dev.VITE_FIREBASE_DATABASE_ID && dev.VITE_FIREBASE_DATABASE_ID !== "(default)" ? dev.VITE_FIREBASE_DATABASE_ID : undefined;
const db = dbId ? getFirestore(app, dbId) : getFirestore(app);
export const MS = "db60-pre";
const uid = user.uid;
const versions = await getDocs(query(collection(db, "users", uid, "versions"), where("manuscriptId", "==", MS)));
for (const d of versions.docs) await deleteDoc(d.ref);
if (process.argv.includes("--clean")) {
  await deleteDoc(doc(db, "users", uid, "manuscripts", MS));
  console.log(`removed ${MS} and ${versions.size} version(s)`);
} else {
  const full = process.argv.includes("--full");
  await setDoc(doc(db, "users", uid, "manuscripts", MS), {
    id: MS, userId: uid, title: "DB60 Pre-query", genre: "Fantasy", ageCategory: "Adult",
    wordCount: 0, logline: "", status: "Drafting", statusChangedDate: new Date().toISOString(),
    ...(full ? {
      comps: [{ id: "db60-c1", title: "The Night Circus", author: "Erin Morgenstern", year: 2011 }, { id: "db60-c2", title: "Piranesi", author: "Susanna Clarke", year: 2020 }],
      bookVersions: [{ id: "db60-bv1", name: "First draft", kind: "initial", createdDate: "2026-10-01" }],
    } : {}),
  });
  if (full) {
    for (const [i, t] of [["ql", "Query Letter"], ["syn", "Synopsis"], ["sp", "Sample Pages"]]) {
      await setDoc(doc(db, "users", uid, "versions", `db60-v-${i}`), { id: `db60-v-${i}`, manuscriptId: MS, userId: uid, componentType: t, versionName: `${t} v1`, fileAttached: false, createdDate: new Date().toISOString() });
    }
  }
  const qs = await getDocs(query(collection(db, "users", uid, "queries"), where("manuscriptId", "==", MS)));
  if (qs.size) throw new Error(`${MS} has ${qs.size} queries — not pre-query`);
  console.log(`seeded ${MS} ${full ? "full" : "bare"} (removed ${versions.size} old version(s))`);
}
process.exit(0);
