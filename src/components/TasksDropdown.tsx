/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The notifications ("bell") dropdown — extracted verbatim from Nav.tsx so the same panel can be
 * mounted from any trigger (the top bar today; the AppShell rail foot next). Owns the task rows,
 * priority labels, the Action button (navigate → 450ms success animation → permanent dismiss),
 * Snooze 3d, and the overdue-note rows. The badge maths live in useTaskAlerts so the trigger's
 * count can never disagree with the panel's contents.
 *
 * Render inside an <AnimatePresence> behind an open flag — the panel is the motion.div itself,
 * so mount/exit animations keep working exactly as they did inline.
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { useScriptAllyDb } from "../lib/db";
import {
  burgundy,
  bodyInk,
  parchment,
  ghostButtonText,
  labelStyle,
  FONT_SANS,
  FONT_MONO,
  buttonPinkBg,
  buttonPinkBorder,
  hairline,
  labelColor,
  mutedInk,
} from "../lib/designTokens";
import { isOverdue, dueChipLabel } from "./notes/notesUtils";
import { FONT_CAVEAT, DUE_CHIP_STAGES } from "./notes/notesTheme";

/**
 * Badge + list source for the notifications trigger. An overdue dated note raises the same alarm
 * as a missed agent deadline, so it counts toward the bell badge alongside the derived tasks (and
 * appears in the dropdown list so the number matches).
 */
export const useTaskAlerts = () => {
  const { tasks, notes } = useScriptAllyDb();
  const overdueNotes = notes.filter((n) => !n.done && isOverdue(n.dueDate));
  const activeTasksCount = tasks.length + overdueNotes.length;
  const badgeText = activeTasksCount > 9 ? "9+" : activeTasksCount.toString();
  return { tasks, overdueNotes, activeTasksCount, badgeText };
};

interface TasksDropdownProps {
  onNavigate: (tab: string, subPageName?: string) => void;
  /** Positioning classes for the panel relative to its trigger wrapper (defaults to the top-bar placement). */
  positionClassName?: string;
}

export const TasksDropdown: React.FC<TasksDropdownProps> = ({
  onNavigate,
  positionClassName = "absolute right-0 top-[calc(100%+12px)] w-80",
}) => {
  const { dismissTask } = useScriptAllyDb();
  const { tasks, overdueNotes, activeTasksCount } = useTaskAlerts();
  const [successAnimationTaskId, setSuccessAnimationTaskId] = useState<string | null>(null);

  const handleActionTask = (task: any) => {
    onNavigate(task.actionPath);
    setSuccessAnimationTaskId(task.id);
    setTimeout(() => {
      dismissTask(task.taskType, task.relatedRecordId, "permanent");
      setSuccessAnimationTaskId(null);
    }, 450);
  };

  const handleSnooze = (task: any, days: number) => {
    setSuccessAnimationTaskId(task.id);
    setTimeout(() => {
      dismissTask(task.taskType, task.relatedRecordId, "fixed snooze", days);
      setSuccessAnimationTaskId(null);
    }, 450);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.12 }}
      className={`${positionClassName} p-1 text-left`}
      style={{
        background: parchment,
        border: "0.5px solid #e0d5c8",
        borderRadius: 12,
        boxShadow: "0 8px 24px rgba(58,28,20,0.16)",
        zIndex: 60,
        fontFamily: FONT_SANS,
      }}
    >
      <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: hairline }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: bodyInk }}>Notifications</p>
        {activeTasksCount > 0 && (
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 9,
              background: buttonPinkBg,
              color: burgundy,
              border: `0.5px solid ${buttonPinkBorder}`,
              borderRadius: 14,
              padding: "2px 8px",
              fontWeight: 500,
            }}
          >
            {activeTasksCount} pending
          </span>
        )}
      </div>

      <div className="max-h-64 overflow-y-auto py-1">
        {tasks.length === 0 && overdueNotes.length === 0 ? (
          <div className="p-4 text-center" style={{ fontSize: 12, color: mutedInk, fontStyle: "italic" }}>
            All caught up! No active tasks.
          </div>
        ) : (
          tasks.map((task) => {
            const isSnoozing = successAnimationTaskId === task.id;
            return (
              <div
                key={task.id}
                className={`p-2.5 transition-all ${isSnoozing ? "opacity-50 scale-95" : ""}`}
                style={{ borderBottom: hairline, fontSize: 12 }}
              >
                <div className="flex justify-between items-start gap-1">
                  <span
                    style={{
                      ...labelStyle,
                      letterSpacing: "0.08em",
                      color: task.priority === "urgent" ? burgundy : labelColor,
                    }}
                  >
                    {task.priority}
                  </span>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: labelColor, fontStyle: "italic" }} className="shrink-0">
                    {task.manuscriptTitle}
                  </span>
                </div>
                <h4 style={{ fontWeight: 600, color: bodyInk, marginTop: 4 }}>{task.title}</h4>
                <p style={{ color: mutedInk, marginTop: 2, fontSize: 11, lineHeight: 1.5 }}>
                  {task.description}
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleActionTask(task)}
                    className="cursor-pointer"
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: "0.05em",
                      background: buttonPinkBg,
                      color: burgundy,
                      border: `0.5px solid ${buttonPinkBorder}`,
                      borderRadius: 8,
                      padding: "5px 10px",
                    }}
                  >
                    {task.actionLabel || "Resolve"}
                  </button>
                  <button
                    onClick={() => handleSnooze(task, 3)}
                    className="cursor-pointer"
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 10,
                      background: "#ffffff",
                      color: ghostButtonText,
                      border: "0.5px solid #e0d5c8",
                      borderRadius: 8,
                      padding: "5px 10px",
                    }}
                  >
                    Snooze 3d
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Overdue notes — listed so the count matches the badge (your own dated tasks). */}
        {overdueNotes.map((note) => (
          <div key={note.id} className="p-2.5" style={{ borderBottom: hairline, fontSize: 12 }}>
            <div className="flex justify-between items-start gap-2">
              <span style={{ fontFamily: FONT_CAVEAT, fontSize: 16, fontWeight: 500, color: "#46352b", lineHeight: 1.2 }}>
                {note.text}
              </span>
              <span
                className="shrink-0"
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 8.5,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: DUE_CHIP_STAGES.over.ink,
                  background: DUE_CHIP_STAGES.over.bg,
                  border: `0.5px solid ${DUE_CHIP_STAGES.over.border}`,
                  borderRadius: 20,
                  padding: "2px 7px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 1,
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: DUE_CHIP_STAGES.over.dot || "#b5402a" }} />
                {dueChipLabel(note.dueDate)}
              </span>
            </div>
            <p style={{ ...labelStyle, letterSpacing: "0.08em", marginTop: 5 }}>Noted by you</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
