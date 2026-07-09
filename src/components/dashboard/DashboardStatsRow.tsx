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
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Activity, Agent, Query, QueryStatus } from "../../types";
import {
  activeQueriesOf,
  activeTooltip,
  activeWeeklySeries,
  AGENT_GRID_MAX_PER_ROW,
  AGENT_GRID_GAP,
  agentGridLayout,
  agentStatusSummaries,
  agentTooltip,
  AgentStatusSummary,
  awaitingReplyCount,
  ballHolderSplit,
  idleAgentCount,
  medianReplyDays,
  outcomeGroups,
  OutcomeGroup,
  overflowTooltip,
  pipelineMix,
  responseRatePercent,
  responsesReceivedCount,
  sendsThisWeek,
  sentTooltip,
  sentWeekFooter,
  shownAgentCount,
  trailingWeekStarts,
  wcLabel,
  weeklySendSeries,
  weekRecipients,
  WeekRecipient,
} from "../../lib/dashboardStats";
import { initialsOf } from "../../lib/searchSuggestionsCore";
import { getStatusLabel } from "../StatusPill";
import { StatusDot } from "../StatusDot";
import { StatTooltip } from "./StatTooltip";
import { PanelAlign, StatHoverPanel } from "./StatHoverPanel";
import type { FocusKey } from "./focusSlot";

/* ── hover-panel content templates (locked S1·A·A·A). Panels are non-interactive
   (pointer-events:none); "click row → agent/query" is logged as a possible follow-up. ── */

const RECIPIENT_ROW_CAP = 4;

const RecipientsPanel: React.FC<{ weekStart: Date; recips: WeekRecipient[]; footer: string }> = ({ weekStart, recips, footer }) => (
  <>
    <div className="sa-hp-head">
      <span>{wcLabel(weekStart)}</span>
      <span className="sa-hp-val">{recips.length} SENT</span>
    </div>
    {recips.length === 0 ? (
      <>
        <div className="sa-hp-quiet">A quiet week — no queries went out.</div>
        <div className="sa-hp-quiet-sub">{wcLabel(weekStart)} · 0 SENT</div>
      </>
    ) : (
      <>
        <div className="sa-hp-body">
          {recips.slice(0, RECIPIENT_ROW_CAP).map((r) => (
            <div key={r.id} className="sa-hp-row">
              <span className="sa-hp-mono" style={{ width: 26, height: 26, fontSize: 10 }}>{initialsOf(r.agentName)}</span>
              <span style={{ minWidth: 0 }}>
                <span className="sa-hp-name" style={{ display: "block" }}>{r.agentName}</span>
                {r.agency && <span className="sa-hp-agency" style={{ display: "block" }}>{r.agency}</span>}
              </span>
              <span className="sa-hp-day">{r.day}</span>
            </div>
          ))}
          {recips.length > RECIPIENT_ROW_CAP && (
            <div className="sa-hp-more">+{recips.length - RECIPIENT_ROW_CAP} MORE THAT WEEK</div>
          )}
        </div>
        <div className="sa-hp-foot">{footer}</div>
      </>
    )}
  </>
);

const MixPanel: React.FC<{ mix: { status: QueryStatus; count: number }[]; activeCount: number; split: string }> = ({ mix, activeCount, split }) => (
  <>
    <div className="sa-hp-head">
      <span>Right now</span>
      <span className="sa-hp-val">{activeCount} ACTIVE</span>
    </div>
    <div className="sa-hp-body">
      {mix.map((m) => (
        <div key={m.status} className="sa-hp-row">
          <StatusDot status={m.status} overrideSize={12} decorative />
          <span className="sa-hp-label">{getStatusLabel(m.status)}</span>
          <span className="sa-hp-count">{m.count}</span>
        </div>
      ))}
    </div>
    <div className="sa-hp-foot">{split}</div>
  </>
);

