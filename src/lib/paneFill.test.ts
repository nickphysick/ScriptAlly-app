/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { primaryFill, fillWidth } from "./paneFill";

describe("Phase 7 · the fill is proportional, and it reads the required list", () => {
  it("walks the contract's four states for a four-question journey", () => {
    const at = (missing: number) => primaryFill({ required: 4, missing });
    expect(at(4)).toEqual({ pct: 0, count: "4 still to answer", ready: false });
    expect(at(2)).toEqual({ pct: 0.5, count: "2 still to answer", ready: false });
    expect(at(1)).toEqual({ pct: 0.75, count: "1 still to answer", ready: false });
    expect(at(0)).toEqual({ pct: 1, count: null, ready: true });
  });

  /* ⚠️ THE CONTRACT CALLS THIS OUT AS CORRECT RATHER THAN AS A SPECIAL CASE */
  it("a one-question journey goes 0 → 100 in a single step", () => {
    expect(primaryFill({ required: 1, missing: 1 }).pct).toBe(0);
    expect(primaryFill({ required: 1, missing: 0 }).pct).toBe(1);
  });

  it("the fill RECEDES — removing an answer runs it backwards", () => {
    const three = primaryFill({ required: 4, missing: 1 }).pct;
    const two = primaryFill({ required: 4, missing: 2 }).pct;
    expect(two).toBeLessThan(three);
  });

  /**
   * ⚠️ `0 / 0` IS THE SHAPE THAT YIELDS `NaN`, and a `NaN%` width is dropped by CSS in silence —
   * a permanently faded button on a journey with nothing to answer.
   */
  it("a flow that requires nothing is complete rather than empty", () => {
    expect(primaryFill({ required: 0, missing: 0 })).toEqual({ pct: 1, count: null, ready: true });
    expect(fillWidth(primaryFill({ required: 0, missing: 0 }))).toBe("100%");
  });

  it("nothing can drive it outside 0…1, whatever it is handed", () => {
    for (const a of [
      { required: 2, missing: 5 }, { required: 2, missing: -3 },
      { required: -1, missing: 1 }, { required: 3, missing: Number.NaN },
    ]) {
      const p = primaryFill(a).pct;
      expect(Number.isFinite(p), JSON.stringify(a) + " produced " + p).toBe(true);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it("the width is one formatting, so two mounts cannot disagree", () => {
    expect(fillWidth(primaryFill({ required: 3, missing: 1 }))).toBe("66.7%");
    expect(fillWidth(primaryFill({ required: 4, missing: 4 }))).toBe("0%");
  });
});

describe("Phase 7 · the cohort's exception is about WHAT is counted", () => {
  it("an untouched cohort is faded, empty, and says so in words", () => {
    expect(primaryFill({ required: 1, missing: 1, bulk: { count: 32, touched: 0 } }))
      .toEqual({ pct: 0, count: "no queries filled in yet", ready: false });
  });

  it("the fill tracks touched rows against the whole cohort", () => {
    expect(primaryFill({ required: 1, missing: 0, bulk: { count: 8, touched: 2 } }).pct).toBe(0.25);
    expect(primaryFill({ required: 1, missing: 0, bulk: { count: 8, touched: 8 } }).pct).toBe(1);
  });

  /* ⚠️ READY AT ONE ROW: logging six of thirty-two is a complete act */
  it("one touched row makes it ready, and the count stops speaking", () => {
    const f = primaryFill({ required: 1, missing: 1, bulk: { count: 32, touched: 1 } });
    expect(f.ready).toBe(true);
    expect(f.count).toBeNull();
  });

  it("an empty cohort cannot divide by zero", () => {
    expect(primaryFill({ required: 1, missing: 1, bulk: { count: 0, touched: 0 } }).pct).toBe(0);
  });
});
