/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The settled desk's stat cards (ref design-refs/dashboard-settled-desk.html).
 *
 * ⚠️ FOUR CARDS, ALWAYS ON, ALWAYS CHARTS. They never collapse to a bare number and they never
 * move — the figure and the shape of it are the same fact, and hiding the shape behind an
 * interaction was what the retired focus slot did.
 *
 * ⚠️ AND EVERY NUMBER IS DERIVED AT READ TIME by `lib/dashboardStats.ts`. No component on this
 * page re-derives a count its own way; where a card needs a shape the selectors did not have, the
 * selector gained it (`weekQueryRows`, `responseSplit`) rather than the component doing maths.
 */
import React, { useState } from "react";
import { Agent, Query } from "../../types";
import { StatusDot } from "../StatusDot";
import { DeskCard } from "./DeskCard";
import { DeskTooltip } from "./DeskTooltip";
import { Rect } from "../../lib/deskTooltip";
import {
  activeStageBreakdown,
  activeQueriesOf,
  activeWeeklySeries,
  awaitingReplyCount,
  ResponseSplit,
  responseSplit,
  responseRatePercent,
  responsesReceivedCount,
  sendsThisWeek,
  trailingWeekStarts,
  weeklySendSeries,
  weekQueryRows,
} from "../../lib/dashboardStats";
import "./deskStats.css";

const SEND_ICON = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2 11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></svg>;
const ACTIVE_ICON = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2" /></svg>;
const RESP_ICON = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>;

const rectOf = (el: Element): Rect => {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
};

const weekLabel = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/* ══════════════ 1 · QUERIES SENT ══════════════ */

