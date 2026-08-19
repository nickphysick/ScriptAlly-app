/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "How long replies take" — the distribution of waits that have actually finished.
 *
 * ⚠️ QUERY RESPONSES ONLY, AND THE PANEL SAYS SO IN ITS OWN FOOTNOTE. A full sits with an agent
 * for months as a matter of course; folding those in would drag the median for the thing the
 * writer is actually asking — how long a query takes to come back. The fulls have their own panel
 * and their own clock.
 *
 * ⚠️ AND AN UNANSWERED QUERY IS IN NO BUCKET. "Still waiting" is not a long wait that has
 * finished; counting it would make an unanswered query look like a slow answer, which is the
 * flattering error rather than the honest one.
 */
import React from "react";
import { AnalyticsRow, CHART, median, replyBuckets, REPLY_HISTOGRAM_NOTE } from "../../lib/analytics";
import { gridTicks, useChartTip, useMeasuredWidth } from "./chartPlumbing";

const H = 200;
const PAD_L = 26;
const PAD_R = 14;
const PAD_T = 12;
const PAD_B = 26;

export const ReplyHistogram: React.FC<{ rows: AnalyticsRow[] }> = ({ rows }) => {
  const [ref, W] = useMeasuredWidth(620);
  const tip = useChartTip();
  const buckets = replyBuckets(rows);
  const answered = buckets.reduce((n, b) => n + b.count, 0);

  if (answered === 0) {
    return (
      <div className="an-emptystate">
        <p>
          No replies have come back in this period yet. As agents respond, their waits gather here
          and the median settles.
        </p>
      </div>
    );
  }

  /* ⚠️ A FLOOR OF 3 ON THE AXIS. One response in one bucket would otherwise fill the plot to the
     ceiling, so a single reply and a dozen would draw the identical bar. */
  const maxV = Math.max(3, ...buckets.map((b) => b.count));
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const slot = plotW / buckets.length;
  const barW = Math.min(52, slot * 0.55);
  const baseY = PAD_T + plotH;

  return (
    <>
      <div ref={ref} className="an-chartwrap">
        <svg className="an-chart" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`How long ${answered} ${answered === 1 ? "reply" : "replies"} took, in six bands`}>
          {gridTicks(maxV, 3).map((t) => {
            const y = baseY - plotH * t.fraction;
            return (
              <g key={t.fraction}>
                <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke={CHART.grid} strokeWidth={1} />
                <text x={PAD_L - 8} y={y + 3} className="an-axis" textAnchor="end">{t.value}</text>
              </g>
            );
          })}
          {buckets.map((b, i) => {
            const cx = PAD_L + slot * i + slot / 2;
            const h = plotH * (b.count / maxV);
            const noun = `${b.count} ${b.count === 1 ? "response" : "responses"}`;
            return (
              <g key={b.label}>
                <rect
                  className="an-bar"
                  x={cx - barW / 2}
                  y={baseY - h}
                  width={barW}
                  height={h}
                  rx={4}
                  fill={CHART.resp}
                  {...tip.bind({ kicker: b.label, headline: `${noun} arrived in this window` })}
                />
                {/* ⚠️ THE COUNT SITS ABOVE ITS OWN BAR RATHER THAN ON A HOVER. A distribution is
                    read by comparing heights, and the figures are what make a near-tie legible. */}
                {b.count > 0 ? (
                  <text x={cx} y={baseY - h - 7} textAnchor="middle" className="an-barval">{b.count}</text>
                ) : null}
                <text x={cx} y={H - 8} textAnchor="middle" className="an-axis an-axis--big">{b.label}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="an-guardnote">{REPLY_HISTOGRAM_NOTE}</div>
      {tip.node}
    </>
  );
};

/** The band note: the median and the sample it came from, or that nothing has come back. */
export function histogramNote(rows: AnalyticsRow[]): string {
  const waits = rows.map((r) => r.replyDays).filter((d): d is number => d !== null);
  const med = median(waits);
  if (med === null) return "No responses yet in this period";
  return `Median wait: ${med} days · ${waits.length} ${waits.length === 1 ? "response" : "responses"}`;
}
