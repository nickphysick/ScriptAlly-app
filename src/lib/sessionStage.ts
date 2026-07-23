/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The focused session's OPENING stage maths + timing tokens (design-refs/session-opening.html,
 * v3.1 — the card only exists where the light is). Pure: the component feeds real geometry in;
 * everything here is unit-testable. The engine (the queue) lives in ToDoPage's boardCards order —
 * this file is presentation arithmetic only.
 */

/** One element's fly-off: the translation through its nearest stage edge + the travel tilt. */
export interface EdgeFly {
  tx: number;
  ty: number;
  /** degrees — tilts in the direction of horizontal travel; vertical exits keep 0 (the ref). */
  rot: number;
}

/**
 * The nearest-edge law: an element (centre cx,cy · size w,h) on a stage (W,H) leaves through
 * whichever edge is closest, travelling far enough to fully clear it. Ties (equidistant) break
 * in the fixed order left → right → top → bottom — any edge is acceptable per the pack; the
 * order is simply Math.min's first winner, locked here so the choice is deterministic.
 */
export function nearestEdgeFly(cx: number, cy: number, w: number, h: number, W: number, H: number): EdgeFly {
  const dL = cx;
  const dR = W - cx;
  const dT = cy;
  const dB = H - cy;
  const m = Math.min(dL, dR, dT, dB);
  if (m === dL) return { tx: -(cx + w), ty: 0, rot: -4 };
  if (m === dR) return { tx: W - cx + w, ty: 0, rot: 4 };
  if (m === dT) return { tx: 0, ty: -(cy + h), rot: 0 };
  return { tx: 0, ty: H - cy + h, rot: 0 };
}

/** The ritual lines — played one at a time over the clearing desk (large italic Playfair). */
export const RITUAL_LINES = ["Gathering your tasks…", "Clearing the desk…", "Choosing where to start…"] as const;

/**
 * The opening's timing spine (ms unless named otherwise). Full length ≤ the 4.5s budget:
 * lines end at 520 + 3×840 = 3.04s → the reveal (160 + 380 + 380 + lock 540) lands at 4.50s;
 * the pair pops over the tail. Reduced motion starts at the final composition.
 */
export const OPENING = {
  dimMs: 1100, // the ink wash's rise
  dimTo: 0.74, // the first darken
  veilTo: 0.9, // effectively full dark for the reveal
  flyDelayMs: 420, // movement starts only after the darken has taken hold
  flyStaggerMs: 90,
  flyMs: 800,
  flyFadeMs: 700,
  linesDelayMs: 520,
  lineMs: 840,
  spotDelayMs: 160, // the beat between full dark and the light entering
  spotSegMs: 380, // per wander waypoint (two of them)
  spotLockMs: 540, // the final glide onto the card
  spotRadius: 140,
  spotLockScale: 0.72, // lock radius = max(card w, h) × this
  pairDelayMs: 220,
  pairGapMs: 110,
  reverseMs: 600, // Back to desk — the compressed rewind
  totalBudgetMs: 4500,
} as const;

/**
 * The board elements that fly at the clearing — cards, group bars and the containers'
 * CONTENTS; the container shells and the app chrome stay put beneath the veil. None of these
 * selectors nest within one another (a nested pair would double-transform).
 */
export const FLY_SELECTOR = [
  ".tdb-cell", ".tdb-gbar", ".tdb-gpage", ".tdb-lh2", // the cards view's objects
  ".tdb-lsec", ".tdb-dochead", // the ledger's sections + the sheet's bar
  ".tdb-rsech", ".tdb-fpill", ".tdb-fsfoot", // the filter card's contents
  ".tdb-th", ".tdb-tmid2", ".tdb-tf2", // Today's contents
  ".tdb-rvbox", ".tdb-colo", // the centre stack's free cards
  ".tdb-ask", ".tdb-srchrow", ".tdb-heropair", // the hero
].join(", ");

/** The spotlight's wander: enters from below, two waypoints, then the lock (the ref's path). */
export function wanderPoints(W: number, H: number, target: { x: number; y: number }): Array<{ x: number; y: number }> {
  return [
    { x: W * 0.24, y: H * 0.6 },
    { x: W * 0.72, y: H * 0.34 },
    target,
  ];
}
