/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The dashboard's own loading page, behind the importing loader (onboarding v5, part 2).
 *
 * ⚠️ IT IS THE DASHBOARD, NOT A DRAWING OF IT. This mounts `Dash58` with `loading` set and no data,
 * inside the same two wrappers the shell gives it (`.ws-wbody` › `.ws-work`), so every box is the
 * one the dashboard draws while it loads — a ghost that is a second implementation drifts the day
 * the dashboard changes, and the writer sees the page jump as the loader hands over. Lock H2
 * compares the two at the same window.
 *
 * It is for show: `inert`, hidden from assistive technology, and its floating feed tab is not
 * drawn (the app's own arrives with the app).
 */
import React from "react";
import { Dash58 } from "../dashboard/v58/Dash58";

const NOTHING: never[] = [];
const noop = () => {};

export const DashGhost: React.FC = () => (
  <div className="ws-wbody im-ghost" aria-hidden="true" data-im="ghost" {...{ inert: true }}>
    <div className="ws-work">
      <div className="sa-dashroot font-sans">
        <Dash58
          loading
          queries={NOTHING} agents={NOTHING} manuscripts={NOTHING} tasks={NOTHING} userTasks={NOTHING}
          activities={NOTHING} taskFlags={NOTHING} currentUser={null} activeManuscript={null} onNavigate={noop}
        />
      </div>
    </div>
  </div>
);
