/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenChart — the active-queries chart card (dashboard stage 3, 17 Sep).
 *
 * A header — the hawk, the live count beside "active queries", and a caption saying how far the count
 * moved and how many replies came in — over one navy line with a fade beneath it, three gridlines, a
 * hollow dot where the window opens and a solid one where it ends, and a dot on the line wherever a
 * request came in or a query was passed on.
 *
 * ⚠️ RETIRED WITH THE PREVIOUS CHART, AND NOT COMING BACK THROUGH THIS FILE: the stacked state bands,
 * the range brush, the hover and keyboard readouts, the start-mark stalk and the draw-in. The window is
 * fixed per grain — 8 weeks for Daily and Weekly, 12 months for Monthly (`dashChart.CHART_WINDOW`).
 *
 * ⚠️ THE HEADLINE IS THE HEADER'S FIGURE, HANDED DOWN — `dashBreakdown.liveCount` over the same scoped
 * set. The line is the ledger's `active` stock; the two agree for every query on the board, which is
 * the only kind either counts.
 *
 * ⚠️ REAL PIXEL COORDINATES (§3): the viewBox always equals the measured box, so a stroke is never
 * stretched. The box is measured by a CALLBACK REF, never a mount-once effect — an early return above
 * the wrapper once left the chart unmeasured, and blank, for every account (see the v35 note in git).
 */
import React, { useCallback, useMemo, useState } from "react";
import type { Activity, Query } from "../../types";
import { dailyLedger, defaultFreq, type Freq } from "../../lib/oneScreen";
import {
  CHART_WINDOW, chartCaption, chartDelta, chartEventDots, chartGeometry, chartView, eventDotPositions,
  repliesInWindow, xLabelEvery, xLabelIndexes, plotX,
} from "../../lib/dashChart";
import { ACTIVE_QUERY_ART, artUrl } from "../../lib/dashArt";
import { OneScreenChartEmpty } from "./OneScreenChartEmpty";
import { OneScreenPanel } from "./OneScreenPanel";

export const CHART_FREQS: readonly Freq[] = ["daily", "weekly", "monthly"];
const FREQ_LABEL: Record<Freq, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" };
const FREQ_UNIT: Record<Freq, string> = { daily: "days", weekly: "weeks", monthly: "months" };

