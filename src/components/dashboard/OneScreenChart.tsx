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
import { STATE_TOKEN, STATE_ACCENT_TOKEN } from "../../lib/queryCardFacts";
import { placeTooltip, Rect } from "../../lib/deskTooltip";
import {
  aggregateLedger, awaitingChip, dailyLedger, DEFAULT_RANGE_DAYS,
  defaultFreq, Freq, LedgerPoint, monotonePath, nearestStop, periodLabel, RANGE_STOPS, rangeChip,
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
  const path = useMemo(() => monotonePath(pts), [pts]);
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
    const areaTo = (vals: number[]) => {
      const top = monotonePath(vals.map((v, i2) => [bx(i2), by(v)] as [number, number]));
      return top ? `${top} L ${bx(n - 1).toFixed(1)} 34 L ${bx(0).toFixed(1)} 34 Z` : null;
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
  const bandAreas = useMemo(() => {
    if (sparse || !W || !H) return [] as { key: BandKey; d: string }[];
    const cum = (upTo: number) => view.map((_, i) => {
      const bp = bands[i];
      let n = 0;
      for (let k = 0; k <= upTo; k++) n += bp ? bp[BAND_KEYS[k]] : 0;
      return n;
    });
    const out: { key: BandKey; d: string }[] = [];
    const areaTo = (vals: number[]) => {
      const top = monotonePath(vals.map((v, i) => [chartX(i, W, view.length), chartY(v, H, lo, hi)] as [number, number]));
      return top
        ? `${top} L ${chartX(view.length - 1, W, view.length).toFixed(1)} ${H} L ${chartX(0, W, view.length).toFixed(1)} ${H} Z`
        : null;
    };
    /* back to front: the widest stack first, so each later fill covers the one beneath it */
    for (let k = BAND_KEYS.length - 1; k >= 0; k--) {
      const d = areaTo(cum(k));
      if (d) out.push({ key: BAND_KEYS[k], d });
    }
    return out;
  }, [bands, view, W, H, lo, hi, sparse]);
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
  const handleF = fractionFromWeeks(brushWeeks);
  const bwRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  const setFromPointer = useCallback((clientX: number) => {
    const el = bwRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width <= 0) return;
    setRangeDays(weeksFromFraction((clientX - r.left) / r.width) * 7);
    resetRead();
  }, [resetRead]);

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
      <div className="os-ahead">
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
        <div className="os-ctrls">
        <div className="os-freqsel">
          <select
            aria-label="Chart frequency"
            value={effFreq}
            onChange={(e) => { setFreq(e.target.value as Freq); resetRead(); }}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <span className="os-cv" aria-hidden="true">▾</span>
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
              e.currentTarget.setPointerCapture(e.pointerId);
              setFromPointer(e.clientX);
            }}
            onPointerMove={(e) => { if (dragging.current) setFromPointer(e.clientX); }}
            onPointerUp={(e) => {
              dragging.current = false;
              try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
            }}
            onPointerCancel={() => { dragging.current = false; }}
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
            <input
              type="range" min={BRUSH_WEEKS_MIN} max={BRUSH_WEEKS_MAX} step={1} value={brushWeeks}
              aria-label="Chart range in weeks"
              aria-valuetext={weeksLabel(brushWeeks)}
              onChange={(e) => { setRangeDays(Number(e.target.value) * 7); resetRead(); }}
            />
          </div>
          <span className="os-rangelbl">{weeksLabel(brushWeeks)}</span>
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
                <defs>
                  <linearGradient id="os-bandfade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fffdf9" stopOpacity="0" />
                    <stop offset="100%" stopColor="#fffdf9" stopOpacity="0.85" />
                  </linearGradient>
                </defs>
                {bandAreas.map((a) => (
                  <path
                    key={a.key}
                    className="os-band"
                    d={a.d}
                    fill={STATE_TOKEN[a.key]}
                    stroke={STATE_ACCENT_TOKEN[a.key]}
                    strokeWidth={1}
                  />
                ))}
                <rect x={0} y={0} width={W} height={chartY(0, H, lo, hi)} fill="url(#os-bandfade)" pointerEvents="none" />
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
                {lastIdx >= 0 && pts[lastIdx] && (
                  <circle
                    cx={pts[lastIdx][0].toFixed(1)} cy={pts[lastIdx][1].toFixed(1)}
                    r={4} fill="#fdfaf5" stroke="#8a9e88" strokeWidth={2}
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
