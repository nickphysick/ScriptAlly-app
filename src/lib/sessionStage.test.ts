/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The opening's stage maths + timing spine (session P1). Real unit tests — the lib is pure.
 */
import { describe, it, expect } from "vitest";
import { nearestEdgeFly, wanderPoints, OPENING, RITUAL_LINES, FLY_SELECTOR } from "./sessionStage";

describe("nearestEdgeFly — the nearest-edge law", () => {
  it("leaves through the closest edge, clearing it fully", () => {
    // near the left edge of a 1000×600 stage
    expect(nearestEdgeFly(100, 300, 250, 120, 1000, 600)).toEqual({ tx: -350, ty: 0, rot: -4 });
    // near the right
    expect(nearestEdgeFly(920, 300, 250, 120, 1000, 600)).toEqual({ tx: 330, ty: 0, rot: 4 });
    // near the top — vertical exits carry no tilt (the ref)
    expect(nearestEdgeFly(500, 40, 250, 120, 1000, 600)).toEqual({ tx: 0, ty: -160, rot: 0 });
    // near the bottom
    expect(nearestEdgeFly(500, 580, 250, 120, 1000, 600)).toEqual({ tx: 0, ty: 140, rot: 0 });
  });
  it("the corner case: an equidistant element takes ONE edge deterministically (any is acceptable)", () => {
    // dead centre of a square stage — all four distances equal; the tie-break order is
    // left → right → top → bottom, so left wins. The pack accepts any edge; the lock is
    // that the choice is deterministic, not which one.
    const fly = nearestEdgeFly(300, 300, 100, 100, 600, 600);
    expect(fly).toEqual({ tx: -400, ty: 0, rot: -4 });
    // a corner-equidistant element (same distance left and top): still deterministic
    const corner = nearestEdgeFly(50, 50, 100, 100, 600, 600);
    expect(corner.tx === -150 || corner.ty === -150).toBe(true);
    expect(nearestEdgeFly(50, 50, 100, 100, 600, 600)).toEqual(corner);
  });
  it("the travel always clears the stage: |delta| ≥ the distance to the edge plus the element's size", () => {
    for (const [cx, cy] of [[10, 300], [990, 300], [500, 10], [500, 590], [333, 250]] as const) {
      const f = nearestEdgeFly(cx, cy, 250, 120, 1000, 600);
      if (f.tx < 0) expect(-f.tx).toBeGreaterThanOrEqual(cx + 250);
      if (f.tx > 0) expect(f.tx).toBeGreaterThanOrEqual(1000 - cx + 250);
      if (f.ty < 0) expect(-f.ty).toBeGreaterThanOrEqual(cy + 120);
      if (f.ty > 0) expect(f.ty).toBeGreaterThanOrEqual(600 - cy + 120);
    }
  });
});

describe("the opening's spine", () => {
  it("the ritual lines are the three, verbatim, in order", () => {
    expect(RITUAL_LINES).toEqual(["Gathering your tasks…", "Clearing the desk…", "Choosing where to start…"]);
  });
  it("the timings hold the ≤4.5s budget at full length", () => {
    const linesEnd = OPENING.linesDelayMs + RITUAL_LINES.length * OPENING.lineMs;
    const revealEnd = linesEnd + OPENING.spotDelayMs + 2 * OPENING.spotSegMs + OPENING.spotLockMs;
    expect(revealEnd).toBeLessThanOrEqual(OPENING.totalBudgetMs);
    expect(OPENING.dimTo).toBeCloseTo(0.74);
    expect(OPENING.veilTo).toBeCloseTo(0.9);
    expect(OPENING.flyStaggerMs).toBe(90);
    expect(OPENING.reverseMs).toBe(600);
  });
  it("the wander: two waypoints then the lock target, entering from below the stage", () => {
    const pts = wanderPoints(1000, 600, { x: 500, y: 260 });
    expect(pts).toHaveLength(3);
    expect(pts[2]).toEqual({ x: 500, y: 260 });
  });
  it("the fly selector names no nested pair (a nested pair would double-transform)", () => {
    // spot-check the known containment traps: the sheet shell, the filter card and Today's
    // shell are deliberately ABSENT (their contents fly; the shells stay under the veil)
    for (const shell of [".tdb-mainc", ".tdb-fbox", ".tdb-railr", ".tdb-lanes", ".tdb-grid", ".tdb-centre", ".tdb-wrap"]) {
      expect(FLY_SELECTOR.split(", ")).not.toContain(shell);
    }
    expect(FLY_SELECTOR).toContain(".tdb-cell");
    expect(FLY_SELECTOR).toContain(".tdb-gbar");
  });
});
