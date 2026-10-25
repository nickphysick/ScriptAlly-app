/**
 * An agent is named, never "she" or "he" (25 Oct, both layouts of the landing hero). The helper and the
 * strings built from it, including the fallback when no first name is saved.
 */
import { describe, it, expect } from "vitest";
import { agentRef, askedLabel, flipTitles, HERO_AGENT_FIRST, PHONE_STORY } from "./landingCopy";

const PRONOUN = /\b(she|her|hers|he|him|his)\b/i;

describe("agents are named, never she/he", () => {
  it("uses the first name when there is one", () => {
    expect(agentRef("Eleanor")).toBe("Eleanor");
    expect(agentRef("  Eleanor ", { start: true })).toBe("Eleanor");
  });
  it("falls back to the agent / The agent when no first name is saved", () => {
    for (const blank of ["", "   ", null, undefined]) {
      expect(agentRef(blank)).toBe("the agent");
      expect(agentRef(blank, { start: true })).toBe("The agent");
    }
    expect(askedLabel("")).toBe("The agent asked for");
    expect(flipTitles("")).toEqual({ partial: "The agent wants to read more!", full: "The agent wants the full!" });
  });
  it("the hero's notes are built from the demo agent's first name, and none says she or he", () => {
    expect(HERO_AGENT_FIRST).toBe("Eleanor");
    expect(PHONE_STORY.asked.label).toBe("Eleanor asked for");
    expect(PHONE_STORY.flip.partial.title).toBe("Eleanor wants to read more!");
    expect(PHONE_STORY.flip.full.title).toBe("Eleanor wants the full!");
    for (const s of [PHONE_STORY.asked.label, PHONE_STORY.flip.partial.title, PHONE_STORY.flip.full.title, ...PHONE_STORY.flip.partial.line, ...PHONE_STORY.flip.full.line, ...Object.values(PHONE_STORY.chips).map((c) => c[0])])
      expect(s, `"${s}"`).not.toMatch(PRONOUN);
  });
});
