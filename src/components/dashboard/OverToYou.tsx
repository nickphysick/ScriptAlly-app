/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Over to you" — the dashboard's high-priority action container (hero-right slot, STANDARD layout).
 * One height-capped, internally-scrolling MountCard with a pink header band and a THREE-TAB body:
 *   · Urgent        — urgent-family task rows (burgundy).
 *   · Housekeeping  — recommended-family task rows, FLATTENED (sage).
 *   · Notes to self — active (not-done) notes from the standalone notes store (rose).
 * Each tab shows a count; the strip defaults to Urgent unless its count is 0, then the first
 * non-empty tab in [Urgent, Housekeeping, Notes]. The pulsing header dot shows only while Urgent > 0.
 *
 * SURFACE ONLY: every action keeps its CURRENT behaviour — navigate via onAction
 * (Dashboard wires this to onNavigate(actionPath)); query-related items open via onOpenQuery;
 * nudge_overdue opens the Nudge modal via onNudge. The Notes tab SHARES the hero's notes store
 * (onAddNote / onCompleteNote = addNote / completeNoteWithUndo) — it never forks it.
 * snooze/dismiss + onAllTasks are kept on the props for call-site compatibility, not rendered.
 */
import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, ListChecks, PlusCircle, Plus, Check, Calendar, X } from "lucide-react";
import { Task, Query, Agent, Note, NoteColour } from "../../types";
import { MountCard } from "../MountCard";
import { agentPrimary } from "../../lib/agentDisplay";
import {
  parchment,
  burgundy,
  bodyInk,
  mutedInk,
  FONT_SERIF,
  FONT_MONO,
} from "../../lib/designTokens";
import { FONT_CAVEAT, NOTE_THEMES, NOTE_COLOURS } from "../notes/notesTheme";
import { activeNotes, byMostRecent, formatCreatedStamp } from "../notes/notesUtils";
import { NoteComposeCalendar } from "../notes/NoteComposeCalendar";
import "../notes/notes.css";

const DAY_MS = 24 * 60 * 60 * 1000;

/* ── Urgent-family task types ─────────────────────────────────────────────────────────────── */
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

/* ── Housekeeping (recommended) task types, in display order. NOTE: querying_unstarted lives HERE,
      not in Urgent, despite its "overdue" priority (special-cased per the original design). ────── */
const HOUSEKEEPING_TYPES = [
  "dream_agent_unqueried",
  "querying_unstarted",
  "data_quality_poor",
  "no_response_close",
] as const;
type HousekeepingType = (typeof HOUSEKEEPING_TYPES)[number];

const HOUSE_CHIP: Record<HousekeepingType, string> = {
  dream_agent_unqueried: "DREAM",
  querying_unstarted: "START",
  data_quality_poor: "DETAILS",
  no_response_close: "CLOSE",
};

const HOUSE_DESC: Record<HousekeepingType, string> = {
  dream_agent_unqueried: "A dream agent ready to query",
  querying_unstarted: "Ready to start querying",
  data_quality_poor: "Missing key details",
  no_response_close: "No reply yet — consider closing",
};

