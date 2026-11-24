/**
 * Record a response v2.1 — one agency with no named agent ("Penhallow Literary Agency"), queried with the harness's
 * seed-ms-1 on 3 Aug, on the EMULATOR only: the track's long-name case (Phase 3), which the harness account does not hold.
 * Every id starts `rar21-`; `--clean` removes them.
 *
 *   node tests/e2e/seedRar21.mjs          write
 *   node tests/e2e/seedRar21.mjs --clean  remove
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { targetEnv, assertTarget, EMULATOR_PROJECT, ROOT } from "./fsTarget.mjs";

if (process.env.ALLOW_LIVE_FIRESTORE === "1") throw new Error("seedRar21.mjs only ever writes to the emulator; unset ALLOW_LIVE_FIRESTORE.");
targetEnv();
assertTarget(EMULATOR_PROJECT);

const { uid } = JSON.parse(readFileSync(resolve(ROOT, "tests/emulator-seed/harness.json"), "utf8"));
const admin = createRequire(resolve(ROOT, "functions/package.json"))("firebase-admin");
const db = admin.firestore(admin.initializeApp({ projectId: EMULATOR_PROJECT }, "rar21-seed"));
const P = "rar21-";
const u = (c, id) => db.doc(`users/${uid}/${c}/${id}`);
const at = (d) => `${d}T12:00:00.000Z`;
const b = db.batch();
if (process.argv.includes("--clean")) {
  for (const [c, id] of [["agents", `${P}pa`], ["queries", `${P}qpa`], ["activities", `${P}qpa-e1`]]) b.delete(u(c, id));
  await b.commit();
  console.log("rar21: removed");
  process.exit(0);
}
b.set(u("agents", `${P}pa`), {
  id: `${P}pa`, userId: uid, name: "", agency: "Penhallow Literary Agency", email: "", submissionMethod: "Email", submissionStatus: "Open",
  materialsWanted: [], genres: ["Literary"], website: "", notes: "", mswlNotes: "", dateAdded: at("2026-01-10"), lastCheckedDate: at("2026-01-10"),
});
b.set(u("queries", `${P}qpa`), {
  id: `${P}qpa`, userId: uid, agentId: `${P}pa`, manuscriptId: "seed-ms-1", status: "Queried", dateSent: "2026-08-03", sendMethod: "Email",
  personalisationNotes: "", packageId: "",
});
b.set(u("activities", `${P}qpa-e1`), {
  id: `${P}qpa-e1`, userId: uid, queryId: `${P}qpa`, manuscriptId: "seed-ms-1", resultingStatus: "Queried", activityType: "Status Changed",
  description: "Query sent to Penhallow Literary Agency", details: "", date: "2026-08-03", createdAt: at("2026-08-03"),
});
await b.commit();
console.log("rar21: Penhallow Literary Agency written");
process.exit(0);
