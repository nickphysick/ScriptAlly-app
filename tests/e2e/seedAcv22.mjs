/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent card v2.2 — the cards the AC1–AC14 locks read:
 *   acv22fx-ada   Ada Quill, a complete UK agent (Edinburgh) with a query (Queried, then a full asked for in Ada's
 *                 words, so History and the agent's words are drawn), her old notes string (a note on Notes), every
 *                 Profile section filled, and the Online form method (the submission link shows in "More contact details")
 *   acv22fx-nell  Nell Post, complete but with no email and no website (AC10: "+ Add email", "+ Add a website")
 *   acv22fx-wren  Wren Lark, a second complete UK agent the head's saves write to (AC8 reads each field back), with a
 *                 wishlist page link so "More contact details" opens by itself
 * ⚠️ SELF-CLEANING: every document carries the `acv22fx-` prefix; `--clean` removes them (each query's log first), and
 *    the agents AC14's add journey made ("Acv22 Preview …"). Through fsTarget, so the emulator by default.
 *
 *   node tests/e2e/seedAcv22.mjs            # write them
 *   node tests/e2e/seedAcv22.mjs --clean    # remove them
 *   node tests/e2e/seedAcv22.mjs --dump ID  # print an agent as JSON
 */
import { targetEnv, TARGET_PROJECT } from "./fsTarget.mjs";
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, getDocs, deleteDoc, collection, writeBatch } from "firebase/firestore";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = targetEnv();
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== TARGET_PROJECT) throw new Error("emulator only");
const PASSWORD = process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD;
if (!PASSWORD) throw new Error("No SA_E2E_PASSWORD in .env.local");
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID });
const db = getFirestore(app);
const { user } = await signInWithEmailAndPassword(getAuth(app), process.env.SA_E2E_EMAIL ?? "harness@scriptally.test", PASSWORD);
const uid = user.uid;
const PREFIX = "acv22fx-";
const DAY = 86_400_000;
const NOW = Date.now();
const iso = (daysAgo) => new Date(NOW - daysAgo * DAY).toISOString();

async function wipe() {
  let gone = 0;
  for (const d of (await getDocs(collection(db, "users", uid, "queries"))).docs) {
    if (!d.id.startsWith(PREFIX)) continue;
    for (const a of (await getDocs(collection(db, "users", uid, "queries", d.id, "activity"))).docs) { await deleteDoc(a.ref); gone++; }
  }
  for (const coll of ["queries", "agents", "taskFlags", "activities", "tasks", "journalEntries"]) {
    for (const d of (await getDocs(collection(db, "users", uid, coll))).docs) {
      const x = d.data();
      const preview = coll === "agents" && String(x.name ?? "").startsWith("Acv22 Preview");
      if (preview || d.id.startsWith(PREFIX) || String(x.queryId ?? "").startsWith(PREFIX) || String(x.agentId ?? "").startsWith(PREFIX)) {
        if (coll === "agents") for (const n of (await getDocs(collection(db, "users", uid, "agents", d.id, "notes"))).docs) { await deleteDoc(n.ref); gone++; }
        await deleteDoc(d.ref); gone++;
      }
    }
  }
  return gone;
}
if (process.argv.includes("--clean")) { console.log(`acv22: removed ${await wipe()}`); process.exit(0); }
const di = process.argv.indexOf("--dump");
if (di > 0) {
  const a = (await getDoc(doc(db, "users", uid, "agents", process.argv[di + 1]))).data() ?? null;
  console.log(JSON.stringify({ agent: a }));
  process.exit(0);
}
await wipe();

const full = (id, name, over = {}) => ({
  id, userId: uid, name, agency: "Lark & Field", country: "GB", city: "Edinburgh", email: `${id}@lark.example`, website: "https://lark.example",
  genres: ["Thriller", "Crime"], notes: "", agentNotes: "", mswlNotes: "Thrillers with a moral knot at the centre.", twitter: "", bluesky: "", instagram: "",
  socials: [], setAside: false, importedNeedsReview: false, materialsWanted: ["Query letter", "Synopsis"], dateAdded: iso(40),
  responseTimeWeeks: 6, noResponseMeansNo: false, submissionMethod: "Email", submissionStatus: "Open", lastCheckedDate: iso(3), starRating: 3, ...over,
});
const b = writeBatch(db);
const ADA = `${PREFIX}ada`, WREN = `${PREFIX}wren`, Q = `${PREFIX}q-ada`;
b.set(doc(db, "users", uid, "agents", ADA), full(ADA, "Ada Quill", { notes: "Met Ada at the Bath festival. Ada liked the opening line.", submissionMethod: "Online Form" }));
b.set(doc(db, "users", uid, "agents", `${PREFIX}nell`), full(`${PREFIX}nell`, "Nell Post", { email: "", website: "" }));
b.set(doc(db, "users", uid, "agents", WREN), full(WREN, "Wren Lark", { submissionMethod: "Online Form", socials: [{ platform: "MSWL", handle: "https://www.manuscriptwishlist.com/mswl-post/wren-lark/" }] }));
b.set(doc(db, "users", uid, "queries", Q), { id: Q, userId: uid, agentId: ADA, manuscriptId: "seed-ms-1", dateSent: iso(30), status: "Full Requested", sendMethod: "Email",
  personalisationNotes: "ACV22 fixture", packageId: "", materialsWanted: [], lastStatusChange: iso(12) });
for (const [sk, res, type, ago, words] of [["sent", "Queried", "Query Sent", 30, null], ["freq", "Full Requested", "Status Changed", 12, "Loved the voice. Please send the full."]]) {
  const act = `${Q}-${sk}`;
  b.set(doc(db, "users", uid, "activities", act), { id: act, userId: uid, queryId: Q, manuscriptId: "seed-ms-1", activityType: type, description: `${res} · Ada Quill`, date: iso(ago), details: "", resultingStatus: res });
  b.set(doc(db, "users", uid, "queries", Q, "activity", act), { type: res, resultingStatus: res, createdAt: new Date(iso(ago)), note: `${res} · Ada Quill`, queryId: Q, agentName: "Ada Quill", manuscriptTitle: "seed",
    ...(sk === "sent" ? { materials: [{ kind: "letter" }, { kind: "synopsis" }] } : {}), ...(words ? { replyNote: words } : {}) });
}
await b.commit().catch((e) => { console.error(`acv22: refused: ${e.code}`); throw e; });
console.log("acv22: seeded");
process.exit(0);
