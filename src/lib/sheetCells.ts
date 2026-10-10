/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * How a spreadsheet's cells are read — ONE reader for both import paths (the template parser and
 * Smart Import), so the two cannot come to read the same file differently.
 *
 * Two rules, and each exists because its absence lost every date in a writer's file:
 *
 * 1. TEXT ARRIVES AS TYPED. SheetJS's default CSV read turns `2026-08-02` into a date cell and then
 *    displays it in Excel's short format, `8/2/26` — which the template parser cannot read and
 *    which swaps day and month for a UK writer. `raw: true` reads text formats without parsing
 *    values, so a text date reaches the parser exactly as the writer wrote it.
 *
 * 2. A REAL DATE CELL IS READ FROM ITS VALUE, NEVER ITS DISPLAY TEXT. An .xlsx date is a serial
 *    number with a date format; its display text depends on the format (`8/2/26`). The serial is
 *    converted to `YYYY-MM-DD` here, by arithmetic on the number — no `Date`, so no time zone.
 *
 * A bare number with no date format is left as the number the writer typed. Whether `46236` was
 * meant as a date is a question for the review, not a decision for the reader.
 */
import type * as XLSXNS from "xlsx";

type Xlsx = typeof XLSXNS;

/** The options every import read uses. `cellNF` keeps each cell's number format, which is how a
 *  date cell is told from a plain number. */
export const SHEET_READ_OPTS = { type: "array", cellDates: false, cellNF: true, raw: true } as const;

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

/** Rewrite every real date cell in the workbook as the text `YYYY-MM-DD`. Mutates `book`. */
export function dateCellsToIso(XLSX: Xlsx, book: XLSXNS.WorkBook): void {
  const date1904 = !!book.Workbook?.WBProps?.date1904;
  for (const name of book.SheetNames) {
    const sheet = book.Sheets[name];
    if (!sheet) continue;
    for (const key of Object.keys(sheet)) {
      if (key[0] === "!") continue;
      const cell = sheet[key] as XLSXNS.CellObject;
      if (!cell || cell.t !== "n" || typeof cell.v !== "number") continue;
      if (typeof cell.z !== "string" && typeof cell.z !== "number") continue;
      if (!XLSX.SSF.is_date(String(cell.z))) continue;
      // A value under one day is a time of day with no date in it — not a date to convert.
      if (cell.v < 1) continue;
      const parts = XLSX.SSF.parse_date_code(cell.v, { date1904 });
      if (!parts || !parts.y) continue;
      cell.t = "s";
      cell.v = `${pad(parts.y, 4)}-${pad(parts.m)}-${pad(parts.d)}`;
      delete cell.w;
      delete cell.z;
    }
  }
}

/** Read a file's bytes into a workbook under both rules above. */
export function readSheetBook(XLSX: Xlsx, data: ArrayBuffer | Uint8Array): XLSXNS.WorkBook {
  const book = XLSX.read(data, SHEET_READ_OPTS);
  dateCellsToIso(XLSX, book);
  return book;
}