export const OneScreenChart: React.FC<{
  loading: boolean;
  /** the manuscript-scoped queries */
  queries: Query[];
  /** the manuscript-scoped activity log — the event dots and the replies come from here */
  activities: Activity[];
  /** the live count, the header's own figure; null while loading */
  activeCount: number | null;
  now: Date;
  /**
   * ⚠️ THE PAGE'S ZERO-QUERY BRANCH (empty-states pack, Phase 1) — the card keeps its box and shows the
   * first-run panel instead of a chart of nothing.
   */
  empty?: boolean;
  onSendFirst?: () => void;
}> = ({ loading, queries, activities, activeCount, now, empty = false, onSendFirst }) => {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  /* ⚠️ A NEW ACCOUNT OPENS ON DAILY — under a month of record makes a two-point weekly line. Once a
     grain is chosen by hand, the choice stands. */
  const [freq, setFreq] = useState<Freq | null>(null);

  const daily = useMemo(() => dailyLedger(queries, now), [queries, now]);
  const effFreq: Freq = freq ?? defaultFreq(daily);
  const view = useMemo(() => chartView(daily, effFreq), [daily, effFreq]);
  const values = useMemo(() => view.map((p) => p.active), [view]);
  const delta = useMemo(() => chartDelta(daily, effFreq), [daily, effFreq]);
  const replies = useMemo(() => repliesInWindow(queries, activities, effFreq, now), [queries, activities, effFreq, now]);
  const dots = useMemo(() => chartEventDots(view, activities), [view, activities]);

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
  const every = xLabelEvery(view.length, effFreq, W > 0 ? W : undefined);
  const labelled = useMemo(() => new Set(xLabelIndexes(view.length, every)), [view.length, every]);
  const lastIdx = view.length - 1;

  if (empty) {
    return (
      <OneScreenPanel variant="os-lead" probe="chart-card" loading={loading} skel={["h", "grow", ""]} lift={false}>
        <OneScreenChartEmpty onLogFirst={onSendFirst} />
      </OneScreenPanel>
    );
  }

  const first = geo?.points[0];
  const last = geo?.points[lastIdx];
  const summary = view.length >= 2
    ? `Active queries over the last ${CHART_WINDOW[effFreq].label}: ${values[0]} to ${values[lastIdx]}.`
    : "Active queries over time.";

  return (
    <OneScreenPanel variant="os-lead" probe="chart-card" loading={loading} skel={["h", "grow", ""]} lift={false}>
      <div className="os-achead" data-probe="chart-header">
        <div className="os-acid">
          <img
            className="os-acart"
            src={artUrl(ACTIVE_QUERY_ART)}
            width={ACTIVE_QUERY_ART.width}
            height={ACTIVE_QUERY_ART.height}
            alt=""
            decoding="async"
            data-probe="chart-illustration"
          />
          <div className="os-acstat">
            <div className="os-acrow">
              <span className="os-acn" data-probe-text="chart-figure">
                {loading || activeCount === null ? "" : activeCount.toLocaleString("en-GB")}
              </span>
              <span className="os-acttl" data-probe-text="chart-title">active queries</span>
            </div>
            {/* the caption's clauses never break inside themselves — only between them */}
            <span className="os-acdelta" data-probe-text="chart-caption">
              {loading ? "" : chartCaption(delta, replies, effFreq).split(" · ").map((clause, i) => (
                <React.Fragment key={i}>{i > 0 && " · "}<span className="os-acdc">{clause}</span></React.Fragment>
              ))}
            </span>
          </div>
        </div>
        <div className="os-actog" role="group" aria-label="Chart frequency" data-probe="chart-controls">
          {CHART_FREQS.map((f) => (
            <button
              key={f}
              type="button"
              className={effFreq === f ? "on" : undefined}
              aria-pressed={effFreq === f}
              onClick={() => setFreq(f)}
            >
              {FREQ_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      <div className="os-acbody">
        <div className="os-acplot" ref={wrapRef}>
          {sparse ? (
            <div className="os-sparse on">
              <span>The line begins once there are two {FREQ_UNIT[effFreq]} on the record.</span>
            </div>
          ) : (
            <svg
              data-probe="plot"
              /* ⚠️ INSTRUMENTATION, NOT AN API — the harness reads what was drawn from here. */
              data-series={JSON.stringify({ v: values, lab: view.map((p) => p.label), every, dots })}
              width={W || undefined}
              height={H || undefined}
              viewBox={W && H ? `0 0 ${W} ${H}` : undefined}
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
                  </defs>
                  {geo.gridY.map((y, i) => (
                    <line key={i} className="os-acgrid" x1={0} x2={W} y1={y.toFixed(1)} y2={y.toFixed(1)} />
                  ))}
                  <path className="os-acarea" d={geo.area} fill="url(#os-acfade)" />
                  <path
                    className="os-acline" d={geo.line} fill="none"
                    stroke="#2a3a52" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
                  />
                  {first && (
                    <circle className="os-acfirst" cx={first[0].toFixed(1)} cy={first[1].toFixed(1)} r={4} fill="#ffffff" stroke="#2a3a52" strokeWidth={2} />
                  )}
                  {last && (
                    <circle className="os-aclast" cx={last[0].toFixed(1)} cy={last[1].toFixed(1)} r={4.5} fill="#2a3a52" />
                  )}
                  {placed.map((d) => (
                    <g key={`${d.idx}-${d.kind}`} className={`os-acev os-acev--${d.kind}`} data-probe="chart-event" data-kind={d.kind}>
                      <circle cx={d.x.toFixed(1)} cy={d.y.toFixed(1)} r={6} strokeWidth={2} />
                      <circle className="os-acevc" cx={d.x.toFixed(1)} cy={d.y.toFixed(1)} r={2.2} />
                    </g>
                  ))}
                </>
              )}
            </svg>
          )}
        </div>
        {/* the x labels sit under the plot at the points' own x, thinned as the points multiply */}
        <div className="os-acx" aria-hidden="true">
          {W > 0 && view.map((p, i) =>
            labelled.has(i)
              ? (
                <span
                  key={p.start.toISOString()}
                  className={i === 0 ? "first" : i === lastIdx ? "last" : undefined}
                  style={{ left: `${((plotX(i, W, view.length) / W) * 100).toFixed(3)}%` }}
                >
                  {p.label}
                </span>
              )
              : null,
          )}
        </div>
      </div>
    </OneScreenPanel>
  );
};
