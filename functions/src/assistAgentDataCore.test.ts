import { describe, it, expect, vi } from "vitest";
import {
  validateFound,
  assistFromModel,
  isAssistRule,
  MalformedAssistError,
  AssistInput,
  AnthropicLike,
} from "./assistAgentDataCore";

const input = (rule: AssistInput["rule"]): AssistInput => ({
  rule,
  agents: [
    { agentId: "a1", name: "Ann Agent", agency: "Lit Co" },
    { agentId: "a2", name: "Bo Agent" },
  ],
});

const modelReturning = (text: string): AnthropicLike => ({
  messages: { create: vi.fn().mockResolvedValue({ content: [{ type: "text", text }] }) },
});

describe("isAssistRule", () => {
  it("accepts the three data-quality rules only", () => {
    expect(isAssistRule("dq_responseTime")).toBe(true);
    expect(isAssistRule("dq_materials")).toBe(true);
    expect(isAssistRule("dq_mswl")).toBe(true);
    expect(isAssistRule("no_response_close")).toBe(false);
    expect(isAssistRule("garbage")).toBe(false);
    expect(isAssistRule(undefined)).toBe(false);
  });
});

describe("validateFound — provenance is mandatory", () => {
  it("drops an item with no source", () => {
    const out = validateFound({ found: [{ agentId: "a1", value: "6", source: "" }] }, input("dq_responseTime"));
    expect(out).toEqual([]);
  });
  it("drops an agentId we didn't ask about", () => {
    const out = validateFound({ found: [{ agentId: "zzz", value: "6", source: "site" }] }, input("dq_responseTime"));
    expect(out).toEqual([]);
  });
  it("throws when found is not an array", () => {
    expect(() => validateFound({ found: "nope" }, input("dq_mswl"))).toThrow(MalformedAssistError);
  });
  it("keeps one item per agent (first wins)", () => {
    const out = validateFound(
      { found: [
        { agentId: "a1", value: "6", source: "one", confidence: "high" },
        { agentId: "a1", value: "9", source: "two" },
      ] },
      input("dq_responseTime"),
    );
    expect(out).toHaveLength(1);
    expect(out[0].value).toBe("6");
    expect(out[0].confidence).toBe("high");
  });
});

describe("validateFound — per-rule value shaping", () => {
  it("responseTime: extracts weeks, rejects out-of-range", () => {
    expect(validateFound({ found: [{ agentId: "a1", value: "about 8 weeks", source: "s" }] }, input("dq_responseTime"))[0].value).toBe("8");
    expect(validateFound({ found: [{ agentId: "a1", value: "0", source: "s" }] }, input("dq_responseTime"))).toEqual([]);
    expect(validateFound({ found: [{ agentId: "a1", value: "9999", source: "s" }] }, input("dq_responseTime"))).toEqual([]);
  });
  it("materials: filters to the vocab (safety net over the model's mapping), drops when nothing maps", () => {
    // The model returns already-mapped vocab terms; validateFound just re-checks them against the set.
    expect(validateFound({ found: [{ agentId: "a1", value: "Query Letter, Sample Pages", source: "s" }] }, input("dq_materials"))[0].value)
      .toBe("Query Letter, Sample Pages");
    expect(validateFound({ found: [{ agentId: "a1", value: "a cover note only", source: "s" }] }, input("dq_materials"))).toEqual([]);
  });
  it("mswl: keeps free text, caps length", () => {
    const long = "x".repeat(1000);
    const out = validateFound({ found: [{ agentId: "a1", value: long, source: "s" }] }, input("dq_mswl"));
    expect(out[0].value.length).toBe(600);
  });
  it("defaults an unknown confidence to low", () => {
    const out = validateFound({ found: [{ agentId: "a1", value: "6", source: "s", confidence: "meh" }] }, input("dq_responseTime"));
    expect(out[0].confidence).toBe("low");
  });
});

describe("assistFromModel", () => {
  it("parses a good first response (strips fences)", async () => {
    const client = modelReturning('```json\n{"found":[{"agentId":"a1","value":"6","source":"agency site","confidence":"high"}]}\n```');
    const out = await assistFromModel(client, input("dq_responseTime"));
    expect(out).toEqual([{ agentId: "a1", value: "6", source: "agency site", confidence: "high" }]);
  });
  it("retries once on malformed, then succeeds", async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce({ content: [{ type: "text", text: "not json" }] })
      .mockResolvedValueOnce({ content: [{ type: "text", text: '{"found":[{"agentId":"a2","value":"12","source":"QT"}]}' }] });
    const out = await assistFromModel({ messages: { create } }, input("dq_responseTime"));
    expect(create).toHaveBeenCalledTimes(2);
    expect(out).toEqual([{ agentId: "a2", value: "12", source: "QT", confidence: "low" }]);
  });
  it("throws MalformedAssistError when both attempts fail", async () => {
    const client = modelReturning("still not json");
    await expect(assistFromModel(client, input("dq_mswl"))).rejects.toBeInstanceOf(MalformedAssistError);
  });
});
