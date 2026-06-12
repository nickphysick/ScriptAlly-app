/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The four dashboard stat cards (Queries sent / Active queries / Agents / Responses
 * received) — MountCards with bespoke parchment-toned inline-SVG visuals. No chart
 * library. Geometry follows the approved dashboard reference (160×34 strips).
 */
import React from "react";
import { Send, Hourglass, Users, MailOpen } from "lucide-react";
import { MountCard } from "../MountCard";
import {
  burgundy,
  bodyInk,
  labelStyle,
  FONT_SERIF,
  FONT_MONO,
  sageAccent,
  parchment,
} from "../../lib/designTokens";

/* Pill variants beside the numeral */
const pillBase: React.CSSProperties = {
  fontSize: 10,
  borderRadius: 14,
  padding: "3px 9px",
  whiteSpace: "nowrap",
};
const pillBurgundy: React.CSSProperties = {
  ...pillBase,
  color: burgundy,
  background: "#f7ede7",
  border: "0.5px solid #ecdccf",
};
const pillSage: React.CSSProperties = {
  ...pillBase,
  color: "#3f5a3c",
  background: "#e9ede6",
  border: "0.5px solid #d6ddd2",
};
const pillMuted: React.CSSProperties = {
  ...pillBase,
  color: "#8a7a6c",
  background: "#f3ede4",
  border: "0.5px solid #e2d8c8",
};

const CardShell: React.FC<{
  icon: React.ReactNode;
  caption: string;
  value: number | string;
  pill: React.ReactNode;
  children: React.ReactNode;
}> = ({ icon, caption, value, pill, children }) => (
  <MountCard style={{ padding: "18px 20px" }}>
    <div style={{ position: "relative", zIndex: 4 }}>
      <div style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        {icon}
        {caption}
      </div>
      <div className="flex items-baseline gap-[10px]">
        <span style={{ fontFamily: FONT_SERIF, fontSize: 34, fontWeight: 500, color: bodyInk, lineHeight: 1 }}>
          {value}
        </span>
        {pill}
      </div>
      {children}
    </div>
  </MountCard>
);

/* ── 1. Queries sent: weekly bar strokes ─────────────────────────────── */

const QueriesSentCard: React.FC<{ total: number; perWeek: number[]; thisWeek: number }> = ({
  total,
  perWeek,
  thisWeek,
}) => {
  const max = Math.max(...perWeek, 1);
  const olderMax = Math.max(...perWeek.slice(0, 5), 1);
  return (
    <CardShell
      icon={<Send className="w-[13px] h-[13px] shrink-0" style={{ color: burgundy }} strokeWidth={2} />}
      caption="Queries sent"
      value={total}
      pill={<span style={pillBurgundy}>{thisWeek} this week</span>}
    >
      <svg width="100%" height="34" viewBox="0 0 160 34" preserveAspectRatio="none" style={{ marginTop: 10, display: "block" }}>
        {perWeek.map((count, i) => {
          // 4px stub for quiet weeks, up to 28px for the busiest
          const h = count <= 0 ? 4 : 4 + Math.round((count / max) * 24);
          const y = 30 - h;
          const x = 4 + i * 22;
          const fill =
            i === 6 ? "#7c3a2a" : i === 5 ? "#a86a52" : count > 0 && count >= olderMax ? "#d8b8aa" : "#e8d8ca";
          return <rect key={i} x={x} y={y} width="14" height={h} rx="2" fill={fill} />;
        })}
      </svg>
    </CardShell>
  );
};

/* ── 2. Active queries: thin sage trend line ─────────────────────────── */

