/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The pass table: each per-month figure is derived from its price, and each stated saving is held
 * against the arithmetic, so a price cannot move without its saving.
 */
import { describe, it, expect } from "vitest";
import { PASSES, perMonth, passPerMonthLine, PRO_FROM, passFor } from "./pricingCopy";

describe("the pass table", () => {
  it("states the ref's planned launch prices", () => {
    expect(PASSES.map((p) => [p.months, p.price])).toEqual([[1, "7.99"], [3, "19"], [6, "29"], [12, "45"]]);
  });
  it("derives each per-month figure from the price", () => {
    expect(PASSES.map(perMonth)).toEqual(["7.99", "6.33", "4.83", "3.75"]);
    expect(PRO_FROM).toBe("3.75");
  });
  it("holds each stated saving within one point of the arithmetic", () => {
    const month = Number(passFor(1).price);
    for (const p of PASSES.filter((x) => x.saving !== null)) {
      const computed = (1 - Number(p.price) / (month * p.months)) * 100;
      expect(Math.abs(computed - p.saving!), `${p.months} months: ${computed.toFixed(1)}% against ${p.saving}%`).toBeLessThanOrEqual(1);
    }
  });
  it("prints the ref's per-month lines", () => {
    expect(PASSES.map(passPerMonthLine)).toEqual([
      "One month of Pro", "£6.33 a month · save 20%", "£4.83 a month · save 40%", "£3.75 a month · save 53%",
    ]);
  });
});
