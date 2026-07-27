/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the Agent list's four-row materials editor: the round-trip through the CANONICAL
 * string[] storage, the deliberate stripping of Author bio / Full manuscript, unit physics
 * (per-unit step/floor/default, snap-on-switch, MAT_QTY maxima), and validation's named floors.
 */
import { describe, it, expect } from "vitest";
import {
  MaterialRow,
  SAMPLE_UNITS,
  STRIPPED_PILLS,
  UNIT_CFG,
  materialRowsFromAgent,
  materialsWantedFromRows,
  snapToUnit,
  stepAmount,
  summaryFromRows,
  validateMaterials,
} from "./agentMaterials";

const rows = (over: Partial<Record<string, unknown>> = {}) => materialRowsFromAgent(over as never);

describe("agentMaterials · four rows, read from the canonical string[]", () => {
  it("always exactly four rows for ordinary data", () => {
    const r = materialRowsFromAgent(["Query letter", "Synopsis"]);
    expect(r.map((x) => x.key)).toEqual(["queryLetter", "synopsis", "sample", "other"]);
    expect(r[0].on).toBe(true);
    expect(r[1].on).toBe(true);
  });

  it("a stored sample lands on its unit with its count", () => {
    const r = materialRowsFromAgent(["Sample chapters"].concat(["First 3 chapters"]).slice(0, 1));
    const sample = r.find((x) => x.key === "sample")!;
    expect(sample.on).toBe(true);
    expect(sample.kind === "qty" && sample.unit).toBe("Chapters");
  });

  it("Synopsis stays BINARY but preserves a stored page count", () => {
    const r = materialRowsFromAgent(["Synopsis (2 pages)"]);
    const syn = r.find((x) => x.key === "synopsis")!;
    expect(syn.on).toBe(true);
    expect(syn.kind === "binary" && (syn as { pages: string }).pages).toBe("2");
    expect(summaryFromRows(r)).toBe("Synopsis · 2 pages");
  });

  it("several legacy sample units each get their OWN row — never collapsed", () => {
    const r = materialRowsFromAgent(["Sample pages", "Sample chapters"]);
    expect(r.filter((x) => x.key === "sample")).toHaveLength(2);
  });
});

describe("agentMaterials · the dropped pills decay on commit", () => {
  it("Author bio and Full manuscript are never re-emitted", () => {
    const stored = ["Query letter", "Author bio", "Full manuscript"];
    const r = materialRowsFromAgent(stored);
    const written = materialsWantedFromRows(r);
    expect(written).toContain("Query letter");
    for (const gone of STRIPPED_PILLS) expect(written).not.toContain(gone);
  });

  it("an unticked Synopsis drops its page count too", () => {
    const r = materialRowsFromAgent(["Synopsis (2 pages)"]).map((x) =>
      x.key === "synopsis" ? { ...x, on: false } : x,
    ) as MaterialRow[];
    expect(materialsWantedFromRows(r).join()).not.toMatch(/Synopsis/);
  });

  it("round-trips ordinary data unchanged", () => {
    const stored = ["Query letter", "Synopsis"];
    expect(materialsWantedFromRows(materialRowsFromAgent(stored))).toEqual(stored);
  });
});

describe("agentMaterials · unit physics (decision 11) clamped by MAT_QTY", () => {
  it("each unit owns its step, floor and default", () => {
    expect(UNIT_CFG.Chapters).toMatchObject({ step: 1, min: 1, def: 3 });
    expect(UNIT_CFG.Pages).toMatchObject({ step: 5, min: 1, def: 10 });
    expect(UNIT_CFG.Words).toMatchObject({ step: 500, min: 500, def: 5000 });
  });

  it("switching unit SNAPS to that unit's default — no fake conversion", () => {
    expect(SAMPLE_UNITS.map(snapToUnit)).toEqual(["3", "10", "5000"]);
  });

  it("the stepper steps by the unit's step and never below its floor", () => {
    expect(stepAmount("3", "Chapters", 1)).toBe("4");
    expect(stepAmount("1", "Chapters", -1)).toBe("1");     // floored
    expect(stepAmount("5000", "Words", -1)).toBe("4500");
    expect(stepAmount("500", "Words", -1)).toBe("500");    // floored at 500
  });

  it("the stepper also clamps to MAT_QTY's maxima", () => {
    expect(Number(stepAmount(String(UNIT_CFG.Pages.max), "Pages", 1))).toBe(UNIT_CFG.Pages.max);
    expect(Number(stepAmount(String(UNIT_CFG.Words.max), "Words", 1))).toBe(UNIT_CFG.Words.max);
  });

  it("commas are stripped on storage and shown on display", () => {
    const r = materialRowsFromAgent([]).map((x) =>
      x.key === "sample" ? { ...x, on: true, unit: "Words" as const, amount: "5,000" } : x,
    ) as MaterialRow[];
    expect(materialsWantedFromRows(r).join()).toMatch(/5,000 words|5000/);
    expect(summaryFromRows(r)).toBe("Opening sample (5,000 words)");
  });
});

describe("agentMaterials · validation names the floor", () => {
  const withSample = (amount: string, unit: "Chapters" | "Words") =>
    materialRowsFromAgent([]).map((x) => (x.key === "sample" ? { ...x, on: true, unit, amount } : x)) as MaterialRow[];

  it("a selected sample needs an amount", () => {
    expect(validateMaterials(withSample("", "Chapters"))?.msg).toMatch(/how much of the opening sample/);
  });
  it("the floor is NAMED when it's above 1", () => {
    expect(validateMaterials(withSample("100", "Words"))?.msg).toMatch(/at least 500 words/);
    expect(validateMaterials(withSample("0", "Chapters"))?.msg).not.toMatch(/at least/);
  });
  it("a selected Other needs its text", () => {
    const r = materialRowsFromAgent([]).map((x) => (x.key === "other" ? { ...x, on: true, text: "  " } : x)) as MaterialRow[];
    expect(validateMaterials(r)?.msg).toMatch(/Other/);
  });
  it("valid rows pass", () => {
    expect(validateMaterials(withSample("3", "Chapters"))).toBeNull();
  });
});
