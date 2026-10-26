/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DB93 C4 (unit half) — the card's copy table.
 */
import { describe, it, expect } from "vitest";
import { HOW, article, cardCopy, runsText } from "./foundingCopy";
import { ZERO_STATS, type FoundingStats } from "./foundingStats";

const S = (o: Partial<FoundingStats>): FoundingStats => ({ ...ZERO_STATS, ...o });

describe("the card's copy", () => {
  it("6 contributions, top 15%", () => {
    const c = cardCopy(S({ contributions: 6, tier: "archivist", nextTier: "scout", toNext: 2, topPct: 15 }));
    expect(c.kicker).toBe("FOUNDING WRITER · LEVEL 2 OF 5");
    expect(c.title).toBe("The Archivist");
    expect(c.line).toBe("Keeps the record straight.");
    expect(runsText(c.stat)).toBe("6 contributions · top 15% of founding writers. 2 more and you become a Scout.");
    expect(c.stat.find((r) => r.t === "2 more")).toMatchObject({ b: true, rust: true });
    expect(c.stat.find((r) => r.t === "Scout")).toMatchObject({ b: true });
    expect(c.stat.find((r) => r.t === "6 contributions")).toMatchObject({ b: true });
    expect(c.compact).toBe("The Archivist · 6 contributions · 2 more to Scout");
  });
  it("the topPct-null form", () => {
    expect(runsText(cardCopy(S({ contributions: 11, tier: "scout", nextTier: "mentor", toNext: 4, topPct: null })).stat)).toBe("11 contributions. 4 more and you become a Mentor.");
  });
  it("a/an: an before a vowel", () => {
    expect(runsText(cardCopy(S({ contributions: 2, tier: "fledgling", nextTier: "archivist", toNext: 1 })).stat)).toBe("2 contributions. 1 more and you become an Archivist.");
    expect([article("Archivist"), article("Scout"), article("Mentor"), article("QueryHawk")]).toEqual(["an", "a", "a", "a"]);
  });
  it("exactly 1: the welcome in place of the count", () => {
    const c = cardCopy(S({ contributions: 1, tier: "fledgling", nextTier: "archivist", toNext: 2, topPct: 40 }));
    expect(c.title).toBe("The Fledgling");
    expect(c.line).toBe("Just hatched, and already helping.");
    expect(runsText(c.stat)).toBe("Your first contribution. Welcome to the flock. 2 more and you become an Archivist.");
    expect(c.compact).toBe("The Fledgling · 1 contribution · 2 more to Archivist");
  });
  it("0: the Fledgling prompt", () => {
    const c = cardCopy(ZERO_STATS);
    expect([c.kicker, c.title, c.line, runsText(c.stat)]).toEqual(["FOUNDING WRITER", "Your first contribution makes you a Fledgling", "Use Give feedback in the sidebar. Anything useful counts.", ""]);
  });
  it("waiting is appended, at 0 and later", () => {
    expect(runsText(cardCopy(S({ waiting: 2 })).stat)).toBe("2 waiting to be read.");
    expect(runsText(cardCopy(S({ contributions: 6, tier: "archivist", nextTier: "scout", toNext: 2, waiting: 1 })).stat)).toBe("6 contributions. 2 more and you become a Scout. 1 waiting to be read.");
  });
  it("QueryHawk: the top", () => {
    const c = cardCopy(S({ contributions: 25, tier: "queryhawk", nextTier: null, toNext: null, topPct: 5 }));
    expect([c.title, c.line, runsText(c.stat), c.compact]).toEqual(["The QueryHawk", "Top of the tree.", "25 contributions · top 5% of founding writers. You’ve reached the top.", "The QueryHawk · 25 contributions"]);
  });
});

describe("the How it works panel", () => {
  it("leaves out the weekly question, which is not built", () => {
    const all = JSON.stringify(HOW).toLowerCase();
    expect(all).not.toContain("question of the week");
    expect(all).not.toContain("weekly question");
    expect(HOW.rows).toHaveLength(4);
    expect(HOW.fair).toHaveLength(4);
    expect(HOW.lead.join("")).toBe("As one of our first 100 writers, you’re helping build QueryHawk. Everything useful you tell us is a contribution, and contributions move you up through the flock, from Fledgling to QueryHawk.");
  });
  it("names us, never Nick", () => {
    expect(JSON.stringify(HOW).toLowerCase()).not.toContain("nick");
  });
});
