/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list principles v2 (design-refs/contact-list-principles-v2/contact-list-principles-v4.html, the pp2 layer).
 *
 * LIST HEALTH NUDGED IN ("2 · Nudged in"): the block keeps its place in the header's grid (so the headline's column
 * width never changes) and is pulled left by a transform until its right edge sits `NUDGE_INSET` inside the list
 * frame's right edge — but never nearer the headline's text than `NUDGE_CLEAR`; if it would be, the nudge shrinks.
 * ⚠️ As built the block overhangs the frame by 10px (header and frame end at different edges), so the pull is measured
 *    from the frame, not a constant 32px: a constant would leave it 22px inside.
 */

/** THE LIST HEALTH RING IN BRAND COLOURS (wherever it is drawn on a light ground): navy for what's filled in, soft pink
 *  for what's missing, at every score — it no longer follows `healthTone` (which went green at 80 and above). */
export const BRAND_RING = { arc: "#2a3a52", track: "#ecc0ae" } as const;

export const NUDGE_INSET = 32;
export const NUDGE_CLEAR = 24;

/** the block's and the headline's boxes as laid out (the block's without the nudge applied) */
export interface NudgeBoxes {
  blockL: number;
  blockR: number;
  /** the list frame's right edge, or null when the frame is not drawn (loading, can't load) */
  frameR: number | null;
  /** the right edge of the headline block's text */
  inkR: number;
  /** the header has stacked (the block on its own row under the headline): no nudge */
  stacked: boolean;
}

/** how far (px, ≥ 0) to pull List health left */
export function healthNudge(m: NudgeBoxes): number {
  if (m.stacked) return 0;
  const want = m.frameR === null ? NUDGE_INSET : m.blockR - (m.frameR - NUDGE_INSET);
  const room = m.blockL - m.inkR - NUDGE_CLEAR;
  return Math.max(0, Math.min(want, room));
}
