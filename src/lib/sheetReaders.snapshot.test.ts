/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WHAT THE SPREADSHEET READERS PRODUCE, PINNED (dependency audit fix, 8 Nov 2026).
 *
 * The npm `xlsx` package (0.18.5, abandoned) was replaced by SheetJS's own build from
 * cdn.sheetjs.com. The snapshot beside this file was written under 0.18.5, BEFORE the swap, over
 * every tracked spreadsheet fixture; the swap had to leave every entry unchanged. Each entry is a
 * length and a SHA-256 of one reader's output, so a change anywhere in a file's text, cells or
 * template rows changes its hash.
 *
 * ONE ACCEPTED DIFFERENCE (Nick, 8 Nov 2026): reading a .csv, 0.20.3 sets every cell's display text
 * `w` to the cell's own value, where 0.18.5 left it unset. It was measured on all 7,667 CSV cells and
 * was the only difference; the text Smart Import is sent, the loader's sample and the template rows
 * were byte-identical, and the one reader of `w` (sheetText.ts, `cell.w ?? cell.v`) gets the same
 * text either way. So for a .csv only, a `w` equal to `String(v)` is read as unset. For .xlsx and
 * .xls the cells are compared exactly as recorded.
 *
 * This is the reading step only. Nothing here reaches `smartImportMap` or any AI call: the readers
 * are pure functions of the file's bytes.
 */
import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import * as XLSX from "xlsx";
import { bufferToCsv } from "./sheetText";
import { readSheetBook } from "./sheetCells";
import { sampleRawFromBuffer } from "./smartImport";
import { readTemplateBuffer } from "./templateImport";
import { templateRows } from "./templateFile";

const ROOT = resolve(__dirname, "../..");
const DIRS = ["tests/fixtures/import", "tests/fixtures/smart-eval"];
const SHEET = /\.(xlsx|xls|csv)$/i;

const fixtures: string[] = [
  ...DIRS.flatMap((d) =>
    readdirSync(join(ROOT, d))
      .filter((f) => SHEET.test(f))
      .sort()
      .map((f) => `${d}/${f}`),
  ),
  "public/QueryHawk-pipeline-import-template.xlsx",
];

const digest = (value: unknown): string => {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return `${text.length}:${createHash("sha256").update(text).digest("hex").slice(0, 16)}`;
};

/** Every cell of every sheet, in a stable order: the type, the value and the displayed text. */
const cellsOf = (bytes: Uint8Array, csv: boolean) => {
  const book = readSheetBook(XLSX, bytes);
  return book.SheetNames.map((name) => {
    const sheet = book.Sheets[name] ?? {};
    const keys = Object.keys(sheet).filter((k) => !k.startsWith("!")).sort();
    return { name, ref: sheet["!ref"] ?? null, merges: sheet["!merges"] ?? [], cells: keys.map((k) => [k, sheet[k].t, sheet[k].v, (csv && sheet[k].w === String(sheet[k].v) ? null : sheet[k].w ?? null), sheet[k].l?.Target ?? null]) };
  });
};

describe("the spreadsheet readers' output is pinned across the xlsx swap", () => {
  it("finds the fixtures it claims to cover, .xls included", () => {
    expect(fixtures.length).toBeGreaterThan(40);
    expect(fixtures.filter((f) => f.endsWith(".xls")).length).toBe(2);
    expect(fixtures.filter((f) => f.endsWith(".xlsx")).length).toBeGreaterThan(10);
    expect(fixtures.filter((f) => f.endsWith(".csv")).length).toBeGreaterThan(10);
  });

  for (const path of fixtures) {
    it(path, async () => {
      const bytes = new Uint8Array(readFileSync(join(ROOT, path)));
      const out: Record<string, string> = {
        csv: digest(bufferToCsv(bytes)),
        sample: digest(sampleRawFromBuffer(bytes)),
        cells: digest(cellsOf(bytes, /\.csv$/i.test(path))),
      };
      if (/template|pipeline/i.test(path)) out.template = digest(await readTemplateBuffer(bytes));
      expect(out).toMatchSnapshot();
    });
  }

  it("the downloadable template's rows survive the writer and reader", () => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(templateRows()), "Your list");
    const bytes = new Uint8Array(XLSX.write(book, { type: "buffer", bookType: "xlsx" }));
    const back = XLSX.utils.sheet_to_json(readSheetBook(XLSX, bytes).Sheets["Your list"], { header: 1, defval: "" });
    expect(back).toEqual(templateRows());
  });
});
