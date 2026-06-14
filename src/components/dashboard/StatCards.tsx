/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The four dashboard stat cards (Queries sent / Active queries / Agents / Responses
 * received) — MountCards with bespoke parchment-toned inline-SVG visuals. No chart
 * library. Two enhancements layered on the approved geometry:
 *  - a faint ghost watermark of each card's own icon, bleeding off the top-right corner;
 *  - branded hover/focus/tap popups on the marks inside each card (a single shared popup,
 *    portaled to <body> so the cards' hover-scale never breaks its fixed positioning).
 */
import React, { useRef, useState, useLayoutEffect, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Send, Hourglass, Users, MailOpen } from "lucide-react";
import { MountCard } from "../MountCard";
import { StatusDot } from "../StatusDot";
import { QueryStatus } from "../../types";
import { STATUS_ORDER } from "../../lib/statusOrder";
import {
  burgundy,
  bodyInk,
  mutedInk,
  labelStyle,
  FONT_SERIF,
  FONT_SANS,
  FONT_MONO,
  sageAccent,
  parchment,
} from "../../lib/designTokens";

/* ── Data shapes (computed in Dashboard, kept consistent with the visuals) ──────────────── */
export interface SentWeekDatum {
  weekLabel: string; // week-commencing date, e.g. "9 Jun"
  count: number;
  queries: { agentName: string; agency: string }[];
}
export interface ActiveWeekDatum {
  label: string; // "Now" | "N weeks ago"
  count: number;
  composition: { status: QueryStatus; count: number }[]; // in STATUS_ORDER, zero counts omitted
}
export interface AgentDatum {
  name: string;
  agency: string;
  queried: boolean;
  genres: string[];
  fit: number; // 0–5 star rating
  mswl: string;
}
export interface ResponsesDatum {
  replied: number;
  total: number;
  ratePct: number;
}

/* ── Pill variants beside the numeral ───────────────────────────────────────────────────── */
const pillBase: React.CSSProperties = { fontSize: 10, borderRadius: 14, padding: "3px 9px", whiteSpace: "nowrap" };
const pillBurgundy: React.CSSProperties = { ...pillBase, color: burgundy, background: "#f7ede7", border: "0.5px solid #ecdccf" };
const pillSage: React.CSSProperties = { ...pillBase, color: "#3f5a3c", background: "#e9ede6", border: "0.5px solid #d6ddd2" };
const pillMuted: React.CSSProperties = { ...pillBase, color: "#8a7a6c", background: "#f3ede4", border: "0.5px solid #e2d8c8" };

/* ── Shared popup controller (cursor-following, flips to stay on-screen, pointer-events none) ── */
interface PopApi {
  show: (node: React.ReactNode, x: number, y: number) => void;
  move: (x: number, y: number) => void;
  hide: () => void;
  pin: (node: React.ReactNode, x: number, y: number) => void; // for tap/keyboard (sticky until dismissed)
}

const usePopupController = (): { api: PopApi; portal: React.ReactNode } => {
  const [content, setContent] = useState<React.ReactNode>(null);
  const elRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(false);

  const positionAt = useCallback((clientX: number, clientY: number) => {
    const el = elRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = clientX - r.width / 2;
    left = Math.max(8, Math.min(left, vw - r.width - 8));
    let top = clientY + 16;
    if (top + r.height > vh - 8) top = clientY - r.height - 16; // flip above
    if (top < 8) top = 8;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.visibility = "visible";
  }, []);

  const show = useCallback((node: React.ReactNode, x: number, y: number) => {
    if (pinnedRef.current) return;
    setContent(node);
    requestAnimationFrame(() => positionAt(x, y));
  }, [positionAt]);
  const move = useCallback((x: number, y: number) => { if (!pinnedRef.current) positionAt(x, y); }, [positionAt]);
  const hide = useCallback(() => { if (!pinnedRef.current) setContent(null); }, []);
  const pin = useCallback((node: React.ReactNode, x: number, y: number) => {
    pinnedRef.current = true;
    setContent(node);
    requestAnimationFrame(() => positionAt(x, y));
  }, [positionAt]);

  // Tap/click anywhere dismisses a pinned popup (marks stopPropagation so their own tap survives).
  useEffect(() => {
    const onDocPointer = () => { pinnedRef.current = false; setContent(null); };
    document.addEventListener("click", onDocPointer);
    return () => document.removeEventListener("click", onDocPointer);
  }, []);

  const portal =
    content !== null && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={elRef}
            role="tooltip"
            style={{ position: "fixed", left: 0, top: 0, visibility: "hidden", zIndex: 1000, pointerEvents: "none" }}
          >
            <div
              className="sc-pop"
              style={{
                position: "relative",
                maxWidth: 250,
                background: "#fdfaf5",
                borderRadius: 11,
                boxShadow: "0 2px 5px rgba(58,28,20,0.10), 0 12px 30px rgba(58,28,20,0.22)",
                padding: "11px 13px",
                fontFamily: FONT_SANS,
              }}
            >
              <span aria-hidden="true" style={{ position: "absolute", inset: 4, border: "1px solid rgba(124,58,42,0.28)", borderRadius: 8, pointerEvents: "none" }} />
              <div style={{ position: "relative" }}>{content}</div>
            </div>
          </div>,
          document.body
        )
      : null;

  return { api: { show, move, hide, pin }, portal };
};

