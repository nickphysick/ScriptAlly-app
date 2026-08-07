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
import { Agent, Query, Task } from "../../types";
import { buildHousekeepingRows, buildOverToYouRows } from "./OverToYou";
import { Skel } from "./OneScreenDashboard";

/** §5's header ladder — a pure export so the copy is testable without a render. */
export const tasksHeader = (urgent: number, housekeeping: number): string => {
  if (urgent > 0) return `${urgent} ${urgent === 1 ? "thing requires" : "things require"} your attention`;
  if (housekeeping === 1) return "One thing to pick up when you have a moment";
  if (housekeeping > 1) return "Spare some time to work on these";
  return "Nothing needs you";
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
  onAction: (task: Task) => void;
  onSeeAll: () => void;
}> = ({ loading, tasks, queries, agents, onAction, onSeeAll }) => {
  const urgent = buildOverToYouRows(tasks, queries, agents);
  const house = buildHousekeepingRows(tasks, queries, agents);
  const empty = urgent.length === 0 && house.length === 0;

  return (
    <div className={`os-card os-lift os-tasks${loading ? " isload" : ""}`}>
      {loading && <Skel bars={["h", "", "", ""]} />}
      <div className="os-th2">
        <h2>Tasks</h2>
        <span className="os-tc">{tasksHeader(urgent.length, house.length)}</span>
        <button type="button" className="os-see" onClick={onSeeAll}>See all <span className="os-arr">→</span></button>
      </div>
      <div className="os-tbody">
        {empty && <div className="os-tempty"><span>Nothing needs you today.</span></div>}

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
