import { describe, it, expect } from "vitest";
import { nudgeDraft } from "./nudgeDraft";

describe("nudgeDraft", () => {
  it("addresses the agent by first name", () => {
    expect(nudgeDraft({ agentName: "Juliet Mushens" })).toContain("Dear Juliet,");
  });
  it("falls back to 'there' with no agent name", () => {
    expect(nudgeDraft({ agentName: null })).toContain("Dear there,");
  });
  it("includes the send date when present, omits it otherwise", () => {
    const withDate = nudgeDraft({ agentName: "X", dateSent: "2026-01-08T00:00:00Z" });
    expect(withDate).toContain("sent on 8 January 2026");
    expect(nudgeDraft({ agentName: "X" })).not.toContain("sent on");
  });
  it("never claims to send anything (a copyable draft only)", () => {
    const d = nudgeDraft({ agentName: "X", dateSent: "2026-01-08T00:00:00Z" });
    expect(d).toContain("follow up on my query");
    expect(d).toContain("With thanks for your time,");
  });
});
