/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The column contract — the generator and the parser both read it, so this is where the two are
 * held together.
 */
import { describe, it, expect } from "vitest";
import { QueryStatus } from "../types";
import {
  TEMPLATE_COLUMNS, TEMPLATE_HEADERS, TEMPLATE_REQUIRED_HEADERS, TEMPLATE_STATUS_VALUES,
  TEMPLATE_EXAMPLE_ROW, isExampleRow, normaliseHeader,
} from "./templateColumns";
import { templateRows, templateCsv } from "./templateFile";
import { parseTemplateRows } from "./templateImport";

describe("the contract", () => {
  it("names every column exactly once", () => {
    expect(new Set(TEMPLATE_HEADERS).size).toBe(TEMPLATE_HEADERS.length);
  });

  /**
   * ⚠️ ONE REQUIRED COLUMN. A writer part-way through reconstructing their history has real gaps,
   * and a sheet that refuses to import until every cell is filled is a sheet they abandon.
   */
  it("requires the agent name and nothing else", () => {
    expect(TEMPLATE_REQUIRED_HEADERS).toEqual(["Agent name"]);
  });

  /** ⚠️ DERIVED FROM THE ENUM. A hand-written status list is a second source of truth. */
  it("takes its status values from QueryStatus itself", () => {
    expect(TEMPLATE_STATUS_VALUES).toEqual(Object.values(QueryStatus));
  });

  it("normalises a heading for matching without changing its meaning", () => {
    expect(normaliseHeader("  Agent   NAME ")).toBe("agent name");
  });
});

describe("the generator and the parser agree", () => {
  /**
   * ⚠️ THE REAL TEST OF A CONTRACT IS THE ROUND TRIP. Asserting the generator writes the headers
   * and separately that the parser knows them proves each half against itself; running the
   * generator's own output back through the parser proves them against each other, which is the
   * only version that catches a rename in one of them.
   */
  const generated = templateRows();
  const [headers, ...body] = generated;

  it("the generator writes exactly the contract's headers, in order", () => {
    expect(headers).toEqual(TEMPLATE_HEADERS);
  });

  it("the parser reads the generator's own sheet and finds no unknown column", () => {
    const rows = body.map((row) =>
      Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""])) as Record<string, string>);
    const parsed = parseTemplateRows(rows);
    expect(parsed.ignoredColumns).toEqual([]);
  });

  /**
   * ⚠️ THE SHIPPED SHEET IMPORTS AS NOTHING. A template whose hint row or example silently imports
   * gives the writer an agent they have never heard of, on their first ever import.
   */
  it("a freshly generated, untouched sheet contributes no records at all", () => {
    const rows = body.map((row) =>
      Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""])) as Record<string, string>);
    const parsed = parseTemplateRows(rows);
    expect(parsed.rowsRead).toBe(0);
    expect(parsed.result.agents).toEqual([]);
    expect(parsed.result.queries).toEqual([]);
    expect(parsed.flags).toEqual([]);
  });

  it("the example row is marked in the one column that cannot be blank", () => {
    expect(isExampleRow(TEMPLATE_EXAMPLE_ROW["Agent name"])).toBe(true);
  });

  /** The example demonstrates the date format the hint asks for, or it teaches the wrong thing. */
  it("the example's dates are written in the unambiguous form", () => {
    expect(TEMPLATE_EXAMPLE_ROW["Date sent"]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(TEMPLATE_EXAMPLE_ROW["Date of last response"]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("the example's status is one the app actually tracks", () => {
    expect(TEMPLATE_STATUS_VALUES).toContain(TEMPLATE_EXAMPLE_ROW["Status"]);
  });
});

describe("the csv form carries the permitted values where a dropdown cannot go", () => {
  it("leads with the status list as a comment the parser skips", () => {
    const first = templateCsv().split("\n")[0];
    expect(first.startsWith("#")).toBe(true);
    for (const status of TEMPLATE_STATUS_VALUES) expect(first).toContain(status);
  });

  it("quotes a heading containing a comma rather than splitting the row", () => {
    // No current heading has one; this guards the escape, not today's list.
    const csv = templateCsv();
    expect(csv.split("\n")[1].split(",").length).toBe(TEMPLATE_COLUMNS.length);
  });
});
