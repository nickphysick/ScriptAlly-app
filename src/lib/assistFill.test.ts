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
  isProUser,
  AssistFillError,
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
  it("defaults OFF (function undeployed)", () => {
    expect(ASSIST_LIVE).toBe(false);
    expect(assistLive()).toBe(false);
  });
  it("honours the global override in both directions", () => {
    G.__SA_ASSIST_LIVE = true;
    expect(assistLive()).toBe(true);
    G.__SA_ASSIST_LIVE = false;
    expect(assistLive()).toBe(false);
  });
});

describe("isProUser (re-exported, one predicate)", () => {
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
  it("throws a graceful unavailable when not live and no mock", async () => {
    await expect(
      fetchAssistedFill({ rule: "dq_mswl", agents: [{ agentId: "a1", name: "Jo" }] }),
    ).rejects.toBeInstanceOf(AssistFillError);
    await expect(
      fetchAssistedFill({ rule: "dq_mswl", agents: [{ agentId: "a1", name: "Jo" }] }),
    ).rejects.toMatchObject({ code: "unavailable" });
  });
});