/* Wire a mark's hover / move / leave / focus / blur / tap to the shared popup. */
const markHandlers = (pop: PopApi, build: () => React.ReactNode, onEnter?: () => void, onLeave?: () => void) => ({
  tabIndex: 0,
  role: "button" as const,
  onMouseEnter: (e: React.MouseEvent) => { onEnter?.(); pop.show(build(), e.clientX, e.clientY); },
  onMouseMove: (e: React.MouseEvent) => pop.move(e.clientX, e.clientY),
  onMouseLeave: () => { onLeave?.(); pop.hide(); },
  onFocus: (e: React.FocusEvent) => { onEnter?.(); const r = (e.currentTarget as Element).getBoundingClientRect(); pop.show(build(), r.left + r.width / 2, r.top); },
  onBlur: () => { onLeave?.(); pop.hide(); },
  onClick: (e: React.MouseEvent) => { e.stopPropagation(); const r = (e.currentTarget as Element).getBoundingClientRect(); pop.pin(build(), r.left + r.width / 2, r.top); },
});

/* ── Popup building blocks (branded) ────────────────────────────────────────────────────── */
const chipStyleFor = (variant: "burgundy" | "sage" | "muted"): React.CSSProperties => ({
  fontFamily: FONT_MONO,
  fontSize: 9,
  letterSpacing: "0.04em",
  padding: "3px 8px",
  borderRadius: 999,
  whiteSpace: "nowrap",
  ...(variant === "sage"
    ? { background: "#e9ede6", color: "#5a6e58" }
    : variant === "muted"
      ? { background: "#f3ede4", color: "#8a7a6c" }
      : { background: "#f7ede7", color: burgundy }),
});

const PopupCard: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  chip: React.ReactNode;
  chipVariant?: "burgundy" | "sage" | "muted";
  children?: React.ReactNode;
}> = ({ title, subtitle, chip, chipVariant = "burgundy", children }) => (
  <>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingBottom: 8, borderBottom: "0.5px solid #ece0d2" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: FONT_SERIF, fontSize: 14, fontWeight: 600, color: bodyInk, lineHeight: 1.2 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: "#6a7e68", marginTop: 1 }}>{subtitle}</div>}
      </div>
      <span style={{ ...chipStyleFor(chipVariant), flexShrink: 0 }}>{chip}</span>
    </div>
    {children && <div style={{ paddingTop: 8 }}>{children}</div>}
  </>
);

const PLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9c8878", margin: "0 0 6px" }}>{children}</div>
);

const PStat: React.FC<{ k: React.ReactNode; v: React.ReactNode }> = ({ k, v }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "3px 0", fontSize: 12 }}>
    <span style={{ color: mutedInk }}>{k}</span>
    <span style={{ color: bodyInk, fontWeight: 500, textAlign: "right" }}>{v}</span>
  </div>
);