const CompactPanel: React.FC<{ left: string; right: string }> = ({ left, right }) => (
  <div className="sa-hp-head">
    <span>{left}</span>
    <span className="sa-hp-val">{right}</span>
  </div>
);

const AgentProfilePanel: React.FC<{ s: AgentStatusSummary }> = ({ s }) => (
  <>
    <div className="sa-hp-body" style={{ paddingTop: 10 }}>
      <div className="sa-hp-row">
        <span className="sa-hp-mono" style={{ width: 34, height: 34, fontSize: 12 }}>{initialsOf(s.name)}</span>
        <span style={{ minWidth: 0 }}>
          <span className="sa-hp-name" style={{ display: "block", fontSize: 16.5 }}>{s.name}</span>
          {s.agency && <span className="sa-hp-agency" style={{ display: "block" }}>{s.agency}</span>}
        </span>
      </div>
    </div>
    <span className="sa-hp-pill">
      {s.status && <StatusDot status={s.status} overrideSize={12} decorative />}
      {s.status
        ? `${String(s.status).toUpperCase()}${s.respondBy ? ` · RESPOND BY ${new Date(s.respondBy).toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase()}` : ""}`
        : "IDLE · NO ACTIVE QUERIES"}
    </span>
  </>
);

const OutcomePanel: React.FC<{ groups: OutcomeGroup[]; answered: number; total: number; rate: number; median: number | null }> = ({ groups, answered, total, rate, median }) => (
  <>
    <div className="sa-hp-head">
      <span>{answered} OF {total} ANSWERED</span>
      <span className="sa-hp-val">{rate}%</span>
    </div>
    <div className="sa-hp-body">
      {groups.map((g) => (
        <div key={g.key} className="sa-hp-row">
          <StatusDot status={g.dotStatus} overrideSize={12} decorative />
          <span className="sa-hp-label">{g.label}</span>
          <span className="sa-hp-count">{g.count}</span>
        </div>
      ))}
    </div>
    {median !== null && <div className="sa-hp-foot">MEDIAN REPLY · {median} {median === 1 ? "DAY" : "DAYS"}</div>}
  </>
);

/** Deterministic edge handling for panels at the row extremes. */
const slotAlign = (i: number, count: number): PanelAlign => (i < 2 ? "start" : i > count - 3 ? "end" : "center");

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

const WeeklyBars: React.FC<{ series: number[]; weekStarts: Date[]; recipients: WeekRecipient[][]; chartH: number }> = ({ series, weekStarts, recipients, chartH }) => {
  const max = Math.max(1, ...series);
  return (
    <div className="sa-mbar" style={{ ["--chart-h" as string]: `${chartH}px` } as React.CSSProperties}>
      {series.map((n, i) => {
        const recips = recipients[i];
        const names = recips.slice(0, RECIPIENT_ROW_CAP).map((r) => r.agentName).join(", ");
        const aria = `${sentTooltip(weekStarts[i], n)}${names ? ` — ${names}${recips.length > RECIPIENT_ROW_CAP ? ` and ${recips.length - RECIPIENT_ROW_CAP} more` : ""}` : ""}`;
        return (
          <span key={i} className="sa-mbar-slot">
            <StatHoverPanel
              label={aria}
              align={slotAlign(i, series.length)}
              block
              panel={<RecipientsPanel weekStart={weekStarts[i]} recips={recips} footer={sentWeekFooter(series, i)} />}
            >
              <i
                className={`${i === series.length - 1 && n > 0 ? "hot " : ""}${n === 0 ? "zero" : ""}`.trim() || undefined}
                style={n > 0 ? ({ ["--h" as string]: `${Math.max(12, Math.round((n / max) * 100))}%` } as React.CSSProperties) : undefined}
              />
            </StatHoverPanel>
          </span>
        );
      })}
    </div>
  );
};

/** Area sparkline — line in the theme hue over a soft fill fading to transparent (geometry
 *  lifted from the retired StatCards line chart; colours retokened). */
