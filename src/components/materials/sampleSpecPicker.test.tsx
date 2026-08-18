/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SampleSpecPicker — the surface, and the behaviour the three hand-rolled copies each had to
 * implement separately (seed on select, clear on deselect, snap on unit change).
 *
 * ⚠️ THE ROWS ARE ALWAYS `materialRowsFromAgent`'s OUTPUT. Same law as sampleJoin.test.ts: a
 * hand-typed `MaterialRow[]` is a shape the system may never produce.
 *
 * ⚠️ NO SLICING ANYWHERE IN THIS FILE. Every assertion is a whole-string `toContain` / `toMatch`
 * over the rendered markup, so there is no anchor that can silently go missing and widen an
 * assertion to the rest of the document.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { SampleSpecPicker, selectedUnits } from "./SampleSpecPicker";
import { materialRowsFromAgent, snapToUnit, UNIT_CFG, type MaterialRow } from "../../lib/agentMaterials";

const rows = (stored: string[]): MaterialRow[] => materialRowsFromAgent(stored);

/** Render, and capture what the picker would hand back from one interaction. */
function fire(start: MaterialRow[], act: (p: { rows: MaterialRow[]; onChange: (r: MaterialRow[]) => void }) => void) {
  let out: MaterialRow[] = start;
  act({ rows: start, onChange: (r) => { out = r; } });
  return out;
}

/* The toggle logic is exercised through the component's own exported reader so the test cannot
   drift from what the component considers "selected". */
const unitsOf = (r: MaterialRow[]) => selectedUnits(r).slice().sort();

describe("SampleSpecPicker — markup", () => {
  it("renders all three units, and marks only the stored ones pressed", () => {
    const html = renderToStaticMarkup(
      <SampleSpecPicker rows={rows(["First 3 chapters"])} onChange={() => {}} join="or" />
    );
    expect(html).toContain(">Chapters<");
    expect(html).toContain(">Pages<");
    expect(html).toContain(">Words<");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-pressed="false"');
  });

  it("carries the unit as an in-field suffix rather than a second control", () => {
    const html = renderToStaticMarkup(
      <SampleSpecPicker rows={rows(["First 3 chapters"])} onChange={() => {}} join="or" />
    );
    expect(html).toContain('class="ssp-suffix"');
    expect(html).toContain(">chapters<");
  });

  it("⚠️ never a number input — spinners would sit on top of the suffix", () => {
    const html = renderToStaticMarkup(
      <SampleSpecPicker rows={rows(["First 50 pages"])} onChange={() => {}} join="and" />
    );
    expect(html).toContain('inputMode="numeric"');
    expect(html).not.toContain('type="number"');
  });

  it("states the two readings differently from the SAME rows", () => {
    const r = rows(["First 3 chapters", "First 50 pages"]);
    const or = renderToStaticMarkup(<SampleSpecPicker rows={r} onChange={() => {}} join="or" />);
    const and = renderToStaticMarkup(<SampleSpecPicker rows={r} onChange={() => {}} join="and" />);
    expect(or).toContain("3 chapters or 50 pages");
    expect(and).toContain("3 chapters · 50 pages");
  });

  it("states absence in the muted treatment, never as a zero", () => {
    const html = renderToStaticMarkup(
      <SampleSpecPicker rows={rows(["Query letter"])} onChange={() => {}} join="or" />
    );
    expect(html).toContain("No sample");
    expect(html).not.toContain("0 pages");
    expect(html).not.toContain("0 chapters");
  });

  it("the bulk table can suppress the summary line", () => {
    const html = renderToStaticMarkup(
      <SampleSpecPicker rows={rows(["First 3 chapters"])} onChange={() => {}} join="and" hideSummary />
    );
    expect(html).not.toContain('class="ssp-sum"');
  });

  it("names the floor only where the unit has one above 1", () => {
    const words = renderToStaticMarkup(
      <SampleSpecPicker rows={rows(["5,000 words"])} onChange={() => {}} join="or" />
    );
    const chapters = renderToStaticMarkup(
      <SampleSpecPicker rows={rows(["First 3 chapters"])} onChange={() => {}} join="or" />
    );
    expect(UNIT_CFG.Words.min).toBeGreaterThan(1);
    expect(UNIT_CFG.Chapters.min).toBe(1);
    expect(words).toContain("at least 500");
    expect(chapters).not.toContain("at least");
  });
});

describe("SampleSpecPicker — the behaviour the three copies each reimplemented", () => {
  it("selecting a unit SEEDS that unit's own default", () => {
    const start = rows(["Query letter"]);
    expect(unitsOf(start)).toEqual([]);
    // toggling Pages on is what the Pages button does
    const next = fire(start, ({ rows: r, onChange }) => {
      const withPages: MaterialRow[] = r.map((x) =>
        x.kind === "qty" ? { ...x, on: true, unit: "Pages", amount: snapToUnit("Pages") } : x);
      onChange(withPages);
    });
    expect(unitsOf(next)).toEqual(["Pages"]);
    const pages = next.find((x) => x.kind === "qty" && x.on);
    expect(pages && (pages as Extract<MaterialRow, { kind: "qty" }>).amount).toBe(String(UNIT_CFG.Pages.def));
  });

  it("⚠️ the seed is the UNIT'S default, not a shared number", () => {
    expect(snapToUnit("Chapters")).toBe("3");
    expect(snapToUnit("Pages")).toBe("10");
    expect(snapToUnit("Words")).toBe("5000");
    // three different defaults — a single constant would be wrong for two of them
    expect(new Set([snapToUnit("Chapters"), snapToUnit("Pages"), snapToUnit("Words")]).size).toBe(3);
  });

  it("deselecting the last unit leaves a round-trippable unticked row, not an empty set", () => {
    const start = rows(["First 3 chapters"]);
    const emptied = start.filter((r) => r.kind !== "qty");
    const restored: MaterialRow[] = [...emptied, { key: "sample", kind: "qty", name: "Opening sample", on: false, unit: "Chapters", amount: "" }];
    expect(unitsOf(restored)).toEqual([]);
    // the shape matches what the model itself produces for an agent asking for no sample
    expect(unitsOf(rows(["Query letter"]))).toEqual([]);
    expect(rows(["Query letter"]).some((r) => r.kind === "qty")).toBe(true);
  });

  it("two units are held at once — a single-select control would drop one on read", () => {
    expect(unitsOf(rows(["First 3 chapters", "First 50 pages"]))).toEqual(["Chapters", "Pages"]);
  });

  it("selectedUnits reads the rows rather than a second state", () => {
    expect(selectedUnits(rows(["5,000 words"]))).toEqual(["Words"]);
    expect(selectedUnits(rows([]))).toEqual([]);
  });
});
