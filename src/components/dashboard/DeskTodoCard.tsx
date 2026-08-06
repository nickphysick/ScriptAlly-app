/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The hero's to-do card (ref design-refs/dashboard-settled-desk.html).
 *
 * ⚠️ PERMANENT FURNITURE, AND COMPACT BY DESIGN. It is always on — no chip, no popover, no drawer —
 * and it shows at most three items so it never out-heights the greeting column beside it. The rest
 * live on the board, one link away.
 *
 * ⚠️ THE BAND CHANGES WITH THE TIER, and that is the card's whole signal: pink means something
 * needs you, sage means there is tidying if you fancy it, neutral means notes only. A reader should
 * know which of those it is before reading a word.
 */
import React from "react";
import { Agent, Query, Task, UserTask } from "../../types";
import { buildHousekeepingRows, buildOverToYouRows } from "./OverToYou";
import { TIER_PILL, TODO_CARD_LIMIT, tierFooter, tierHeader, todoTier } from "../../lib/todoTiers";
import "./deskTodo.css";

export interface DeskTodoCardProps {
  tasks: Task[];
  queries: Query[];
  agents: Agent[];
  userNotes: UserTask[];
  onAction: (task: Task) => void;
  onSeeAll: () => void;
}

export const DeskTodoCard: React.FC<DeskTodoCardProps> = ({
  tasks, queries, agents, userNotes, onAction, onSeeAll,
}) => {
  const urgentRows = buildOverToYouRows(tasks, queries, agents);
  const houseRows = buildHousekeepingRows(tasks, queries, agents);
  const noteRows = [...userNotes].filter((t) => !t.done).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const counts = { urgent: urgentRows.length, housekeeping: houseRows.length, notes: noteRows.length };
  const tier = todoTier(counts);

  return (
    <section className={`dt-card tier-${tier}`} aria-label="To-do">
      <div className="dt-band">
        <span className="dt-hd">{tierHeader(tier, counts)}</span>
        <span className="dk-pill dt-pill">{TIER_PILL[tier]}</span>
      </div>

      <div className="dt-body">
        {tier === "clear" && (
          <div className="dt-clear">
            <div className="dt-clear-mark" aria-hidden="true">✓</div>
            <div className="dk-empty">Everything is where it should be.</div>
          </div>
        )}

        {tier === "urgent" && urgentRows.slice(0, TODO_CARD_LIMIT).map((r) => (
          <div className="dt-item" key={r.task.id}>
            <span className="dt-kind">{r.chip}</span>
            <div className="dt-main">
              <div className="dt-nm">{r.agentName}</div>
              <div className="dt-sub">{r.description}</div>
            </div>
            <button type="button" className="dt-btn" onClick={() => onAction(r.task)}>{r.actionLabel}</button>
          </div>
        ))}

        {tier === "housekeeping" && houseRows.slice(0, TODO_CARD_LIMIT).map((r) => (
          <div className="dt-item" key={r.task.id}>
            <span className="dt-kind tidy">{r.chip}</span>
            <div className="dt-main">
              <div className="dt-nm">{r.subject}</div>
              <div className="dt-sub">{r.description}</div>
            </div>
            <button type="button" className="dt-btn ghost" onClick={() => onAction(r.task)}>{r.actionLabel}</button>
          </div>
        ))}

        {/* ⚠️ A NOTE HAS NO ACTION BUTTON. It is a thing you wrote to yourself, not a task the app
            is holding you to — offering "Mark done" would turn a jotting into an obligation. */}
        {tier === "notes" && noteRows.slice(0, TODO_CARD_LIMIT).map((n) => (
          <div className="dt-item" key={n.id}>
            <span className="dt-kind note">Note</span>
            <div className="dt-main">
              <div className="dt-nm hand">{n.text}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dt-foot">
        <span className="dk-lbl">{tierFooter(tier, counts)}</span>
        <button type="button" className="dk-link" onClick={onSeeAll}>See all tasks →</button>
      </div>
    </section>
  );
};
