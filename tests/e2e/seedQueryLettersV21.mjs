/**
 * Query letters v2.1 — the fixture, on top of seedQueryLetters.mjs (run that first): Murphy's Day Out (`cv25-ms`) gains
 *   - `ql21-blank-sent`: a letter with NO text that has gone out (one query records it), the add-once case;
 *   - `ql21-blank-file`: a letter with no text, kept in a file, never sent;
 *   - `ql21-pkg`: a live package holding `cv25-let-1`, made the active package, so `packageLetterDiffers` returns it
 *     while `cv25-let-2` is the stored in-use letter (and returns none once `cv25-let-1` is put in use).
 * EMULATOR ONLY, through firebase-admin. Every e2e run imports the snapshot and exports nothing.
 *
 *   node tests/e2e/seedQueryLetters.mjs && node tests/e2e/seedQueryLettersV21.mjs
 */
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { targetEnv, assertTarget, EMULATOR_PROJECT } from "./fsTarget.mjs";

if (process.env.ALLOW_LIVE_FIRESTORE === "1") throw new Error("seedQueryLettersV21.mjs only ever writes to the emulator.");
targetEnv();
assertTarget(EMULATOR_PROJECT);
const require = createRequire(resolve(process.cwd(), "functions/package.json"));
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const harness = require(resolve(process.cwd(), "tests/emulator-seed/harness.json"));
const app = admin.initializeApp({ projectId: EMULATOR_PROJECT }, "seed-ql21");
const db = getFirestore(app);
const uid = harness.uid;
const MS = "cv25-ms";
const u = (p) => db.doc(`users/${uid}/${p}`);

const letter = (id, name, created, extra) => u(`versions/${id}`).set({
  id, manuscriptId: MS, userId: uid, componentType: "Query Letter", versionName: name, fileAttached: false,
  createdDate: created, contentType: "ref", ...extra,
});
await letter("ql21-blank-sent", "Covering letter 4", "2026-08-21T10:00:00.000Z", {});
await letter("ql21-blank-file", "Voice-led", "2026-08-22T10:00:00.000Z", { fileName: "Murphy_query_voice.docx" });

/* one query that records the blank letter: a copy of an existing cv25-ms query with no letter of its own */
const qs = await db.collection(`users/${uid}/queries`).where("manuscriptId", "==", MS).get();
const src = qs.docs.find((d) => !(d.data().sentVersions ?? []).length && !d.data().packageId) ?? qs.docs[0];
if (!src) throw new Error("seedQueryLettersV21: cv25-ms has no query to copy");
await u("queries/ql21-q1").set({ ...src.data(), id: "ql21-q1", packageId: "", sentVersions: ["ql21-blank-sent"], dateSent: "2026-08-25T00:00:00.000Z" });

await u("packages/ql21-pkg").set({
  id: "ql21-pkg", userId: uid, manuscriptId: MS, packageName: "Standard package", queryLetterVersionId: "cv25-let-1",
  synopsisVersionId: "", samplePagesVersionId: "", createdDate: "2026-08-01T10:00:00.000Z", status: "Active",
});
await u(`manuscripts/${MS}`).update({ activePackageId: "ql21-pkg", inUseLetterId: "cv25-let-2" });
console.log("seeded query letters v2.1 on", MS, "(query copied from", src.id + ")");
process.exit(0);
