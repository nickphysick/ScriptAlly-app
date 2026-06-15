/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fortnight in Focus — a two-week calendar grid (7 days behind + today, then the next 7) with a
 * day-detail pane. Replaces the old flat "Last 7 days / Coming up" lists.
 *
 * Derived-over-stored: every event is read from the derived model — query fields written by
 * recomputeQuery (dateSent / partial+full sent+requested dates / responseDeadline / nudgeDate /
 * the closed-response timestamps) and the activity log for the two entity-added markers. No stored
 * fields are added and nothing is written back.
 *
 * Markers reuse the canonical StatusDot for every status-bearing event (same glyph the timeline
 * draws) and three literal lucide icons for the entity actions (agent added, query sent, manuscript
 * added). The urgency badge is a separate attention layer derived from the event's semantics.
 */
import React, { useMemo, useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Query, Agent, Manuscript, Activity, QueryStatus, ActivityType } from "../../types";
import { StatusDot } from "../StatusDot";
import { extractAgentFromText } from "../../lib/activityUtils";
import { Calendar, UserRound, Send, BookOpen, ArrowRight } from "lucide-react";
import {
  parchment,
  PAPER_TEXTURE,
  mountShadow,
  insetBorder,
  sageBandGradient,
  sageBandRule,
  sageText,
  headingInk,
  bodyInk,
  mutedInk,
  burgundy,
  FONT_SERIF,
  FONT_SANS,
  FONT_MONO,
} from "../../lib/designTokens";

const AMBER = "#b8860b"; // upcoming-deadline badge (outlined ring) — distinct hue + shape from the burgundy elapsed disc

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayDiff = (a: Date, b: Date) => Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);
const dayKey = (d: Date) => startOfDay(d).getTime();
const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
const fmtDayMonth = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;

/** Firestore Timestamp | ISO string | Date → Date | null. */
const coerceDate = (v: any): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "string") { const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
  if (typeof v.seconds === "number") return new Date(v.seconds * 1000);
  if (typeof v.toDate === "function") { try { return v.toDate(); } catch { return null; } }
  return null;
};

// ── Event model ──────────────────────────────────────────────────────────────
type FType =
  | "sent"
  | "partial_sent"
  | "full_sent"
  | "pages_requested"           // agent requested partial/full, writer hasn't sent (request logged)
  | "pages_due"                 // a requested partial/full is due to send (future)
  | "pages_overdue"             // a requested partial/full was due and is unsent (past)
  | "expected_upcoming"         // response window closing — today/future
  | "expected_overdue"          // response window passed
  | "nudge"                     // follow-up reminder scheduled
  | "response_received"         // offer / rejection / withdrawn / no-response recorded
  | "agent_added"
  | "manuscript_added";

type Urgency = "elapsed" | "upcoming" | "neutral";
type Marker = { kind: "status"; status: QueryStatus } | { kind: "icon"; icon: "agent" | "query" | "manuscript" };

interface FEvent {
  id: string;
  type: FType;
  date: Date;
  queryId?: string;
  title: string;        // headline — agent name or manuscript title
  agency?: string;
  manuscript?: string;
  line: string;         // the activity line
  marker: Marker;
  urgency: Urgency;
  cta?: { label: string; urgent: boolean };
}

/** Single source of truth: an event type's urgency class. */
const URGENCY_BY_TYPE: Record<FType, Urgency> = {
  sent: "neutral",
  partial_sent: "neutral",
  full_sent: "neutral",
  pages_requested: "neutral",
  pages_due: "upcoming",
  pages_overdue: "elapsed",
  expected_upcoming: "upcoming",
  expected_overdue: "elapsed",
  nudge: "upcoming",
  response_received: "neutral",
  agent_added: "neutral",
  manuscript_added: "neutral",
};

