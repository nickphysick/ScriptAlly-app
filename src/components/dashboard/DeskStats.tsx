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
                    <StatusDot status={r.status} overrideSize={12} />
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
