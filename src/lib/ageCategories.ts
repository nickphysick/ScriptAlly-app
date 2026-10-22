/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v28 Part E — THE UK AGE CATEGORIES, and the one read-time normaliser every reader goes through.
 *
 *   main   Adult (18+) · Young adult (12–18) · Middle grade (9–12)
 *   Other  Young fiction (5–8, first chapter books) · Picture book (0–6) · New adult (18–25)
 *
 * Labels are sentence case, UK naming; Adult is first and the default for a new manuscript.
 *
 * ⚠️ STORED VALUES ARE NOT REWRITTEN. Old labels ("Picture Book", "Early Reader", "Middle Grade", "Young Adult",
 *    "New Adult"), the genre ids agents carry ("young-adult", "middle-grade", "picture-book") and the usual shorthands
 *    (YA, MG, NA) all read as the new label here, for display and for matching, on manuscripts and agents alike. A
 *    record takes the new label only when it is next saved. A value that maps to nothing is shown as stored.
 */
import { matchKey } from "./genres";

export interface AgeCategory { label: string; range: string; note?: string; main: boolean }

export const AGE_LIST: readonly AgeCategory[] = [
  { label: "Adult", range: "18+", main: true },
  { label: "Young adult", range: "12–18", main: true },
  { label: "Middle grade", range: "9–12", main: true },
  { label: "Young fiction", range: "5–8", note: "First chapter books", main: false },
  { label: "Picture book", range: "0–6", note: "Text, or written and illustrated", main: false },
  { label: "New adult", range: "18–25", note: "Some agents list it; most query as adult", main: false },
];
export const AGE_LABELS: readonly string[] = AGE_LIST.map((a) => a.label);
export const DEFAULT_AGE = "Adult";

const ALIASES: Record<string, string> = {
  adult: "Adult", "adult fiction": "Adult",
  "young adult": "Young adult", ya: "Young adult",
  "middle grade": "Middle grade", mg: "Middle grade",
  "young fiction": "Young fiction", "early reader": "Young fiction", "early readers": "Young fiction",
  "chapter book": "Young fiction", "chapter books": "Young fiction", "first chapter books": "Young fiction",
  "picture book": "Picture book", "picture books": "Picture book",
  "new adult": "New adult", na: "New adult",
};

/** The new label a stored or typed value stands for, or null when it names no age category. */
export function normaliseAgeCategory(raw: string | null | undefined): string | null {
  const k = matchKey(String(raw ?? "")); /* "Young-Adult", "young_adult" and "YOUNG ADULT" share a key */
  return k ? ALIASES[k] ?? null : null;
}
/** What to show for a stored value: its new label, or the value as stored when it maps to nothing. */
export const ageDisplay = (raw: string | null | undefined): string => normaliseAgeCategory(raw) ?? String(raw ?? "").trim();
/** Whether two stored values name the same age category (old or new spelling, label or id). */
export function sameAgeCategory(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = normaliseAgeCategory(a), y = normaliseAgeCategory(b);
  return !!x && x === y;
}
/** The age categories an agent's genres name (agents carry ages as genres: "Young Adult", "young-adult"). */
export const agentAgeCategories = (genres: readonly string[] | null | undefined): string[] =>
  [...new Set((genres ?? []).map(normaliseAgeCategory).filter((x): x is string => !!x))];
/** Smart Import / CSV import: a parsed value as it is stored — the new label where it maps, else as read. */
export const importAgeCategory = (raw: string | null | undefined): string => normaliseAgeCategory(raw) ?? String(raw ?? "").trim();
/** The entry for a label (new or old spelling), or undefined. */
export const ageEntry = (raw: string | null | undefined): AgeCategory | undefined => {
  const l = normaliseAgeCategory(raw);
  return l ? AGE_LIST.find((a) => a.label === l) : undefined;
};
