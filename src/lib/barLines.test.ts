/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE TWO LINES ARE A SPLIT OF ONE LABEL, AND THE INPUTS ARE THE REAL ONES.
 *
 * A test that hands a function a string somebody typed is testing a function nobody runs. Every
 * label below is one `journeyBars` actually composes — they are copied from its own branches — so
 * this exercises the shapes the board produces rather than the shapes the split makes easy.
 */
import { describe, it, expect } from "vitest";
import { barLines } from "./journeyBars";

describe("a bar's label splits into what it is and when", () => {
  it("splits the composed labels at their own separator", () => {
    expect(barLines("Out since 8 Aug · reply expected 3 Sept"))
      .toEqual({ t1: "Out since 8 Aug", t2: "reply expected 3 Sept" });
    expect(barLines("Offer received · answer by 14 Apr"))
      .toEqual({ t1: "Offer received", t2: "answer by 14 Apr" });
    expect(barLines("Partial requested · send by 3 Oct"))
      .toEqual({ t1: "Partial requested", t2: "send by 3 Oct" });
    expect(barLines("Out since 18 Jul · nudge due"))
      .toEqual({ t1: "Out since 18 Jul", t2: "nudge due" });
    expect(barLines("Out since 7 Jul · no reply date given"))
      .toEqual({ t1: "Out since 7 Jul", t2: "no reply date given" });
  });

  it("a label with no when is ONE line, never a line and an empty one", () => {
    /* ⚠️ THE EMPTY STRING MATTERS: the render draws no second element for it, so the first line
       stays on the bar's centre. A second line of nothing would pull it up by half a line. */
    expect(barLines("Quiet for 31 days")).toEqual({ t1: "Quiet for 31 days", t2: "" });
    expect(barLines("Closed")).toEqual({ t1: "Closed", t2: "" });
    expect(barLines("")).toEqual({ t1: "", t2: "" });
  });

  it("splits at the FIRST separator, so a name carrying a middot survives", () => {
    expect(barLines("Sent to Vane · Coe · reply expected 3 Sept"))
      .toEqual({ t1: "Sent to Vane", t2: "Coe · reply expected 3 Sept" });
  });

  it("a middot that is not a separator is left alone", () => {
    /* the join is always spaced; a bare middot inside a word is part of the word */
    expect(barLines("Vane·Coe")).toEqual({ t1: "Vane·Coe", t2: "" });
  });
});
