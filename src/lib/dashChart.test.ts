/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The active-queries chart (dashboard stage 3, 17 Sep) — its windows, its caption, its event dots and
 * the geometry that puts them on the line.
 *
 * ⚠️ "THE DOTS SIT ON THE LINE" IS CHECKED AGAINST THE PATH THAT IS DRAWN, NOT AGAINST THE MATHS THAT
 * PLACED THEM. The dots come from `curvePointAt`; asserting them against `curvePointAt` would be a
 * tautology with intermediate steps. So the `d` string `monotonePath` hands the browser is parsed and
 * its cubics sampled here, and each dot's distance is measured to that. The rendered claim is also
 * measured in the browser (`tests/e2e/dashStages.measure.ts`).
 */
import { describe, expect, it } from "vitest";
import { QueryStatus, type Activity, type Query } from "../types";
import { dailyLedger, type LedgerPoint } from "./oneScreen";
import {
  CHART_WINDOW, chartCaption, chartDelta, chartEventDots, chartGeometry, chartView, eventDotPositions,
  PASS_EVENT_STATUSES, PLOT_PAD, plotX, REQUEST_EVENT_STATUSES, repliesInWindow, X_LABEL_SLOT, xLabelEvery,
  xLabelIndexes,
} from "./dashChart";

const NOW = new Date(2026, 8, 17, 12, 0, 0);
const DAY = 86400000;
const ago = (n: number) => new Date(NOW.getTime() - n * DAY).toISOString();
let seq = 0;
const q = (status: QueryStatus, over: Record<string, unknown> = {}): Query =>
  ({ id: `k${++seq}`, userId: "u", agentId: "a1", manuscriptId: "m1", status, dateSent: ago(200), ...over } as unknown as Query);
const act = (queryId: string, resultingStatus: QueryStatus, n: number): Activity =>
  ({ id: `v${++seq}`, queryId, resultingStatus, date: ago(n), type: "Status Change", description: "" } as unknown as Activity);

/** a long record: a send every nine days for a year and a half */
const LONG = Array.from({ length: 60 }, (_, i) => q(QueryStatus.QUERIED, { dateSent: ago(i * 9) }));
const daily = dailyLedger(LONG, NOW);

/* ── the drawn path, sampled ── */
const drawn = (d: string): [number, number][] => {
  const nums = d.split(/[MLC,\s]+/).filter(Boolean).map(Number);
  const out: [number, number][] = [[nums[0], nums[1]]];
  if (d.includes("C")) {
    for (let k = 2; k + 5 < nums.length; k += 6) {
      const [x0, y0] = out[out.length - 1];
      const [x1, y1, x2, y2, x3, y3] = nums.slice(k, k + 6);
      for (let s = 1; s <= 240; s += 1) {
        const t = s / 240, u = 1 - t;
        out.push([
          u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
          u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
        ]);
      }
    }
  } else {
    for (let k = 2; k + 1 < nums.length; k += 2) out.push([nums[k], nums[k + 1]]);
  }
  return out;
};
const distance = (pts: [number, number][], x: number, y: number): number => {
  let best = Infinity;
  for (let i = 1; i < pts.length; i += 1) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const dx = bx - ax, dy = by - ay;
    const len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len)) : 0;
    best = Math.min(best, Math.hypot(ax + t * dx - x, ay + t * dy - y));
  }
  return best;
};

describe("the windows", () => {
  it("8 weeks for Daily and Weekly, 12 months for Monthly", () => {
    expect(CHART_WINDOW).toEqual({
      daily: { days: 56, label: "8 weeks" },
      weekly: { days: 56, label: "8 weeks" },
      monthly: { days: 365, label: "12 months" },
    });
  });

  it("each grain draws its own window of a long record", () => {
    const span = (v: LedgerPoint[]) => (v[v.length - 1].end.getTime() - v[0].start.getTime()) / DAY;
    const d = chartView(daily, "daily");
    const w = chartView(daily, "weekly");
    const m = chartView(daily, "monthly");
    expect(d).toHaveLength(57);                       // 56 days back, today included
    expect(w.length).toBeGreaterThanOrEqual(8);
    expect(w.length).toBeLessThanOrEqual(10);
    expect(span(w)).toBeGreaterThanOrEqual(56);
    expect(span(w)).toBeLessThan(56 + 14);
    expect(m.length).toBeGreaterThanOrEqual(12);
    expect(m.length).toBeLessThanOrEqual(14);
    expect(span(m)).toBeGreaterThanOrEqual(365);
  });
});

