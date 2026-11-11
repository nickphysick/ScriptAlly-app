/**
 * Log a query v1.3 — the reference's own data, on the EMULATOR only, so the build can be laid beside the mock
 * (design-refs/log-a-query-v1-3/) with the same names in the same places: a book "Murphy's Day Out" with Version 1,
 * Version 2 (current) and "Prologue cut, flashback first" (V3), Letter A and B, a one-page and a two-page synopsis, the
 * packages "First round" (active) and "Letter B test", Marcus Reed (8 weeks; asks for a letter, a synopsis and the first
 * 10 pages), Joanna Lindqvist (nothing on her card, no response time) and Rosalind Achebe (12 weeks, no reply means no,
 * QueryManager). A second book, "The Long Names", carries the longest version names on dev and a 40-character one, for
 * the Materials overflow test. Every id starts `laq13-`; `--clean` removes every one, and each measurement's `afterAll`
 * runs it.
 *
 *   node tests/e2e/seedLaq13.mjs           # write the fixture
 *   node tests/e2e/seedLaq13.mjs --clean   # remove every laq13- document (and anything logged against them)
 *   node tests/e2e/seedLaq13.mjs --queries <agentId>   # that agent's queries' reply fields, and their card's weeks (read only)
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { targetEnv, assertTarget, EMULATOR_PROJECT, ROOT } from "./fsTarget.mjs";

if (process.env.ALLOW_LIVE_FIRESTORE === "1") throw new Error("seedLaq13.mjs only ever writes to the emulator; unset ALLOW_LIVE_FIRESTORE.");
targetEnv();
assertTarget(EMULATOR_PROJECT);

const { uid } = JSON.parse(readFileSync(resolve(ROOT, "tests/emulator-seed/harness.json"), "utf8"));
const admin = createRequire(resolve(ROOT, "functions/package.json"))("firebase-admin");
const db = admin.firestore(admin.initializeApp({ projectId: EMULATOR_PROJECT }, "laq13-seed"));
const P = "laq13-";
const MS = `${P}ms`;
const MS2 = `${P}ms2`;
const u = (c, id) => db.doc(`users/${uid}/${c}/${id}`);

if (process.argv.includes("--queries")) {
  const aid = process.argv[process.argv.indexOf("--queries") + 1];
  const s = await db.collection(`users/${uid}/queries`).where("agentId", "==", aid).get();
  const a = await u("agents", aid).get();
  const pick = (x) => ({
    dateSent: x.dateSent, status: x.status, ifNoResponse: x.ifNoResponse ?? null, nudgeDate: x.nudgeDate ?? null,
    writerExpectedDate: x.writerExpectedDate ?? null, responseDeadline: x.responseDeadline ?? null,
  });
  console.log(JSON.stringify({ queries: s.docs.map((d) => ({ id: d.id, ...pick(d.data()) })), agentWeeks: a.exists ? a.data().responseTimeWeeks ?? null : "missing" }));
  process.exit(0);
}
if (process.argv.includes("--clean")) {
  let gone = 0;
  for (const c of ["queries", "activities", "journalEntries", "taskFlags", "packages", "versions", "agents", "manuscripts"]) {
    for (const d of (await db.collection(`users/${uid}/${c}`).get()).docs) {
      const x = d.data();
      if (d.id.startsWith(P) || x.manuscriptId === MS || x.manuscriptId === MS2 || String(x.agentId ?? "").startsWith(P) || String(x.queryId ?? "").startsWith(P)) {
        if (c === "queries") for (const a of (await d.ref.collection("activity").get()).docs) await a.ref.delete();
        await d.ref.delete();
        gone++;
      }
    }
  }
  console.log(`laq13: removed ${gone}`);
  process.exit(0);
}

const at = (d) => `${d}T12:00:00.000Z`;
const b = db.batch();
b.set(u("manuscripts", MS), {
  id: MS, userId: uid, title: "Murphy's Day Out", genre: "Literary", ageCategory: "Adult", wordCount: 78000, status: "Querying",
  bookVersions: [
    { id: `${P}v1`, name: "Version 1", kind: "initial", createdDate: "2026-02-01" },
    { id: `${P}v2`, name: "Version 2", kind: "revision", createdDate: "2026-06-01" },
    /* third in the list (V3), but written before Version 2, so Version 2 stays the current one, as in the reference */
    { id: `${P}v3`, name: "Prologue cut, flashback first", kind: "revision", createdDate: "2026-05-01" },
  ],
  activePackageId: `${P}pa`,
});
b.set(u("manuscripts", MS2), {
  id: MS2, userId: uid, title: "The Long Names", genre: "Literary", ageCategory: "Adult", wordCount: 90000, status: "Querying",
  bookVersions: [
    { id: `${P}w1`, name: "Bethuses Version", kind: "initial", createdDate: "2026-02-01" },
    { id: `${P}w2`, name: "Prologue cut", kind: "revision", createdDate: "2026-03-01" },
    { id: `${P}w3`, name: "Flashback first", kind: "revision", createdDate: "2026-04-01" },
    { id: `${P}w4`, name: "The one where the ferry never quite docks", kind: "revision", createdDate: "2026-05-01" },
  ],
});
const version = (id, name, type, d, ms = MS) => b.set(u("versions", id), {
  id, userId: uid, manuscriptId: ms, componentType: type, versionName: name, createdDate: at(d), contentDraft: "", contentType: "text", fileAttached: false, wordCount: 0,
});
/* the newest of each kind is the one ticked first, so Letter A and the one-page synopsis are written last */
version(`${P}lb`, "Letter B", "Query Letter", "2026-05-01");
version(`${P}la`, "Letter A", "Query Letter", "2026-06-01");
version(`${P}s2`, "Two-page synopsis", "Synopsis", "2026-05-01");
version(`${P}s1`, "One-page synopsis", "Synopsis", "2026-06-01");
/* the long book's letter and synopsis carry long names too */
version(`${P}ll`, "Letter for agents who like ferries and fog", "Query Letter", "2026-06-01", MS2);
version(`${P}sl`, "Two-page synopsis with the ending spelt out", "Synopsis", "2026-06-01", MS2);
const pkg = (id, name, ql, d) => b.set(u("packages", id), {
  id, userId: uid, manuscriptId: MS, packageName: name, queryLetterVersionId: ql, synopsisVersionId: `${P}s1`, samplePagesVersionId: "",
  bookVersionId: `${P}v2`, status: "Active", createdDate: at(d),
});
pkg(`${P}pa`, "First round", `${P}la`, "2026-06-02");
pkg(`${P}pb`, "Letter B test", `${P}lb`, "2026-06-03");
const agent = (id, name, agency, email, wanted, x = {}) => b.set(u("agents", id), {
  id, userId: uid, name, agency, email, submissionMethod: "Email", submissionStatus: "Open", materialsWanted: wanted,
  responseTimeWeeks: 8, genres: ["Literary"], website: "", notes: "", mswlNotes: "", dateAdded: at("2026-01-10"), lastCheckedDate: at("2026-01-10"), ...x,
});
/* Marcus replies to everyone, stated (the reference's "Replies to everyone"; an unstated policy reads "—" in the app) */
agent(`${P}mr`, "Marcus Reed", "Hartley & Co", "marcus@hartleyandco.com", ["Query Letter", "Synopsis", "First 10 pages"], { noResponseMeansNo: false });
agent(`${P}ra`, "Rosalind Achebe", "Hartley & Co", "", ["Query Letter", "Synopsis", "First 3 chapters"], { responseTimeWeeks: 12, noResponseMeansNo: true, submissionMethod: "Query Manager" });
/* no response time on Joanna's card: the field is absent, as on a card that never had one */
b.set(u("agents", `${P}jl`), {
  id: `${P}jl`, userId: uid, name: "Joanna Lindqvist", agency: "Northgate Books", email: "joanna@northgatebooks.co.uk", submissionMethod: "Email",
  submissionStatus: "Open", materialsWanted: [], genres: ["Literary"], website: "", notes: "", mswlNotes: "", dateAdded: at("2026-01-10"), lastCheckedDate: at("2026-01-10"),
});
await b.commit();
console.log("laq13: fixture written");
process.exit(0);
