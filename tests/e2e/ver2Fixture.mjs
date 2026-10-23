/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE VERSIONS-v2 FIXTURE — two books on the ms21-filled harness account, every document `ver2-` prefixed ══════════
 *
 *   npx tsx tests/e2e/ver2Fixture.mjs --seed     delete every ver2- document, then write them all (each VER2 run starts here)
 *   npx tsx tests/e2e/ver2Fixture.mjs --facts    what the page should show, worked out HERE from the raw documents
 *   npx tsx tests/e2e/ver2Fixture.mjs --ms <id>  one manuscript document, keys sorted (Undo's byte-for-byte check)
 *   npx tsx tests/e2e/ver2Fixture.mjs --q        every ver2 query's stored bookVersionId, keys sorted
 *   npx tsx tests/e2e/ver2Fixture.mjs --guide-reset   forget the account's Versions guide (seen, hidden, ticks)
 *
 * ⚠️ IT OWNS ONLY ver2- DOCUMENTS. The account is shared with the Manuscripts suites, whose seeder wipes it whole —
 *    which is why every VER2 run seeds first rather than trusting what it finds.
 * ⚠️ NAMES ARE INVENTED (house rule): the mock's sample title, author and agents are not used.
 *
 * WHAT EACH PIECE IS FOR
 *   · Original, 7 queries sent before it was saved ......... D4.3 (counted by date), the root card, the donut's navy
 *   · Fast-paced opening, in use, 6 sent (+1 withdrawn) .... S02's navy pinned card, S11's funnel, Leading (≥5), D6
 *   · Dual timeline, 3 sent ................................ S14 "too early to tell", the league's "–"
 *   · Tighter first chapter, unsent, in an unsent package .. S05's delete confirm (a child, a package line)
 *   · Premise up front, unsent, from Tighter ................ the child that moves to Fast-paced opening on delete
 *   · 2 queries with no version ............................ the banner, the striped slice, S17/S18
 *   · a second book, 4 queries, no versions ................ S26 and the first save (S27)
 */
import { readFileSync, existsSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, getDocs, deleteDoc, updateDoc, deleteField, collection, Timestamp } from "firebase/firestore";
import { FILLED_EMAIL } from "./ms21Fixture.mjs";

const env = (f) => Object.fromEntries(readFileSync(f, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const dev = env(".env.development"); const local = existsSync(".env.local") ? env(".env.local") : {};
if (dev.VITE_FIREBASE_PROJECT_ID !== "scriptally-dev") throw new Error("Refusing: not dev.");
const app = initializeApp({ apiKey: dev.VITE_FIREBASE_API_KEY, authDomain: dev.VITE_FIREBASE_AUTH_DOMAIN, projectId: dev.VITE_FIREBASE_PROJECT_ID, appId: dev.VITE_FIREBASE_APP_ID });
const dbId = dev.VITE_FIREBASE_DATABASE_ID;
const db = !dbId || dbId === "(default)" ? getFirestore(app) : getFirestore(app, dbId);
const { user } = await signInWithEmailAndPassword(getAuth(app), FILLED_EMAIL, process.env.SA_E2E_PASSWORD ?? local.SA_E2E_PASSWORD);
const uid = user.uid;
const sortKeys = (o) => Array.isArray(o) ? o.map(sortKeys) : o && typeof o === "object" && !(o instanceof Timestamp) ? Object.fromEntries(Object.keys(o).sort().map((k) => [k, sortKeys(o[k])])) : o;
const noon = (day) => `${day}T12:00:00.000Z`;

export const MS = "ver2-ms", PRE = "ver2-pre", MANY = "ver2-many", FRESH = "ver2-fresh";
/* fifteen versions and the original — the ref's own tree shape (S22–S25): [num, name, parent, changes, saved, sent, asked] */
const MANY_T = [[0, "Original", null, [], "2026-03-03", 7, 1], [1, "Fast-paced opening", 0, ["Cut the prologue", "Opens on the ferry at dawn"], "2026-09-02", 5, 2], [2, "Tighter first chapter", 1, ["Trimmed chapter one", "The ferry is moving by the end of page one"], "2026-10-14", 4, 1], [3, "Dual timeline", 0, ["Alternates 1994 and the present from page one", "Cut the ferry crossing"], "2026-07-28", 3, 0], [4, "Premise up front", 1, ["Stated the premise on page 3", "Toned down the language"], "2026-09-20", 4, 1], [5, "Ferry cold open", 2, ["Opens mid-argument on the ferry"], "2026-10-02", 3, 1], [6, "No ferry at all", 3, ["Cut the ferry entirely", "Opens in the hospital"], "2026-08-06", 2, 0], [7, "Murphy narrates", 2, ["First person, the skipper", "Cut the aunt's chapter"], "2026-10-05", 4, 2], [8, "Present tense", 7, ["Switched to present tense"], "2026-10-09", 3, 1], [9, "Shorter first page", 5, ["Cut the first page to 250 words"], "2026-10-08", 2, 0], [10, "Prologue back in", 4, ["Put the prologue back", "Kept the premise on page 3"], "2026-09-25", 3, 0], [11, "Hint at the ending", 9, ["Foreshadowed the ending on page 2"], "2026-10-12", 1, 0], [12, "Tighter dialogue", 8, ["Cut dialogue tags", "Shorter opening scene"], "2026-10-14", 2, 1], [13, "Opens at the funeral", 6, ["Opens at the funeral", "Moved the hospital to chapter 3"], "2026-08-15", 2, 0], [14, "New first line", 12, ["New first line"], "2026-10-18", 0, 0], [15, "Quieter opening", 10, ["Slower first chapter", "Removed the chase"], "2026-10-01", 1, 0]];
const BV = [
  { id: "ver2-bv-0", name: "Original", kind: "initial", createdDate: "2026-03-03", num: 0, original: true },
  { id: "ver2-bv-1", name: "Fast-paced opening", kind: "revision", createdDate: "2026-04-02", num: 1, parentId: "ver2-bv-0", changes: ["Cut the prologue", "Opens on the ferry at dawn"], wordCount: 82400 },
  { id: "ver2-bv-2", name: "Dual timeline", kind: "revision", createdDate: "2026-05-20", num: 2, parentId: "ver2-bv-0", changes: ["Alternates 1994 and the present from page one", "Cut the ferry crossing"], wordCount: 86300 },
  { id: "ver2-bv-3", name: "Tighter first chapter", kind: "revision", createdDate: "2026-09-14", num: 3, parentId: "ver2-bv-1", changes: ["Trimmed chapter one", "The ferry is moving by the end of page one"], wordCount: 81200 },
  { id: "ver2-bv-4", name: "Premise up front", kind: "revision", createdDate: "2026-10-20", num: 4, parentId: "ver2-bv-3", changes: ["Stated the premise on page 3", "Toned down the language", "New comp titles in the letter"] },
];
const NAMES = [["Odette Varga", "Varga Literary"], ["Fenwick Hale", "Hale & Moss"], ["Priya Lund", "Lund Associates"], ["Tobias Wren", "Wren House"], ["Saoirse Dunne", "Dunne Agency"],
  ["Malcolm Ives", "Ives Literary"], ["Beatrix Oyelaran", "Oyelaran & Co"], ["Cormac Bell", "Bell Books"], ["Ines Halloran", "Halloran Lit"], ["Rufus Kemble", "Kemble Agency"],
  ["Leonie Marsh", "Marsh & Pryce"], ["Hugo Tennant", "Tennant Literary"], ["Ada Fairlie", "Fairlie Agency"], ["Jonah Quill", "Quill & Co"], ["Marta Reyes", "Reyes Literary"],
  ["Silas Penrose", "Penrose House"], ["Nell Ashdown", "Ashdown Books"], ["Rory Calder", "Calder Lit"], ["Esme Thorne", "Thorne & Vale"], ["Dev Anand", "Anand Agency"],
  ["Greta Holm", "Holm Literary"], ["Ivor Blake", "Blake House"]];
/* q: [agentIndex, book, version stamp | null, sentDay, steps: [status, day][], final status] */
const Q = [
  /* Original — sent before it was saved: no stamp, counted by date (D4.3). 1 of 7 asked for more. */
  [0, MS, null, "2026-01-12", [["Rejected", "2026-02-02"]], "Rejected"],
  [1, MS, null, "2026-01-19", [], "No Response"],
  [2, MS, null, "2026-01-26", [["Partial Requested", "2026-02-28"]], "Partial Requested"],
  [3, MS, null, "2026-02-02", [["Rejected", "2026-02-20"]], "Rejected"],
  [4, MS, null, "2026-02-09", [["Rejected", "2026-03-21"]], "Rejected"],
  [5, MS, null, "2026-02-16", [], "Queried"],
  [6, MS, null, "2026-02-23", [], "No Response"],
  /* Fast-paced opening, in use — stamped. 3 of 6 asked for more (one later passed); one withdrawn, listed not counted. */
  [7, MS, "ver2-bv-1", "2026-04-08", [["Full Requested", "2026-04-17"]], "Full Requested"],
  [8, MS, "ver2-bv-1", "2026-04-15", [["Partial Requested", "2026-04-29"]], "Partial Requested"],
  [9, MS, "ver2-bv-1", "2026-04-22", [], "Queried"],
  [10, MS, "ver2-bv-1", "2026-04-29", [["Rejected", "2026-05-05"]], "Rejected"],
  [11, MS, "ver2-bv-1", "2026-05-06", [], "Queried"],
  [12, MS, "ver2-bv-1", "2026-05-13", [["Partial Requested", "2026-05-27"], ["Rejected", "2026-07-01"]], "Rejected"],
  [13, MS, "ver2-bv-1", "2026-05-20", [["Withdrawn", "2026-06-01"]], "Withdrawn"],
  /* Dual timeline — stamped. 3 sent: too early. */
  [14, MS, "ver2-bv-2", "2026-06-01", [["Rejected", "2026-06-13"]], "Rejected"],
  [15, MS, "ver2-bv-2", "2026-06-06", [], "Queried"],
  [16, MS, "ver2-bv-2", "2026-06-11", [["Rejected", "2026-07-01"]], "Rejected"],
  /* No version: after Original, no package, no stamp. */
  [17, MS, null, "2026-04-10", [], "Queried"],
  [18, MS, null, "2026-09-20", [], "Queried"],
  /* The second book: queries, no versions. */
  [19, PRE, null, "2026-05-14", [["Partial Requested", "2026-06-02"]], "Partial Requested"],
  [20, PRE, null, "2026-06-02", [["Rejected", "2026-06-20"]], "Rejected"],
  [21, PRE, null, "2026-07-01", [], "Queried"],
  [0, PRE, null, "2026-08-19", [], "Queried"],
];
const TYPE = { "Queried": "Query Sent", "Partial Requested": "Status Changed", "Full Requested": "Status Changed", "Rejected": "Status Changed", "Withdrawn": "Status Changed", "No Response": "Status Changed" };
const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, "-");

async function wipe() {
  let n = 0;
  for (const c of ["activities", "agents", "manuscripts", "versions", "packages", "queries"]) {
    for (const d of (await getDocs(collection(db, "users", uid, c))).docs) {
      if (!d.id.startsWith("ver2-")) continue;
      if (c === "queries") for (const a of (await getDocs(collection(db, "users", uid, "queries", d.id, "activity"))).docs) await deleteDoc(a.ref);
      await deleteDoc(d.ref); n++;
    }
  }
  return n;
}

async function seed() {
  const n = await wipe();
  const put = (path, data) => setDoc(doc(db, "users", uid, ...path), data).catch((e) => { console.error(`DENIED writing ${path.join("/")}: ${e.code}`); throw e; });
  await put(["manuscripts", MS], { id: MS, userId: uid, title: "Tide Tables", genre: "Thriller", ageCategory: "Adult", wordCount: 84100, logline: "A ferry skipper has one day to find his brother before the tide turns.", comps: [], status: "Querying", statusChangedDate: noon("2026-01-12"), bookVersions: BV, inUseBookVersionId: "ver2-bv-1", bookVersionSeq: 4 });
  await put(["manuscripts", PRE], { id: PRE, userId: uid, title: "North Light", genre: "Literary Fiction", ageCategory: "Adult", wordCount: 90000, logline: "A lighthouse keeper keeps other people's letters.", comps: [], status: "Querying", statusChangedDate: noon("2026-05-14") });
  for (let i = 0; i < NAMES.length; i++) {
    await put(["agents", `ver2-ag-${i}`], { id: `ver2-ag-${i}`, userId: uid, name: NAMES[i][0], agency: NAMES[i][1], email: "", website: "", genres: ["Thriller"], mswlNotes: "", submissionStatus: "Open", responseTimeWeeks: 8, submissionMethod: "Email", materialsWanted: ["Query Letter"], dateAdded: noon("2026-01-02"), lastCheckedDate: noon("2026-01-02"), notes: "" });
  }
  await put(["versions", "ver2-letter-1"], { id: "ver2-letter-1", manuscriptId: MS, userId: uid, componentType: "Query Letter", versionName: "Letter v1", fileAttached: false, createdDate: noon("2026-09-14"), contentType: "text", contentDraft: "Dear agent,", wordCount: 300 });
  await put(["packages", "ver2-pkg-autumn"], { id: "ver2-pkg-autumn", manuscriptId: MS, userId: uid, packageName: "Autumn pack", queryLetterVersionId: "ver2-letter-1", synopsisVersionId: "", samplePagesVersionId: "", bookVersionId: "ver2-bv-3", status: "Active", createdDate: noon("2026-09-14") });
  let i = 0;
  for (const [ag, ms, stamp, sent, steps, status] of Q) {
    const id = `ver2-q-${i++}`;
    const a = NAMES[ag];
    const at = (st) => steps.find((s) => s[0] === st)?.[1];
    const last = steps[steps.length - 1];
    await put(["queries", id], {
      id, userId: uid, manuscriptId: ms, agentId: `ver2-ag-${ag}`, packageId: "", status, dateSent: noon(sent), personalisationNotes: "", sendMethod: "Email",
      ...(stamp ? { bookVersionId: stamp } : {}),
      ...(at("Partial Requested") ? { partialRequestedDate: noon(at("Partial Requested")) } : {}),
      ...(at("Full Requested") ? { fullRequestedDate: noon(at("Full Requested")) } : {}),
      ...(at("Rejected") ? { rejectedDate: noon(at("Rejected")) } : {}),
      ...(steps.length ? { lastStatusChange: noon(last[1]), hasAgentResponded: steps.some((s) => s[0] !== "Withdrawn") } : {}),
    });
    for (const [st, day] of [["Queried", sent], ...steps]) {
      const when = new Date(noon(day));
      await put(["queries", id, "activity", `act-status-${slug(st)}-${id}`], { type: st, resultingStatus: st, createdAt: Timestamp.fromMillis(when.getTime()), note: st, queryId: id, reconstructed: true });
      const fid = `ver2-act-${id}-${slug(st)}`;
      await put(["activities", fid], { id: fid, userId: uid, queryId: id, manuscriptId: ms, activityType: TYPE[st], description: st === "Queried" ? `Query sent to ${a[0]} at ${a[1]}` : `${st} — ${a[0]}`, date: when.toISOString(), details: "", resultingStatus: st });
    }
  }
  /* the fifteen-version book: every query stamped with its version, sent on the day after its version was saved */
  const mid = (v) => `ver2-m-bv-${v}`;
  await put(["manuscripts", MANY], { id: MANY, userId: uid, title: "Slack Water", genre: "Thriller", ageCategory: "Adult", wordCount: 82000, logline: "One tide, one skipper.", comps: [], status: "Querying", statusChangedDate: noon("2026-03-03"),
    bookVersions: MANY_T.map(([n, name, p, ch, d]) => ({ id: mid(n), name, kind: n ? "revision" : "initial", createdDate: d, num: n, ...(n ? { parentId: mid(p), changes: ch, wordCount: 82000 } : { original: true }) })),
    inUseBookVersionId: mid(8), bookVersionSeq: 15 });
  let mq = 0;
  for (const [n, , , , d, sent, asked] of MANY_T) {
    for (let k = 0; k < sent; k++) {
      const id = `ver2-mq-${mq}`; const ag = mq % NAMES.length; mq++;
      const day = n ? new Date(Date.parse(`${d}T12:00:00Z`) + (k + 1) * 864e5).toISOString().slice(0, 10) : `2026-02-${String(10 + k).padStart(2, "0")}`;
      const status = k < asked ? "Partial Requested" : ["Queried", "Rejected", "No Response"][k % 3];
      await put(["queries", id], { id, userId: uid, manuscriptId: MANY, agentId: `ver2-ag-${ag}`, packageId: "", status, dateSent: noon(day), personalisationNotes: "", sendMethod: "Email", ...(n ? { bookVersionId: mid(n) } : {}) });
      await put(["activities", `ver2-act-${id}-queried`], { id: `ver2-act-${id}-queried`, userId: uid, queryId: id, manuscriptId: MANY, activityType: "Query Sent", description: `Query sent to ${NAMES[ag][0]} at ${NAMES[ag][1]}`, date: noon(day), details: "", resultingStatus: "Queried" });
    }
  }
  /* the book with nothing: no versions, no queries (S28) */
  await put(["manuscripts", FRESH], { id: FRESH, userId: uid, title: "Dead Reckoning", genre: "Thriller", ageCategory: "Adult", wordCount: 70000, logline: "A navigator's last chart.", comps: [], status: "Querying", statusChangedDate: noon("2026-09-01") });
  console.log(`seeded ver2 (${uid}) — wiped ${n}, wrote 4 books, ${NAMES.length} agents, ${Q.length + mq} queries`);
}

/** What the page should show, worked out from the raw documents with this file's own arithmetic. */
async function facts() {
  const ms = (await getDoc(doc(db, "users", uid, "manuscripts", MS))).data();
  const qs = (await getDocs(collection(db, "users", uid, "queries"))).docs.map((d) => d.data()).filter((q) => q.manuscriptId === MS);
  const feed = (await getDocs(collection(db, "users", uid, "activities"))).docs.map((d) => d.data()).filter((a) => a.manuscriptId === MS);
  const vs = ms.bookVersions ?? [];
  const orig = vs.find((v) => v.original);
  const of = (q) => q.bookVersionId === "not-sure" ? null : vs.some((v) => v.id === q.bookVersionId) ? q.bookVersionId : orig && q.dateSent.slice(0, 10) <= orig.createdDate ? orig.id : null;
  const MORE = new Set(["Partial Requested", "Partial Sent", "Full Requested", "Full Sent", "Revise & Resubmit", "Resubmitted", "Offer", "Signed"]);
  const asked = (q) => MORE.has(q.status) || feed.some((a) => a.queryId === q.id && MORE.has(a.resultingStatus));
  const counted = qs.filter((q) => q.status !== "Withdrawn");
  const per = vs.map((v) => { const mine = counted.filter((q) => of(q) === v.id); const more = mine.filter(asked).length; return { id: v.id, name: v.name, n: mine.length, more, all: qs.filter((q) => of(q) === v.id).length, archived: !!v.archived }; });
  console.log(JSON.stringify({ inUse: vs.find((v) => v.id === ms.inUseBookVersionId)?.name ?? null, versions: per, unrecorded: counted.filter((q) => of(q) === null).length, sentTotal: counted.length, live: vs.filter((v) => !v.archived).length }));
}

const arg = process.argv[2] ?? "--seed";
if (arg === "--seed") await seed();
else if (arg === "--facts") await facts();
else if (arg === "--ms") console.log(JSON.stringify(sortKeys((await getDoc(doc(db, "users", uid, "manuscripts", process.argv[3] ?? MS))).data() ?? null)));
else if (arg === "--q") console.log(JSON.stringify(sortKeys(Object.fromEntries((await getDocs(collection(db, "users", uid, "queries"))).docs.filter((d) => d.id.startsWith("ver2-")).map((d) => [d.id, d.data().bookVersionId ?? null])))));
else if (arg === "--guide-reset") { await updateDoc(doc(db, "users", uid), { "todoPrefs.versions": deleteField() }); console.log("guide reset"); }
else throw new Error(`unknown ${arg}`);
process.exit(0);
