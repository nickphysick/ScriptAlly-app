/**
 * Controls: entry v1 — the agent's reply that moves nothing, in both stores. The documents are the REAL builder's
 * (`buildAgentReplyWrites`), so the rules are tested against what the app writes, not a hand-copied shape.
 *
 * ⚠️ PROVED RED FIRST: `SA_RULES_FILE=<the rules before this change> npm run test:rules` — every "allowed" case fails
 * there (the nested keys are outside `hasOnly`, the feed type is outside its list, the feed keys outside the update
 * allowlist). Recorded in reports/controls-entry-v1/REPORT.md.
 */
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { doc, setDoc, updateDoc, deleteField } from "firebase/firestore";
import { afterAll, afterEach, beforeAll, describe, it } from "vitest";
import { buildAgentReplyWrites, REPLY_KINDS } from "../../src/lib/agentReply";

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
const Q = { id: "q-1", manuscriptId: "ms-1", status: "Full Requested" } as never;
const writes = (kind: (typeof REPLY_KINDS)[number]) =>
  buildAgentReplyWrites(Q, { name: "Jonathan Marsh" }, { kind, on: "2026-11-24T12:00:00.000Z", date: "2026-12-04", words: "Any news on the manuscript?" });

describe("the nested row", () => {
  for (const kind of REPLY_KINDS) {
    it(`a ${kind} may be written with its kind, date and words`, async () => {
      await assertSucceeds(setDoc(doc(me(), `users/${U}/queries/q-1/activity/a-${kind}`), writes(kind).nested));
    });
  }
  it("its kind may be corrected and its date cleared", async () => {
    await seed(`users/${U}/queries/q-1/activity/a-1`, writes("chaser").nested);
    await assertSucceeds(updateDoc(doc(me(), `users/${U}/queries/q-1/activity/a-1`), { replyKind: "note", replyDate: deleteField() }));
  });
  it("a kind outside the three is denied", async () => {
    await assertFails(setDoc(doc(me(), `users/${U}/queries/q-1/activity/a-1`), { ...writes("note").nested, replyKind: "decision" }));
  });
  it("an unlisted nested key is still denied", async () => {
    await assertFails(setDoc(doc(me(), `users/${U}/queries/q-1/activity/a-1`), { ...writes("note").nested, replyMood: "warm" }));
  });
});

describe("the feed twin", () => {
  const feed = (kind: (typeof REPLY_KINDS)[number]) => ({ ...writes(kind).activity, id: "a-1", userId: U });
  for (const kind of REPLY_KINDS) {
    it(`a ${kind} twin may be written as 'Agent Reply'`, async () => {
      await assertSucceeds(setDoc(doc(me(), `users/${U}/activities/a-1`), feed(kind)));
    });
  }
  it("its kind, date and words may be corrected (UPDATE)", async () => {
    await seed(`users/${U}/activities/a-1`, feed("chaser"));
    await assertSucceeds(updateDoc(doc(me(), `users/${U}/activities/a-1`), { replyKind: "holding", replyDate: "2027-01-15", details: "Still reading." }));
  });
  it("its kind alone may be corrected", async () => {
    await seed(`users/${U}/activities/a-1`, feed("chaser"));
    await assertSucceeds(updateDoc(doc(me(), `users/${U}/activities/a-1`), { replyKind: "holding" }));
  });
  it("its words alone may be corrected", async () => {
    await seed(`users/${U}/activities/a-1`, feed("chaser"));
    await assertSucceeds(updateDoc(doc(me(), `users/${U}/activities/a-1`), { details: "Still reading." }));
  });
  it("a kind outside the three is denied", async () => {
    await assertFails(setDoc(doc(me(), `users/${U}/activities/a-1`), { ...feed("note"), replyKind: "decision" }));
  });
  it("an unknown activityType is still denied", async () => {
    await assertFails(setDoc(doc(me(), `users/${U}/activities/a-1`), { ...feed("note"), activityType: "Agent Mood" }));
  });
});
