/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dashboard v2.2 · the founding band's words and numbers (lib/foundingBand). The rendered page is held by DB22 C1–C4
 * and D1 (tests/e2e/dashV22.measure.ts); this holds the rules over every rank, including the ones no fixture reaches.
 */
import { describe, expect, it } from "vitest";
import { TIERS } from "./foundingStats";
import { askLine, BIRDS, birdHover, birdState, birdSub, firstLine, foldStatus, notesLeft, RANK_MIN, rankUpDecision, roadFill, TOP_TIER } from "./foundingBand";

describe("foundingBand", () => {
  it("reads the server's tiers and nothing else", () => {
    expect(RANK_MIN).toEqual([0, ...TIERS.map((t) => t.min)]);
    expect(BIRDS.map((b) => b.name)).toEqual(["Fledgling", "Archivist", "Scout", "Mentor", "QueryHawk"]);
    expect(TOP_TIER).toBe(5);
  });

  it("the ask: hatch is the Egg's alone; one note is a word; the top thanks", () => {
    expect(askLine(0, 0)).toEqual({ bold: "One more note", rest: " and you hatch into a Fledgling." });
    expect(askLine(1, 2)).toEqual({ bold: "One more note", rest: " and you become an Archivist." });
    expect(askLine(2, 4)).toEqual({ bold: "4 more notes", rest: " and you become a Scout." });
    expect(askLine(3, 8)).toEqual({ bold: "7 more notes", rest: " and you become a Mentor." });
    expect(askLine(4, 20)).toEqual({ bold: "5 more notes", rest: " and you become a QueryHawk." });
    expect(askLine(5, 52)).toEqual({ bold: "Thank you.", rest: " 52 notes and counting." });
    for (let t = 1; t < TOP_TIER; t++) expect(askLine(t, RANK_MIN[t]).rest).not.toContain("hatch");
  });

  it("the rank-up load's lines", () => {
    expect(firstLine(1, true)).toBe("You’ve hatched into a");
    expect(firstLine(2, true)).toBe("You’ve become an");
    expect(firstLine(3, true)).toBe("You’ve become a");
    expect(firstLine(5, true)).toBe("You’ve reached");
    expect(askLine(1, 1, true)).toEqual({ bold: "Welcome, Fledgling.", rest: " 2 more notes to Archivist." });
    expect(askLine(1, 2, true)).toEqual({ bold: "Welcome, Fledgling.", rest: " One more note to Archivist." });
    expect(askLine(5, 25, true)).toEqual({ bold: "Thank you.", rest: " 25 notes and counting." });
  });

  it("the first line, every rank", () => {
    expect([0, 1, 2, 3, 4, 5].map((t) => firstLine(t))).toEqual(["You’re an", "You’re a", "You’re an", "You’re a", "You’re a", "You’ve reached"]);
  });

  it("the fill: none for the Egg, full at the top, the fraction between", () => {
    expect(roadFill(0, 0)).toBeNull();
    expect(roadFill(1, 1)).toBe(0);
    expect(roadFill(1, 2)).toBeCloseTo(0.5);
    expect(roadFill(2, 7)).toBeCloseTo(1 + 4 / 5);
    expect(roadFill(4, 24)).toBeCloseTo(3 + 9 / 10);
    expect(roadFill(5, 52)).toBe(4);
    /* a count the server has not caught up with never runs the fill backwards or past the next bird */
    expect(roadFill(2, 1)).toBe(1);
    expect(roadFill(2, 99)).toBe(2);
  });

  it("the road's states and words", () => {
    expect(BIRDS.map((b) => birdState(b.tier, 2))).toEqual(["reached", "reached", "next", "future", "future"]);
    expect(BIRDS.map((b) => birdSub(b.tier, 0))).toEqual(["1 note", "3 notes", "8 notes", "15 notes", "25 notes"]);
    expect(birdSub(1, 1)).toBe("Reached");
    expect(birdHover(3, 0)).toBe("At 8 notes · 8 to go");
    expect(birdHover(1, 0)).toBe("At 1 note · 1 to go");
  });

  it("the folded strip's status", () => {
    expect(foldStatus(0, 0)).toEqual({ bold: "1 note", rest: " to Fledgling" });
    expect(foldStatus(2, 7)).toEqual({ bold: "1 note", rest: " to Scout" });
    expect(foldStatus(5, 52)).toEqual({ bold: "52 notes", rest: "" });
    expect(notesLeft(5, 52)).toBe(0);
  });

  it("the rank-up: silent when nothing is stored, once per new rank, never for the Egg", () => {
    expect(rankUpDecision(3, undefined)).toBe("silent");
    expect(rankUpDecision(0, null)).toBe("silent");
    expect(rankUpDecision(1, 0)).toBe("play");
    expect(rankUpDecision(3, 1)).toBe("play");
    expect(rankUpDecision(3, 3)).toBe("none");
    expect(rankUpDecision(2, 3)).toBe("none");
    expect(rankUpDecision(0, 0)).toBe("none");
  });
});
