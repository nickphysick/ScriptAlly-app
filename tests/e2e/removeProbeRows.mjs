/**
 * Import truth, phase 5 — remove the ten probe rows older matcher runs left on the harness account
 * on 20 September, and nothing else. Run once: `node tests/e2e/removeProbeRows.mjs` (add `--dry`
 * to read only). It refuses unless every named query is there and is what it is expected to be,
 * and it proves the account's counts afterwards equal the snapshot taken before, less the ten.
 * It also reads (never writes) how many agents still hold values an import made up.
 * The password is read from the environment or .env.local and is never printed.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, deleteDoc, getDocs, collection } from "firebase/firestore";

const PROBES = [
  "q-imported-1nzp7z3h7", "q-imported-3b8hlr7rl", "q-imported-4u80p5qkj", "q-imported-7bqjoai77", "q-imported-9t5ko5nxs",
  "q-imported-c7o0wqrf1", "q-imported-iacnspgnz", "q-imported-isbu9huiz", "q-imported-wt6ykzcn0", "q-imported-zaxipj83o",
];
const DRY = process.argv.includes("--dry");
const env = (file) => Object.fromEntries(readFileSync(file, "utf8").split("\n").map((l) => /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(l)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]));
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
const EMAIL = process.env.SA_E2E_EMAIL || local.SA_E2E_EMAIL || "harness@scriptally.test";
const PASSWORD = process.env.SA_E2E_PASSWORD || local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in the environment or .env.local");
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("refusing: not the dev project");

const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID }, "import-truth-probes");
const { user } = await signInWithEmailAndPassword(getAuth(app), EMAIL, PASSWORD);
const dbId = dev.VITE_FIREBASE_DATABASE_ID && dev.VITE_FIREBASE_DATABASE_ID !== "(default)" ? dev.VITE_FIREBASE_DATABASE_ID : undefined;
const db = dbId ? getFirestore(app, dbId) : getFirestore(app);
const uid = user.uid;
const col = (...p) => collection(db, "users", uid, ...p);
const COLLECTIONS = ["activities", "agents", "manuscripts", "versions", "packages", "queries", "taskFlags", "tasks"];

async function counts() {
  const out = {};
  for (const c of COLLECTIONS) out[c] = (await getDocs(col(c))).size;
  let n = 0;
  for (const d of (await getDocs(col("queries"))).docs) n += (await getDocs(col("queries", d.id, "activity"))).size;
  out["queries/activity"] = n;
  return out;
}

const before = await counts();
const queries = new Map((await getDocs(col("queries"))).docs.map((d) => [d.id, d.data()]));
const feed = (await getDocs(col("activities"))).docs.map((d) => ({ id: d.id, ...d.data() }));

// Every probe must be there, and be what it is expected to be: a matcher-made query whose one feed row is dated 20 Sep.
const plan = [];
for (const id of PROBES) {
  if (!queries.has(id)) throw new Error(`refusing: ${id} is not on the account`);
  const steps = (await getDocs(col("queries", id, "activity"))).docs.map((d) => d.id);
  const rows = feed.filter((f) => f.queryId === id);
  const days = [...new Set(rows.map((f) => String(f.date ?? "").slice(0, 10)))];
  if (rows.length !== 1 || !/^\d{4}-09-20$/.test(days[0] ?? "")) throw new Error(`refusing: ${id} is not a 20 September probe (feed rows ${rows.length}, days ${days.join(",")})`);
  plan.push({ id, steps, feed: rows.map((f) => f.id), day: days[0] });
}
const stepTotal = plan.reduce((n, p) => n + p.steps.length, 0);
const feedTotal = plan.reduce((n, p) => n + p.feed.length, 0);

// Read only: agents the import made that still hold the values it used to make up.
const agents = (await getDocs(col("agents"))).docs.map((d) => ({ id: d.id, ...d.data() }));
const made = agents.filter((a) => a.importedNeedsReview === true || /^agent-(imported|fromrow)-/.test(a.id));
const invented = {
  agentsOnAccount: agents.length,
  madeByAnImport: made.length,
  rating3: made.filter((a) => a.starRating === 3).length,
  statusOpen: made.filter((a) => a.submissionStatus === "Open").length,
  window0or8: made.filter((a) => a.responseTimeWeeks === 0 || a.responseTimeWeeks === 8).length,
  replyRuleSet: made.filter((a) => typeof a.noResponseMeansNo === "boolean").length,
  threeMaterials: made.filter((a) => Array.isArray(a.materialsWanted) && a.materialsWanted.join("|") === "Query Letter|Synopsis|Sample Pages").length,
  generalFiction: made.filter((a) => Array.isArray(a.genres) && a.genres.length === 1 && a.genres[0] === "General Fiction").length,
  anyOfThese: made.filter((a) => a.starRating === 3 || a.submissionStatus === "Open" || a.responseTimeWeeks === 0 || a.responseTimeWeeks === 8).length,
};

if (!DRY) {
  for (const p of plan) {
    for (const s of p.steps) await deleteDoc(doc(db, "users", uid, "queries", p.id, "activity", s));
    for (const f of p.feed) await deleteDoc(doc(db, "users", uid, "activities", f));
    await deleteDoc(doc(db, "users", uid, "queries", p.id));
  }
}
const after = await counts();
const expected = { ...before, queries: before.queries - PROBES.length, activities: before.activities - feedTotal, "queries/activity": before["queries/activity"] - stepTotal };
const ok = DRY || COLLECTIONS.concat("queries/activity").every((c) => after[c] === expected[c]);
const report = { dry: DRY, removed: DRY ? 0 : PROBES.length, plan: plan.map((p) => ({ id: p.id, historySteps: p.steps.length, feedRows: p.feed.length, day: p.day })), before, after, expected, countsMatch: ok, invented };
mkdirSync("reports/import-truth", { recursive: true });
writeFileSync(`reports/import-truth/${DRY ? "probe-rows-dry.json" : "probe-rows-removed.json"}`, JSON.stringify(report, null, 1));
console.log(JSON.stringify({ dry: DRY, before, after, expected, countsMatch: ok, invented }, null, 1));
if (!ok) { console.error("COUNTS DO NOT MATCH THE SNAPSHOT LESS TEN"); process.exit(1); }
process.exit(0);
