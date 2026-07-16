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
  it("base case is unchanged by the enrichment (NudgeModal parity)", () => {
    expect(nudgeDraft({ agentName: "Juliet Mushens", dateSent: "2026-01-08T00:00:00Z" })).toBe(
      [
        "Dear Juliet,",
        "",
        "I hope this finds you well. I'm writing to gently follow up on my query, sent on 8 January 2026. I remain very enthusiastic about the possibility of working together, and would be grateful for any update when you have a moment.",
        "",
        "With thanks for your time,",
      ].join("\n"),
    );
  });
  it("weaves in real query data when known — title, requested material, request date", () => {
    const d = nudgeDraft({
      agentName: "David Higham",
      dateSent: "2026-01-08T00:00:00Z",
      msTitle: "The Book of Lost Clockworks",
      requested: "the full manuscript",
      requestedDate: "2026-03-29T00:00:00Z",
    });
    expect(d).toContain("Dear David,");
    expect(d).toContain("regarding THE BOOK OF LOST CLOCKWORKS");
    expect(d).toContain("sent on 8 January 2026");
    expect(d).toContain("You kindly requested the full manuscript on 29 March 2026");
    expect(d).toContain("resend the materials");
  });
  it("requested without a date still reads whole", () => {
    const d = nudgeDraft({ agentName: "X", requested: "the partial" });
    expect(d).toContain("You kindly requested the partial,");
  });
});
