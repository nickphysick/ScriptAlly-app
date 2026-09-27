/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The sample control's model (design-refs/query-actions-v11.html §3.5): units, steps, presets,
 * conversion between units, the "from" position of a specific section, and the words that name a
 * sample back to the writer ("first 3 chapters", "pages 40–49", "5,000 words from page 40").
 *
 * ⚠️ A MANUSCRIPT HAS A WORD COUNT AND NO CHAPTER COUNT. Chapters are ESTIMATED from the word count
 * at `WORDS_PER_CHAPTER` so a conversion has something to divide by. The estimate only ever sizes a
 * conversion or an approximation line; nothing stored claims a chapter count the writer never gave.
 */

export type SampleUnit = "pages" | "words" | "chapters" | "none";
export type FromUnit = "chapter" | "page" | "word";

export interface Sample {
  unit: SampleUnit;
  amt: number;
  /** First unit of the section — 1 means "from the opening". */
  from: number;
  /** A specific section rather than the opening. */
  sect: boolean;
  /** The unit `from` is counted in; null takes the unit's default. */
  fu: FromUnit | null;
}

export const WORDS_PER_PAGE = 250;
export const WORDS_PER_CHAPTER = 2000;
/** When a manuscript states no word count, the ceilings are sized for a typical novel. */
const FALLBACK_WORDS = 80000;

export interface Book {
  words: number;
  pages: number;
  chapters: number;
  /** Words per chapter. */
  wpc: number;
}

export function bookOf(wordCount: number | null | undefined, chapterCount?: number | null): Book {
  const words = wordCount && wordCount > 0 ? wordCount : FALLBACK_WORDS;
  const chapters = chapterCount && chapterCount > 0 ? chapterCount : Math.max(1, Math.round(words / WORDS_PER_CHAPTER));
  return { words, pages: Math.max(1, Math.round(words / WORDS_PER_PAGE)), chapters, wpc: Math.round(words / chapters) };
}

interface UnitSpec { step: number; min: number; max: number; pre: number[]; def: number; one: string; many: string }
export function unitSpec(u: Exclude<SampleUnit, "none">, b: Book): UnitSpec {
  if (u === "pages") return { step: 5, min: 1, max: b.pages, pre: [5, 10, 25, 50], def: 10, one: "page", many: "pages" };
  if (u === "words") return { step: 500, min: 500, max: b.words, pre: [1000, 2500, 5000, 10000], def: 5000, one: "word", many: "words" };
  return { step: 1, min: 1, max: b.chapters, pre: [1, 2, 3, 5], def: 3, one: "chapter", many: "chapters" };
}

interface FromSpec { step: number; min: number; max: number; def: number }
export function fromSpec(fu: FromUnit, b: Book): FromSpec {
  if (fu === "chapter") return { step: 1, min: 2, max: b.chapters, def: 4 };
  if (fu === "page") return { step: 5, min: 2, max: b.pages, def: 40 };
  return { step: 1000, min: 1000, max: Math.max(1000, b.words - 1000), def: 20000 };
}
export const defFromUnit = (u: SampleUnit): FromUnit => (u === "pages" ? "page" : "chapter");

export const n0 = (n: number): string => n.toLocaleString("en-GB");

export const toWords = (u: SampleUnit, a: number, b: Book): number =>
  u === "pages" ? a * WORDS_PER_PAGE : u === "chapters" ? a * b.wpc : u === "words" ? a : 0;

/** Convert an amount between units through words, with each unit's own rounding. */
export function convert(u1: SampleUnit, a: number, u2: Exclude<SampleUnit, "none">, b: Book): number {
  const w = toWords(u1, a, b);
  let v: number;
  if (u2 === "words") v = Math.max(500, Math.round(w / 500) * 500);
  else if (u2 === "pages") {
    const p = w / WORDS_PER_PAGE;
    v = p < 5 ? Math.max(1, Math.round(p)) : Math.round(p / 5) * 5;
  } else v = Math.max(1, Math.round(w / b.wpc));
  return Math.min(v, unitSpec(u2, b).max);
}

export const blankSample = (): Sample => ({ unit: "chapters", amt: 3, from: 1, sect: false, fu: null });

export function setUnit(s: Sample, u: SampleUnit, b: Book): Sample {
  if (u === "none") return { ...s, unit: "none" };
  const amt = s.unit !== "none" ? convert(s.unit, s.amt, u, b) : unitSpec(u, b).def;
  return { ...s, unit: u, amt };
}