/** The requested-materials status for a query in a pages_* event (mirrors the pipeline's mapping). */
const requestStatus = (q: Query): QueryStatus => {
  if (q.status === QueryStatus.PARTIAL_REQUESTED || q.status === QueryStatus.PARTIAL_SENT) return QueryStatus.PARTIAL_REQUESTED;
  if (q.status === QueryStatus.FULL_REQUESTED || q.status === QueryStatus.FULL_SENT) return QueryStatus.FULL_REQUESTED;
  if (q.status === QueryStatus.REVISE_RESUBMIT) return QueryStatus.REVISE_RESUBMIT;
  return q.fullRequestedDate ? QueryStatus.FULL_REQUESTED : QueryStatus.PARTIAL_REQUESTED;
};

/** Single source of truth: an event type → its marker (StatusDot status, or one of the three icons). */
const markerFor = (type: FType, q?: Query): Marker => {
  switch (type) {
    case "sent": return { kind: "icon", icon: "query" };
    case "agent_added": return { kind: "icon", icon: "agent" };
    case "manuscript_added": return { kind: "icon", icon: "manuscript" };
    case "partial_sent": return { kind: "status", status: QueryStatus.PARTIAL_SENT };
    case "full_sent": return { kind: "status", status: QueryStatus.FULL_SENT };
    case "pages_requested":
    case "pages_due":
    case "pages_overdue": return { kind: "status", status: q ? requestStatus(q) : QueryStatus.PARTIAL_REQUESTED };
    // expected_*, nudge, response_received → the query's own derived status
    default: return { kind: "status", status: (q?.status as QueryStatus) ?? QueryStatus.QUERIED };
  }
};

const renderMarker = (m: Marker, size: number) => {
  if (m.kind === "status") return <StatusDot status={m.status} size={size} />;
  const Icon = m.icon === "agent" ? UserRound : m.icon === "query" ? Send : BookOpen;
  return <Icon style={{ width: size, height: size, color: burgundy, flexShrink: 0 }} strokeWidth={2} aria-hidden="true" />;
};