export const QueriesSentCard: React.FC<{ queries: Query[]; agents: Agent[]; now?: Date }> = ({
  queries, agents, now = new Date(),
}) => {
  const [hover, setHover] = useState<{ idx: number; anchor: Rect } | null>(null);
  const series = weeklySendSeries(queries, now);
  const starts = trailingWeekStarts(now);
  const max = Math.max(1, ...series);
  const sent = queries.filter((q) => q.dateSent).length;

  const rows = hover ? weekQueryRows(queries, agents, starts[hover.idx]) : [];

  return (
    <DeskCard pill={<span className="dk-pill">Queries sent</span>} icon={SEND_ICON} bare>
      <div className="ds-inner">
        <div className="ds-fig">
          <span className="ds-n">{sent}</span>
          <span className="ds-cap">{sendsThisWeek(queries, now)} this week</span>
        </div>
        <div className="ds-viz">
          <div className="ds-bars">
            {series.map((n, i) => {
              /* The two most recent weeks take the emphasis colours — the current one lighter,
                 because it is still filling up and reading it as the biggest bar would flatter it. */
              const tone = i === series.length - 1 ? "now" : i === series.length - 2 ? "recent" : "";
              return (
                <button
                  key={starts[i].toISOString()}
                  type="button"
                  className={`ds-bar ${tone}${hover?.idx === i ? " on" : ""}`}
                  style={{ height: Math.max(6, (n / max) * 44) }}
                  aria-label={`Week of ${weekLabel(starts[i])}: ${n} sent`}
                  onMouseEnter={(e) => setHover({ idx: i, anchor: rectOf(e.currentTarget) })}
                  onFocus={(e) => setHover({ idx: i, anchor: rectOf(e.currentTarget) })}
                  onMouseLeave={() => setHover(null)}
                  onBlur={() => setHover(null)}
                />
              );
            })}
          </div>
        </div>
      </div>

      <DeskTooltip anchor={hover?.anchor ?? null} mode="plain" onClose={() => setHover(null)}>
        {hover && (
          <>
            <div className="dk-cap">Week of {weekLabel(starts[hover.idx])}</div>
            <div className="dk-n">
              {series[hover.idx]}
              <small>{series[hover.idx] === 1 ? "query sent" : "queries sent"}</small>
            </div>
            <hr className="dk-rule" />
            {rows.length === 0 ? (
              <div className="dk-sub dk-quiet">No queries went out this week.</div>
            ) : (
              <div className="ds-qlist">
                {rows.map((r) => (
                  <div className="ds-qrow" key={r.id}>
                    <StatusDot status={r.status} overrideSize={12} decorative />
                    <span className="ds-qn">
                      {r.agentName}
                      {r.agency && <span className="ds-qa">{r.agency}</span>}
                    </span>
                    <span className="ds-qd">{r.sentLabel}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </DeskTooltip>
    </DeskCard>
  );
};

/* ══════════════ 4 · RESPONSES RECEIVED ══════════════ */

type SegKey = "requests" | "passes" | "offers";

/** The words each segment says — a sentence, never a bare count. */
export const segCopy = (key: SegKey, n: number): string => {
  if (key === "requests") return `${n} request${n === 1 ? "" : "s"} for more`;
  if (key === "passes") return `${n} pass${n === 1 ? "" : "es"}`;
  return `${n} offer${n === 1 ? "" : "s"} of representation`;
};

/** Each segment's width as a percentage of ALL queries — the track is the whole pipeline. */
const segPct = (n: number, all: number) => (all > 0 ? (n / all) * 100 : 0);

export const ResponsesCard: React.FC<{ queries: Query[] }> = ({ queries }) => {
  const [hover, setHover] = useState<{ key: SegKey; anchor: Rect } | null>(null);
  const split: ResponseSplit = responseSplit(queries);
  const total = responsesReceivedCount(queries);
  const all = queries.length;

  const segs: { key: SegKey; n: number; className: string }[] = [
    { key: "requests", n: split.requests, className: "req" },
    { key: "passes", n: split.passes, className: "pass" },
    { key: "offers", n: split.offers, className: "offer" },
  ];

  let cursor = 0;
  const placed = segs.map((s) => {
    const left = cursor;
    const width = segPct(s.n, all);
    cursor += width;
    return { ...s, left, width };
  });

  return (
    <DeskCard pill={<span className="dk-pill">Responses</span>} icon={RESP_ICON} bare>
      <div className="ds-inner">
        <div className="ds-fig">
          <span className="ds-n">{total}</span>
          <span className="ds-cap">{responseRatePercent(queries)}% rate</span>
        </div>
        <div className="ds-viz">
          {/* One sage bar at rest; it SPLITS into its parts on hover, so the whole is the first
              reading and the breakdown is the second. */}
          <div className="ds-rtrack">
            <div className="ds-rfill" style={{ width: `${segPct(total, all)}%` }} />
            {placed.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`ds-rseg ${s.className}`}
                style={{ left: `${s.left}%`, width: `${s.width}%` }}
                aria-label={segCopy(s.key, s.n)}
                onMouseEnter={(e) => setHover({ key: s.key, anchor: rectOf(e.currentTarget) })}
                onFocus={(e) => setHover({ key: s.key, anchor: rectOf(e.currentTarget) })}
                onMouseLeave={() => setHover(null)}
                onBlur={() => setHover(null)}
              />
            ))}
            <span className="ds-rmark" style={{ left: `${segPct(total, all)}%` }} aria-hidden="true" />
          </div>
        </div>
      </div>

      <DeskTooltip anchor={hover?.anchor ?? null} mode="plain" onClose={() => setHover(null)}>
        {hover && (
          <div className="dk-sub">
            <b>{segCopy(hover.key, split[hover.key])}</b>
          </div>
        )}
      </DeskTooltip>
    </DeskCard>
  );
};

/* ══════════════ 2 · ACTIVE QUERIES ══════════════ */

const AW = 260, AH = 46, APAD = 6;

/** The x of bin `i` in the trend's viewBox — exported so the snapping maths can be unit-tested. */
export const trendX = (i: number, bins: number) => APAD + (i * (AW - 2 * APAD)) / Math.max(1, bins - 1);

/** The y of a value, scaled to the series' own range (±1 so a flat line is not glued to an edge). */
export const trendY = (v: number, min: number, max: number) =>
  AH - APAD - ((v - min) / Math.max(1, max - min)) * (AH - 2 * APAD);

/**
 * Which bin a pointer at `relX` (in viewBox units) is nearest.
 *
 * ⚠️ IT SNAPS, AND IT CLAMPS. A crosshair that floats between two weeks is pointing at a number
 * that does not exist; one that runs off the end reads a bin that is not there.
 */
export const nearestBin = (relX: number, bins: number): number => {
  const step = (AW - 2 * APAD) / Math.max(1, bins - 1);
  return Math.max(0, Math.min(bins - 1, Math.round((relX - APAD) / step)));
};

/** "+2 on the week before" / "Steady on the week before" — absent for the oldest bin. */
export const weekDelta = (series: number[], i: number): string | null => {
  if (i <= 0) return null;
  const d = series[i] - series[i - 1];
  if (d === 0) return "Steady on the week before";
  return `${d > 0 ? "+" : ""}${d} on the week before`;
};

export const ActiveQueriesCard: React.FC<{ queries: Query[]; now?: Date }> = ({ queries, now = new Date() }) => {
  const [hover, setHover] = useState<{ idx: number; anchor: Rect } | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const series = activeWeeklySeries(queries, now);
  const starts = trailingWeekStarts(now);
  const min = Math.min(...series) - 1;
  const max = Math.max(...series) + 1;
  const path = series.map((v, i) => `${i ? "L" : "M"} ${trendX(i, series.length).toFixed(1)} ${trendY(v, min, max).toFixed(1)}`).join(" ");
  const stages = activeStageBreakdown(activeQueriesOf(queries));
  const activeTotal = stages.reduce((a, r) => a + r.count, 0);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const el = svgRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const idx = nearestBin(((e.clientX - r.left) / r.width) * AW, series.length);
    const cx = r.left + (trendX(idx, series.length) / AW) * r.width;
    const cy = r.top + (trendY(series[idx], min, max) / AH) * r.height;
    setHover({ idx, anchor: { left: cx, top: cy, width: 0, height: 0 } });
  };

  /* ⚠️ "TODAY" ON A PAST WEEK, AND THE COPY MUST SAY SO. Stage is only ever known as-of-now —
     nothing stores where a query stood eight weeks ago — so a breakdown shown against an older
     point is today's standing, not that week's. The caption is the only thing stopping the card
     from implying historical stage data it does not have. */
  const caption = hover && hover.idx === series.length - 1 ? "Where they stand" : "Where they stand today";

  return (
    <DeskCard pill={<span className="dk-pill">Active queries</span>} icon={ACTIVE_ICON} bare>
      <div className="ds-inner">
        <div className="ds-fig">
          <span className="ds-n">{activeTotal}</span>
          <span className="ds-cap">{awaitingReplyCount(queries)} awaiting a reply</span>
        </div>
        <div className="ds-viz">
          <svg
            ref={svgRef}
            className="ds-trend"
            viewBox={`0 0 ${AW} ${AH}`}
            preserveAspectRatio="none"
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
            role="img"
            aria-label={`Active queries over ${series.length} weeks, now ${activeTotal}`}
          >
            <defs>
              <linearGradient id="ds-aqg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#8a9e88" stopOpacity=".24" />
                <stop offset="1" stopColor="#8a9e88" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${path} L ${trendX(series.length - 1, series.length)} ${AH} L ${trendX(0, series.length)} ${AH} Z`} fill="url(#ds-aqg)" />
            <path d={path} fill="none" stroke="#8a9e88" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            {hover && (
              <>
                <line x1={trendX(hover.idx, series.length)} x2={trendX(hover.idx, series.length)} y1={3} y2={AH} stroke="#c9a89e" strokeWidth={1} strokeDasharray="3 4" />
                <circle cx={trendX(hover.idx, series.length)} cy={trendY(series[hover.idx], min, max)} r={4} fill="#fdfaf5" stroke="#7c3a2a" strokeWidth={1.6} />
              </>
            )}
          </svg>
        </div>
      </div>

      <DeskTooltip anchor={hover?.anchor ?? null} mode="plain" onClose={() => setHover(null)}>
        {hover && (
          <>
            <div className="dk-cap">Week of {weekLabel(starts[hover.idx])}</div>
            <div className="dk-n">{series[hover.idx]}<small>active queries</small></div>
            {weekDelta(series, hover.idx) && <div className="dk-sub">{weekDelta(series, hover.idx)}</div>}
            <hr className="dk-rule" />
            <div className="dk-cap">{caption}</div>
            <div className="ds-stagelist">
              {stages.map((r) => (
                <div className={`ds-strow${r.count === 0 ? " dim" : ""}`} key={r.status}>
                  {/* `ghost` is StatusDot's OWN name for the drained treatment — consumed, never recreated. */}
                  <StatusDot status={r.status} overrideSize={12} ghost={r.count === 0} decorative />
                  <span className="ds-sname">{r.label}</span>
                  <span className="ds-smeter">
                    <i style={{ width: `${activeTotal > 0 ? (r.count / activeTotal) * 100 : 0}%` }} />
                  </span>
                  <span className="ds-scount">{r.count}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </DeskTooltip>
    </DeskCard>
  );
};
