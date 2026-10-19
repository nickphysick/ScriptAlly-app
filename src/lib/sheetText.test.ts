import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { bufferToCsv } from "./sheetText";
import { bufferToCsv as viaSmartImport } from "./smartImport";

const src = readFileSync(join("src", "lib", "sheetText.ts"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("sheetText — the Firebase-free conversion", () => {
  it("imports only SheetJS and the shared cell reader", () => {
    const froms = [...src.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]).sort();
    expect(froms).toEqual(["./sheetCells", "xlsx"]);
    expect(src).not.toMatch(/firebase/i);
  });
  it("is the very function smartImport re-exports, so the harness converts as the app does", () => {
    expect(viaSmartImport).toBe(bufferToCsv);
  });
});

// ── Fix 1 (Smart Import eval, Phase 6): every tab ─────────────────────────────────────────────
import * as XLSX from "xlsx";
import { SHEET_HEADING } from "./sheetText";

function book(sheets: [string, unknown[][]][]): Uint8Array {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of sheets) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
  return new Uint8Array(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

describe("bufferToCsv reads every sheet with data in it", () => {
  it("includes a second tab, each introduced by its name", () => {
    const text = bufferToCsv(book([["Active", [["Agent", "Status"], ["Clara Voss", "Queried"]]], ["Archive", [["Agent", "Status"], ["Tomas Vidal", "pass"]]]]));
    expect(text).toBe(`${SHEET_HEADING("Active")}\nAgent,Status\nClara Voss,Queried\n${SHEET_HEADING("Archive")}\nAgent,Status\nTomas Vidal,pass`);
  });

  it("finds data behind a cover sheet", () => {
    const text = bufferToCsv(book([["Read me", [["How I use this tracker"]]], ["Queries", [["Agent"], ["Clara Voss"]]]]));
    expect(text).toContain("Clara Voss");
    expect(text.indexOf(SHEET_HEADING("Read me"))).toBeLessThan(text.indexOf(SHEET_HEADING("Queries")));
  });

  it("skips empty sheets, and gives a workbook with ONE sheet of data no heading at all", () => {
    const text = bufferToCsv(book([["Queries", [["Agent"], ["Clara Voss"]]], ["Notes", []], ["Blank", [["", ""], ["", ""]]]]));
    expect(text).toBe("Agent\nClara Voss");
    expect(text).not.toContain("###");
  });

  it("leaves a .csv byte-identical to the first-sheet-only conversion", () => {
    const csv = new TextEncoder().encode("Agent,Agency\nClara Voss,Pemberton\n");
    const wb = XLSX.read(csv, { type: "array", raw: true });
    expect(bufferToCsv(csv)).toBe(XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]));
  });
});

// ── Fix 2 (Smart Import eval, Phase 6): merged cells ──────────────────────────────────────────
describe("bufferToCsv carries a merged range's value into every cell it covers", () => {
  const merged = (merges: XLSX.Range[], rows: unknown[][]) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!merges"] = merges;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Queries");
    return new Uint8Array(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
  };

  it("gives every row of a merged agency its agency", () => {
    const buf = merged([{ s: { r: 1, c: 1 }, e: { r: 3, c: 1 } }],
      [["Agent", "Agency"], ["Clara Voss", "Pemberton"], ["Jamal Carter", ""], ["Owen Hale", ""], ["Tomas Vidal", "Quill"]]);
    expect(bufferToCsv(buf)).toBe("Agent,Agency\nClara Voss,Pemberton\nJamal Carter,Pemberton\nOwen Hale,Pemberton\nTomas Vidal,Quill");
  });

  it("fills a range across columns as well as down rows", () => {
    const buf = merged([{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }], [["My tracker", "", ""], ["a", "b", "c"]]);
    expect(bufferToCsv(buf).split("\n")[0]).toBe("My tracker,My tracker,My tracker");
  });

  it("leaves a range alone whose top-left cell is empty", () => {
    const buf = merged([{ s: { r: 1, c: 1 }, e: { r: 2, c: 1 } }], [["Agent", "Agency"], ["Clara Voss", ""], ["Jamal Carter", ""]]);
    expect(bufferToCsv(buf)).toBe("Agent,Agency\nClara Voss,\nJamal Carter,");
  });
});

// ── Fix 3 (Smart Import eval, Phase 6): hyperlinks ────────────────────────────────────────────
describe("bufferToCsv keeps a web link's target", () => {
  const linked = (cells: [string, string | undefined][]) => {
    const ws = XLSX.utils.aoa_to_sheet([["Agent"], ...cells.map(([t]) => [t])]);
    cells.forEach(([, url], i) => { if (url) (ws[XLSX.utils.encode_cell({ r: i + 1, c: 0 })] as any).l = { Target: url }; });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Queries");
    return new Uint8Array(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
  };

  it("appends an http(s) target to the cell's text", () => {
    expect(bufferToCsv(linked([["Clara Voss", "https://www.pemberton.co.uk"], ["Jamal Carter", undefined]])))
      .toBe("Agent\nClara Voss <https://www.pemberton.co.uk>\nJamal Carter");
  });

  it("drops every other kind of target", () => {
    const text = bufferToCsv(linked([["Clara Voss", "mailto:clara@pemberton.co.uk"], ["Owen Hale", "file:///C:/notes.docx"], ["Ines", "#Archive!A1"]]));
    expect(text).toBe("Agent\nClara Voss\nOwen Hale\nInes");
  });

  it("does not repeat a url that is already the cell's text", () => {
    expect(bufferToCsv(linked([["https://www.quill.co.uk", "https://www.quill.co.uk"]]))).toBe("Agent\n<https://www.quill.co.uk>");
  });
});
