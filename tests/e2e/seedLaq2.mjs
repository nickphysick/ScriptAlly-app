/**
 * Log a query v2 — the mock's own data (design-refs/log-a-query-v2/, mock v22), on the EMULATOR only, so the build can be
 * laid beside the ref with the same names: Harriet Vance (Vance & Wren, 8 weeks, email; asks for a query letter, a synopsis
 * and the first 3 chapters), Callum Reid (Reid Whitlock Associates; nothing on his card, no response time) and Nadia
 * Suleiman (The Larkfield Agency, 6 weeks, online form; a query letter and the first 50 pages). Three books, one per
 * "what the writer has saved" switch in the ref:
 *   laq2-ms   "Murphy's Day Out" — packages and named materials: Version 2 (current) / Version 1, Letter A / Letter B,
 *             One-page / Two-page synopsis, packages "Full submission" (Letter B, One-page synopsis, Version 2; active)
 *             and "Letter and sample" (Letter B, Version 2)
 *   laq2-msn  "The Night Ferry" — named materials, no packages
 *   laq2-ms0  "Small Hours" — nothing saved
 * Every id starts `laq2-`; an agent the journey adds is named "… Laqtwo" so `--clean` finds it too.
 *
 *   node tests/e2e/seedLaq2.mjs                 # write the fixture
 *   node tests/e2e/seedLaq2.mjs --clean         # remove every laq2- document (and anything logged or added against them)
 *   node tests/e2e/seedLaq2.mjs --state         # read only: the queries, the "Laqtwo" agents and the laq2 tasks, as JSON
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { targetEnv, assertTarget, EMULATOR_PROJECT, ROOT } from "./fsTarget.mjs";

if (process.env.ALLOW_LIVE_FIRESTORE === "1") throw new Error("seedLaq2.mjs only ever writes to the emulator; unset ALLOW_LIVE_FIRESTORE.");
targetEnv();
assertTarget(EMULATOR_PROJECT);

const { uid } = JSON.parse(readFileSync(resolve(ROOT, "tests/emulator-seed/harness.json"), "utf8"));
const admin = createRequire(resolve(ROOT, "functions/package.json"))("firebase-admin");
const db = admin.firestore(admin.initializeApp({ projectId: EMULATOR_PROJECT }, "laq2-seed"));
const P = "laq2-";
const BOOKS = [`${P}ms`, `${P}msn`, `${P}ms0`];
const u = (c, id) => db.doc(`users/${uid}/${c}/${id}`);
const ours = (id, x) => id.startsWith(P) || BOOKS.includes(x.manuscriptId) || String(x.agentId ?? "").startsWith(P) || String(x.queryId ?? "").startsWith(P)
  || / Laqtwo$/.test(String(x.name ?? "")) || / Laqtwo/.test(String(x.text ?? "")) || / Laqtwo/.test(String(x.description ?? ""));

if (process.argv.includes("--state")) {
  const qs = (await db.collection(`users/${uid}/queries`).get()).docs.filter((d) => BOOKS.includes(d.data().manuscriptId))
    .map((d) => ({ id: d.id, agentId: d.data().agentId, manuscriptId: d.data().manuscriptId, status: d.data().status, nudgeDate: d.data().nudgeDate ?? null, sentPackageId: d.data().sentPackageId ?? null }));
  const added = (await db.collection(`users/${uid}/agents`).get()).docs.filter((d) => / Laqtwo$/.test(String(d.data().name ?? ""))).map((d) => ({ id: d.id, name: d.data().name, agency: d.data().agency ?? "" }));
  const tasks = (await db.collection(`users/${uid}/tasks`).get()).docs.filter((d) => ours(d.id, d.data())).map((d) => ({ id: d.id, text: d.data().text, agentId: d.data().agentId ?? null, done: !!d.data().done }));
  /* v2.2 — the journal entries (the query card's notes) on this fixture's queries */
  const qids = new Set(qs.map((q) => q.id));
  const journal = (await db.collection(`users/${uid}/journalEntries`).get()).docs.filter((d) => qids.has(d.data().queryId))
    .map((d) => ({ id: d.id, queryId: d.data().queryId, text: d.data().entryText, createdAt: d.data().createdAt }));
  console.log(JSON.stringify({ queries: qs, added, tasks, journal }));
  process.exit(0);
}
if (process.argv.includes("--clean")) {
  let gone = 0;
  const addedIds = new Set((await db.collection(`users/${uid}/agents`).get()).docs.filter((d) => / Laqtwo$/.test(String(d.data().name ?? ""))).map((d) => d.id));
  /* v2.2 — a logged query's journal entries carry its generated id, not the prefix: find them by the book */
  const loggedIds = new Set((await db.collection(`users/${uid}/queries`).get()).docs.filter((d) => BOOKS.includes(d.data().manuscriptId)).map((d) => d.id));
  for (const c of ["queries", "activities", "journalEntries", "taskFlags", "tasks", "packages", "versions", "agents", "manuscripts"]) {
    for (const d of (await db.collection(`users/${uid}/${c}`).get()).docs) {
      const x = d.data();
      if (ours(d.id, x) || addedIds.has(d.id) || addedIds.has(String(x.agentId ?? "")) || (c === "journalEntries" && loggedIds.has(String(x.queryId ?? "")))) {
        if (c === "queries") for (const a of (await d.ref.collection("activity").get()).docs) await a.ref.delete();
        if (c === "agents") for (const n of (await d.ref.collection("notes").get()).docs) await n.ref.delete();
        await d.ref.delete();
        gone++;
      }
    }
  }
  console.log(`laq2: removed ${gone}`);
  process.exit(0);
}

