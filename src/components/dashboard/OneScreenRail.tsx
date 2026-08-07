/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenRail — the 308px rail (§6): author tile → querying goals → activity → Pro mini-card.
 * P2 SHELL: the four card frames with their headers; the shelf, meter, feed and expand mechanics
 * land in P5.
 */
import React from "react";
import { Activity, Agent, Manuscript, Query, User, UserTask } from "../../types";
import { goalState } from "../../lib/oneScreen";
import { weekOfQuerying } from "../../lib/dashboardStats";
import { Skel } from "./OneScreenDashboard";

export interface OneScreenRailProps {
  loading: boolean;
  queries: Query[];
  agents: Agent[];
  manuscripts: Manuscript[];
  userTasks: UserTask[];
  activities: Activity[];
  currentUser: User | null;
  activeManuscript: Manuscript | null;
  onNavigate: (tab: string, sub?: string) => void;
  updateUserProfile: (fields: Partial<User>) => Promise<void>;
  now: Date;
}

export const OneScreenRail: React.FC<OneScreenRailProps> = ({
  loading, queries, manuscripts, currentUser, activeManuscript, now,
}) => {
  const goal = goalState(queries, currentUser?.goalTarget, currentUser?.goalPeriod, now);
  const msCount = manuscripts.length;

  return (
    <div className="os-colR">
      <div className={`os-card os-lift os-aut stowable${loading ? " isload" : ""}`}>
        {loading && <Skel bars={["h", "", "grow"]} />}
        <div className="os-aut-band"><span className="os-pill-o os-aut-wk">{weekOfQuerying(queries, now)} of querying</span></div>
        <div className="os-aut-body">
          <div className="os-aut-nm">{currentUser?.name ?? ""}</div>
          <div className="os-aut-sub">
            {msCount === 0 ? "No manuscript added yet" : `Querying ${msCount === 1 ? "one manuscript" : `${msCount} manuscripts`}`}
          </div>
        </div>
      </div>

      <div className={`os-card os-lift os-goal stowable${loading ? " isload" : ""}`}>
        {loading && <Skel bars={["h", "", ""]} />}
        <div className="os-goal-r1">
          <h2>Querying goals</h2>
          {goal && <span className="os-goal-num">{goal.done}/{goal.target}</span>}
        </div>
        {goal && <div className="os-goal-t">{goal.sentence}</div>}
      </div>

      <div className={`os-card os-lift os-actv${loading ? " isload" : ""}`}>
        {loading && <Skel bars={["h", "", "", "grow"]} />}
        <div className="os-ahead"><span className="os-aln" /><h2>Activity</h2><span className="os-aln" /></div>
        <div className="os-abody" />
        <div className="os-afoot"><span className="os-ac">Last 30 days</span></div>
      </div>

      <div className={`os-card os-promini${loading ? " isload" : ""}`}>
        {loading && <Skel bars={["h"]} />}
        <div className="os-pimg" aria-hidden="true">
          <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
        </div>
        <div className="os-pt2">
          <span className="os-plab">ScriptAlly Pro</span>
          <a href="/plans" onClick={(e) => e.preventDefault()}>See what's included <span className="os-arr">→</span></a>
        </div>
      </div>
    </div>
  );
};
