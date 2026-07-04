/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * v37 stat cards — the full-width row, the focus-slot minis and the focused panels all render
 * from ONE definition list (useStatDefs), which reads only lib/dashboardStats selectors.
 *
 * Prod-pattern visuals (content pattern from the pre-rebuild production cards; ALL colour from
 * the current theme tokens — never sage/green):
 *  1 Queries sent   — 8 trailing ISO weeks; zero-weeks are low baseline dashes; current week in
 *                     --sd-hue, earlier weeks in the muted theme tint. Hover a slot → "W/C … · N SENT".
 *  2 Active queries — area sparkline of the active count at each week-end (derived-status fields
 *                     only), theme-hue line over a soft fading fill. Hover a slot → "… · N ACTIVE".
 *  3 Agents         — one person glyph per agent (≤10; then a +N chip): hue when they have an
 *                     active query, muted when idle. Hover → "NAME · MOST-ADVANCED STATUS" / "· IDLE".
 *  4 Responses      — the slider at the response rate. Hover the track → "9 OF 10 … · 90%".
 * Every hover point is a StatTooltip (focusable, aria-labelled). Minis have no charts/hovers.
 */
import React, { useMemo } from "react";
import { Agent, Query, QueryStatus } from "../../types";
import {
  activeQueriesOf,
  activeTooltip,
  activeWeeklySeries,
  agentStatusSummaries,
  agentTooltip,
  AgentStatusSummary,
  awaitingReplyCount,
  idleAgentCount,
  overflowTooltip,
  responseRatePercent,
  responsesReceivedCount,
  responsesTooltip,
  sendsThisWeek,
  sentTooltip,
  shownAgentCount,
  trailingWeekStarts,
  weeklySendSeries,
} from "../../lib/dashboardStats";
import { StatTooltip } from "./StatTooltip";
import type { FocusKey } from "./focusSlot";

const ICONS: Record<Exclude<FocusKey, "todo">, React.ReactNode> = {
  queriesSent: (
    <svg viewBox="0 0 24 24" width={13} height={13} fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" aria-hidden="true">
      <path d="M21 3L10 14" /><path d="M21 3l-7 18-4-7-7-4 18-7z" />
    </svg>
  ),
  active: (
    <svg viewBox="0 0 24 24" width={13} height={13} fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" aria-hidden="true">
      <path d="M6 2h12M6 22h12M8 2v4l4 4 4-4V2M8 22v-4l4-4 4 4v4" />
    </svg>
  ),
  agents: (
    <svg viewBox="0 0 24 24" width={13} height={13} fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><circle cx="17.5" cy="9" r="2.5" /><path d="M16 14.5c3 .3 5.5 2.3 5.5 5.5" />
    </svg>
  ),
  responses: (
    <svg viewBox="0 0 24 24" width={13} height={13} fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 6L2 7" />
    </svg>
  ),
};

/* ── signature visuals (scale-aware: the focused panel passes a taller chart height) ── */

const WeeklyBars: React.FC<{ series: number[]; weekStarts: Date[]; chartH: number }> = ({ series, weekStarts, chartH }) => {
  const max = Math.max(1, ...series);
  return (
    <div className="sa-mbar" style={{ ["--chart-h" as string]: `${chartH}px` } as React.CSSProperties}>
      {series.map((n, i) => (
        <span key={i} className="sa-mbar-slot">
          <StatTooltip label={sentTooltip(weekStarts[i], n)} block>
            <i
              className={`${i === series.length - 1 && n > 0 ? "hot " : ""}${n === 0 ? "zero" : ""}`.trim() || undefined}
              style={n > 0 ? ({ ["--h" as string]: `${Math.max(12, Math.round((n / max) * 100))}%` } as React.CSSProperties) : undefined}
            />
          </StatTooltip>
        </span>
      ))}
    </div>
  );
};

/** Area sparkline — line in the theme hue over a soft fill fading to transparent (geometry
 *  lifted from the retired StatCards line chart; colours retokened). */
