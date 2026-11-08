/**
 * AI spend guard, Phase 1 — the daily limit on the three limited AI callables, against a real
 * Firestore emulator.
 *
 * ⚠️ NO LIVE AI CALL IS POSSIBLE FROM THIS FILE. `@anthropic-ai/sdk` is replaced by a constructor
 * whose `messages.create` throws, and each feature's model step (`assistFromModel`,
 * `extractProposal`, `proposeCandidates`/`verifyCandidates`) is replaced by a spy. The spies are
 * what "the model was invoked" means below; the constructor count is the stronger claim that a
 * refused call never even built a client.
 *
 * `.emulator.spec.ts` so only `npm run test:functions` (under `firebase emulators:exec`) collects it.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

/* The secret is read at call time; a placeholder is enough because the SDK is mocked out. */
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "test-placeholder-not-a-key";

const sdk = vi.hoisted(() => ({ constructed: 0 }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class FakeAnthropic {
    messages = { create: () => { throw new Error("a live Anthropic call was attempted in a test"); } };
    constructor() { sdk.constructed += 1; }
  },
}));

const model = vi.hoisted(() => ({
  assist: vi.fn(async () => [] as unknown[]),
  email: vi.fn(async () => ({ records: [], unplaced: [] })),
  propose: vi.fn(async () => [] as unknown[]),
  verify: vi.fn(async () => [] as unknown[]),
}));
vi.mock("./assistAgentDataCore", async (orig) => ({ ...(await orig<object>()), assistFromModel: model.assist }));
vi.mock("./emailImportCore", async (orig) => ({ ...(await orig<object>()), extractProposal: model.email }));
vi.mock("./suggestCompsCore", async (orig) => ({
  ...(await orig<object>()),
  proposeCandidates: model.propose,
  verifyCandidates: model.verify,
}));

import { db } from "./firestore";
import { assistAgentData } from "./assistAgentData";
import { extractFromEmail } from "./emailImport";
import { suggestComps } from "./suggestComps";
import { limitDocPath, utcDay, type AiFeature } from "./aiRateLimit";

const UID = "ai-limit-writer";
const LIMIT = 10; // every feature defaults to the Scout's number

type Run = (req: unknown) => Promise<unknown>;
const call = (fn: unknown, data: Record<string, unknown>) =>
  ((fn as { run: Run }).run)({ auth: { uid: UID, token: {} }, data, acceptsStreaming: false, rawRequest: {} });

const FEATURES: { feature: AiFeature; fn: unknown; data: Record<string, unknown>; spy: () => number }[] = [
  {
    feature: "assistAgentData",
    fn: assistAgentData,
    data: { rule: "dq_responseTime", agents: [{ agentId: "a1", name: "Ada Agent", agency: "Agency" }] },
    spy: () => model.assist.mock.calls.length,
  },
  {
    feature: "extractFromEmail",
    fn: extractFromEmail,
    data: { manuscriptId: "ms-1", direction: "received", emailText: "Thanks for sending this." },
    spy: () => model.email.mock.calls.length,
  },
  {
    feature: "scout",
    fn: suggestComps,
    data: { manuscriptId: "ms-1" },
    spy: () => model.propose.mock.calls.length,
  },
];

beforeAll(() => {
  expect(process.env.FIRESTORE_EMULATOR_HOST, "run under `npm run test:functions`").toBeTruthy();
});

beforeEach(async () => {
  sdk.constructed = 0;
  for (const m of Object.values(model)) m.mockClear();
  for (const f of FEATURES) await db.doc(limitDocPath(UID, f.feature)).delete();
  await db.doc(`users/${UID}`).set({ plan: "Pro" });
  await db.doc(`users/${UID}/manuscripts/ms-1`).set({ title: "A Book", genre: "Fantasy", ageCategory: "Adult" });
});

type Refusal = { code?: string; details?: { reason?: string; feature?: string } };
/** The error a call rejected with, or null if it resolved. */
const refusal = (p: Promise<unknown>): Promise<Refusal | null> =>
  p.then(() => null, (e: unknown) => e as Refusal);

const yesterday = () => utcDay(new Date(Date.now() - 24 * 60 * 60 * 1000));

for (const f of FEATURES) {
  describe(`${f.feature}: ${LIMIT} runs a UTC day, claimed before the model call`, () => {
    it("the first call passes and reaches the model", async () => {
      await call(f.fn, f.data);
      expect(f.spy()).toBe(1);
      expect(sdk.constructed).toBe(1);
      const snap = await db.doc(limitDocPath(UID, f.feature)).get();
      expect(snap.get("day")).toBe(utcDay());
      expect(snap.get("count")).toBe(1);
    });

    it(`call ${LIMIT + 1} on the same day is refused without the model being invoked`, async () => {
      for (let i = 0; i < LIMIT; i++) await call(f.fn, f.data);
      expect(f.spy()).toBe(LIMIT);
      const built = sdk.constructed;
      const err = await refusal(call(f.fn, f.data));
      expect(err?.code).toBe("resource-exhausted");
      expect(err?.details).toEqual({ reason: "daily_limit", feature: f.feature });
      expect(f.spy(), "the refused call reached the model").toBe(LIMIT);
      expect(sdk.constructed, "the refused call built an Anthropic client").toBe(built);
    });

    it("the next UTC day passes again", async () => {
      await db.doc(limitDocPath(UID, f.feature)).set({ day: yesterday(), count: LIMIT });
      await call(f.fn, f.data);
      expect(f.spy()).toBe(1);
      const snap = await db.doc(limitDocPath(UID, f.feature)).get();
      expect(snap.get("day")).toBe(utcDay());
      expect(snap.get("count")).toBe(1);
    });
  });
}

describe("a failed run still costs its slot", () => {
  it("assistAgentData: a model failure is counted", async () => {
    model.assist.mockRejectedValueOnce(new Error("upstream failed"));
    await expect(call(assistAgentData, FEATURES[0].data)).rejects.toMatchObject({ code: "unavailable" });
    const snap = await db.doc(limitDocPath(UID, "assistAgentData")).get();
    expect(snap.get("count")).toBe(1);
  });
});

describe("the limit is per feature", () => {
  it("spending the email allowance leaves assisted fill untouched", async () => {
    await db.doc(limitDocPath(UID, "extractFromEmail")).set({ day: utcDay(), count: LIMIT });
    await call(assistAgentData, FEATURES[0].data);
    expect(model.assist).toHaveBeenCalledTimes(1);
  });
});
