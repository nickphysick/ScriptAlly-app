/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenChart — the active-queries chart card (spec §3–§4; ref dashboard-one-screen.html).
 *
 * ⚠️ REAL PIXEL COORDINATES, REDRAWN BY ResizeObserver (§3). Never a fixed viewBox stretched with
 * preserveAspectRatio:none — that distorts strokes and nodes. The viewBox always equals the
 * measured size, so one unit is one pixel.
 *
 * ⚠️ THE READING ZONE (§3): the hover popup activates on the line and BELOW it (10px grace
 * above). Above the line is the pins' territory — pins take priority over the crosshair, and the
 * cursor flips default↔crosshair across the boundary so the change is felt, not guessed.
 *
 * ⚠️ THE POPUP AND THE LEDGER ARE THE SAME NUMBERS READ TWICE — both render the weekly ledger,
 * which reconciles by construction (lib/oneScreen). The stage breakdown is as-of-NOW in both
 * captions' senses: "Where they stand" on the current week, "Where they stand today" on any past
 * week, because stage is only known as-of-now (§4).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Agent, Query, QueryStatus } from "../../types";
import { StatusDot } from "../StatusDot";
import { activeStageBreakdown } from "../../lib/dashboardStats";
import { bandSeries, BAND_KEYS, BAND_LABEL, type BandKey, type BandPoint } from "../../lib/chartBands";
import { STATE_TOKEN, STATE_ACCENT_TOKEN, STATE_LINE_TOKEN } from "../../lib/queryCardFacts";
import { placeTooltip, Rect } from "../../lib/deskTooltip";
import {
  aggregateLedger, awaitingChip, dailyLedger, DEFAULT_RANGE_DAYS,
  defaultFreq, Freq, LedgerPoint, monotonePath, sampleStack, nearestStop, periodLabel, RANGE_STOPS, rangeChip,
  rangeWindow, stopForDays, axisTop, axisTicks,
  weeksFromFraction, fractionFromWeeks, weeksLabel, BRUSH_WEEKS_MIN, BRUSH_WEEKS_MAX,
} from "../../lib/oneScreen";
import { OneScreenPanel } from "./OneScreenPanel";
import { OneScreenMark } from "./OneScreenMark";
import { useCountUp } from "../../lib/useCountUp";

/* ── pure geometry (exported for the node-env tests — there is no layout engine to ask) ── */

/**
 * ⚠️ `PADY` IS THE X-AXIS BAND, NOT A MARGIN, AND IT IS WHY THE PLOT AND ITS LABELS ARE ONE BOX.
 *
 * The ref's chart is a single svg whose `viewBox` reserves 48 of its 330 units below the baseline
 * and draws the period labels there — so its box IS the plot plus its scale, and the card's height
 * follows from that one ratio. The app drew the labels as HTML beneath the svg, which is the same
 * picture and a different box: 17px of card height the ref does not spend, on top of a plot sized
 * from a ratio that already assumed the labels were inside it. Measured: the chart card 26px taller
 * than the ref's, and every card below it in the middle column carrying the difference.
 *
 * The labels are absolutely positioned inside the plot's box now, and `PADY` reserves the room they
 * sit in — 34 of the app's own height, the ref's 48/330 at this scale. It is the baseline's offset
 * from the bottom, so raising it lowers nothing: it lifts the whole plot off its own footer.
 */
export const PADX = 14, PADY = 34, PADTOP = 30;
export const READ_MARGIN = 10;

export const chartX = (i: number, W: number, len: number): number =>
  PADX + (i * (W - 2 * PADX)) / Math.max(1, len - 1);

export const chartY = (v: number, H: number, lo: number, hi: number): number =>
  H - PADY - ((v - lo) / Math.max(1, hi - lo)) * (H - PADY - PADTOP);

/** Snap a local x to the nearest week index, clamped to the series. */
export const snapIdx = (xLocal: number, W: number, len: number): number => {
  const step = (W - 2 * PADX) / Math.max(1, len - 1);
  return Math.max(0, Math.min(len - 1, Math.round((xLocal - PADX) / step)));
};

/** The line's y at an arbitrary x — linear between neighbours; the reading-zone boundary. */
export const lineYAtX = (ys: number[], xLocal: number, W: number): number => {
  const step = (W - 2 * PADX) / Math.max(1, ys.length - 1);
  const t = (xLocal - PADX) / step;
  const i0 = Math.max(0, Math.min(ys.length - 2, Math.floor(t)));
  const f = Math.max(0, Math.min(1, t - i0));
  return ys[i0] + (ys[i0 + 1] - ys[i0]) * f;
};

/** §3: x labels thin automatically — plus always the last. Daily dates are wider than "3 Aug"
    week starts, so daily gets fewer of them. */
export const xLabelEvery = (len: number, freq: Freq = "weekly"): number =>
  Math.max(1, Math.ceil(len / (freq === "daily" ? 6 : 8)));

/** The mockup's short stage names — display-only; the keys are the exact enum strings. */
export const STAGE_SHORT: Partial<Record<QueryStatus, string>> = {
  [QueryStatus.QUERIED]: "Queried",
  [QueryStatus.PARTIAL_REQUESTED]: "Partial req",
  [QueryStatus.PARTIAL_SENT]: "Partial sent",
  [QueryStatus.FULL_REQUESTED]: "Full req",
  [QueryStatus.FULL_SENT]: "Full sent",
  [QueryStatus.REVISE_RESUBMIT]: "In revision",
  [QueryStatus.OFFER]: "Offer",
};

/* ── the fixed-position Form 11 tip (plain mode — it never takes the pointer) ── */

const ChartTip: React.FC<{ anchor: Rect | null; children: React.ReactNode }> = ({ anchor, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  React.useLayoutEffect(() => {
    if (!anchor || !ref.current) { setPos(null); return; }
    const box = ref.current.getBoundingClientRect();
    setPos(placeTooltip(anchor, { width: box.width, height: box.height },
      { width: window.innerWidth, height: window.innerHeight }));
  }, [anchor, children]);
  if (!anchor || typeof document === "undefined") return null;
  return createPortal(
    <div ref={ref} className={`os-tip${pos ? " show" : ""}`} style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0 }} role="presentation">
      {children}
    </div>,
    document.body,
  );
};

/* ── the card ── */

/* ⚠️ THE COUNT-UP MOVED TO `lib/useCountUp` (audit P6) — the header counters need the same
   behaviour, and one screen must not hold two of it. */