const ActiveSparkline: React.FC<{ series: number[]; weekStarts: Date[]; chartH: number }> = ({ series, weekStarts, chartH }) => {
  const W = 160;
  const H = 34;
  const max = Math.max(1, ...series);
  const pts = series.map((n, i) => {
    const x = series.length === 1 ? W / 2 : (i / (series.length - 1)) * W;
    const y = H - 3 - (n / max) * (H - 8);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const fill = `${line} L${W} ${H} L0 ${H} Z`;
  const gradId = React.useId();
  return (
    <div className="sa-spark" style={{ ["--chart-h" as string]: `${chartH}px` } as React.CSSProperties}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--sd-hue, #7c3a2a)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--sd-hue, #7c3a2a)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fill} fill={`url(#${gradId})`} stroke="none" />
        <path d={line} fill="none" stroke="var(--sd-hue, #7c3a2a)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {/* hover/focus slots — one per week, spanning the chart's full height */}
      <div className="sa-spark-slots">
        {series.map((n, i) => (
          <StatTooltip key={i} label={activeTooltip(weekStarts[i], n)} block />
        ))}
      </div>
    </div>
  );
};

/** Person glyph — filled silhouette; colour via currentColor (hue = active, muted = idle). */
const PersonGlyph: React.FC<{ size: number }> = ({ size }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" style={{ display: "block" }}>
    <circle cx="12" cy="7.2" r="4.2" fill="currentColor" />
    <path d="M3.6 21c.4-4.4 4-7.4 8.4-7.4s8 3 8.4 7.4z" fill="currentColor" />
  </svg>
);

const AgentPeopleRow: React.FC<{ summaries: AgentStatusSummary[]; glyphSize: number }> = ({ summaries, glyphSize }) => {
  const shown = summaries.slice(0, 10);
  const overflow = summaries.length - shown.length;
  return (
    <div className="sa-people">
      {shown.map((s) => (
        <StatTooltip key={s.id} label={agentTooltip(s.name, s.status)}>
          <span className={`sa-person${s.status ? " on" : ""}`}>
            <PersonGlyph size={glyphSize} />
          </span>
        </StatTooltip>
      ))}
      {overflow > 0 && (
        <StatTooltip label={overflowTooltip(overflow)}>
          <span className="sa-more">+{overflow}</span>
        </StatTooltip>
      )}
    </div>
  );
};

const RateSlider: React.FC<{ pct: number; answered: number; total: number }> = ({ pct, answered, total }) => (
  <StatTooltip label={responsesTooltip(answered, total, pct)} block>
    <div className="sa-slider">
      <div className="sa-fill" style={{ width: `${pct}%` }} />
      <div className="sa-knob" style={{ left: `${pct}%` }} />
    </div>
  </StatTooltip>
);

/* ── one data source for all three renderings ── */

export interface StatDef {
  key: Exclude<FocusKey, "todo">;
  label: string;
  num: number;
  pill: string;
  /** Focused panel sub-line; empty string = omit (derivation not cleanly supported). */
  sub: string;
  /** Scale-aware visual — the row renders visual(26), the focused panel visual(42). */
  visual: (chartH: number) => React.ReactNode;
}

export const useStatDefs = (queries: Query[], agents: Agent[]): StatDef[] =>
  useMemo(() => {
    const now = new Date();
    const weekStarts = trailingWeekStarts(now, 8);
    const series = weeklySendSeries(queries, now, 8);
    const activeSeries = activeWeeklySeries(queries, now, 8);
    const thisWeek = sendsThisWeek(queries, now);
    const active = activeQueriesOf(queries);
    const awaiting = awaitingReplyCount(queries);
    const withPagesOut = queries.filter((q) => q.status === QueryStatus.PARTIAL_SENT || q.status === QueryStatus.FULL_SENT).length;
    const summaries = agentStatusSummaries(agents, queries);
    const idle = idleAgentCount(agents, queries);
    const shownAgents = shownAgentCount(agents, queries);
    const responses = responsesReceivedCount(queries);
    const rate = responseRatePercent(queries);
    return [
      {
        key: "queriesSent",
        label: "Queries sent",
        num: queries.length,
        pill: `${thisWeek} this week`,
        sub: `${thisWeek} this week`,
        visual: (h) => <WeeklyBars series={series} weekStarts={weekStarts} chartH={h} />,
      },
      {
        key: "active",
        label: "Active queries",
        num: active.length,
        pill: Number.isFinite(awaiting) ? `${awaiting} awaiting a reply` : "No change on last week",
        sub: `${awaiting} awaiting a reply · ${withPagesOut} with your pages out`,
        visual: (h) => <ActiveSparkline series={activeSeries} weekStarts={weekStarts} chartH={h} />,
      },
      {
        key: "agents",
        label: "Agents",
        num: shownAgents,
        pill: `${idle} idle`,
        sub: `${idle} idle`,
        visual: (h) => <AgentPeopleRow summaries={summaries} glyphSize={Math.round(h * 0.55)} />,
      },
      {
        key: "responses",
        label: "Responses received",
        num: responses,
        pill: `${rate}% rate`,
        sub: `${rate}% response rate`,
        visual: () => <RateSlider pct={rate} answered={responses} total={queries.length} />,
      },
    ];
  }, [queries, agents]);

/* ── renderings ── */

export const StatCardFull: React.FC<{ def: StatDef; onPin: () => void }> = ({ def, onPin }) => (
  <div className="sa-stat" title="Pin to focus" role="button" tabIndex={0}
    onClick={onPin}
    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPin(); } }}
  >
    <div className="sa-cap">{ICONS[def.key]}{def.label}</div>
    <div className="sa-numrow"><span className="sa-num">{def.num}</span><span className="sa-pill">{def.pill}</span></div>
    <div className="sa-foot">{def.visual(26)}</div>
  </div>
);

export const StatMini: React.FC<{ def: StatDef; onPin: () => void }> = ({ def, onPin }) => (
  <button type="button" className="sa-mini" title="Pin to focus" onClick={onPin}>
    <div className="sa-cap">{ICONS[def.key]}{def.label}</div>
    <div className="sa-n">{def.num}</div>
    <div className="sa-p">{def.pill}</div>
  </button>
);

export const StatFocusPanel = React.forwardRef<HTMLDivElement, { def: StatDef; onUnpin: () => void; className?: string }>(
  ({ def, onUnpin, className }, ref) => (
    <div ref={ref} tabIndex={-1} className={`sa-focus-panel sa-fstat${className ? " " + className : ""}`} role="region" aria-label={def.label}>
      <button type="button" className="sa-unpin" onClick={onUnpin}>Unpin</button>
      <div className="sa-cap">{ICONS[def.key]}{def.label}</div>
      <div className="sa-bign">{def.num}</div>
      {def.sub && <div className="sa-sub">{def.sub}</div>}
      <div className="sa-ffoot">{def.visual(42)}</div>
    </div>
  ),
);
StatFocusPanel.displayName = "StatFocusPanel";
