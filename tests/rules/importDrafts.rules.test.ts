/**
 * Dashboard first visit v2, Part F — `importDrafts/{uid}` and its `parts/{n}`: only the owner reads and writes them,
 * the meta has exactly its fields with `updatedAt` the server's time, and a part is `{ i, data }` at a numbered id.
 */
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { afterAll, afterEach, beforeAll, describe, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_PATH = process.env.SA_RULES_FILE ? resolve(process.env.SA_RULES_FILE) : resolve(__dirname, "../../firestore.rules");
const U = "fv2-writer";
const OTHER = "fv2-other";
let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-scriptally-fv2",
    firestore: { rules: readFileSync(RULES_PATH, "utf8"), host: "127.0.0.1", port: 8080 },
  });
});
afterAll(async () => { await env.cleanup(); });
afterEach(async () => { await env.clearFirestore(); });

const as = (uid: string) => env.authenticatedContext(uid).firestore();
const meta = (uid = U, extra: Record<string, unknown> = {}) => ({
  uid, fileName: "query-tracker-2026.xlsx", source: "smart", manuscriptId: "ms-1", step: "agents",
  agentsChecked: 23, agentsTotal: 31, queriesChecked: 0, queriesTotal: 40, queriesStarted: false,
  parts: 1, startedAt: "2026-10-29T21:14:00.000Z", updatedAt: serverTimestamp(), version: 1, ...extra,
});

describe("FV2 F · importDrafts", () => {
  it("the owner writes the meta and its parts, reads them, and deletes them", async () => {
    await assertSucceeds(setDoc(doc(as(U), `importDrafts/${U}/parts/0`), { i: 0, data: "{}" }));
    await assertSucceeds(setDoc(doc(as(U), `importDrafts/${U}`), meta()));
    await assertSucceeds(getDoc(doc(as(U), `importDrafts/${U}`)));
    await assertSucceeds(getDoc(doc(as(U), `importDrafts/${U}/parts/0`)));
    await assertSucceeds(deleteDoc(doc(as(U), `importDrafts/${U}/parts/0`)));
    await assertSucceeds(deleteDoc(doc(as(U), `importDrafts/${U}`)));
  });
  it("set-up's draft has no manuscript yet", async () => {
    await assertSucceeds(setDoc(doc(as(U), `importDrafts/${U}`), meta(U, { manuscriptId: null })));
  });
  it("another writer may neither read nor write it", async () => {
    await env.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), `importDrafts/${U}`), { uid: U });
      await setDoc(doc(c.firestore(), `importDrafts/${U}/parts/0`), { i: 0, data: "{}" });
    });
    await assertFails(getDoc(doc(as(OTHER), `importDrafts/${U}`)));
    await assertFails(getDoc(doc(as(OTHER), `importDrafts/${U}/parts/0`)));
    await assertFails(setDoc(doc(as(OTHER), `importDrafts/${U}`), meta(OTHER)));
    await assertFails(setDoc(doc(as(OTHER), `importDrafts/${U}/parts/1`), { i: 1, data: "x" }));
    await assertFails(deleteDoc(doc(as(OTHER), `importDrafts/${U}`)));
  });
  it("a draft naming another writer, at the writer's own id, is denied", async () => {
    await assertFails(setDoc(doc(as(U), `importDrafts/${U}`), meta(OTHER)));
  });
  it("an extra key, a client-set updatedAt, or a count above its total is denied", async () => {
    await assertFails(setDoc(doc(as(U), `importDrafts/${U}`), meta(U, { file: "the original file" })));
    await assertFails(setDoc(doc(as(U), `importDrafts/${U}`), meta(U, { updatedAt: "2026-10-01T00:00:00.000Z" })));
    await assertFails(setDoc(doc(as(U), `importDrafts/${U}`), meta(U, { agentsChecked: 32 })));
  });
  it("a part takes only { i, data } at a numbered id", async () => {
    await assertFails(setDoc(doc(as(U), `importDrafts/${U}/parts/x`), { i: 0, data: "{}" }));
    await assertFails(setDoc(doc(as(U), `importDrafts/${U}/parts/0`), { i: 0, data: "{}", file: "x" }));
    await assertFails(setDoc(doc(as(U), `importDrafts/${U}/parts/0`), { i: "0", data: "{}" }));
  });
});
