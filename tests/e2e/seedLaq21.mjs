/**
 * Log a query v2.1 — the mock v24 step-one data on top of the v2 fixture (seedLaq2.mjs), on the EMULATOR only: four
 * agents already queried with "Murphy's Day Out" (laq2-ms), as the ref's screen 02 — Rosalind Ashby (queried 3 Oct,
 * active), Samuel Osei (partial requested), Imogen Hart (passed 12 Sep) and Theo Okafor (no reply, closed 2 Nov).
 * Every id starts `laq2-`, so seedLaq2.mjs --clean removes them too.
 *
 *   node tests/e2e/seedLaq2.mjs && node tests/e2e/seedLaq21.mjs
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { targetEnv, assertTarget, EMULATOR_PROJECT, ROOT } from "./fsTarget.mjs";

if (process.env.ALLOW_LIVE_FIRESTORE === "1") throw new Error("seedLaq21.mjs only ever writes to the emulator; unset ALLOW_LIVE_FIRESTORE.");
targetEnv();
assertTarget(EMULATOR_PROJECT);

const { uid } = JSON.parse(readFileSync(resolve(ROOT, "tests/emulator-seed/harness.json"), "utf8"));
const admin = createRequire(resolve(ROOT, "functions/package.json"))("firebase-admin");
const db = admin.firestore(admin.initializeApp({ projectId: EMULATOR_PROJECT }, "laq21-seed"));
const P = "laq2-";
const u = (c, id) => db.doc(`users/${uid}/${c}/${id}`);
const at = (d) => `${d}T12:00:00.000Z`;
const b = db.batch();
const agent = (id, name, agency) => b.set(u("agents", id), {
  id, userId: uid, name, agency, email: "", submissionMethod: "Email", submissionStatus: "Open", materialsWanted: [],
  genres: ["Literary"], website: "", notes: "", mswlNotes: "", dateAdded: at("2026-01-10"), lastCheckedDate: at("2026-01-10"),
});
const query = (id, agentId, status, sent, closed = null) => b.set(u("queries", id), {
  id, userId: uid, agentId, manuscriptId: `${P}ms`, status, dateSent: at(sent), submissionMethod: "Email", materialsWanted: ["Query Letter"],
  ...(closed ? { lastStatusChange: at(closed), responseReceivedAt: at(closed) } : {}),
});
agent(`${P}ra`, "Rosalind Ashby", "Ashby & Lowe");
agent(`${P}so`, "Samuel Osei", "Blackfriars Agency");
agent(`${P}ih`, "Imogen Hart", "Hart Literary");
agent(`${P}to`, "Theo Okafor", "Okafor & Finch");
query(`${P}qra`, `${P}ra`, "Queried", "2026-10-03");
query(`${P}qso`, `${P}so`, "Partial Requested", "2026-09-20");
query(`${P}qih`, `${P}ih`, "Rejected", "2026-08-15", "2026-09-12");
query(`${P}qto`, `${P}to`, "No Response", "2026-07-01", "2026-11-02");
await b.commit();
console.log("laq21: step-one agents written");
process.exit(0);
