/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dashChart — the geometry's locks (v33, 18 Sep).
 *
 * ⚠️ THE LAW THIS FILE EXISTS FOR: anything placed "on the line" IS on the drawn line. `pointOnLine`
 * is asserted against the PATH STRING `chartGeometry` emits — sampled here, independently — and never
 * against its own arithmetic, in both modes.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus, type Query } from "../types";
import { dailyLedger } from "./oneScreen";
import { chartGeometry, fillPath, indexAt, nearestSlot, PLOT, plotX, plotY, pointOnLine, steppedPath, weekSlots } from "./dashChart";
import { longView } from "./dashWindow";

const NOW = new Date(2026, 8, 17, 12, 0, 0);
const DAY = 86400000;
const ago = (n: number) => new Date(NOW.getTime() - n * DAY).toISOString();
let seq = 0;
const q = (status: QueryStatus, over: Record<string, unknown> = {}): Query =>
  ({ id: `k${++seq}`, userId: "u", agentId: "a1", manuscriptId: "m1", status, dateSent: ago(200), ...over } as unknown as Query);

/* ── the drawn path, sampled — cubic, line, and the stepped H/V form ── */
const drawn = (d: string): [number, number][] => {
  const out: [number, number][] = [];
  const re = /([MLCHV])([^MLCHV]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    const n = m[2].split(/[,\s]+/).filter(Boolean).map(Number);
    const [x0, y0] = out[out.length - 1] ?? [0, 0];
    if (m[1] === "M" || m[1] === "L") out.push([n[0], n[1]]);
    else if (m[1] === "H") out.push([n[0], y0]);
    else if (m[1] === "V") out.push([x0, n[0]]);
    else for (let s = 1; s <= 240; s += 1) {
      const t = s / 240, u = 1 - t;
      out.push([
        u * u * u * x0 + 3 * u * u * t * n[0] + 3 * u * t * t * n[2] + t * t * t * n[4],
        u * u * u * y0 + 3 * u * u * t * n[1] + 3 * u * t * t * n[3] + t * t * t * n[5],
      ]);
    }
  }
  return out;
};
const distance = (pts: [number, number][], x: number, y: number): number => {
  let best = Infinity;
  for (let i = 1; i < pts.length; i += 1) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len)) : 0;
    best = Math.min(best, Math.hypot(ax + t * dx - x, ay + t * dy - y));
  }
  return best;
};

const SERIES = [[25, 27, 30, 31, 28, 27, 27, 27, 27], [0, 1, 1, 4, 4, 9], [3, 3], [0, 0, 0, 0]];
const BOXES: [number, number][] = [[428, 236], [310, 170], [690, 250]];

describe("the plot's proportions are the ref's", () => {
  it("baseline at 92.5%, the largest value 18% from the top, x from 2 to 4 short of the edge", () => {
    expect(PLOT).toEqual({ baseline: 0.925, peak: 0.18, x0: 2, xEnd: 4 });
    const g = chartGeometry([2, 8, 5], 400, 200, "smooth");
    expect(g.baseY).toBeCloseTo(185, 5);
    expect(Math.min(...g.points.map((p) => p[1]))).toBeCloseTo(36, 5);
    expect(g.peakY).toBeCloseTo(36, 5);
    expect(g.points[0][0]).toBe(2);
    expect(g.points[2][0]).toBe(396);
    expect(plotY(0, 200, 8)).toBeCloseTo(185, 5);
  });
  it("⚠️ a flat-zero series sits on the floor rather than dividing by nothing", () => {
    const g = chartGeometry([0, 0, 0], 300, 200, "smooth");
    for (const p of g.points) expect(p[1]).toBeCloseTo(185, 5);
    expect(g.line).not.toContain("NaN");
  });
});

describe("⚠️ what is placed on the line is on the DRAWN line — both modes", () => {
  for (const mode of ["smooth", "stepped"] as const) for (const v of SERIES) for (const [W, H] of BOXES) {
    it(`${mode}, ${v.length} points, ${W}×${H}`, () => {
      const g = chartGeometry(v, W, H, mode);
      const path = drawn(g.line);
      expect(path.length, "the sampler read a path").toBeGreaterThan(1);
      let checked = 0;
      for (let u = 0; u <= v.length - 1 + 1e-9; u += 0.13) {
        const [x, y] = pointOnLine(v, u, W, H, g.top, mode);
        expect(distance(path, x, y), `u=${u.toFixed(2)} is on the ${mode} line`).toBeLessThan(0.6);
        checked += 1;
      }
      expect(checked).toBeGreaterThan(v.length);
    });
  }
  it("stepped is step-AFTER: level to the next point's x, then to its value", () => {
    expect(steppedPath([[0, 10], [5, 4], [9, 4]])).toBe("M0.0 10.0 H5.0 V4.0 H9.0 V4.0");
    /* just before the next day the value still holds */
    const [, y] = pointOnLine([1, 5], 0.99, 100, 100, 5, "stepped");
    expect(y).toBeCloseTo(plotY(1, 100, 5), 5);
  });
});

