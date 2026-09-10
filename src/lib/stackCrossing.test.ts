/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE BAND CROSSING — THE ONE FAULT THAT SURVIVED THREE PASSES OF PIXEL SWEEPS (v32).
 *
 * Each cumulative boundary used to be interpolated independently, and a monotone fit is GLOBAL: a
 * series' tangents come from its own neighbouring values. So two boundaries equal at every knot
 * still take different paths between them, and the sage boundary (sand + sage) could rise above the
 * total line (sand + sage + pink) in the gaps.
 *
 * ⚠️ THIS TEST CARRIES BOTH ALGORITHMS ON PURPOSE. A regression test that only asserts the fixed
 * behaviour is a green nobody has watched go red; one that also evaluates the OLD arithmetic on the
 * same numbers proves, on every run and forever, that the fixture really does provoke the fault and
 * that the fix really does remove it. The "prove it red first" step becomes a property of the file
 * rather than a paragraph in a report nobody re-runs.
 *
 * ⚠️ AND THE FIXTURE IS AN ORDINARY SHAPE, NOT A PATHOLOGICAL ONE: a band that is zero for a stretch
 * and non-zero later is several quiet weeks followed by a request. That is precisely why every
 * "sweep the pixels above the line" check came back clean — the harness account's data never had it.
 */
import { describe, it, expect } from "vitest";
import { hermiteCoeffs, sampleCurve, sampleStack } from "./oneScreen";

/* the worked example, verbatim */
const SAND = [7, 7, 7, 7, 7, 7, 7, 7, 7];
const SAGE = [9, 9, 9, 10, 12, 15, 15, 15, 15];        // sand + sage
const TOTAL = [9, 9, 9, 10, 12, 15, 16, 16, 15];       // + pink, which is 0 for the first six
const STEPS = (TOTAL.length - 1) * 24;

/** the OLD way: fit each boundary on its own and read the cubic between knots */
const oldWorstCrossing = (): number => {
  const seg = (vals: number[], m: number[], i: number, u: number) => {
    const p0 = vals[i], p3 = vals[i + 1];
    const p1 = p0 + m[i] / 3, p2 = p3 - m[i + 1] / 3;
    const v = 1 - u;
    return v * v * v * p0 + 3 * v * v * u * p1 + 3 * v * u * u * p2 + u * u * u * p3;
  };
  const ms = hermiteCoeffs(SAGE), mt = hermiteCoeffs(TOTAL);
  let worst = 0;
  for (let i = 0; i < TOTAL.length - 1; i++) {
    for (let k = 0; k <= 400; k++) {
      const u = k / 400;
      worst = Math.max(worst, seg(SAGE, ms, i, u) - seg(TOTAL, mt, i, u));
    }
  }
  return worst;
};

describe("the sampled, clamped stack", () => {
  it("⚠️ RED FIRST: the old per-boundary fit really does cross on this fixture", () => {
    /* equal at knots 0-5 — the crossing is entirely between them */
    expect(SAGE.slice(0, 6)).toEqual(TOTAL.slice(0, 6));
    const worst = oldWorstCrossing();
    expect(worst, "the fixture must provoke the fault, or the green below proves nothing")
      .toBeGreaterThan(0.25);
    /* the measured figure, recorded so a change in the tangent maths shows up here */
    expect(worst).toBeCloseTo(0.2963, 3);
  });

  it("and green: after sampling and clamping, no boundary is ever above the one over it", () => {
    const [s1, s2, tot] = sampleStack([SAND, SAGE, TOTAL], STEPS);
    let worstSage = 0, worstSand = 0;
    for (let k = 0; k < tot.length; k++) {
      worstSage = Math.max(worstSage, s2[k] - tot[k]);
      worstSand = Math.max(worstSand, s1[k] - s2[k]);
    }
    expect(worstSage, "sage above the total").toBeLessThanOrEqual(0);
    expect(worstSand, "sand above sage").toBeLessThanOrEqual(0);
  });

  it("the knots are untouched — the bands still sum to the line at every data point", () => {
    const [, , tot] = sampleStack([SAND, SAGE, TOTAL], STEPS);
    TOTAL.forEach((v, i) => expect(tot[i * 24]).toBeCloseTo(v, 9));
  });

  it("nothing is ever negative, and a flat series stays flat", () => {
    const [a] = sampleStack([[0, 0, 0, 0], [1, 2, 1, 2]], 24 * 3);
    expect(Math.min(...a)).toBe(0);
    expect(Math.max(...a)).toBe(0);
  });

  it("⚠️ THE CLAMP RUNS TOP DOWN, and the direction is the whole of its correctness", () => {
    /* clamping UP would fix the crossing by inflating the lower band to meet the overshoot; down
       pulls the overshoot back to the ceiling it must not exceed. The tell is the TOTAL: it has
       nothing above it, so it must come through untouched. */
    const [, , tot] = sampleStack([SAND, SAGE, TOTAL], STEPS);
    const bare = sampleCurve(TOTAL, STEPS);
    tot.forEach((v, k) => expect(v).toBeCloseTo(Math.max(0, bare[k]), 9));
  });

  it("a single point and an empty series do not throw", () => {
    expect(sampleStack([[5]], 24)[0].every((v) => v === 5)).toBe(true);
    expect(sampleStack([], 24)).toEqual([]);
  });
});
