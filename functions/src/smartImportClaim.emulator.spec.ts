/**
 * AI spend guard, Phase 2 — Smart Import claims its allowance BEFORE the model call, against a
 * real Firestore emulator.
 *
 * The question these answer has no answer outside a real transaction: five calls fired together
 * used to read "unused" and all reach the paid call. Now exactly one does.
 *
 * ⚠️ NO LIVE AI CALL IS POSSIBLE FROM THIS FILE. `@anthropic-ai/sdk` is a constructor whose
 * `messages.create` throws, and `mapSheet` — the model step — is a spy whose timing the test holds.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { Timestamp } from "firebase-admin/firestore";

process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "test-placeholder-not-a-key";

vi.mock("@anthropic-ai/sdk", () => ({
  default: class FakeAnthropic {
    messages = { create: () => { throw new Error("a live Anthropic call was attempted in a test"); } };
  },
}));

const GOOD = { result: { agents: [], queries: [] }, failure: null, usage: {}, ms: 1, attempts: 1 };
const core = vi.hoisted(() => ({ mapSheet: vi.fn(), mapPages: vi.fn() }));
vi.mock("./smartImportCore", async (orig) => ({
  ...(await orig<object>()),
  mapSheet: core.mapSheet,
  mapPages: core.mapPages,
}));

import { db } from "./firestore";
import { smartImportMap, PENDING_CLAIM_MS } from "./smartImport";

const UID = "si-claim-writer";
const ENT = `users/${UID}/private/entitlement`;
const call = () =>
  (smartImportMap as unknown as { run: (r: unknown) => Promise<unknown> }).run({
    auth: { uid: UID, token: {} },
    data: { sheetText: "Agent,Agency\nClara Voss,Pemberton" },
    acceptsStreaming: false,
    rawRequest: {},
  });
const settle = <T,>(p: Promise<T>) => p.then((v) => ({ ok: true as const, v }), (e: unknown) => ({ ok: false as const, e: e as { code?: string; details?: { reason?: string } } }));
const ent = async () => (await db.doc(ENT).get()).data() ?? {};

beforeAll(() => {
  expect(process.env.FIRESTORE_EMULATOR_HOST, "run under `npm run test:functions`").toBeTruthy();
});

beforeEach(async () => {
  core.mapSheet.mockReset();
  core.mapSheet.mockImplementation(async () => GOOD);
  await db.doc(ENT).delete();
  await db.doc(`users/${UID}`).set({ plan: "Free" });
});

describe("Smart Import: claim, then call", () => {
  it("five parallel calls: exactly one reaches the model, the rest are told it is in progress", async () => {
    let release!: () => void;
    const held = new Promise<void>((r) => { release = r; });
    core.mapSheet.mockImplementation(async () => { await held; return GOOD; });

    let refusedSoFar = 0;
    const runs = Array.from({ length: 5 }, () =>
      settle(call()).then((o) => { if (!o.ok) refusedSoFar += 1; return o; }));
    /* Hold the winner inside the model step until the other four have all been answered, so each
       of them met its live claim — released earlier, a loser whose transaction retried after the
       winner had finished would (correctly) be told used instead. */
    await vi.waitFor(() => expect(refusedSoFar).toBe(4), { timeout: 15_000 });
    expect(core.mapSheet).toHaveBeenCalledTimes(1);
    release();
    const out = await Promise.all(runs);

    expect(core.mapSheet).toHaveBeenCalledTimes(1);
    expect(out.filter((o) => o.ok)).toHaveLength(1);
    const refused = out.filter((o) => !o.ok);
    expect(refused).toHaveLength(4);
    for (const r of refused) {
      expect(r.ok ? null : r.e.code).toBe("resource-exhausted");
      expect(r.ok ? null : r.e.details?.reason).toBe("in_progress");
    }
    const after = await ent();
    expect(after.smartImportFreeUsed).toBe(true);
    expect(after.smartImportPending).toBeUndefined();
  });

  it("success: the used flag is set and the claim is cleared", async () => {
    await call();
    const after = await ent();
    expect(after.smartImportFreeUsed).toBe(true);
    expect("smartImportPending" in after).toBe(false);
  });

  for (const failure of ["api", "badjson", "nonjson"] as const) {
    it(`a ${failure} failure clears the claim and leaves the allowance intact`, async () => {
      core.mapSheet.mockImplementation(async () => ({ ...GOOD, result: null, failure }));
      const r = await settle(call());
      expect(r.ok).toBe(false);
      const after = await ent();
      expect(after.smartImportFreeUsed).toBeUndefined();
      expect("smartImportPending" in after).toBe(false);
      /* and the writer can try again at once */
      core.mapSheet.mockImplementation(async () => GOOD);
      await call();
      expect((await ent()).smartImportFreeUsed).toBe(true);
    });
  }

  it("a thrown model step clears the claim and leaves the allowance intact", async () => {
    core.mapSheet.mockImplementation(async () => { throw new Error("boom"); });
    const r = await settle(call());
    expect(r.ok).toBe(false);
    const after = await ent();
    expect(after.smartImportFreeUsed).toBeUndefined();
    expect("smartImportPending" in after).toBe(false);
  });

  it("a live claim (one minute old) refuses as in_progress without reaching the model", async () => {
    await db.doc(ENT).set({ smartImportPending: Timestamp.fromMillis(Date.now() - 60_000) });
    const r = await settle(call());
    expect(r.ok ? null : r.e.details?.reason).toBe("in_progress");
    expect(core.mapSheet).not.toHaveBeenCalled();
  });

  it("a stale claim (seven minutes old) is treated as abandoned and the import runs", async () => {
    expect(7 * 60_000).toBeGreaterThan(PENDING_CLAIM_MS);
    await db.doc(ENT).set({ smartImportPending: Timestamp.fromMillis(Date.now() - 7 * 60_000) });
    await call();
    expect(core.mapSheet).toHaveBeenCalledTimes(1);
    const after = await ent();
    expect(after.smartImportFreeUsed).toBe(true);
    expect("smartImportPending" in after).toBe(false);
  });

  it("a spent import is refused as used, before any claim (plan rules v1)", async () => {
    await db.doc(ENT).set({ smartImportFreeUsed: true });
    const r = await settle(call());
    expect(r.ok ? null : r.e.details?.reason).toBe("used");
    expect(core.mapSheet).not.toHaveBeenCalled();
    expect("smartImportPending" in (await ent())).toBe(false);
  });

  it("Pro: an import on record under the old monthly rule leaves none (plan rules v1: once per account)", async () => {
    await db.doc(`users/${UID}`).set({ plan: "Pro" });
    await db.doc(ENT).set({ smartImportLastUsedMonth: "2026-10" });
    const r = await settle(call());
    expect(r.ok ? null : r.e.details?.reason).toBe("used");
    expect(core.mapSheet).not.toHaveBeenCalled();
  });
});
