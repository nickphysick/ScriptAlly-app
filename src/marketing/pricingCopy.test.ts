/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Pro plan table: each per-month figure is derived from its price, and each stated saving is
 * held against the arithmetic, so a price cannot move without its saving. The expected strings
 * are LITERALS from the ref (design-refs/pricing-page-v2.html) — the table is what is under test.
 */
import { describe, it, expect } from "vitest";
import {
  PRO_PLANS, perMonth, planPerMonthLine, PRO_FROM, planFor, planTileLine, planPrice, planMonths,
  ROLL_ON_PRICE, PRO_CHOOSE, LADDER_SMALL, planRungLine, LADDER_DEFAULT, TAB_FREE_SMALL, TAB_PRO_SMALL,
} from "./pricingCopy";

describe("the Pro plan table", () => {
  it("states the planned launch prices", () => {
    expect(PRO_PLANS.map((p) => [p.months, p.price])).toEqual([[1, "7.99"], [3, "19"], [6, "29"], [12, "45"]]);
  });
  it("derives each per-month figure from the price", () => {
    expect(PRO_PLANS.map(perMonth)).toEqual(["7.99", "6.33", "4.83", "3.75"]);
    expect(PRO_FROM).toBe("3.75");
  });
  it("holds each stated saving within one point of the arithmetic", () => {
    const month = Number(planFor(1).price);
    for (const p of PRO_PLANS.filter((x) => x.saving !== null)) {
      const computed = (1 - Number(p.price) / (month * p.months)) * 100;
      expect(Math.abs(computed - p.saving!), `${p.months} months: ${computed.toFixed(1)}% against ${p.saving}%`).toBeLessThanOrEqual(1);
    }
  });
  it("prints the ref's per-month lines on the result card", () => {
    expect(PRO_PLANS.map(planPerMonthLine)).toEqual([
      "One month of Pro", "£6.33 a month · save 20%", "£4.83 a month · save 40%", "£3.75 a month · save 53%",
    ]);
  });
  it("prints the ref's tiles: name, price and foot line", () => {
    expect(PRO_PLANS.map((p) => planMonths(p.months))).toEqual(["1 month", "3 months", "6 months", "12 months"]);
    expect(PRO_PLANS.map(planPrice)).toEqual(["£7.99", "£19", "£29", "£45"]);
    expect(PRO_PLANS.map((p) => { const l = planTileLine(p); return l.lead + (l.save ?? ""); })).toEqual([
      "Add to any plan", "£6.33 a month · save 20%", "£4.83 a month · save 40%", "£3.75 a month · save 53%",
    ]);
  });
  /* 26 Oct: the ladder inside the Pro card and the quiet roll-on (ref pricing-plans-ladder-v1.html). */
  it("prints the ladder's rows: the one-month plan is the monthly rate, the rest their saving", () => {
    expect(PRO_PLANS.map((p) => { const l = planRungLine(p); return l.lead + (l.save ?? ""); })).toEqual([
      "The monthly rate", "£6.33 a month · save 20%", "£4.83 a month · save 40%", "£3.75 a month · save 53%",
    ]);
    expect(LADDER_DEFAULT).toBe(6);
    expect(PRO_CHOOSE).toBe("Choose how long to start with.");
  });
  it("the roll-on is the table's one-month price, and the small print is the ref's line", () => {
    expect(ROLL_ON_PRICE).toBe(planFor(1).price);
    expect(LADDER_SMALL).toBe("Renews monthly at £7.99 once your plan ends. Cancel any time.");
  });
  it("the phone's tabs carry each plan's price", () => {
    expect(TAB_FREE_SMALL).toBe("£0");
    expect(TAB_PRO_SMALL).toBe("from £3.75 a month");
  });
});
