/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list principles v1 — the no-matches and band copy; Contact list header v2 — CLH2-1, the header's headline and
 * subheader for each case. The rendered half is tests/e2e/clp1.measure.ts.
 */
import { describe, expect, it } from "vitest";
import { bandCount, clHeadline, DAY_ONE_UNDER, headlineText, isDayOne, noMatchCopy } from "./contactPrinciples";

const h = (n: number, q: number, y: number) => clHeadline({ n, q, y });

/* Contact list header v2 — CLH2-1: the headline is the count on file; the line under it is how many are not yet queried
   (a link onto that filter) or that all of them are. Replaces principles v1's "{y} need you." sentence (CLP2's headline
   half, retired with it). */
describe("CLH2-1 · the agents headline and its subheader", () => {
  it("some not queried: the count, then nq as a link", () => {
    expect(h(17, 12, 5)).toEqual({ title: "17 agents on file", sub: "5 not yet queried", subLink: true, dayOne: false, under: null });
  });
  it("all queried: plain, never a link", () => {
    expect(h(17, 17, 3)).toEqual({ title: "17 agents on file", sub: "All of them queried", subLink: false, dayOne: false, under: null });
  });
  it("one agent, queried: 'Already queried'", () => {
    expect(h(1, 1, 0)).toEqual({ title: "1 agent on file", sub: "Already queried", subLink: false, dayOne: false, under: null });
  });
  it("one agent, not queried, is day one (isDayOne claims n ≤ 3 with none queried) — its output unchanged", () => {
    expect(h(1, 0, 0)).toEqual({ title: "1 agent so far. Not queried yet.", sub: null, subLink: false, dayOne: true, under: DAY_ONE_UNDER });
  });
  it("singular past day one: '1 not yet queried' with more on file", () => {
    expect(h(4, 3, 0)).toMatchObject({ title: "4 agents on file", sub: "1 not yet queried", subLink: true });
    expect(h(4, 0, 0)).toMatchObject({ title: "4 agents on file", sub: "4 not yet queried", subLink: true });
  });
  it("Your move never reaches the header", () => {
    for (const y of [0, 1, 5]) expect(JSON.stringify(h(41, 22, y))).not.toMatch(/need/);
  });
  it("day one: three or fewer, none queried — unchanged", () => {
    expect(headlineText(h(1, 0, 0))).toBe("1 agent so far. Not queried yet.");
    expect(headlineText(h(2, 0, 0))).toBe("2 agents so far. Neither queried yet.");
    expect(headlineText(h(3, 0, 0))).toBe("3 agents so far. None queried yet.");
    expect(h(2, 0, 0).under).toBe("Add a few more and QueryHawk can start suggesting who to query next.");
    expect(isDayOne({ n: 4, q: 0, y: 0 })).toBe(false);
    expect(isDayOne({ n: 3, q: 1, y: 0 })).toBe(false);
    expect(isDayOne({ n: 0, q: 0, y: 0 })).toBe(false);
    expect(headlineText(h(4, 0, 0))).toBe("4 agents on file");
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
