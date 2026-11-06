/**
 * Query letters v1 — the fixture: Murphy's Day Out (`cv25-ms`) gets its three letters' text, what each changed, a
 * draft fourth letter, and v2 (the one with sends) as the in-use letter. EMULATOR ONLY, through firebase-admin (parentId is a create-time
 * field the rules rightly refuse on an update). Every e2e run imports the snapshot and exports nothing, so this never
 * outlives the run.
 *
 *   node tests/e2e/seedQueryLetters.mjs
 */
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { targetEnv, assertTarget, EMULATOR_PROJECT } from "./fsTarget.mjs";

if (process.env.ALLOW_LIVE_FIRESTORE === "1") throw new Error("seedQueryLetters.mjs only ever writes to the emulator.");
targetEnv();
assertTarget(EMULATOR_PROJECT);
const require = createRequire(resolve(process.cwd(), "functions/package.json"));
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const harness = require(resolve(process.cwd(), "tests/emulator-seed/harness.json"));
const app = admin.initializeApp({ projectId: EMULATOR_PROJECT }, "seed-ql1");
const db = getFirestore(app);
const uid = harness.uid;
const MS = "cv25-ms";
const words = (t) => t.trim().split(/\s+/).length;
const V1 = `Dear [Agent],

I am seeking representation for MURPHY'S DAY OUT, an adult thriller complete at 50,000 words. I am querying you because you represent crime fiction with a strong sense of place.

Harbour pilot Tess Murphy hasn't taken a day off in eleven years. When she finally does, the ferry she should have been steering comes into Kilmore harbour with no one at the wheel and one passenger fewer than it left with.

The coastguard calls it an accident. Tess knows the water too well to believe it, and by nightfall she has twelve hours, a borrowed boat and a list of everyone who knew she wouldn't be on board.

Thank you for your time and consideration.`;
const V2 = `Dear [Agent],

The one day harbour pilot Tess Murphy takes off in eleven years, her ferry comes home with no one at the wheel.

MURPHY'S DAY OUT is an adult thriller complete at 50,000 words.

The coastguard calls it an accident. Tess knows the water too well to believe it. By nightfall she has twelve hours, a borrowed boat and a list of everyone who knew she wouldn't be on board, and the list starts with her brother.

Thank you for your time and consideration.`;
const V3 = `Dear [Agent],

The one day harbour pilot Tess Murphy takes off in eleven years, her ferry comes home with no one at the wheel.

The coastguard calls it an accident. Tess knows the water too well to believe it. By nightfall she has twelve hours, a borrowed boat and a list of everyone who knew she wouldn't be on board, and the list starts with her brother.

MURPHY'S DAY OUT is an adult thriller complete at 50,000 words.

Thank you for your time and consideration.`;
const V4 = `Dear [Agent],

Tess Murphy has piloted every ship into Kilmore harbour for eleven years. On her one day off, the ferry comes home empty.`;
const ref = (id) => db.doc(`users/${uid}/versions/${id}`);
await ref("cv25-let-1").update({ contentDraft: V1, contentType: "text", wordCount: words(V1) });
await ref("cv25-let-2").update({ contentDraft: V2, contentType: "text", wordCount: words(V2), parentId: "cv25-let-1", changes: ["Hook moved to the first line", "Brother named in the stakes"] });
await ref("cv25-let-3").update({ contentDraft: V3, contentType: "text", wordCount: words(V3), parentId: "cv25-let-2", changes: ["Word count moved under the pitch"] });
await ref("ql1-draft").set({
  id: "ql1-draft", manuscriptId: MS, userId: uid, componentType: "Query Letter", versionName: "Open on the harbour", fileAttached: false,
  createdDate: "2026-11-03T10:00:00.000Z", contentType: "text", contentDraft: V4, wordCount: words(V4), parentId: "cv25-let-3", changes: ["New opening line"],
});
await db.doc(`users/${uid}/manuscripts/${MS}`).update({ inUseLetterId: "cv25-let-2" });
console.log("seeded query letters on", MS);
process.exit(0);
