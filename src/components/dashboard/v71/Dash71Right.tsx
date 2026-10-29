/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v71 — the right column (ref design-refs/dashboard-v71/).
 *
 * While querying the column is TWO CARDS and nothing else: the task card filling the height, then
 * the founding writer card at a fixed height. v59's title ("What's on the list today?"),
 * "All {n} →", the hairline and the Then rows are retired, with v58's focus card. Before the first
 * query it is the same two cards (first visit v1): the task card is Getting started, and "Ready for lift
 * off?" with its hairline is retired.
 */
import React from "react";

export const Dash71Right: React.FC<{
  /** the task card — Getting started before the first query (first visit v1) */
  task: React.ReactNode;
  /** the founding writer card */
  panel: React.ReactNode;
}> = ({ task, panel }) => (
  <section className="d58-right d71-right" data-d58="right" data-mode="q">
    <div className="d71-taskslot" data-d71="task-slot">{task}</div>
    <div className="d71-fwslot" data-d71="fw-slot">{panel}</div>
  </section>
);
