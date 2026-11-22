/**
 * Log a query v1.1 — READS for the edit-in-place measurement, on the EMULATOR only (prints JSON, writes nothing except
 * `--restore-agent`, which puts an agent's editable fields back exactly as a reading had them, absent keys deleted).
 *
 *   node tests/e2e/laqEditDb.mjs --agent <id>                    # the agent's editable fields
 *   node tests/e2e/laqEditDb.mjs --notes <queryId>               # the query's notes (journalEntries)
 *   node tests/e2e/laqEditDb.mjs --query <queryId>               # the query's sent date, method and package fields
 *   node tests/e2e/laqEditDb.mjs --pick                          # a harness query with a dated Query sent step and an agent
 *   node tests/e2e/laqEditDb.mjs --restore-agent <id> '<json>'   # put the fields back (a safety net after a failed run)
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { targetEnv, assertTarget, EMULATOR_PROJECT, ROOT } from "./fsTarget.mjs";

if (process.env.ALLOW_LIVE_FIRESTORE === "1") throw new Error("laqEditDb.mjs only ever reads the emulator; unset ALLOW_LIVE_FIRESTORE.");
targetEnv();
assertTarget(EMULATOR_PROJECT);

const { uid } = JSON.parse(readFileSync(resolve(ROOT, "tests/emulator-seed/harness.json"), "utf8"));
const admin = createRequire(resolve(ROOT, "functions/package.json"))("firebase-admin");
const db = admin.firestore(admin.initializeApp({ projectId: EMULATOR_PROJECT }, "laq-edit"));
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const FIELDS = ["responseTimeWeeks", "noResponseMeansNo", "materialsWanted", "submissionMethod", "mswlNotes", "mswlCheckedAt", "email", "website"];
const pick = (o, ks) => Object.fromEntries(ks.map((k) => [k, o?.[k] ?? null]));

if (arg("--agent")) {
  const d = (await db.doc(`users/${uid}/agents/${arg("--agent")}`).get()).data();
  console.log(JSON.stringify(pick(d, ["name", ...FIELDS])));
} else if (arg("--notes")) {
  const s = await db.collection(`users/${uid}/journalEntries`).where("queryId", "==", arg("--notes")).get();
  console.log(JSON.stringify(s.docs.map((x) => ({ id: x.id, text: x.data().entryText }))));
} else if (arg("--query")) {
  const ref = db.doc(`users/${uid}/queries/${arg("--query")}`);
  const d = (await ref.get()).data();
  /* the Query sent step's own date (local day) and pieces: what its step editor writes */
  const acts = await ref.collection("activity").get();
  const q = acts.docs.find((a) => (a.data().resultingStatus ?? a.data().type) === "Queried")?.data();
  const at = q?.createdAt?.toDate ? q.createdAt.toDate() : q?.createdAt ? new Date(q.createdAt) : null;
  const day = at ? `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}` : null;
  console.log(JSON.stringify({ ...pick(d, ["agentId", "dateSent", "sendMethod", "sentHow", "packageId", "sentPackageId", "status"]), stepDay: day, stepMats: Array.isArray(q?.materials) ? q.materials.length : 0 }));
} else if (process.argv.includes("--pick")) {
  const qs = await db.collection(`users/${uid}/queries`).get();
  const out = [];
  for (const q of qs.docs) {
    const d = q.data();
    if (!d.agentId || !d.dateSent) continue;
    const acts = await q.ref.collection("activity").get();
    const sent = acts.docs.find((a) => (a.data().resultingStatus ?? a.data().type) === "Queried");
    if (!sent) continue;
    out.push({ id: q.id, agentId: d.agentId, status: d.status, steps: acts.size });
  }
  out.sort((a, b) => b.steps - a.steps);
  console.log(JSON.stringify(out.slice(0, 8)));
} else if (arg("--restore-agent")) {
  const want = JSON.parse(process.argv[process.argv.indexOf("--restore-agent") + 2]);
  const patch = {};
  for (const k of FIELDS) patch[k] = want[k] == null ? admin.firestore.FieldValue.delete() : want[k];
  await db.doc(`users/${uid}/agents/${arg("--restore-agent")}`).update(patch);
  console.log("restored");
}
process.exit(0);
