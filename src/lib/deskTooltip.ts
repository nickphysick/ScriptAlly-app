/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * deskTooltip — where the settled desk's tooltip sits, as pure geometry.
 *
 * ⚠️ THE MATHS IS SEPARATED FROM THE COMPONENT ON PURPOSE. This repo's tests run in `node` with no
 * jsdom, so a rendered tooltip's position cannot be asserted at all — every element would report a
 * zero rect. Placement is therefore a function of four measurements, unit-tested here, and the
 * component's only job is to take those measurements and apply the answer.
 *
 * The two rules that matter are the ones a mockup cannot show, because a mockup is one screen at
 * one size: a tooltip must stay ON the viewport horizontally, and must flip below its anchor when
 * there is no room above it.
 */

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface TooltipPlacement {
  left: number;
  top: number;
  /** True when there was no room above and the tooltip sits under the anchor instead. */
  flipped: boolean;
}

/** Space between the anchor and the tooltip. */
export const TIP_GAP = 12;
/** The least breathing room allowed at a viewport edge. */
export const TIP_EDGE = 10;
/** Above this much room, the tooltip prefers to sit above the anchor. */
export const TIP_TOP_MIN = 8;

/**
 * Centre the tooltip on the anchor, above it by `TIP_GAP`, then correct for the viewport.
 *
 * ⚠️ THE HORIZONTAL CLAMP IS NOT SYMMETRICAL WITH THE VERTICAL FLIP, and that is deliberate.
 * Sliding sideways keeps the tooltip pointing at roughly the right thing; sliding vertically would
 * put it over the anchor it describes. So horizontally we clamp, vertically we flip.
 */
export function placeTooltip(anchor: Rect, tip: { width: number; height: number }, viewport: { width: number; height: number }): TooltipPlacement {
  const centre = anchor.left + anchor.width / 2;
  let left = centre - tip.width / 2;

  /* ⚠️ CLAMP LOW-EDGE LAST. Applying the right clamp after the left one means a tooltip WIDER than
     the viewport ends up at `TIP_EDGE` rather than at a negative left — it will overflow to the
     right, which is recoverable, instead of having its first words off screen, which is not. */
  left = Math.min(left, viewport.width - tip.width - TIP_EDGE);
  left = Math.max(TIP_EDGE, left);

  const above = anchor.top - tip.height - TIP_GAP;
  if (above >= TIP_TOP_MIN) return { left, top: above, flipped: false };
  return { left, top: anchor.top + anchor.height + TIP_GAP, flipped: true };
}
