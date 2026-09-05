/**
 * CARD C's BY-TYPE TABLE (v65 §C; ref hover-card-by-type.html) — the gauge's two ends and the
 * three counters, per type, against the ref's own eight worked examples. The fixtures ARE the
 * ref's numbers, so a drift here is a drift from the artefact the pack signed off.
 */
import { describe, it, expect } from "vitest";
import { cardCFor, gaugeFor, CardCFacts } from "./cardC";

const base = (over: Partial<CardCFacts>): CardCFacts => ({
  kind: "waiting", start: 0, end: 28, today: 18,
  startLab: "sent 26 Aug", endLab: "expected 23 Sept",
  eyebrowDays: 18, nudges: 1, totalDays: 61, ...over,
});

describe("the gauge's two ends, per type (the ref's rule 2)", () => {
  it("waiting: sent → expected, today mid-track, no overrun", () => {
    const g = gaugeFor(base({}));
    expect(g.fillPct).toBeCloseTo(64.3, 0);
    expect(g.todayPct).toBe(g.fillPct);
    expect(g.overPct).toBe(0);
    expect(g.overTone).toBeNull();
  });
  it("passed: the fill runs past its end in ROSE, today beyond — the ref's 8% overhang", () => {
    /* the ref: sent 16 Jul, expected 28 Aug (43 days), 5 over → ~11.6% */
    const g = gaugeFor(base({ kind: "passed", start: 0, end: 43, today: 48, eyebrowDays: 5 }));
    expect(g.fillPct).toBe(100);
    expect(g.overPct).toBeCloseTo(11.6, 0);
    expect(g.overTone).toBe("rose");
    expect(g.todayPct).toBeCloseTo(111.6, 0);
    expect(g.endOver).toBe(true);
  });
  it("no end date: the bar is the elapsed time, today at the tip (the ref's honest dash type)", () => {
    const g = gaugeFor(base({ kind: "moveUndated", end: null, today: 63, eyebrowDays: 63 }));
    expect(g.fillPct).toBe(100);
    expect(g.todayPct).toBe(100);
    expect(g.overPct).toBe(0);
  });
  it("a long silence RESCALES: track = sent → today, sand past the expected mark (the ref's 22/78)", () => {
    /* the ref: sent 1 Mar 2024, expected 25 Apr 2024 (55 days), 860 quiet → fill ≈ 55/915 */
    const g = gaugeFor(base({ kind: "quiet", start: 0, end: 55, today: 915, eyebrowDays: 860 }));
    expect(g.fillPct).toBeCloseTo(6, 0);
    expect(g.overPct).toBeCloseTo(94, 0);
    expect(g.overTone).toBe("sand");
    expect(g.todayPct).toBe(100);
  });
  it("a finished stage has NO today marker; so do closed rows (the ref's rules 2 and 5)", () => {
    for (const kind of ["ghost", "closed"] as const) {
      const g = gaugeFor(base({ kind, start: 0, end: 22, today: 40 }));
      expect(g.todayPct, kind).toBeNull();
      expect(g.fillPct, kind).toBe(100);
      expect(g.overPct, kind).toBe(0);
    }
  });
  it("offer: offered → decide-by, today near the start", () => {
    const g = gaugeFor(base({ kind: "offer", start: 0, end: 14, today: 0.3 }));
    expect(g.fillPct).toBeCloseTo(2.1, 0);
    expect(g.overTone).toBeNull();
  });
});

describe("the three counters, per type (the ref's rule 3: counter one is the eyebrow's number; a missing figure is a DASH)", () => {
  it("waiting: waiting · nudges · total", () => {
    const [a, b, c] = cardCFor(base({})).counters;
    expect([a.v, a.label]).toEqual(["18", "days waiting"]);
    expect([b.v, b.label]).toEqual(["1", "nudges"]);
    expect([c.v, c.label]).toEqual(["61", "days total"]);
  });
  it("passed: overdue turns ROSE (the ref's counter-one rule)", () => {
    const [a] = cardCFor(base({ kind: "passed", eyebrowDays: 5 })).counters;
    expect(a.rose).toBe(true);
    expect(a.label).toBe("days overdue");
  });
  it("your move, dated: overdue · the window you were given · total", () => {
    const [a, b] = cardCFor(base({ kind: "moveDated", end: 21, today: 27, eyebrowDays: 6, windowDays: 21 })).counters;
    expect([a.v, a.label, a.rose]).toEqual(["6", "days overdue", true]);
    expect([b.v, b.label]).toEqual(["21", "days you had"]);
  });
  it("your move, no date: counter two is an HONEST DASH — never a guess", () => {
    const [, b] = cardCFor(base({ kind: "moveUndated", end: null })).counters;
    expect([b.v, b.label]).toEqual(["—", "date promised"]);
  });
  it("offer: days to decide · others to nudge · total", () => {
    const [a, b] = cardCFor(base({ kind: "offer", eyebrowDays: 14, othersToNudge: 3 })).counters;
    expect([a.v, a.label]).toEqual(["14", "days to decide"]);
    expect([b.v, b.label]).toEqual(["3", "others to nudge"]);
  });
  it("quiet: quiet · nudges · replies, and replies is ZERO PLAINLY", () => {
    const [a, , c] = cardCFor(base({ kind: "quiet", eyebrowDays: 860, nudges: 2 })).counters;
    expect([a.v, a.label]).toEqual(["860", "days quiet"]);
    expect([c.v, c.label]).toEqual(["0", "replies"]);
  });
  it("ghost: days in stage · nudges · N of M stages", () => {
    const [a, , c] = cardCFor(base({ kind: "ghost", eyebrowDays: 22, stageIdx: 1, stageCount: 3 })).counters;
    expect([a.v, a.label]).toEqual(["22", "days in stage"]);
    expect([c.v, c.label]).toEqual(["1", "of 3 stages"]);
  });
  it("task: days left · rolled · days open — and overdue flips counter one rose", () => {
    const t = cardCFor(base({ kind: "task", end: 18, today: 14, eyebrowDays: 4, rolled: 1, daysOpen: 18 })).counters;
    expect([t[0].v, t[0].label]).toEqual(["4", "days left"]);
    expect([t[1].v, t[1].label]).toEqual(["1", "rolled"]);
    const od = cardCFor(base({ kind: "task", end: 10, today: 14, eyebrowDays: 4, rolled: 0, daysOpen: 18 })).counters;
    expect([od[0].label, od[0].rose]).toEqual(["days overdue", true]);
  });
  it("closed: total · nudges · the outcome word (the ref's rule 5)", () => {
    const [a, , c] = cardCFor(base({ kind: "closed", totalDays: 112, outcome: "Rejected" })).counters;
    expect([a.v, a.label]).toEqual(["112", "days total"]);
    expect([c.v, c.label]).toEqual(["Rejected", "outcome"]);
  });
  it("an unknown count is a dash wherever it lands", () => {
    const [, b] = cardCFor(base({ nudges: null })).counters;
    expect(b.v).toBe("—");
  });
});
