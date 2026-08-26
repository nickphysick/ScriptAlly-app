/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CSV cell safety — formula injection and RFC 4180 quoting.
 *
 * ⚠️ RFC QUOTING DOES NOT NEUTRALISE A FORMULA, which is the whole reason this file exists. Both
 * exports quoted correctly for `"` `,` and newlines and neither guarded the leading character, so
 * a cell reading `=HYPERLINK("http://x","click")` was written out and evaluated on open: Excel,
 * Sheets and LibreOffice all strip the CSV quotes BEFORE parsing the cell, so `"=..."` is still a
 * formula. Quoting and neutralising are different jobs and the file needed both.
 *
 * ⚠️ AND THE TEXT IS NOT ALWAYS THE WRITER'S OWN. Agent name, agency and email reach the Queries
 * export through Smart Import, which parses third-party CSVs and pasted agent emails — so this is
 * not only a self-inflicted footgun.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { csvCell } from "./csvCell";
import { tasksCsv } from "./todoHandoff";

/**
 * The To-do export, through its real public function — the one that ships.
 *
 * ⚠️ IT REJOINS EVERYTHING AFTER THE HEADER RATHER THAN TAKING `split("\n")[1]`. A correctly
 * quoted cell containing a newline makes its row span two physical lines, so indexing the second
 * line truncates the row mid-cell and reports correct quoting as a failure. The test asserting
 * newline quoting is precisely the one that cannot use a line index.
 */
const cellsOf = (deed: string) =>
  tasksCsv([{ bucket: "Urgent", deed, agent: "A", agency: "B", figureLabel: "", figure: "" }])
    .split("\n").slice(1).join("\n");

describe("CSV exports neutralise formula-leading characters", () => {
  // The six leads every spreadsheet treats as the start of an expression.
  const LEADS = ["=", "+", "-", "@", "\t", "\r"];

  it.each(LEADS)("a cell beginning %j is neutralised", (lead) => {
    const row = cellsOf(`${lead}HYPERLINK("http://evil","x")`);
    expect(row.includes(`,${lead}HYPERLINK`), `a bare ${JSON.stringify(lead)} lead reached the file`).toBe(false);
    expect(row).toContain("'");
  });

  it("the classic payload cannot open as a formula", () => {
    const row = cellsOf('=cmd|\' /C calc\'!A0');
    expect(row.startsWith("=") || row.includes(",=")).toBe(false);
  });

  it("leaves an ordinary cell exactly as it was", () => {
    expect(cellsOf("Sent the first fifty pages")).toContain("Sent the first fifty pages");
    expect(cellsOf("Sent the first fifty pages")).not.toContain("'Sent");
  });

  /**
   * ⚠️ THE EXISTING QUOTING MUST SURVIVE THE GUARD. Neutralise first, then quote — the other order
   * puts the prefix outside the quotes, where it is a stray character in the file rather than a
   * literal in the cell.
   */
  it("still quotes a comma, a quote and a newline", () => {
    expect(cellsOf("Hart, Eleanor")).toContain('"Hart, Eleanor"');
    expect(cellsOf('She said "no"')).toContain('"She said ""no"""');
    expect(cellsOf("line one\nline two")).toContain('"line one\nline two"');
  });

  it("a cell that needs BOTH is neutralised inside its quotes", () => {
    const row = cellsOf("=SUM(A1,A2)");
    expect(row).toContain(`"'=SUM(A1,A2)"`);
  });
});

describe("csvCell — the rule itself", () => {
  it.each(["=", "+", "-", "@", "\t", "\r"])("prefixes a %j lead", (lead) => {
    expect(csvCell(`${lead}SUM(1)`).replace(/^"|"$/g, "")).toBe(`'${lead}SUM(1)`);
  });

  it("neutralises BEFORE quoting, so the prefix is inside the cell", () => {
    // The other order gives `'"=SUM(A1,A2)"` — a stray character in the FILE rather than a literal
    // in the CELL, and the formula still live.
    expect(csvCell("=SUM(A1,A2)")).toBe(`"'=SUM(A1,A2)"`);
  });

  it("leaves an ordinary value byte-identical", () => {
    expect(csvCell("Eleanor Hart")).toBe("Eleanor Hart");
    expect(csvCell("")).toBe("");
    expect(csvCell("2026-01-01")).toBe("2026-01-01");
  });

  it("keeps the RFC 4180 quoting it already did", () => {
    expect(csvCell("Hart, Eleanor")).toBe('"Hart, Eleanor"');
    expect(csvCell('She said "no"')).toBe('"She said ""no"""');
    expect(csvCell("a\nb")).toBe('"a\nb"');
    expect(csvCell("a\r\nb")).toBe('"a\r\nb"');
  });
});

/**
 * ⚠️ THIS PAIR IS A WIRING LOCK, NOT A BEHAVIOUR ONE, and the distinction is the point. The
 * behaviour is proved above by calling `csvCell` and `tasksCsv` for real; these two only assert
 * that the app's two CSV writers still route THROUGH that rule. A source lock cannot prove the
 * code ran — it can prove a second escaper has not quietly grown back, which is exactly how this
 * fault came to exist in two places independently.
 */
describe("both CSV exports route through the one rule", () => {
  const decls = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  it("Queries.tsx's escapeCSVField delegates rather than re-implementing", () => {
    const src = decls(readFileSync(join(__dirname, "..", "components", "Queries.tsx"), "utf8"));
    expect(src).toContain("csvCell(String(val).trim())");
    // The old hand-rolled body must not come back beside it.
    expect(src).not.toContain(`str.replace(/"/g, '""')`);
  });

  it("todoHandoff.ts's csvField delegates rather than re-implementing", () => {
    const src = decls(readFileSync(join(__dirname, "todoHandoff.ts"), "utf8"));
    expect(src).toContain("const csvField = csvCell");
    expect(src).not.toContain(`v.replace(/"/g, '""')`);
  });
});
