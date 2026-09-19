/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dashChart — the geometry of the dashboard's active-queries chart (v33, 18 Sep; ref
 * design-refs/dashboard-v33.html).
 *
 * ⚠️ THE LINE IS THE LEDGER'S `active` STOCK, AND NOTHING ELSE. What is windowed and at what grain is
 * `dashWindow`'s; what is pinned to the line is `dashPins`'; what a week held is `dashWeekMix`'s. This
 * file turns a series of values into pixels, and says where on the drawn line a moment falls.
 *
 * ⚠️ THE PLOT HAS A FLOOR AND A HEADROOM, BOTH AS FRACTIONS OF ITS HEIGHT (the ref's). The baseline
 * sits 92.5% of the way down — the Mentor stands on it, so the same fraction places his feet — and
 * the largest value in range is drawn 18% from the top, which is the room the pins rise into.
 *
 * ⚠️ TWO LINES, ONE SET OF POINTS. A long campaign is a monotone cubic through weekly points (it
 * passes through every knot and never overshoots — see `monotonePath`); a short one is STEPPED through
 * daily points, because under twelve weeks every rise is one query going out and a curve would draw
 * fractions of a query. `pointOnLine` answers for whichever was drawn, with the same tangents the
 * curve used, so a pin or a focus marker is on the ink by construction.
 *
 * ⚠️ RETIRED WITH v33: the eyebrow caption ("N out with agents · ↑ N over 8 weeks"), the legend, the
 * three gridlines, the hatch, the first-point marker, the request/pass dots and their nudge, and the
 * by-width label thinning (the axis thins itself with a container query now).
 */
import { hermiteCoeffs, LedgerPoint, monotonePath } from "./oneScreen";

export type LineMode = "smooth" | "stepped";

/** The plot's own proportions and insets — the ref's `draw()`. */
export const PLOT = { baseline: 0.925, peak: 0.18, x0: 2, xEnd: 4 } as const;

export const plotX = (u: number, W: number, len: number): number =>
  PLOT.x0 + (u * (W - PLOT.x0 - PLOT.xEnd)) / Math.max(1, len - 1);

/** `top` is the largest value in range (never below 1, so a flat-zero series sits on the floor). */
export const plotY = (v: number, H: number, top: number): number => {
  const base = H * PLOT.baseline;
  return base - (v / Math.max(1, top)) * (base - H * PLOT.peak);
};

export interface ChartGeometry {
  points: [number, number][];
  line: string;
  baseY: number;
  /** the highest point the line reaches, in px — where the fill's gradient starts */
  peakY: number;
  top: number;
  mode: LineMode;
}

/** Step-after: level to the next point's x, then up or down to its value. */
export const steppedPath = (p: readonly [number, number][]): string => {
  if (!p.length) return "";
  let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  for (let i = 1; i < p.length; i += 1) d += ` H${p[i][0].toFixed(1)} V${p[i][1].toFixed(1)}`;
  return d;
};

export const chartGeometry = (values: readonly number[], W: number, H: number, mode: LineMode): ChartGeometry => {
  const top = Math.max(1, ...values);
  const points = values.map((v, i): [number, number] => [plotX(i, W, values.length), plotY(v, H, top)]);
  const line = mode === "stepped" ? steppedPath(points) : monotonePath(points);
  const peakY = points.length ? Math.min(...points.map((q) => q[1])) : H * PLOT.baseline;
  return { points, line, baseY: H * PLOT.baseline, peakY, top, mode };
};

/**
 * The fill's outline: the line, closed down to the baseline.
 *
 * ⚠️ WITH `carryTo`, THE AREA RUNS ON LEVEL PAST THE LAST POINT — at the last point's height, out to
 * the inside of the card's frame, where it breaks up behind the Mentor.
 * ⚠️ AND THE CARD ALWAYS PASSES IT (the v34 mockup, 19 Sep) — the end of the chart disintegrates
 * whatever dates are showing. The first pass drew it only for a window that reaches today; that is
 * reversed. What still depends on the dates is the LINE and its end marker, which stop at the last
 * visible point. `null` remains for a caller with no frame to carry to.
 */
export const fillPath = (g: ChartGeometry, carryTo: number | null): string => {
  if (!g.points.length) return "";
  const first = g.points[0], last = g.points[g.points.length - 1];
  const right = carryTo !== null && carryTo > last[0] ? carryTo : last[0];
  const carry = right > last[0] ? ` L${right.toFixed(1)} ${last[1].toFixed(1)}` : "";
  return `${g.line}${carry} L${right.toFixed(1)} ${g.baseY.toFixed(1)} L${first[0].toFixed(1)} ${g.baseY.toFixed(1)} Z`;
};

/**
 * Where the drawn line is at a fractional index `u`.
 *
 * Smooth: the Hermite form of the same monotone cubic `monotonePath` draws, with the same
 * Fritsch–Carlson tangents. Stepped: the value holds until the next point's x, then changes.
 */
export const pointOnLine = (values: readonly number[], u: number, W: number, H: number, top: number, mode: LineMode): [number, number] => {
  const n = values.length;
  if (n === 0) return [0, 0];
  if (n === 1) return [plotX(0, W, 1), plotY(values[0], H, top)];
  const uu = Math.max(0, Math.min(n - 1, u));
  if (mode === "stepped") return [plotX(uu, W, n), plotY(values[Math.floor(uu)], H, top)];
  const i = Math.min(n - 2, Math.floor(uu));
  const t = uu - i;
  const m = hermiteCoeffs(values);
  const h00 = 2 * t * t * t - 3 * t * t + 1;
  const h10 = t * t * t - 2 * t * t + t;
  const h01 = -2 * t * t * t + 3 * t * t;
  const h11 = t * t * t - t * t;
  const v = h00 * values[i] + h10 * m[i] + h01 * values[i + 1] + h11 * m[i + 1];
  return [plotX(uu, W, n), plotY(v, H, top)];
};

/**
 * A moment → a fractional index along the view, or null when the moment is outside it.
 *
 * ⚠️ NEVER CLAMPED TO AN EDGE. An event before the view's first period or after its last is not
 * drawn, because a pin at the edge would put it on a date it did not happen.
 *
 * Smooth (weekly points): a point stands at its period's CLOSE, so a moment between two closes is
 * interpolated between them; a moment inside the first period has nothing before it and sits on the
 * first point. Stepped (daily points): the day that contains it.
 */
export const indexAt = (view: readonly LedgerPoint[], ms: number, mode: LineMode): number | null => {
  if (!view.length) return null;
  if (ms < view[0].start.getTime() || ms > view[view.length - 1].end.getTime()) return null;
  if (mode === "stepped") {
    const i = view.findIndex((p) => ms >= p.start.getTime() && ms <= p.end.getTime());
    return i < 0 ? null : i;
  }
  for (let i = 0; i < view.length; i += 1) {
    const end = view[i].end.getTime();
    if (ms > end) continue;
    if (i === 0) return 0;
    const prev = view[i - 1].end.getTime();
    return i - 1 + (ms - prev) / Math.max(1, end - prev);
  }
  return view.length - 1;
};

/* ── the week layer ── */

export interface WeekSlot {
  /** "17 Aug" — the Monday the week opens on */
  label: string;
  /** how many of the view's points fall in it — the axis slot's flex weight */
  weight: number;
  /** the point the hover snaps to: the week's LAST point in the view (its close, or today) */
  idx: number;
  /** the moment the week's figures are read at */
  atMs: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const mondayOf = (d: Date): Date => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};

/**
 * One slot per week in view, whatever the grain. Weekly points are a week each (weight 1); daily
 * points are grouped by their ISO week, so a campaign that began on a Thursday opens with a
 * four-day slot and the axis stays under the days it names.
 */
export const weekSlots = (view: readonly LedgerPoint[], mode: LineMode): WeekSlot[] => {
  if (mode === "smooth") {
    return view.map((p, i) => ({ label: p.label, weight: 1, idx: i, atMs: p.end.getTime() }));
  }
  const out: (WeekSlot & { key: number })[] = [];
  view.forEach((p, i) => {
    const mon = mondayOf(p.start);
    const open = out[out.length - 1];
    if (open && open.key === mon.getTime()) { open.weight += 1; open.idx = i; open.atMs = p.end.getTime(); return; }
    out.push({ key: mon.getTime(), label: `${mon.getDate()} ${MONTHS[mon.getMonth()]}`, weight: 1, idx: i, atMs: p.end.getTime() });
  });
  return out.map(({ key: _key, ...slot }) => slot);
};

/** A slot narrower than four days has no room for its date; it keeps its bar. */
export const SLOT_LABEL_MIN_DAYS = 4;

/** The slot whose snap point is nearest an x — the week layer's whole hit test. */
export const nearestSlot = (slots: readonly WeekSlot[], x: number, W: number, len: number): number => {
  let best = 0, bd = Infinity;
  slots.forEach((s, i) => { const d = Math.abs(plotX(s.idx, W, len) - x); if (d < bd) { bd = d; best = i; } });
  return best;
};
