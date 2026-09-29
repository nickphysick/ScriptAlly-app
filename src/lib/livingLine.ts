/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LIVING HEADERS — the shape of the two lines that change. A run of the subline is plain text, a bold
 * name, or a manuscript title in the typewriter face. Copy functions return runs, never markup, so
 * they stay pure and the header decides how each run is drawn.
 */
export type LivingRun = string | { b: string } | { ms: string };
/** The two lines that change with the count. Everything else in the hero is fixed. */
export interface LivingLine { headline: string; subline: readonly LivingRun[] }

/** The subline as plain text — for keys, tests and accessible names. */
export const runsText = (runs: readonly LivingRun[]): string =>
  runs.map((r) => (typeof r === "string" ? r : "b" in r ? r.b : r.ms)).join("");
