/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * laneFit — the exact-fit lane maths (fix pass Phase 2; ref design-refs/todo-lanes-popup-fix.html,
 * the Airbnb pattern). N cards of at least CARD_MIN fill the track precisely — no partial card at
 * rest, no mid-word clipping; scroll-snap + the header pagers carry the overflow affordance (the
 * edge fades are RETIRED). Lives at the component layer because `lib/todoBoard.ts` is out of the
 * fix pack's scope; the pager-disable booleans are todoBoard.laneFadeState, re-consumed unmodified.
 *
 * The floor of 1 keeps the interim mobile pass safe (one full-width card); the cap of 5 stops
 * ultrawide lanes shredding cards into slivers.
 */

export const LANE_CARD_MIN = 300;
export const LANE_CARD_CAP = 5;
/** The lanes' existing gap value (`.tdb-scroller { gap: 14px }`) — ours, not the ref mock's 18. */
export const LANE_GAP = 14;

export interface LaneFit {
  /** How many cards fit exactly (1..cap). */
  n: number;
  /** The exact card width for that N: (trackWidth − gap×(N−1)) / N. */
  cardWidth: number;
}

export function laneFit(
  trackWidth: number,
  gap: number = LANE_GAP,
  min: number = LANE_CARD_MIN,
  cap: number = LANE_CARD_CAP,
): LaneFit {
  const n = Math.max(1, Math.min(cap, Math.floor((trackWidth + gap) / (min + gap))));
  return { n, cardWidth: (trackWidth - gap * (n - 1)) / n };
}

/** One pager click = one full page: N cards plus their gaps. */
export function lanePageDistance(fit: LaneFit, gap: number = LANE_GAP): number {
  return fit.n * (fit.cardWidth + gap);
}
