/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent card v2.1's fixtures, beside the harness's own agents:
 *   acv21fx-full   a complete UK agent (Edinburgh): every Profile section drawn, an email and a website (AC21-1's order and
 *                  contact line; AC21-2's edits)
 *   acv21fx-ie     an Irish agent (Dublin) — AC21-1's flag
 *   acv21fx-us     a US agent (New York) — AC21-1's flag
 *   acv21fx-none   an agent with no country and no city — AC21-1's "no flag"
 *   acv21fx-edit   a second complete UK agent the section saves write to (AC21-2's stored-document comparisons)
 *   acv21fx-nameonly  a name and nothing else (the report's screen 19)
 *
 * ⚠️ SELF-CLEANING: every document carries the `acv21fx-` prefix; the locks write them before they measure and `--clean`
 *    removes them in the same run. Through fsTarget, so the emulator by default.
 * `--dump <agentId>` prints the agent as JSON (the comparisons).
 *
 *   node tests/e2e/seedAcv21.mjs            # write them
 *   node tests/e2e/seedAcv21.mjs --clean    # remove them
 *   node tests/e2e/seedAcv21.mjs --dump ID  # read an agent
 */
import { targetEnv, TARGET_PROJECT } from "./fsTarget.mjs";
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, getDocs, deleteDoc, collection, setDoc } from "firebase/firestore";

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
const PREFIX = "acv21fx-";

if (process.argv.includes("--dump")) {
  const id = process.argv[process.argv.indexOf("--dump") + 1];
  const a = await getDoc(doc(db, "users", uid, "agents", id));
  process.stdout.write(JSON.stringify({ agent: a.data() ?? null }, (_k, v) => (v && typeof v === "object" && typeof v.toDate === "function" ? v.toDate().toISOString() : v)));
  process.exit(0);
}
async function wipe() {
  let gone = 0;
  for (const d of (await getDocs(collection(db, "users", uid, "agents"))).docs) {
    if (!d.id.startsWith(PREFIX)) continue;
    await deleteDoc(d.ref); gone++;
  }
  return gone;
}
if (process.argv.includes("--clean")) { console.log(`acv21fx: removed ${await wipe()}`); process.exit(0); }
await wipe();
const iso = (daysAgo) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();
const base = (id, name) => ({
  id, userId: uid, name, agency: "", email: "", website: "", genres: [], notes: "", agentNotes: "", mswlNotes: "",
  twitter: "", bluesky: "", instagram: "", socials: [], setAside: false, importedNeedsReview: false, materialsWanted: [], dateAdded: iso(30),
  submissionStatus: "Unknown", submissionMethod: "", lastCheckedDate: "",
});
const full = (id, name, over = {}) => ({
  ...base(id, name), agency: "Pryce Literary", country: "GB", city: "Edinburgh", email: `${id}@pryce.example`, website: "https://pryce.example",
  genres: ["Thriller", "Crime"], mswlNotes: "Thrillers with a moral knot at the centre.", materialsWanted: ["Query letter", "Synopsis"],
  responseTimeWeeks: 6, noResponseMeansNo: false, submissionMethod: "Email", submissionStatus: "Open", lastCheckedDate: iso(3), ...over,
});
await setDoc(doc(db, "users", uid, "agents", `${PREFIX}full`), full(`${PREFIX}full`, "Fiona Fullcard"));
await setDoc(doc(db, "users", uid, "agents", `${PREFIX}edit`), full(`${PREFIX}edit`, "Eda Editwell"));
await setDoc(doc(db, "users", uid, "agents", `${PREFIX}ie`), { ...base(`${PREFIX}ie`, "Aoife Liffey"), agency: "Liffey Literary", country: "IE", city: "Dublin" });
await setDoc(doc(db, "users", uid, "agents", `${PREFIX}us`), { ...base(`${PREFIX}us`, "Una Hudson"), agency: "Hudson Agency", country: "US", city: "New York" });
await setDoc(doc(db, "users", uid, "agents", `${PREFIX}none`), { ...base(`${PREFIX}none`, "Nora Nowhere"), agency: "Nowhere Books" });
await setDoc(doc(db, "users", uid, "agents", `${PREFIX}nameonly`), { ...base(`${PREFIX}nameonly`, "Nell Nameonly") });
console.log("acv21fx: seeded");
process.exit(0);