const ActiveSparkline: React.FC<{ series: number[]; weekStarts: Date[]; mix: { status: QueryStatus; count: number }[]; split: string; chartH: number }> = ({ series, weekStarts, mix, split, chartH }) => {
  const mixAria = mix.map((m) => `${getStatusLabel(m.status)} ${m.count}`).join(", ");
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
      {/* hover/focus slots — one per week; the CURRENT point opens the full mix lens, the
          historical points a compact header-only panel (no historical mix derivation). */}
      <div className="sa-spark-slots">
        {series.map((n, i) => {
          const isCurrent = i === series.length - 1;
          return (
            <StatHoverPanel
              key={i}
              label={isCurrent ? `Right now · ${n} active — ${mixAria}` : activeTooltip(weekStarts[i], n)}
              align={slotAlign(i, series.length)}
              block
              panel={
                isCurrent ? (
                  <MixPanel mix={mix} activeCount={n} split={split} />
                ) : (
                  <CompactPanel left={wcLabel(weekStarts[i])} right={`${n} ACTIVE`} />
                )
              }
            />
          );
        })}
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

/**
 * Every agent, as a self-sizing icon grid (owner-locked rules): centred both axes in the
 * available box, icons as large as the box height allows WITHOUT growing it, max 8 per row,
 * shrinking as the roster grows so no agent is ever cut off. The box is measured with a
 * ResizeObserver; the sizing itself is the pure agentGridLayout selector (unit-tested).
 */
const AgentIconGrid: React.FC<{ summaries: AgentStatusSummary[] }> = ({ summaries }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // Belt-and-braces: RO callbacks ride the frame lifecycle, which occluded/never-painting
    // windows may starve — a plain resize listener keeps the grid honest there too.
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const { size, shown, overflow } = agentGridLayout(summaries.length, box.w, box.h);
  // Glyphs plus, in overflow mode, the "+N" chip occupying the final slot.
  const cells: React.ReactNode[] = summaries.slice(0, shown).map((s, i) => (
    <StatHoverPanel
      key={s.id}
      label={`${agentTooltip(s.name, s.status)}${s.status && s.respondBy ? ` · respond by ${new Date(s.respondBy).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}`}
      align={slotAlign(i % AGENT_GRID_MAX_PER_ROW, AGENT_GRID_MAX_PER_ROW)}
      panel={<AgentProfilePanel s={s} />}
    >
      <span className={`sa-person${s.status ? " on" : ""}`}>
        <PersonGlyph size={size} />
      </span>
    </StatHoverPanel>
  ));
  if (overflow > 0) {
    cells.push(
      <StatTooltip key="overflow" label={overflowTooltip(overflow)}>
        <span className="sa-agrid-more" style={{ height: size, minWidth: size }}>+{overflow}</span>
      </StatTooltip>,
    );
  }
  const rows: React.ReactNode[][] = [];
  for (let i = 0; i < cells.length; i += AGENT_GRID_MAX_PER_ROW) {
    rows.push(cells.slice(i, i + AGENT_GRID_MAX_PER_ROW));
  }

  return (
    <div ref={boxRef} className="sa-agrid">
      {size > 0 &&
        rows.map((row, ri) => (
          <div key={ri} className="sa-agrid-row" style={{ gap: AGENT_GRID_GAP }}>
            {row}
          </div>
        ))}
    </div>
  );
};

const RateSlider: React.FC<{ pct: number; answered: number; total: number; groups: OutcomeGroup[]; median: number | null }> = ({ pct, answered, total, groups, median }) => (
  <StatHoverPanel
    label={`${answered} of ${total} answered · ${pct}%${groups.length ? ` — ${groups.map((g) => `${g.label} ${g.count}`).join(", ")}` : ""}${median !== null ? ` · median reply ${median} days` : ""}`}
    align="end"
    block
    panel={<OutcomePanel groups={groups} answered={answered} total={total} rate={pct} median={median} />}
  >
    <div className="sa-slider">
      <div className="sa-fill" style={{ width: `${pct}%` }} />
      <div className="sa-knob" style={{ left: `${pct}%` }} />
    </div>
  </StatHoverPanel>
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
  /** The visual fills (and measures) the remaining card height instead of sitting at the foot —
   *  used by the self-sizing agent grid. */
  fillFoot?: boolean;
}

export const useStatDefs = (queries: Query[], agents: Agent[], activities: Activity[] = []): StatDef[] =>
  useMemo(() => {
    const now = new Date();
    const weekStarts = trailingWeekStarts(now, 8);
    const series = weeklySendSeries(queries, now, 8);
    const recipients = weekStarts.map((ws) => weekRecipients(queries, agents, ws));
    const activeSeries = activeWeeklySeries(queries, now, 8);
    const thisWeek = sendsThisWeek(queries, now);
    const active = activeQueriesOf(queries);
    const mix = pipelineMix(active);
    const split = ballHolderSplit(queries);
    const awaiting = awaitingReplyCount(queries);
    const withPagesOut = queries.filter((q) => q.status === QueryStatus.PARTIAL_SENT || q.status === QueryStatus.FULL_SENT).length;
    const summaries = agentStatusSummaries(agents, queries);
    const idle = idleAgentCount(agents, queries);
    const shownAgents = shownAgentCount(agents, queries);
    const responses = responsesReceivedCount(queries);
    const rate = responseRatePercent(queries);
    const groups = outcomeGroups(queries);
    const median = medianReplyDays(queries, activities);
    return [
      {
        key: "queriesSent",
        label: "Queries sent",
        num: queries.length,
        pill: `${thisWeek} this week`,
        sub: `${thisWeek} this week`,
        visual: (h) => <WeeklyBars series={series} weekStarts={weekStarts} recipients={recipients} chartH={h} />,
      },
      {
        key: "active",
        label: "Active queries",
        num: active.length,
        pill: Number.isFinite(awaiting) ? `${awaiting} awaiting a reply` : "No change on last week",
        sub: `${awaiting} awaiting a reply · ${withPagesOut} with your pages out`,
        visual: (h) => <ActiveSparkline series={activeSeries} weekStarts={weekStarts} mix={mix} split={split} chartH={h} />,
      },
      {
        key: "agents",
        label: "Agents",
        num: shownAgents,
        pill: `${idle} idle`,
        sub: `${idle} idle`,
        // Self-sizing — the grid measures its own box; the chart-height arg is unused.
        visual: () => <AgentIconGrid summaries={summaries} />,
        fillFoot: true,
      },
      {
        key: "responses",
        label: "Responses received",
        num: responses,
        pill: `${rate}% rate`,
        sub: `${rate}% response rate`,
        visual: () => <RateSlider pct={rate} answered={responses} total={queries.length} groups={groups} median={median} />,
      },
    ];
  }, [queries, agents, activities]);

/* ── renderings ── */

export const StatCardFull: React.FC<{ def: StatDef; onPin: () => void }> = ({ def, onPin }) => (
  <div className="sa-stat" title="Pin to focus" role="button" tabIndex={0}
    onClick={onPin}
    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPin(); } }}
  >
    <div className="sa-cap">{ICONS[def.key]}{def.label}</div>
    <div className="sa-numrow"><span className="sa-num">{def.num}</span><span className="sa-pill">{def.pill}</span></div>
    <div className={`sa-foot${def.fillFoot ? " sa-foot-fill" : ""}`}>{def.visual(46)}</div>
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
      <div className={`sa-ffoot${def.fillFoot ? " sa-foot-fill" : ""}`}>{def.visual(42)}</div>
    </div>
  ),
);
StatFocusPanel.displayName = "StatFocusPanel";
