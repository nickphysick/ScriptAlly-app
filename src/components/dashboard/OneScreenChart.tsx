/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenChart — the active-queries card (stage 3, 17 Sep; v16, 18 Sep).
 *
 * The mount construction: a parchment rim with a real frame inside it, holding a title, a mono
 * eyebrow, the grain chip, a legend, one navy line over a fading fill, and a tick per week beneath the
 * axis labels — rose on a week a request came in.
 *
 * ⚠️ ONE GRAIN — WEEKLY (Nick, 18 Sep). The Daily/Monthly toggle is retired; `dashChart.CHART_GRAIN`
 * is what the card reads, and the chip states the grain rather than offering a menu with one item in
 * it. A control that opens onto a single choice teaches a reader that the app is broken.
 *
 * ⚠️ THE HEADER KEEPS ITS FLEX ROW WITH NO PICTURE IN IT (Nick, 18 Sep). The hawk came off with v16
 * and the row is still `.os-acid` — a 96px slot can return beside the count without anything else
 * moving. `lib/dashArt` still carries the file for exactly that.
 *
 * ⚠️ THE HEADLINE FIGURE IS THE HEADER'S, HANDED DOWN — `dashBreakdown.liveCount` over the same scoped
 * set. The line is the ledger's `active` stock; the two agree for every query on the board, which is
 * the only kind either counts.
 *
 * ⚠️ REAL PIXEL COORDINATES: the viewBox always equals the measured box, so nothing is stretched and a
 * dot is a circle rather than an ellipse. The box is measured by a CALLBACK REF, never a mount-once
 * effect — an early return above the wrapper once left the chart unmeasured, and blank, for every
 * account. `preserveAspectRatio="none"` and `vector-effect="non-scaling-stroke"` are the ref's, and
 * are no-ops while the two boxes agree: they are the guarantee that the day they stop agreeing the
 * stroke does not thicken and the drawing does not distort.
 */
import React, { useCallback, useMemo, useState } from "react";
import type { Activity, Query } from "../../types";
import { dailyLedger } from "../../lib/oneScreen";
import {
  CHART_GRAIN, CHART_WINDOW, chartDelta, chartEventDots, chartEyebrow, chartGeometry, chartView,
  eventDotPositions, requestWeeks, xLabelEvery, xLabelIndexes,
} from "../../lib/dashChart";
import { OneScreenChartEmpty } from "./OneScreenChartEmpty";
import { OneScreenPanel } from "./OneScreenPanel";

/** The legend, in the order the ref draws it. The fills are the sheet's. */
const LEGEND = [
  { key: "active", label: "Active" },
  { key: "request", label: "Request" },
  { key: "pass", label: "Pass" },
] as const;

