/**
 * DB105 — the founding card's words and rules (lib/foundingCard.ts).
 */
import { describe, it, expect } from "vitest";
import { FEEDBACK_KINDS } from "./beta";
import { statsFrom } from "./foundingStats";
import {
  COMPOSE, DONT_CHIPS, HOW_SLIDES, IDLE, canSend, celebrateTier, celebrationCopy, firstName, idLine, nextStep, sentCopy,
} from "./foundingCard";

describe("the ID strip", () => {
  it("pads the founding number to three digits", () => {
    expect(idLine(23)).toBe("FOUNDING WRITER · No. 023");
    expect(idLine(7)).toBe("FOUNDING WRITER · No. 007");
    expect(idLine(100)).toBe("FOUNDING WRITER · No. 100");
  });
  it("states no number where the waitlist proves none", () => {
    expect(idLine(null)).toBe("FOUNDING WRITER");
  });
  it("the first name is the display name's first word", () => {
    expect(firstName("Bethany Carter")).toBe("Bethany");
    expect(firstName("  Mo ")).toBe("Mo");
    expect(firstName(null)).toBe("");
  });
});

describe("compose", () => {
  it("every kind sent is one the callable accepts", () => {
    for (const k of [...COMPOSE.map((c) => c.kind), ...DONT_CHIPS.map((c) => c.kind)]) expect(FEEDBACK_KINDS as readonly string[]).toContain(k);
  });
  it("the questions and placeholders are the pack's", () => {
    expect(COMPOSE.map((c) => [c.label, c.question, c.placeholder, c.kind])).toEqual([
      ["What I like", "What do you like?", "Tell us what’s working for you…", "Something I liked"],
      ["What I don’t", "What isn’t working?", "What happened, or where did you get stuck?", "Something's broken"],
      ["An idea", "What would you add?", "Something you wish QueryHawk did…", "An idea"],
    ]);
    expect(DONT_CHIPS.map((c) => c.kind)).toEqual(["Something's broken", "Something's confusing"]);
  });
  it("Send needs non-whitespace text within 4000 characters", () => {
    expect(canSend("")).toBe(false);
    expect(canSend("   \n ")).toBe(false);
    expect(canSend("ok")).toBe(true);
    expect(canSend("x".repeat(4000))).toBe(true);
    expect(canSend("x".repeat(4001))).toBe(false);
  });
});

describe("sent", () => {
  it("tier 0 cracks the egg; tier 1+ counts once read", () => {
    expect(sentCopy(0, "Bethany Carter")).toEqual({ title: "Thank you, Bethany.", body: "Your note is with us, and your egg is starting to crack. It hatches as soon as we’ve read it, usually within a few days." });
    expect(sentCopy(3, "Bethany Carter")).toEqual({ title: "Thank you, Bethany.", body: "Your note is with us, and it counts once we’ve read it." });
  });
});

describe("the celebration", () => {
  it("tier 1 hatches, with the ref's words", () => {
    expect(celebrationCopy(statsFrom({ contributions: 1, tier: "fledgling", nextTier: "archivist", toNext: 2 }))).toEqual({
      kicker: "YOU’VE HATCHED", title: "Meet your Fledgling", body: "Just hatched, and already helping. Two more notes and you become an Archivist.", button: "Give more feedback",
    });
  });
  it("tiers 2–5 rank up, a/an and the top", () => {
    expect(celebrationCopy(statsFrom({ tier: "archivist", nextTier: "scout", toNext: 5 })).title).toBe("You’re now an Archivist");
    expect(celebrationCopy(statsFrom({ tier: "scout", nextTier: "mentor", toNext: 1 })).body).toBe("Spots what others miss. One more note and you become a Mentor.");
    expect(celebrationCopy(statsFrom({ tier: "queryhawk", nextTier: null, toNext: null })).body).toBe("Top of the tree. You’ve reached the top.");
    expect(nextStep({ nextTier: "queryhawk", toNext: 12 })).toBe("12 more notes and you become a QueryHawk.");
  });
  it("plays when the shown rank is above the rank seen — the highest only, once", () => {
    expect(celebrateTier(1, 0, true)).toBe(1);
    expect(celebrateTier(1, undefined, true)).toBe(1);
    expect(celebrateTier(4, 1, true)).toBe(4);
    expect(celebrateTier(1, 1, true)).toBeNull();
    expect(celebrateTier(2, 3, true)).toBeNull();
    expect(celebrateTier(0, 0, true)).toBeNull();
    /* nothing to record it with (the onboarding ghost): never */
    expect(celebrateTier(3, 0, false)).toBeNull();
  });
});

describe("no Nick", () => {
  it("in any of the card's words", () => {
    const all = JSON.stringify({ IDLE, COMPOSE, DONT_CHIPS, HOW_SLIDES, s: [sentCopy(0, "A"), sentCopy(1, "A")] });
    expect(all).not.toMatch(/\bNick\b/i);
  });
});
