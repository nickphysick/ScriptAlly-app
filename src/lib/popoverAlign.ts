/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * popoverAlign — which edge a popover should hang from.
 *
 * Every popover in the agent toolbar anchors under its button. Left-anchored is the default
 * because it reads as belonging to the control; but the rightmost control's popover is wider than
 * the space remaining beside it, so a left-anchored box runs off the container. That is geometry,
 * not a possibility — Sort sits at the right of the row and its 212px panel will overflow on any
 * viewport narrow enough.
 *
 * The rule is generic, not per-control: flip to right-anchored when the left-anchored box would
 * exceed the container's right edge. Any popover using the shared component gets it, including
 * ones added later, and nothing hard-codes "Sort".
 *
 * Pure so it can be unit-tested — jsdom reports every rect as zero, so the measurement itself is a
 * browser check, but the DECISION the measurement feeds is locked here.
 */

export type PopoverAlign = "left" | "right";

export interface PopoverGeometry {
  /** The anchor button's left edge, in the same coordinate space as `containerRight`. */
  anchorLeft: number;
  /** The anchor button's right edge — what a right-anchored popover aligns its own right edge to. */
  anchorRight: number;
  /** The popover's own width. */
  popWidth: number;
  /** The right edge of the space the popover must stay inside (the content column, not the window). */
  containerRight: number;
  /** The left edge of that space — a flip that would overflow the OTHER side is no improvement. */
  containerLeft: number;
}

/**
 * Left unless the left-anchored box would spill past `containerRight` — and even then, only if
 * right-anchoring actually fits. A popover wider than the container overflows whichever edge it
 * hangs from, so in that case we keep the default rather than trading a right-hand overflow for a
 * left-hand one (the left is where the reader's eye and the rest of the row are).
 */
export function popoverAlign(g: PopoverGeometry): PopoverAlign {
  const spillsRight = g.anchorLeft + g.popWidth > g.containerRight;
  if (!spillsRight) return "left";
  const flippedLeftEdge = g.anchorRight - g.popWidth;
  return flippedLeftEdge >= g.containerLeft ? "right" : "left";
}
