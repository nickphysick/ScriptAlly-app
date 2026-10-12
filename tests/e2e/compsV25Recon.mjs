/**
 * Comps v25 §0.2 recon (READ-ONLY): how the harness account's queries resolve to a query letter.
 * Run through vite-node so it uses the app's own `traceLetter`, never a second copy of the rule:
 *   npx vite-node tests/e2e/compsV25Recon.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { traceLetter, letterRecorded } from "../../src/lib/compUsage";

const env = (file) => Object.fromEntries(
  readFileSync(file, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }),
);
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("dev only");
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID });
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD);
const all = async (name) => (await getDocs(collection(db, "users", user.uid, name))).docs.map((d) => ({ id: d.id, ...d.data() }));
const [queries, versions, packages, manuscripts] = await Promise.all(["queries", "versions", "packages", "manuscripts"].map(all));
const out = { queries: queries.length, letters: versions.filter((v) => v.componentType === "Query Letter").length, lettersRecorded: versions.filter((v) => v.componentType === "Query Letter" && letterRecorded(v)).length, resolved: 0, unresolved: 0, ambiguous: 0, via: {}, byManuscript: {} };
for (const q of queries) {
  const t = traceLetter(q, versions, packages);
  const m = (out.byManuscript[q.manuscriptId] ??= { title: manuscripts.find((x) => x.id === q.manuscriptId)?.title ?? "(gone)", resolved: 0, unresolved: 0 });
  if (t.kind === "none") { out.unresolved++; m.unresolved++; }
  else { out.resolved++; m.resolved++; out.via[t.via] = (out.via[t.via] ?? 0) + 1; if (t.ambiguous) out.ambiguous++; }
}
console.log(JSON.stringify(out, null, 1));
process.exit(0);
