/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list rows v1.2 — read (or restore) a fixture agent's starRating in the EMULATOR, for M12's read-back.
 *   node tests/e2e/clrRead.mjs <surname>            prints {"starRating": n | null}
 *   node tests/e2e/clrRead.mjs <surname> --clear    removes starRating (the fixture's unrated state)
 *   node tests/e2e/clrRead.mjs <surname> --home US  sets the writer's home country (M26)
 */
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { targetEnv, assertTarget, EMULATOR_PROJECT, ROOT } from "./fsTarget.mjs";
import { CLR_UID, clrId } from "./clrFixture.mjs";

targetEnv();
assertTarget(EMULATOR_PROJECT);
const req = createRequire(resolve(ROOT, "functions/package.json"));
const admin = req("firebase-admin");
const { getFirestore, FieldValue } = req("firebase-admin/firestore");
const app = admin.initializeApp({ projectId: EMULATOR_PROJECT }, "clr-read");
const ref = getFirestore(app).doc(`users/${CLR_UID}/agents/${clrId(process.argv[2])}`);
if (process.argv[3] === "--clear") await ref.update({ starRating: FieldValue.delete() });
/* v1.2.1 — the writer's home country, for M26 (`--home US`, restored with `--home GB`) */
if (process.argv[3] === "--home") await getFirestore(app).doc(`users/${CLR_UID}`).update({ homeCountry: process.argv[4] });
const d = (await ref.get()).data() ?? {};
console.log(JSON.stringify({ starRating: typeof d.starRating === "number" ? d.starRating : null }));
process.exit(0);
