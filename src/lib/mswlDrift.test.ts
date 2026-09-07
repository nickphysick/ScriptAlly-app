/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The drift's MODEL. The DOM half cannot be tested here — this repo runs `environment: "node"` —
 * which is exactly why the arithmetic was pulled out of the effect: a constant buried in a
 * `useEffect` has no testable surface at all, and that is how a timing value comes to be wrong
 * for a year with every gate green.
 */
import { describe, expect, it } from "vitest";
import {
  DRIFT_AWAY_PX_S, DRIFT_BACK_PX_S, DRIFT_HOLD_MS, DRIFT_MIN_MS, OVERFLOW_EPSILON,
  driftEase, driftMs, hasMoreToRead,
} from "./mswlDrift";

describe("hasMoreToRead — the one answer the fade and the drift share", () => {
  it("is false when the content fits", () => {
    expect(hasMoreToRead(100, 100)).toBe(false);
  });

  /* ⚠️ THE EPSILON IS THE POINT. `scrollHeight > clientHeight` is true by a sub-pixel on a box
     that is not overflowing, and without slack every card would sprout a fade and a drift it does
     not need — the monoculture fault arriving from the measurement side, where every card then
     looks like the overflow case. */
  it("ignores a sub-pixel difference", () => {
    expect(hasMoreToRead(100 + OVERFLOW_EPSILON, 100)).toBe(false);
    expect(hasMoreToRead(100.9, 100)).toBe(false);
  });

  it("is true once there is a real line below the fold", () => {
    expect(hasMoreToRead(140, 100)).toBe(true);
  });
});

describe("driftMs — travel time, floored", () => {
  it("scales with the distance at the given speed", () => {
    expect(driftMs(260, 26)).toBe(10_000);
    expect(driftMs(130, 26)).toBe(5_000);
  });

  /* a two-word overflow must still ease rather than snap */
  it("never goes below the floor, however short the trip", () => {
    expect(driftMs(1, DRIFT_AWAY_PX_S)).toBe(DRIFT_MIN_MS);
    expect(driftMs(0, DRIFT_AWAY_PX_S)).toBe(DRIFT_MIN_MS);
  });

  it("is direction-blind — the sign of the distance does not change the duration", () => {
    expect(driftMs(-520, 26)).toBe(driftMs(520, 26));
  });

  /* the return is faster than the outward trip: nobody reads a wishlist on the way back */
  it("returns faster than it travels", () => {
    expect(DRIFT_BACK_PX_S).toBeGreaterThan(DRIFT_AWAY_PX_S);
    expect(driftMs(500, DRIFT_BACK_PX_S)).toBeLessThan(driftMs(500, DRIFT_AWAY_PX_S));
  });
});

describe("driftEase — the ends are the claim", () => {
  /* ⚠️ IT MUST START AND FINISH AT REST. An eased curve that does not reach 0 and 1 exactly makes
     the wishlist appear to jump at the moment hover begins, which reads as a bug rather than as
     motion. The midpoint is the symmetry check. */
  it("starts at rest, ends at rest, and is symmetric about its middle", () => {
    expect(driftEase(0)).toBe(0);
    expect(driftEase(1)).toBe(1);
    expect(driftEase(0.5)).toBeCloseTo(0.5, 10);
  });

  it("is monotonic across the run", () => {
    let last = -1;
    for (let i = 0; i <= 20; i++) {
      const v = driftEase(i / 20);
      expect(v).toBeGreaterThanOrEqual(last);
      last = v;
    }
  });

  it("clamps out-of-range input rather than overshooting", () => {
    expect(driftEase(-0.4)).toBe(0);
    expect(driftEase(1.6)).toBe(1);
  });
});

describe("the hold", () => {
  /* a glance is not a request to read — the hold is what stops every pass of the pointer
     starting a slow scroll on every card it crosses */
  it("is long enough that crossing a card does not start it", () => {
    expect(DRIFT_HOLD_MS).toBeGreaterThanOrEqual(300);
  });
});