const usePrefersReducedMotion = () => {
  const [reduce, setReduce] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const f = () => setReduce(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return reduce;
};

export interface FortnightInFocusProps {
  queries: Query[];
  agents: Agent[];
  manuscripts: Manuscript[];
  activities: Activity[];
  isMagazineLayout: boolean;
  onOpenQuery: (queryId: string) => void;
  onOpenFullCalendar: () => void;
}

export const FortnightInFocus: React.FC<FortnightInFocusProps> = ({
  queries,
  agents,
  manuscripts,
  activities,
  isMagazineLayout,
  onOpenQuery,
  onOpenFullCalendar,
}) => {
  const reduce = usePrefersReducedMotion();
  const today = useMemo(() => startOfDay(new Date()), []);

  // 14-day window: today-6 … today+7. Index 6 is today (last cell of the top row).
  const days = useMemo(() => {
    const arr: Date[] = [];
    for (let i = -6; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [today]);
  const TODAY_IDX = 6;

  const agentName = useCallback((q: Query) => agents.find((a) => a.id === q.agentId)?.name || "The agent", [agents]);
  const agentAgency = useCallback((q: Query) => agents.find((a) => a.id === q.agentId)?.agency || "", [agents]);
  const msTitle = useCallback((q: Query) => manuscripts.find((m) => m.id === q.manuscriptId)?.title || "", [manuscripts]);

  const events = useMemo<FEvent[]>(() => {
    const out: FEvent[] = [];
    const inWindow = (d: Date | null) => !!d && dayDiff(d, today) >= -6 && dayDiff(d, today) <= 7;

    const ctaFor = (type: FType, urgent: boolean): FEvent["cta"] | undefined => {
      switch (type) {
        case "pages_requested":
        case "pages_due":
        case "pages_overdue": return { label: "Send", urgent };
        case "expected_upcoming":
        case "expected_overdue":
        case "nudge": return { label: "Nudge", urgent };
        case "sent":
        case "partial_sent":
        case "full_sent":
        case "response_received": return { label: "Open", urgent: false };
        default: return undefined; // entity-added: informational, no CTA
      }
    };

    const pushQuery = (q: Query, type: FType, date: Date, line: string) => {
      if (!inWindow(date)) return;
      const urgency = URGENCY_BY_TYPE[type];
      out.push({
        id: `${q.id}-${type}-${dayKey(date)}`,
        type,
        date,
        queryId: q.id,
        title: agentName(q),
        agency: agentAgency(q),
        manuscript: msTitle(q),
        line,
        marker: markerFor(type, q),
        urgency,
        cta: ctaFor(type, urgency !== "neutral"),
      });
    };

    queries.forEach((q) => {
      // Query sent (entity action → Send icon)
      const sent = coerceDate(q.dateSent);
      if (sent) pushQuery(q, "sent", sent, "Query sent");

      // Materials sent — past confirmations
      const ps = coerceDate(q.partialSentDate);
      if (ps) pushQuery(q, "partial_sent", ps, "Partial sent");
      const fs = coerceDate(q.fullSentDate);
      if (fs) pushQuery(q, "full_sent", fs, "Full sent");

      // Agent requested pages, writer hasn't sent them yet
      const awaitingSend =
        (q.status === QueryStatus.PARTIAL_REQUESTED && !q.partialSentDate) ||
        (q.status === QueryStatus.FULL_REQUESTED && !q.fullSentDate) ||
        (q.status === QueryStatus.REVISE_RESUBMIT && !q.partialSentDate && !q.fullSentDate);

      if (awaitingSend) {
        const reqStatus = requestStatus(q);
        const reqLabel = reqStatus === QueryStatus.FULL_REQUESTED ? "Full requested" : reqStatus === QueryStatus.REVISE_RESUBMIT ? "Revise & resubmit" : "Partial requested";
        const sendLabel = reqStatus === QueryStatus.FULL_REQUESTED ? "full" : reqStatus === QueryStatus.REVISE_RESUBMIT ? "revision" : "partial";
        const reqDate = coerceDate(
          q.status === QueryStatus.PARTIAL_REQUESTED ? (q.partialRequestedDate || q.dateSent)
          : q.status === QueryStatus.FULL_REQUESTED ? (q.fullRequestedDate || q.dateSent)
          : (q.fullRequestedDate || q.partialRequestedDate || q.dateSent)
        );
        if (reqDate) pushQuery(q, "pages_requested", reqDate, reqLabel);

        const due = coerceDate(q.expectedSendDate || q.responseDeadline);
        if (due) {
          const diff = dayDiff(due, today);
          if (diff >= 1) pushQuery(q, "pages_due", due, `Send the ${sendLabel} by ${fmtDayMonth(due)}`);
          else if (diff < 0) pushQuery(q, "pages_overdue", due, `The ${sendLabel} was due ${fmtDayMonth(due)}`);
        }
      }

      // Response window — only for still-open queries that aren't mid-send
      const isOpen =
        q.status !== QueryStatus.OFFER && q.status !== QueryStatus.REJECTED &&
        q.status !== QueryStatus.WITHDRAWN && q.status !== QueryStatus.NO_RESPONSE;
      if (isOpen && !awaitingSend) {
        const deadline = coerceDate(q.responseDeadline);
        if (deadline) {
          const diff = dayDiff(deadline, today);
          if (diff >= 0) pushQuery(q, "expected_upcoming", deadline, diff === 0 ? "Response expected today" : `Response expected ${fmtDayMonth(deadline)}`);
          else pushQuery(q, "expected_overdue", deadline, `Response was expected ${fmtDayMonth(deadline)}`);
        }
      }

      // Follow-up reminder
      const nudge = coerceDate(q.nudgeDate);
      if (nudge && dayDiff(nudge, today) >= 0) pushQuery(q, "nudge", nudge, "Follow-up reminder");

      // Response recorded (offer / rejection / withdrawn / no-response)
      const isClosed = [QueryStatus.OFFER, QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE].includes(q.status);
      if (isClosed) {
        const resp = coerceDate((q as any).responseReceivedAt || (q as any).lastStatusChange);
        if (resp) {
          const label =
            q.status === QueryStatus.OFFER ? "Offer received" :
            q.status === QueryStatus.REJECTED ? "Rejection received" :
            q.status === QueryStatus.WITHDRAWN ? "Withdrawn" : "Closed — no response";
          pushQuery(q, "response_received", resp, label);
        }
      }
    });

    // Entity-added markers from the activity log (the two non-query icons)
    activities.forEach((act) => {
      const d = coerceDate(act.date);
      if (!inWindow(d) || !d) return;
      if (act.activityType === ActivityType.AGENT_ADDED) {
        const parsed = extractAgentFromText(act.description);
        out.push({
          id: `agentadd-${act.id}`,
          type: "agent_added",
          date: d,
          title: parsed?.name || "New agent",
          agency: parsed?.agency || "",
          line: "Agent added",
          marker: markerFor("agent_added"),
          urgency: "neutral",
        });
      } else if (act.activityType === ActivityType.MANUSCRIPT_ADDED) {
        const title = manuscripts.find((m) => m.id === act.manuscriptId)?.title || "New manuscript";
        out.push({
          id: `msadd-${act.id}`,
          type: "manuscript_added",
          date: d,
          title,
          line: "Manuscript added",
          marker: markerFor("manuscript_added"),
          urgency: "neutral",
        });
      }
    });

    return out;
  }, [queries, agents, manuscripts, activities, today, agentName, agentAgency, msTitle]);

  // Group by day + neutral count totals per half (activity volume only).
  const { byDay, lastWeekCount, comingUpCount } = useMemo(() => {
    const map = new Map<number, FEvent[]>();
    let lw = 0, cu = 0;
    for (const ev of events) {
      const k = dayKey(ev.date);
      (map.get(k) ?? map.set(k, []).get(k)!).push(ev);
      const diff = dayDiff(ev.date, today);
      if (diff >= -6 && diff <= 0) lw++;
      else if (diff >= 1 && diff <= 7) cu++;
    }
    return { byDay: map, lastWeekCount: lw, comingUpCount: cu };
  }, [events, today]);

  const eventsOn = useCallback((d: Date) => byDay.get(dayKey(d)) ?? [], [byDay]);
  const badgeFor = useCallback((d: Date): Urgency | null => {
    const evs = eventsOn(d);
    if (evs.some((e) => e.urgency === "elapsed")) return "elapsed"; // elapsed wins
    if (evs.some((e) => e.urgency === "upcoming")) return "upcoming";
    return null;
  }, [eventsOn]);

  // ── Selection + keyboard roving focus ───────────────────────────────────────
  const [selectedIdx, setSelectedIdx] = useState(TODAY_IDX);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const moveTo = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(13, idx));
    setSelectedIdx(clamped);
    requestAnimationFrame(() => cellRefs.current[clamped]?.focus());
  }, []);
  const onCellKeyDown = (e: React.KeyboardEvent, idx: number) => {
    switch (e.key) {
      case "ArrowLeft": e.preventDefault(); moveTo(idx - 1); break;
      case "ArrowRight": e.preventDefault(); moveTo(idx + 1); break;
      case "ArrowUp": e.preventDefault(); moveTo(idx - 7); break;
      case "ArrowDown": e.preventDefault(); moveTo(idx + 7); break;
      case "Enter":
      case " ": e.preventDefault(); setSelectedIdx(idx); break;
    }
  };

  // ── Hover/focus preview popover ──────────────────────────────────────────────
  const popRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<number | undefined>(undefined);
  const [preview, setPreview] = useState<number | null>(null);
  const [popStyle, setPopStyle] = useState<React.CSSProperties>({ position: "fixed", top: -9999, left: -9999, visibility: "hidden" });

  const showPreviewNow = (idx: number) => setPreview(idx);
  const schedulePreview = (idx: number) => {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setPreview(idx), 220);
  };
  const cancelPreview = (idx: number) => {
    window.clearTimeout(hoverTimer.current);
    setPreview((cur) => (cur === idx ? null : cur));
  };
  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  useLayoutEffect(() => {
    if (preview == null) { setPopStyle({ position: "fixed", top: -9999, left: -9999, visibility: "hidden" }); return; }
    const cell = cellRefs.current[preview];
    const pop = popRef.current;
    if (!cell || !pop) return;
    // Measure the popover at its real (content-wrapped) size, then place from the cell's viewport rect.
    const cr = cell.getBoundingClientRect();
    const pr = pop.getBoundingClientRect();
    const gap = 8;
    let top = cr.top - gap - pr.height;          // prefer above the cell (never covers the cursor)
    if (top < 8) top = cr.bottom + gap;           // flip below only when there's no room above
    let left = cr.left + cr.width / 2 - pr.width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - pr.width - 8)); // clamp within the viewport
    setPopStyle({ position: "fixed", top, left, visibility: "visible" });
  }, [preview]);

  // ── Render helpers ───────────────────────────────────────────────────────────
  const renderBadge = (u: Urgency, scale = 1) => {
    const s = 14 * scale;
    if (u === "elapsed") {
      return (
        <span aria-hidden="true" style={{ width: s, height: s, borderRadius: "50%", background: burgundy, color: "#fff",
          display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_MONO, fontSize: 9 * scale, fontWeight: 700, lineHeight: 1 }}>!</span>
      );
    }
    return (
      <span aria-hidden="true" style={{ width: s, height: s, borderRadius: "50%", background: "#fff", color: AMBER,
        border: `1.5px solid ${AMBER}`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_MONO, fontSize: 9 * scale, fontWeight: 700, lineHeight: 1 }}>!</span>
    );
  };

  const dRangeLabel = `${fmtDayMonth(days[0])} – ${fmtDayMonth(days[13])}`;

  // Day cell -------------------------------------------------------------------
  const DayCell: React.FC<{ d: Date; idx: number }> = ({ d, idx }) => {
    const evs = eventsOn(d);
    const isToday = dayDiff(d, today) === 0;
    const selected = idx === selectedIdx;
    const quiet = evs.length === 0;
    const weekend = isWeekend(d);
    const badge = badgeFor(d);
    const shown = evs.slice(0, 3);
    const overflow = evs.length - shown.length;
    const label = `${d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}${isToday ? ", today" : ""} — ${evs.length === 0 ? "no events" : `${evs.length} event${evs.length === 1 ? "" : "s"}`}`;

    return (
      <button
        ref={(el) => { cellRefs.current[idx] = el; }}
        role="gridcell"
        aria-label={label}
        aria-current={isToday ? "date" : undefined}
        aria-selected={selected}
        tabIndex={selected ? 0 : -1}
        onClick={() => setSelectedIdx(idx)}
        onKeyDown={(e) => onCellKeyDown(e, idx)}
        onMouseEnter={() => schedulePreview(idx)}
        onMouseLeave={() => cancelPreview(idx)}
        onFocus={() => showPreviewNow(idx)}
        onBlur={() => cancelPreview(idx)}
        className="relative flex flex-col items-center cursor-pointer focus:outline-none"
        style={{
          minHeight: 56,
          padding: "5px 2px 4px",
          borderRadius: 8,
          background: selected ? "#fff" : weekend ? "rgba(124,58,42,0.035)" : "#fff",
          opacity: quiet && !selected && !isToday ? 0.55 : 1,
          border: selected ? `1.5px solid ${burgundy}` : isToday ? "1.5px solid transparent" : "1px solid #efe7dd",
          boxShadow: isToday && !selected ? `inset 0 0 0 1.5px ${burgundy}` : "none",
          transition: reduce ? "none" : "background 0.15s, box-shadow 0.15s, opacity 0.15s",
        }}
      >
        {/* urgency badge — top-right corner; renders even on today (ring/tag must not suppress it) */}
        {badge && <span style={{ position: "absolute", top: -5, right: -4, zIndex: 2 }}>{renderBadge(badge)}</span>}

        {isToday && (
          <span style={{ position: "absolute", top: -7, left: "50%", transform: "translateX(-50%)", background: burgundy, color: "#fff",
            fontFamily: FONT_MONO, fontSize: 6.5, fontWeight: 700, letterSpacing: "0.08em", padding: "1px 4px", borderRadius: 4, lineHeight: 1 }}>
            TODAY
          </span>
        )}

        <span style={{ fontFamily: FONT_SANS, fontSize: 12, fontWeight: isToday ? 700 : 500, color: isToday ? burgundy : bodyInk, marginTop: isToday ? 4 : 1 }}>
          {d.getDate()}
        </span>

        <span className="flex items-center justify-center" style={{ gap: 2, marginTop: "auto", minHeight: 15 }}>
          {shown.map((ev) => <span key={ev.id} style={{ display: "inline-flex" }}>{renderMarker(ev.marker, 13)}</span>)}
          {overflow > 0 && (
            <span style={{ fontFamily: FONT_MONO, fontSize: 8.5, fontWeight: 600, color: mutedInk }}>+{overflow}</span>
          )}
        </span>
      </button>
    );
  };

  // Detail / agenda row --------------------------------------------------------
  const EventRow: React.FC<{ ev: FEvent }> = ({ ev }) => (
    <div className="flex items-start" style={{ gap: 10, padding: "8px 2px" }}>
      <span style={{ marginTop: 1, display: "inline-flex" }}>{renderMarker(ev.marker, 18)}</span>
      <div className="flex-1 min-w-0">
        <div style={{ fontFamily: FONT_SERIF, fontWeight: 500, fontSize: 14, color: bodyInk, lineHeight: 1.25 }} className="truncate">
          {ev.title}
        </div>
        <div style={{ fontFamily: FONT_SANS, fontSize: 11.5, color: ev.urgency === "elapsed" ? burgundy : ev.urgency === "upcoming" ? AMBER : sageText, marginTop: 1 }}>
          {ev.line}
        </div>
        {(ev.manuscript || ev.agency) && (
          <div style={{ fontFamily: FONT_MONO, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: mutedInk, marginTop: 3 }} className="truncate">
            {[ev.manuscript, ev.agency].filter(Boolean).join(" · ")}
          </div>
        )}
      </div>
      {ev.cta && ev.queryId && (
        <button
          onClick={() => onOpenQuery(ev.queryId!)}
          className="cursor-pointer shrink-0"
          style={ev.cta.urgent
            ? { fontFamily: FONT_MONO, fontSize: 9.5, fontWeight: 500, letterSpacing: "0.05em", background: "#f8e7dc", color: burgundy, border: "0.5px solid rgba(124,58,42,0.3)", borderRadius: 8, padding: "5px 10px" }
            : { fontFamily: FONT_MONO, fontSize: 9.5, fontWeight: 500, letterSpacing: "0.05em", background: "#fff", color: mutedInk, border: "0.5px solid #e0d5c8", borderRadius: 8, padding: "5px 10px" }}
        >
          {ev.cta.label}
        </button>
      )}
    </div>
  );

  // Detail pane ----------------------------------------------------------------
  const selDay = days[selectedIdx];
  const selEvents = eventsOn(selDay);
  const selIsToday = dayDiff(selDay, today) === 0;

  const detailPane = (
    <div key={selectedIdx} className={reduce ? "" : "animate-fade-in"}>
      <div style={{ borderBottom: `1px solid ${sageBandRule}`, paddingBottom: 8, marginBottom: 4 }}>
        <div style={{ fontFamily: FONT_SERIF, fontSize: 15, fontWeight: 500, color: headingInk }}>
          {selIsToday ? "Today · " : ""}{fmtDayMonth(selDay)}
        </div>
        <div style={{ fontFamily: FONT_SANS, fontSize: 11, color: mutedInk, marginTop: 1 }}>
          {selDay.toLocaleDateString("en-GB", { weekday: "long" })}
        </div>
      </div>
      {selEvents.length === 0 ? (
        <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 12.5, color: mutedInk, padding: "18px 2px" }}>
          Nothing on this day.
        </div>
      ) : (
        <div className="flex flex-col">
          {selEvents.map((ev, i) => (
            <div key={ev.id} style={{ borderTop: i === 0 ? "none" : "0.5px solid #f0e8e0" }}>
              <EventRow ev={ev} />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Calendar grid (one row of 7) ----------------------------------------------
  const weekRow = (slice: Date[], offset: number, caption: string) => (
    <div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 8.5, textTransform: "uppercase", letterSpacing: "0.08em", color: mutedInk, marginBottom: 5 }}>
        {caption}
      </div>
      <div className="grid grid-cols-7" style={{ gap: 4 }}>
        {slice.map((d, i) => <DayCell key={dayKey(d)} d={d} idx={offset + i} />)}
      </div>
    </div>
  );

  const calendarGrid = (
    <div role="grid" aria-label="Fortnight calendar" className="flex flex-col" style={{ gap: 10 }}>
      <div className="grid grid-cols-7" style={{ gap: 4 }}>
        {WEEKDAY_LETTERS.map((w, i) => (
          <div key={i} style={{ textAlign: "center", fontFamily: FONT_MONO, fontSize: 8.5, fontWeight: 600, color: mutedInk }}>{w}</div>
        ))}
      </div>
      {weekRow(days.slice(0, 7), 0, `Last week · ${fmtDayMonth(days[0])} – ${fmtDayMonth(days[6])}`)}
      {weekRow(days.slice(7, 14), 7, `Coming up · ${fmtDayMonth(days[7])} – ${fmtDayMonth(days[13])}`)}
    </div>
  );

  // Mobile stacked agenda ------------------------------------------------------
  const agendaDays = days.filter((d) => eventsOn(d).length > 0);
  const agenda = (
    <div className="flex flex-col" style={{ gap: 12 }}>
      {agendaDays.length === 0 ? (
        <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 12.5, color: mutedInk, padding: "12px 2px" }}>
          Nothing logged or scheduled this fortnight.
        </div>
      ) : (
        agendaDays.map((d) => (
          <div key={dayKey(d)}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em", color: dayDiff(d, today) === 0 ? burgundy : mutedInk, marginBottom: 2 }}>
              {dayDiff(d, today) === 0 ? "Today · " : ""}{d.toLocaleDateString("en-GB", { weekday: "short" })} {fmtDayMonth(d)}
            </div>
            <div className="flex flex-col">
              {eventsOn(d).map((ev, i) => (
                <div key={ev.id} style={{ borderTop: i === 0 ? "none" : "0.5px solid #f0e8e0" }}>
                  <EventRow ev={ev} />
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );

  // Header band ----------------------------------------------------------------
  const countPill = (label: string) => (
    <span style={{ fontFamily: FONT_MONO, fontSize: 9, fontWeight: 500, color: sageText, background: "rgba(255,255,255,0.6)",
      border: `0.5px solid ${sageBandRule}`, borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap" }}>
      {label}
    </span>
  );

  const header = (
    <div
      className="flex items-center justify-between flex-wrap"
      style={isMagazineLayout ? { padding: "12px 20px", gap: 10, borderBottom: "0.5px solid #e8d5cc" } : {
        position: "relative", zIndex: 2, margin: "6px 6px 0", borderRadius: "8px 8px 0 0",
        padding: "12px 18px 10px", background: sageBandGradient, borderBottom: `1px solid ${sageBandRule}`, gap: 10,
      }}
    >
      <div className="flex items-center" style={{ gap: 8 }}>
        <Calendar style={{ width: 15, height: 15, color: headingInk }} strokeWidth={2} aria-hidden="true" />
        <div className="flex flex-col text-left">
          <span style={{ fontFamily: FONT_SERIF, fontSize: 14, fontWeight: 600, color: headingInk, lineHeight: 1.1 }}>Fortnight in focus</span>
          <span style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 10.5, color: mutedInk, marginTop: 1 }}>What happened, and what's next.</span>
        </div>
      </div>
      <div className="flex items-center" style={{ gap: 7 }}>
        {countPill(`${lastWeekCount} event${lastWeekCount === 1 ? "" : "s"} last week`)}
        {countPill(`${comingUpCount} coming up`)}
        <span style={{ fontFamily: FONT_MONO, fontSize: 9.5, fontWeight: 600, color: sageText, whiteSpace: "nowrap" }}>{dRangeLabel}</span>
      </div>
    </div>
  );

  // Body: grid + detail (sm+) / stacked agenda (below sm) ----------------------
  const body = (
    <div style={isMagazineLayout ? { padding: "14px 20px" } : { position: "relative", zIndex: 2, margin: "0 6px 6px", padding: "14px 16px" }}>
      {/* Desktop / tablet: grid + detail pane */}
      <div className="hidden sm:grid" style={{ gridTemplateColumns: "minmax(0, 1.35fr) 1px minmax(0, 1fr)", gap: 14 }}>
        <div className="min-w-0">{calendarGrid}</div>
        <div style={{ background: "#f0e8e0" }} />
        <div className="min-w-0 flex flex-col">
          <div className="flex-1">{detailPane}</div>
          <button
            onClick={onOpenFullCalendar}
            className="flex items-center justify-end cursor-pointer hover:underline self-end"
            style={{ gap: 4, marginTop: 10, fontFamily: FONT_SANS, fontSize: 10, fontWeight: 500, color: burgundy, background: "transparent", border: "none" }}
          >
            <span>Open full calendar</span>
            <ArrowRight style={{ width: 11, height: 11 }} aria-hidden="true" />
          </button>
        </div>
      </div>
      {/* Mobile: stacked agenda */}
      <div className="sm:hidden">{agenda}</div>
    </div>
  );

  return (
    <div
      id="fortnight-in-focus-container"
      className="flex flex-col w-full relative"
      style={isMagazineLayout
        ? { background: "#FFFDF9", borderBottom: "0.5px solid #e8e0d8" }
        : { background: parchment, backgroundImage: PAPER_TEXTURE, borderRadius: 14, boxShadow: mountShadow }}
    >
      {!isMagazineLayout && (
        <div aria-hidden="true" style={{ position: "absolute", inset: 6, border: insetBorder, borderRadius: 10, pointerEvents: "none", zIndex: 3 }} />
      )}
      {header}
      {body}

      {/* Hover/focus preview popover — branded parchment mini-card, portalled to <body> so no
          ancestor (MountCard / transformed wrapper) can clip it; sizes to content, never intercepts
          clicks. */}
      {preview != null && typeof document !== "undefined" && createPortal((() => {
        const d = days[preview];
        const evs = eventsOn(d);
        return (
          <div
            ref={popRef}
            role="presentation"
            style={{
              ...popStyle,
              zIndex: 80,
              pointerEvents: "none",
              minWidth: 220,
              maxWidth: 300,
              background: parchment,
              backgroundImage: PAPER_TEXTURE,
              borderRadius: 10,
              boxShadow: mountShadow,
              padding: 10,
              opacity: popStyle.visibility === "hidden" ? 0 : 1,
              transition: reduce ? "none" : "opacity 0.12s",
            }}
          >
            <div aria-hidden="true" style={{ position: "absolute", inset: 4, border: insetBorder, borderRadius: 7, pointerEvents: "none" }} />
            <div style={{ position: "relative" }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: 8.5, textTransform: "uppercase", letterSpacing: "0.06em", color: mutedInk, marginBottom: 5 }}>
                {dayDiff(d, today) === 0 ? "Today · " : ""}{d.toLocaleDateString("en-GB", { weekday: "short" })} {fmtDayMonth(d)}
              </div>
              {evs.length === 0 ? (
                <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 11.5, color: mutedInk }}>Nothing on this day.</div>
              ) : (
                <div className="flex flex-col" style={{ gap: 6 }}>
                  {evs.map((ev) => (
                    <div key={ev.id} className="flex items-start" style={{ gap: 7 }}>
                      <span style={{ display: "inline-flex", marginTop: 1 }}>{renderMarker(ev.marker, 14)}</span>
                      <span style={{ fontFamily: FONT_SANS, fontSize: 11, color: bodyInk, lineHeight: 1.35, overflowWrap: "anywhere", wordBreak: "break-word" }}>
                        <span style={{ fontWeight: 500 }}>{ev.title}</span>
                        <span style={{ color: mutedInk }}> — {ev.line}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })(), document.body)}
    </div>
  );
};
