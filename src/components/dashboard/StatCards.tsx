/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The four dashboard stat cards (Queries sent / Active queries / Agents / Responses
 * received) — MountCards with bespoke parchment-toned inline-SVG visuals. No chart
 * library. Geometry follows the approved dashboard reference (160×34 strips).
 */
import React, { useRef, useState, useLayoutEffect } from "react";
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
  /** Let the visual fill (and centre within) the space beneath the figure row,
   *  rather than pinning it to the bottom edge. Used by the Agents card. */
  fillChildren?: boolean;
}> = ({ icon, caption, value, pill, children, fillChildren }) => (
  // ~25% taller than the original 18px-padded card; the extra room is flexed in
  // between the figure row and the visual strip (chart pinned toward the bottom),
  // rather than padded onto the bottom edge.
  <MountCard style={{ padding: "20px 20px 18px", minHeight: 170, display: "flex", flexDirection: "column" }}>
    <div style={{ position: "relative", zIndex: 4, flex: 1, display: "flex", flexDirection: "column" }}>
      <div>
        <div style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 6, marginBottom: 11 }}>
          {icon}
          {caption}
        </div>
        <div className="flex items-baseline gap-[10px]">
          <span style={{ fontFamily: FONT_SERIF, fontSize: 34, fontWeight: 500, color: bodyInk, lineHeight: 1 }}>
            {value}
          </span>
          {pill}
        </div>
      </div>
      <div style={fillChildren ? { flex: 1, display: "flex", minHeight: 0 } : { marginTop: "auto" }}>{children}</div>
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
          // Height binds to the week's real sent-count, scaled to the busiest week:
          // 4px stub for empty/quiet weeks, up to 28px for the tallest.
          const h = count <= 0 ? 4 : 4 + Math.round((count / max) * 24);
          const y = 30 - h;
          const x = 4 + i * 22;
          // Empty weeks always take the pale track colour so a no-data chart reads as a
          // uniform faint baseline (not two stray dark stubs). Non-empty weeks get the
          // recent-weeks emphasis: latest two burgundy/clay, older peaks a shade deeper.
          const fill =
            count <= 0
              ? "#e8d8ca"
              : i === 6
                ? "#7c3a2a"
                : i === 5
                  ? "#a86a52"
                  : count >= olderMax
                    ? "#d8b8aa"
                    : "#e8d8ca";
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
const PersonGlyph: React.FC<{ queried: boolean; size: number }> = ({ queried, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", flexShrink: 0 }}>
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

// Auto-scale bounds for the person-icon row.
const GLYPH_MIN = 12;
const GLYPH_MAX = 22;
const GLYPH_GAP_RATIO = 0.4; // inter-icon gap ≈ 40% of icon size
const GLYPH_SIDE_PAD = 16; // breathing room each side, inside the card's content padding
const OVERFLOW_LABEL_W = 28; // reserved width for the trailing "+K" mono label

/**
 * The person-icon row, auto-scaled to fit one line within the card. Measures the
 * available inner width with a ResizeObserver (the card resizes with its column) and
 * picks an icon size in [12, 22]: larger for few agents, smaller as the count grows.
 * If even 12px icons can't fit, it shows as many as fit plus a mono "+K" overflow label.
 */
const AgentGlyphRow: React.FC<{ queriedFlags: boolean[] }> = ({ queriedFlags }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setAvail(el.clientWidth - 2 * GLYPH_SIDE_PAD);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = queriedFlags.length;

  let size = GLYPH_MAX;
  let gap = Math.round(GLYPH_MAX * GLYPH_GAP_RATIO);
  let shown = queriedFlags;
  let overflow = 0;

  if (avail > 0 && n > 0) {
    // Conservative fit: counts a trailing gap too, so the row always lands inside `avail`.
    const raw = Math.floor(avail / (n * (1 + GLYPH_GAP_RATIO)));
    if (raw >= GLYPH_MIN) {
      size = Math.min(GLYPH_MAX, raw);
      gap = Math.round(size * GLYPH_GAP_RATIO);
    } else {
      // Too many to fit even at the minimum — show as many 12px icons as fit + "+K".
      size = GLYPH_MIN;
      gap = Math.round(GLYPH_MIN * GLYPH_GAP_RATIO);
      const k = Math.max(0, Math.floor((avail - OVERFLOW_LABEL_W) / (size + gap)));
      shown = queriedFlags.slice(0, k);
      overflow = n - k;
    }
  }

  return (
    <div
      ref={ref}
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingInline: GLYPH_SIDE_PAD,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap }}>
        {shown.map((isQueried, i) => (
          <PersonGlyph key={i} queried={isQueried} size={size} />
        ))}
        {overflow > 0 && (
          <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: "#8a7a6c", whiteSpace: "nowrap" }}>
            +{overflow}
          </span>
        )}
      </div>
    </div>
  );
};

const AgentsCard: React.FC<{ total: number; idle: number; queriedFlags: boolean[] }> = ({
  total,
  idle,
  queriedFlags,
}) => (
  <CardShell
    icon={<Users className="w-[13px] h-[13px] shrink-0" style={{ color: burgundy }} strokeWidth={2} />}
    caption="Agents"
    value={total}
    pill={<span style={pillMuted}>{idle} idle</span>}
    fillChildren
  >
    <AgentGlyphRow queriedFlags={queriedFlags} />
  </CardShell>
);

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
  // Single row of four on desktop (they now share the left column's width). Falls back to
  // 2-up on tablets and below so they never crush; the 14px gap is preserved throughout.
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px] items-stretch">
    <QueriesSentCard total={p.queriesSentTotal} perWeek={p.sentPerWeek} thisWeek={p.sentThisWeek} />
    <ActiveQueriesCard count={p.activeCount} perWeek={p.activePerWeek} diff={p.activeDiff} />
    <AgentsCard total={p.agentsTotal} idle={p.agentsIdle} queriedFlags={p.agentQueriedFlags} />
    <ResponsesCard total={p.responsesTotal} ratePct={p.responseRatePct} />
  </div>
);
