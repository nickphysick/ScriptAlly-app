/**
 * Query Centre v149.1 B5 — ONE-OFF: title-case existing agent names that are entirely in capitals ("PRIYA RAMAN" →
 * "Priya Raman"), the same rule the imports now apply on the way in. Mixed-case names are never touched.
 *
 * ⚠️ THE SAME FUNCTION, NOT A COPY: it imports src/lib/nameCase.ts under Node's type stripping (Node 22.6+).
 * ⚠️ IT WRITES ONLY `name`, AND PROVES IT: every agent's other fields are read before and after; any other change is a
 *    stop (exit 1). `--apply` writes a backup of exactly which names it changed; `--revert <file>` puts them back.
 * ⚠️ HARNESS-SCOPED BY CONSTRUCTION, like migrateSentHow.mjs: it signs in as one account and can reach no other. Real
 *    accounts need an admin run, which is Nick's call.
 *
 *   node tests/e2e/migrateNameCase.mjs                 # dry run: counts and the names it would change
 *   node tests/e2e/migrateNameCase.mjs --apply
 *   node tests/e2e/migrateNameCase.mjs --revert reports/qc-v149-1/name-case-<uid>.json
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { nameCase } from "../../src/lib/nameCase.ts";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(".env.development"); const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("dev only");
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID });
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD);
const uid = user.uid;
const args = process.argv.slice(2);
const read = async () => (await getDocs(collection(db, "users", uid, "agents"))).docs.map((d) => ({ id: d.id, ...d.data() }));
const others = (a) => JSON.stringify(Object.fromEntries(Object.entries(a).filter(([k]) => k !== "name").sort()));

if (args[0] === "--revert") {
  const file = JSON.parse(readFileSync(args[1], "utf8"));
  for (const c of file.changed) await updateDoc(doc(db, "users", uid, "agents", c.id), { name: c.from });
  console.log(`name-case: reverted ${file.changed.length}`);
  process.exit(0);
}
const before = await read();
const changed = before.filter((a) => typeof a.name === "string" && nameCase(a.name) !== a.name).map((a) => ({ id: a.id, from: a.name, to: nameCase(a.name) }));
console.log(`name-case: ${before.length} agents · ${changed.length} in capitals${changed.length ? ": " + changed.map((c) => `${c.from} → ${c.to}`).join(", ") : ""}`);
if (!args.includes("--apply")) { console.log("dry run: nothing written (pass --apply)"); process.exit(0); }
mkdirSync("reports/qc-v149-1", { recursive: true });
const backup = `reports/qc-v149-1/name-case-${uid}.json`;
writeFileSync(backup, JSON.stringify({ uid, at: new Date().toISOString(), changed }, null, 1));
for (const c of changed) await updateDoc(doc(db, "users", uid, "agents", c.id), { name: c.to });
const after = await read();
const byId = new Map(before.map((a) => [a.id, a]));
const moved = after.filter((a) => others(a) !== others(byId.get(a.id) ?? {}) || (!changed.some((c) => c.id === a.id) && a.name !== byId.get(a.id)?.name));
if (moved.length) { console.error(`STOP: ${moved.length} agent(s) changed outside \`name\`: ${moved.map((a) => a.id).join(", ")}`); process.exit(1); }
console.log(`name-case: changed ${changed.length} · backup ${backup}`);
process.exit(0);
