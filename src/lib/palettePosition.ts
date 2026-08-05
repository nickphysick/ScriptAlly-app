/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * palettePosition — where the command palette's dropdown sits, given the pill it hangs from.
 *
 * ⚠️ VIEWPORT SAFETY IS THE POINT OF THIS FUNCTION, not tidiness. The palette used to be a
 * centred modal, which is always on screen by construction; a dropdown right-aligned to a pill is
 * not. At a narrow viewport, or with the pill near the left edge, naive right-alignment puts the
 * dropdown's left edge off screen — and a search box you cannot see the start of is worse than a
 * modal that covered the page.
 *
 * Pure, so the maths is unit-testable: the RENDERING is a browser check, but "does it stay on
 * screen at 320px" should not be.
 */

/** The bits of a DOMRect this needs. Taking a subset keeps the tests free of DOM fakes. */
export interface AnchorRect {
  left: number;
  right: number;
  bottom: number;
}

export interface PaletteBox {
  left: number;
  top: number;
  width: number;
  /** The RESULTS LIST's cap — the input row above it is always visible. */
  maxListHeight: number;
}

/** The gap between the pill and the dropdown, and the minimum breathing room at every edge. */
export const PALETTE_GAP = 8;
export const PALETTE_EDGE = 12;
export const PALETTE_MAX_W = 560;
export const PALETTE_MAX_LIST = 340;
/** Room kept below the list so it never runs to the exact bottom of the window. */
export const PALETTE_FOOT = 16;

export function palettePosition(anchor: AnchorRect, vw: number, vh: number): PaletteBox {
  // Never wider than the viewport allows, so the clamp below can always succeed.
  const width = Math.min(PALETTE_MAX_W, Math.max(0, vw - PALETTE_EDGE * 2));

  const top = anchor.bottom + PALETTE_GAP;

  // Right-aligned to the pill by default — the dropdown reads as belonging to it.
  let left = anchor.right - width;
  // ⚠️ CLAMPED AT BOTH EDGES. The left clamp is the one the pass names; the right clamp matters
  // when the anchor itself is off to the right (a pill in a wide bar on a narrow window), where
  // right-alignment would otherwise push the dropdown past the viewport.
  if (left < PALETTE_EDGE) left = PALETTE_EDGE;
  if (left + width > vw - PALETTE_EDGE) left = Math.max(PALETTE_EDGE, vw - PALETTE_EDGE - width);

  // ⚠️ NEVER NEGATIVE. A short viewport (or a pill low in the window) would otherwise compute a
  // negative cap, and `max-height:-40px` is ignored — the list would render at full height and
  // run off the bottom, which is the exact failure this cap exists to prevent.
  const maxListHeight = Math.max(0, Math.min(PALETTE_MAX_LIST, vh - top - PALETTE_FOOT));

  return { left, top, width, maxListHeight };
}