/** `+`/`−`: pages by 1 below 5 then snap to fives; words snap to 500s; chapters by 1. */
export function bump(s: Sample, d: 1 | -1, b: Book): Sample {
  if (s.unit === "none") return s;
  const U = unitSpec(s.unit, b);
  let v = s.amt;
  if (s.unit === "pages") {
    if (d > 0) v = v < 5 ? v + 1 : (Math.floor(v / 5) + 1) * 5;
    else v = v <= 5 ? v - 1 : (Math.ceil(v / 5) - 1) * 5;
  } else if (s.unit === "words") v = d > 0 ? (Math.floor(v / 500) + 1) * 500 : (Math.ceil(v / 500) - 1) * 500;
  else v = v + d;
  return { ...s, amt: Math.max(U.min, Math.min(U.max, v)) };
}

export function setSect(s: Sample, on: boolean, b: Book): Sample {
  if (!on) return { ...s, sect: false, from: 1 };
  const fu = s.fu || defFromUnit(s.unit);
  return { ...s, sect: true, fu, from: s.from <= 1 ? fromSpec(fu, b).def : s.from };
}

export function setFromUnit(s: Sample, u: FromUnit, b: Book): Sample {
  const old = s.fu || defFromUnit(s.unit);
  if (old === u) return s;
  const w = old === "chapter" ? (s.from - 1) * b.wpc : old === "page" ? (s.from - 1) * WORDS_PER_PAGE : s.from;
  const from =
    u === "chapter" ? Math.max(2, Math.round(w / b.wpc) + 1)
    : u === "page" ? Math.max(2, Math.round(w / WORDS_PER_PAGE / 5) * 5 || 2)
    : Math.max(1000, Math.round(w / 1000) * 1000);
  return { ...s, fu: u, from };
}

export function bumpFrom(s: Sample, d: 1 | -1, b: Book): Sample {
  const F = fromSpec(s.fu || defFromUnit(s.unit), b);
  let v = s.from + d * F.step;
  if (F.step > 1) v = d > 0 ? Math.floor(s.from / F.step) * F.step + F.step : Math.ceil(s.from / F.step) * F.step - F.step;
  return { ...s, from: Math.max(F.min, Math.min(F.max, v)) };
}

/** `first 3 chapters` · `chapter 4` · `chapters 4–6` · `pages 40–49` · `5,000 words from page 40`. */
export function sampleName(s: Sample | null | undefined): string {
  if (!s || s.unit === "none") return "no sample";
  const a = s.amt;
  const one = s.unit === "pages" ? "page" : s.unit === "words" ? "word" : "chapter";
  const word = a === 1 ? one : `${one}s`;
  if (!s.sect) return `first ${n0(a)} ${word}`;
  const fu = s.fu || defFromUnit(s.unit);
  const f = s.from;
  if (s.unit === "chapters" && fu === "chapter") return a === 1 ? `chapter ${f}` : `chapters ${f}–${f + a - 1}`;
  if (s.unit === "pages" && fu === "page") return `pages ${n0(f)}–${n0(f + a - 1)}`;
  if (s.unit === "words" && fu === "word") return `words ${n0(f)}–${n0(f + a)}`;
  return `${n0(a)} ${word} from ${fu} ${n0(f)}`;
}

/** `≈ 7,500 WORDS · 9% OF THE BOOK` · `≈ 2.4 CHAPTERS · 6% OF THE BOOK`. */
export function sampleApprox(s: Sample, b: Book): string {
  if (s.unit === "none") return "";
  const w = toWords(s.unit, s.amt, b);
  const pc = Math.round((w / b.words) * 100);
  if (s.unit === "words") return `≈ ${(s.amt / b.wpc).toFixed(1)} CHAPTERS · ${pc}% OF THE BOOK`;
  return `≈ ${n0(Math.round(w / 50) * 50)} WORDS · ${pc}% OF THE BOOK`;
}

export const capFirst = (t: string): string => (t ? t[0].toUpperCase() + t.slice(1) : t);

/** The materials a writer sent, as a sentence: `Query letter, synopsis and first 3 chapters`. */
export interface Materials { ql: boolean; syn: boolean; s: Sample }
export function materialsName(m: Materials): string {
  const p: string[] = [];
  if (m.ql) p.push("query letter");
  if (m.syn) p.push("synopsis");
  if (m.s.unit !== "none") p.push(sampleName(m.s));
  if (!p.length) return "nothing selected";
  const t = p.length > 2 ? `${p.slice(0, -1).join(", ")} and ${p[p.length - 1]}` : p.join(" and ");
  return capFirst(t);
}

export const sameSample = (a: Sample, b: Sample): boolean =>
  a.unit === b.unit && (a.unit === "none" || (a.amt === b.amt && !!a.sect === !!b.sect && (!a.sect || (a.from === b.from && (a.fu || defFromUnit(a.unit)) === (b.fu || defFromUnit(b.unit))))));