export const OneScreenChart: React.FC<{
  loading: boolean;
  queries: Query[];
  agents: Agent[];
  now: Date;
  dayOne?: boolean;
  earlyDays?: boolean;
  onSendFirst?: () => void;
}> = ({ loading, queries, agents, now, dayOne = false, earlyDays = false, onSendFirst }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const lineRef = useRef<SVGPathElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  /* ⚠️ TWO INDEPENDENT CONTROLS: frequency is the GRAIN of a point, range is the WINDOW of days
     on show. They compose — 8 weeks of daily points and 8 weeks of weekly points are the same
     history at two resolutions. `freq` is null until the record decides the opening grain. */
  const [freq, setFreq] = useState<Freq | null>(null);
  const [rangeDays, setRangeDays] = useState<number>(DEFAULT_RANGE_DAYS);
  const [reading, setReading] = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const [tipAnchor, setTipAnchor] = useState<Rect | null>(null);
  const [liveText, setLiveText] = useState("");
  const drewIn = useRef(false);

  const daily = useMemo(() => dailyLedger(queries, now), [queries, now]);
  /* ⚠️ A NEW ACCOUNT OPENS ON DAILY — under a month of record makes a two-point weekly line,
     which says nothing. Once chosen by hand, the choice stands. */
  const openFreq = defaultFreq(daily);
  const effFreq: Freq = freq ?? openFreq;
  const ledger = useMemo(() => aggregateLedger(daily, effFreq), [daily, effFreq]);
  const view = useMemo(() => rangeWindow(ledger, rangeDays), [ledger, rangeDays]);
  const active = daily.length ? daily[daily.length - 1].active : 0;
  const shownActive = useCountUp(active);
  /**
   * ⚠️ THE BANDS ARE READ AT THE SAME INSTANTS THE LINE IS (Phase 4) — `bandSeries` takes the view
   * and samples each period's close, so `bands[i]` and `view[i]` are the same moment by construction
   * rather than by two date calculations that happen to agree.
   */
  const bands = useMemo(() => bandSeries(view, queries, now), [view, queries, now]);
  const stages = useMemo(() => activeStageBreakdown(queries), [queries]);
  const activeTotal = stages.reduce((a, r) => a + r.count, 0);

  /* §3: measured, and remeasured on resize. */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width && r.height) setSize({ w: Math.round(r.width), h: Math.round(r.height) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const W = size?.w ?? 0, H = size?.h ?? 0;
  const sparse = view.length < 2;
  /**
   * ⚠️ ONE SERIES. The line is the BANDS' SUM and there is no `active` series any more.
   *
   * They were two derivations of one number — `dailyLedger` counted active queries, `bandsAt` sorted
   * active queries into four buckets — and they disagreed, visibly, as clear air between the top
   * band and the line. The card carried a sentence explaining the gap. Reading the line off the
   * bands makes the disagreement unrepresentable: `bandsAt` puts every active query in exactly one
   * bucket, so the sum IS the count, and the top of the stack IS the line at every point.
   */
  /**
   * ⚠️ THE THREE BANDS' SUM, AND `undated` IS NOT IN IT (ref v16, Phase 5). The pack cuts the fourth
   * band and holds the legend to three entries, so the queries the record cannot place have nowhere
   * to be drawn — and adding them to the LINE while drawing them nowhere would put back the gap
   * between the line and the top of the stack that this chart spent a whole phase closing.
   *
   * ⚠️ THE COST IS STATED RATHER THAN HIDDEN: an unplaceable query is not on this chart. That is a
   * query whose current state and last dated rung are in different bands — a full went out, the
   * answer was Revise & Resubmit, and nothing dated the turn. `undatedNow` still derives the figure
   * for any surface that wants to say so.
   */
  const total = useMemo(() => bands.map((b) => b.queried + b.agent + b.you), [bands]);
  /* zero-based, round top label, headroom so the peak never touches the frame — see `axisMax` */
  const lo = 0;
  const hi = useMemo(() => (sparse ? 5 : axisTop(Math.max(0, ...total))), [total, sparse]);
  const ticks = useMemo(() => (sparse ? [] : axisTicks(Math.max(0, ...total))), [total, sparse]);
  const pts = useMemo<[number, number][]>(
    () => (sparse || !W ? [] : total.map((v, i) => [chartX(i, W, view.length), chartY(v, H, lo, hi)])),
    [total, view.length, W, H, lo, hi, sparse],
  );
  /**
   * ⚠️ THE THUMBNAIL IS THE CHART, NOT A SUMMARY OF IT — same three bands, same stacking, same ink
   * line, in a 230×34 box. A brush is a control that shows what it is excluding, so it has to be
   * recognisable as the thing above it; a single sage silhouette was a different picture of the
   * same data and the eye had to be told they were related.
   *
   * ⚠️ IT DRAWS THE FULL LEDGER, NOT THE VIEW. The view is what the brush SELECTS; drawing the
   * selection inside the selector would make the thumbnail redraw itself every time the handle
   * moved, and the excluded span would have nothing to be excluded from.
   */
  const ledgerBands = useMemo(() => bandSeries(ledger, queries, now), [ledger, queries, now]);
  const brushAreas = useMemo(() => {
    const n = ledger.length;
    if (n < 2) return [] as { key: BandKey; d: string }[];
    /* the same three-band sum the chart draws — a thumbnail that included a band the chart does
       not would be a different picture of the same data */
    const tot = ledgerBands.map((b) => b.queried + b.agent + b.you);
    const mx = Math.max(1, ...tot) + 1;
    const bx = (i2: number) => 6 + (218 * i2) / (n - 1);
    const by = (v: number) => 32 - (29 * v) / mx;
    /* ⚠️ THE THUMBNAIL CLOSES ON ITS OWN ZERO TOO (v29, Phase 4). It closed at 34 — the box's foot —
       while `by(0)` is 32, so the same fault the chart had lived here two pixels deep, hidden by a
       14px radius. One law, both drawings: nothing paints below zero. */
    const areaTo = (vals: number[]) => {
      const top = monotonePath(vals.map((v, i2) => [bx(i2), by(v)] as [number, number]));
      const z = by(0).toFixed(1);
      return top ? `${top} L ${bx(n - 1).toFixed(1)} ${z} L ${bx(0).toFixed(1)} ${z} Z` : null;
    };
    const cum = (upTo: number) => ledgerBands.map((bp) => {
      let acc = 0;
      for (let k = 0; k <= upTo; k++) acc += bp[BAND_KEYS[k]];
      return acc;
    });
    const out: { key: BandKey; d: string }[] = [];
    for (let k = BAND_KEYS.length - 1; k >= 0; k--) {
      const d = areaTo(cum(k));
      if (d) out.push({ key: BAND_KEYS[k], d });
    }
    return out;
  }, [ledger, ledgerBands]);
  const brushLine = useMemo(() => {
    const n = ledger.length;
    if (n < 2) return "";
    const tot = ledgerBands.map((b) => b.queried + b.agent + b.you);
    const mx = Math.max(1, ...tot) + 1;
    return monotonePath(tot.map((v, i2) => [6 + (218 * i2) / (n - 1), 32 - (29 * v) / mx] as [number, number]));
  }, [ledger, ledgerBands]);

  /**
   * ⚠️ THE BANDS ARE PAINTED AS CUMULATIVE AREAS, BACK TO FRONT — never as three polygons with
   * shared edges. A stacked polygon needs its lower boundary to be the previous band's upper one
   * REVERSED, and reversing a monotone cubic is fiddly enough that the two edges drift apart at
   * every curve; the seam then shows as a hairline of card paper between two bands. Painting
   * `queried+agent+you` in the top band's colour, then `queried+agent` over it, then `queried` over
   * that, tiles exactly by construction: every visible band is the difference between two areas
   * that share the identical curve.
   *
   * ⚠️ AND THE FILLS ARE `STATE_TOKEN`, VIA `stateFor` — the locked v2 state colours the Query
   * Centre's cards and the To-do ticket's edge already read. A fourth copy of four hexes is how a
   * page comes to be nearly the right colour.
   */
  /**
   * ⚠️ SAMPLED, CLAMPED, THEN DRAWN — AND NOTHING IS FITTED AFTER THE CLAMP (v32, Phase 2).
   *
   * Each cumulative boundary used to get its own `monotonePath`. A monotone fit is GLOBAL, so two
   * boundaries equal at every knot still take different paths between them: the sage boundary could
   * rise above the total line in the gaps while agreeing exactly at every data point. Reproduced
   * numerically against this app's own tangent maths before a line was changed — 0.2963 units, about
   * 3px at this chart's height, between knots 4 and 5 of the worked example in `sampleStack`'s note.
   *
   * ⚠️ AND IT IS WHY THREE PASSES OF PIXEL SWEEPS ABOVE THE LINE CAME BACK CLEAN. The crossing needs
   * a band that is zero for a stretch and non-zero later; the harness account's data never had that
   * shape, so every reading was a true statement about a page that was not showing the fault.
   *
   * `sampleStack` does the whole of it: one interpolation per boundary, evaluated at (N−1)×24 evenly
   * spaced positions, then each sample clamped to the boundary above it and to ≥ 0. The bands and the
   * LINE are polylines through those same clamped arrays, so the line is not merely equal to the top
   * band's edge — it IS that array.
   */
  const SAMPLE_STEPS_PER_GAP = 24;
  const stack = useMemo(() => {
    if (sparse || !W || !H || view.length < 2) return null;
    const cum = (upTo: number) => view.map((_, i) => {
      const bp = bands[i];
      let n = 0;
      for (let k = 0; k <= upTo; k++) n += bp ? bp[BAND_KEYS[k]] : 0;
      return n;
    });
    const steps = (view.length - 1) * SAMPLE_STEPS_PER_GAP;
    const curves = sampleStack(BAND_KEYS.map((_, k) => cum(k)), steps);
    const sx = (k: number) => PADX + ((W - 2 * PADX) * k) / steps;
    return { curves, steps, sx };
  }, [bands, view, W, H, sparse]);

  /* the line is the topmost clamped array, drawn as the polyline the bands are drawn from */
  const path = useMemo(() => {
    if (!stack) return monotonePath(pts);
    const top = stack.curves[stack.curves.length - 1];
    return top.map((v, k) => (k ? "L" : "M") + stack.sx(k).toFixed(2) + " " + chartY(v, H, lo, hi).toFixed(2)).join("");
  }, [stack, pts, H, lo, hi]);

  const bandAreas = useMemo(() => {
    if (!stack) return [] as { key: BandKey; d: string }[];
    const { curves, steps, sx } = stack;
    /**
     * ⚠️ EVERY BAND STILL CLOSES ON THE ZERO BASELINE, NOT ON THE SVG'S FOOT (v29, Phase 4) — the
     * bottom band's lower boundary is the zero array, and `chartY(0)` is where that lands. Nothing
     * paints below `y(0)`, which is a standing gate.
     */
    const zero = curves[0].map(() => 0);
    const polyTop = (c: number[]) =>
      c.map((v, k) => (k ? "L" : "M") + sx(k).toFixed(2) + " " + chartY(v, H, lo, hi).toFixed(2)).join("");
    const polyBot = (c: number[]) =>
      c.map((v, k) => "L" + sx(k).toFixed(2) + " " + chartY(v, H, lo, hi).toFixed(2)).reverse().join("");
    const areaS = (top: number[], bot: number[]) => polyTop(top) + polyBot(bot) + "Z";
    const out: { key: BandKey; d: string }[] = [];
    /* back to front: the widest stack first, so each later fill covers the one beneath it */
    for (let k = BAND_KEYS.length - 1; k >= 0; k--) {
      out.push({ key: BAND_KEYS[k], d: areaS(curves[k], k === 0 ? zero : curves[k - 1]) });
    }
    return out;
  }, [stack, H, lo, hi]);
  const ys = useMemo(() => pts.map((p) => p[1]), [pts]);

  /* ⚠️ THE DRAW-IN RUNS ONCE, EVER (§3) — never on resize, never on range change, never under
     reduced motion. `drewIn` is a ref for exactly that reason: state would re-arm it on remount
     of the effect, a ref survives every re-render of this mounted card. */
  useEffect(() => {
    if (drewIn.current || !path || loading) return;
    drewIn.current = true;
    const line = lineRef.current;
    if (!line || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const L = line.getTotalLength();
    line.style.strokeDasharray = String(L);
    line.style.strokeDashoffset = String(L);
    requestAnimationFrame(() => {
      line.style.transition = "stroke-dashoffset .9s cubic-bezier(.4,0,.2,1)";
      line.style.strokeDashoffset = "0";
    });
    const id = window.setTimeout(() => {
      line.style.strokeDasharray = ""; line.style.transition = "";
    }, 1100);
    return () => window.clearTimeout(id);
  }, [path, loading]);

  const blurPoint = useCallback(() => { setFocusIdx(-1); setTipAnchor(null); }, []);

  const focusPoint = useCallback((i: number, announce: boolean) => {
    if (!svgRef.current || !view[i]) return;
    setFocusIdx(i);
    const r = svgRef.current.getBoundingClientRect();
    setTipAnchor({ left: r.left + chartX(i, W, view.length), top: r.top + chartY(total[i] ?? 0, H, lo, hi), width: 0, height: 0 });
    if (announce) {
      const w = view[i];
      setLiveText(`${periodLabel(effFreq, w.label)}. ${w.active} active ${w.active === 1 ? "query" : "queries"}. ${w.sent} sent, ${w.closed} closed.`);
    }
  }, [view, W, H, lo, hi, effFreq]);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (sparse || !svgRef.current) return;
    const r = svgRef.current.getBoundingClientRect();
    const xLocal = e.clientX - r.left, yLocal = e.clientY - r.top;
    const onOrBelow = ys.length >= 2 && yLocal >= lineYAtX(ys, xLocal, W) - READ_MARGIN;
    setReading(onOrBelow);
    if (!onOrBelow) { if (focusIdx >= 0) blurPoint(); return; }
    focusPoint(snapIdx(xLocal, W, view.length), false);
  };

  const onKey = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (sparse) return;
    let i = focusIdx < 0 ? view.length - 1 : focusIdx;
    if (e.key === "ArrowRight") i = Math.min(view.length - 1, i + 1);
    else if (e.key === "ArrowLeft") i = Math.max(0, i - 1);
    else if (e.key === "Home") i = 0;
    else if (e.key === "End") i = view.length - 1;
    else if (e.key === "Escape") { blurPoint(); svgRef.current?.blur(); return; }
    else return;
    e.preventDefault();
    focusPoint(i, true);
  };

  /* every control change drops the focused point — it indexes into a view about to change length */
  const resetRead = () => { blurPoint(); };
  const stop = stopForDays(rangeDays);
  /* ⚠️ THE BRUSH IS WEEKS, AND THE HANDLE IS DRAWN FROM THE VALUE rather than from a second
     expression. The inversion it replaces was exactly two expressions never reconciled: the drawn
     handle at `100 - p`, the input's thumb at `p`. One derivation, both directions. */
  const brushWeeks = Math.max(BRUSH_WEEKS_MIN, Math.min(BRUSH_WEEKS_MAX, Math.round(rangeDays / 7)));
  /**
   * ⚠️ THE HANDLE'S POSITION IS THE CURSOR'S, AND `N` IS DERIVED FROM IT ONE WAY (v29, Phase 2).
   *
   * The jitter was a FEEDBACK LOOP, not a rendering fault. The handle was drawn from `brushWeeks`,
   * `brushWeeks` was derived from the handle, and there is a `Math.round` on the way — so every
   * pointer move snapped the handle to the nearest whole-week stop instead of to the cursor. The
   * reader drags a pixel; the handle either does not move at all or jumps a twelfth of the track.
   *
   * `dragP` breaks the loop. While a drag is live it holds the cursor's exact fractional position
   * and the handle renders at it; `N` is computed FROM it and never written back to it. On pointer
   * up `dragP` clears and the handle settles onto the week boundary the value implies — which is
   * the only moment the two are allowed to be the same number.
   *
   * ⚠️ IT IS STATE, NOT A REF. The handle's `left` is rendered output, so a ref would move the
   * value without repainting the thing it positions — the loop broken in the other direction.
   */
  const [dragP, setDragP] = useState<number | null>(null);
  const handleF = dragP ?? fractionFromWeeks(brushWeeks);
  const bwRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  /**
   * ⚠️ THE SECOND LOOP, AND THE ONE NOBODY REPORTED: THE TRACK MOVES WHILE YOU DRAG IT.
   *
   * `p` was measured against the track's LIVE box. The range label sits in the same right-aligned
   * cluster and its text is the value — so "Last 11 weeks" is 6.1px wider than "Last 4 weeks", the
   * cluster grows leftward by exactly that, and the track slides out from under the cursor. Then
   * `p` changes because the FRAME moved rather than because the pointer did, which changes the
   * value, which changes the label, which moves the frame again.
   *
   * Measured at 1536, tracing the track's own box through a 20-step drag: `trackLeft` oscillating
   * between 944.13 and 951.39 and the label reading 11, 4, 5, 10, 6, 9, 7, 7, 7, 8, 6, 8, 9, 4, 10,
   * 4, 11, 4, 11, 4 as the cursor moved smoothly right. The ref does not do this — not because it
   * solved it, but because at that width its control row is LEFT-aligned, so its capsule grows to
   * the right and its track stays put. That is a property of the ref's alignment, not a fix, and
   * copying the alignment would import the accident rather than the answer.
   *
   * ⚠️ SO THE GESTURE OWNS ITS FRAME OF REFERENCE. The track's box is captured once at pointerdown
   * and every move is measured against it, which is the same medicine as `dragP`: a drag reads the
   * world as it was when the finger went down, and nothing it causes can feed back into it. It also
   * holds for any future reflow mid-drag — a wider select, a longer chip — rather than for this one.
   */
  const dragRect = useRef<DOMRect | null>(null);
  const setFromPointer = useCallback((clientX: number) => {
    const el = bwRef.current;
    if (!el) return;
    const r = dragRect.current ?? el.getBoundingClientRect();
    if (r.width <= 0) return;
    const p = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    setDragP(p);
    setRangeDays(weeksFromFraction(p) * 7);
    resetRead();
  }, [resetRead]);
  /* ⚠️ EVERY WAY OUT OF A DRAG CLEARS `dragP`, and `pointercancel` is not optional: a touch that
     becomes a scroll fires cancel and never fires up, so a missing branch leaves the handle frozen
     at the cursor's last fractional position while the value says something else. */
  const endDrag = useCallback(() => { dragging.current = false; dragRect.current = null; setDragP(null); }, []);

  const every = xLabelEvery(view.length, effFreq);
  const lastIdx = view.length - 1;
  const focusedWeek: LedgerPoint | null = focusIdx >= 0 ? view[focusIdx] : null;
  const focusBand: BandPoint | null = focusIdx >= 0 ? bands[focusIdx] ?? null : null;

  return (
    <OneScreenPanel variant="os-lead" probe="chart-card" loading={loading} skel={["h", "grow", ""]}>
      {/**
        * ⚠️ THE SAME BAND AS EVERY OTHER CONTAINER (§2) — `.os-ahead`, not a chart-specific header.
        * Active queries was the last container on plain parchment while Tasks, Activity and Goals
        * carried the sage band; using the same class is what makes "band heights match" structural
        * rather than three numbers kept in step by hand.
        *
        * ⚠️ THE CONTROLS SIT IN THE BAND, and that is a REVISION of the original spec. A separate
        * control row beneath measured 45px, which took the chart from 205px to 150px in a 302px
        * card — under half the container. In the band they cost nothing: the row already exists.
        * The trade is that this band is the only one carrying interactive children, so its height
        * is now set by the tallest control rather than by the title; both are checked at 1440 AND
        * 1024, because a control that wraps at a narrow width breaks the uniformity outright.
        */}
      {/* ⚠️ PROBED (v28, Phase 3) — the header's own HEIGHT is the gate now. v27 asked whether the
          TITLE rendered on one line; it did, while the control cluster wrapped to a second row
          beneath it. A symptom can be true while the thing it stands for is false; a box's height
          cannot. */}
      <div className="os-ahead" data-probe="chart-header">
        <OneScreenMark name="active-queries" />
        {/* ⚠️ THE STAT BLOCK (dashboard redesign, Phase 4; ref `hdr:b`) — the FIGURE leads at
            Playfair 38, with the title and the delta caption stacked beside it. Before, the figure
            was one item in a flat row of five, reading as one more control; leading with it is what
            makes the header a readout with a name rather than a name with a number after it.

            ⚠️ THE CAPTION IS THE SAME DERIVATION AS THE OLD CHIP, RE-LAID-OUT, NOT A NEW FIGURE.
            `rangeChip` and `awaitingChip` are unchanged and the §9 split is unchanged with them: in
            the first fortnight it states what is out, because a two-point range delta is noise
            dressed as a trend. */}
        <span className="os-stat">
          <span className="os-n">{shownActive}</span>
          <span className="os-statxt">
            <h2 data-probe-text="chart-title">Active queries</h2>
            {earlyDays
              ? <span className="os-delta">{awaitingChip(queries)}</span>
              : view.length >= 2 && <span className="os-delta">{rangeChip(view)}</span>}
          </span>
        </span>
        {/* ⚠️ ONE CLUSTER (audit P5) — the label must travel WITH the slider it reports. */}
        <div className="os-ctrls" data-probe="chart-controls">
        {/**
          * ⚠️ THREE CHIPS, NOT A SELECT (v31, Phase 3) — ref `.chips`, which v31 gives a third
          * button so its control matches the three frequencies this app has always had.
          *
          * The select was an ALLOWANCE granted three passes ago, and it was the wrong call: the
          * reasoning was "the ref draws two chips and we have three frequencies, so a select is the
          * honest divergence". What it actually did was let the ref and the app disagree about a
          * visible control and then record the disagreement as permitted — which is the one thing
          * this process exists to prevent. The ref has three chips now and so does this.
          *
          * ⚠️ `role="group"` WITH `aria-pressed`, NOT A RADIOGROUP. These are toggles that take
          * effect immediately rather than a selection to be confirmed, and `aria-pressed` is what a
          * screen reader reads out for a chip that is currently on.
          */}
        <div className="os-freqchips" role="group" aria-label="Chart frequency">
          {(["daily", "weekly", "monthly"] as const).map((f) => (
            <button
              key={f}
              type="button"
              className={effFreq === f ? "on" : undefined}
              aria-pressed={effFreq === f}
              onClick={() => { setFreq(f); resetRead(); }}
            >
              {f === "daily" ? "Daily" : f === "weekly" ? "Weekly" : "Monthly"}
            </button>
          ))}
        </div>
        {/* ⚠️ THE BRUSH (dashboard redesign, Phase 4; ref `rc:brush`) REPLACES THE SLIDER. A slider
            is an abstract scale with a word beside it; a brush is a thumbnail of the writer's own
            record with the excluded span shaded, so the control shows what it is excluding. Same
            landmark stops, same `nearestStop` snapping, same `rangeDays` — this is the slider's
            value expressed against the data rather than against a track.

            ⚠️ IT DRAWS THE FULL LEDGER, NOT THE VIEW. The view is what the brush SELECTS; drawing
            the selection inside the selector would make the thumbnail redraw itself every time the
            handle moved, and the excluded span would have nothing to be excluded from. */}
        <div className="os-brush" data-probe="brush">
          {/* ⚠️ THE SHADE IS CARD PAPER AT 62%, NOT A GREY. It has to read as "this part is not on
              show" while the thumbnail stays legible through it — a solid mask would hide the
              excluded history, which is the one thing the control exists to show. */}
          {/* ⚠️ 1:1 DRAG WITH POINTER CAPTURE — the ref's own handlers. Capture on down means the
              drag survives the pointer leaving the 150px track, which is most of a real drag;
              without it the handle stops dead at the edge and the control feels broken exactly
              where a reader pushes hardest. `pointercancel` clears the flag too: a touch that
              becomes a scroll fires cancel and never fires up, so a missing cancel leaves the
              brush armed and the next stray move jumps the range. */}
          <div
            className="os-bw"
            ref={bwRef}
            onPointerDown={(e) => {
              dragging.current = true;
              /* the gesture's frame, captured BEFORE the first value change can move it */
              dragRect.current = e.currentTarget.getBoundingClientRect();
              e.currentTarget.setPointerCapture(e.pointerId);
              setFromPointer(e.clientX);
            }}
            onPointerMove={(e) => { if (dragging.current) setFromPointer(e.clientX); }}
            onPointerUp={(e) => {
              endDrag();
              try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
            }}
            onPointerCancel={endDrag}
          >
            <svg viewBox="0 0 230 34" preserveAspectRatio="none" aria-hidden="true">
              {brushAreas.map((a) => (
                <path key={a.key} d={a.d} fill={STATE_TOKEN[a.key]} />
              ))}
              {brushLine && <path d={brushLine} fill="none" stroke="#1c130f" strokeWidth={1.1} />}
            </svg>
            {/* the window runs from the handle to the RIGHT edge; the shade is everything before it */}
            <div className="os-bshade" style={{ width: `${handleF * 100}%` }} />
            <div className="os-bwin" style={{ left: `${handleF * 100}%` }} />
            {/* ⚠️ THE RANGE INPUT SURVIVES, INVISIBLE, OVER THE WHOLE BOX — a control that cannot be
                reached from the keyboard is not a control. It carries WEEKS directly now, so its
                thumb and the drawn handle read the same number instead of two mirrored ones. */}
          </div>
          <span className="os-rangelbl">{weeksLabel(brushWeeks)}</span>
          {/**
            * ⚠️ THE KEYBOARD CONTROL IS THE CAPSULE'S, NOT THE TRACK'S (v31, Phase 3). It lived
            * inside `.os-bw`, and the ref hides that thumbnail below 1650 to make room for the third
            * frequency chip — which would have taken the only keyboard route to the range with it,
            * at every width a laptop actually is. It is `pointer-events: none` and keyboard-only
            * already (v30), so where it is anchored changes nothing about the pointer; anchoring it
            * to the capsule means the control survives its own picture being hidden.
            */}
          <input
            type="range" min={BRUSH_WEEKS_MIN} max={BRUSH_WEEKS_MAX} step={1} value={brushWeeks}
            aria-label="Chart range in weeks"
            aria-valuetext={weeksLabel(brushWeeks)}
            onChange={(e) => { setRangeDays(Number(e.target.value) * 7); resetRead(); }}
          />
        </div>
        </div>
      </div>
      {/* ⚠️ THE CARD IS THREE SIBLINGS, NOT TWO — band, chart, legend, which is the ref's own
          structure (`.hd` / `.chart` / `.legend`, all children of `.card`). The legend used to sit
          INSIDE the chart body, which meant the body's padding had to be the sum of two elements'
          gutters and the plot's height was whatever was left after the legend had taken its share.
          Measured that way the plot came out 291 against the ref's 308.4, and there is no padding
          value that fixes it, because the fault is a level of nesting rather than a number.
          The padding is still the BODY's and never the card's — the band runs edge to edge. */}
      <div className="os-lbody">
      <div className="os-chartwrap" ref={wrapRef}>
        {dayOne ? (
          /* §9: the day-one card is an invitation, not an empty chart */
          <div className="os-dayone on">
            <svg className="os-dayone-art" viewBox="0 0 120 90" aria-hidden="true">
              <rect x="18" y="34" width="60" height="40" rx="4" />
              <path d="M18 38l30 22 30-22" />
              <path d="M70 30l14-14M84 16h-10M84 16v10" />
              <path d="M90 44c6-2 10-8 10-14" />
            </svg>
            <span className="os-dayone-copy">Every query you send and every reply that comes back will be charted here.</span>
            <button type="button" className="os-btn-mini" onClick={onSendFirst}>Send your first query</button>
          </div>
        ) : sparse ? (
          <div className="os-sparse on">
            {/* ⚠️ GRAIN-AWARE, because the grain decides when the second point arrives. The old
                wording named weeks unconditionally and became false the moment the chart could
                be read daily — at that grain the line begins the next day. */}
            <span>The line begins once there are two {effFreq === "daily" ? "days" : effFreq === "weekly" ? "weeks" : "months"} on the record.</span>
          </div>
        ) : (
          <svg
            ref={svgRef}
            data-probe="plot"
            /**
             * ⚠️ THE SERIES, PUBLISHED FOR THE HARNESS (v31, Phase 2). The chart's interior is
             * generated at runtime, so for three passes the diff compared the plot's BOX and never
             * what was drawn inside it — every chart change was built from prose about the ref
             * rather than from the ref. A pixel comparison needs both sides drawing the SAME
             * numbers, and the ref is a static mockup with its own invented fixture; the tractable
             * direction is to feed the app's numbers into the ref, which needs the app to state
             * them. Three arrays, the same three the bands are built from.
             *
             * ⚠️ IT IS INSTRUMENTATION, NOT AN API — the same species as `data-probe`, and the ref
             * itself added `data-line-end` in this version for exactly this reason. Nothing in the
             * app reads it.
             */
            data-series={JSON.stringify({
              v: bands.map((b) => [b.queried, b.agent, b.you]),
              lab: view.map((w) => w.label),
              every,
            })}
            className={reading ? "reading" : undefined}
            width={W || undefined}
            height={H || undefined}
            viewBox={W && H ? `0 0 ${W} ${H}` : undefined}
            tabIndex={0}
            role="img"
            aria-label="Active queries over time. Use the arrow keys to step through each point."
            onMouseMove={onMove}
            onMouseLeave={() => { setReading(false); blurPoint(); }}
            onKeyDown={onKey}
            onFocus={() => { if (focusIdx < 0 && view.length > 1) focusPoint(view.length - 1, true); }}
            onBlur={blurPoint}
          >
            {W > 0 && H > 0 && (
              <>
                {/* ⚠️ THREE TICKS, ZERO-BASED, AND NO GRIDLINES. The ref writes `<line class="grid">`
                    into its SVG and never gives that class a stroke, so nothing paints — the labels
                    alone are the scale, and that is what ships here. Adding rules would be inventing
                    furniture the design does not draw. */}
                {/* ⚠️ THE ZERO LABEL SITS ON THE AXIS LINE, AND ZERO GETS NO GRIDLINE — v26. A
                    gridline at zero draws a second rule a pixel from the baseline, so the foot of
                    the chart reads as two lines that do not quite meet. The baseline is the rule;
                    everything above it is a gridline. */}
                <line
                  className="os-axis0"
                  x1={0} x2={W} y1={chartY(0, H, lo, hi)} y2={chartY(0, H, lo, hi)}
                  stroke="#e0d7cb" strokeWidth={1}
                />
                {ticks.filter((t) => t > 0).map((t) => (
                  <line
                    key={`g${t}`} className="os-gridline"
                    x1={0} x2={W} y1={chartY(t, H, lo, hi)} y2={chartY(t, H, lo, hi)}
                    stroke="#efe7db" strokeWidth={1}
                  />
                ))}
                {ticks.map((t) => (
                  <text key={t} className="os-ylab" x={3} y={chartY(t, H, lo, hi) + 3}>{t}</text>
                ))}
                {/* ⚠️ THE STACK REACHES THE LINE. Every band carries a 1px border of its own deeper
                    step — `STATE_ACCENT_TOKEN`, the same key as the fill, so the two cannot fall out
                    of step — which is what separates two adjacent fills of similar value. */}
                {/* ⚠️ ONE GRADIENT OVER ALL THE BANDS, NOT A GRADIENT FILL PER BAND (v26). Tinting
                    each fill separately would change the colours the strip and the tooltip name;
                    a single overlay in the CARD's own colour, transparent at the top and ~85% at
                    the baseline, fades the whole stack downward and leaves every band's identity
                    exactly where `STATE_TOKEN` put it. It is drawn AFTER the bands and BEFORE the
                    line, so the ink line stays crisp through the fade. */}
                {/**
                  * ⚠️ A MASK, NOT AN OVERLAY (v30, Phase 5) — ref `fadegrad` + `fademask`.
                  *
                  * The old form laid a card-coloured rect over the stack at up to 50% opacity. That
                  * is a WASH: it tints every band toward the paper, so the fills lose their identity
                  * before they lose their weight, and at the foot the three colours converge on one.
                  * A mask removes the band instead of covering it, so what shows through at the
                  * baseline is the card itself and the colours stay themselves all the way down.
                  *
                  * ⚠️ `userSpaceOnUse`, FROM THE PLOT TOP TO `y(0)`. In the default objectBounding
                  * box the gradient would resolve against each masked shape's own bbox, so the three
                  * bands — which have three different heights — would each fade over their own
                  * extent and the fade would step at every band boundary. The whole point is one
                  * gradient over the plot.
                  *
                  * ⚠️ AND ONLY THE BANDS ARE MASKED. The line, the markers and the axis sit outside
                  * the group, so the ink stays at full strength through a fade that is doing its
                  * work behind it — which is what the overlay could not do, because a rect painted
                  * over everything beneath it.
                  */}
                <defs>
                  <linearGradient
                    id="os-fadegrad" gradientUnits="userSpaceOnUse"
                    x1={0} x2={0} y1={0} y2={chartY(0, H, lo, hi)}
                  >
                    <stop offset="0" stopColor="#ffffff" />
                    <stop offset="0.55" stopColor="#e8e8e8" />
                    <stop offset="1" stopColor="#4d4d4d" />
                  </linearGradient>
                  <mask id="os-fademask" maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={chartY(0, H, lo, hi)}>
                    <rect x={0} y={0} width={W} height={chartY(0, H, lo, hi)} fill="url(#os-fadegrad)" />
                  </mask>
                </defs>
                <g mask="url(#os-fademask)">
                {bandAreas.map((a, i) => (
                  <path
                    key={a.key}
                    className="os-band"
                    d={a.d}
                    fill={STATE_TOKEN[a.key]}
                    /* ⚠️ THE LINE STEP, NOT THE DEEP ONE, AND 1.2px (v27, Phase 6). With the fade
                       over the stack the `-deep` borders stopped separating two adjacent fills of
                       similar value — at 1710 the sand read and the other two did not. Still a
                       token keyed the same as the fill, so the two cannot fall out of step. */
                    /**
                     * ⚠️ THE TOPMOST BAND DOES NOT STROKE (v30, Phase 6). `bandAreas` is painted
                     * back to front, so index 0 is the WIDEST stack — its upper edge is the total,
                     * which the ink line already draws. Two strokes on one boundary is what makes a
                     * sliver possible at any subpixel offset, and the two have different joins: the
                     * line is round, a band's is miter, so at a sharp peak the thinner band stroke
                     * can spike past the thicker line's cap. Nothing was measured escaping — this
                     * removes the possibility rather than re-arguing the measurement.
                     *
                     * The bands beneath keep theirs, because THEIR upper edge is an internal
                     * boundary that nothing else draws.
                     */
                    stroke={i === 0 ? "none" : STATE_LINE_TOKEN[a.key]}
                    strokeWidth={i === 0 ? undefined : 1.2}
                  />
                ))}
                </g>
                {/* ⚠️ THE OVERLAY RECT IS DELETED WITH THE MECHANISM IT WAS (v30, Phase 5). It was correct —
                    it stopped at `chartY(0)` and v29 proved that at the pixels — and it is gone
                    anyway, because a rect painted OVER the bands is a wash rather than a fade. The
                    mask above does the same job by removing the band instead of tinting it. Its
                    rules go with it: nothing declares `os-bandfade` any more. */}
                {/* ⚠️ INK, NOT SAGE. The line was sage over a sage band and read as the band's own
                    edge; in ink it is unambiguously a different kind of mark — the total, over the
                    parts. It is the stack's own top edge, so it can never disagree with it. */}
                <path ref={lineRef} d={path} fill="none" stroke="#1c130f" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                {/* ⚠️ THE EVENT PINS ARE GONE (refdiff pass, Phase 5). Two of them — "First
                    request" and "First full" — were milestones the chart could only ever say once,
                    and they hung burgundy rings over a line whose whole job is the shape of the
                    stock. The offer pins said what the slate band now says continuously. What is
                    left is one mark: where the line ends. */}
                {/* ⚠️ ONE RESTING NODE — THE LATEST (audit P5). A node at every point was
                    defended as showing how many readings the line is drawn from; at daily grain
                    over a long range that is hundreds of rings, and the LINE stops being readable
                    — the thing they were meant to support. The latest point keeps its mark
                    because it anchors "where we are now"; hover and the crosshair carry the rest.

                    ⚠️ THE KEYBOARD NODE IS NOT A HOVER NODE. Arrow-key stepping renders its own
                    focus mark just below, so the chart stays fully operable with no pointer. */}
                {/**
                  * ⚠️ THE START MARK (v31, Phase 2) — ref: a stalk from the first point up to a
                  * burgundy ring with a dot in it. The app had only the END node, and the pixel
                  * comparison this pass built is what surfaced it: the ref's ring sat in the diff as
                  * a difference nobody had ever been in a position to see.
                  *
                  * ⚠️ IT IS NOT A REINSTATEMENT OF THE EVENT PINS. Those were milestones the chart
                  * could say only once and they hung over the line's whole length; this is one mark
                  * saying where the RANGE begins, which is the counterpart of the node that says
                  * where it ends. The two together are what make the line's extent readable without
                  * reading the axis.
                  */}
                {pts[0] && (
                  <g className="os-startmark" aria-hidden="true">
                    <line
                      x1={pts[0][0].toFixed(1)} x2={pts[0][0].toFixed(1)}
                      y1={pts[0][1].toFixed(1)} y2={(pts[0][1] - 20).toFixed(1)}
                      stroke="#c9b8a6" strokeWidth={1.2}
                    />
                    <circle cx={pts[0][0].toFixed(1)} cy={(pts[0][1] - 24).toFixed(1)} r={6} fill="#f5e2da" stroke="#7c3a2a" strokeWidth={1.4} />
                    <circle cx={pts[0][0].toFixed(1)} cy={(pts[0][1] - 24).toFixed(1)} r={1.8} fill="#7c3a2a" />
                  </g>
                )}
                {lastIdx >= 0 && pts[lastIdx] && (
                  <circle
                    cx={pts[lastIdx][0].toFixed(1)} cy={pts[lastIdx][1].toFixed(1)}
                    /* ⚠️ INK, NOT SAGE (v30, Phase 6). The node marks where the ink line ends, so its ring is the
                       line's own colour — a sage ring on a black line is a second mark claiming to be
                       part of the first. It is also what a pixel sweep above the line kept finding: the
                       only non-card colour up there was this ring, correctly drawn, at the one x where
                       it sits. Matching the line removes the question. */
                    r={4} fill="#fdfaf5" stroke="#1c130f" strokeWidth={2}
                  />
                )}
                {/* crosshair + black node while a week is focused */}
                {focusIdx >= 0 && (
                  <>
                    <line x1={chartX(focusIdx, W, view.length)} x2={chartX(focusIdx, W, view.length)} y1={4} y2={H - 3} stroke="#c9a89e" strokeWidth={1.1} strokeDasharray="3 5" />
                    <circle cx={chartX(focusIdx, W, view.length)} cy={chartY(total[focusIdx] ?? 0, H, lo, hi)} r={5} fill="#fdfaf5" stroke="#241811" strokeWidth={2} />
                  </>
                )}
              </>
            )}
          </svg>
        )}
        {/* ⚠️ INSIDE THE PLOT'S BOX — see `PADY`. The ref draws its period labels in the band its
            own viewBox reserves below the baseline, so the plot and its scale are one box and the
            card's height is that one ratio. */}
        <div className="os-xlabels">
          {view.map((w, i) =>
            (i % every === 0 || i === lastIdx)
              ? <span key={w.start.toISOString()} className={i === lastIdx ? "now" : undefined}>{w.label}</span>
              : null,
          )}
        </div>
      </div>
      </div>

      {/* §3: the keyboard walk narrates here */}
      <div className="os-sr" aria-live="polite">{liveText}</div>

      {/* ── the Form 11 popup: a week, or a pin ── */}
      {/* ⚠️ THREE ENTRIES, AND THE COUNT IS FIXED (ref v16, Phase 5). A fourth band and its
          "Offer or undecided" swatch were built here twice and cut twice; the chart is the three
          bands the design names, and the legend names exactly those. `STATE_TOKEN.offer` is still
          the Query Centre's and the ticket edge's — it is simply not a band. */}
      {/* ⚠️ THE LEGEND IS REMOVED (v26, Phase 5). Four swatches naming four bands, permanently,
          under a chart whose bands are already labelled where the reader is looking — the tooltip
          names them on hover and the strip names them on every bubble. It cost 39.6px at every
          width, which was the whole of the top row's overshoot once the height law landed: a
          constant miss is the tell for an element rather than a value. `STATE_TOKEN` still owns
          the colours; nothing about the bands changed. */}
      <ChartTip anchor={tipAnchor}>
        {focusedWeek ? (
          <div className="frame">
            <div className="fhdr"><span className="wkl">{periodLabel(effFreq, focusedWeek.label)}</span><span className="big">{focusedWeek.active}</span></div>
            <div className="fbd">
              <div className="flowrow">
                <div className="fc"><div className="fv">{focusedWeek.sent}</div><div className="fl">Sent</div></div>
                <div className="fc"><div className="fv">{focusedWeek.closed}</div><div className="fl">Closed</div></div>
                {(() => {
                  const net = focusedWeek.sent - focusedWeek.closed;
                  return (
                    <div className="fc">
                      <div className={`fv ${net > 0 ? "net" : net < 0 ? "netdn" : "none"}`}>{net === 0 ? "—" : `${net > 0 ? "+" : ""}${net}`}</div>
                      <div className="fl">Net</div>
                    </div>
                  );
                })()}
              </div>
              <div className="fsep" />
              {/**
                * ⚠️ TWO DIFFERENT BLOCKS, AND WHICH ONE YOU GET IS A STATEMENT ABOUT WHAT IS KNOWN.
                *
                * On any PAST point the panel states the three bands — whose turn it was — because
                * that is what the dated rungs can answer about a past instant. On the FINAL point it
                * states the full per-status standing instead, because "now" is the one moment at
                * which a query's exact status is known rather than reconstructed.
                *
                * The old panel showed the per-status list at every point under the caption "Where
                * they stand today", which was honest and answered a question nobody asked while
                * hovering a week in March. The bands answer the question the hover is actually
                * making.
                */}
              {focusIdx === lastIdx ? (
                <>
                  <div className="fcap">Where they stand today</div>
                  {stages.map((s) => (
                    <div key={s.status} className={`srow${s.count === 0 ? " dim" : ""}`}>
                      <StatusDot status={s.status} overrideSize={12} ghost={s.count === 0} decorative />
                      <span className="nm">{STAGE_SHORT[s.status] ?? s.label}</span>
                      <span className="ct">{s.count}</span>
                    </div>
                  ))}
                  {activeTotal === 0 && <div className="fl" style={{ marginTop: 4 }}>Nothing in flight</div>}
                </>
              ) : (
                <>
                  <div className="fcap">By whose turn</div>
                  {BAND_KEYS.map((k) => {
                    const n = focusBand ? focusBand[k] : 0;
                    return (
                      <div key={k} className={`srow${n === 0 ? " dim" : ""}`}>
                        <i className="bsw" style={{ background: STATE_TOKEN[k] }} aria-hidden="true" />
                        <span className="nm">{BAND_LABEL[k]}</span>
                        <span className="ct">{n}</span>
                      </div>
                    );
                  })}
                  {/* ⚠️ THE SHORTFALL IS NAMED, NEVER ABSORBED. The three bands can be fewer than the
                      headline when a revision's flip crossed a band with no date on it; saying so is
                      the difference between a chart that reports and one that quietly rounds. */}
                  {focusBand && focusBand.undated > 0 && (
                    <div className="fl" style={{ marginTop: 5 }}>
                      {focusBand.undated} not placed — no date on record for the change
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : null}
      </ChartTip>
    </OneScreenPanel>
  );
};
