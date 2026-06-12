/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Over to you" — the dashboard's high-priority action box (replaces the Next Up card).
 * Shows only writer's-turn sends (Partial/Full Requested) plus nudge-eligible items from
 * the existing Next Up logic, sorted by deadline. Snooze/dismiss wire to the existing
 * dismissTask handlers. No red anywhere; the count pill replaces carousel dots.
 */
import React from "react";
import { Flag, Clock, X, Send, Feather } from "lucide-react";
import { Task, Query, Agent, QueryStatus } from "../../types";
import { MountCard } from "../MountCard";
import {
  pinkBandGradient,
  pinkBandRule,
  parchment,
  burgundy,
  labelStyle,
  labelColor,
  sageText,
  FONT_SERIF,
  FONT_MONO,
  bodyInk,
  buttonPinkBg,
  buttonPinkBorder,
  buttonPinkHoverBg,
  buttonPinkHoverBorder,
} from "../../lib/designTokens";

/** The Over-to-you task types, in spec: writer's-turn sends + nudge-eligible items. */
const OVER_TO_YOU_TYPES = new Set(["partial_requested", "full_requested", "nudge_overdue"]);

export interface OverToYouRow {
  task: Task;
  agentName: string;
  verbPhrase: string; // "Send your partial" | "Send your full" | "Nudge"
  actionLabel: string; // "Send" | "Nudge"
  deadline: Date | null;
  caption: string; // "14 DAYS LEFT · DUE 26 JUN"
  overdue: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const fmtShortDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** Build the sorted Over-to-you rows from the live Next Up tasks. */
export const buildOverToYouRows = (tasks: Task[], queries: Query[], agents: Agent[]): OverToYouRow[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows = tasks
    .filter((t) => OVER_TO_YOU_TYPES.has(t.taskType))
    .map((task) => {
      const q = queries.find((item) => item.id === task.relatedRecordId);
      const agent = q ? agents.find((a) => a.id === q.agentId) : undefined;
      const agentName = agent?.name || "the agent";

      const verbPhrase =
        task.taskType === "partial_requested"
          ? "Send your partial"
          : task.taskType === "full_requested"
            ? "Send your full"
            : "Nudge";
      const actionLabel = task.taskType === "nudge_overdue" ? "Nudge" : "Send";

      const deadline = q?.responseDeadline ? new Date(q.responseDeadline) : null;
      let caption = "No deadline set";
      let overdue = false;
      if (deadline && !isNaN(deadline.getTime())) {
        const dl = new Date(deadline);
        dl.setHours(0, 0, 0, 0);
        const diffDays = Math.round((dl.getTime() - today.getTime()) / DAY_MS);
        if (diffDays > 0) {
          caption = `${diffDays} day${diffDays === 1 ? "" : "s"} left · due ${fmtShortDate(deadline)}`;
        } else if (diffDays === 0) {
          caption = `Due today · ${fmtShortDate(deadline)}`;
        } else {
          overdue = true;
          caption = `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} overdue · was due ${fmtShortDate(deadline)}`;
        }
      }

      return { task, agentName, verbPhrase, actionLabel, deadline, caption, overdue };
    });

  return rows.sort((a, b) => {
    if (a.deadline && b.deadline) return a.deadline.getTime() - b.deadline.getTime();
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    return 0;
  });
};

/** 30px square icon button (snooze / dismiss): white, muted icon warming to burgundy. */
const IconBtn: React.FC<{ title: string; onClick: () => void; children: React.ReactNode }> = ({
  title,
  onClick,
  children,
}) => (
  <button
    title={title}
    aria-label={title}
    onClick={onClick}
    className="flex items-center justify-center shrink-0 cursor-pointer"
    style={{
      width: 30,
      height: 30,
      borderRadius: 9,
      background: "#ffffff",
      border: "0.5px solid #e0d0c4",
      color: "#a08a78",
      transition: "all 0.2s",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = buttonPinkBg;
      e.currentTarget.style.borderColor = buttonPinkHoverBorder;
      e.currentTarget.style.color = burgundy;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = "#ffffff";
      e.currentTarget.style.borderColor = "#e0d0c4";
      e.currentTarget.style.color = "#a08a78";
    }}
  >
    {children}
  </button>
);

/** Compact send button: filled pink for the hot task, quiet white otherwise. */
const SendBtn: React.FC<{ label: string; quiet?: boolean; onClick: () => void }> = ({ label, quiet, onClick }) => (
  <button
    onClick={onClick}
    className="cursor-pointer shrink-0"
    style={{
      fontFamily: FONT_MONO,
      fontSize: 9.5,
      fontWeight: 500,
      letterSpacing: "0.06em",
      background: quiet ? "#ffffff" : buttonPinkBg,
      color: burgundy,
      border: `0.5px solid ${quiet ? "#e0d0c4" : buttonPinkBorder}`,
      borderRadius: 9,
      padding: "8px 15px",
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      whiteSpace: "nowrap",
      transition: "all 0.2s",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = quiet ? buttonPinkBg : buttonPinkHoverBg;
      e.currentTarget.style.borderColor = quiet ? buttonPinkBorder : buttonPinkHoverBorder;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = quiet ? "#ffffff" : buttonPinkBg;
      e.currentTarget.style.borderColor = quiet ? "#e0d0c4" : buttonPinkBorder;
    }}
  >
    <Send className="w-[11px] h-[11px] shrink-0" />
    {label}
  </button>
);

/** Task line: bold verb phrase + serif burgundy agent name. */
const TaskText: React.FC<{ row: OverToYouRow; onClick?: () => void }> = ({ row, onClick }) => (
  <div
    onClick={onClick}
    style={{ fontSize: 13, lineHeight: 1.45, color: bodyInk, cursor: onClick ? "pointer" : undefined }}
  >
    <b style={{ fontWeight: 500 }}>{row.verbPhrase}</b>{" "}
    {row.verbPhrase === "Nudge" ? "" : "to "}
    <span style={{ fontFamily: FONT_SERIF, color: burgundy }}>{row.agentName}</span>
  </div>
);

export interface OverToYouProps {
  tasks: Task[];
  queries: Query[];
  agents: Agent[];
  onAction: (task: Task) => void;
  onSnooze: (task: Task) => void;
  onDismiss: (task: Task) => void;
  onAllTasks: () => void;
  onOpenQuery: (queryId: string) => void;
}

export const OverToYou: React.FC<OverToYouProps> = ({
  tasks,
  queries,
  agents,
  onAction,
  onSnooze,
  onDismiss,
  onAllTasks,
  onOpenQuery,
}) => {
  const rows = buildOverToYouRows(tasks, queries, agents);
  const [hot, ...rest] = rows;
  const restShown = rest.slice(0, 2);

  // Empty-state fact line: how many queries currently sit with agents
  const withAgents = queries.filter((q) =>
    [QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT].includes(q.status)
  );
  const upcomingDeadlines = withAgents
    .map((q) => (q.responseDeadline ? new Date(q.responseDeadline) : null))
    .filter((d): d is Date => !!d && !isNaN(d.getTime()) && d.getTime() >= Date.now())
    .sort((a, b) => a.getTime() - b.getTime());

  return (
    <MountCard className="flex flex-col">
      {/* Edge-to-edge pink band */}
      <div
        className="flex items-center justify-between"
        style={{
          position: "relative",
          zIndex: 2,
          margin: "6px 6px 0",
          borderRadius: "8px 8px 0 0",
          padding: "13px 18px 12px",
          background: pinkBandGradient,
          borderBottom: `1px solid ${pinkBandRule}`,
        }}
      >
        <span style={{ ...labelStyle, color: burgundy, display: "flex", alignItems: "center", gap: 6 }}>
          <Flag className="w-[13px] h-[13px] shrink-0" strokeWidth={2} />
          Over to you
        </span>
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 9,
            fontWeight: 500,
            background: parchment,
            color: rows.length > 0 ? burgundy : sageText,
            border: `0.5px solid ${rows.length > 0 ? "rgba(124,58,42,0.2)" : "rgba(90,110,88,0.25)"}`,
            borderRadius: 14,
            padding: "3px 9px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {rows.length > 0 ? `${rows.length} action${rows.length === 1 ? "" : "s"}` : "All clear"}
        </span>
      </div>

      {/* Body */}
      {rows.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center text-center flex-1"
          style={{ position: "relative", zIndex: 2, margin: "0 6px 6px", padding: "28px 24px 26px" }}
        >
          <Feather className="w-[26px] h-[26px]" style={{ color: "#aab8a4", marginBottom: 10 }} strokeWidth={1.6} />
          <div
            style={{
              fontFamily: FONT_SERIF,
              fontStyle: "italic",
              fontSize: 13.5,
              color: "#5a6258",
              lineHeight: 1.65,
              maxWidth: 250,
            }}
          >
            You're all caught up.
          </div>
          <div style={{ ...labelStyle, marginTop: 13 }}>
            {withAgents.length} {withAgents.length === 1 ? "query" : "queries"} with agents
            {upcomingDeadlines.length > 0 && ` · next reply window ${fmtShortDate(upcomingDeadlines[0])}`}
          </div>
        </div>
      ) : (
        <div
          className="flex flex-col flex-1"
          style={{ position: "relative", zIndex: 2, margin: "0 6px 6px", padding: "14px 16px 16px" }}
        >
          {/* Hot tray — the single most urgent task */}
          {hot && (
            <div
              className="flex items-center justify-between gap-3"
              style={{
                background: "#fff3ed",
                border: "0.5px solid #eed6c8",
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <TaskText row={hot} onClick={() => onOpenQuery(hot.task.relatedRecordId)} />
                <div
                  style={{
                    ...labelStyle,
                    letterSpacing: "0.06em",
                    marginTop: 3,
                    color: burgundy,
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Clock className="w-[11px] h-[11px] shrink-0" />
                  {hot.caption}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <SendBtn label={hot.actionLabel} onClick={() => onAction(hot.task)} />
                <IconBtn title="Snooze" onClick={() => onSnooze(hot.task)}>
                  <Clock className="w-[13px] h-[13px]" />
                </IconBtn>
                <IconBtn title="Dismiss" onClick={() => onDismiss(hot.task)}>
                  <X className="w-3 h-3" />
                </IconBtn>
              </div>
            </div>
          )}

          {/* Remaining rows */}
          {restShown.map((row, i) => (
            <div
              key={row.task.id}
              className="flex items-center justify-between gap-3"
              style={{
                padding: "10px 4px",
                borderTop: i > 0 ? "0.5px solid #f0e6d8" : undefined,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <TaskText row={row} onClick={() => onOpenQuery(row.task.relatedRecordId)} />
                <div style={{ ...labelStyle, letterSpacing: "0.06em", marginTop: 3 }}>{row.caption}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <SendBtn quiet label={row.actionLabel} onClick={() => onAction(row.task)} />
                <IconBtn title="Snooze" onClick={() => onSnooze(row.task)}>
                  <Clock className="w-[13px] h-[13px]" />
                </IconBtn>
                <IconBtn title="Dismiss" onClick={() => onDismiss(row.task)}>
                  <X className="w-3 h-3" />
                </IconBtn>
              </div>
            </div>
          ))}

          {/* Footer */}
          <div
            className="flex items-center justify-between"
            style={{ marginTop: "auto", paddingTop: 11, borderTop: "0.5px solid #ece0d2" }}
          >
            <span style={labelStyle}>Everything else is with the agents</span>
            <button
              onClick={onAllTasks}
              className="cursor-pointer"
              style={{ ...labelStyle, color: burgundy, background: "transparent", border: "none", padding: 0 }}
            >
              All tasks →
            </button>
          </div>
        </div>
      )}
    </MountCard>
  );
};
