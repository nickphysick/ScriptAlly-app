/**
 * Log a query v2.2 — on top of the v2 and v2.1 fixtures (seedLaq2.mjs, seedLaq21.mjs), on the EMULATOR only: twenty
 * more agents already queried with "Murphy's Day Out", three of them with no sent date, so the book holds 24 queries
 * and the next one logged is the 25th (the milestone), with the review's "queries sent" read against undated ones.
 * Every id starts `laq2-`, so `node tests/e2e/seedLaq2.mjs --clean` removes them.
 *
 *   node tests/e2e/seedLaq22.mjs
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { targetEnv, assertTarget, EMULATOR_PROJECT, ROOT } from "./fsTarget.mjs";

if (process.env.ALLOW_LIVE_FIRESTORE === "1") throw new Error("seedLaq22.mjs only ever writes to the emulator; unset ALLOW_LIVE_FIRESTORE.");
targetEnv();
assertTarget(EMULATOR_PROJECT);

const { uid } = JSON.parse(readFileSync(resolve(ROOT, "tests/emulator-seed/harness.json"), "utf8"));
const admin = createRequire(resolve(ROOT, "functions/package.json"))("firebase-admin");
const db = admin.firestore(admin.initializeApp({ projectId: EMULATOR_PROJECT }, "laq22-seed"));
const P = "laq2-";
const u = (c, id) => db.doc(`users/${uid}/${c}/${id}`);
const at = (d) => `${d}T12:00:00.000Z`;
const b = db.batch();
for (let i = 1; i <= 20; i++) {
  const id = `${P}mi${String(i).padStart(2, "0")}`;
  b.set(u("agents", id), {
    id, userId: uid, name: `Agent ${i} Milestone`, agency: "Milestone & Co", email: "", submissionMethod: "Email", submissionStatus: "Open", materialsWanted: [],
    genres: ["Literary"], website: "", notes: "", mswlNotes: "", dateAdded: at("2026-01-10"), lastCheckedDate: at("2026-01-10"),
  });
  b.set(u("queries", `${id}q`), {
    id: `${id}q`, userId: uid, agentId: id, manuscriptId: `${P}ms`, status: "Queried", dateSent: i <= 3 ? "" : at(`2026-0${1 + (i % 9)}-1${i % 10}`),
    submissionMethod: "Email", materialsWanted: ["Query Letter"],
  });
}
await b.commit();
console.log("laq22: twenty more queries written (three undated)");
process.exit(0);
