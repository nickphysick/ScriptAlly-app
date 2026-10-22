/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscripts v28 — the edit drawer's pure half.
 *
 * Part C — THE WORD-COUNT HINT SAYS NOTHING UNLESS THE COUNT IS WAY OFF: below 75% of the main genre's range minimum or
 * above 125% of its maximum. Inside that band there is no line at all (no "typical for…"). The range is the genre's own
 * (`wordCountRangeForGenre`, which a sub-genre inherits from its parent), or the generic range for a genre the taxonomy
 * does not know. With no genre, or no count, there is no hint.
 */
import { canonicalIdOf, genreDisplay, wordCountRangeForGenre, GENERIC_WORD_COUNT_RANGE } from "./genres";

export const WC_UNDER = 0.75;
export const WC_OVER = 1.25;

export interface WordCountHint { side: "under" | "over"; lead: string; rest: string }

const nums = (range: string): [number, number] | null => {
  const m = range.match(/[\d,]+/g);
  if (!m || m.length < 2) return null;
  const [lo, hi] = m.map((x) => Number(x.replace(/,/g, "")));
  return lo > 0 && hi > 0 ? [lo, hi] : null;
};

/** The hint for a typed count against the stored main genre (a label or an id), or null. */
export function wordCountHint(words: number | null, genre: string | null | undefined): WordCountHint | null {
  const g = (genre ?? "").trim();
  if (!words || words <= 0 || !g) return null;
  const id = canonicalIdOf(g);
  const range = id ? wordCountRangeForGenre(id) : GENERIC_WORD_COUNT_RANGE;
  const r = nums(range);
  if (!r) return null;
  const side = words < r[0] * WC_UNDER ? "under" : words > r[1] * WC_OVER ? "over" : null;
  if (!side) return null;
  return {
    side,
    lead: side === "under" ? "That’s well under" : "That’s well over",
    rest: ` the usual range for ${genreDisplay(g).toLowerCase()} (${range} words). Some agents pass on length alone.`,
  };
}
