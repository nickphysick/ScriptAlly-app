/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The text Smart Import is sent — a spreadsheet's bytes turned into the CSV the mapping model reads.
 *
 * Kept Firebase-free on purpose (it imports only SheetJS and the shared cell reader), so the Smart
 * Import evaluation harness (functions/eval/) can convert its fixtures through THIS function rather
 * than a reimplementation that could drift from what the app actually sends. src/lib/smartImport.ts
 * re-exports it, so every existing caller is unchanged.
 */
import * as XLSX from "xlsx";
import { readSheetBook } from "./sheetCells";

/** The heading a sheet's text carries when a workbook has more than one sheet with data in it. */
export const SHEET_HEADING = (name: string) => `### Sheet: ${name}`;

/** A sheet's CSV holds nothing but separators and line breaks. */
const isEmptyCsv = (csv: string) => /^[,\s]*$/.test(csv);

/**
 * The workbook as the text Smart Import is sent.
 *
 * EVERY SHEET WITH DATA IN IT, in workbook order. Writers keep trackers across tabs — an "Archive"
 * of closed queries, a "Rejections" tab, data behind a "Read me" cover sheet — and reading only the
 * first sheet silently dropped all of it. Empty sheets are skipped.
 *
 * Where more than one sheet has data, each is introduced by `### Sheet: <name>` so the model can
 * tell the tabs apart (a tab's name is often the only place a status is written: "Rejections").
 * A workbook with ONE sheet of data converts exactly as it always has — no heading — so every
 * single-sheet file, every .csv included, sends byte-identical text.
 *
 * The callable's 600-line and 200,000-character limits apply to this combined text, as before.
 */
export function bufferToCsv(buf: ArrayBuffer | Uint8Array): string {
  const wb = readSheetBook(XLSX, buf);
  const parts = wb.SheetNames
    .map((name) => ({ name, csv: wb.Sheets[name] ? XLSX.utils.sheet_to_csv(wb.Sheets[name]) : "" }))
    .filter((p) => !isEmptyCsv(p.csv));
  if (parts.length === 0) return wb.Sheets[wb.SheetNames[0]] ? XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]) : "";
  if (parts.length === 1) return parts[0].csv;
  return parts.map((p) => `${SHEET_HEADING(p.name)}\n${p.csv}`).join("\n");
}
