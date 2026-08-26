/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * REPAIR — the closes the journey round's Phase 8 measurement committed and did not undo.
 *
 * ⚠️ WHAT WENT WRONG, so the next person recognises it. An early Phase 8 case read the To-do board
 * with `page.goto` BETWEEN committing a close and pressing Undo. The toast IS the receipt and the
 * Undo lives on it, so navigating destroyed it: the press found no button and the write stood.
 * Four runs committed a close; three were never undone.
 *
 * ⚠️ EVERY DELETION IS PROVED BEFORE IT HAPPENS, three ways, and the script REFUSES if any proof
 * fails rather than deleting on trust:
 *   1. the document id is APP-GENERATED (`act-` + a random suffix). Seeded activity carries
 *      deterministic ids — `seed-act-…`, `thin-act-…`, `act-status-no-response-seed-query-18` —
 *      so the shape alone separates a run's writes from a fixture's.
 *   2. it is dated 2026-08-26, inside the run window (11:17–11:50).
 *   3. it carries `resultingStatus: "No Response"` and names the agent the run's own receipt named.
 *
 * ⚠️ AND BOTH STORES ARE CLEARED. An entry is a projection in the global `activities` feed AND a
 * document in the query's own `activity` subcollection; `recomputeQuery` reads only the second.
 * Deleting one leaves the timeline and the derived status disagreeing — which is exactly the state
 * the fourth run left behind (see `thin-q-close` below).
 *
 * ⚠️ THE RESTORED STATUS IS THE APP'S OWN ANSWER, NOT A GUESS. With the subcollection emptied,
 * `deriveStatus([])` returns `QueryStatus.QUERIED` — so that is what `recomputeQuery` would write,
 * and it is what this writes. `lastStatusChange` is removed ONLY where the run created it.
 *
 *   node tests/e2e/repairHarnessCloses.mjs           # dry run — prints, changes nothing
 *   node tests/e2e/repairHarnessCloses.mjs --apply   # perform it
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, getDocs, collection, deleteDoc, updateDoc, deleteField } from "firebase/firestore";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(".env.development");
const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("dev only");

const APPLY = process.argv.includes("--apply");
const app = initializeApp({
  apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: dev.VITE_FIREBASE_PROJECT_ID, storageBucket: dev.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: dev.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: dev.VITE_FIREBASE_APP_ID,
});
const cred = await signInWithEmailAndPassword(getAuth(app),
  process.env.SA_E2E_EMAIL ?? "harness@scriptally.test",
  process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD);
const db = getFirestore(app);
const uid = cred.user.uid;

/** the run window: the four Phase 8 commits, 11:17 to 11:50 on 26 Aug */
const RUN_DAY = "2026-08-26";
const APP_GENERATED = /^act-[a-z0-9]{8,}$/;

/**
 * ⚠️ THE QUERY THAT IS NOT HERE IS THE POINT. `seed-query-18` (Sam Okoro) is also "No Response" and
 * is GENUINE: `seed.mjs`'s own STATUSES list seeds index 17 as "No Response", its subcollection doc
 * carries the deterministic id `act-status-no-response-seed-query-18`, and it has no global-feed
 * entry at all. Three signals, all saying fixture rather than run. It is not touched.
 */
const PLAN = [
  /* ⚠️ THE DRY RUN CHANGED THIS PLAN, WHICH IS WHY IT EXISTS. These two were going to have their
     status restored to Queried. Their SUBCOLLECTION closes are dated 2026-08-21 — five days before
     this session began — so they are not this run's, and `deriveStatus` over the log they still
     hold correctly yields "No Response". Forcing Queried would have made the query contradict its
     own timeline: the exact disagreement this repair exists to remove, introduced by the repair.
     Only the DUPLICATE global-feed projection this run wrote today is removed. */
  { q: "seed-query-1",     who: "Elinor Hale",   restore: "none" },
  { q: "seed-query-4",     who: "Priya Nair",    restore: "none" },
  /* both stores dated today, both app-generated: the one query this run genuinely left closed */
  { q: "seed-query-ms2-a", who: "Elinor Hale",   restore: "status+lastStatusChange" },
  /* ⚠️ THE FOURTH RUN'S UNDO WAS PARTIAL, WHICH IS A FINDING RATHER THAN RESIDUE. It removed the
     SUBCOLLECTION doc — so the status correctly re-derived to Queried — and left the GLOBAL feed
     projection behind. The query therefore reads Queried while its timeline still shows a close.
     Only the orphan is removed here; the status is already right. */
  { q: "thin-q-close",     who: "Rosalind Vale", restore: "none" },
];

const feed = (await getDocs(collection(db, "users", uid, "activities"))).docs
  .map((d) => ({ id: d.id, ...d.data() }));

let removed = 0, refused = 0;
for (const p of PLAN) {
  const qs = await getDoc(doc(db, "users", uid, "queries", p.q));
  const before = qs.exists() ? qs.data() : null;
  console.log("\n══ " + p.q + " · " + p.who + "  status=" + (before?.status ?? "?"));

  const targets = [];
  for (const f of feed.filter((a) => a.queryId === p.q))
    targets.push({ store: "activities", id: f.id, data: f, path: ["users", uid, "activities", f.id] });
  const sub = (await getDocs(collection(db, "users", uid, "queries", p.q, "activity"))).docs;
  for (const d of sub)
    targets.push({ store: "queries/" + p.q + "/activity", id: d.id, data: d.data(),
                   path: ["users", uid, "queries", p.q, "activity", d.id] });

  for (const t of targets) {
    const d = t.data;
    const status = d.resultingStatus ?? d.type;
    const stamp = d.date ?? (d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : String(d.createdAt ?? ""));
    const appGen = APP_GENERATED.test(t.id);
    const today = String(stamp).startsWith(RUN_DAY);
    const isClose = status === "No Response";
    const proved = appGen && today && isClose;
    if (!proved) {
      console.log("   KEEP   " + t.store.padEnd(34) + t.id
        + "  [" + status + " · " + String(stamp).slice(0, 19) + "]"
        + "  (app-generated=" + appGen + " today=" + today + " close=" + isClose + ")");
      continue;
    }
    console.log("   DELETE " + t.store.padEnd(34) + t.id + "  [" + status + " · " + String(stamp).slice(0, 19) + "]");
    if (APPLY) { await deleteDoc(doc(db, ...t.path)); removed++; }
  }

  if (p.restore !== "none" && APPLY) {
    /* deriveStatus([]) === QueryStatus.QUERIED — the app's own answer for an empty log */
    const patch = { status: "Queried" };
    if (p.restore.includes("lastStatusChange")) patch.lastStatusChange = deleteField();
    await updateDoc(doc(db, "users", uid, "queries", p.q), patch);
    console.log("   RESTORE status=Queried"
      + (p.restore.includes("lastStatusChange") ? " · lastStatusChange removed (the run wrote it)" : ""));
  } else if (p.restore !== "none") {
    console.log("   RESTORE status=Queried"
      + (p.restore.includes("lastStatusChange") ? " · lastStatusChange would be removed" : "")
      + "   (dry run)");
  }
}
console.log("\n" + (APPLY ? "APPLIED · " + removed + " documents deleted" : "DRY RUN — nothing changed. Re-run with --apply"));
process.exit(0);
