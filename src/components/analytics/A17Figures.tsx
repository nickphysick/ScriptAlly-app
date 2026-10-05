/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics v17 — the figures (design-refs/analytics-v17.html), ported from the ref's SVG, each drawn
 * TWICE: a desktop drawing (`.a17-d`) and a phone drawing (`.a17-m`) that is REDRAWN for 390px rather than
 * scaled down — its labels stay at their reference sizes (AN17-17).
 *
 * ⚠️ A MARK THAT IS A QUERY TAKES THAT QUERY'S STATUS FILL — the five `--state-*` tokens, through the
 * `a17-f-<bucket>` classes, and nothing else. Anthracite and rust are STRUCTURE ONLY (baked decision 4):
 * funnel bars, weekly bars, the stated window, median ticks, the today line, the sparkline dot, the
 * requests line and the busiest week. Colours are CLASSES, never `fill` attributes — a presentation
 * attribute loses to any CSS rule, and the v13 build lost a stroke that way.
 *
 * ⚠️ EVERY MARK CARRIES A TOOLTIP (`useMark`): hover on a desktop, a tap on a phone.
 */
import React from "react";
import { QueryStatus } from "../../types";
import { StatusDot } from "../StatusDot";
import { DAY_MS as DAY } from "../../lib/analytics";
import { MONTHS_SHORT } from "../../lib/dates";
import { AnalyticsModel, StateBucket, V17Query, dayMonth, monthYearLong } from "../../lib/analyticsModel";
import { useMark } from "./A17Frame";

const when = (ms: number | null) => (ms === null ? "undated" : dayMonth(ms));
const titleOf = (q: V17Query) => (q.agency ? `${q.agent} · ${q.agency}` : q.agent);
const short = (q: V17Query) => { const p = q.agent.trim().split(/\s+/); return p[p.length - 1] || q.agency || "—"; };
const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;
const queryLine = (q: V17Query, nowMs: number) =>
  `Queried ${when(q.sentMs)} · ${q.state}${q.endMs !== null ? ` · ended ${when(q.endMs)}` : q.sentMs !== null ? ` · ${days(Math.floor((nowMs - q.sentMs) / DAY))} so far` : ""}`;

/** A figure: a typewriter title, a small grey note, then the drawing and its key. */
export const Fig: React.FC<{ k: string; title?: string; note?: string; population: number; extra?: Record<string, string>; children: React.ReactNode; keyItems?: React.ReactNode; className?: string }> = ({ k, title, note, population, extra, children, keyItems, className }) => (
  <div className={`a17-fig${className ? ` ${className}` : ""}`} data-a17="fig" data-a17-fig="" data-key={k} data-population={population} {...extra}>
    {title ? <div className="a17-fh"><h3 className="a17-tw">{title}</h3>{note ? <small>{note}</small> : null}</div> : null}
    {children}
    {keyItems ? <div className="a17-key">{keyItems}</div> : null}
  </div>
);

export const Sw: React.FC<{ c: string }> = ({ c }) => <i className={`a17-sw ${c}`} />;
export const StateKey: React.FC<{ waiting?: string; read?: string; closed?: string; today?: boolean }> = ({ waiting = "Still waiting for a reply", read = "Material sent", closed = "Closed", today }) => (
  <>
    <span><Sw c="a17-f-queried" />{waiting}</span>
    <span><Sw c="a17-f-requested" />Material requested</span>
    <span><Sw c="a17-f-sent" />{read}</span>
    <span><Sw c="a17-f-offer" />Offer</span>
    <span><Sw c="a17-f-closed" />{closed}</span>
    {today ? <span><Sw c="a17-sw--med" />Today</span> : null}
  </>
);