const HOUSE_ACTION_FALLBACK: Record<HousekeepingType, string> = {
  dream_agent_unqueried: "Query",
  querying_unstarted: "Start",
  data_quality_poor: "Fill in",
  no_response_close: "Review",
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

/** Build the urgent rows from the live tasks, sorted deadline-asc (ordering kept isolated). */
export const buildOverToYouRows = (tasks: Task[], queries: Query[], agents: Agent[]): OverToYouRow[] => {
  const now = new Date();

  const rows: OverToYouRow[] = tasks
    .filter((t) => (URGENT_TYPES as readonly string[]).includes(t.taskType))
    .map((task) => {
      const type = task.taskType as UrgentType;
      const q = queries.find((item) => item.id === task.relatedRecordId);
      const agent = q ? agents.find((a) => a.id === q.agentId) : undefined;
      const agentName = (agent ? agentPrimary(agent) : "") || "the agent";
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

export interface HousekeepingRow {
  task: Task;
  type: HousekeepingType;
  chip: string;
  subject: React.ReactNode; // agent name (bold) or manuscript title — the row's subject
  description: string;
  actionLabel: string;
}

/** The subject shown for a housekeeping row: agent name (bold serif) or manuscript title. */
const itemSubject = (type: HousekeepingType, task: Task, queries: Query[], agents: Agent[]): React.ReactNode => {
  const boldAgent = (name: string) => (
    <span style={{ fontFamily: FONT_SERIF, fontWeight: 700, color: burgundy }}>{name}</span>
  );
  if (type === "querying_unstarted") {
    return <span style={{ fontFamily: FONT_SERIF, fontWeight: 700, color: burgundy }}>{task.manuscriptTitle || "Untitled manuscript"}</span>;
  }
  if (type === "no_response_close") {
    const q = queries.find((x) => x.id === task.relatedRecordId);
    const ag = q ? agents.find((a) => a.id === q.agentId) : undefined;
    return boldAgent((ag ? agentPrimary(ag) : "") || "the agent");
  }
  // dream_agent_unqueried / data_quality_poor → relatedRecordId is an agent id.
  const ag = agents.find((a) => a.id === task.relatedRecordId);
  return boldAgent((ag ? agentPrimary(ag) : "") || "the agent");
};

/** Flattened housekeeping rows — one per recommended-family task, in HOUSEKEEPING_TYPES order. */
export const buildHousekeepingRows = (tasks: Task[], queries: Query[], agents: Agent[]): HousekeepingRow[] =>
  HOUSEKEEPING_TYPES.flatMap((type) =>
    tasks
      .filter((t) => t.taskType === type)
      .map((task) => ({
        task,
        type,
        chip: HOUSE_CHIP[type],
        subject: itemSubject(type, task, queries, agents),
        description: HOUSE_DESC[type],
        actionLabel: task.actionLabel || HOUSE_ACTION_FALLBACK[type],
      }))
  );

/* ── Scoped animation/hover CSS (keyframes + prefers-reduced-motion can't be expressed inline) ── */
const OTY_CSS = `
@keyframes oty-pulse-ring {
  0%   { transform: scale(0.6); opacity: 0.5; }
  70%  { transform: scale(2.6); opacity: 0; }
  100% { transform: scale(2.6); opacity: 0; }
}
@keyframes oty-badge-pulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.12); }
}
.oty-pulse-ring { animation: oty-pulse-ring 2.4s ease-out infinite; }
.oty-badge-pulse { animation: oty-badge-pulse 2.2s ease-in-out infinite; }
.oty-action { transition: box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease; }
.oty-action.urgent:hover {
  box-shadow: 0 0 0 3px rgba(124, 58, 42, 0.12), 0 2px 9px rgba(124, 58, 42, 0.2);
  border-color: #d8a89a;
}
.oty-action.sage:hover {
  box-shadow: 0 0 0 3px rgba(90, 110, 88, 0.12), 0 2px 9px rgba(90, 110, 88, 0.18);
  border-color: #b6c4b2;
}
.oty-tab { transition: color 0.15s ease; }
.oty-note-row { transition: background 0.15s ease; }
.oty-note-row:hover { background: #faf5ef; }
.oty-tick { transition: transform 0.15s cubic-bezier(0.2,0.7,0.2,1); }
.oty-tick:hover { transform: scale(1.18); }
.oty-newnote { transition: background 0.15s ease, border-color 0.15s ease; }
.oty-newnote:hover { background: #fdf6f2; border-color: #d9b6a8; }
.oty-swatch { transition: transform 0.12s ease, box-shadow 0.12s ease; }
.oty-swatch:hover { transform: scale(1.12); }
@media (prefers-reduced-motion: reduce) {
  .oty-pulse-ring, .oty-badge-pulse { animation: none !important; }
}
`;

const chipBase: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 8,
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  borderRadius: 5,
  padding: "2px 6px",
  lineHeight: 1,
  flexShrink: 0,
};

const urgentChipStyle: React.CSSProperties = {
  ...chipBase,
  color: burgundy,
  background: "#faf1ef",
  border: "0.5px solid #f2ddd5",
};

const sageChipStyle: React.CSSProperties = {
  ...chipBase,
  color: "#5a6e58",
  background: "#eef1ec",
  border: "0.5px solid #dbe3d7",
};

const actionBtnBase: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 9.5,
  fontWeight: 500,
  letterSpacing: "0.06em",
  borderRadius: 9,
  padding: "8px 14px",
  whiteSpace: "nowrap",
  cursor: "pointer",
};

// Soft-pink urgent action button.
const urgentBtnStyle: React.CSSProperties = {
  ...actionBtnBase,
  background: "#f5e2da",
  color: burgundy,
  border: "1px solid #e8c8bc",
};

// Sage-toned housekeeping action button.
const sageBtnStyle: React.CSSProperties = {
  ...actionBtnBase,
  background: "#eef1ec",
  color: "#5a6e58",
  border: "1px solid #cdd6c9",
};

/* ── Tabs ─────────────────────────────────────────────────────────────────────────────────── */
type TabKey = "urgent" | "house" | "notes";

interface TabSpec {
  key: TabKey;
  label: string;
  activeLabel: string;
  underline: string;
  badgeBg: string;
  badgeText: string;
}

const TAB_SPECS: TabSpec[] = [
  { key: "urgent", label: "Urgent", activeLabel: "#7c3a2a", underline: "#7c3a2a", badgeBg: "#f6ddd1", badgeText: "#7c3a2a" },
  { key: "house", label: "Housekeeping", activeLabel: "#5a6e58", underline: "#8a9e88", badgeBg: "#e9ede6", badgeText: "#5a6e58" },
  { key: "notes", label: "Notes to self", activeLabel: "#bd7461", underline: "#bd7461", badgeBg: "#f7e3dc", badgeText: "#bd7461" },
];

const INACTIVE_LABEL = "#9c8878";
const INACTIVE_BADGE_BG = "#ece4da";
const INACTIVE_BADGE_TEXT = "#a8978a";

const tabBadgeStyle = (active: boolean, spec: TabSpec): React.CSSProperties => ({
  fontFamily: FONT_MONO,
  fontSize: 10,
  fontWeight: 600,
  minWidth: 18,
  height: 18,
  borderRadius: 999,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 6px",
  lineHeight: 1,
  background: active ? spec.badgeBg : INACTIVE_BADGE_BG,
  color: active ? spec.badgeText : INACTIVE_BADGE_TEXT,
});

/* ── Empty-state block ────────────────────────────────────────────────────────────────────── */
const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  body: string;
  cta?: { label: string; onClick: () => void };
}> = ({ icon, title, body, cta }) => (
  <div className="flex flex-col items-center justify-center text-center" style={{ height: "100%", padding: "30px 22px" }}>
    {icon}
    <div style={{ fontFamily: FONT_SERIF, fontSize: 14, fontWeight: 600, color: bodyInk, marginTop: 11 }}>{title}</div>
    <div style={{ fontSize: 12, color: mutedInk, marginTop: 5, lineHeight: 1.45, maxWidth: 240 }}>{body}</div>
    {cta && (
      <button
        type="button"
        onClick={cta.onClick}
        className="oty-newnote"
        style={{
          marginTop: 14,
          fontFamily: FONT_MONO,
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: "0.05em",
          color: "#bd7461",
          background: "#fbf2ee",
          border: "1px dashed #e3bcae",
          borderRadius: 9,
          padding: "8px 14px",
          cursor: "pointer",
        }}
      >
        {cta.label}
      </button>
    )}
  </div>
);

export interface OverToYouProps {
  tasks: Task[];
  queries: Query[];
  agents: Agent[];
  notes: Note[];
  onAction: (task: Task) => void;
  onNudge: (task: Task) => void; // nudge_overdue rows open the Nudge modal instead of navigating
  onSnooze: (task: Task) => void; // kept for call-site compatibility; not rendered
  onDismiss: (task: Task) => void; // kept for call-site compatibility; not rendered
  onAllTasks: () => void; // kept for call-site compatibility; not rendered
  onOpenQuery: (queryId: string) => void;
  onAddNote: (fields: { text: string; colour?: NoteColour; dueDate?: string | null }) => void; // Notes tab create
  onCompleteNote: (id: string) => void; // tick a note done from the Notes tab
  onDeleteNote: (note: Note) => void; // kept for call-site compatibility; not rendered
  /** When set, an × renders in the pink band — used by the dashboard focus slot. */
  onClose?: () => void;
}

export const OverToYou: React.FC<OverToYouProps> = ({
  tasks,
  queries,
  agents,
  notes,
  onAction,
  onNudge,
  onOpenQuery,
  onAddNote,
  onCompleteNote,
  onClose,
}) => {
  const urgentRows = buildOverToYouRows(tasks, queries, agents);
  const houseRows = buildHousekeepingRows(tasks, queries, agents);
  const noteRows = byMostRecent(activeNotes(notes)); // active (not-done), newest first

  const urgentCount = urgentRows.length;
  const houseCount = houseRows.length;
  const notesCount = noteRows.length;
  const counts: Record<TabKey, number> = { urgent: urgentCount, house: houseCount, notes: notesCount };

  // Default tab: Urgent if > 0, else first non-empty in [Urgent, Housekeeping, Notes], else Urgent.
  const defaultTab: TabKey =
    urgentCount > 0 ? "urgent" : houseCount > 0 ? "house" : notesCount > 0 ? "notes" : "urgent";

  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);
  // Default-tab logic: follow the computed default on load, and whenever a recompute changes WHICH
  // tab is the default — until the user explicitly picks a tab, after which their choice sticks. That
  // lets them open an empty tab to see its empty state, and never bounces the tab while composing.
  const userPinned = useRef(false);
  useEffect(() => {
    if (!userPinned.current) setActiveTab(defaultTab);
  }, [defaultTab]);
  const selectTab = (k: TabKey) => {
    userPinned.current = true;
    setActiveTab(k);
  };

  // Notes: tick → complete (plays the leave animation, then the live subscription drops the row).
  const [leavingIds, setLeavingIds] = useState<Set<string>>(new Set());
  const tickNote = (id: string) => {
    setLeavingIds((prev) => new Set(prev).add(id));
    setTimeout(() => onCompleteNote(id), 320);
  };
  useEffect(() => {
    setLeavingIds((prev) => {
      if (prev.size === 0) return prev;
      const present = new Set(noteRows.map((n) => n.id));
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (present.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [noteRows]);

  // ── Inline note composer (minimal — shares the hero's addNote store, not its post-it UI) ──
  const [composing, setComposing] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [draftColour, setDraftColour] = useState<NoteColour>("pink");
  const [draftDue, setDraftDue] = useState<string | null>(null);
  const [dateOpen, setDateOpen] = useState(false);

  const resetCompose = () => {
    setComposing(false);
    setDraftText("");
    setDraftColour("pink");
    setDraftDue(null);
    setDateOpen(false);
  };
  const openCompose = () => {
    userPinned.current = true;
    setActiveTab("notes");
    setComposing(true);
  };
  const saveCompose = () => {
    const text = draftText.trim();
    if (!text) return;
    onAddNote({ text, colour: draftColour, dueDate: draftDue });
    resetCompose();
  };

  const routeHousekeeping = (task: Task) => {
    if (task.taskType === "no_response_close") onOpenQuery(task.relatedRecordId);
    else onAction(task);
  };

  return (
    // lg:h-full fills the absolutely-positioned hero cell (Dashboard caps it to the stat-cards
    // row height); minHeight:0 lets the flex body scroll internally instead of growing the card.
    <MountCard className="flex flex-col lg:h-full" style={{ minHeight: 0 }}>
      <style>{OTY_CSS}</style>

      {/* ── Header — pinned PINK band (the To-do list is the lone pink header on the dashboard) ── */}
      <div
        className="flex items-center shrink-0"
        style={{
          position: "relative",
          zIndex: 2,
          margin: "6px 6px 0",
          borderRadius: "8px 8px 0 0",
          padding: "13px 18px 12px",
          background: "linear-gradient(135deg, #f3e0d6 0%, #eed4c8 100%)",
          borderBottom: "1px solid rgba(124,58,42,0.15)",
          gap: 10,
        }}
      >
        {/* Pulsing dot — ONLY while there are urgent items. */}
        {urgentCount > 0 && (
          <span style={{ position: "relative", display: "inline-flex", width: 7, height: 7 }} aria-hidden="true">
            <span className="oty-pulse-ring" style={{ position: "absolute", inset: 0, borderRadius: "50%", background: burgundy }} />
            <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: burgundy }} />
          </span>
        )}
        <span style={{ fontFamily: FONT_SERIF, fontSize: 16, fontWeight: 600, color: burgundy, lineHeight: 1 }}>
          To-do list
        </span>
        {/* Optional close — rendered only when the card lives in the dashboard focus slot. */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title="Close"
            aria-label="Close to-do list"
            style={{ marginLeft: "auto", background: "none", border: "none", fontSize: 17, lineHeight: 1, color: burgundy, opacity: 0.65, padding: "0 2px", cursor: "pointer" }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.65"; }}
          >
            ×
          </button>
        )}
      </div>

      {/* ── Tab strip — on parchment, hairline underneath ───────────────────────────────────── */}
      <div
        className="flex items-stretch shrink-0"
        style={{
          position: "relative",
          zIndex: 2,
          margin: "0 6px",
          padding: "0 8px",
          background: parchment,
          borderBottom: "1px solid #f0eae2",
          gap: 2,
        }}
        role="tablist"
      >
        {TAB_SPECS.map((spec) => {
          const active = activeTab === spec.key;
          const count = counts[spec.key];
          const pulse = spec.key === "urgent" && urgentCount > 0;
          return (
            <button
              key={spec.key}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => selectTab(spec.key)}
              className="oty-tab"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "11px 10px 9px",
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${active ? spec.underline : "transparent"}`,
                marginBottom: -1,
                cursor: "pointer",
                fontFamily: FONT_SERIF,
                fontSize: 13,
                fontWeight: active ? 700 : 600,
                color: active ? spec.activeLabel : INACTIVE_LABEL,
              }}
            >
              {spec.label}
              <span className={pulse ? "oty-badge-pulse" : undefined} style={tabBadgeStyle(active, spec)}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Body — one pane per tab; capped height, internal scroll ─────────────────────────── */}
      <div
        className="flex-1 min-h-0 overflow-y-auto"
        style={{ position: "relative", zIndex: 2, margin: "0 6px 6px", padding: "8px 12px 10px 14px" }}
      >
        {/* ===== Urgent pane ===== */}
        {activeTab === "urgent" &&
          (urgentRows.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="w-[26px] h-[26px]" style={{ color: "#8a9e88" }} strokeWidth={1.6} />}
              title="All clear"
              body="Nothing needs you right now. Time to write."
            />
          ) : (
            urgentRows.map((row, i) => (
              <div
                key={row.task.id}
                className="flex items-center justify-between gap-3"
                style={{ padding: "10px 2px", borderTop: i > 0 ? "0.5px solid #f0e6d8" : undefined }}
              >
                <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => onOpenQuery(row.task.relatedRecordId)}>
                  <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                    <span style={urgentChipStyle}>{row.chip}</span>
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
                  className="oty-action urgent shrink-0"
                  style={urgentBtnStyle}
                  onClick={() => (row.type === "nudge_overdue" ? onNudge(row.task) : onAction(row.task))}
                >
                  {row.actionLabel}
                </button>
              </div>
            ))
          ))}

        {/* ===== Housekeeping pane ===== */}
        {activeTab === "house" &&
          (houseRows.length === 0 ? (
            <EmptyState
              icon={<ListChecks className="w-[26px] h-[26px]" style={{ color: "#8a9e88" }} strokeWidth={1.6} />}
              title="Nothing to tidy"
              body="No stale queries or loose ends just now."
            />
          ) : (
            houseRows.map((row, i) => (
              <div
                key={row.task.id}
                className="flex items-center justify-between gap-3"
                style={{ padding: "10px 2px", borderTop: i > 0 ? "0.5px solid #f0e6d8" : undefined }}
              >
                <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => routeHousekeeping(row.task)}>
                  <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                    <span style={sageChipStyle}>{row.chip}</span>
                    <span
                      style={{
                        minWidth: 0,
                        fontSize: 13,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {row.subject}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: mutedInk, marginTop: 3, lineHeight: 1.4 }}>{row.description}</div>
                </div>
                <button className="oty-action sage shrink-0" style={sageBtnStyle} onClick={() => routeHousekeeping(row.task)}>
                  {row.actionLabel}
                </button>
              </div>
            ))
          ))}

        {/* ===== Notes pane ===== */}
        {activeTab === "notes" && (
          <>
            {noteRows.length === 0 && !composing ? (
              <EmptyState
                icon={<PlusCircle className="w-[26px] h-[26px]" style={{ color: "#bd7461" }} strokeWidth={1.6} />}
                title="No notes yet"
                body="Jot a reminder to yourself — it'll wait here until you're ready."
                cta={{ label: "+ Write your first note", onClick: openCompose }}
              />
            ) : (
              <>
                {noteRows.map((note, i) => {
                  const theme = NOTE_THEMES[note.colour];
                  const leaving = leavingIds.has(note.id);
                  return (
                    <div
                      key={note.id}
                      className={`oty-note-row${leaving ? " sa-row-leaving" : ""}`}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 11,
                        padding: "10px 4px 10px 0",
                        borderLeft: `4px solid ${theme.fill}`,
                        paddingLeft: 11,
                        borderRadius: 4,
                        borderTop: i > 0 ? "0.5px solid #f0e6d8" : undefined,
                      }}
                    >
                      <button
                        type="button"
                        aria-label="Complete"
                        className={leaving ? undefined : "oty-tick"}
                        onClick={() => tickNote(note.id)}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          border: `1.5px solid ${theme.ink}`,
                          background: leaving ? theme.ink : "#fff",
                          flexShrink: 0,
                          cursor: "pointer",
                          marginTop: 2,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                        }}
                      >
                        {leaving && <Check size={11} strokeWidth={3.5} color="#fff" />}
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: FONT_CAVEAT, fontSize: 19, fontWeight: 500, lineHeight: 1.2, color: "#5a4a40" }}>
                          {note.text}
                        </div>
                        <div
                          style={{
                            marginTop: 5,
                            fontFamily: FONT_MONO,
                            fontSize: 8.5,
                            letterSpacing: "0.07em",
                            textTransform: "uppercase",
                            color: "#a8978a",
                          }}
                        >
                          Noted {formatCreatedStamp(note.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Inline composer OR the dashed "+ New note" row. */}
                {composing ? (
                  <div
                    style={{
                      marginTop: 10,
                      borderRadius: 9,
                      border: "1px solid #e3c8bc",
                      background: "#fdf6f2",
                      padding: "10px 11px",
                    }}
                  >
                    <textarea
                      autoFocus
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          saveCompose();
                        }
                        if (e.key === "Escape") resetCompose();
                      }}
                      placeholder="Write a note to yourself…"
                      rows={2}
                      style={{
                        width: "100%",
                        resize: "none",
                        border: "none",
                        outline: "none",
                        background: "transparent",
                        fontFamily: FONT_CAVEAT,
                        fontSize: 19,
                        lineHeight: 1.25,
                        color: "#5a4a40",
                      }}
                    />
                    <div className="flex items-center justify-between" style={{ marginTop: 8, gap: 8 }}>
                      <div className="flex items-center" style={{ gap: 8 }}>
                        {NOTE_COLOURS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            aria-label={c}
                            className="oty-swatch"
                            onClick={() => setDraftColour(c)}
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: "50%",
                              background: NOTE_THEMES[c].fill,
                              border: draftColour === c ? `2px solid ${NOTE_THEMES[c].ink}` : "1px solid rgba(0,0,0,0.12)",
                              cursor: "pointer",
                              padding: 0,
                            }}
                          />
                        ))}
                        <span style={{ position: "relative" }}>
                          <button
                            type="button"
                            onClick={() => setDateOpen((v) => !v)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontFamily: FONT_MONO,
                              fontSize: 9,
                              letterSpacing: "0.04em",
                              color: draftDue ? burgundy : "#a8978a",
                              background: draftDue ? "#f6ddd1" : "transparent",
                              border: `0.5px solid ${draftDue ? "#e8c8bc" : "#ddd0c4"}`,
                              borderRadius: 7,
                              padding: "4px 8px",
                              cursor: "pointer",
                              marginLeft: 4,
                            }}
                          >
                            <Calendar size={11} strokeWidth={2} />
                            {draftDue ? formatCreatedStamp(draftDue) : "Date"}
                          </button>
                          {dateOpen && (
                            <span style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 30 }}>
                              <NoteComposeCalendar
                                value={draftDue}
                                onPick={(iso) => {
                                  setDraftDue(iso);
                                  setDateOpen(false);
                                }}
                              />
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center" style={{ gap: 6 }}>
                        <button
                          type="button"
                          aria-label="Cancel"
                          onClick={resetCompose}
                          style={{ background: "transparent", border: "none", color: "#a8978a", cursor: "pointer", lineHeight: 0, padding: 4 }}
                        >
                          <X size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={saveCompose}
                          disabled={!draftText.trim()}
                          style={{
                            fontFamily: FONT_MONO,
                            fontSize: 9.5,
                            fontWeight: 500,
                            letterSpacing: "0.06em",
                            background: draftText.trim() ? "#f5e2da" : "#f0e7e0",
                            color: draftText.trim() ? burgundy : "#bcab9d",
                            border: `1px solid ${draftText.trim() ? "#e8c8bc" : "#e4dad0"}`,
                            borderRadius: 9,
                            padding: "7px 14px",
                            cursor: draftText.trim() ? "pointer" : "default",
                          }}
                        >
                          Save note
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={openCompose}
                    className="oty-newnote"
                    style={{
                      width: "100%",
                      marginTop: 10,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 7,
                      fontFamily: FONT_MONO,
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: "0.05em",
                      color: "#bd7461",
                      background: "transparent",
                      border: "1px dashed #e3bcae",
                      borderRadius: 9,
                      padding: "9px 14px",
                      cursor: "pointer",
                    }}
                  >
                    <Plus size={13} strokeWidth={2.4} /> New note
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </MountCard>
  );
};
