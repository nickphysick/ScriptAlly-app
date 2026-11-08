import { describe, it, expect } from "vitest";
import { aiRefusalReason, DAILY_LIMIT_MESSAGE } from "./aiRefusal";
import { DAILY_LIMIT_MESSAGE as SERVER_DAILY_LIMIT_MESSAGE } from "../../functions/src/aiRateLimit";

describe("aiRefusal", () => {
  it("reads the server's two refusal reasons off a callable error", () => {
    expect(aiRefusalReason({ code: "functions/resource-exhausted", details: { reason: "daily_limit", feature: "assistAgentData" } })).toBe("daily_limit");
    expect(aiRefusalReason({ details: { reason: "in_progress" } })).toBe("in_progress");
  });
  it("anything else is not a refusal", () => {
    expect(aiRefusalReason({ details: { reason: "free_used" } })).toBeNull();
    expect(aiRefusalReason(new Error("network"))).toBeNull();
    expect(aiRefusalReason(null)).toBeNull();
  });
  it("the browser and the server say the same words (functions cannot import from src)", () => {
    expect(DAILY_LIMIT_MESSAGE).toBe(SERVER_DAILY_LIMIT_MESSAGE);
  });
});
