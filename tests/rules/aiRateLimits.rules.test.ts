/**
 * AI spend guard — the daily limit documents are admin-only.
 *
 * `scoutRateLimits/{uid}` and `aiRateLimits/{uid}/features/{feature}` are written only by the AI
 * callables through the Admin SDK (functions/src/aiRateLimit.ts). The owner may not read, create,
 * overwrite or delete their own count: reading would reveal how many paid runs are left, and any
 * write would reset the limit it enforces.
 */
import { assertFails, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, afterEach, beforeAll, describe, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_PATH = process.env.SA_RULES_FILE ? resolve(process.env.SA_RULES_FILE) : resolve(__dirname, "../../firestore.rules");
const U = "ai-limit-writer";
let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-scriptally-ailimit",
    firestore: { rules: readFileSync(RULES_PATH, "utf8"), host: "127.0.0.1", port: 8080 },
  });
});
afterAll(async () => { await env.cleanup(); });
afterEach(async () => { await env.clearFirestore(); });

const as = (uid: string) => env.authenticatedContext(uid).firestore();
const seed = (path: string, data: Record<string, unknown>) =>
  env.withSecurityRulesDisabled(async (c) => { await setDoc(doc(c.firestore(), path), data); });

const PATHS = [
  `scoutRateLimits/${U}`,
  `aiRateLimits/${U}/features/assistAgentData`,
  `aiRateLimits/${U}/features/extractFromEmail`,
];

describe("AI daily limits are admin-only", () => {
  for (const path of PATHS) {
    it(`${path}: the owner cannot read, create, update or delete it`, async () => {
      await assertFails(setDoc(doc(as(U), path), { day: "2026-11-08", count: 0 }));
      await seed(path, { day: "2026-11-08", count: 10 });
      await assertFails(getDoc(doc(as(U), path)));
      await assertFails(updateDoc(doc(as(U), path), { count: 0 }));
      await assertFails(setDoc(doc(as(U), path), { day: "2026-11-08", count: 0 }));
      await assertFails(deleteDoc(doc(as(U), path)));
    });
  }
  it("an unauthenticated caller cannot touch them either", async () => {
    const anon = env.unauthenticatedContext().firestore();
    await seed(PATHS[1], { day: "2026-11-08", count: 10 });
    await assertFails(getDoc(doc(anon, PATHS[1])));
    await assertFails(deleteDoc(doc(anon, PATHS[1])));
  });
});
