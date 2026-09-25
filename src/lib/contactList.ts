/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v11 — the pure derivations (design authority: design-refs/contact-list-v11.html).
 *
 * Phase 1 carries the rail's geometry only. The standing model, the where-you-stand union, the
 * count cards and the housekeeping gaps arrive with their phases; everything here stays pure so
 * the locks never pull firebase.
 */

/** The rail's breathing room from the viewport's edges, and its height clamp (mock: the rail's
 *  JS writes an inline height; CSS carries `position: sticky; top: 16px; max-height: 860px`).
 *  Measured on the rendered mock at 1440×900: load → top 92, height 792; scrolled 600 → top 16,
 *  height 860 (the cap binding — 900 − 16 − 16 = 868 → 860). The brief's bracket "16 → 884" is
 *  the one place its text and the render disagree; the mock wins. */
export const RAIL_TOP_GAP = 16;
export const RAIL_MIN = 360;
export const RAIL_MAX = 860;

/**
 * The rail's height from its own MEASURED top — never `100vh` with a constant offset (the house
 * viewport law: the offset is a guess about everything above the element, and the beta strip,
 * the bar and the hero all sit above this one).
 *
 * ⚠️ RETURNS NULL FOR A READING THAT CANNOT BE A LAYOUT — a zero/negative top with a zero-height
 * window is the page before layout or a container under the loading cover, and writing a height
 * from it publishes a wrong floor (the dashboard's −115 clamp is the standing example). The
 * caller keeps the previous height rather than storing the sentinel.
 */
export function railHeight(top: number, innerHeight: number): number | null {
  if (!Number.isFinite(top) || !Number.isFinite(innerHeight) || innerHeight <= 0) return null;
  const clampedTop = Math.max(RAIL_TOP_GAP, top);
  const room = innerHeight - clampedTop - RAIL_TOP_GAP;
  return Math.max(RAIL_MIN, Math.min(RAIL_MAX, room));
}
