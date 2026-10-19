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

/** The sheet as the text Smart Import is sent. */
export function bufferToCsv(buf: ArrayBuffer | Uint8Array): string {
  const wb = readSheetBook(XLSX, buf);
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_csv(ws); // also handles .csv
}
