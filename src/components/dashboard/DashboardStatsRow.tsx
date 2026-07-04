/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * v37 stat cards — the full-width row, the focus-slot minis and the focused panels all render
 * from ONE definition list (useStatDefs), which reads only lib/dashboardStats selectors. Each
 * stat's signature visual (weekly bars / pipeline segbar / people row / rate slider) is a small
 * component shared by the row and the focused panel.
 */
import React, { useMemo } from "react";
import { Agent, Query, QueryStatus } from "../../types";
import {
  activeQueriesOf,
  awaitingReplyCount,
  idleAgentCount,
  pipelineMix,
  responseRatePercent,
  responsesReceivedCount,
  sendsThisWeek,
  shownAgentCount,
  weeklySendSeries,
} from "../../lib/dashboardStats";
import type { FocusKey } from "./focusSlot";

/* Stage ramp for the pipeline segbar — theme-hue-led: the first stage is the theme hue and the
   later stages step toward the neutral track. Static hexes per theme are unnecessary here: the
   lead segment reads var(--sd-hue); the tail uses fixed neutral steps that read correctly on all
   three themes. */
const SEG_TAIL = ["#a98d68", "#c9ab8a", "#ddcbb4", "#eee2d2", "#f4ede3"];

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

/* ── signature visuals ── */

const WeeklyBars: React.FC<{ series: number[] }> = ({ series }) => {
  const max = Math.max(1, ...series);
  return (
    <div className="sa-mbar" aria-hidden="true">
      {series.map((n, i) => (
        <i key={i} className={i === series.length - 1 ? "hot" : undefined} style={{ ["--h" as string]: `${Math.max(8, Math.round((n / max) * 100))}%` } as React.CSSProperties} />
      ))}
    </div>
  );
};

const PipelineSegBar: React.FC<{ queries: Query[] }> = ({ queries }) => {
  const mix = pipelineMix(activeQueriesOf(queries));
  if (mix.length === 0) return <div className="sa-segbar" aria-hidden="true" />;
  return (
    <div className="sa-segbar" aria-hidden="true">
      {mix.map((s, i) => (
        <i key={s.status} style={{ flex: s.count, background: i === 0 ? "var(--sd-hue, #7c3a2a)" : SEG_TAIL[Math.min(i - 1, SEG_TAIL.length - 1)] }} />
      ))}
    </div>
  );
};

const PeopleRow: React.FC<{ total: number }> = ({ total }) => {
  const shown = Math.min(10, total);
  return (
    <div className="sa-people" aria-hidden="true">
      {Array.from({ length: shown }, (_, i) => (<i key={i} />))}
      {total > shown && <span className="sa-more">+{total - shown}</span>}
    </div>
  );
};

const RateSlider: React.FC<{ pct: number }> = ({ pct }) => (
  <div className="sa-slider" aria-hidden="true">
    <div className="sa-fill" style={{ width: `${pct}%` }} />
    <div className="sa-knob" style={{ left: `${pct}%` }} />
  </div>
);

/* ── one data source for all three renderings ── */

export interface StatDef {
  key: Exclude<FocusKey, "todo">;
  label: string;
  num: number;
  pill: string;
  /** Focused panel sub-line; empty string = omit (derivation not cleanly supported). */
  sub: string;
  visual: React.ReactNode;
}

export const useStatDefs = (queries: Query[], agents: Agent[]): StatDef[] =>
  useMemo(() => {
    const now = new Date();
    const series = weeklySendSeries(queries, now, 8);
    const thisWeek = sendsThisWeek(queries, now);
    const active = activeQueriesOf(queries);
    const awaiting = awaitingReplyCount(queries);
    const withPagesOut = queries.filter((q) => q.status === QueryStatus.PARTIAL_SENT || q.status === QueryStatus.FULL_SENT).length;
    const idle = idleAgentCount(agents, queries);
    const shownAgents = shownAgentCount(agents, queries);
    const responses = responsesReceivedCount(queries);
    const rate = responseRatePercent(queries);
    return [
      {
        key: "queriesSent",
        label: "Queries sent",
        num: queries.length,
        pill: `+${thisWeek} this week`,
        // Comparative "best week since…" is not trivially derivable — omitted (see BUILD-REPORT).
        sub: `+${thisWeek} this week`,
        visual: <WeeklyBars series={series} />,
      },
      {
        key: "active",
        label: "Active queries",
        num: active.length,
        pill: `${awaiting} awaiting a reply`,
        sub: `${awaiting} awaiting a reply · ${withPagesOut} with your pages out`,
        visual: <PipelineSegBar queries={queries} />,
      },
      {
        key: "agents",
        label: "Agents",
        num: shownAgents,
        pill: `${idle} idle`,
        sub: `${idle} idle`,
        visual: <PeopleRow total={shownAgents} />,
      },
      {
        key: "responses",
        label: "Responses received",
        num: responses,
        pill: `${rate}% rate`,
        sub: `${rate}% response rate`,
        visual: <RateSlider pct={rate} />,
      },
    ];
  }, [queries, agents]);

/* ── renderings ── */

export const StatCardFull: React.FC<{ def: StatDef; onPin: () => void }> = ({ def, onPin }) => (
  <button type="button" className="sa-stat" title="Pin to focus" onClick={onPin}>
    <div className="sa-cap">{ICONS[def.key]}{def.label}</div>
    <div className="sa-numrow"><span className="sa-num">{def.num}</span><span className="sa-pill">{def.pill}</span></div>
    <div className="sa-foot">{def.visual}</div>
  </button>
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
      <div className="sa-ffoot">{def.visual}</div>
    </div>
  ),
);
StatFocusPanel.displayName = "StatFocusPanel";