export const OneScreenChart: React.FC<{
  loading: boolean;
  /** the manuscript-scoped queries */
  queries: Query[];
  /** the manuscript-scoped activity log — the event dots come from here */
  activities: Activity[];
  /** the live count, the header's own figure; null while loading */
  activeCount: number | null;
  now: Date;
  /**
   * ⚠️ THE PAGE'S ZERO-QUERY BRANCH (empty-states pack, Phase 1) — the card keeps its box and shows
   * the first-run panel instead of a chart of nothing.
   */
  empty?: boolean;
  onSendFirst?: () => void;
}> = ({ loading, queries, activities, activeCount, now, empty = false, onSendFirst }) => {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  const daily = useMemo(() => dailyLedger(queries, now), [queries, now]);
  const view = useMemo(() => chartView(daily, CHART_GRAIN), [daily]);
  const values = useMemo(() => view.map((p) => p.active), [view]);
  const delta = useMemo(() => chartDelta(daily, CHART_GRAIN), [daily]);
  const dots = useMemo(() => chartEventDots(view, activities), [view, activities]);
  const hot = useMemo(() => requestWeeks(dots), [dots]);

  const wrapRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return undefined;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width && r.height) setSize({ w: Math.round(r.width), h: Math.round(r.height) });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const W = size?.w ?? 0, H = size?.h ?? 0;
  const sparse = view.length < 2;
  const geo = useMemo(() => (W > 0 && H > 0 && !sparse ? chartGeometry(values, W, H) : null), [values, W, H, sparse]);
  const placed = useMemo(() => (geo ? eventDotPositions(dots, values, W, H, geo.top) : []), [geo, dots, values, W, H]);
  /* ⚠️ EVERY WEEK KEEPS ITS TICK; ONLY THE WORDS THIN OUT. The ticks are the axis — one per point,
     in the ref's flex slots — and at 1280 nine dates will not fit in a 300px card, so the labels are
     thinned by the same derivation the stage-3 chart used and the ticks stay put. */
  const every = xLabelEvery(view.length, CHART_GRAIN, W > 0 ? W : undefined);
  const labelled = useMemo(() => new Set(xLabelIndexes(view.length, every)), [view.length, every]);
  const lastIdx = view.length - 1;

  const head = (
    <div className="os-achead" data-probe="chart-header">
      {/* ⚠️ THE SLOT THE PICTURE WILL COME BACK TO — see the file's header. */}
      <div className="os-acid">
        <div className="os-acstat">
          <h3 className="os-cardttl" data-probe-text="chart-title">Active queries</h3>
          <p className="os-sub" data-probe-text="chart-eyebrow">
            {loading ? "" : chartEyebrow(activeCount, delta).split(" · ").map((clause, i) => (
              <React.Fragment key={i}>{i > 0 && " · "}<span className="os-subc">{clause}</span></React.Fragment>
            ))}
          </p>
        </div>
      </div>
      <span className="os-mini" data-probe="chart-controls">Weekly</span>
    </div>
  );

  if (empty) {
    return (
      <OneScreenPanel variant="os-lead" probe="chart-card" loading={loading} skel={["h", "grow", ""]} lift={false}>
        <div className="os-acframe">
          <OneScreenChartEmpty onLogFirst={onSendFirst} />
        </div>
      </OneScreenPanel>
    );
  }

  const first = geo?.points[0];
  const last = geo?.points[lastIdx];
  const summary = view.length >= 2
    ? `Active queries over the last ${CHART_WINDOW[CHART_GRAIN].label}: ${values[0]} to ${values[lastIdx]}.`
    : "Active queries over time.";

  return (
    <OneScreenPanel variant="os-lead" probe="chart-card" loading={loading} skel={["h", "grow", ""]} lift={false}>
      <div className="os-acframe">
        {head}
        <div className="os-aclegend" aria-hidden="true">
          {LEGEND.map((l) => (
            <span key={l.key} className="os-aclg"><i className={`os-aclgd os-aclgd--${l.key}`} />{l.label}</span>
          ))}
        </div>

        <div className="os-acbody">
          <div className="os-acplot" ref={wrapRef}>
            {sparse ? (
              <div className="os-sparse on">
                <span>The line begins once there are two weeks on the record.</span>
              </div>
            ) : (
              <svg
                data-probe="plot"
                /* ⚠️ INSTRUMENTATION, NOT AN API — the harness reads what was drawn from here. */
                data-series={JSON.stringify({ v: values, lab: view.map((p) => p.label), every, dots })}
                width={W || undefined}
                height={H || undefined}
                viewBox={W && H ? `0 0 ${W} ${H}` : undefined}
                preserveAspectRatio="none"
                role="img"
                aria-label={summary}
              >
                {geo && (
                  <>
                    <defs>
                      <linearGradient id="os-acfade" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#2a3a52" stopOpacity="0.22" />
                        <stop offset="1" stopColor="#2a3a52" stopOpacity="0" />
                      </linearGradient>
                      {/* ⚠️ THE REF'S HATCH AT THE REF'S RENDERED DENSITY, NOT ITS VIEWBOX NUMBERS. It
                          draws 3 units of ink every 8 in a 900-unit box stretched to about 448px, which
                          is ~1.5px of ink every 4px on screen; drawn at 3-in-8 REAL pixels the same rule
                          is twice as coarse and reads as a striped block rather than as tone. */}
                      <pattern id="os-acbars" width="4" height={H} patternUnits="userSpaceOnUse">
                        <rect x="0" y="0" width="1.5" height={H} fill="#2a3a52" opacity="0.07" />
                      </pattern>
                    </defs>
                    {geo.gridY.map((y, i) => (
                      <line key={i} className="os-acgrid" x1={0} x2={W} y1={y.toFixed(1)} y2={y.toFixed(1)} />
                    ))}
                    <path className="os-acbars" d={geo.area} fill="url(#os-acbars)" />
                    <path className="os-acarea" d={geo.area} fill="url(#os-acfade)" />
                    <path
                      className="os-acline" d={geo.line} fill="none"
                      stroke="#2a3a52" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                    {first && (
                      <circle className="os-acfirst" cx={first[0].toFixed(1)} cy={first[1].toFixed(1)} r={4} fill="#ffffff" stroke="#2a3a52" strokeWidth={2} />
                    )}
                    {last && (
                      <circle className="os-aclast" cx={last[0].toFixed(1)} cy={last[1].toFixed(1)} r={5} fill="#2a3a52" />
                    )}
                    {placed.map((d) => (
                      <g key={`${d.idx}-${d.kind}`} className={`os-acev os-acev--${d.kind}`} data-probe="chart-event" data-kind={d.kind}>
                        <circle cx={d.x.toFixed(1)} cy={d.y.toFixed(1)} r={7} strokeWidth={2.5} />
                        <circle className="os-acevc" cx={d.x.toFixed(1)} cy={d.y.toFixed(1)} r={2.8} />
                      </g>
                    ))}
                  </>
                )}
              </svg>
            )}
          </div>
          {/* ⚠️ ONE SLOT PER WEEK, FLEX-DISTRIBUTED — the ref's axis. The tick is the slot's own
              `::before`, so it cannot drift from the label it belongs to. */}
          <div className="os-acx" aria-hidden="true">
            {view.map((p, i) => (
              <span key={p.start.toISOString()} className={hot.has(i) ? "hot" : undefined}>
                {labelled.has(i) ? p.label : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    </OneScreenPanel>
  );
};
