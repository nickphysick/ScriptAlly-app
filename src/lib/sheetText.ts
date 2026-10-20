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

/**
 * MERGED CELLS CARRY THEIR VALUE INTO EVERY CELL THEY COVER. A writer who merges one agency down the
 * rows of its three agents sees the agency on every row; the file stores it once, in the range's
 * top-left cell, and every other cell is empty — so the CSV said the agency for the first agent and
 * nothing for the rest. Copying the top-left cell across the range gives each row what the writer
 * sees. A range whose top-left cell is empty is left alone (there is nothing to carry). Mutates.
 */
export function fillMergedRanges(sheet: XLSX.WorkSheet): void {
  for (const m of sheet["!merges"] ?? []) {
    const top = sheet[XLSX.utils.encode_cell(m.s)] as XLSX.CellObject | undefined;
    if (!top || top.v === undefined || top.v === "") continue;
    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        if (r === m.s.r && c === m.s.c) continue;
        sheet[XLSX.utils.encode_cell({ r, c })] = { ...top };
      }
    }
  }
}

/** Only these link targets are written into the text; mailto:, file:, internal sheet references
 *  and anything else are dropped. */
const WEB_LINK = /^https?:\/\/\S+$/i;

/**
 * A HYPERLINK'S TARGET IS PART OF WHAT THE CELL SAYS. Writers link an agent's name to the agency's
 * website and keep no website column, so the target is the only place the site is recorded — and
 * the CSV kept the name and dropped the link. Where a cell carries an http(s) link, its text becomes
 * `<text> <url>` (or just the url when the text is the url already). Mutates.
 */
export function appendLinkTargets(sheet: XLSX.WorkSheet): void {
  for (const key of Object.keys(sheet)) {
    if (key[0] === "!") continue;
    const cell = sheet[key] as XLSX.CellObject;
    const target = cell?.l?.Target?.trim();
    if (!target || !WEB_LINK.test(target)) continue;
    const text = String(cell.w ?? cell.v ?? "").trim();
    cell.t = "s";
    cell.v = !text || text === target ? `<${target}>` : `${text} <${target}>`;
    delete cell.w;
  }
}

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
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    fillMergedRanges(ws);
    appendLinkTargets(ws);
  }
  const parts = wb.SheetNames
    .map((name) => ({ name, csv: wb.Sheets[name] ? XLSX.utils.sheet_to_csv(wb.Sheets[name]) : "" }))
    .filter((p) => !isEmptyCsv(p.csv));
  if (parts.length === 0) return wb.Sheets[wb.SheetNames[0]] ? XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]) : "";
  if (parts.length === 1) return parts[0].csv;
  return parts.map((p) => `${SHEET_HEADING(p.name)}\n${p.csv}`).join("\n");
}
