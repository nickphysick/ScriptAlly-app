/**
 * Query letters v2.4 — the fixture, on top of seedQueryLetters.mjs and seedQueryLettersV21.mjs (run those first):
 * Murphy's Day Out (`cv25-ms`) gains `ql24-blank-name`, an unsent letter with NO text and NO file (a name only), so the
 * "No text saved" paragraph is measured both with and without a file name. EMULATOR ONLY, through firebase-admin.
 *
 *   node tests/e2e/seedQueryLetters.mjs && node tests/e2e/seedQueryLettersV21.mjs && node tests/e2e/seedQueryLettersV24.mjs
 */
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { targetEnv, assertTarget, EMULATOR_PROJECT } from "./fsTarget.mjs";

if (process.env.ALLOW_LIVE_FIRESTORE === "1") throw new Error("seedQueryLettersV24.mjs only ever writes to the emulator.");
targetEnv();
assertTarget(EMULATOR_PROJECT);
const require = createRequire(resolve(process.cwd(), "functions/package.json"));
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const harness = require(resolve(process.cwd(), "tests/emulator-seed/harness.json"));
const app = admin.initializeApp({ projectId: EMULATOR_PROJECT }, "seed-ql24");
const db = getFirestore(app);
const uid = harness.uid;
await db.doc(`users/${uid}/versions/ql24-blank-name`).set({
  id: "ql24-blank-name", manuscriptId: "cv25-ms", userId: uid, componentType: "Query Letter", versionName: "Shorter pitch",
  fileAttached: false, createdDate: "2026-08-23T10:00:00.000Z", contentType: "ref",
});
console.log("seeded query letters v2.4 on cv25-ms");
process.exit(0);