describe("the fill", () => {
  const g = chartGeometry([2, 4, 3], 300, 200, "smooth");
  it("closes on the baseline under its own first and last points", () => {
    const d = fillPath(g, null);
    expect(d.startsWith(g.line)).toBe(true);
    expect(d).toContain(`L${g.points[2][0].toFixed(1)} ${g.baseY.toFixed(1)}`);
    expect(d.endsWith(`L${g.points[0][0].toFixed(1)} ${g.baseY.toFixed(1)} Z`)).toBe(true);
  });
  it("⚠️ carried on, it runs LEVEL at the last point's height out to the edge it is given", () => {
    const d = fillPath(g, 380);
    expect(d).toContain(` L380.0 ${g.points[2][1].toFixed(1)} L380.0 ${g.baseY.toFixed(1)}`);
  });
  it("a carry that stops short of the last point is ignored — the fill never doubles back", () => {
    expect(fillPath(g, 100)).toBe(fillPath(g, null));
  });
});

describe("a moment → a place along the view", () => {
  const LONG = Array.from({ length: 60 }, (_, i) => q(QueryStatus.QUERIED, { dateSent: ago(i * 9) }));
  const daily = dailyLedger(LONG, NOW);
  const view = longView(daily, daily.length - 1);
  it("⚠️ never clamped to an edge: outside the view is null, not the first or last point", () => {
    expect(indexAt(view, view[0].start.getTime() - 1, "smooth")).toBeNull();
    expect(indexAt(view, view[view.length - 1].end.getTime() + 1, "smooth")).toBeNull();
    expect(indexAt([], NOW.getTime(), "smooth")).toBeNull();
  });
  it("smooth: a point stands at its period's CLOSE, and a moment between two closes is between them", () => {
    expect(indexAt(view, view[3].end.getTime(), "smooth")).toBeCloseTo(3, 6);
    const mid = (view[3].end.getTime() + view[4].end.getTime()) / 2;
    expect(indexAt(view, mid, "smooth")).toBeCloseTo(3.5, 3);
    expect(indexAt(view, view[0].start.getTime() + 1000, "smooth")).toBe(0);
  });
  it("stepped: the day that contains it", () => {
    const short = dailyLedger([q(QueryStatus.QUERIED, { dateSent: ago(10) })], NOW);
    expect(indexAt(short, NOW.getTime() - 3 * DAY, "stepped")).toBe(short.length - 4);
  });
});

describe("the week layer", () => {
  it("smooth: one slot per point, read at that week's close", () => {
    const daily = dailyLedger(Array.from({ length: 40 }, (_, i) => q(QueryStatus.QUERIED, { dateSent: ago(i * 9) })), NOW);
    const view = longView(daily, daily.length - 1);
    const slots = weekSlots(view, "smooth");
    expect(slots.map((s) => s.idx)).toEqual(view.map((_, i) => i));
    expect(slots.every((s) => s.weight === 1)).toBe(true);
    expect(slots[2].atMs).toBe(view[2].end.getTime());
  });
  it("⚠️ stepped: the slots' weights are the days in each week, and they sum to the view", () => {
    const daily = dailyLedger([q(QueryStatus.QUERIED, { dateSent: ago(24) })], NOW);
    const slots = weekSlots(daily, "stepped");
    expect(slots.reduce((n, s) => n + s.weight, 0)).toBe(daily.length);
    expect(slots.every((s) => s.weight >= 1 && s.weight <= 7)).toBe(true);
    /* each slot snaps to its LAST day in view — the last slot's is today */
    expect(slots[slots.length - 1].idx).toBe(daily.length - 1);
    /* a label is the Monday the week opens on */
    for (const s of slots) expect(s.label).toMatch(/^\d{1,2} [A-Z][a-z]{2}$/);
  });
  it("the hit test is the nearest snap point", () => {
    const slots = [{ label: "a", weight: 1, idx: 0, atMs: 0 }, { label: "b", weight: 1, idx: 1, atMs: 0 }, { label: "c", weight: 1, idx: 2, atMs: 0 }];
    expect(nearestSlot(slots, plotX(1, 300, 3) + 20, 300, 3)).toBe(1);
    expect(nearestSlot(slots, 299, 300, 3)).toBe(2);
  });
});
