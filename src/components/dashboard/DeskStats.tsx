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
  agentGlyphTone,
  GlyphTone,
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

/* ══════════════ 3 · AGENTS ══════════════ */

const GLOBE = <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z" /></svg>;
const MAIL = <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4.5" width="20" height="15" rx="2.5" /><path d="m3 6.5 9 6.5 9-6.5" /></svg>;
const AGENTS_ICON = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>;

const TONE_FILL: Record<GlyphTone, string> = {
  queried: "#7c3a2a",
  yours: "#a86a52",
  closed: "#cbbcae",
};

/** `https://` prefixed only when the stored value has no scheme of its own. */
export const websiteHref = (site: string): string =>
  /^https?:\/\//i.test(site.trim()) ? site.trim() : `https://${site.trim()}`;

/** The domain, without a scheme or a trailing slash — what the row shows. */
export const websiteText = (site: string): string =>
  site.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");

/** `mailto:` with the subject pre-filled — the one place the query's subject line is composed. */
export const mailtoHref = (email: string, manuscriptTitle: string): string =>
  `mailto:${email.trim()}?subject=${encodeURIComponent(`Query — ${manuscriptTitle}`)}`;

export const AgentsCard: React.FC<{
  agents: Agent[];
  queries: Query[];
  manuscriptTitle: string;
}> = ({ agents, queries, manuscriptTitle }) => {
  /* ⚠️ ONE PIN AT A TIME, HELD AT THE CARD, NOT PER GLYPH. Sixteen glyphs each owning a "am I
     pinned" flag is sixteen chances for two to be open at once — and the bug would look like a
     rendering glitch rather than a state one. */
  const [open, setOpen] = useState<{ id: string; anchor: Rect; pinned: boolean } | null>(null);
  const graceRef = React.useRef<number | null>(null);

  const cancelGrace = () => { if (graceRef.current) { window.clearTimeout(graceRef.current); graceRef.current = null; } };
  /* 220ms so the pointer can travel from the glyph into the card it just opened. Without it the
     card closes underneath the cursor on its way there. */
  const startGrace = () => { cancelGrace(); graceRef.current = window.setTimeout(() => setOpen(null), 220); };
  React.useEffect(() => cancelGrace, []);

  const agent = open ? agents.find((a) => a.id === open.id) ?? null : null;
  const idle = agents.filter((a) => agentGlyphTone(a, queries) === "closed").length;

  const openFor = (a: Agent, el: Element, pinned: boolean) => {
    cancelGrace();
    setOpen({ id: a.id, anchor: rectOf(el), pinned });
  };

  return (
    <DeskCard pill={<span className="dk-pill">Agents</span>} icon={AGENTS_ICON} bare>
      <div className="ds-inner">
        <div className="ds-fig">
          <span className="ds-n">{agents.length}</span>
          <span className="ds-cap">{idle} idle</span>
        </div>
        <div className="ds-viz">
          <div className="ds-agents" onMouseLeave={() => { if (!open?.pinned) startGrace(); }}>
            {agents.map((a) => {
              const tone = agentGlyphTone(a, queries);
              const isOpen = open?.id === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  data-desk-tip-anchor=""
                  className={`ds-ag${isOpen ? (open!.pinned ? " pinned" : " held") : ""}`}
                  /* the accessible name is the person, not "glyph 4 of 16" */
                  aria-label={`${a.name}${a.agency ? `, ${a.agency}` : ""}`}
                  aria-expanded={isOpen && open!.pinned}
                  onMouseEnter={(e) => { if (!open?.pinned) openFor(a, e.currentTarget, false); }}
                  onFocus={(e) => { if (!open?.pinned) openFor(a, e.currentTarget, false); }}
                  onClick={(e) => {
                    /* ⚠️ TOUCH HAS NO HOVER, so a tap must PIN directly — this same handler is the
                       touch path, which is why pinning does not depend on a preview being open. */
                    if (open?.pinned && open.id === a.id) { setOpen(null); return; } // same glyph closes
                    openFor(a, e.currentTarget, true);
                  }}
                >
                  <svg viewBox="0 0 16 17" aria-hidden="true">
                    <circle cx="8" cy="4" r="3.1" fill={TONE_FILL[tone]} />
                    <path d="M1.6 16c0-3.5 2.8-5.7 6.4-5.7s6.4 2.2 6.4 5.7z" fill={TONE_FILL[tone]} />
                  </svg>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <DeskTooltip
        anchor={open?.anchor ?? null}
        mode={open?.pinned ? "pinned" : "interactive"}
        label={agent ? `${agent.name} — contact details` : undefined}
        onClose={() => setOpen(null)}
      >
        {agent && (
          <div onMouseEnter={cancelGrace} onMouseLeave={() => { if (!open?.pinned) startGrace(); }}>
            {/* ⚠️ NO STATUS ANYWHERE IN HERE — not the stage, not the last activity, not a dot.
                The card answers "how do I reach them"; where the query stands is three other
                surfaces' job, and putting it here gives that fact a fourth home to disagree from. */}
            <div className="ds-cname">{agent.name}</div>
            {agent.agency && <div className="ds-cagency">{agent.agency}</div>}
            <hr className="dk-rule" />
            <div className="ds-clinks">
              {agent.website?.trim() ? (
                <a className="ds-clink" href={websiteHref(agent.website)} target="_blank" rel="noopener">
                  {GLOBE}
                  <span className="ds-ctxt"><b>Their website</b>{websiteText(agent.website)}</span>
                  <span className="ds-carr" aria-hidden="true">→</span>
                </a>
              ) : (
                /* dimmed and inert — never a dead link that looks live */
                <span className="ds-clink off">{GLOBE}<span className="ds-ctxt"><b>Their website</b>No website recorded</span></span>
              )}
              {agent.email?.trim() ? (
                <a className="ds-clink" href={mailtoHref(agent.email, manuscriptTitle)}>
                  {MAIL}
                  <span className="ds-ctxt"><b>Write to them</b>{agent.email}</span>
                  <span className="ds-carr" aria-hidden="true">→</span>
                </a>
              ) : (
                <span className="ds-clink off">{MAIL}<span className="ds-ctxt"><b>Write to them</b>No address recorded</span></span>
              )}
            </div>
          </div>
        )}
      </DeskTooltip>
    </DeskCard>
  );
};
