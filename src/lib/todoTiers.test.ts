/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the hero to-do card's tier logic (dashboard redesign, Phase 7).
 */
import { describe, it, expect } from "vitest";
import { TIER_PILL, tierFooter, tierHeader, todoTier } from "./todoTiers";

const c = (urgent = 0, housekeeping = 0, notes = 0) => ({ urgent, housekeeping, notes });

describe("⚠️ strict priority — one tier at a time, never mixed", () => {
  it("urgent wins over everything", () => {
    expect(todoTier(c(1, 26, 4))).toBe("urgent");
  });

  it("housekeeping only when nothing is urgent", () => {
    expect(todoTier(c(0, 26, 4))).toBe("housekeeping");
  });

  it("notes only when nothing is urgent and nothing needs tidying", () => {
    expect(todoTier(c(0, 0, 4))).toBe("notes");
  });

  it("all zero is its own state, not an empty urgent tier", () => {
    expect(todoTier(c(0, 0, 0))).toBe("clear");
  });

  /* Every transition, in order — the boundary is where a priority ladder goes wrong. */
  it("walks down the ladder as each tier empties", () => {
    expect(todoTier(c(1, 1, 1))).toBe("urgent");
    expect(todoTier(c(0, 1, 1))).toBe("housekeeping");
    expect(todoTier(c(0, 0, 1))).toBe("notes");
    expect(todoTier(c(0, 0, 0))).toBe("clear");
  });
});

describe("the headline", () => {
  /* ⚠️ THE SINGULAR AGREES WITH ITS VERB. "1 things require" is the sentence a reader meets most
     often on a quiet week, and getting it wrong makes a careful product feel careless. */
  it("agrees in number at one", () => {
    expect(tierHeader("urgent", c(1))).toBe("1 thing requires your attention");
  });

  it("is plural at two and above", () => {
    expect(tierHeader("urgent", c(2))).toBe("2 things require your attention");
    expect(tierHeader("urgent", c(11))).toBe("11 things require your attention");
  });

  it("the quiet tiers state their own case rather than counting", () => {
    expect(tierHeader("housekeeping", c(0, 26))).toBe("Spare some time to work on these");
    expect(tierHeader("notes", c(0, 0, 2))).toBe("Nothing on your to-do list, only notes");
    expect(tierHeader("clear", c())).toBe("Nothing needs you");
  });

  it("every tier has a pill", () => {
    expect(Object.values(TIER_PILL)).toEqual(["Urgent", "Housekeeping", "Notes to self", "All clear"]);
  });
});

describe("⚠️ the footer never states a zero", () => {
  it("names only the tiers that have something in them", () => {
    expect(tierFooter("urgent", c(3, 26, 0))).toBe("26 housekeeping");
    expect(tierFooter("urgent", c(3, 26, 2))).toBe("26 housekeeping · 2 notes");
    expect(tierFooter("housekeeping", c(0, 26, 2))).toBe("2 notes");
  });

  it("never mentions the tier it is already showing", () => {
    expect(tierFooter("notes", c(0, 0, 4))).not.toContain("note");
  });

  it("says so in words when nothing else is waiting", () => {
    expect(tierFooter("urgent", c(3))).toBe("Nothing else waiting");
    expect(tierFooter("clear", c())).toBe("Nothing waiting");
  });

  it("agrees in number on a single note", () => {
    expect(tierFooter("urgent", c(1, 0, 1))).toBe("1 note");
  });
});
