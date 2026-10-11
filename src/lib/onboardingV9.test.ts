/**
 * Onboarding v9 — the words and the small rules, as units. What is drawn, and when, is on the
 * rendered page (tests/e2e/onbV9.measure.ts).
 */
import { describe, it, expect } from "vitest";
import { ACK, lineText, typeSchedule, typedCount, UNTITLED, TITLE_TBC, STILL_WRITING_LEAD, STILL_WRITING_NOTE, STAMP_EYEBROW } from "./onboardingV9";

describe("the acknowledgement's words, per journey", () => {
  it("each passage is three lines, exactly as ruled", () => {
    expect(ACK.early.map(lineText)).toEqual([
      "Got it. Your campaign is underway.",
      "QueryHawk picks up from wherever you've got to. In a moment we'll give you hassle-free ways to import whatever list you're working from.",
      "First, your manuscript title.",
    ]);
    expect(ACK.starting.map(lineText)).toEqual([
      "Got it. You're at the start.",
      "QueryHawk records your querying from the first agent you look at. Nothing to piece together later.",
      "First, your manuscript, if it has a title yet.",
    ]);
    expect(ACK.deep.map(lineText)).toEqual([
      "Got it. A lot in flight.",
      "Who has what, and when each one is due a nudge: that's the job QueryHawk does. In a moment we'll give you hassle-free ways to import the list you're working from.",
      "First, your manuscript title.",
    ]);
    expect(ACK.interest.map(lineText)).toEqual([
      "Got it. Something's on the table.",
      "Requests and offers set the pace. QueryHawk keeps them in view alongside everything still waiting. In a moment we'll give you ways to import the list you're working from.",
      "First, your manuscript title.",
    ]);
  });
  it("the emphasised words: \"manuscript title\" on three, \"manuscript\" on Just getting started", () => {
    const em = (k: keyof typeof ACK) => ACK[k][2].filter((r) => r.em).map((r) => r.text);
    expect(em("early")).toEqual(["manuscript title"]);
    expect(em("deep")).toEqual(["manuscript title"]);
    expect(em("interest")).toEqual(["manuscript title"]);
    expect(em("starting")).toEqual(["manuscript"]);
  });
  it("the stamp, Title TBC and the still-writing note", () => {
    expect(STAMP_EYEBROW).toBe("Where you are");
    expect(TITLE_TBC).toBe("Title TBC");
    expect(UNTITLED).toBe("Untitled manuscript");
    expect(`${STILL_WRITING_LEAD} ${STILL_WRITING_NOTE}`).toBe("Still writing? No problem. In the meantime, QueryHawk's smart database is a great place to build up your agent contact list and collate your materials.");
  });
});

describe("the typewriter's schedule", () => {
  const lines = ACK.early.map(lineText);
  const at = typeSchedule(lines);
  it("one moment per letter, never going backwards", () => {
    expect(at.length).toBe(lines.join("").length);
    for (let i = 1; i < at.length; i++) expect(at[i]).toBeGreaterThan(at[i - 1]);
  });
  it("38ms a letter on the first line, 13ms on the others, 220ms more after a full stop", () => {
    expect(at[0]).toBe(38);
    expect(at[1] - at[0]).toBe(38);
    const stop = lines[0].indexOf(".");
    expect(at[stop + 1] - at[stop], "the letter after a full stop waits").toBe(38 + 220);
    const second = lines[0].length;
    expect(at[second + 1] - at[second]).toBe(13);
  });
  it("every passage takes about four seconds", () => {
    for (const k of ["early", "starting", "deep", "interest"] as const) {
      const end = typeSchedule(ACK[k].map(lineText)).at(-1)!;
      expect(end, k).toBeGreaterThan(3000);
      expect(end, k).toBeLessThan(5600);
    }
  });
  it("typedCount: none before the first letter, all at the end, and it never passes the total", () => {
    expect(typedCount(at, 0)).toBe(0);
    expect(typedCount(at, 38)).toBe(1);
    expect(typedCount(at, at.at(-1)!)).toBe(at.length);
    expect(typedCount(at, 1e9)).toBe(at.length);
    expect(typedCount(at, 300), "at 300ms, fewer than half").toBeLessThan(at.length / 2);
  });
});