describe("the caption", () => {
  it("says which way the count moved, how far, over what, and how many replies came in", () => {
    expect(chartCaption(4, 5, "weekly")).toBe("↑ 4 over 8 weeks · 5 replies");
    expect(chartCaption(-2, 1, "daily")).toBe("↓ 2 over 8 weeks · 1 reply");
    expect(chartCaption(0, 0, "monthly")).toBe("Level over 12 months · 0 replies");
  });

  /* ⚠️ Daily and Weekly both say "over 8 weeks", so they must state one number for it */
  it("⚠️ Daily and Weekly state the same movement, because both read the daily rows", () => {
    expect(chartDelta(daily, "daily")).toBe(chartDelta(daily, "weekly"));
    const last = daily.length - 1;
    expect(chartDelta(daily, "daily")).toBe(daily[last].active - daily[last - 56].active);
    expect(chartDelta(daily, "monthly")).toBe(daily[last].active - daily[last - 365].active);
    expect(chartDelta([], "daily")).toBe(0);
  });

  it("counts each query's FIRST reply once, and only inside the window", () => {
    const a = q(QueryStatus.REJECTED), b = q(QueryStatus.FULL_REQUESTED), c = q(QueryStatus.REJECTED), d = q(QueryStatus.QUERIED);
    const log = [
      act(a.id, QueryStatus.REJECTED, 10),                                                  // in
      act(b.id, QueryStatus.PARTIAL_REQUESTED, 30), act(b.id, QueryStatus.FULL_REQUESTED, 5), // in, once
      act(c.id, QueryStatus.PARTIAL_REQUESTED, 90), act(c.id, QueryStatus.REJECTED, 3),      // first reply before the window
      act(d.id, QueryStatus.PARTIAL_SENT, 2),                                                // not a reply
    ];
    expect(repliesInWindow([a, b, c, d], log, "weekly", NOW)).toBe(2);
    expect(repliesInWindow([a, b, c, d], log, "monthly", NOW)).toBe(3);
  });
});

describe("the event dots", () => {
  it("a request is a partial, a full or an R&R; a pass is a pass — and silence is not an event", () => {
    expect([...REQUEST_EVENT_STATUSES].sort()).toEqual(
      [QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT].sort());
    expect([...PASS_EVENT_STATUSES]).toEqual([QueryStatus.REJECTED]);
  });

  it("⚠️ one dot of each kind per point, bound to the period that holds the event, and nothing outside the window", () => {
    const view = chartView(daily, "weekly");
    const x = q(QueryStatus.QUERIED);
    const log = [
      act(x.id, QueryStatus.PARTIAL_REQUESTED, 1), act(x.id, QueryStatus.FULL_REQUESTED, 1), // one request dot
      act(x.id, QueryStatus.REJECTED, 1), act(x.id, QueryStatus.REJECTED, 1),                // one pass dot
      act(x.id, QueryStatus.NO_RESPONSE, 1), act(x.id, QueryStatus.PARTIAL_SENT, 1),         // not events
      act(x.id, QueryStatus.OFFER, 1),
      act(x.id, QueryStatus.REVISE_RESUBMIT, 400),                                           // outside
    ];
    const dots = chartEventDots(view, log);
    const last = view.length - 1;
    expect(dots).toEqual([{ idx: last, kind: "request" }, { idx: last, kind: "pass" }]);
    const t = new Date(ago(1)).getTime();
    expect(t).toBeGreaterThanOrEqual(view[last].start.getTime());
    expect(t).toBeLessThanOrEqual(view[last].end.getTime());
  });

  it("an event is never clamped onto the window's edge", () => {
    const view = chartView(daily, "daily");
    const x = q(QueryStatus.QUERIED);
    expect(chartEventDots(view, [act(x.id, QueryStatus.REJECTED, 60)])).toEqual([]);
    expect(chartEventDots([], [act(x.id, QueryStatus.REJECTED, 1)])).toEqual([]);
  });
});

