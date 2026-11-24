/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE TYPED SAMPLE — the model behind `SampleTyped` (Add an agent v2, design v15: "Typed, with common asks"). One line that
 * reads as a sentence, "The first [7,500] Pages / Words / Chapters", five common asks as chips, and — only where the record
 * can keep one — a starting point ("Starting at page [40]", the sentence then reading "Any").
 *
 * It holds the same `Sample` the app's sample picker (`SampleControl`) holds, so either can stand where the other does.
 *
 * ⚠️ ANY WHOLE NUMBER FROM 1, UP TO WHAT STORAGE TAKES: the ceiling is `MAT_QTY`'s (agentMaterials — the storage-level
 *    range, 9,999 pages · 999 chapters · 999,999 words), never the picker's own stepping bounds. Changing the unit keeps
 *    the number (clamped only by that ceiling); the picker's convert-through-words is not used here.
 * ⚠️ THE EXISTING PICKER IS UNTOUCHED: this is a second part beside it, not a change to it.
 */
import { MAT_QTY } from "../agentMaterials";
import { type Sample, type SampleUnit, type FromUnit } from "./sample";

export type TypedUnit = Exclude<SampleUnit, "none">;
/** the order the ref draws the three units in */
export const TYPED_UNITS: readonly TypedUnit[] = ["pages", "words", "chapters"];
export const TYPED_UNIT_LABEL: Record<TypedUnit, string> = { pages: "Pages", words: "Words", chapters: "Chapters" };
const ONE: Record<TypedUnit, string> = { pages: "page", words: "word", chapters: "chapter" };

/** "Often asked for", in the ref's order: each sets the amount and the unit together */
export const COMMON_ASKS: readonly { unit: TypedUnit; amt: number }[] = [
  { unit: "chapters", amt: 3 }, { unit: "pages", amt: 5 }, { unit: "pages", amt: 10 }, { unit: "pages", amt: 50 }, { unit: "words", amt: 10000 },
];

/** the storage ceiling for a unit (MAT_QTY's maxima) */
export const typedMax = (u: TypedUnit): number =>
  u === "pages" ? MAT_QTY["Sample pages"].max : u === "words" ? MAT_QTY["Sample words"].max : MAT_QTY["Sample chapters"].max;

/** 1 up to the unit's storage ceiling */
export const clampAmt = (n: number, u: TypedUnit): number => Math.max(1, Math.min(typedMax(u), Math.floor(Number.isFinite(n) ? n : 1)));

/** words carry a thousands comma (7,500); pages and chapters never do */
export const fmtAmt = (n: number, u: SampleUnit): string => (u === "words" ? n.toLocaleString("en-GB") : String(n));

/** the digits typed, or null when there are none */
export const digitsOf = (raw: string): number | null => {
  const d = raw.replace(/[^0-9]/g, "");
  return d ? parseInt(d, 10) : null;
};

/** what a section's starting point is counted in: words start at a page, the others at their own unit */
export const fromUnitOf = (u: SampleUnit): FromUnit => (u === "chapters" ? "chapter" : "page");

/** the unit changes and the typed number stays */
export const withUnit = (s: Sample, u: TypedUnit): Sample => ({ ...s, unit: u, amt: clampAmt(s.amt, u), fu: s.sect ? fromUnitOf(u) : s.fu });
/** a common ask: amount and unit together, from the opening */
export const withAsk = (s: Sample, c: { unit: TypedUnit; amt: number }): Sample => ({ ...s, unit: c.unit, amt: c.amt, sect: false, from: 1, fu: null });
/** a chip is chosen only when it matches exactly (and only from the opening) */
export const askOn = (s: Sample, c: { unit: TypedUnit; amt: number }): boolean => !s.sect && s.unit === c.unit && s.amt === c.amt;

/** the tile's sub-heading: "First 3 chapters", "First 7,500 words", "7,500 words from page 40" */
export function typedName(s: Sample): string {
  if (s.unit === "none") return "";
  const u = s.unit as TypedUnit;
  const words = `${fmtAmt(s.amt, u)} ${s.amt === 1 ? ONE[u] : u}`;
  if (s.sect) return `${words} from ${s.fu ?? fromUnitOf(u)} ${s.from}`;
  return `First ${words}`;
}