const FitStars: React.FC<{ fit: number }> = ({ fit }) => (
  <span aria-label={`${fit} of 5`}>
    <span style={{ color: burgundy, letterSpacing: "1px" }}>{"★".repeat(Math.max(0, Math.min(5, fit)))}</span>
    <span style={{ color: "#e0cdbf", letterSpacing: "1px" }}>{"★".repeat(Math.max(0, 5 - fit))}</span>
  </span>
);

/* ── Scoped CSS: card-grow hover, dot reveal, popup animation, reduced-motion ────────────── */
const SC_CSS = `
.stat-card { transition: transform 0.28s ease; }
.stat-card:hover { transform: scale(1.012); }
.sc-active-dot { opacity: 0; transition: opacity 0.18s ease; }
.stat-card:hover .sc-active-dot, .stat-card:focus-within .sc-active-dot { opacity: 1; }
.sc-pop { animation: sc-pop-in 0.15s ease both; }
@keyframes sc-pop-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) {
  .stat-card { transition: none; }
  .stat-card:hover { transform: none; }
  .sc-pop { animation: none; }
}
`;

/* ── Card shell: watermark + 42px numeral + inline pill ─────────────────────────────────── */
const CardShell: React.FC<{
  icon: React.ReactNode;
  watermark: React.ReactNode;
  caption: string;
  value: number | string;
  pill: React.ReactNode;
  children: React.ReactNode;
  fillChildren?: boolean;
}> = ({ icon, watermark, caption, value, pill, children, fillChildren }) => (
  <MountCard className="stat-card" style={{ padding: "20px 20px 18px", minHeight: 170, display: "flex", flexDirection: "column", overflow: "hidden" }}>
    {/* Ghost watermark — the card's own icon, fully contained in the upper-right (non-negative
        offsets clear the inset mount frame by ~10px), a calm element behind the numeral. It stays
        inside without relying on overflow:hidden (which remains only as a safety net). */}
    <div aria-hidden="true" style={{ position: "absolute", right: 16, top: 16, color: burgundy, opacity: 0.07, zIndex: 0, pointerEvents: "none", lineHeight: 0 }}>
      {watermark}
    </div>
    <div style={{ position: "relative", zIndex: 4, flex: 1, display: "flex", flexDirection: "column" }}>
      <div>
        <div style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 6, marginBottom: 11 }}>
          {icon}
          {caption}
        </div>
        {/* numeral + pill on one row, vertically centred */}
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <span style={{ fontFamily: FONT_SERIF, fontSize: 42, fontWeight: 500, color: bodyInk, lineHeight: 1 }}>{value}</span>
          {pill}
        </div>
      </div>
      <div style={fillChildren ? { flex: 1, display: "flex", minHeight: 0 } : { marginTop: "auto" }}>{children}</div>
    </div>
  </MountCard>
);

