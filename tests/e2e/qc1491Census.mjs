// QC149.1 Step 0 — a read-only census of the harness account: which fields queries, their steps, agents and
// manuscripts actually hold, and the two duplicate pairs. Writes nothing.
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";
const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(".env.development"); const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("dev only");
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID });
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(getAuth(app), "harness@scriptally.test", local.SA_E2E_PASSWORD);
const col = async (...p) => (await getDocs(collection(db, "users", user.uid, ...p))).docs.map((d) => ({ id: d.id, ...d.data() }));
const tally = (rows) => { const t = {}; for (const r of rows) for (const k of Object.keys(r)) t[k] = (t[k] ?? 0) + 1; return Object.fromEntries(Object.entries(t).sort((a, b) => b[1] - a[1])); };
const queries = await col("queries"), agents = await col("agents"), mss = await col("manuscripts");
const steps = [];
for (const q of queries) for (const a of await col("queries", q.id, "activity")) steps.push({ q: q.id, ...a });
const out = {
  counts: { queries: queries.length, agents: agents.length, manuscripts: mss.length, steps: steps.length },
  queryFields: tally(queries), stepFields: tally(steps), agentFields: tally(agents), msFields: tally(mss),
  stepTypes: tally(steps.map((s) => ({ [String(s.type)]: 1 }))),
  stepEventKeys: tally(steps.map((s) => ({ [String(s.eventKey ?? "none")]: 1 }))),
  stepSamples: steps.filter((s) => s.note || s.materials || s.materialsType).slice(0, 12).map((s) => ({ q: s.q, type: s.type, note: s.note, materials: s.materials, materialsType: s.materialsType, eventKey: s.eventKey })),
  msSamples: mss.map((m) => ({ id: m.id, title: m.title, ageCategory: m.ageCategory, genre: m.genre, subGenres: m.subGenres, wordCount: m.wordCount })),
  agentSamples: agents.slice(0, 6).map((a) => ({ id: a.id, name: a.name, mswl: (a.mswlNotes ?? "").slice(0, 40), genres: a.genres, rt: a.responseTimeWeeks, status: a.submissionStatus, reopensOn: a.reopensOn, email: a.email, website: a.website, method: a.submissionMethod, formUrl: a.submissionFormUrl ?? a.queryManagerUrl ?? a.formUrl, lastChecked: a.lastCheckedDate })),
  dupes: ["Jonathan Marsh", "Eleanor Whitfield"].map((n) => {
    const ag = agents.filter((a) => a.name === n);
    return { name: n, agents: ag.map((a) => ({ id: a.id, agency: a.agency })), queries: queries.filter((q) => ag.some((a) => a.id === q.agentId)).map((q) => ({ id: q.id, agentId: q.agentId, manuscriptId: q.manuscriptId, status: q.status, dateSent: q.dateSent, revisionRound: q.revisionRound, requery: q.requery, bookVersionId: q.bookVersionId, sentPackageId: q.sentPackageId, packageId: q.packageId })) };
  }),
  allCaps: agents.filter((a) => a.name && a.name === a.name.toUpperCase() && /[A-Z]/.test(a.name)).map((a) => ({ id: a.id, name: a.name })),
};
mkdirSync("reports/qc-v149-1", { recursive: true });
writeFileSync("reports/qc-v149-1/census.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify({ counts: out.counts, dupes: out.dupes, allCaps: out.allCaps }, null, 1));
process.exit(0);
