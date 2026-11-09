/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v54, D7 — a sent sample's stored shape: one parser for both shapes, one writer, one wording.
 */
import { describe, expect, it } from "vitest";
import { sampleOfMaterials, sampleToMaterial, SAMPLE_MATERIAL } from "./sentSample";
import { formatQueryMaterial } from "./materials";
import { materialsToQuery } from "./queryActions/logSave";
import { sampleName, type Sample } from "./queryActions/sample";

const S = (unit: Sample["unit"], amt: number, from = 1, fu: Sample["fu"] = null): Sample => ({ unit, amt, from, sect: from > 1, fu });

describe("v54 · a sent sample, stored", () => {
  it("an old record (no from) parses to 'from the opening' and reads as before", () => {
    const old = [{ material: "Sample Pages", type: "chapters" as const, quantity: 3 }];
    expect(sampleOfMaterials(old)).toEqual(S("chapters", 3));
    expect(formatQueryMaterial(old[0])).toBe("First 3 chapters");
    /* a legacy string record too */
    expect(sampleOfMaterials(["Query Letter", "First 50 pages"])).toEqual(S("pages", 50));
  });

  it("a new opening sample writes no from/fromUnit: the same record as before v54", () => {
    const w = sampleToMaterial(S("chapters", 3));
    expect(w).toEqual({ material: SAMPLE_MATERIAL, type: "chapters", quantity: 3 });
    expect(Object.keys(w!)).not.toContain("from");
    expect(Object.keys(w!)).not.toContain("fromUnit");
    /* the log journey's writer is the same one */
    expect(materialsToQuery({ ql: true, syn: false, s: S("chapters", 3) })).toEqual(["Query Letter", { material: "Sample Pages", type: "chapters", quantity: 3 }]);
  });

  const cases: [string, Sample, string][] = [
    ["chapters 4–6", S("chapters", 3, 4, "chapter"), "chapters 4–6"],
    ["pages 40–89", S("pages", 50, 40, "page"), "pages 40–89"],
    ["5,000 words from word 20,000", S("words", 5000, 20000, "word"), "5,000 words from word 20,000"],
  ];
  for (const [name, s, words] of cases) {
    it(`${name}: writes from/fromUnit, reads back the same, and every reader says "${words}"`, () => {
      const w = sampleToMaterial(s)!;
      expect(w.from).toBe(s.from);
      expect(w.fromUnit).toBe(s.fu);
      expect(sampleOfMaterials([w])).toEqual(s);
      expect(sampleName(s)).toBe(words);
      /* the card's paperclip and every list read formatQueryMaterial: the same words, capitalised */
      expect(formatQueryMaterial(w)).toBe(words[0].toUpperCase() + words.slice(1));
    });
  }

  it("one of anything from the opening drops its numeral, in both readers", () => {
    expect(sampleName(S("chapters", 1))).toBe("first chapter");
    expect(formatQueryMaterial(sampleToMaterial(S("chapters", 1))!)).toBe("First chapter");
  });

  it("37 pages from page 40 reads 'pages 40–76'", () => {
    expect(sampleName(S("pages", 37, 40, "page"))).toBe("pages 40–76");
  });
});
