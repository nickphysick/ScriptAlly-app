/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, afterEach } from "vitest";
import {
  ASSIST_LIVE,
  assistLive,
  validateAssistPayload,
  fetchAssistedFill,
  raceTimeout,
  withProvenance,
  isProUser,
  AssistFillError,
  AssistFound,
} from "./assistFill";
import { UserPlan } from "../types";

const G = globalThis as {
  __SA_ASSIST_LIVE?: boolean;
  __SA_ASSIST_FILL_MOCK?: unknown;
};

afterEach(() => {
  delete G.__SA_ASSIST_LIVE;
  delete G.__SA_ASSIST_FILL_MOCK;
});

describe("assistLive flag", () => {
  it("defaults ON (P5 re-issue: Blaze + API key in place; the function deploy is Nick's)", () => {
    expect(ASSIST_LIVE).toBe(true);
    expect(assistLive()).toBe(true);
  });
  it("honours the global override in both directions", () => {
    G.__SA_ASSIST_LIVE = false;
    expect(assistLive()).toBe(false);
    G.__SA_ASSIST_LIVE = true;
    expect(assistLive()).toBe(true);
  });
});

describe("isProUser (re-exported, one predicate — the free→gated / Pro→live fork)", () => {
  it("gates on the Pro plan", () => {
    expect(isProUser({ plan: UserPlan.PRO })).toBe(true);
    expect(isProUser({ plan: UserPlan.FREE })).toBe(false);
    expect(isProUser(null)).toBe(false);
  });
});

describe("validateAssistPayload", () => {
  it("keeps well-formed rows with provenance", () => {
    const out = validateAssistPayload({
      found: [
        { agentId: "a1", value: "6", source: "agency site", confidence: "high" },
        { agentId: "a2", value: "Query Letter, Synopsis", source: "https://x.example" },
      ],
    });
    expect(out).toEqual([
      { agentId: "a1", value: "6", source: "agency site", confidence: "high" },
      { agentId: "a2", value: "Query Letter, Synopsis", source: "https://x.example" },
    ]);
  });
  it("drops rows with no provenance (source) — provenance is mandatory", () => {
    expect(validateAssistPayload({ found: [{ agentId: "a1", value: "6", source: "" }] })).toEqual([]);
    expect(validateAssistPayload({ found: [{ agentId: "a1", value: "6" }] })).toEqual([]);
  });
  it("drops rows missing agentId or value", () => {
    expect(validateAssistPayload({ found: [{ value: "6", source: "s" }] })).toEqual([]);
    expect(validateAssistPayload({ found: [{ agentId: "a1", source: "s" }] })).toEqual([]);
  });
  it("ignores an unknown confidence", () => {
    const [row] = validateAssistPayload({ found: [{ agentId: "a1", value: "6", source: "s", confidence: "meh" }] });
    expect(row.confidence).toBeUndefined();
  });
  it("returns [] for a non-list payload", () => {
    expect(validateAssistPayload({})).toEqual([]);
    expect(validateAssistPayload(null)).toEqual([]);
    expect(validateAssistPayload({ found: "nope" })).toEqual([]);
  });
});

describe("fetchAssistedFill", () => {
  it("uses the mock hook when present (no function call)", async () => {
    G.__SA_ASSIST_FILL_MOCK = { found: [{ agentId: "a1", value: "8", source: "MSWL" }] };
    const out = await fetchAssistedFill({ rule: "dq_responseTime", agents: [{ agentId: "a1", name: "Jo" }] });
    expect(out).toEqual([{ agentId: "a1", value: "8", source: "MSWL" }]);
  });
  it("throws the graceful unavailable when force-disabled and no mock", async () => {
    G.__SA_ASSIST_LIVE = false;
    await expect(
      fetchAssistedFill({ rule: "dq_mswl", agents: [{ agentId: "a1", name: "Jo" }] }),
    ).rejects.toMatchObject({ code: "unavailable" });
  });
});

describe("raceTimeout — a hang never blocks the manual path", () => {
  it("passes a resolving promise through", async () => {
    await expect(raceTimeout(Promise.resolve("ok"), 1000)).resolves.toBe("ok");
  });
  it("throws the typed deadline error when the promise hangs", async () => {
    const hang = new Promise<never>(() => {});
    const p = raceTimeout(hang, 10);
    await expect(p).rejects.toBeInstanceOf(AssistFillError);
    await expect(p).rejects.toMatchObject({ code: "deadline-exceeded" });
  });
  it("propagates the underlying rejection unchanged", async () => {
    await expect(raceTimeout(Promise.reject(new Error("boom")), 1000)).rejects.toThrow("boom");
  });
});

describe("withProvenance — a found fact is never indistinguishable from a verified one", () => {
  const found: AssistFound = { agentId: "a1", value: "6", source: "agency page", confidence: "high" };

  it("attaches {source, foundAt} keyed by the field", () => {
    const out = withProvenance({ responseTimeWeeks: 6 }, "responseTimeWeeks", found, undefined, "2026-07-16T10:00:00.000Z");
    expect(out).toEqual({
      responseTimeWeeks: 6,
      fieldSources: { responseTimeWeeks: { source: "agency page", foundAt: "2026-07-16T10:00:00.000Z" } },
    });
  });
  it("merges into existing provenance (other fields survive)", () => {
    const existing = { mswlNotes: { source: "MSWL", foundAt: "2026-07-01T00:00:00.000Z" } };
    const out = withProvenance({ responseTimeWeeks: 6 }, "responseTimeWeeks", found, existing, "2026-07-16T10:00:00.000Z");
    expect(out.fieldSources).toEqual({
      mswlNotes: { source: "MSWL", foundAt: "2026-07-01T00:00:00.000Z" },
      responseTimeWeeks: { source: "agency page", foundAt: "2026-07-16T10:00:00.000Z" },
    });
  });
  it("returns the patch untouched when there is no found value (manual entry stays provenance-free)", () => {
    const patch = { mswlNotes: "typed by hand" };
    expect(withProvenance(patch, "mswlNotes", undefined, undefined, "2026-07-16T10:00:00.000Z")).toBe(patch);
  });
});
