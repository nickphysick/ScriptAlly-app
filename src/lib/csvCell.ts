/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * csvCell — ONE rule for writing a value into a CSV file.
 *
 * ⚠️ RFC 4180 QUOTING IS NOT A FORMULA GUARD, and believing it is was the fault. Both of this
 * app's exports quoted correctly for `"`, `,` and newlines, and neither looked at the first
 * character — so `=HYPERLINK("http://evil","click")` was written out and EVALUATED when the file
 * was opened. Excel, Sheets and LibreOffice all strip the CSV quotes before parsing the cell, so
 * `"=…"` is still a formula: quoting cannot neutralise one, and the two jobs are separate.
 *
 * ⚠️ THE ORDER IS NEUTRALISE, THEN QUOTE. Reversed, the apostrophe lands OUTSIDE the quotes —
 * `'"=SUM(A1,A2)"` — where it is a stray character in the file rather than a literal in the cell,
 * and the formula is quoted but still live.
 *
 * ⚠️ AND THE TEXT IS NOT ALWAYS THE WRITER'S OWN, which is why this is not merely a footgun they
 * point at themselves. Agent name, agency and email reach the Queries export through Smart Import,
 * which parses third-party CSVs and pasted agent emails.
 *
 * ⚠️ ONE HOME, TWO CALLERS. `Queries.tsx`'s `escapeCSVField` and `todoHandoff.ts`'s `csvField` had
 * the same hole independently — the second was found only by asking what ELSE builds a CSV, not by
 * reading the reported line. Fixing one and leaving the other is the shape this file forecloses.
 */

/**
 * The six leads a spreadsheet reads as the start of an expression. Tab and CR are here because a
 * leading whitespace character is stripped on parse, which promotes whatever follows it to the
 * front of the cell.
 */
const FORMULA_LEAD = /^[=+\-@\t\r]/;

/**
 * ⚠️ NOTHING IN EITHER EXPORT LEGITIMATELY BEGINS WITH `-`. It is the one lead that could have
 * cost a real cell its appearance, and the only numeric column in the Queries export is
 * `calculateDaysSince` (Queries.tsx:2807), which clamps a negative to `"0"` rather than emitting
 * it. Checked rather than assumed.
 */
export function csvCell(value: string): string {
  const neutral = FORMULA_LEAD.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(neutral) || neutral.startsWith("'")
    ? `"${neutral.replace(/"/g, '""')}"`
    : neutral;
}
