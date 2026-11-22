/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * One picker, two readers (two-door import v1). A picked file is read one of two ways, decided by its
 * first sheet's headings and nothing else:
 *   "headings"  the file uses QueryHawk's column headings, so the template parser reads it in the
 *               browser — no Smart Import, no entitlement, no charge, no confirm screen;
 *   "smart"     anything else, read by Smart Import exactly as before.
 * Photos are always "smart": there are no headings to match.
 *
 * ⚠️ ONE DEFINITION OF THE TEMPLATE. The headings are `TEMPLATE_HEADERS` and they are matched the way
 * the template parser matches them (`TEMPLATE_HEADER_LOOKUP` over `normaliseHeader`, lib/templateColumns).
 * Nothing here spells a heading out.
 *
 * ⚠️ EVERY HEADING, AND NOTHING ELSE. The parser ignores a column it does not know, so a file with one
 * column renamed would lose that column's data in silence if it were read straight in, and a file with
 * an extra column of the writer's own would lose that. Either goes to Smart Import, which reads whatever
 * is there. Case and spacing do not count (the parser's own rule); a blank heading cell is not a column.
 */
import { TEMPLATE_HEADERS, TEMPLATE_HEADER_LOOKUP, normaliseHeader } from "./templateColumns";
import { readSheetBook } from "./sheetCells";

export type ImportReadRoute = "headings" | "smart";

/** The route for a first sheet's heading row. Pure. */
export function readRouteFor(headings: readonly unknown[]): ImportReadRoute {
  const seen = new Set<string>();
  for (const h of headings) {
    const raw = String(h ?? "").trim();
    if (!raw) continue;
    const known = TEMPLATE_HEADER_LOOKUP.get(normaliseHeader(raw));
    if (!known) return "smart";
    seen.add(known);
  }
  return TEMPLATE_HEADERS.every((h) => seen.has(h)) ? "headings" : "smart";
}

/** The first sheet's heading row, read the way the template parser reads the file (readSheetBook). */
export async function firstSheetHeadings(buffer: ArrayBuffer | Uint8Array): Promise<unknown[]> {
  const XLSX = await import("xlsx");
  const book = readSheetBook(XLSX, buffer);
  const first = book.SheetNames[0];
  if (!first) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[first], { header: 1, raw: false, defval: "", blankrows: false });
  return rows[0] ?? [];
}

/** A picked file's route. A file that cannot be read for headings goes to Smart Import, as it always did. */
export async function readRouteOfFile(file: File): Promise<ImportReadRoute> {
  try {
    return readRouteFor(await firstSheetHeadings(await file.arrayBuffer()));
  } catch {
    return "smart";
  }
}
