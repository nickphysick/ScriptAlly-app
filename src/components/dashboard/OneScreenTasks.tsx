/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenTasks — the tasks card (§5). P2 SHELL: frame, header ladder and the empty state; the
 * grid rows, endcell crossfade and actions land in P4.
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

export const OneScreenTasks: React.FC<{
  loading: boolean;
  tasks: Task[];
  queries: Query[];
  agents: Agent[];
  onAction: (task: Task) => void;
  onSeeAll: () => void;
}> = ({ loading, tasks, queries, agents, onSeeAll }) => {
  const urgent = buildOverToYouRows(tasks, queries, agents);
  const house = buildHousekeepingRows(tasks, queries, agents);

  return (
    <div className={`os-card os-lift os-tasks${loading ? " isload" : ""}`}>
      {loading && <Skel bars={["h", "", "", ""]} />}
      <div className="os-th2">
        <h2>Tasks</h2>
        <span className="os-tc">{tasksHeader(urgent.length, house.length)}</span>
        <button type="button" className="os-see" onClick={onSeeAll}>See all <span className="os-arr">→</span></button>
      </div>
      <div className="os-tbody">
        {urgent.length === 0 && house.length === 0 && (
          <div className="os-tempty"><span>Nothing needs you today.</span></div>
        )}
      </div>
    </div>
  );
};
