/**
 * Seed the LOCAL EMULATOR with the harness account: its auth user (same uid, password from
 * .env.local) and every document in `harness.json`. Run by `npm run emu:seed`, which exports the
 * result to tests/emulator-data/ so later runs start from it with `--import` in about a second.
 *
 * ⚠️ EMULATOR ONLY. firebase-admin is pointed at the emulator hosts by fsTarget, and the project is
 * the demo- one, which the emulator refuses to connect to anything real.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { targetEnv, harnessPassword, assertTarget, EMULATOR_PROJECT, ROOT } from "../e2e/fsTarget.mjs";

if (process.env.ALLOW_LIVE_FIRESTORE === "1") throw new Error("seed.mjs only ever writes to the emulator; unset ALLOW_LIVE_FIRESTORE.");
targetEnv(); // sets FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST for firebase-admin
assertTarget(EMULATOR_PROJECT);

const require = createRequire(resolve(ROOT, "functions/package.json"));
const admin = require("firebase-admin");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

const seed = JSON.parse(readFileSync(resolve(ROOT, "tests/emulator-seed/harness.json"), "utf8"));
const password = harnessPassword();
if (!password) throw new Error("No SA_E2E_PASSWORD in the environment or .env.local");

const app = admin.initializeApp({ projectId: EMULATOR_PROJECT }, "emu-seed");
const auth = admin.auth(app);
try { await auth.deleteUser(seed.uid); } catch { /* fresh emulator */ }
await auth.createUser({ uid: seed.uid, email: seed.email, password, emailVerified: true });

const dec = (v) => {
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === "object") {
    if (Array.isArray(v.__ts) && Object.keys(v).length === 1) return new Timestamp(v.__ts[0], v.__ts[1]);
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, dec(x)]));
  }
  return v;
};

const db = getFirestore(app);
const entries = Object.entries(seed.docs);
for (let i = 0; i < entries.length; i += 400) {
  const batch = db.batch();
  for (const [path, data] of entries.slice(i, i + 400)) batch.set(db.doc(path), dec(data));
  await batch.commit();
}
console.log(`seeded ${entries.length} documents and ${seed.email} (uid ${seed.uid}) into the ${EMULATOR_PROJECT} emulator`);
process.exit(0);
