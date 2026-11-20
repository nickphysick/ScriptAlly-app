/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent card v2's fixtures, beside the harness's own agents:
 *   acv2fx-nameonly  a name and nothing else (no agency, no contact, no facts): AC2-1's short card, AC2-3's empty profile
 *   acv2fx-notes     an agent whose old `notes` string stands, with twelve dated notes under it (AC2-5)
 *   acv2fx-task      a To-do task for today linked to Nora Notekeeper (the report's To-do door: its preview opens the card)
 *   acv2fx-s1…s3     three more steps on Clara Beaumont's query's own log (the harness's logs hold one step each), so
 *                    AC2-4 compares a four-step thread: partial requested, partial sent, full requested
 *
 * ⚠️ SELF-CLEANING: every document carries the `acv2fx-` prefix; the locks write them before they measure and `--clean`
 *    removes them in the same run. Through fsTarget, so the emulator by default.
 * `--dump <agentId>` prints the agent and its queries as JSON (AC2-6's Undo comparison).
 *
 *   node tests/e2e/seedAcv2.mjs            # write them
 *   node tests/e2e/seedAcv2.mjs --clean    # remove them
 *   node tests/e2e/seedAcv2.mjs --dump ID  # read an agent and its queries
 */
import { targetEnv, TARGET_PROJECT } from "./fsTarget.mjs";
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, getDocs, deleteDoc, collection, setDoc, query, where, Timestamp } from "firebase/firestore";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = targetEnv();
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== TARGET_PROJECT) throw new Error("Refusing: not the target project");
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID });
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", PASSWORD);
const uid = user.uid;
const PREFIX = "acv2fx-";

if (process.argv.includes("--dump")) {
  const id = process.argv[process.argv.indexOf("--dump") + 1];
  const a = await getDoc(doc(db, "users", uid, "agents", id));
  const qs = await getDocs(query(collection(db, "users", uid, "queries"), where("agentId", "==", id)));
  const out = { agent: a.data() ?? null, queries: Object.fromEntries(qs.docs.map((d) => [d.id, d.data()]).sort((x, y) => String(x[0]).localeCompare(String(y[0])))) };
  process.stdout.write(JSON.stringify(out, (_k, v) => (v && typeof v === "object" && typeof v.toDate === "function" ? v.toDate().toISOString() : v)));
  process.exit(0);
}

async function claraQuery() {
  const ag = (await getDocs(collection(db, "users", uid, "agents"))).docs.find((d) => d.data().name === "Clara Beaumont");
  if (!ag) return null;
  const qs = await getDocs(query(collection(db, "users", uid, "queries"), where("agentId", "==", ag.id)));
  return qs.docs[0]?.id ?? null;
}
async function wipe() {
  let gone = 0;
  for (const t of (await getDocs(collection(db, "users", uid, "tasks"))).docs) if (t.id.startsWith(PREFIX)) { await deleteDoc(t.ref); gone++; }
  const cq = await claraQuery();
  if (cq) for (const a of (await getDocs(collection(db, "users", uid, "queries", cq, "activity"))).docs) if (a.id.startsWith(PREFIX)) { await deleteDoc(a.ref); gone++; }
  for (const d of (await getDocs(collection(db, "users", uid, "agents"))).docs) {
    if (!d.id.startsWith(PREFIX)) continue;
    for (const n of (await getDocs(collection(db, "users", uid, "agents", d.id, "notes"))).docs) { await deleteDoc(n.ref); gone++; }
    await deleteDoc(d.ref); gone++;
  }
  return gone;
}
if (process.argv.includes("--clean")) { console.log(`acv2fx: removed ${await wipe()}`); process.exit(0); }
await wipe();
const iso = (daysAgo) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();
const base = (id, name) => ({
  id, userId: uid, name, agency: "", email: "", website: "", genres: [], notes: "", agentNotes: "", mswlNotes: "",
  twitter: "", bluesky: "", instagram: "", socials: [], setAside: false, importedNeedsReview: false, materialsWanted: [], dateAdded: iso(30),
  submissionStatus: "Unknown", submissionMethod: "", lastCheckedDate: "",
});
await setDoc(doc(db, "users", uid, "agents", `${PREFIX}nameonly`), { ...base(`${PREFIX}nameonly`, "Nell Nameonly") });
const OLD_NOTES = "Met Nora at the York festival.\nLikes dark comedy, hates prologues.";
await setDoc(doc(db, "users", uid, "agents", `${PREFIX}notes`), { ...base(`${PREFIX}notes`, "Nora Notekeeper"), agency: "Margin Literary", city: "York", notes: OLD_NOTES });
for (let i = 1; i <= 12; i++) {
  await setDoc(doc(db, "users", uid, "agents", `${PREFIX}notes`, "notes", `${PREFIX}n${String(i).padStart(2, "0")}`),
    { text: `Note ${i}: something worth remembering about Nora before the next query, written on day ${i}.`, createdAt: iso(20 - i) });
}
{
  const d = new Date(), today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const now = new Date().toISOString();
  await setDoc(doc(db, "users", uid, "tasks", `${PREFIX}task`), { id: `${PREFIX}task`, userId: uid, text: "Ask Nora about the York anthology", done: false, createdAt: now, updatedAt: now, agentId: `${PREFIX}notes`, dueDate: today });
}
/* three more steps on Clara's query, after its first (the same shape as the step already there) */
const cq = await claraQuery();
if (cq) {
  const logs = (await getDocs(collection(db, "users", uid, "queries", cq, "activity"))).docs;
  const first = logs[0]?.data() ?? {};
  const t0 = typeof first.createdAt?.toMillis === "function" ? first.createdAt.toMillis() : Date.parse(first.createdAt ?? "") || Date.now() - 60 * 86_400_000;
  const at = (days) => (typeof first.createdAt === "string" ? new Date(t0 + days * 86_400_000).toISOString() : Timestamp.fromMillis(t0 + days * 86_400_000));
  const steps = [["Partial Requested", 6], ["Partial Sent", 9], ["Full Requested", 20]];
  for (const [i, [st, d]] of steps.entries()) {
    await setDoc(doc(db, "users", uid, "queries", cq, "activity", `${PREFIX}s${i + 1}`), { type: st, resultingStatus: st, createdAt: at(d), queryId: cq, note: "", ...(st === "Full Requested" ? { replyNote: "acv2fx · Loved the voice. Send me the rest." } : {}) });
  }
}
console.log("acv2fx: seeded");
process.exit(0);
