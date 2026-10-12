/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The "Your tasks" card — ONE index card on the cork board (Corkboard v1, Part D; ref
 * design-refs/corkboard-v4 `.card`, `.task`, `.addtask`). It lists the writer's own dated tasks so the board
 * holds everything of theirs in one place; the To-do list is still where they are made and finished.
 *
 * ⚠️ THE TICK NEVER WRITES. It hands the task to `onFinish`, which opens the To-do list's own task pane on it
 *    — the surface that finishes a task from every other door — and only that commits. A tick that wrote
 *    `done` here would be a second way to finish a task, with no Undo and none of the pane's reading.
 * ⚠️ NO COMPOSER OF ITS OWN: "+ Add a task" is the add bar's Task button, the To-do list's composer.
 * ⚠️ A FINISHED ROW IS A RECORD, NOT A CONTROL: struck through, "Done", and its tick is drawn but takes no press.
 */
import React from "react";
import { formatDate } from "../../lib/dates";
import type { OwnTasks } from "../../lib/corkboard";

/** "Thu 15 Oct" — through the one formatter, at local noon so the day cannot slip a zone. */
const shortDay = (ymd: string) => formatDate(`${ymd}T12:00:00`, { weekday: "short", day: "numeric", month: "short" });

export const CorkTasksCard: React.FC<{
  tasks: OwnTasks;
  onFinish: (id: string) => void;
  onAdd: () => void;
  onSeeAll: () => void;
}> = ({ tasks, onFinish, onAdd, onSeeAll }) => (
  <>
    <h3 className="cb-card-h">Your tasks</h3>
    {tasks.rows.length > 0 && (
      <div className="cb-tasks" data-cb="task-rows">
        {tasks.rows.map((t) => (
          <div className={`cb-task${t.done ? " is-done" : ""}`} key={t.id} data-cb-task={t.id}>
            <button
              type="button"
              role="checkbox"
              aria-checked={t.done}
              aria-disabled={t.done || undefined}
              className="cb-tick"
              aria-label={t.done ? `Finished: ${t.text}` : `Finish “${t.text}” on your To-do list`}
              onClick={t.done ? undefined : () => onFinish(t.id)}
            />
            <span className="cb-task-t">{t.text}</span>
            <time dateTime={t.done ? undefined : t.dueDate}>{t.done ? "Done" : shortDay(t.dueDate)}</time>
          </div>
        ))}
      </div>
    )}
    {tasks.more && (
      <button type="button" className="cb-seeall" data-cb="see-all" onClick={onSeeAll}>See all on your To-do list →</button>
    )}
    <button type="button" className="cb-addtask" data-cb="card-add" onClick={onAdd}>+ Add a task</button>
    <small className="cb-card-foot">These also appear on your To-do list.</small>
  </>
);
