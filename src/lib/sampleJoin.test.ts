/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The two readings of a sample — `or` (the agent offers a choice) vs `·` (one parcel, two
 * measures) — and the "Will record:" line both surfaces state their commit with.
 *
 * ⚠️ EVERY INPUT IS DERIVED FROM `materialRowsFromAgent`, NEVER HAND-WRITTEN. The rows these
 * formatters meet in production are that function's output; a literal `MaterialRow[]` typed here
 * would be a shape the system may not actually produce, and would go green the day the producing
 * mapping moves. (This is the trap `journeyMaterials` fell into — a test passing for the life of a
 * feature over an argument no caller could generate.)
 */
import { describe, it, expect } from "vitest";
import {
  materialRowsFromAgent,
  materialsWantedFromRows,
  formatSampleSpecs,
  sampleRowText,
  willRecordText,
  type MaterialRow,
} from "./agentMaterials";

/** Stored materials → rows, exactly as every real caller gets them. */
const rows = (stored: string[]): MaterialRow[] => materialRowsFromAgent(stored);

describe("formatSampleSpecs — the join carries the meaning", () => {
  it("reads two units as a CHOICE under `or`", () => {
    const r = rows(["First 3 chapters", "First 50 pages"]);
    expect(formatSampleSpecs(r, "or")).toBe("3 chapters or 50 pages");
  });

  it("reads the same two units as ONE PARCEL under `and`", () => {
    const r = rows(["First 3 chapters", "First 50 pages"]);
    expect(formatSampleSpecs(r, "and")).toBe("3 chapters · 50 pages");
  });

  it("⚠️ the two readings genuinely differ — a single formatter would hide the distinction", () => {
    const r = rows(["First 3 chapters", "First 50 pages"]);
    expect(formatSampleSpecs(r, "or")).not.toBe(formatSampleSpecs(r, "and"));
  });

  it("a single unit reads identically either way — the join only shows with two", () => {
    const r = rows(["First 3 chapters"]);
    expect(formatSampleSpecs(r, "or")).toBe("3 chapters");
    expect(formatSampleSpecs(r, "and")).toBe("3 chapters");
  });

  it("states absence as null, never as a zero", () => {
    expect(formatSampleSpecs(rows(["Query letter"]), "or")).toBeNull();
    expect(formatSampleSpecs(rows([]), "and")).toBeNull();
  });

  it("thousands are grouped, and words survive the round trip", () => {
    expect(formatSampleSpecs(rows(["5,000 words"]), "or")).toBe("5,000 words");
  });
});

describe("sampleRowText", () => {
  it("singularises at one rather than reading '1 chapters'", () => {
    const r = rows(["First 1 chapters"]);
    const qty = r.find((x) => x.kind === "qty" && x.on);
    expect(qty && sampleRowText(qty as Extract<MaterialRow, { kind: "qty" }>)).toBe("1 chapter");
  });

  it("an amountless selected row reads as its bare unit, inventing no number", () => {
    // materialRowsFromAgent emits an unticked sample row when no unit is stored; tick it as the
    // editor does on first click, before an amount is chosen.
    const base = rows(["Query letter"]).map((x) => (x.kind === "qty" ? { ...x, on: true, amount: "" } : x));
    expect(formatSampleSpecs(base, "or")).toBe("chapters");
  });
});

describe("willRecordText — the strip states the outcome, not a count of forms", () => {
  it("names the materials in row order with the sample in place", () => {
    const r = rows(["Query letter", "Synopsis", "First 3 chapters"]);
    expect(willRecordText(r)).toBe("Query letter · Synopsis · 3 chapters");
  });

  it("folds two sample units into ONE clause rather than listing them as two materials", () => {
    const r = rows(["Query letter", "First 3 chapters", "First 50 pages"]);
    expect(willRecordText(r)).toBe("Query letter · 3 chapters · 50 pages");
    // …and the fold is real: the sample contributes one segment, not two.
    expect(willRecordText(r)?.split(" · ")).toHaveLength(3);
  });

  it("carries the writer's own words for Other, with no 'Other —' prefix", () => {
    const r = rows(["Query letter", "Other", "Author testimonial"]);
    expect(willRecordText(r)).toContain("Author testimonial");
    expect(willRecordText(r)).not.toContain("Other —");
  });

  it("keeps the synopsis page count when one is stored", () => {
    expect(willRecordText(rows(["Synopsis (2 pages)"]))).toBe("Synopsis · 2 pages");
  });

  it("is null when nothing is ticked — the caller states absence in its own words", () => {
    expect(willRecordText(rows([]))).toBeNull();
  });

  it("⚠️ round-trips: what the strip promises is what the rows would store", () => {
    const r = rows(["Query letter", "Synopsis", "First 3 chapters"]);
    // The strip is a reading of the SAME rows the write path encodes — not a parallel derivation.
    expect(materialsWantedFromRows(r)).toEqual(["Query letter", "Synopsis", "First 3 chapters"]);
    expect(willRecordText(r)).toBe("Query letter · Synopsis · 3 chapters");
  });
});
