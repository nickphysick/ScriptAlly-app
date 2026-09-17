/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dashChart — the dashboard's active-queries chart (stage 3, 17 Sep): one navy line over a fade, its
 * window, its headline caption and the event dots that sit on it.
 *
 * ⚠️ THE LINE IS THE LEDGER'S `active` STOCK, AND NOTHING ELSE. The stacked state bands, the brush,
 * the hover readouts and the draw-in are retired with the chart that had them; what is left is the
 * one series the header already reads.
 *
 * ⚠️ THE DOTS ARE ON THE CURVE BY CONSTRUCTION. A dot at a knot sits where the line passes through
 * that point exactly (a monotone cubic interpolates its knots); where a request and a pass share a
 * point, the two are nudged apart ALONG the same curve — evaluated with the same Fritsch–Carlson
 * tangents `monotonePath` draws with — so neither leaves the line.
 */
import { Activity, Query, QueryStatus } from "../types";
import {
  aggregateLedger, axisTicks, axisTop, Freq, hermiteCoeffs, LedgerPoint, monotonePath, rangeWindow,
} from "./oneScreen";
import { buildRows } from "./analytics";
import { getActivityTime, normalizeResultingStatus } from "./queryDerivation";

const DAY_MS = 86400000;

/** How much history each grain shows — 8 weeks for Daily and Weekly, a year for Monthly. */
export const CHART_WINDOW: Record<Freq, { days: number; label: string }> = {
  daily: { days: 56, label: "8 weeks" },
  weekly: { days: 56, label: "8 weeks" },
  monthly: { days: 365, label: "12 months" },
};

export const chartView = (daily: LedgerPoint[], freq: Freq): LedgerPoint[] =>
  rangeWindow(aggregateLedger(daily, freq), CHART_WINDOW[freq].days);

/**
 * How far the active count moved across the window.
 *
 * ⚠️ READ OFF THE DAILY ROWS AT EVERY GRAIN, so Daily and Weekly — both "over 8 weeks" — cannot state
 * two different numbers for the same eight weeks. A weekly view's first point closes up to six days
 * after the window opens; the daily row 56 days back is the window's actual edge.
 */
export const chartDelta = (daily: LedgerPoint[], freq: Freq): number => {
  if (daily.length === 0) return 0;
  const last = daily.length - 1;
  const from = Math.max(0, last - CHART_WINDOW[freq].days);
  return daily[last].active - daily[from].active;
};

/**
 * Queries whose FIRST reply landed inside the window — each query counted once, whatever it went on
 * to say, which is the house response rule (`buildRows` carries the canonical response set).
 */
export const repliesInWindow = (
  queries: readonly Query[],
  activities: readonly Activity[],
  freq: Freq,
  now: Date,
): number => {
  const from = now.getTime() - CHART_WINDOW[freq].days * DAY_MS;
  return buildRows([...queries], [...activities], [], 0)
    .filter((r) => r.respondedMs !== null && r.respondedMs >= from && r.respondedMs <= now.getTime())
    .length;
};

/** "↑ 4 over 8 weeks · 5 replies" */
export const chartCaption = (delta: number, replies: number, freq: Freq): string => {
  const span = CHART_WINDOW[freq].label;
  const move = delta > 0 ? `↑ ${delta} over ${span}` : delta < 0 ? `↓ ${-delta} over ${span}` : `Level over ${span}`;
  return `${move} · ${replies} ${replies === 1 ? "reply" : "replies"}`;
};

export type ChartEventKind = "request" | "pass";

/** A request came in — partial, full, or a revise-and-resubmit. */
export const REQUEST_EVENT_STATUSES: readonly QueryStatus[] = [
  QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT,
];
/** A pass — and only a pass. Silence is not an event on this line. */
export const PASS_EVENT_STATUSES: readonly QueryStatus[] = [QueryStatus.REJECTED];

export interface ChartEventDot {
  /** the point the event falls inside */
  idx: number;
  kind: ChartEventKind;
}

/**
 * One dot of each kind per point: every logged request or pass is bound to the period that contains
 * it, then de-duplicated. Events outside the window are simply not drawn — never clamped to an edge,
 * which would put a dot on a date it did not happen.
 */
export const chartEventDots = (view: LedgerPoint[], activities: readonly Activity[]): ChartEventDot[] => {
  if (!view.length) return [];
  const seen = new Set<string>();
  const out: ChartEventDot[] = [];
  for (const a of activities) {
    const s = normalizeResultingStatus(a.resultingStatus);
    if (!s) continue;
    const kind: ChartEventKind | null = REQUEST_EVENT_STATUSES.includes(s) ? "request"
      : PASS_EVENT_STATUSES.includes(s) ? "pass" : null;
    if (!kind) continue;
    const t = getActivityTime(a.date);
    if (!(t > 0)) continue;
    const idx = view.findIndex((p) => t >= p.start.getTime() && t <= p.end.getTime());
    if (idx < 0 || seen.has(`${idx}:${kind}`)) continue;
    seen.add(`${idx}:${kind}`);
    out.push({ idx, kind });
  }
  return out.sort((x, y) => x.idx - y.idx || (x.kind === "request" ? -1 : 1));
};

/* ── geometry ── */

