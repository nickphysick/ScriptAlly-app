/**
 * Overnight fixes v1, Part 2, LF4: the harness account made genuinely empty in the EMULATOR, and put back.
 *
 *   node tests/e2e/onfEmptyAccount.mjs empty     # back up, then delete every query, agent and manuscript
 *   node tests/e2e/onfEmptyAccount.mjs count     # prints {"queries":n,"agents":n,"manuscripts":n}
 *   node tests/e2e/onfEmptyAccount.mjs restore   # writes the backup back, then deletes it
 *
 * Emulator only (assertTarget). The backup is a file in the OS temp folder, never in the repo: the snapshot is
 * imported fresh on every e2e run and nothing is exported, so a run that dies before `restore` loses nothing.
 */
import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { targetEnv, assertTarget, EMULATOR_PROJECT, ROOT } from "./fsTarget.mjs";

if (process.env.ALLOW_LIVE_FIRESTORE === "1") throw new Error("onfEmptyAccount.mjs only ever writes to the emulator; unset ALLOW_LIVE_FIRESTORE.");
targetEnv();
assertTarget(EMULATOR_PROJECT);
const { uid } = JSON.parse(readFileSync(resolve(ROOT, "tests/emulator-seed/harness.json"), "utf8"));
const admin = createRequire(resolve(ROOT, "functions/package.json"))("firebase-admin");
const db = admin.firestore(admin.initializeApp({ projectId: EMULATOR_PROJECT }, "onf-empty"));
const COLS = ["queries", "agents", "manuscripts"];
const BACKUP = join(tmpdir(), `onf-empty-${EMULATOR_PROJECT}-${uid}.json`);
const col = (c) => db.collection("users").doc(uid).collection(c);
/* Firestore Timestamps survive the JSON round trip as {__ts: [seconds, nanos]} */
const { Timestamp } = admin.firestore;
const enc = (v) => (v instanceof Timestamp ? { __ts: [v.seconds, v.nanoseconds] }
  : Array.isArray(v) ? v.map(enc) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) : v);
const dec = (v) => (v && typeof v === "object" && !Array.isArray(v) && Array.isArray(v.__ts) ? new Timestamp(v.__ts[0], v.__ts[1])
  : Array.isArray(v) ? v.map(dec) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, dec(x)])) : v);

const cmd = process.argv[2];
if (cmd === "count") {
  const out = {};
  for (const c of COLS) out[c] = (await col(c).get()).size;
  console.log(JSON.stringify(out));
} else if (cmd === "empty") {
  if (existsSync(BACKUP)) throw new Error(`a backup is already waiting at ${BACKUP}: restore it first`);
  const backup = {};
  for (const c of COLS) {
    const snap = await col(c).get();
    backup[c] = snap.docs.map((d) => ({ id: d.id, data: enc(d.data()) }));
  }
  writeFileSync(BACKUP, JSON.stringify(backup));
  for (const c of COLS) for (const d of backup[c]) await col(c).doc(d.id).delete();
  console.log(JSON.stringify(Object.fromEntries(COLS.map((c) => [c, backup[c].length]))));
} else if (cmd === "restore") {
  if (!existsSync(BACKUP)) { console.log("nothing to restore"); process.exit(0); }
  const backup = JSON.parse(readFileSync(BACKUP, "utf8"));
  for (const c of COLS) for (const d of backup[c]) await col(c).doc(d.id).set(dec(d.data));
  rmSync(BACKUP);
  console.log(JSON.stringify(Object.fromEntries(COLS.map((c) => [c, backup[c].length]))));
} else {
  throw new Error(`unknown command ${cmd}`);
}
process.exit(0);
