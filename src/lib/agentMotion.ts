/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent list — MOTION TIMINGS AND THE STAGGER RULE (design authority:
 * design-refs/scriptally-agent-motion.html).
 *
 * The numbers live here rather than scattered through the stylesheet and the component, because
 * several of them are RELATIONSHIPS, not preferences: the arrival is deliberately slower than the
 * load, the exit deliberately faster than either, and the bump matches the arrival so a card
 * appearing and its neighbours moving aside read as one event. Changing one without the others
 * breaks the reading.
 *
 * ⚠️ THE STAGGER IS BY ROW, NOT BY CARD — do not "correct" this to per-item later. The Queries
 * Hub's 25ms-per-item works for a single column, but a three-column grid of sixteen cards would
 * spend 400ms on stagger alone, and the last card would arrive after the reader had already
 * started looking at the first. Rows step 40ms apart, and every row past the fourth SHARES the
 * fourth delay, so the sequence takes the same time whether the list holds twelve agents or two
 * hundred. A long list never gets slower.
 */

/** Load: header first, toolbar just behind, cards last. */
export const HEAD_DELAY_MS = 0;
export const TOOLBAR_DELAY_MS = 60;
export const CARDS_START_MS = 120;

/** Rows step by this much, and no more than this many rows are staggered. */
export const ROW_STEP_MS = 40;
export const MAX_STAGGER_ROWS = 4;

/** Durations. The arrival is SLOWER than the load on purpose; the exit is faster than both. */
export const LOAD_MS = 280;
export const ARRIVE_MS = 340;
export const EXIT_MS = 160;
/** The bump matches the arrival — the card appearing and the cards moving aside are one event. */
export const BUMP_MS = 340;

/** Save's three beats: the transformation registers in place, then a breath, then the travel. */
export const SAVE_FADE_OUT_MS = 170;
export const SAVE_FADE_IN_MS = 200;
export const SAVE_BREATH_MS = 220;

/** The FLIP easing, shared by every bump so nothing travels on a different curve. */
export const BUMP_EASING = "cubic-bezier(.4, 0, .2, 1)";

/**
 * The load delay for the card at `index`, given the grid's live column count.
 *
 * Row = index ÷ columns, capped at the fourth row: 120, 160, 200, 240ms, and everything from the
 * fourth row on shares 240. Guards a zero/absent column count (jsdom reports no computed grid) by
 * treating the grid as a single column, which degrades to the capped sequence rather than dividing
 * by zero.
 */
export function rowDelayMs(index: number, columns: number): number {
  const cols = Math.max(1, Math.floor(columns) || 1);
  const row = Math.floor(Math.max(0, index) / cols);
  return CARDS_START_MS + Math.min(row, MAX_STAGGER_ROWS - 1) * ROW_STEP_MS;
}

/**
 * Count the columns in a RESOLVED `grid-template-columns` value — the browser reports it as a
 * list of used pixel values, which is the only honest source when the track list is
 * `repeat(auto-fill, …)` and the count depends on the viewport.
 *
 * Split from the DOM read below so the arithmetic is testable: the suite runs in `node`, with no
 * DOM at all, so anything that touches an element is an artefact lock rather than a real test.
 * Falls back to a single column for an unlaid-out grid, which degrades the stagger to the capped
 * sequence rather than dividing by zero.
 */
export function parseColumnCount(tracks: string | null | undefined): number {
  if (!tracks || tracks === "none") return 1;
  return Math.max(1, tracks.trim().split(/\s+/).filter(Boolean).length);
}

/** The DOM read. All the logic is in `parseColumnCount`; this is just where the value comes from. */
export const gridColumnCount = (el: Element | null): number =>
  parseColumnCount(el ? getComputedStyle(el).gridTemplateColumns : null);

/**
 * Whether the reader has asked for less motion. Read at the moment we're about to arm an
 * animation rather than cached at module load, so a preference changed mid-session is honoured.
 * The CSS carries the same guard — this exists so we can skip ARMING the sequence at all, which
 * also skips the disarm timer and any FLIP measurement that would otherwise run for nothing.
 */
export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
