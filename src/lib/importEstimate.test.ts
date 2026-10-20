import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { countDataRows, applyImportUpdate, PROGRESS_START, type LoaderProgress } from "./importEstimate";
import { bufferToCsv } from "./sheetText";

describe("countDataRows", () => {
  it("counts the rows under the header, skipping blank lines", () => {
    expect(countDataRows("Agent,Agency\nA,B\n,,\nC,D\n\n  \nE,F")).toBe(3);
    expect(countDataRows("")).toBe(0);
    expect(countDataRows("Agent,Agency")).toBe(0);
  });
  it("adds every sheet's rows, each under its own header", () => {
    expect(countDataRows("### Sheet: Active\nAgent\nA\nB\n### Sheet: Archive\nAgent\nC")).toBe(3);
  });
  it("over-counts non-data lines that are not blank — a title, a totals line (documented)", () => {
    expect(countDataRows("My tracker\nAgent,Agency\nA,B\nTotal: 1")).toBe(3);
  });
  it("never under-counts a fixture's true rows (locked against all of them)", () => {
    const m = JSON.parse(readFileSync(join("tests", "fixtures", "smart-eval", "manifest.json"), "utf8"));
    let exact = 0;
    for (const f of m.fixtures) {
      const truth = JSON.parse(readFileSync(f.expected, "utf8")).queries.length;
      const n = countDataRows(bufferToCsv(readFileSync(f.file)));
      expect(n, f.id).toBeGreaterThanOrEqual(truth);
      if (n === truth) exact++;
    }
    expect(exact).toBeGreaterThanOrEqual(38);
  });
});

describe("applyImportUpdate", () => {
  const at = (p: Partial<LoaderProgress>): LoaderProgress => ({ ...PROGRESS_START, rowsTotal: 150, ...p });
  it("start sets the total and opens", () => {
    expect(applyImportUpdate(at({ phase: "reading", rowsDone: 9 }), { type: "start", rowsTotal: 40 })).toEqual({ rowsTotal: 40, rowsDone: 0, phase: "opening", stream: "live" });
  });
  it("rows reads, capped at the total and never negative", () => {
    expect(applyImportUpdate(at({}), { type: "rows", rows: 12 })).toMatchObject({ phase: "reading", rowsDone: 12, stream: "live" });
    expect(applyImportUpdate(at({}), { type: "rows", rows: 999 }).rowsDone).toBe(150);
    expect(applyImportUpdate(at({}), { type: "rows", rows: -3 }).rowsDone).toBe(0);
  });
  it("retry starts the count again", () => {
    expect(applyImportUpdate(at({ phase: "reading", rowsDone: 40 }), { type: "retry" })).toMatchObject({ phase: "retry", rowsDone: 0 });
  });
  it("quiet drops to the clock only while still opening", () => {
    expect(applyImportUpdate(at({}), { type: "quiet" }).stream).toBe("none");
    expect(applyImportUpdate(at({ phase: "reading", rowsDone: 3 }), { type: "quiet" }).stream).toBe("live");
  });
  it("plain runs on the clock from the start; a later count brings it back to live", () => {
    const p = applyImportUpdate(at({ phase: "reading", rowsDone: 5 }), { type: "plain" });
    expect(p).toMatchObject({ phase: "opening", stream: "none", rowsDone: 0 });
    expect(applyImportUpdate(p, { type: "rows", rows: 1 }).stream).toBe("live");
  });
  it("result tidies", () => {
    expect(applyImportUpdate(at({ phase: "reading", rowsDone: 149 }), { type: "result" }).phase).toBe("tidying");
  });
});
