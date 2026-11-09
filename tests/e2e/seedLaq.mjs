/**
 * Log a query v1 — the milestone case's padding, on the EMULATOR only. The milestone at n = 25 needs the book to hold 24
 * queries before the log; the harness book holds fewer, so this seeds closed (Rejected) queries under `laq-seed-` until
 * it does, and `--clean` removes them again. Closed, so no agent reads as "already querying" and no list counts them as
 * live. Every run removes what it wrote in the same run (the measurement's `afterAll`).
 *
 *   node tests/e2e/seedLaq.mjs --to 24 --book "Murphy's Day Out"   # pad that book to 24 queries
 *   node tests/e2e/seedLaq.mjs --clean                             # remove every laq-seed- document
 *   node tests/e2e/seedLaq.mjs --count --book "Murphy's Day Out"   # print the book's query count
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { targetEnv, assertTarget, EMULATOR_PROJECT, ROOT } from "./fsTarget.mjs";

if (process.env.ALLOW_LIVE_FIRESTORE === "1") throw new Error("seedLaq.mjs only ever writes to the emulator; unset ALLOW_LIVE_FIRESTORE.");
targetEnv();
assertTarget(EMULATOR_PROJECT);

const { uid } = JSON.parse(readFileSync(resolve(ROOT, "tests/emulator-seed/harness.json"), "utf8"));
const admin = createRequire(resolve(ROOT, "functions/package.json"))("firebase-admin");
const db = admin.firestore(admin.initializeApp({ projectId: EMULATOR_PROJECT }, "laq-seed"));
const PREFIX = "laq-seed-";
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };

async function bookId(title) {
  const ms = await db.collection(`users/${uid}/manuscripts`).get();
  const hit = ms.docs.find((d) => d.data().title === title);
  if (!hit) throw new Error(`no manuscript titled ${title}`);
  return hit.id;
}
async function count(msId) {
  return (await db.collection(`users/${uid}/queries`).where("manuscriptId", "==", msId).get()).size;
}

if (process.argv.includes("--clean")) {
  let gone = 0;
  /* --clean-today: any query on the harness book dated today, with its log and feed rows. The fixture holds none (it is
     dated in the past), so anything dated today was written by a run whose Undo did not happen. Reported, never silent. */
  if (process.argv.includes("--clean-today")) {
    const msId = await bookId(arg("--book") ?? "Murphy's Day Out");
    const today = new Date().toISOString().slice(0, 10);
    for (const q of (await db.collection(`users/${uid}/queries`).where("manuscriptId", "==", msId).get()).docs) {
      if (!String(q.data().dateSent ?? "").startsWith(today)) continue;
      for (const a of (await q.ref.collection("activity").get()).docs) await a.ref.delete();
      for (const c of ["activities", "journalEntries", "taskFlags"]) for (const d of (await db.collection(`users/${uid}/${c}`).where("queryId", "==", q.id).get()).docs) await d.ref.delete();
      await q.ref.delete();
      console.log(`laq: removed a query left by an undone log (${q.id})`);
      gone++;
    }
  }
  for (const c of ["queries", "activities"]) {
    for (const d of (await db.collection(`users/${uid}/${c}`).get()).docs) {
      if (d.id.startsWith(PREFIX) || String(d.data().queryId ?? "").startsWith(PREFIX)) { await d.ref.delete(); gone++; }
    }
  }
  console.log(`laq: removed ${gone}`);
  process.exit(0);
}
const msId = await bookId(arg("--book") ?? "Murphy's Day Out");
if (process.argv.includes("--count")) { console.log(await count(msId)); process.exit(0); }
const to = Number(arg("--to"));
const have = await count(msId);
const b = db.batch();
for (let i = 0; i < to - have; i++) {
  const id = `${PREFIX}${i}`;
  const sent = new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10);
  b.set(db.doc(`users/${uid}/queries/${id}`), {
    id, userId: uid, manuscriptId: msId, agentId: `${PREFIX}agent`, status: "Rejected", dateSent: sent, lastStatusChange: sent,
    materialsWanted: ["Query Letter"], personalisationNotes: "", sendMethod: "Email", packageId: "",
  });
}
await b.commit();
console.log(`laq: ${have} → ${await count(msId)}`);
process.exit(0);
