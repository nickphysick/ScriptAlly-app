/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The plate's inline editors — the pure half.
 * Reference: design-refs/manuscript-plate-inputs.html (title, word-count stepper, genre popover).
 *
 * ⚠️ ONE STANDING GRAMMAR FOR EVERY INLINE EDITOR ON THE PLATE, and it is stated once here so the
 * three fields cannot drift into three conventions:
 *
 *   hover reveals the affordance · click opens it seeded with the current value and selects it ·
 *   Enter saves · Escape cancels and restores the stored value · a brief mono "Saved" confirms.
 *
 * PURE: no React, no Firebase, no clock.
 */

/** How long the "Saved" receipt stays up. Long enough to read, short enough not to become chrome. */
export const SAVED_RECEIPT_MS = 1600;
export const SAVED_RECEIPT = "Saved";

/** The stepper's button and arrow-key increment. Both count from the CURRENT value, never from 0. */
export const WORD_STEP = 500;

/**
 * ⚠️ NO RANGE, NO GUIDANCE, NO PLACEHOLDER RANGE — anywhere. The writer types the number.
 *
 * This retires the standing decision that a word-count field shows the typical range for the
 * selected genre. `genreWordCountRange` (lib/manuscripts.ts) and `wordCountWhisper`
 * (lib/manuscriptPage.ts) still exist and are still read by the creation form and onboarding, which
 * are outside this pass's file set — the retirement there is reported, not done here.
 */
export const WORD_COUNT_HINT = null;

/** The one-line note a non-numeric entry gets. States what is wrong; asks for nothing. */
export const WORD_COUNT_REJECTED = "Word count is a number.";

/**
 * Parse a typed word count.
 *
 * `null` means "not a number" — the caller shows `WORD_COUNT_REJECTED` and does NOT write. An empty
 * field is also `null`: it is not zero, because a writer clearing a field has not told us their
 * manuscript is empty.
 *
 * ⚠️ SEPARATORS ARE ACCEPTED BECAUSE THE FIELD PRINTS THEM. The plate renders `50,000`, so a writer
 * selecting that text and retyping it hands back `50,000`; rejecting their own displayed value would
 * be the field disagreeing with itself. Spaces likewise.
 */
export function parseWordCount(raw: string): number | null {
  const cleaned = raw.replace(/[,\s]/g, "");
  if (!cleaned) return null;
  if (!/^\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isSafeInteger(n) ? n : null;
}

/** Step from the current value, floored at zero — a negative word count is not a state. */
export function stepWordCount(current: number, delta: number): number {
  return Math.max(0, current + delta);
}

/**
 * The manuscript's genres as ONE ordered list: the primary first, then its extras.
 *
 * ⚠️ THE MODEL IS `genre` + `subGenres`, AND THE PICKER IS A LIST — this is the join, in one place.
 * The FIRST id is the primary; everything after it is a sub-genre. A caller that reorders the list
 * changes which genre is primary, which is the intended behaviour and not an accident.
 */
export function genreList(genre: string, subGenres?: string[]): string[] {
  return [genre, ...(subGenres ?? [])].filter(Boolean);
}

/** The inverse — what a genre save writes back. An empty list clears to an empty primary. */
export function splitGenres(ids: string[]): { genre: string; subGenres: string[] } {
  return { genre: ids[0] ?? "", subGenres: ids.slice(1) };
}

/**
 * ⚠️ THREE, AND THE CAP IS HERE RATHER THAN IN THE PICKER'S CALLER. A manuscript with eight genres
 * has not described itself, and the plate has one line to render them on.
 */
export const MAX_MANUSCRIPT_GENRES = 3;
