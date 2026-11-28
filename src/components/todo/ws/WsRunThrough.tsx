/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do arrival v1 — "WHERE TO START" (design-refs/todo-arrival-v1/, "Run-through first", "On the page"). The desk while
 * no task is open and something needs the writer: on the workspace's own ground, no desk card, no navy bar.
 */
import React from "react";
import { longDay } from "../../../lib/todoArrival";

export const WsRunThrough: React.FC<{ today: Date }> = ({ today }) => (
  <div className="twa-run" data-twa="run">
    <div className="twa-head" data-twa="head"><h2>Where to start</h2><em>{longDay(today)}</em></div>
  </div>
);