/* ── 1. Queries sent: weekly bars (hover a bar → that week's agents) ─────────────────────── */
const QueriesSentCard: React.FC<{ total: number; thisWeek: number; weeks: SentWeekDatum[]; pop: PopApi }> = ({ total, thisWeek, weeks, pop }) => {
  const [hoverBar, setHoverBar] = useState<number | null>(null);
  const counts = weeks.map((w) => w.count);
  const max = Math.max(...counts, 1);
  const olderMax = Math.max(...counts.slice(0, 5), 1);

  const barPopup = (i: number) => {
    const w = weeks[i];
    return (
      <PopupCard title={`w/c ${w.weekLabel}`} chip={`${w.count} sent`} chipVariant="burgundy">
        {w.count === 0 ? (
          <div style={{ fontSize: 12, color: mutedInk, fontStyle: "italic" }}>No queries sent this week.</div>
        ) : (
          <>
            <PLabel>Queried this week</PLabel>
            {w.queries.map((q, k) => (
              <div key={k} style={{ padding: "3px 0" }}>
                <div style={{ fontFamily: FONT_SERIF, fontSize: 13, color: bodyInk, lineHeight: 1.25 }}>{q.agentName}</div>
                {q.agency && <div style={{ fontSize: 11, color: "#6a7e68" }}>{q.agency}</div>}
              </div>
            ))}
          </>
        )}
      </PopupCard>
    );
  };

  return (
    <CardShell
      icon={<Send className="w-[13px] h-[13px] shrink-0" style={{ color: burgundy }} strokeWidth={2} />}
      watermark={<Send size={72} strokeWidth={1.5} />}
      caption="Queries sent"
      value={total}
      pill={<span style={pillBurgundy}>{thisWeek} this week</span>}
    >
      <svg width="100%" height="34" viewBox="0 0 160 34" preserveAspectRatio="none" style={{ marginTop: 10, display: "block", overflow: "visible" }}>
        {weeks.map((w, i) => {
          const count = w.count;
          const h = count <= 0 ? 4 : 4 + Math.round((count / max) * 24);
          const y = 30 - h;
          const x = 4 + i * 22;
          const fill =
            count <= 0 ? "#e8d8ca" : i === 6 ? "#7c3a2a" : i === 5 ? "#a86a52" : count >= olderMax ? "#d8b8aa" : "#e8d8ca";
          const dim = hoverBar !== null && hoverBar !== i;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width="14"
              height={h}
              rx="2"
              fill={fill}
              aria-label={`Week commencing ${w.weekLabel}: ${count} ${count === 1 ? "query" : "queries"} sent`}
              style={{
                cursor: "pointer",
                pointerEvents: "all",
                opacity: dim ? 0.4 : 1,
                transformBox: "fill-box",
                transformOrigin: "bottom",
                transform: hoverBar === i ? "scaleY(1.05)" : "none",
                transition: "opacity 0.15s ease, transform 0.15s ease",
              }}
              {...markHandlers(pop, () => barPopup(i), () => setHoverBar(i), () => setHoverBar(null))}
            />
          );
        })}
      </svg>
    </CardShell>
  );
};

/* ── 2. Active queries: trend line (hover a point → status breakdown) ────────────────────── */
const ActiveQueriesCard: React.FC<{ count: number; diff: number; weeks: ActiveWeekDatum[]; pop: PopApi }> = ({ count, diff, weeks, pop }) => {
  const values = weeks.map((w) => w.count);
  const max = Math.max(...values, 1);
  const points = values.map((v, i) => {
    const x = 4 + (i / (values.length - 1)) * 152;
    const y = 28 - (v / max) * 22;
    return { x, y };
  });
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const pill =
    diff > 0 ? <span style={pillSage}>+{diff} on last week</span> : diff < 0 ? <span style={pillBurgundy}>{diff} on last week</span> : <span style={pillBurgundy}>No change on last week</span>;

  const pointPopup = (i: number) => {
    const w = weeks[i];
    return (
      <PopupCard title={w.label} chip={`${w.count} active`} chipVariant="sage">
        <PLabel>Status breakdown</PLabel>
        {w.composition.length === 0 ? (
          <div style={{ fontSize: 12, color: mutedInk, fontStyle: "italic" }}>No active queries.</div>
        ) : (
          w.composition.map((c) => (
            <div key={c.status} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "3px 0" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                <StatusDot status={c.status} size={13} />
                <span style={{ fontSize: 12, color: bodyInk }}>{c.status}</span>
              </span>
              <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: bodyInk }}>{c.count}</span>
            </div>
          ))
        )}
      </PopupCard>
    );
  };

  return (
    <CardShell
      icon={<Hourglass className="w-[13px] h-[13px] shrink-0" style={{ color: burgundy }} strokeWidth={2} />}
      watermark={<Hourglass size={70} strokeWidth={1.5} />}
      caption="Active queries"
      value={count}
      pill={pill}
    >
      <svg width="100%" height="34" viewBox="0 0 160 34" preserveAspectRatio="none" style={{ marginTop: 10, display: "block", overflow: "visible" }}>
        <path d={d} fill="none" stroke={sageAccent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((pt, i) => (
          <g key={i}>
            {/* visible dot — revealed on card hover/focus (CSS) */}
            <circle className="sc-active-dot" cx={pt.x} cy={pt.y} r={i === points.length - 1 ? 3 : 2.5} fill={i === points.length - 1 ? burgundy : sageAccent} style={{ pointerEvents: "none" }} />
            {/* generous invisible hit target */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r="9"
              fill="#000"
              opacity="0"
              aria-label={`${weeks[i].label}: ${weeks[i].count} active`}
              style={{ cursor: "pointer", pointerEvents: "all" }}
              {...markHandlers(pop, () => pointPopup(i))}
            />
          </g>
        ))}
      </svg>
    </CardShell>
  );
};

