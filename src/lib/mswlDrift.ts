/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE WISHLIST DRIFT — hover a card and the manuscript wishlist scrolls itself, so a long one can
 * be read without opening anything (contact-list v5).
 *
 * ⚠️ THE ARITHMETIC IS PURE AND THE DOM IS A THIN SHELL AROUND IT, because this repo's tests run
 * in `environment: "node"` and cannot see a scroll. What CAN be checked is the model: when there
 * is more to read, how long the travel takes, and what the easing does at its ends. A module that
 * did all of this inside a `useEffect` would have no testable surface at all — which is how a
 * timing constant comes to be wrong for a year with every gate green.
 *
 * ⚠️ AND THE OVERFLOW TEST TAKES AN EPSILON. `scrollHeight > clientHeight` is true by a
 * sub-pixel on a box that is not overflowing, so without one a two-line wishlist would sprout a
 * fade and a drift it does not need — the "every case is the same case" fault arriving from the
 * measurement side, where every card looks like the overflow case.
 */

/** Hover must be held this long before the drift starts — a glance is not a request to read. */
export const DRIFT_HOLD_MS = 420;
/** Travel speed away from the top, px per second. Slow: it is being read as it moves. */
export const DRIFT_AWAY_PX_S = 26;
/** Return speed, px per second. Faster: nobody reads a wishlist on the way back. */
export const DRIFT_BACK_PX_S = 60;
/** No travel is ever shorter than this, so a two-word overflow does not snap. */
export const DRIFT_MIN_MS = 260;
/** Sub-pixel slack — below this a box is not overflowing, whatever the numbers say. */
export const OVERFLOW_EPSILON = 2;

/** Is there more wishlist below the fold? The fade and the drift share this one answer. */
export const hasMoreToRead = (scrollHeight: number, clientHeight: number): boolean =>
  scrollHeight > clientHeight + OVERFLOW_EPSILON;

/** How long a drift of `distance` px takes at `speed` px/s, floored so short trips still ease. */
export const driftMs = (distance: number, speed: number): number =>
  Math.max(DRIFT_MIN_MS, (Math.abs(distance) / speed) * 1000);

/**
 * Ease-in-out quadratic — the ref's curve. Stated as a function because its ENDS are the claim:
 * it must start and finish at rest, or the wishlist appears to jump at the moment hover begins.
 */
export const driftEase = (p: number): number => {
  const t = Math.min(1, Math.max(0, p));
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};

/**
 * Wire one wishlist element up. Returns a teardown.
 *
 * ⚠️ REDUCED MOTION GETS A SCROLLER, NOT A FROZEN BOX. The drift is suppressed and the element
 * stays scrollable by wheel and by keyboard, so the same words remain reachable — a preference
 * about ANIMATION must never become a reduction in what can be read.
 */
export function attachDrift(
  el: HTMLElement,
  host: HTMLElement,
  reduced: boolean,
): () => void {
  let raf = 0;
  let hold: ReturnType<typeof setTimeout> | undefined;

  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };

  const run = (to: number, speed: number) => {
    stop();
    const from = el.scrollTop;
    const dist = to - from;
    if (Math.abs(dist) < 1) return;
    if (reduced) { el.scrollTop = to; return; }
    const dur = driftMs(dist, speed);
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      el.scrollTop = from + dist * driftEase(p);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };

  const onEnter = () => {
    if (hold) clearTimeout(hold);
    if (reduced) return;
    if (!hasMoreToRead(el.scrollHeight, el.clientHeight)) return;
    hold = setTimeout(() => run(el.scrollHeight - el.clientHeight, DRIFT_AWAY_PX_S), DRIFT_HOLD_MS);
  };
  const onLeave = () => {
    if (hold) clearTimeout(hold);
    run(0, DRIFT_BACK_PX_S);
  };

  host.addEventListener("mouseenter", onEnter);
  host.addEventListener("mouseleave", onLeave);
  return () => {
    host.removeEventListener("mouseenter", onEnter);
    host.removeEventListener("mouseleave", onLeave);
    if (hold) clearTimeout(hold);
    stop();
  };
}
