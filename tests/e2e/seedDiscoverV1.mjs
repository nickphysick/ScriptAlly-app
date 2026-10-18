/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ SEED THE DISCOVER v1 FIXTURE ═════════════════════════════════════════════════════════════════
 *
 * One DEDICATED account owned by this script: dv1@scriptally.test (the harness password). The harness writer is on
 * the Free plan, and `addAgent` refuses a Free writer at five agents — so the add-and-undo lock (A3) and every lock
 * that writes (C4's leaves, E2's notify leaf) run here, on a Pro account nothing else signs in as.
 *
 * ⚠️ A CLIENT CANNOT CREATE A COMMUNITY AGENT (admin-only), so the catalogue is dev's own 30. The fixture is built
 *    around them: a Literary Fiction manuscript (nine of them take it), one agent on the list that IS in the
 *    catalogue (Diane Osei — held), one LIVE pass (Patrick Doherty) and one EXPIRED pass (Priya Anand), so the real
 *    page enters both of A2's pass branches. Three agents on the list are not in the catalogue (the share candidates).
 * ⚠️ WIPE, THEN WRITE: every collection the page reads is emptied and rewritten whole. Nothing else signs in here.
 * ⚠️ IT NEVER WRITES `communityAgents` OR `agentSubmissions` — the first is admin-only, the second cannot be removed
 *    by a client, so a lock that wrote one would leave it in the admin's queue for ever.
 * ⚠️ DEV ONLY — refuses anything but scriptally-dev.
 *
 * USAGE
 *   node tests/e2e/seedDiscoverV1.mjs           wipe and write
 *   node tests/e2e/seedDiscoverV1.mjs --dump    print the account's Discover state as canonical JSON (A3, C4, E2)
 *   node tests/e2e/seedDiscoverV1.mjs --clean   wipe and leave the account empty
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, updateDoc, deleteDoc, getDocs, getDoc, collection } from "firebase/firestore";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("Refusing — scriptally-dev only.");
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");

export const DV1_EMAIL = "dv1@scriptally.test";
export const DV1_NAME = "Wren Ashdown";
export const DV1_MS = "dv1-ms";
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID });
const auth = getAuth(app);
let uid;
try { ({ user: { uid } } = await createUserWithEmailAndPassword(auth, DV1_EMAIL, PASSWORD)); console.log(`created ${DV1_EMAIL}`); }
catch (e) { if (e?.code !== "auth/email-already-in-use") throw e; ({ user: { uid } } = await signInWithEmailAndPassword(auth, DV1_EMAIL, PASSWORD)); }
const db = getFirestore(app);
const args = process.argv.slice(2);

const WIPE = ["agents", "activities", "manuscripts", "queries", "scoutDecisions", "scoutShares", "tasks", "taskFlags"];
const day = 86_400_000;
const iso = (ms) => new Date(ms).toISOString();

async function dump() {
  const out = {};
  for (const c of ["agents", "activities", "scoutDecisions", "scoutShares", "taskFlags", "tasks"]) {
    const snap = await getDocs(collection(db, "users", uid, c));
    out[c] = Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]).sort(([a], [b]) => a.localeCompare(b)));
  }
  const u = (await getDoc(doc(db, "users", uid))).data() ?? {};
  out.discoverPrefs = u.discoverPrefs ?? null;
  out.notifyPrefs = u.notifyPrefs ?? null;
  const ca = await getDocs(collection(db, "communityAgents"));
  out.contributedByCount = Object.fromEntries(ca.docs.map((d) => [d.id, d.data().contributedByCount ?? 0]).sort(([a], [b]) => a.localeCompare(b)));
  if (args.includes("--with-catalogue")) out.catalogue = ca.docs.map((d) => d.data());
  const msd = await getDoc(doc(db, "users", uid, "manuscripts", DV1_MS));
  if (args.includes("--with-catalogue")) out.manuscript = msd.data() ?? null;
  const sort = (v) => (Array.isArray(v) ? v.map(sort) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sort(v[k])])) : v);
  console.log(JSON.stringify(sort(out)));
}

if (args.includes("--dump")) { await dump(); process.exit(0); }

let n = 0;
for (const c of WIPE) for (const d of (await getDocs(collection(db, "users", uid, c))).docs) { await deleteDoc(d.ref); n += 1; }
console.log(`wiped ${n} document(s)`);
if (args.includes("--clean")) process.exit(0);

/* a client may not change its own plan, so the user doc is recreated with Pro */
await deleteDoc(doc(db, "users", uid));
await setDoc(doc(db, "users", uid), {
  id: uid, name: DV1_NAME, email: DV1_EMAIL, plan: "Pro", trialStartDate: "2026-02-01T09:00:00.000Z", subscriptionStatus: "active", onboardingComplete: true,
});
await updateDoc(doc(db, "users", uid), {
  tourCompletedAt: "2026-02-01T09:05:00.000Z",
  /* a key the reader does not know, so a whole-map write (which drops it) can be told from a leaf write (C4) */
  discoverPrefs: { lens: "best", openOnly: true, notOnList: true, ukIreland: false, keptByLeafWrites: "yes" },
  /* E2: toggling the Discover leaf must leave these two as they are */
  notifyPrefs: { nudges: false, weeklyDigest: true },
});

const NOW = Date.now();
await setDoc(doc(db, "users", uid, "manuscripts", DV1_MS), {
  id: DV1_MS, userId: uid, title: "The Harbour Clock", genre: "Literary Fiction", ageCategory: "Adult", wordCount: 84000,
  logline: "A widowed clock-mender in a coastal town finds her late husband's letters inside the harbour clock, and with them a family she never knew.",
  comps: [], status: "Querying", statusChangedDate: iso(NOW - 40 * day),
});
const agent = (id, name, agency, extra = {}) => setDoc(doc(db, "users", uid, "agents", id), {
  id, userId: uid, name, agency, email: "", website: "", genres: ["Literary Fiction"], mswlNotes: "", starRating: 3,
  submissionStatus: "Open", responseTimeWeeks: 8, noResponseMeansNo: false, submissionMethod: "Email", materialsWanted: ["Query Letter"],
  dateAdded: iso(NOW - 60 * day), lastCheckedDate: iso(NOW - 60 * day), notes: "", ...extra,
});
/* in the catalogue already (ca-diane-osei) — held, and "in the catalogue" in Your part */
const ca = (await getDoc(doc(db, "communityAgents", "ca-diane-osei"))).data();
await agent("dv1-held", ca.name, ca.agency);
/* not in the catalogue — the share candidates; one carries a private note that a share must never send */
await agent("dv1-mine-a", "Imogen Tarrant", "Tarrant & Low", { website: "tarrantlow.co.uk", mswlNotes: "Quiet literary fiction about place.", notes: "Met at a festival in May — private.", starRating: 5 });
await agent("dv1-mine-b", "Felix Ormerod", "Ormerod Literary", { genres: ["Crime"] });
await agent("dv1-mine-c", "Hana Kowal", "Kowal Associates", { genres: ["Book Club Fiction"] });

/* one live pass, one expired */
await setDoc(doc(db, "users", uid, "scoutDecisions", "ca-patrick-doherty"), { decision: "passed", at: iso(NOW - 20 * day), manuscriptId: DV1_MS, until: iso(NOW + 345 * day) });
await setDoc(doc(db, "users", uid, "scoutDecisions", "ca-priya-anand"), { decision: "passed", at: iso(NOW - 400 * day), manuscriptId: DV1_MS, until: iso(NOW - 35 * day) });
console.log(`seeded ${DV1_EMAIL} (${uid})`);
process.exit(0);
