/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE CARD'S TEXT, WHERE IT DOES NOT FIT (v39, Phase 5).
 *
 * ⚠️ IT REPLACES A MECHANIC THAT DROPPED WORDS. `barFit` measured the text and, where it would not
 * fit, removed it — the detail first, then the whole line. A card with no words is a card that
 * says nothing, and the reader had no way to find out what it would have said short of a tooltip.
 * The words stay now, and the ones past the edge arrive on hover.
 *
 * ⚠️ SCROLL · PAUSE · FADE BACK — NEVER A PING-PONG. Text that slides back the way it came reads
 * as a fault, because a reader tracking a word watches it un-say itself. The return happens while
 * the line is invisible, which is the macOS menu-bar and Spotify pattern and the reason step 5
 * exists at all.
 *
 * ⚠️ THE FRAMES ARE BUILT IN JS BECAUSE THE DISTANCE IS MEASURED. A CSS keyframe cannot read the
 * overflow, and a `var()` inside `@keyframes` fails SILENTLY in this setup — no error, no
 * animation, nothing to point at. This repo has that written down already; the way not to meet it
 * again is to keep the distance out of CSS entirely.
 */

/** One step of the cycle, in the shape the Web Animations API takes. */
export interface Frame {
  offset: number;
  transform: string;
  opacity: number;
}

export interface Cycle {
  frames: Frame[];
  durationMs: number;
}

/* the pinned cycle, in milliseconds */
export const HOLD_START = 250;
export const HOLD_END = 900;
export const FADE_OUT = 170;
export const FADE_IN = 190;
/** the scroll's own pace: 17ms per pixel, never less than 700ms end to end */
export const MS_PER_PX = 17;
export const MIN_SCROLL = 700;
/** the reader needs a moment past the last letter, so the travel is the overflow plus a little */
export const OVERSHOOT = 10;

export const scrollMs = (overflow: number): number =>
  Math.max(MIN_SCROLL, (overflow + OVERSHOOT) * MS_PER_PX);

/**
 * The whole cycle for a line overflowing by `overflow` pixels.
 *
 * ⚠️ THE RESET HAPPENS AT ZERO OPACITY, and that is the only frame where the text moves right.
 * Everything a reader can see travels one way. The lock asserts exactly that — every pair of
 * consecutive frames with any visible opacity has a non-increasing translate — so a future edit
 * that "simplifies" the fade away turns the cycle into a ping-pong and fails.
 */
export function cycleFor(overflow: number): Cycle {
  const travel = Math.max(0, overflow) + OVERSHOOT;
  const scroll = scrollMs(overflow);
  const total = HOLD_START + scroll + HOLD_END + FADE_OUT + FADE_IN;
  const at = (ms: number) => ms / total;

  const t0 = 0;
  const t1 = HOLD_START;                    /* start of the scroll */
  const t2 = t1 + scroll;                   /* end of the scroll */
  const t3 = t2 + HOLD_END;                 /* end of the hold */
  const t4 = t3 + FADE_OUT;                 /* invisible */
  const t5 = t4 + FADE_IN;                  /* back, and visible */

  const L = `translateX(${-travel}px)`;
  const O = "translateX(0px)";

  return {
    durationMs: total,
    frames: [
      { offset: at(t0), transform: O, opacity: 1 },   /* hold at the start */
      { offset: at(t1), transform: O, opacity: 1 },
      { offset: at(t2), transform: L, opacity: 1 },   /* linear travel, leftwards */
      { offset: at(t3), transform: L, opacity: 1 },   /* hold at the end so the tail can be read */
      { offset: at(t4), transform: L, opacity: 0 },   /* fade out, still at the end */
      /* ⚠️ THE ONLY RIGHTWARD MOVE, AND IT IS INVISIBLE. Two frames at the same offset would be
         ambiguous, so the reset shares t4's instant by a hair — the text is at zero opacity across
         the whole of it. */
      { offset: at(t4) + 1e-6, transform: O, opacity: 0 },
      { offset: at(t5), transform: O, opacity: 1 },   /* fade back in, at the start */
    ],
  };
}
