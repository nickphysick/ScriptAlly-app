/**
 * Query actions v1 — the §R rules: the drawer's flat query fields, the two new statuses, and the
 * Activity `eventKey` in both stores. And the proof the allowlist is still an allowlist: an
 * UNLISTED field is denied.
 *
 * ⚠️ PROVED RED FIRST. `SA_RULES_FILE=<the rules before §R> npm run test:rules` runs this same file
 * against the old ruleset; every "allowed" case must fail there. That is the only evidence the
 * cases test the change and not something that was already allowed.
 */
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, afterEach, beforeAll, describe, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_PATH = process.env.SA_RULES_FILE ? resolve(process.env.SA_RULES_FILE) : resolve(__dirname, "../../firestore.rules");
const U = "qa-writer";
let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-scriptally-qa",
    firestore: { rules: readFileSync(RULES_PATH, "utf8"), host: "127.0.0.1", port: 8080 },
  });
});
afterAll(async () => { await env.cleanup(); });
afterEach(async () => { await env.clearFirestore(); });

const me = () => env.authenticatedContext(U).firestore();
const seed = (path: string, data: Record<string, unknown>) =>
  env.withSecurityRulesDisabled(async (c) => { await setDoc(doc(c.firestore(), path), data); });

const q = (extra: Record<string, unknown> = {}) => ({
  id: "q-1", userId: U, manuscriptId: "ms-1", agentId: "ag-1", packageId: "", status: "Queried", sendMethod: "Email", ...extra,
});

const DRAWER_FIELDS: Record<string, unknown> = {
  sentPackageId: "pkg-1",
  sentMaterials: "Standard package: Query letter and first 3 chapters",
  sentVersions: ["Query letter · QL v3"],
  lastSentLabel: "First 50 pages",
  requery: true,
  requestFrom: 40,
  requestFromUnit: "page",
  requestSynopsis: true,
  closePlan: "2026-10-25T11:00:00.000Z",
  nrmnOverride: false,
  offerRefQueryId: "q-2",
  offerTold: false,
  offerReply: "full",
  offerToldOn: "2026-09-28T11:00:00.000Z",
  offerCall: "booked",
  offerCallOn: "2026-09-29T11:00:00.000Z",
  withdrawTold: false,
  agentRecheckOn: "2026-12-27T12:00:00.000Z",
};

describe("§R query fields", () => {
  for (const [k, v] of Object.entries(DRAWER_FIELDS)) {
    it(`an UPDATE may write ${k}`, async () => {
      await seed(`users/${U}/queries/q-1`, q());
      await assertSucceeds(updateDoc(doc(me(), `users/${U}/queries/q-1`), { [k]: v }));
    });
  }
  it("a query may be CREATED carrying every drawer field", async () => {
    await assertSucceeds(setDoc(doc(me(), `users/${U}/queries/q-1`), q(DRAWER_FIELDS)));
  });
  it("an UNLISTED field is still denied on update — the allowlist is intact", async () => {
    await seed(`users/${U}/queries/q-1`, q());
    await assertFails(updateDoc(doc(me(), `users/${U}/queries/q-1`), { notAField: true }));
  });
  it("a malformed drawer field is denied (offerReply outside its set)", async () => {
    await seed(`users/${U}/queries/q-1`, q());
    await assertFails(updateDoc(doc(me(), `users/${U}/queries/q-1`), { offerReply: "maybe" }));
  });
});

describe("§R statuses", () => {
  for (const st of ["Resubmitted", "Signed"]) {
    it(`a query may be at ${st}`, async () => {
      await seed(`users/${U}/queries/q-1`, q());
      await assertSucceeds(updateDoc(doc(me(), `users/${U}/queries/q-1`), { status: st }));
    });
    it(`a nested rung may carry resultingStatus ${st}`, async () => {
      await assertSucceeds(setDoc(doc(me(), `users/${U}/queries/q-1/activity/a-1`), {
        type: st, resultingStatus: st, createdAt: "2026-09-27T11:00:00.000Z", note: "x", queryId: "q-1",
      }));
    });
    it(`a feed row may carry resultingStatus ${st}`, async () => {
      await assertSucceeds(setDoc(doc(me(), `users/${U}/activities/a-1`), {
        id: "a-1", userId: U, queryId: "q-1", manuscriptId: "ms-1", activityType: "Status Changed",
        description: "x", date: "2026-09-27T11:00:00.000Z", details: "", resultingStatus: st,
      }));
    });
  }
  it("a status outside the set is still denied", async () => {
    await seed(`users/${U}/queries/q-1`, q());
    await assertFails(updateDoc(doc(me(), `users/${U}/queries/q-1`), { status: "Signed with a flourish" }));
  });
});

describe("§R eventKey", () => {
  it("a nested rung may carry an eventKey", async () => {
    await assertSucceeds(setDoc(doc(me(), `users/${U}/queries/q-1/activity/a-1`), {
      type: "Queried", resultingStatus: "Queried", createdAt: "2026-09-27T11:00:00.000Z", note: "x", queryId: "q-1", eventKey: "query_sent",
    }));
  });
  it("a feed row's eventKey may be written back by an undo (UPDATE)", async () => {
    await seed(`users/${U}/activities/a-1`, {
      id: "a-1", userId: U, queryId: "q-1", manuscriptId: "ms-1", activityType: "Status Changed", description: "x", date: "2026-09-27T11:00:00.000Z", details: "",
    });
    await assertSucceeds(updateDoc(doc(me(), `users/${U}/activities/a-1`), { eventKey: "pass" }));
  });
  it("an unlisted nested key is still denied", async () => {
    await assertFails(setDoc(doc(me(), `users/${U}/queries/q-1/activity/a-1`), {
      type: "Queried", createdAt: "2026-09-27T11:00:00.000Z", note: "x", notAField: 1,
    }));
  });
});
