/**
 * Contact list v25 F1's independent figure: read (never write) the harness account's queries, counted by the TITLE of
 * the manuscript they belong to. `node tests/e2e/cl25QueriesByBook.mjs` prints {"<title>": n, ...}. F1 holds the
 * drawer's "query no. {n}" to that count + 1, so the lock does not share a derivation with the page it checks.
 * The password is never printed.
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, getDocs, collection } from "firebase/firestore";

const env = (file) => Object.fromEntries(readFileSync(file, "utf8").split("\n").map((l) => /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(l)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]));
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
const PASSWORD = process.env.SA_E2E_PASSWORD || local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in the environment or .env.local");
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("refusing: not the dev project");
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID }, "cl25-by-book");
const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.SA_E2E_EMAIL || local.SA_E2E_EMAIL || "harness@scriptally.test", PASSWORD);
const dbId = dev.VITE_FIREBASE_DATABASE_ID && dev.VITE_FIREBASE_DATABASE_ID !== "(default)" ? dev.VITE_FIREBASE_DATABASE_ID : undefined;
const db = dbId ? getFirestore(app, dbId) : getFirestore(app);
const titles = new Map((await getDocs(collection(db, "users", user.uid, "manuscripts"))).docs.map((d) => [d.id, (d.data().title || "").trim()]));
const out = {};
for (const d of (await getDocs(collection(db, "users", user.uid, "queries"))).docs) {
  const t = titles.get(d.data().manuscriptId);
  if (t) out[t] = (out[t] ?? 0) + 1;
}
console.log(JSON.stringify(out));
process.exit(0);
