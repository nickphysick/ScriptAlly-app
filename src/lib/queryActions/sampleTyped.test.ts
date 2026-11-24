/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Add an agent v2 (design v15) — the typed sample's model (lib/queryActions/sampleTyped) and its place beside the app's
 * sample picker, which it must not change.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { blankSample, type Sample } from "./sample";
import { COMMON_ASKS, askOn, clampAmt, digitsOf, fmtAmt, typedMax, typedName, withAsk, withUnit } from "./sampleTyped";

const s = (p: Partial<Sample>): Sample => ({ ...blankSample(), ...p });

describe("the typed sample", () => {
  it("words carry a thousands comma; pages and chapters never do", () => {
    expect(fmtAmt(7500, "words")).toBe("7,500");
    expect(fmtAmt(7500, "pages")).toBe("7500");
    expect(fmtAmt(35, "chapters")).toBe("35");
  });
  it("any whole number from 1, up to the storage ceiling (MAT_QTY)", () => {
    expect(clampAmt(0, "words")).toBe(1);
    expect(clampAmt(1, "words")).toBe(1);
    expect(clampAmt(35, "pages")).toBe(35);
    expect(clampAmt(10_000_000, "words")).toBe(typedMax("words"));
    expect(typedMax("pages")).toBe(9999);
    expect(typedMax("chapters")).toBe(999);
    expect(typedMax("words")).toBe(999999);
  });
  it("reads the digits typed, commas and all", () => {
    expect(digitsOf("7,500")).toBe(7500);
    expect(digitsOf("")).toBeNull();
    expect(digitsOf("abc")).toBeNull();
  });
  it("changing between pages, words and chapters keeps the typed number", () => {
    const a = s({ unit: "words", amt: 35 });
    expect(withUnit(a, "pages").amt).toBe(35);
    expect(withUnit(a, "chapters").amt).toBe(35);
    expect(withUnit(withUnit(a, "pages"), "words").amt).toBe(35);
  });
  it("the five common asks, in the ref's order, each setting amount and unit together", () => {
    expect(COMMON_ASKS.map((c) => `${c.amt} ${c.unit}`)).toEqual(["3 chapters", "5 pages", "10 pages", "50 pages", "10000 words"]);
    const t = withAsk(s({ unit: "words", amt: 7500 }), COMMON_ASKS[3]);
    expect([t.unit, t.amt, t.sect]).toEqual(["pages", 50, false]);
  });
  it("a chip shows as chosen only when it matches exactly", () => {
    expect(askOn(s({ unit: "pages", amt: 10 }), { unit: "pages", amt: 10 })).toBe(true);
    expect(askOn(s({ unit: "pages", amt: 11 }), { unit: "pages", amt: 10 })).toBe(false);
    expect(askOn(s({ unit: "words", amt: 10 }), { unit: "pages", amt: 10 })).toBe(false);
    expect(askOn(s({ unit: "pages", amt: 10, sect: true, from: 40 }), { unit: "pages", amt: 10 })).toBe(false);
  });
  it("the tile's sub-heading follows the amount", () => {
    expect(typedName(s({ unit: "chapters", amt: 3 }))).toBe("First 3 chapters");
    expect(typedName(s({ unit: "words", amt: 7500 }))).toBe("First 7,500 words");
    expect(typedName(s({ unit: "pages", amt: 1 }))).toBe("First 1 page");
    expect(typedName(s({ unit: "words", amt: 7500, sect: true, from: 40, fu: "page" }))).toBe("7,500 words from page 40");
  });
});

describe("beside the picker, not in place of it", () => {
  const src = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
  it("the control has no − or + button", () => {
    const c = src("../../components/queryActions/SampleTyped.tsx");
    expect(c).not.toMatch(/>\s*[−+]\s*</);
    expect(c).not.toMatch(/aria-label="(Fewer|More|Decrease|Increase)/);
  });
  it("the add journey draws the typed control and not the picker", () => {
    const j = src("../../components/queries/centre/QcAddAgent.tsx");
    expect(j).toMatch(/<SampleTyped\b/);
    expect(j).not.toMatch(/<SampleControl\b/);
  });
});
