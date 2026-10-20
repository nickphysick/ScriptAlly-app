import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { readSheetBook } from "./sheetCells";
import { bufferToCsv } from "./sheetText";

const utf8 = (s: string) => new TextEncoder().encode(s);
const firstSheetCsv = (bytes: Uint8Array) => {
  const wb = readSheetBook(XLSX, bytes);
  return XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
};
const firstHeader = (bytes: Uint8Array) => {
  const wb = readSheetBook(XLSX, bytes);
  return String(wb.Sheets[wb.SheetNames[0]]["A1"]?.v);
};

const ROW = "Zoë Brontë,Café “Literary” – Ltd,loved it — 🎉";
const TEXT = `Agent,Agency,Notes\n${ROW}\n`;

describe("readSheetBook reads a text file as UTF-8 when its bytes are UTF-8", () => {
  it("a UTF-8 CSV with NO BOM (a Google Sheets export) keeps accents, curly quotes, dashes and emoji", () => {
    expect(firstSheetCsv(utf8(TEXT)).split("\n")[1]).toBe(ROW);
  });

  it("a UTF-8 CSV WITH a BOM reads the same, and the BOM is not in the first header cell", () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...utf8(TEXT)]);
    expect(firstSheetCsv(bytes).split("\n")[1]).toBe(ROW);
    expect(firstHeader(bytes)).toBe("Agent");
  });

  it("a genuine Windows-1252 CSV still reads as it always has", () => {
    // "Zoë" and "Café" in Windows-1252: ë = 0xEB, é = 0xE9 — not valid UTF-8, so the old path reads it.
    const bytes = new Uint8Array([...utf8("Agent,Agency\n"), 0x5a, 0x6f, 0xeb, 0x2c, 0x43, 0x61, 0x66, 0xe9, 0x0a]);
    expect(firstSheetCsv(bytes)).toBe("Agent,Agency\nZoë,Café");
  });

  it("an .xlsx is untouched — it carries its own encoding", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Agent", "Agency"], ["Zoë Brontë", "Café – Ltd 🎉"]]), "Queries");
    const bytes = new Uint8Array(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
    expect(firstSheetCsv(bytes)).toBe("Agent,Agency\nZoë Brontë,Café – Ltd 🎉");
  });

  it("reaches Smart Import's conversion, which reads through the same reader", () => {
    expect(bufferToCsv(utf8(TEXT)).split("\n")[1]).toBe(ROW);
  });

  it("leaves a plain-ASCII CSV byte-identical", () => {
    const ascii = "Agent,Agency,Date sent\nClara Voss,Pemberton,14/03/2024\n";
    expect(firstSheetCsv(utf8(ascii))).toBe("Agent,Agency,Date sent\nClara Voss,Pemberton,14/03/2024");
  });
});
