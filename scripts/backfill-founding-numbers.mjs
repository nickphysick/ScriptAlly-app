#!/usr/bin/env node
/**
 * Backfill founding and reserve numbers for writers confirmed before they existed.
 *
 *   node scripts/backfill-founding-numbers.mjs --project <id> --database <id>            (dry run)
 *   node scripts/backfill-founding-numbers.mjs --project <id> --database <id> --apply    (writes)
 *
 * DRY RUN BY DEFAULT: it prints what it WOULD assign and writes nothing. `--apply` writes the
 * plan, and the counter's numbering fields, in ONE transaction, which re-reads everything first.
 * Idempotent: anyone who already has a number is left alone, so a second run finds nothing to do.
 *
 * ⚠️ IT NEVER PRINTS AN EMAIL ADDRESS. Rows are shown by document id (a hash of the address).
 *
 * Credentials: Application Default Credentials (`gcloud auth application-default login`, or
 * GOOGLE_APPLICATION_CREDENTIALS pointing at a service-account key), or FIRESTORE_EMULATOR_HOST
 * for the emulator.
 */
import { createRequire } from "node:module";
import { planFoundingBackfill } from "./foundingBackfillPlan.mjs";

const require = createRequire(new URL("../functions/package.json", import.meta.url));
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const project = arg("--project");
const database = arg("--database");
const apply = process.argv.includes("--apply");
if (!project || !database) {
  console.error("usage: node scripts/backfill-founding-numbers.mjs --project <id> --database <id> [--apply]");
  process.exit(2);
}

const app = admin.initializeApp({ projectId: project });
const db = database === "(default)" ? getFirestore(app) : getFirestore(app, database);
const ms = (v) => (v && typeof v.toMillis === "function" ? v.toMillis() : v instanceof Date ? v.getTime() : null);

const plan = await db.runTransaction(async (tx) => {
  const snap = await tx.get(db.collection("waitlist"));
  const docs = snap.docs.map((d) => ({
    id: d.id,
    status: d.get("status"),
    foundingNumber: d.get("foundingNumber") ?? null,
    verifiedAt: ms(d.get("verifiedAt")),
    reserveNumber: d.get("reserveNumber") ?? null,
    spentAt: ms(d.get("verifyTokenSpentAt")),
  }));
  const p = planFoundingBackfill(docs);
  if (apply && (p.founding.length || p.reserve.length)) {
    for (const f of p.founding) tx.set(db.doc(`waitlist/${f.id}`), { foundingNumber: f.foundingNumber, position: f.foundingNumber }, { merge: true });
    for (const r of p.reserve) tx.set(db.doc(`waitlist/${r.id}`), { reserveNumber: r.reserveNumber }, { merge: true });
    tx.set(db.doc("counters/waitlist"), { freedNumbers: p.counter.freedNumbers, reserveIssued: p.counter.reserveIssued }, { merge: true });
  }
  return { ...p, scanned: docs.length };
});

console.log(`${apply ? "APPLIED" : "DRY RUN"} · project ${project} · database ${database}`);
console.log(`waitlist documents: ${plan.scanned} · confirmed: ${plan.verified}`);
for (const f of plan.founding) console.log(`  founding  ${f.id.slice(0, 12)}…  → No. ${f.foundingNumber}`);
for (const r of plan.reserve) console.log(`  reserve   ${r.id.slice(0, 12)}…  → reserve ${r.reserveNumber}`);
if (!plan.founding.length && !plan.reserve.length) console.log("  nothing to assign");
console.log(`counter: freedNumbers ${JSON.stringify(plan.counter.freedNumbers)} · reserveIssued ${plan.counter.reserveIssued}`);
await app.delete();
