/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Queries still out" — every open query placed against ITS OWN agency's stated window.
 *
 * ⚠️ THE AXIS IS THE WINDOW, NOT THE CALENDAR, and that is the whole idea. Twenty-eight days is a
 * full window at an agency that says four weeks and a quarter of one at an agency that says twelve;
 * a days-elapsed axis would draw those two identically and invite the writer to chase the wrong
 * one. Normalising means a dot's position answers the question they actually have — is this one
 * late — rather than the question the calendar answers.
 *
 * ⚠️ A QUERY WHOSE AGENT STATES NO WINDOW HAS NO POSITION ON THIS AXIS, and the panel says how many
 * there are rather than dropping them quietly. A chart that silently omits a third of what is out
 * reads as though everything out is on it.
 *
 * ⚠️ NOTHING HERE IS AN ALARM. Past the window the dot takes a heavier edge and a deeper fill —
 * weight, not red. An agency running past its own stated window is extremely ordinary, and a page
 * that flags it in warning colours is telling the writer to worry about something they cannot
 * affect.
 */
import React from "react";
import { AnalyticsRow, agingSet, CHART } from "../../lib/analytics";
import { shortDate, useChartTip, useMeasuredWidth } from "./chartPlumbing";

const MIN_H = 200;
const PAD_L = 26;
const PAD_R = 20;
const PAD_T = 18;
const PAD_B = 26;
/** The axis runs a little past the window, so a late query still has somewhere to sit. */
const MAX_FRACTION = 1.4;
/** Below this gap two dots would touch, so the later one takes the next lane up. */
const LANE_GAP = 26;
const LANE_H = 30;
/** The first lane's height above the axis. */
const LANE_BASE = 22;
/**
 * ⚠️ THE CHART GROWS TO ITS LANES, AND THIS CAP IS WHERE IT STOPS.
 *
 * ⚠️ FOUND ON REAL DATA, NOT REASONED ABOUT. Every query past its window clamps to the same x at
 * the right-hand end of the axis, so on the dev account SIX of seven landed in one column and the
 * lane stack ran off the top of a fixed 200px plot — dots drawn at cy 2 with a radius of 9, half
 * of them clipped away. The chart looked broken and the data was fine.
 */
const MAX_LANES = 8;

