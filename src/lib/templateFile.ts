/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The template GENERATOR — writes the sheet the parser reads back, from the same contract.
 *
 * ⚠️ ONE CONSTANT, BOTH ENDS. `TEMPLATE_COLUMNS` is the only place the headings exist; this module
 * writes them and `templateImport.ts` matches them. Neither restates a heading, so neither can
 * drift from the other and fail on a writer's own filled-in sheet with nothing to point at.
 *
 * ⚠️ NO DATA-VALIDATION DROPDOWN, AND THAT IS A LIBRARY LIMIT RATHER THAN A CHOICE. SheetJS's
 * community build cannot WRITE data validation, so the xlsx carries the permitted statuses on a
 * `Reference` sheet the writer can see and copy from, and the parser flags anything that is not one
 * of them. The csv carries the same list as a comment row, which the parser skips. Authoring a real
 * dropdown needs either the pro build or a hand-made workbook — flagged, not faked, because a
 * template that looks validated and is not teaches the writer to trust a check nobody is running.
 */

import {
  TEMPLATE_COLUMNS, TEMPLATE_HEADERS, TEMPLATE_STATUS_VALUES, TEMPLATE_EXAMPLE_ROW,
  TEMPLATE_STATUS_COMMENT, TEMPLATE_COMMENT_PREFIX,
} from "./templateColumns";

export const TEMPLATE_FILENAME = "ScriptAlly-template.xlsx";

/** The rows the sheet ships with: headings, the hint row, and one marked example. */
export function templateRows(): string[][] {
  return [
    TEMPLATE_HEADERS,
    /* ⚠️ THE HINT ROW IS A COMMENT ROW, so the parser skips it by the same rule that skips any
       other. Without the marker it would import as an agent called "Required. One agent per row." */
    TEMPLATE_COLUMNS.map((c, i) => (i === 0 ? `${TEMPLATE_COMMENT_PREFIX} ${c.hint}` : c.hint)),
    TEMPLATE_HEADERS.map((h) => TEMPLATE_EXAMPLE_ROW[h] ?? ""),
  ];
}

/** The csv form — the same rows, with the status list as a leading comment. */
export function templateCsv(): string {
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [[TEMPLATE_STATUS_COMMENT], ...templateRows()]
    .map((row) => row.map(escape).join(","))
    .join("\n");
}

/**
 * Build the workbook and hand it to the browser as a download.
 *
 * ⚠️ LAZY IMPORT. `xlsx` is a large dependency and most writers never touch the template; loading
 * it at module scope would put it in the bundle every onboarding pays for.
 */
export async function downloadTemplate(filename = TEMPLATE_FILENAME): Promise<void> {
  const XLSX = await import("xlsx");
  const book = XLSX.utils.book_new();

  const sheet = XLSX.utils.aoa_to_sheet(templateRows());
  sheet["!cols"] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(14, h.length + 4) }));
  XLSX.utils.book_append_sheet(book, sheet, "Your list");

  // The permitted statuses, visible and copyable — see the docblock on why this is not a dropdown.
  const reference = XLSX.utils.aoa_to_sheet([
    ["Status — copy one of these into the Status column"],
    ...TEMPLATE_STATUS_VALUES.map((s) => [s]),
  ]);
  reference["!cols"] = [{ wch: 46 }];
  XLSX.utils.book_append_sheet(book, reference, "Reference");

  XLSX.writeFile(book, filename);
}
