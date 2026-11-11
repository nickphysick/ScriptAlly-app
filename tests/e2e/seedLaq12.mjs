/**
 * Log a query v1.2 — the reference's own data, on the EMULATOR only, so the build can be laid beside the mock
 * (design-refs/log-a-query-v1-2/) with the same names in the same places: a book "Murphy's Day Out" with two book
 * versions, Letter A and B, a one-page and a two-page synopsis, the packages "First round" (active) and "Letter B test",
 * Marcus Reed (whose card asks for a query letter, a synopsis and the first 10 pages) and Joanna Lindqvist (whose card
 * says nothing). Every id starts `laq12-`; `--clean` removes every one, and each measurement's `afterAll` runs it.
 *
 *   node tests/e2e/seedLaq12.mjs           # write the fixture
 *   node tests/e2e/seedLaq12.mjs --clean   # remove every laq12- document (and any query logged against them)
 *   node tests/e2e/seedLaq12.mjs --queries <agentId>   # print that agent's queries (read only)
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { targetEnv, assertTarget, EMULATOR_PROJECT, ROOT } from "./fsTarget.mjs";

if (process.env.ALLOW_LIVE_FIRESTORE === "1") throw new Error("seedLaq12.mjs only ever writes to the emulator; unset ALLOW_LIVE_FIRESTORE.");
targetEnv();
assertTarget(EMULATOR_PROJECT);

const { uid } = JSON.parse(readFileSync(resolve(ROOT, "tests/emulator-seed/harness.json"), "utf8"));
const admin = createRequire(resolve(ROOT, "functions/package.json"))("firebase-admin");
const db = admin.firestore(admin.initializeApp({ projectId: EMULATOR_PROJECT }, "laq12-seed"));
const P = "laq12-";
const MS = `${P}ms`;
const u = (c, id) => db.doc(`users/${uid}/${c}/${id}`);

/* a read: the queries logged against one fixture agent (id, sent date, the materials summary the save wrote) */
if (process.argv.includes("--queries")) {
  const aid = process.argv[process.argv.indexOf("--queries") + 1];
  const s = await db.collection(`users/${uid}/queries`).where("agentId", "==", aid).get();
  console.log(JSON.stringify(s.docs.map((d) => ({ id: d.id, dateSent: d.data().dateSent, sentMaterials: d.data().sentMaterials, sentPackageId: d.data().sentPackageId ?? null }))));
  process.exit(0);
}
if (process.argv.includes("--clean")) {
  let gone = 0;
  for (const c of ["queries", "activities", "journalEntries", "taskFlags", "packages", "versions", "agents", "manuscripts"]) {
    for (const d of (await db.collection(`users/${uid}/${c}`).get()).docs) {
      const x = d.data();
      if (d.id.startsWith(P) || x.manuscriptId === MS || String(x.agentId ?? "").startsWith(P) || String(x.queryId ?? "").startsWith(P)) {
        if (c === "queries") for (const a of (await d.ref.collection("activity").get()).docs) await a.ref.delete();
        await d.ref.delete();
        gone++;
      }
    }
  }
  console.log(`laq12: removed ${gone}`);
  process.exit(0);
}

const at = (d) => `${d}T12:00:00.000Z`;
const b = db.batch();
b.set(u("manuscripts", MS), {
  id: MS, userId: uid, title: "Murphy's Day Out", genre: "Literary", ageCategory: "Adult", wordCount: 78000, status: "Querying",
  bookVersions: [
    { id: `${P}v1`, name: "Version 1", kind: "initial", createdDate: "2026-02-01" },
    { id: `${P}v2`, name: "Version 2", kind: "revision", createdDate: "2026-06-01" },
  ],
  activePackageId: `${P}pa`,
});
const version = (id, name, type, d) => b.set(u("versions", id), {
  id, userId: uid, manuscriptId: MS, componentType: type, versionName: name, createdDate: at(d), contentDraft: "", contentType: "text", fileAttached: false, wordCount: 0,
});
/* the newest of each kind is the one ticked first, so Letter A and the one-page synopsis are written last */
version(`${P}lb`, "Letter B", "Query Letter", "2026-05-01");
version(`${P}la`, "Letter A", "Query Letter", "2026-06-01");
version(`${P}s2`, "Two-page synopsis", "Synopsis", "2026-05-01");
version(`${P}s1`, "One-page synopsis", "Synopsis", "2026-06-01");
const pkg = (id, name, ql, d) => b.set(u("packages", id), {
  id, userId: uid, manuscriptId: MS, packageName: name, queryLetterVersionId: ql, synopsisVersionId: `${P}s1`, samplePagesVersionId: "",
  bookVersionId: `${P}v2`, status: "Active", createdDate: at(d),
});
pkg(`${P}pa`, "First round", `${P}la`, "2026-06-02");
pkg(`${P}pb`, "Letter B test", `${P}lb`, "2026-06-03");
const agent = (id, name, agency, email, wanted) => b.set(u("agents", id), {
  id, userId: uid, name, agency, email, submissionMethod: "Email", submissionStatus: "Open", materialsWanted: wanted,
  responseTimeWeeks: 8, genres: ["Literary"], website: "", notes: "", mswlNotes: "", dateAdded: at("2026-01-10"), lastCheckedDate: at("2026-01-10"),
});
agent(`${P}mr`, "Marcus Reed", "Hartley & Co", "marcus@hartleyandco.com", ["Query Letter", "Synopsis", "First 10 pages"]);
agent(`${P}jl`, "Joanna Lindqvist", "Northgate Books", "joanna@northgatebooks.co.uk", []);
await b.commit();
console.log("laq12: fixture written");
process.exit(0);
