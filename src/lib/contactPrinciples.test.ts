/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list principles v1 — CLP2 (unit half): the header's sentence for each case, word for word from the prompt,
 * and the no-matches and band copy. The rendered half is tests/e2e/clp1.measure.ts.
 */
import { describe, expect, it } from "vitest";
import { bandCount, clHeadline, headlineText, isDayOne, noMatchCopy } from "./contactPrinciples";

const h = (n: number, q: number, y: number) => clHeadline({ n, q, y });

describe("CLP2 · the live headline", () => {
  it("Your move > 0, not queried > 0", () => {
    expect(h(41, 22, 5)).toMatchObject({ lead: "5 need you.", rest: "19 not queried yet.", dayOne: false });
    expect(headlineText(h(41, 22, 1))).toBe("1 needs you. 19 not queried yet.");
  });
  it("Your move > 0, not queried = 0", () => {
    expect(headlineText(h(12, 12, 5))).toBe("5 need you. Everyone’s been queried.");
    expect(h(12, 12, 5).lead).toBe("5 need you.");
  });
  it("Your move = 0, not queried > 0", () => {
    expect(h(41, 22, 0)).toMatchObject({ lead: null, rest: "Nothing needs you right now. 19 not queried yet." });
  });
  it("both 0", () => {
    expect(headlineText(h(9, 9, 0))).toBe("Nothing needs you right now. Everyone’s been queried.");
  });
  it("day one: three or fewer, none queried", () => {
    expect(headlineText(h(1, 0, 0))).toBe("1 agent so far. Not queried yet.");
    expect(headlineText(h(2, 0, 0))).toBe("2 agents so far. Neither queried yet.");
    expect(headlineText(h(3, 0, 0))).toBe("3 agents so far. None queried yet.");
    expect(h(2, 0, 0).under).toBe("Add a few more and QueryHawk can start suggesting who to query next.");
    expect(isDayOne({ n: 4, q: 0, y: 0 })).toBe(false);
    expect(isDayOne({ n: 3, q: 1, y: 0 })).toBe(false);
    expect(isDayOne({ n: 0, q: 0, y: 0 })).toBe(false);
    expect(headlineText(h(4, 0, 0))).toBe("Nothing needs you right now. 4 not queried yet.");
  });
});

describe("the no-matches copy and the band's count", () => {
  it("names what is applied", () => {
    expect(noMatchCopy(["Domestic noir", "Your move"])).toEqual({
      title: "No agents match “Domestic noir” and “Your move”.",
      line: "Two filters together left nobody. Take one off, or clear them both.",
      removeLast: "Just remove “Your move”",
    });
    expect(noMatchCopy(["Domestic noir"])).toEqual({ title: "No agents match “Domestic noir”.", line: null, removeLast: null });
    expect(noMatchCopy([]).title).toBe("No agents match.");
  });
  it("the band reads Agents while loading or failed, 0 of n with no matches", () => {
    expect(bandCount(0, 41, "list")).toBe("0 of 41 agents");
    expect(bandCount(41, 41, "list")).toBe("41 agents");
    expect(bandCount(1, 1, "list")).toBe("1 agent");
    expect(bandCount(0, 0, "loading")).toBe("Agents");
    expect(bandCount(0, 0, "error")).toBe("Agents");
  });
});
