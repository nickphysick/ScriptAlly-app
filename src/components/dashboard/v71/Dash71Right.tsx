/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v71 — the right column (ref design-refs/dashboard-v71/).
 *
 * While querying the column is TWO CARDS and nothing else: the task card filling the height, then
 * the founding writer card at a fixed height. v59's title ("What's on the list today?"),
 * "All {n} →", the hairline and the Then rows are retired, with v58's focus card. Before the first
 * query the column is v60.1's, unchanged: "Ready for lift off?", the hairline, then the founding
 * writer card.
 */
import React from "react";

export const Dash71Right: React.FC<{
  /** the task card (querying) */
  task: React.ReactNode;
  /** the founding writer card */
  panel: React.ReactNode;
  /** before the first query, "Ready for lift off?" takes the task card's place (v60) */
  lift?: React.ReactNode;
}> = ({ task, panel, lift }) => {
  if (lift) {
    return (
      <section className="d58-right" data-d58="right" data-mode="pre" aria-label="Getting started">
        {lift}
        <hr className="d59-rule" data-d58="rule" />
        {panel}
      </section>
    );
  }
  return (
    <section className="d58-right d71-right" data-d58="right" data-mode="q">
      <div className="d71-taskslot" data-d71="task-slot">{task}</div>
      <div className="d71-fwslot" data-d71="fw-slot">{panel}</div>
    </section>
  );
};
