/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Over to you" — the dashboard's high-priority action container (hero-right slot).
 * One height-capped, internally-scrolling MountCard with two zones:
 *   Zone A "To-do list"  — a PINNED sage header (serif title + pulsing dot + burgundy count
 *                          pill) above the urgent/overdue task rows.
 *   Zone B "When you have a moment" — a sage header STRIP (rows below sit on parchment) with one
 *                          EXPANDABLE summary row per recommended task type; expanding lists the
 *                          underlying agents/records/queries inline.
 * The Zone A rows + Zone B scroll together; a thin footer hint ("Scroll to see N recommended
 * actions") is pinned at the bottom and shown ONLY while the Zone B header is scrolled out of
 * view (IntersectionObserver, root = the scroll container).
 *
 * SURFACE ONLY: every action keeps its CURRENT behaviour — navigate via onAction
 * (Dashboard wires this to onNavigate(actionPath)); query-related items open via onOpenQuery.
 * No nudge modal / logging / timeline here; snooze/dismiss are intentionally not rendered.
 */
import React, { useEffect, useRef, useState } from "react";
import { Feather, Star, ClipboardList, Archive, ChevronDown, Check, Calendar, PenLine } from "lucide-react";
import { Task, Query, Agent, Note } from "../../types";
import { MountCard } from "../MountCard";
import {
  sageBandGradient,
  sageBandRule,
  sageText,
  parchment,
  burgundy,
  bodyInk,
  mutedInk,
  labelStyle,
  buttonPinkBg,
  FONT_SERIF,
  FONT_MONO,
} from "../../lib/designTokens";
import { FONT_CAVEAT, DUE_SOON_BG } from "../notes/notesTheme";
import { datedTodoNotes, overdueNoteCount, isDueOrOverdue, formatDueLabel, todayLocalISO } from "../notes/notesUtils";
import "../notes/notes.css";

const DAY_MS = 24 * 60 * 60 * 1000;

/* ── Zone A — urgent/overdue task types (broadened beyond the old OVER_TO_YOU_TYPES) ─────── */
const URGENT_TYPES = [
  "offer_received",
  "partial_requested",
  "full_requested",
  "revise_resubmit",
  "nudge_overdue",
] as const;
type UrgentType = (typeof URGENT_TYPES)[number];

const URGENT_CHIP: Record<UrgentType, string> = {
  offer_received: "OFFER",
  full_requested: "PAGES",
  partial_requested: "PAGES",
  revise_resubmit: "REVISE",
  nudge_overdue: "CHASE",
};

const URGENT_ACTION: Record<UrgentType, string> = {
  offer_received: "Review",
  full_requested: "Mark sent",
  partial_requested: "Mark sent",
  revise_resubmit: "Record",
  nudge_overdue: "Nudge",
};

/* ── Zone B — recommended types, in display order. NOTE: querying_unstarted lives HERE, not in
      Zone A, despite its "overdue" priority (special-cased per the brief). ─────────────────── */
const RECOMMENDED_TYPES = [
  "dream_agent_unqueried",
  "querying_unstarted",
  "data_quality_poor",
  "no_response_close",
] as const;
type RecommendedType = (typeof RECOMMENDED_TYPES)[number];

const RECOMMENDED_ICON: Record<RecommendedType, React.ComponentType<any>> = {
  dream_agent_unqueried: Star,
  querying_unstarted: Feather,
  data_quality_poor: ClipboardList,
  no_response_close: Archive,
};

const recommendedLabel = (type: RecommendedType, n: number): string => {
  switch (type) {
    case "dream_agent_unqueried":
      return `${n} agent${n === 1 ? "" : "s"} ready to query`;
    case "querying_unstarted":
      return `${n} manuscript${n === 1 ? "" : "s"} ready to start querying`;
    case "data_quality_poor":
      return `${n} record${n === 1 ? "" : "s"} missing key details`;
    case "no_response_close":
      return `${n} to consider closing`;
  }
};

/** Whole-unit overdue gap: weeks once the gap reaches 7 days, else days. e.g. "3 weeks", "5 days". */
const fmtGap = (deadline: Date, now: Date): string => {
  const days = Math.max(0, Math.floor((now.getTime() - deadline.getTime()) / DAY_MS));
  if (days >= 7) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks === 1 ? "" : "s"}`;
  }
  return `${days} day${days === 1 ? "" : "s"}`;
};

export interface OverToYouRow {
  task: Task;
  type: UrgentType;
  chip: string;
  agentName: string;
  description: React.ReactNode;
  actionLabel: string;
  deadline: Date | null;
}

/** Build the Zone-A rows from the live tasks, sorted deadline-asc (ordering kept isolated). */
export const buildOverToYouRows = (tasks: Task[], queries: Query[], agents: Agent[]): OverToYouRow[] => {
  const now = new Date();

  const rows: OverToYouRow[] = tasks
    .filter((t) => (URGENT_TYPES as readonly string[]).includes(t.taskType))
    .map((task) => {
      const type = task.taskType as UrgentType;
      const q = queries.find((item) => item.id === task.relatedRecordId);
      const agent = q ? agents.find((a) => a.id === q.agentId) : undefined;
      const agentName = agent?.name || agent?.agency || "the agent";
      const title = task.manuscriptTitle || "your manuscript";

      const rawDeadline = q?.responseDeadline ? new Date(q.responseDeadline) : null;
      const deadline = rawDeadline && !isNaN(rawDeadline.getTime()) ? rawDeadline : null;

      let description: React.ReactNode = "";
      switch (type) {
        case "offer_received":
          description = `An offer to weigh — ${agentName}`;
          break;
        case "full_requested":
          description = (
            <>
              Time to send your <strong style={{ fontWeight: 700, color: bodyInk }}>full manuscript</strong>
            </>
          );
          break;
        case "partial_requested":
          description = (
            <>
              Time to send your <strong style={{ fontWeight: 700, color: bodyInk }}>partial manuscript</strong>
            </>
          );
          break;
        case "revise_resubmit":
          description = `Time to revise and resubmit · ${title}`;
          break;
        case "nudge_overdue":
          description = deadline
            ? `Agent response overdue · ${fmtGap(deadline, now)} past window`
            : "Agent response overdue";
          break;
      }

      return {
        task,
        type,
        chip: URGENT_CHIP[type],
        agentName,
        description,
        actionLabel: URGENT_ACTION[type],
        deadline,
      };
    });

  // Deadline-asc, nulls last (unchanged ordering policy — kept isolated so it's easy to swap later).
  return rows.sort((a, b) => {
    if (a.deadline && b.deadline) return a.deadline.getTime() - b.deadline.getTime();
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    return 0;
  });
};

interface RecommendedItem {
  task: Task;
  subject: React.ReactNode; // agent name (bold) or manuscript title — the row's subject
}

interface RecommendedRow {
  type: RecommendedType;
  count: number;
  label: string;
  Icon: React.ComponentType<any>;
  items: RecommendedItem[];
}

/** The subject shown for one expanded item: agent name (bold) or manuscript title. */
const itemSubject = (type: RecommendedType, task: Task, queries: Query[], agents: Agent[]): React.ReactNode => {
  const boldAgent = (name: string) => (
    <span style={{ fontFamily: FONT_SERIF, fontWeight: 700, color: bodyInk }}>{name}</span>
  );
  if (type === "querying_unstarted") {
    return <span style={{ fontFamily: FONT_SERIF, color: bodyInk }}>{task.manuscriptTitle || "Untitled manuscript"}</span>;
  }
  if (type === "no_response_close") {
    const q = queries.find((x) => x.id === task.relatedRecordId);
    const ag = q ? agents.find((a) => a.id === q.agentId) : undefined;
    return boldAgent(ag?.name || ag?.agency || "the agent");
  }
  // dream_agent_unqueried / data_quality_poor → relatedRecordId is an agent id.
  const ag = agents.find((a) => a.id === task.relatedRecordId);
  return boldAgent(ag?.name || ag?.agency || "the agent");
};

/** One summarised, expandable row per recommended type that has >= 1 task (data-driven). */
const buildRecommendedRows = (tasks: Task[], queries: Query[], agents: Agent[]): RecommendedRow[] =>
  RECOMMENDED_TYPES.map((type): RecommendedRow | null => {
    const matched = tasks.filter((t) => t.taskType === type);
    if (matched.length === 0) return null;
    return {
      type,
      count: matched.length,
      label: recommendedLabel(type, matched.length),
      Icon: RECOMMENDED_ICON[type],
      items: matched.map((task) => ({ task, subject: itemSubject(type, task, queries, agents) })),
    };
  }).filter((r): r is RecommendedRow => r !== null);

/* ── Scoped animation/hover CSS (keyframes + prefers-reduced-motion can't be expressed inline) ── */
const OTY_CSS = `
@keyframes oty-pulse-ring {
  0%   { transform: scale(0.6); opacity: 0.5; }
  70%  { transform: scale(2.6); opacity: 0; }
  100% { transform: scale(2.6); opacity: 0; }
}
@keyframes oty-wiggle {
  0%, 90%, 100% { transform: rotate(0deg); }
  92% { transform: rotate(-7deg); }
  95% { transform: rotate(6deg); }
  97% { transform: rotate(-3deg); }
}
.oty-pulse-ring { animation: oty-pulse-ring 2.4s ease-out infinite; }
.oty-action {
  animation: oty-wiggle 3.6s ease-in-out infinite;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}
.oty-action:hover {
  animation: none;
  box-shadow: 0 0 0 3px rgba(124, 58, 42, 0.12), 0 2px 9px rgba(124, 58, 42, 0.2);
  border-color: #d8a89a;
}
.oty-rec-row { transition: background 0.18s ease; }
.oty-rec-row:hover { background: #faf5ef; }
.oty-rec-item { transition: background 0.15s ease; }
.oty-rec-item:hover { background: #f3ece2; }
.oty-hint { transition: opacity 0.25s ease; }
@media (prefers-reduced-motion: reduce) {
  .oty-pulse-ring, .oty-action { animation: none !important; }
}
`;

const chipStyle: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 8,
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: burgundy,
  background: "#faf1ef",
  border: "0.5px solid #f2ddd5",
  borderRadius: 5,
  padding: "2px 6px",
  lineHeight: 1,
  flexShrink: 0,
};

const actionBtnStyle: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 9.5,
  fontWeight: 500,
  letterSpacing: "0.06em",
  background: "#ffffff",
  color: burgundy,
  border: "1px solid rgba(124,58,42,0.4)",
  borderRadius: 9,
  padding: "8px 14px",
  whiteSpace: "nowrap",
};

/* Shared count-pill shape; the two variants differ only in fill/number colour. */
const countPillBase: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 10,
  fontWeight: 600,
  minWidth: 20,
  height: 20,
  borderRadius: 999,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 6px",
  lineHeight: 1,
};

// White chip so the count reads cleanly on the pink To-do band.
const urgentPillStyle: React.CSSProperties = { ...countPillBase, color: burgundy, background: "#ffffff", border: "0.5px solid rgba(124,58,42,0.2)" };
const recommendedPillStyle: React.CSSProperties = {
  ...countPillBase,
  color: burgundy,
  background: buttonPinkBg,
  border: "0.5px solid rgba(124,58,42,0.22)",
};

export interface OverToYouProps {
  tasks: Task[];
  queries: Query[];
  agents: Agent[];
  notes: Note[]; // dated, not-done notes render as the "Noted by you" group between Zone A and Zone B
  onAction: (task: Task) => void;
  onNudge: (task: Task) => void; // nudge_overdue rows open the Nudge modal instead of navigating
  onSnooze: (task: Task) => void; // kept for call-site compatibility; not rendered this prompt
  onDismiss: (task: Task) => void; // kept for call-site compatibility; not rendered this prompt
  onAllTasks: () => void; // kept for call-site compatibility; superseded by the scroll hint
  onOpenQuery: (queryId: string) => void;
  onCompleteNote: (id: string) => void; // tick a dated note done from its To-do row
}

export const OverToYou: React.FC<OverToYouProps> = ({ tasks, queries, agents, notes, onAction, onNudge, onOpenQuery, onCompleteNote }) => {
  const urgentRows = buildOverToYouRows(tasks, queries, agents);
  const recommendedRows = buildRecommendedRows(tasks, queries, agents);
  const recommendedTotal = recommendedRows.reduce((sum, r) => sum + r.count, 0);

  // "Noted by you" — dated, not-done notes (sorted dueDate-asc). Only OVERDUE ones raise the alarm
  // (the header count + the nav bell); the group itself lists every dated task.
  const today = todayLocalISO();
  const notedRows = datedTodoNotes(notes);
  const overdueCount = overdueNoteCount(notes, today);
  const headerCount = urgentRows.length + overdueCount;

  const scrollRef = useRef<HTMLDivElement>(null);
  const zoneBHeaderRef = useRef<HTMLDivElement>(null);
  const [hintVisible, setHintVisible] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (type: string) => setExpanded((prev) => ({ ...prev, [type]: !prev[type] }));

  // Tick → play the leave animation, then complete (the live notes subscription drops the row).
  const [leavingIds, setLeavingIds] = useState<Set<string>>(new Set());
  const tickNote = (id: string) => {
    setLeavingIds((prev) => new Set(prev).add(id));
    setTimeout(() => onCompleteNote(id), 320);
  };

  // A recommended item routes via its query (relatedRecordId) when query-related, else via actionPath.
  const routeItem = (task: Task) => {
    if (task.taskType === "no_response_close") onOpenQuery(task.relatedRecordId);
    else onAction(task);
  };

  // Footer hint shows only while the Zone B header is out of the scroll viewport.
  useEffect(() => {
    const root = scrollRef.current;
    const target = zoneBHeaderRef.current;
    if (!root || !target || typeof IntersectionObserver === "undefined") {
      setHintVisible(false);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => setHintVisible(!entries[0].isIntersecting),
      { root, threshold: 0 }
    );
    io.observe(target);
    return () => io.disconnect();
  }, [urgentRows.length, notedRows.length, recommendedRows.length]);

  return (
    // lg:h-full fills the absolutely-positioned hero cell (Dashboard caps it to the stat-cards
    // row height); minHeight:0 lets the flex body scroll internally instead of growing the card.
    <MountCard className="flex flex-col lg:h-full" style={{ minHeight: 0 }}>
      <style>{OTY_CSS}</style>

      {/* ── Zone A header — pinned PINK band (the To-do list is singled out as the urgent panel,
            the lone pink header among the dashboard's sage container headers) ───────────────── */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{
          position: "relative",
          zIndex: 2,
          margin: "6px 6px 0",
          borderRadius: "8px 8px 0 0",
          padding: "13px 18px 12px",
          background: "linear-gradient(135deg, #f5e2da 0%, #efd5ca 100%)",
          borderBottom: "1px solid rgba(124,58,42,0.15)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span style={{ position: "relative", display: "inline-flex", width: 7, height: 7 }} aria-hidden="true">
            <span
              className="oty-pulse-ring"
              style={{ position: "absolute", inset: 0, borderRadius: "50%", background: burgundy }}
            />
            <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: burgundy }} />
          </span>
          <span style={{ fontFamily: FONT_SERIF, fontSize: 16, fontWeight: 600, color: bodyInk, lineHeight: 1 }}>
            To-do list
          </span>
        </span>
        {headerCount > 0 && (
          <span aria-label={`${headerCount} urgent`} style={urgentPillStyle}>
            {headerCount}
          </span>
        )}
      </div>

      {/* ── Scroll region: Zone A rows + Zone B ──────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto"
        style={{ position: "relative", zIndex: 2, margin: "0 6px", padding: "10px 12px 8px 14px" }}
      >
        {/* Zone A rows */}
        {urgentRows.length === 0 ? (
          // Fill the card only when there's truly nothing else below (no dated notes, no recommended).
          <div className="flex flex-col items-center justify-center text-center" style={{ height: notedRows.length === 0 && recommendedRows.length === 0 ? "100%" : "auto", padding: "26px 16px 20px" }}>
            <Feather className="w-[22px] h-[22px]" style={{ color: "#aab8a4", marginBottom: 9 }} strokeWidth={1.6} />
            <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 13, color: "#5a6258" }}>
              You're all caught up.
            </div>
          </div>
        ) : (
          urgentRows.map((row, i) => (
            <div
              key={row.task.id}
              className="flex items-center justify-between gap-3"
              style={{ padding: "10px 2px", borderTop: i > 0 ? "0.5px solid #f0e6d8" : undefined }}
            >
              <div
                style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                onClick={() => onOpenQuery(row.task.relatedRecordId)}
              >
                <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                  <span style={chipStyle}>{row.chip}</span>
                  <span
                    style={{
                      fontFamily: FONT_SERIF,
                      color: burgundy,
                      fontSize: 13,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {row.agentName}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: mutedInk, marginTop: 3, lineHeight: 1.4 }}>{row.description}</div>
              </div>
              <button
                className="oty-action cursor-pointer shrink-0"
                style={{ ...actionBtnStyle, animationDelay: `${i * 0.18}s` }}
                onClick={() => (row.type === "nudge_overdue" ? onNudge(row.task) : onAction(row.task))}
              >
                {row.actionLabel}
              </button>
            </div>
          ))
        )}

        {/* ── "Noted by you" — dated, not-done notes; sits between must-do (Zone A) and nice-to-have
              (Zone B). The group lists every dated task; only overdue ones bump the header count. ── */}
        {notedRows.length > 0 && (
          <>
            <div
              className="flex items-center justify-between"
              style={{
                background: sageBandGradient,
                border: `1px solid ${sageBandRule}`,
                borderRadius: 8,
                padding: "8px 12px",
                margin: "8px 0",
                gap: 10,
              }}
            >
              <span style={{ ...labelStyle, color: sageText, letterSpacing: "0.1em", display: "inline-flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                <PenLine className="w-[12px] h-[12px] shrink-0" /> Noted by you
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
                <span style={{ ...labelStyle, color: sageText, letterSpacing: "0.1em", opacity: 0.85 }}>Your tasks</span>
                <span
                  aria-label={`${notedRows.length} noted`}
                  style={{ ...countPillBase, color: sageText, background: parchment, border: "0.5px solid #cdd5cb" }}
                >
                  {notedRows.length}
                </span>
              </span>
            </div>

            {notedRows.map((note, i) => {
              const soon = isDueOrOverdue(note.dueDate, today);
              const leaving = leavingIds.has(note.id);
              return (
                <div
                  key={note.id}
                  className={leaving ? "sa-row-leaving" : undefined}
                  style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "11px 2px", borderTop: i > 0 ? "0.5px solid #f0e6d8" : undefined }}
                >
                  <button
                    type="button"
                    aria-label="Mark done"
                    onClick={() => tickNote(note.id)}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 6,
                      border: `1.5px solid ${sageText}`,
                      background: leaving ? sageText : "#fff",
                      flexShrink: 0,
                      cursor: "pointer",
                      marginTop: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                    }}
                  >
                    {leaving ? <Check size={11} strokeWidth={3.5} color="#fff" /> : null}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FONT_CAVEAT, fontSize: 18, fontWeight: 500, lineHeight: 1.2, color: "#46352b" }}>
                      {note.text}
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontFamily: FONT_MONO,
                        fontSize: 8.5,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: burgundy,
                        background: soon ? DUE_SOON_BG : "#fff3ed",
                        border: "0.5px solid #eed6c8",
                        borderRadius: 20,
                        padding: "2px 7px",
                      }}
                    >
                      <Calendar size={9} strokeWidth={2} /> {formatDueLabel(note.dueDate, today)}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Zone B */}
        {recommendedRows.length > 0 && (
          <>
            <div
              ref={zoneBHeaderRef}
              className="flex items-center justify-between"
              style={{
                background: sageBandGradient,
                border: `1px solid ${sageBandRule}`,
                borderRadius: 8,
                padding: "8px 12px",
                margin: "8px 0",
                gap: 10,
              }}
            >
              <span
                style={{
                  ...labelStyle,
                  color: sageText,
                  letterSpacing: "0.1em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  minWidth: 0,
                }}
              >
                When you have a moment
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
                <span style={{ ...labelStyle, color: sageText, letterSpacing: "0.1em", opacity: 0.85 }}>Recommended</span>
                <span aria-label={`${recommendedTotal} recommended`} style={recommendedPillStyle}>
                  {recommendedTotal}
                </span>
              </span>
            </div>

            {recommendedRows.map((row) => {
              const Icon = row.Icon;
              const isOpen = !!expanded[row.type];
              return (
                <div key={row.type}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => toggle(row.type)}
                    className="oty-rec-row flex items-center gap-3 cursor-pointer"
                    style={{ width: "100%", textAlign: "left", padding: "9px 8px", borderRadius: 8, background: "transparent", border: "none" }}
                  >
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: "#eef1ec",
                        border: `0.5px solid ${sageBandRule}`,
                        color: sageText,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon className="w-[14px] h-[14px]" />
                    </span>
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 12,
                        color: bodyInk,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {row.label}
                    </span>
                    <ChevronDown
                      className="w-[15px] h-[15px] shrink-0"
                      style={{ color: sageText, transition: "transform 0.18s ease", transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)" }}
                    />
                  </button>

                  {isOpen && (
                    <div role="region" style={{ marginBottom: 2 }}>
                      {row.items.map((it) => (
                        <div
                          key={it.task.id}
                          className="oty-rec-item cursor-pointer"
                          style={{ padding: "6px 8px 6px 44px", borderRadius: 6, fontSize: 12, color: bodyInk, lineHeight: 1.4 }}
                          onClick={() => routeItem(it.task)}
                        >
                          {it.subject}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* ── Footer hint — pinned; visible only while the Zone B header is off-screen ──────── */}
      {recommendedRows.length > 0 && (
        <div
          className="shrink-0"
          style={{
            position: "relative",
            zIndex: 2,
            margin: "0 6px 6px",
            padding: "8px 14px",
            borderTop: "0.5px solid #ece0d2",
            background: parchment,
          }}
        >
          <span
            className="oty-hint"
            aria-hidden={!hintVisible}
            style={{ ...labelStyle, color: burgundy, opacity: hintVisible ? 1 : 0 }}
          >
            ↓ Scroll to see {recommendedTotal} recommended action{recommendedTotal === 1 ? "" : "s"}
          </span>
        </div>
      )}
    </MountCard>
  );
};
