/**
 * Log a query v2.3 — read only, on the EMULATOR only: every query of the harness account as { id, manuscriptId,
 * dateSent } JSON, so laqV23.measure.ts V23-S can run lib/dash2 `queriesSent` over the Queries page's own scope (the
 * desktop page has no book scope: its header counts every manuscript).
 *
 *   node tests/e2e/laq23Queries.mjs
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { targetEnv, assertTarget, EMULATOR_PROJECT, ROOT } from "./fsTarget.mjs";

if (process.env.ALLOW_LIVE_FIRESTORE === "1") throw new Error("laq23Queries.mjs only ever reads the emulator; unset ALLOW_LIVE_FIRESTORE.");
targetEnv();
assertTarget(EMULATOR_PROJECT);
const { uid } = JSON.parse(readFileSync(resolve(ROOT, "tests/emulator-seed/harness.json"), "utf8"));
const admin = createRequire(resolve(ROOT, "functions/package.json"))("firebase-admin");
const db = admin.firestore(admin.initializeApp({ projectId: EMULATOR_PROJECT }, "laq23-read"));
const qs = (await db.collection(`users/${uid}/queries`).get()).docs.map((d) => ({ id: d.id, manuscriptId: d.data().manuscriptId ?? null, dateSent: d.data().dateSent ?? null }));
console.log(JSON.stringify(qs));
process.exit(0);