/** The plot's own insets. The x labels are HTML beneath the svg, so nothing here reserves room for them. */
export const PLOT_PAD = { x: 12, top: 14, bottom: 4 } as const;

export const plotX = (u: number, W: number, len: number): number =>
  PLOT_PAD.x + (u * (W - 2 * PLOT_PAD.x)) / Math.max(1, len - 1);

export const plotY = (v: number, H: number, top: number): number =>
  H - PLOT_PAD.bottom - (v / Math.max(1, top)) * (H - PLOT_PAD.bottom - PLOT_PAD.top);

export interface ChartGeometry {
  points: [number, number][];
  /** the line, a monotone cubic through every point */
  line: string;
  /** the same curve, closed down to the baseline, for the fade */
  area: string;
  /** the three gridlines' y, baseline first */
  gridY: number[];
  baseY: number;
  top: number;
}

export const chartGeometry = (values: readonly number[], W: number, H: number): ChartGeometry => {
  const top = axisTop(Math.max(0, ...values));
  const points = values.map((v, i): [number, number] => [plotX(i, W, values.length), plotY(v, H, top)]);
  const line = monotonePath(points);
  const baseY = plotY(0, H, top);
  const area = points.length
    ? `${line} L${points[points.length - 1][0].toFixed(1)} ${baseY.toFixed(1)} L${points[0][0].toFixed(1)} ${baseY.toFixed(1)} Z`
    : "";
  const gridY = axisTicks(Math.max(0, ...values)).map((t) => plotY(t, H, top));
  return { points, line, area, gridY, baseY, top };
};

/**
 * The curve's position at a fractional index `u` — the Hermite form of the same monotone cubic the
 * line is drawn with, so a point computed here lies on the drawn path.
 */
export const curvePointAt = (values: readonly number[], u: number, W: number, H: number, top: number): [number, number] => {
  const n = values.length;
  if (n === 0) return [0, 0];
  if (n === 1) return [plotX(0, W, 1), plotY(values[0], H, top)];
  const uu = Math.max(0, Math.min(n - 1, u));
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
 * Where each dot is drawn. Alone at its point, a dot sits on the knot; sharing the point with the
 * other kind, the request moves a little before it and the pass a little after, both along the curve.
 *
 * ⚠️ AT EITHER END THE PAIR MOVES INWARD TOGETHER. The curve stops at its first and last knots, so a
 * nudge past the end would be clamped back onto the knot — the pair would sit half as far apart and
 * the two 6px dots would stack. Measured by the unit lock, not seen on the harness account, whose
 * shared points happened to be interior.
 */
export const eventDotPositions = (
  dots: readonly ChartEventDot[],
  values: readonly number[],
  W: number,
  H: number,
  top: number,
): (ChartEventDot & { x: number; y: number })[] => {
  const n = values.length;
  const shared = new Set(dots.filter((d) => d.kind === "pass" && dots.some((o) => o.idx === d.idx && o.kind === "request")).map((d) => d.idx));
  /* a nudge of ~6px, expressed in index units so it is the same distance at every grain */
  const step = (W - 2 * PLOT_PAD.x) / Math.max(1, n - 1);
  const du = step > 0 ? Math.min(0.45, 6 / step) : 0;
  return dots.map((d) => {
    let u = d.idx;
    if (shared.has(d.idx)) {
      /* the pair spans 2·du, centred on its knot unless an end would clip it */
      const lo = Math.min(Math.max(d.idx - du, 0), Math.max(0, n - 1 - 2 * du));
      u = d.kind === "request" ? lo : lo + 2 * du;
    }
    const [x, y] = curvePointAt(values, u, W, H, top);
    return { ...d, x, y };
  });
};

/** The horizontal room one x label is given: a "20 Jul" at 10px mono and the air either side of it. */
export const X_LABEL_SLOT = 64;

/**
 * Thin the x labels as the points multiply — and always keep the last.
 *
 * ⚠️ TWO CAPS, AND THE TIGHTER ONE WINS: at most 6 / 9 / 12 labels by grain, and never more than the
 * plot's own width has room for. A cap by grain alone put nine weekly labels on a 340px plot at 1280,
 * each one touching the next. `width` is the measured plot; before the first measurement there is no
 * plot to crowd, so it defaults to no limit.
 */
export const xLabelEvery = (len: number, freq: Freq, width = Number.POSITIVE_INFINITY): number => {
  const byGrain = freq === "daily" ? 6 : freq === "weekly" ? 9 : 12;
  const byWidth = Math.max(2, Math.floor((width - 2 * PLOT_PAD.x) / X_LABEL_SLOT) + 1);
  return Math.max(1, Math.ceil(len / Math.min(byGrain, byWidth)));
};

/**
 * Which points carry a label: every `every`-th, and the last — but not one within a step of the last.
 *
 * ⚠️ THE LAST LABEL READS BACK FROM ITS POINT (it is right-aligned so it cannot run off the card), so it
 * occupies the whole of the step to its left that a centred label would share with its neighbour.
 * Keeping a label inside that step is how "31 Aug" and "14 Sep" came to touch at 1280.
 */
export const xLabelIndexes = (len: number, every: number): number[] => {
  const last = len - 1;
  const out: number[] = [];
  for (let i = 0; i < len; i += 1) {
    if (i === last || (i % every === 0 && last - i >= every)) out.push(i);
  }
  return out;
};
