/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE GOAL CARD AT AND PAST ITS TARGET (polish P7). It read "2/1" — a fraction whose numerator
 * has passed its denominator, which looks like a bug even when the maths is right and turns
 * beating your own target into an apparent miscount.
 */
import { describe, it, expect } from "vitest";
import { goalFigure, goalMeter, goalState } from "./oneScreen";

describe("goalFigure", () => {
  it("counts up to the target as a fraction", () => {
    expect(goalFigure(0, 25)).toBe("0/25");
    expect(goalFigure(21, 25)).toBe("21/25");
  });

  it("⚠️ states completion AT the target, not one past it", () => {
    expect(goalFigure(25, 25)).toBe("Goal met");
  });

  /* ⚠️ RETARGETED (fixes-2 A2): this asserted "2 — done", an em-dash construction that read as a
     stray fragment rather than a status. The FIGURE no longer carries the count — the sentence
     beneath does, in full — so the card states the same fact twice in two registers instead of
     contradicting itself in two halves. */
  it("⚠️ never renders an over-achievement as a fraction — the reported 2/1 case", () => {
    expect(goalFigure(2, 1)).toBe("Goal met");
    expect(goalFigure(40, 25)).toBe("Goal met");
  });
});

describe("the meter agrees with the figure", () => {
  it("⚠️ the meter was ALREADY correct — it caps, and only the display lagged", () => {
    const m = goalMeter(2, 1);
    expect(m.filled).toBeLessThanOrEqual(m.blocks); // never overflows
    expect(m.filled).toBe(m.blocks);                // and reads as full at completion
  });

  it("a proportional meter caps too, so a 40/25 does not overrun its track", () => {
    const m = goalMeter(40, 25);
    expect(m.filled).toBeLessThanOrEqual(m.blocks);
  });
});

/**
 * ⚠️ BOTH HALVES OR NEITHER (fixes-2 A2). The card read "2 — done" above "Query 1 agent this
 * quarter" — a figure saying finished over an instruction to start. These assert the two halves
 * agree, which is the fault; asserting either alone is what let them drift.
 */
describe("the goal card speaks with one voice", () => {
  const at = (done: number, target: number) => {
    const now = new Date("2026-08-10T12:00:00Z");
    const sent = Array.from({ length: done }, () => ({ dateSent: "2026-07-15" }));
    return goalState(sent as never[], target, "quarter", now)!;
  };

  it("below target: a fraction, and an instruction", () => {
    const g = at(21, 25);
    expect(goalFigure(g.done, g.target)).toBe("21/25");
    expect(g.sentence).toBe("Query 25 agents this quarter");
    expect(g.met).toBe(false);
  });

  it("at target: complete in BOTH halves", () => {
    const g = at(25, 25);
    expect(goalFigure(g.done, g.target)).toBe("Goal met");
    expect(g.sentence).toBe("Queried 25 of 25 agents this quarter");
    expect(g.met).toBe(true);
  });

  it("⚠️ past target — the reported 2/1 — reports, never instructs", () => {
    const g = at(2, 1);
    expect(goalFigure(g.done, g.target)).toBe("Goal met");
    expect(g.sentence).toBe("Queried 2 of 1 agent this quarter"); // noun agrees with the TARGET
    expect(g.sentence).not.toMatch(/^Query /); // no instruction to do a finished thing
  });

  it("at zero: the instruction stands, and nothing claims completion", () => {
    const g = at(0, 25);
    expect(goalFigure(g.done, g.target)).toBe("0/25");
    expect(g.met).toBe(false);
    expect(g.sentence).toBe("Query 25 agents this quarter");
  });
});
