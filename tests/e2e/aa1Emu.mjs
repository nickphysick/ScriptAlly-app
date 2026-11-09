/**
 * Add agent v1 — the AA locks' emulator helper. EMULATOR ONLY (demo-scriptally; refused anywhere else).
 *
 *   node tests/e2e/aa1Emu.mjs pro       the harness account to Pro, so an add is not refused by the Free plan's cap
 *   node tests/e2e/aa1Emu.mjs agents    the harness account's agents as JSON (id, name, agency, starRating, weeks, …)
 *
 * ⚠️ EVERY e2e:emu RUN IMPORTS THE COMMITTED SNAPSHOT AND EXPORTS NOTHING, so neither command can leave residue for the
 *    next run; the plan change lasts as long as this run's emulators.
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertTarget, EMULATOR_HOSTS, EMULATOR_PROJECT, ROOT } from "./fsTarget.mjs";

assertTarget(EMULATOR_PROJECT);
process.env.FIRESTORE_EMULATOR_HOST = EMULATOR_HOSTS.firestore;
const require = createRequire(resolve(ROOT, "functions/package.json"));
const admin = require("firebase-admin");
const db = admin.initializeApp({ projectId: EMULATOR_PROJECT }, "aa1-emu").firestore();
const { uid } = JSON.parse(readFileSync(resolve(ROOT, "tests/emulator-seed/harness.json"), "utf8"));

const cmd = process.argv[2];
if (cmd === "pro") {
  await db.doc(`users/${uid}`).set({ plan: "Pro" }, { merge: true });
  console.log("pro");
} else if (cmd === "agents") {
  const s = await db.collection(`users/${uid}/agents`).get();
  console.log(JSON.stringify(s.docs.map((d) => {
    const a = d.data();
    return { id: d.id, name: a.name ?? "", agency: a.agency ?? "", starRating: a.starRating ?? null, weeks: a.responseTimeWeeks ?? null,
      agencyUnknown: a.agencyUnknown ?? null, submissionMethod: a.submissionMethod ?? null, submissionMethodOther: a.submissionMethodOther ?? null };
  })));
} else {
  console.error("usage: aa1Emu.mjs pro|agents");
  process.exit(2);
}
process.exit(0);