const at = (d) => `${d}T12:00:00.000Z`;
const b = db.batch();
b.set(u("manuscripts", `${P}ms`), {
  id: `${P}ms`, userId: uid, title: "Murphy's Day Out", genre: "Literary", ageCategory: "Adult", wordCount: 78000, status: "Querying",
  bookVersions: [
    { id: `${P}v1`, name: "Version 1", kind: "initial", createdDate: "2026-02-01" },
    { id: `${P}v2`, name: "Version 2", kind: "revision", createdDate: "2026-06-01" },
  ],
  activePackageId: `${P}p1`,
});
b.set(u("manuscripts", `${P}msn`), {
  id: `${P}msn`, userId: uid, title: "The Night Ferry", genre: "Literary", ageCategory: "Adult", wordCount: 82000, status: "Querying",
  bookVersions: [
    { id: `${P}n1`, name: "Version 1", kind: "initial", createdDate: "2026-02-01" },
    { id: `${P}n2`, name: "Version 2", kind: "revision", createdDate: "2026-06-01" },
  ],
});
b.set(u("manuscripts", `${P}ms0`), {
  id: `${P}ms0`, userId: uid, title: "Small Hours", genre: "Literary", ageCategory: "Adult", wordCount: 70000, status: "Querying", bookVersions: [],
});
const version = (id, name, type, d, ms) => b.set(u("versions", id), {
  id, userId: uid, manuscriptId: ms, componentType: type, versionName: name, createdDate: at(d), contentDraft: "", contentType: "text", fileAttached: false, wordCount: 0,
});
/* the newest of each kind is ticked first: Letter B and the one-page synopsis, as the ref */
for (const ms of [`${P}ms`, `${P}msn`]) {
  const k = ms === `${P}ms` ? "" : "n";
  version(`${P}${k}la`, "Letter A", "Query Letter", "2026-05-01", ms);
  version(`${P}${k}lb`, "Letter B", "Query Letter", "2026-06-01", ms);
  version(`${P}${k}s2`, "Two-page synopsis", "Synopsis", "2026-05-01", ms);
  version(`${P}${k}s1`, "One-page synopsis", "Synopsis", "2026-06-01", ms);
}
const pkg = (id, name, syn, d) => b.set(u("packages", id), {
  id, userId: uid, manuscriptId: `${P}ms`, packageName: name, queryLetterVersionId: `${P}lb`, synopsisVersionId: syn, samplePagesVersionId: "",
  bookVersionId: `${P}v2`, status: "Active", createdDate: at(d),
});
pkg(`${P}p1`, "Full submission", `${P}s1`, "2026-06-02");
pkg(`${P}p2`, "Letter and sample", "", "2026-06-03");
const agent = (id, name, agency, x = {}) => b.set(u("agents", id), {
  id, userId: uid, name, agency, email: "", submissionMethod: "Email", submissionStatus: "Open", materialsWanted: [],
  genres: ["Literary"], website: "", notes: "", mswlNotes: "", dateAdded: at("2026-01-10"), lastCheckedDate: at("2026-01-10"), ...x,
});
agent(`${P}hv`, "Harriet Vance", "Vance & Wren", { email: "queries@vanceandwren.example", responseTimeWeeks: 8, noResponseMeansNo: false, materialsWanted: ["Query Letter", "Synopsis", "First 3 chapters"] });
agent(`${P}cr`, "Callum Reid", "Reid Whitlock Associates");
agent(`${P}ns`, "Nadia Suleiman", "The Larkfield Agency", { responseTimeWeeks: 6, noResponseMeansNo: false, submissionMethod: "Online Form", materialsWanted: ["Query Letter", "First 50 pages"] });
await b.commit();
console.log("laq2: fixture written");
process.exit(0);