export const AgingChart: React.FC<{ rows: AnalyticsRow[] }> = ({ rows }) => {
  const [ref, W] = useMeasuredWidth(620);
  const tip = useChartTip();
  const set = agingSet(rows);

  if (set.points.length === 0) {
    return (
      <div className="an-emptystate">
        <p>
          {set.withoutStatedWindow > 0
            ? `Nothing to place — the ${set.withoutStatedWindow} ${set.withoutStatedWindow === 1 ? "query" : "queries"} still out ${set.withoutStatedWindow === 1 ? "is" : "are"} with ${set.withoutStatedWindow === 1 ? "an agency that states" : "agencies that state"} no reply window.`
            : "Nothing is waiting on an agent in this period. Queries appear here while they are out."}
        </p>
      </div>
    );
  }

  const plotW = W - PAD_L - PAD_R;
  const x = (f: number) => PAD_L + plotW * (Math.min(f, MAX_FRACTION) / MAX_FRACTION);

  /* ⚠️ LANES ARE ASSIGNED BEFORE THE HEIGHT IS KNOWN, because the height depends on them. A dot
     too close to the last one in a lane goes up a lane; the deepest lane sets the chart. */
  const laneRight: number[] = [];
  const laned = set.points.map((p) => {
    const px = x(p.fraction);
    let lane = 0;
    while (laneRight[lane] !== undefined && px - laneRight[lane] < LANE_GAP) lane++;
    laneRight[lane] = px;
    return { ...p, px, lane };
  });

  const shown = laned.filter((p) => p.lane < MAX_LANES);
  const overflow = laned.length - shown.length;
  const lanes = shown.reduce((n, p) => Math.max(n, p.lane + 1), 1);
  const H = Math.max(MIN_H, PAD_T + LANE_BASE + lanes * LANE_H + PAD_B);
  const baseY = H - PAD_B;
  const placed = shown.map((p) => ({ ...p, cy: baseY - LANE_BASE - p.lane * LANE_H }));

  const windowX = x(1);

  return (
    <>
      <div ref={ref} className="an-chartwrap">
        <svg className="an-chart" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`${set.points.length} open ${set.points.length === 1 ? "query" : "queries"} against each agency's stated reply window`}>
          <line x1={PAD_L} x2={W - PAD_R} y1={baseY} y2={baseY} stroke={CHART.grid} strokeWidth={1} />
          {[0, 0.25, 0.5, 0.75, 1, 1.25].map((f) => (
            <g key={f}>
              <line x1={x(f)} x2={x(f)} y1={baseY} y2={baseY + 4} stroke="#e0d5c8" strokeWidth={1} />
              <text x={x(f)} y={H - 8} textAnchor="middle" className="an-axis an-axis--big">
                {f === 0 ? "sent" : f === 1 ? "window" : `${Math.round(f * 100)}%`}
              </text>
            </g>
          ))}

          {/* the agency's own stated window, dashed — the one line every dot is read against */}
          <line x1={windowX} x2={windowX} y1={PAD_T - 4} y2={baseY} stroke="#9c8878" strokeWidth={1} strokeDasharray="3 4" />
          <text x={windowX} y={PAD_T - 8} textAnchor="middle" className="an-axis">STATED WINDOW</text>

          {placed.map((p) => (
            <g key={p.queryId} className="an-dotg"
              {...tip.bind({
                kicker: `${p.daysOut} days of a ${p.windowWeeks}-week window · ${Math.round(p.fraction * 100)}%`,
                headline: p.agentName,
                detail: `${p.agentSub ? `${p.agentSub} · ` : ""}sent ${shortDate(p.sentMs)}${p.pastWindow ? " · past the agency's stated window" : ""}`,
              })}>
              {/* a stem to the baseline, so a dot high in the lanes still reads against the axis */}
              <line x1={p.px} x2={p.px} y1={p.cy + 10} y2={baseY} stroke="#ece3d7" strokeWidth={1} />
              <circle
                cx={p.px}
                cy={p.cy}
                r={9}
                fill={p.pastWindow ? CHART.lateFill : CHART.dotFill}
                stroke={p.pastWindow ? CHART.lateEdge : CHART.dotEdge}
                strokeWidth={p.pastWindow ? CHART.lateEdgeWidth : CHART.dotEdgeWidth}
              />
              {/* a small arrow inside: this one is still travelling */}
              <path
                d={`M ${p.px - 3} ${p.cy} h6 M ${p.px + 1} ${p.cy - 2.4} l2.4 2.4 -2.4 2.4`}
                stroke={p.pastWindow ? CHART.lateEdge : CHART.dotEdge}
                strokeWidth={1.1}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          ))}
        </svg>
      </div>

      <div className="an-legend">
        <span className="an-leg"><span className="an-swc" />Awaiting a first response</span>
        <span className="an-leg"><span className="an-swl" />Each agency&rsquo;s own stated window</span>
      </div>

      {/* ⚠️ AND SO IS ANYTHING THE LANES COULD NOT HOLD — a dot silently absent from a chart about
          what is still out is the one omission this panel must never make. */}
      {overflow > 0 ? (
        <div className="an-guardnote">
          {overflow} more {overflow === 1 ? "query sits" : "queries sit"} at the same point on this
          axis and {overflow === 1 ? "is" : "are"} not drawn. The Query Centre lists all of them.
        </div>
      ) : null}

      {/* ⚠️ WHAT THE CHART CANNOT PLACE IS STATED, NOT DROPPED. */}
      {set.withoutStatedWindow > 0 ? (
        <div className="an-guardnote">
          {set.withoutStatedWindow} more {set.withoutStatedWindow === 1 ? "query is" : "queries are"}{" "}
          still out with {set.withoutStatedWindow === 1 ? "an agency that states" : "agencies that state"}{" "}
          no reply window, so {set.withoutStatedWindow === 1 ? "it has" : "they have"} no place on this
          axis. Adding a response time to those agents puts {set.withoutStatedWindow === 1 ? "it" : "them"} on it.
        </div>
      ) : null}

      {tip.node}
    </>
  );
};

/** The band note: how many are out, and how many are past their own agency's window. */
export function agingNote(rows: AnalyticsRow[]): string {
  const set = agingSet(rows);
  const placed = set.points.length;
  if (placed === 0) return set.withoutStatedWindow > 0 ? `${set.withoutStatedWindow} out · no stated windows` : "No open queries in this period";
  /* ⚠️ FACTUAL IN BOTH BRANCHES. "All within their agencies' stated windows" states where things
     are; it is not praise, and its opposite is not a warning. */
  const past = set.pastWindow
    ? `${set.pastWindow} past ${set.pastWindow === 1 ? "its agency's" : "their agencies'"} stated window`
    : "all within their agencies' stated windows";
  return `${placed} open · ${past}`;
}
