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

/** A zip (.xlsx, .xlsb, .ods) or an OLE compound file (.xls) — binary formats that carry their own
 *  text encoding. Everything else that reaches the importer is text: a .csv, .tsv or .txt.
 *  ⚠️ NO TEST CAN SEE THIS GUARD, AND THAT IS NOT A REASON TO DELETE IT. A real workbook is never
 *  valid UTF-8 (measured: 0 of 26 .xlsx fixtures decode), so the strict decode below already rejects
 *  one and the old path reads it. This stops a workbook being decoded as text by luck. */
function isBinaryWorkbook(bytes: Uint8Array): boolean {
  const zip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  const ole = bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
  return zip || ole;
}

/**
 * 3. A TEXT FILE IS UTF-8 WHENEVER ITS BYTES ARE VALID UTF-8. SheetJS reads CSV bytes with no BOM as
 *    Latin-1, so a Google Sheets export — UTF-8, no BOM — turned "Zoë" into "ZoÃ«" and every curly
 *    quote, dash and emoji into debris, before either import path saw a cell. Text bytes are decoded
 *    strictly as UTF-8 and the TEXT is handed to SheetJS; a BOM is stripped by the decoder, so it
 *    never lands in the first header cell. Bytes that are NOT valid UTF-8 — a genuine Windows-1252
 *    or Latin-1 file — read exactly as they always have. No other encoding is ever guessed.
 */
function asText(data: ArrayBuffer | Uint8Array): string | null {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (isBinaryWorkbook(bytes)) return null;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** Read a file's bytes into a workbook under all three rules above. */
export function readSheetBook(XLSX: Xlsx, data: ArrayBuffer | Uint8Array): XLSXNS.WorkBook {
  const text = asText(data);
  const book = text === null ? XLSX.read(data, SHEET_READ_OPTS) : XLSX.read(text, { ...SHEET_READ_OPTS, type: "string" });
  dateCellsToIso(XLSX, book);
  return book;
}
