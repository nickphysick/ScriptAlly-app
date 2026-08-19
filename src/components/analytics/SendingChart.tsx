/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Sending and hearing back" — queries out and replies in, by month, with the fulls and offers
 * marked where they arrived.
 *
 * ⚠️ TWO BARS PER MONTH, NOT A STACK. Sent and received are not parts of a whole — a reply that
 * lands in August belongs to a query sent in May — so stacking them would draw a total that means
 * nothing. Side by side they can be read against each other, which is the actual question.
 *
 * ⚠️ WARM IS OUTGOING, SAGE IS INCOMING, and that holds across every chart on the page. The sent
 * bar is outlined rather than solid because it is the writer's own act; the reply is solid because
 * it arrived.
 *
 * ⚠️ THE EVENT MARKS ARE PINNED TO THE MONTH THE THING ARRIVED, NOT THE MONTH THE QUERY WENT OUT.
 * A full requested in July off a query sent in March is a July event; drawing it in March would
 * put the good news before it happened.
 */
import React from "react";
import {
  AnalyticsRange,
  AnalyticsRow,
  CHART,
  eventMarks,
  monthLabel,
  monthYear,
  monthlySeries,
} from "../../lib/analytics";
import { gridTicks, shortDate, useChartTip, useMeasuredWidth } from "./chartPlumbing";

const H = 240;
const PAD_L = 30;
const PAD_R = 14;
const PAD_T = 14;
const PAD_B = 28;

export const SendingChart: React.FC<{
  rows: AnalyticsRow[];
  range: AnalyticsRange;
  nowMs: number;
}> = ({ rows, range, nowMs }) => {
  const [ref, W] = useMeasuredWidth(860);
  const tip = useChartTip();

  const series = monthlySeries(rows, range, nowMs);
  const marks = eventMarks(rows).filter((m) => series.months.includes(m.monthKey));

  /* ⚠️ THE AXIS NEVER TOPS OUT BELOW 4. A single query in a month would otherwise fill the plot to
     the ceiling, so one send and twelve sends would draw the identical bar. */
  const maxV = Math.max(4, ...series.sent, ...series.received);
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const slot = plotW / Math.max(1, series.months.length);
  const barW = Math.min(26, slot * 0.28);
  const baseY = PAD_T + plotH;

  /* how many marks already sit in each month, so a second one stacks above the first */
  const stack = new Map<number, number>();

  return (
    <>
      <div ref={ref} className="an-chartwrap">
        <svg className="an-chart" height={H} viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Queries sent and responses received by month, ${series.months.length} months`}>
          {gridTicks(maxV, 4).map((t) => {
            const y = baseY - plotH * t.fraction;
            return (
              <g key={t.fraction}>
                <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke={CHART.grid} strokeWidth={1} />
                <text x={PAD_L - 8} y={y + 3} className="an-axis" textAnchor="end">{t.value}</text>
              </g>
            );
          })}

          {series.months.map((k, i) => {
            const cx = PAD_L + slot * i + slot / 2;
            const bars = [
              { v: series.sent[i], fill: CHART.sent, stroke: CHART.sentEdge, x: cx - barW - 2, word: "sent" },
              { v: series.received[i], fill: CHART.resp, stroke: "none", x: cx + 2, word: "received" },
            ];
            return (
              <g key={k}>
                <text x={cx} y={H - 8} className="an-axis an-axis--big" textAnchor="middle">{monthLabel(k)}</text>
                {bars.map((b) => {
                  const h = plotH * (b.v / maxV);
                  const noun = b.word === "sent"
                    ? `${b.v} ${b.v === 1 ? "query" : "queries"} sent`
                    : `${b.v} ${b.v === 1 ? "response" : "responses"} received`;
                  return (
                    <rect
                      key={b.word}
                      className="an-bar"
                      x={b.x}
                      y={baseY - h}
                      width={barW}
                      height={h}
                      rx={3}
                      fill={b.fill}
                      stroke={b.stroke === "none" ? undefined : b.stroke}
                      strokeWidth={b.stroke === "none" ? undefined : 1}
                      {...tip.bind({
                        kicker: `${monthLabel(k)} ${monthYear(k)}`,
                        headline: noun,
                      })}
                    />
                  );
                })}
              </g>
            );
          })}

          {/* ⚠️ THE MARKS ARE DRAWN LAST so they sit above the bars — an event diamond behind a
              tall bar is an event nobody can see. */}
          {marks.map((m) => {
            const i = series.months.indexOf(m.monthKey);
            const cx = PAD_L + slot * i + slot / 2;
            const n = stack.get(m.monthKey) ?? 0;
            stack.set(m.monthKey, n + 1);
            const cy = PAD_T + 8 + n * 16;
            const s = 5.5;
            return (
              <path
                key={`${m.queryId}-${m.kind}`}
                className="an-mark"
                d={`M ${cx} ${cy - s} L ${cx + s} ${cy} L ${cx} ${cy + s} L ${cx - s} ${cy} Z`}
                fill={m.kind === "offer" ? CHART.offer : "#fdfaf5"}
                stroke={CHART.offer}
                strokeWidth={1.2}
                {...tip.bind({
                  kicker: `${m.label} · ${shortDate(m.atMs)}`,
                  headline: m.agentName,
                  detail: m.agentSub || undefined,
                })}
              />
            );
          })}
        </svg>
      </div>

      <div className="an-legend">
        <span className="an-leg"><span className="an-sw" style={{ background: CHART.sent, border: `1px solid ${CHART.sentEdge}` }} />Queries sent</span>
        <span className="an-leg"><span className="an-sw" style={{ background: CHART.resp }} />Responses received</span>
        <span className="an-leg"><span className="an-swd an-swd--full" />Full requested</span>
        <span className="an-leg"><span className="an-swd an-swd--offer" />Offer</span>
      </div>

      {/* ⚠️ A TRUNCATED SPAN IS STATED, NEVER APPLIED SILENTLY. A cap nobody mentions reads as
          "this is everything". */}
      {series.omittedMonths > 0 ? (
        <div className="an-guardnote">
          Showing the last {series.months.length} months. {series.omittedMonths} earlier{" "}
          {series.omittedMonths === 1 ? "month is" : "months are"} not drawn — narrow the range to
          read them.
        </div>
      ) : null}

      {tip.node}
    </>
  );
};

/** The band note. Names what the marks are, since a diamond explains nothing on its own. */
export const SENDING_NOTE = "Queries sent and responses received, by month · ◆ marks fulls and offers";
