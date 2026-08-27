/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * What a group SAYS — the sentence under its title (Porcelain, Phase 2).
 *
 * ⚠️ THE CLOSED CASE IS THE ONE THAT MATTERS. Its sentence is derived from `CLOSED_LINGER_DAYS`
 * because the ref's own wording ("Kept for a month") contradicts the constant (seven days), and a
 * sentence taken from a normative artefact arrives looking approved. Asserting the DERIVATION
 * rather than the string is what stops the two drifting apart again — a `toBe("Kept for a week…")`
 * would go green over a constant that had moved to thirty.
 */
import { describe, it, expect } from "vitest";
import { groupSentence, inWords, GROUP_ORDER, GROUP_LABEL, CLOSED_LINGER_DAYS } from "./timelineGroups";

describe("group sentences", () => {
  it("states counts in words, and agrees with its own verb", () => {
    expect(groupSentence("offers", 1)).toBe("One offer, awaiting your answer.");
    expect(groupSentence("offers", 2)).toBe("Two offers, awaiting your answer.");
    expect(groupSentence("now", 1)).toBe("One agent is waiting on you.");
    expect(groupSentence("now", 4)).toBe("Four agents are waiting on you.");
  });

  it("falls back to the numeral past twenty, where the word stops helping", () => {
    expect(inWords(20)).toBe("Twenty");
    expect(inWords(21)).toBe("21");
    expect(groupSentence("now", 27)).toBe("27 agents are waiting on you.");
  });

  it("never leaves a group without something to say", () => {
    for (const g of GROUP_ORDER) {
      expect(groupSentence(g, 3), `${g} says nothing`).not.toBe("");
      expect(GROUP_LABEL[g], `${g} has no title`).toBeTruthy();
    }
    expect(GROUP_ORDER.length).toBe(6);
  });

  /* ⚠️ THE DERIVATION, NOT THE STRING. This is the assertion that survives the constant moving —
     and the one that fails if someone re-types the ref's "a month" over it. */
  it("the closed sentence cannot disagree with the constant it is about", () => {
    const said = groupSentence("closed", 2);
    const n: number = CLOSED_LINGER_DAYS;
    expect(said).toBe(n === 7 ? "Kept for a week, then it leaves." : `Kept for ${n} days, then it leaves.`);
    /* the ref's own wording is "a month"; if that is ever made true it must be made true in the
       CONSTANT, and this catches the reverse — copy edited to match a ref the code contradicts */
    if (n !== 30) expect(said).not.toContain("a month");
  });

  it("the pinned row's heading is not a seventh group", () => {
    expect((GROUP_ORDER as readonly string[]).includes("tasks")).toBe(false);
  });
});