const ActiveQueriesCard: React.FC<{ count: number; perWeek: number[]; diff: number }> = ({
  count,
  perWeek,
  diff,
}) => {
  const max = Math.max(...perWeek, 1);
  const points = perWeek.map((v, i) => {
    const x = 4 + (i / (perWeek.length - 1)) * 152;
    const y = 28 - (v / max) * 22; // 6..28
    return { x, y };
  });
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const pill =
    diff > 0 ? (
      <span style={pillSage}>+{diff} on last week</span>
    ) : diff < 0 ? (
      <span style={pillBurgundy}>{diff} on last week</span>
    ) : (
      <span style={pillBurgundy}>No change on last week</span>
    );
  return (
    <CardShell
      icon={<Hourglass className="w-[13px] h-[13px] shrink-0" style={{ color: burgundy }} strokeWidth={2} />}
      caption="Active queries"
      value={count}
      pill={pill}
    >
      <svg width="100%" height="34" viewBox="0 0 160 34" preserveAspectRatio="none" style={{ marginTop: 10, display: "block" }}>
        <path d={d} fill="none" stroke={sageAccent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={last.x} cy={last.y} r="3" fill={burgundy} />
      </svg>
    </CardShell>
  );
};

/* ── 3. Agents: person glyph per agent (solid = queried, outline = idle) ── */

/** Small person glyph — geometry from the approved reference (head disc + shoulder arc). */
const PersonGlyph: React.FC<{ queried: boolean }> = ({ queried }) => (
  <svg width="19" height="19" viewBox="0 0 24 24" style={{ verticalAlign: "bottom", flexShrink: 0 }}>
    {queried ? (
      <>
        <circle cx="12" cy="7.2" r="4.4" fill={burgundy} />
        <path d="M3.6 21c.4-4.4 4-7.4 8.4-7.4s8 3 8.4 7.4z" fill={burgundy} />
      </>
    ) : (
      <>
        <circle cx="12" cy="7.2" r="3.7" fill="none" stroke="#cbbcae" strokeWidth="1.5" />
        <path
          d="M4.4 20.3c.4-4 3.7-6.7 7.6-6.7s7.2 2.7 7.6 6.7"
          fill="none"
          stroke="#cbbcae"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </>
    )}
  </svg>
);

const MAX_AGENT_GLYPHS = 12;

const AgentsCard: React.FC<{ total: number; idle: number; queriedFlags: boolean[] }> = ({
  total,
  idle,
  queriedFlags,
}) => {
  const shown = queriedFlags.slice(0, MAX_AGENT_GLYPHS);
  const overflow = queriedFlags.length - shown.length;
  return (
    <CardShell
      icon={<Users className="w-[13px] h-[13px] shrink-0" style={{ color: burgundy }} strokeWidth={2} />}
      caption="Agents"
      value={total}
      pill={<span style={pillMuted}>{idle} idle</span>}
    >
      <div className="flex items-end" style={{ gap: 8, marginTop: 14, minHeight: 20 }}>
        {shown.map((isQueried, i) => (
          <PersonGlyph key={i} queried={isQueried} />
        ))}
        {overflow > 0 && (
          <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: "#8a7a6c", lineHeight: "19px" }}>
            +{overflow}
          </span>
        )}
      </div>
    </CardShell>
  );
};

/* ── 4. Responses received: slim progress inlay ──────────────────────── */

const ResponsesCard: React.FC<{ total: number; ratePct: number }> = ({ total, ratePct }) => {
  const trackW = 152;
  const fillW = Math.max(0, Math.min(trackW, (ratePct / 100) * trackW));
  const markerX = 4 + fillW;
  return (
    <CardShell
      icon={<MailOpen className="w-[13px] h-[13px] shrink-0" style={{ color: burgundy }} strokeWidth={2} />}
      caption="Responses received"
      value={total}
      pill={<span style={pillBurgundy}>{ratePct}% rate</span>}
    >
      <svg width="100%" height="34" viewBox="0 0 160 34" style={{ marginTop: 10, display: "block" }}>
        <rect x="4" y="14" width={trackW} height="7" rx="3.5" fill="#efe5d8" />
        {fillW > 0 && <rect x="4" y="14" width={fillW} height="7" rx="3.5" fill={sageAccent} />}
        <circle cx={Math.max(10, Math.min(150, markerX))} cy="17.5" r="6" fill={parchment} stroke={burgundy} strokeWidth="1.4" />
      </svg>
    </CardShell>
  );
};

/* ── Row ──────────────────────────────────────────────────────────────── */

export interface StatCardsProps {
  queriesSentTotal: number;
  sentPerWeek: number[]; // last 7 weeks, oldest → current
  sentThisWeek: number;
  activeCount: number;
  activePerWeek: number[]; // last 7 weeks, oldest → current
  activeDiff: number;
  agentsTotal: number;
  agentsIdle: number;
  agentQueriedFlags: boolean[]; // display order: queried first
  responsesTotal: number;
  responseRatePct: number;
}

export const StatCards: React.FC<StatCardsProps> = (p) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-[14px]">
    <QueriesSentCard total={p.queriesSentTotal} perWeek={p.sentPerWeek} thisWeek={p.sentThisWeek} />
    <ActiveQueriesCard count={p.activeCount} perWeek={p.activePerWeek} diff={p.activeDiff} />
    <AgentsCard total={p.agentsTotal} idle={p.agentsIdle} queriedFlags={p.agentQueriedFlags} />
    <ResponsesCard total={p.responsesTotal} ratePct={p.responseRatePct} />
  </div>
);