/* ── 3. Agents: person glyph per agent (hover one → that agent) ──────────────────────────── */
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
        <path d="M4.4 20.3c.4-4 3.7-6.7 7.6-6.7s7.2 2.7 7.6 6.7" fill="none" stroke="#cbbcae" strokeWidth="1.5" strokeLinecap="round" />
      </>
    )}
  </svg>
);

const GLYPH_MIN = 12;
const GLYPH_MAX = 22;
const GLYPH_GAP_RATIO = 0.4;
const GLYPH_SIDE_PAD = 16;
const OVERFLOW_LABEL_W = 28;

const agentPopup = (a: AgentDatum): React.ReactNode => {
  if (a.queried) {
    return (
      <PopupCard title={a.name} subtitle={a.agency || undefined} chip="Queried" chipVariant="sage">
        {a.genres.length > 0 && <PStat k="Seeking" v={a.genres.join(", ")} />}
        {a.fit > 0 && <PStat k="Your fit" v={<FitStars fit={a.fit} />} />}
        {a.mswl.trim() && (
          <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 12, color: "#6a5a50", borderLeft: "2px solid #d8c2b6", paddingLeft: 9, marginTop: 9, lineHeight: 1.45 }}>
            “{a.mswl.trim()}”
          </div>
        )}
      </PopupCard>
    );
  }
  return (
    <PopupCard title={a.agency || "Idle agent"} chip="Idle" chipVariant="muted">
      <div style={{ fontSize: 12, color: mutedInk }}>Not yet queried</div>
    </PopupCard>
  );
};

const AgentGlyphRow: React.FC<{ agents: AgentDatum[]; pop: PopApi }> = ({ agents, pop }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState(0);
  const [hoverAgent, setHoverAgent] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setAvail(el.clientWidth - 2 * GLYPH_SIDE_PAD);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = agents.length;
  let size = GLYPH_MAX;
  let gap = Math.round(GLYPH_MAX * GLYPH_GAP_RATIO);
  let shown = agents;
  let overflow = 0;

  if (avail > 0 && n > 0) {
    const raw = Math.floor(avail / (n * (1 + GLYPH_GAP_RATIO)));
    if (raw >= GLYPH_MIN) {
      size = Math.min(GLYPH_MAX, raw);
      gap = Math.round(size * GLYPH_GAP_RATIO);
    } else {
      size = GLYPH_MIN;
      gap = Math.round(GLYPH_MIN * GLYPH_GAP_RATIO);
      const k = Math.max(0, Math.floor((avail - OVERFLOW_LABEL_W) / (size + gap)));
      shown = agents.slice(0, k);
      overflow = n - k;
    }
  }

  return (
    <div ref={ref} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", paddingInline: GLYPH_SIDE_PAD }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap }}>
        {shown.map((a, i) => (
          <span
            key={i}
            aria-label={a.queried ? `${a.name}${a.agency ? `, ${a.agency}` : ""} — queried` : `${a.agency || "Agent"} — not yet queried`}
            style={{
              display: "inline-flex",
              cursor: "pointer",
              opacity: hoverAgent !== null && hoverAgent !== i ? 0.4 : 1,
              transform: hoverAgent === i ? "translateY(-3px) scale(1.12)" : "none",
              transition: "opacity 0.15s ease, transform 0.15s ease",
              borderRadius: 4,
            }}
            {...markHandlers(pop, () => agentPopup(a), () => setHoverAgent(i), () => setHoverAgent(null))}
          >
            <PersonGlyph queried={a.queried} size={size} />
          </span>
        ))}
        {overflow > 0 && <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: "#8a7a6c", whiteSpace: "nowrap" }}>+{overflow}</span>}
      </div>
    </div>
  );
};

const AgentsCard: React.FC<{ total: number; idle: number; agents: AgentDatum[]; pop: PopApi }> = ({ total, idle, agents, pop }) => (
  <CardShell
    icon={<Users className="w-[13px] h-[13px] shrink-0" style={{ color: burgundy }} strokeWidth={2} />}
    watermark={<Users size={64} strokeWidth={1.5} />}
    caption="Agents"
    value={total}
    pill={<span style={pillMuted}>{idle} idle</span>}
    fillChildren
  >
    <AgentGlyphRow agents={agents} pop={pop} />
  </CardShell>
);