describe("⚠️ the geometry — the dots sit on the drawn line", () => {
  const SERIES: number[][] = [
    [25, 27, 30, 31, 28, 27, 27, 27, 27],     // the harness account's weekly line on 17 Sep
    [0, 4, 1, 9, 9, 2, 14, 3],                // a volatile one, with a flat run and reversals
    [5, 6],                                   // two points — drawn straight
  ];
  const BOXES: [number, number][] = [[762, 202], [260, 162], [492, 150]];

  it("the line runs from pad to pad, the three gridlines start at the baseline, and the fade closes on it", () => {
    const g = chartGeometry([3, 7, 5], 600, 200);
    expect(g.points[0][0]).toBe(PLOT_PAD.x);
    expect(g.points[2][0]).toBe(600 - PLOT_PAD.x);
    expect(g.gridY).toHaveLength(3);
    expect(g.gridY[0]).toBe(g.baseY);
    expect(g.baseY).toBe(200 - PLOT_PAD.bottom);
    expect(g.gridY[2]).toBe(PLOT_PAD.top);
    expect(g.line.startsWith(`M${PLOT_PAD.x.toFixed(1)} `)).toBe(true);
    expect(g.area.startsWith(g.line)).toBe(true);
    expect(g.area.endsWith(" Z")).toBe(true);
  });

  for (const values of SERIES) {
    for (const [W, H] of BOXES) {
      it(`every dot — alone or sharing its point — is on the path (${values.length} points, ${W}×${H})`, () => {
        const g = chartGeometry(values, W, H);
        const path = drawn(g.line);
        /* the knots themselves, first */
        for (const [x, y] of g.points) expect(distance(path, x, y)).toBeLessThan(0.15);
        /* both kinds at every point, so every point is shared; and one lone request at the first */
        const dots = values.flatMap((_, i) => [{ idx: i, kind: "request" as const }, { idx: i, kind: "pass" as const }]);
        const placed = eventDotPositions(dots, values, W, H, g.top);
        expect(placed).toHaveLength(dots.length);
        for (const d of placed) expect(distance(path, d.x, d.y), `${d.kind} at ${d.idx}`).toBeLessThan(0.25);
        /* a shared point's two dots are pulled apart along the curve, the request first */
        const step = (W - 2 * PLOT_PAD.x) / Math.max(1, values.length - 1);
        for (let i = 0; i < values.length; i += 1) {
          const r = placed.find((d) => d.idx === i && d.kind === "request")!;
          const p = placed.find((d) => d.idx === i && d.kind === "pass")!;
          expect(p.x - r.x, `point ${i}`).toBeGreaterThan(Math.min(10, step * 0.3));
          expect(p.x - r.x, `point ${i}`).toBeLessThan(step);
        }
        const lone = eventDotPositions([{ idx: 0, kind: "request" }], values, W, H, g.top)[0];
        expect([lone.x, lone.y]).toEqual(g.points[0]);
      });
    }
  }
});

describe("the x labels", () => {
  it("at most six, nine or twelve by grain — and never more than the plot has room for", () => {
    expect(xLabelEvery(57, "daily")).toBe(10);
    expect(xLabelEvery(9, "weekly")).toBe(1);
    expect(xLabelEvery(13, "monthly")).toBe(2);
    expect(xLabelEvery(9, "weekly", 260)).toBe(3);
    expect(X_LABEL_SLOT).toBe(64);
  });

  it("⚠️ the last is always labelled, and nothing sits within a step of it", () => {
    for (const [len, every] of [[9, 1], [9, 3], [57, 10], [13, 2], [2, 1], [1, 1]] as const) {
      const idx = xLabelIndexes(len, every);
      expect(idx[idx.length - 1], `${len}/${every}`).toBe(len - 1);
      expect(idx[0], `${len}/${every}`).toBe(0);
      if (idx.length > 1) expect(idx[idx.length - 1] - idx[idx.length - 2], `${len}/${every}`).toBeGreaterThanOrEqual(every);
    }
    expect(xLabelIndexes(9, 3)).toEqual([0, 3, 8]);
  });

  /* the claim the width cap exists for: at the widths the page draws, no two labels crowd */
  it("⚠️ consecutive labels are at least ~a label's width apart, at every grain and width the page draws", () => {
    const lens: Record<string, number> = { daily: 57, weekly: 9, monthly: 13 };
    for (const W of [260, 302, 420, 462, 762, 842]) {
      for (const freq of ["daily", "weekly", "monthly"] as const) {
        const len = lens[freq];
        const idx = xLabelIndexes(len, xLabelEvery(len, freq, W));
        const xs = idx.map((i) => plotX(i, W, len));
        for (let k = 1; k < xs.length; k += 1) {
          expect(xs[k] - xs[k - 1], `${freq} at ${W}: labels ${idx[k - 1]} and ${idx[k]}`).toBeGreaterThanOrEqual(56);
        }
      }
    }
  });
});
