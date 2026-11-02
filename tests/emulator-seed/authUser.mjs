/**
 * Create the harness login in the AUTH EMULATOR: same uid and email as `harness.json`, password from
 * .env.local. Run at the start of every emulator session by scripts/emu.mjs.
 *
 * ⚠️ WHY THE AUTH EMULATOR IS NOT IN THE COMMITTED EXPORT: its accounts file stores the password as
 * `fakeHash:…:password=<plain text>`, and this repository is public. tests/emulator-data/ is committed
 * WITHOUT auth_export; the login is made here instead, from the password only .env.local holds.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { targetEnv, harnessPassword, assertTarget, EMULATOR_PROJECT, ROOT } from "../e2e/fsTarget.mjs";

if (process.env.ALLOW_LIVE_FIRESTORE === "1") throw new Error("authUser.mjs only ever writes to the emulator; unset ALLOW_LIVE_FIRESTORE.");
targetEnv(); // points firebase-admin at the emulator hosts
assertTarget(EMULATOR_PROJECT);

const { uid, email } = JSON.parse(readFileSync(resolve(ROOT, "tests/emulator-seed/harness.json"), "utf8"));
const password = harnessPassword();
if (!password) throw new Error("No SA_E2E_PASSWORD in the environment or .env.local");

const admin = createRequire(resolve(ROOT, "functions/package.json"))("firebase-admin");
const auth = admin.auth(admin.initializeApp({ projectId: EMULATOR_PROJECT }, "emu-auth"));
try { await auth.deleteUser(uid); } catch { /* not there yet */ }
await auth.createUser({ uid, email, password, emailVerified: true });
console.log(`auth emulator: ${email} (uid ${uid}) ready`);
process.exit(0);
