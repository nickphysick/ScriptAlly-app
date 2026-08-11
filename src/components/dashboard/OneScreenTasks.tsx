/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenTasks — the tasks card (spec §5; ref dashboard-one-screen.html).
 *
 * ⚠️ THE END CELL IS ONE CELL, TWO OCCUPANTS: the status pill and the action button are BOTH
 * absolutely positioned in the same 104px cell, crossfading on hover/focus-within — so revealing
 * the action can never reflow the row. On touch (`hover:none`) the action is simply always on.
 *
 * ⚠️ ROWS COME FROM THE LIVE CTA BUILDERS — buildOverToYouRows and buildHousekeepingRows, the
 * same derivations the To-do board runs. This card lists and links; it never re-decides what a
 * task's action is.
 */
import React from "react";
import { Agent, Query, Task, UserTask } from "../../types";
import { taskSurfaced } from "../../lib/todoBoard";
import { buildHousekeepingRows, buildOverToYouRows } from "./OverToYou";
import { Skel } from "./OneScreenDashboard";

/** "Due today" / "Due Friday" / "Overdue" — the row's second line when it has no detail of its own. */
const dueWord = (dueYmd: string, now: Date): string => {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (dueYmd < today) return "Overdue";
  if (dueYmd === today) return "Due today";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dueYmd);
  if (!m) return "Due";
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  return `Due ${d.toLocaleDateString("en-GB", { weekday: "long" })}`;
};

/**
 * ⚠️ THE HEADER SENTENCE IS RETIRED (v16 §4) — the title now states the job and the COUNT PILLS
 * state the split. The sentence had to pick one number to lead on and say nothing about the rest.
 *
 * ⚠️ THE PILLS COUNT EXACTLY THE ROWS BENEATH THEM. A pill for a kind this card does not render
 * would send you to "See all" to find out what it meant, and the visible list would never add up
 * to the summary above it — which is the whole fault a summary exists to avoid.
 */
export interface TaskTrio { key: "urgent" | "house" | "mine"; label: string; n: number }
export const taskTrio = (urgent: number, housekeeping: number, yours: number): TaskTrio[] =>
  ([
    { key: "urgent", label: "urgent", n: urgent },
    { key: "house", label: "housekeeping", n: housekeeping },
    { key: "mine", label: "yours", n: yours },
  ] as TaskTrio[]).filter((p) => p.n > 0); // a kind with nothing in it simply drops out

/**
 * ⚠️ "YOURS" REUSES THE ONE SURFACING LAW (`taskSurfaced`), never a second rule written here: a
 * user card with a due date is a TASK, and it joins today's list once its surfacing window opens.
 * Dateless cards are NOTES and never surface — so they are not counted, and not shown.
 */
export const yourTasksToday = (userTasks: UserTask[], now: Date): UserTask[] => {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return userTasks.filter((t) => !t.done && !!t.dueDate && taskSurfaced(t.dueDate, t.surfaceOffset, today));
};

/** The kind pill's word (§5): Pages / Offer / Tidy — a scan column, not a sentence. */
export const kindWord = (urgentType: string | null): { word: string; sage: boolean } => {
  if (urgentType === null) return { word: "Tidy", sage: true };
  if (urgentType === "offer_received") return { word: "Offer", sage: true };
  return { word: "Pages", sage: false };
};