/* ── 4. Responses received: progress track (hover the track → replied / awaiting) ────────── */
const ResponsesCard: React.FC<{ responses: ResponsesDatum; pop: PopApi }> = ({ responses, pop }) => {
  const { replied, total, ratePct } = responses;
  const [hover, setHover] = useState(false);
  const trackW = 152;
  const fillW = Math.max(0, Math.min(trackW, (ratePct / 100) * trackW));
  const markerX = 4 + fillW;
  const halfX = 4 + trackW / 2;

  const trackPopup = () => (
    <PopupCard title="Response rate" chip={`${ratePct}%`} chipVariant="burgundy">
      <PStat k="Replied" v={`${replied} of ${total}`} />
      <PStat k="Awaiting" v={`${Math.max(0, total - replied)}`} />
    </PopupCard>
  );

  return (
    <CardShell
      icon={<MailOpen className="w-[13px] h-[13px] shrink-0" style={{ color: burgundy }} strokeWidth={2} />}
      watermark={<MailOpen size={66} strokeWidth={1.5} />}
      caption="Responses received"
      value={replied}
      pill={<span style={pillBurgundy}>{ratePct}% rate</span>}
    >
      <svg width="100%" height="34" viewBox="0 0 160 34" style={{ marginTop: 10, display: "block", overflow: "visible" }}>
        <rect x="4" y="14" width={trackW} height="7" rx="3.5" fill="#efe5d8" />
        {fillW > 0 && <rect x="4" y="14" width={fillW} height="7" rx="3.5" fill={sageAccent} />}
        {/* faint dashed 50% reference tick, fades in on hover */}
        <line x1={halfX} y1="9" x2={halfX} y2="26" stroke={burgundy} strokeWidth="1" strokeDasharray="2 2" style={{ opacity: hover ? 0.35 : 0, transition: "opacity 0.18s ease" }} />
        <circle
          cx={Math.max(10, Math.min(150, markerX))}
          cy="17.5"
          r="6"
          fill={parchment}
          stroke={burgundy}
          strokeWidth="1.4"
          style={{ transformBox: "fill-box", transformOrigin: "center", transform: hover ? "scale(1.25)" : "none", transition: "transform 0.18s ease" }}
        />
        {/* invisible full-track hit target */}
        <rect
          x="0"
          y="6"
          width="160"
          height="22"
          fill="#000"
          opacity="0"
          aria-label={`Response rate ${ratePct}%: ${replied} of ${total} replied`}
          style={{ cursor: "pointer", pointerEvents: "all" }}
          {...markHandlers(pop, trackPopup, () => setHover(true), () => setHover(false))}
        />
      </svg>
    </CardShell>
  );
};

/* ── Row ────────────────────────────────────────────────────────────────────────────────── */
export interface StatCardsProps {
  queriesSentTotal: number;
  sentThisWeek: number;
  sentWeeks: SentWeekDatum[]; // last 7 weeks, oldest → current
  activeCount: number;
  activeDiff: number;
  activeWeeks: ActiveWeekDatum[]; // last 7 weeks, oldest → current
  agentsTotal: number;
  agentsIdle: number;
  agents: AgentDatum[]; // display order: queried first
  responses: ResponsesDatum;
}

export const StatCards: React.FC<StatCardsProps> = (p) => {
  const { api, portal } = usePopupController();
  return (
    <>
      <style>{SC_CSS}</style>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px] items-stretch">
        <QueriesSentCard total={p.queriesSentTotal} thisWeek={p.sentThisWeek} weeks={p.sentWeeks} pop={api} />
        <ActiveQueriesCard count={p.activeCount} diff={p.activeDiff} weeks={p.activeWeeks} pop={api} />
        <AgentsCard total={p.agentsTotal} idle={p.agentsIdle} agents={p.agents} pop={api} />
        <ResponsesCard responses={p.responses} pop={api} />
      </div>
      {portal}
    </>
  );
};