export const OneScreenTasks: React.FC<{
  loading: boolean;
  tasks: Task[];
  queries: Query[];
  agents: Agent[];
  userTasks: UserTask[];
  now: Date;
  dayOne?: boolean;
  onAction: (task: Task) => void;
  onSeeAll: () => void;
  onAddManuscript?: () => void;
  onAddAgent?: () => void;
}> = ({ loading, tasks, queries, agents, userTasks, now, dayOne = false, onAction, onSeeAll, onAddManuscript, onAddAgent }) => {
  const urgent = buildOverToYouRows(tasks, queries, agents);
  const house = buildHousekeepingRows(tasks, queries, agents);
  const mine = yourTasksToday(userTasks, now);
  const trio = taskTrio(urgent.length, house.length, mine.length);
  const empty = trio.length === 0;

  return (
    <div className={`os-card os-lift os-tasks${loading ? " isload" : ""}`}>
      {loading && <Skel bars={["h", "", "", ""]} />}
      <div className="os-th2">
        <h2>Tasks requiring your attention</h2>
        {/* ⚠️ ONE TYPEFACE THROUGHOUT THE PILL. Playfair digits beside Inter labels sit below the
            baseline — the numerals are the thing being read, so they set the face. */}
        <span className="os-trio">
          {dayOne || empty
            ? <span className="os-none">Nothing needs you</span>
            : trio.map((p) => (
              <span key={p.key} className={`os-p ${p.key === "urgent" ? "u" : p.key === "house" ? "h" : "m"}`}>
                <span className="os-pdot" aria-hidden="true" /><b>{p.n}</b> {p.label}
              </span>
            ))}
        </span>
        <button type="button" className="os-see" onClick={onSeeAll}>See all <span className="os-arr">→</span></button>
      </div>
      <div className="os-tbody">
        {dayOne ? (
          /* §9: day one explains where tasks come from and offers the two first moves */
          <div className="os-tempty os-dayone-tasks">
            <span>Tasks appear here as your queries progress.</span>
            <div className="os-dayone-ctas">
              <button type="button" className="os-btn-mini ghost" onClick={onAddManuscript}>Add your manuscript</button>
              <button type="button" className="os-btn-mini ghost" onClick={onAddAgent}>Add an agent</button>
            </div>
          </div>
        ) : empty && <div className="os-tempty"><span>Nothing needs you today.</span></div>}

        {/* urgent first, housekeeping beneath — one list, deadline order preserved per tier */}
        {urgent.map((r) => {
          const k = kindWord(r.type);
          return (
            <div className="os-trow" tabIndex={0} key={r.task.id}>
              <span className={`os-knd${k.sage ? " sg" : ""}`}>{k.word}</span>
              <span className="os-tt">
                <span className="os-tn">{r.description}</span>
                <span className="os-tm2">{r.agentName}</span>
              </span>
              <span className="os-endcell">
                <span className="os-stp u">Urgent</span>
                <span className="os-act">
                  <button type="button" className="os-btn-mini" onClick={() => onAction(r.task)}>{r.actionLabel}</button>
                </span>
              </span>
              {/* the ⋯ opens the board, where a task's full menu lives — never a dead control */}
              <button type="button" className="os-dots" title="Open on the To-do board" aria-label="Open on the To-do board" onClick={onSeeAll}>⋯</button>
            </div>
          );
        })}

        {mine.map((t) => (
          <div className="os-trow" tabIndex={0} key={t.id}>
            <span className="os-knd sg">{t.detail ? "Note" : "Task"}</span>
            <span className="os-tt">
              <span className="os-tn">{t.text}</span>
              <span className="os-tm2">{t.detail || dueWord(t.dueDate!, now)}</span>
            </span>
            <span className="os-endcell">
              <span className="os-stp t">Yours</span>
              <span className="os-act">
                <button type="button" className="os-btn-mini ghost" onClick={onSeeAll}>Open</button>
              </span>
            </span>
            <button type="button" className="os-dots" title="Open on the To-do board" aria-label="Open on the To-do board" onClick={onSeeAll}>⋯</button>
          </div>
        ))}

        {house.map((r) => (
          <div className="os-trow" tabIndex={0} key={r.task.id}>
            <span className="os-knd sg">Tidy</span>
            <span className="os-tt">
              <span className="os-tn">{r.description}</span>
              <span className="os-tm2">{r.subject}</span>
            </span>
            <span className="os-endcell">
              <span className="os-stp t">Housekeeping</span>
              <span className="os-act">
                <button type="button" className="os-btn-mini ghost" onClick={() => onAction(r.task)}>{r.actionLabel}</button>
              </span>
            </span>
            <button type="button" className="os-dots" title="Open on the To-do board" aria-label="Open on the To-do board" onClick={onSeeAll}>⋯</button>
          </div>
        ))}
      </div>
    </div>
  );
};
