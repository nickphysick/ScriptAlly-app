/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FEED v1 — the activity feed in the page's middle column (ref design-refs/dashboard-feed-v1/).
 *
 * Part A places the column: the switch at its top, and below it a list that scrolls inside the column.
 */
import React, { useMemo, useState } from "react";
import type { Activity, Agent, Manuscript, Query } from "../../../types";
import { feedEntries } from "../../../lib/dashFeed";
import { drawerDays, drawerEvents, type FeedFilter } from "../../../lib/dashFeedDrawer";
import { buildQcRows } from "../../../lib/qcSummary";
import { FeedRow } from "../v58/Dash58Feed";

export const F1_SWITCH: readonly { key: FeedFilter; label: string }[] = [
  { key: "all", label: "All activity" },
  { key: "in", label: "Agents" },
  { key: "out", label: "You" },
];

export const F1Feed: React.FC<{
  loading: boolean;
  activities: Activity[];
  queries: Query[];
  agents: Agent[];
  manuscripts: Manuscript[];
  now: Date;
}> = ({ loading, activities, queries, agents, manuscripts, now }) => {
  const [filter, setFilter] = useState<FeedFilter>("all");
  const entries = useMemo(
    () => (loading ? [] : feedEntries({ activities, queries, agents, manuscripts, now, seenAt: null, honestDates: true })),
    [loading, activities, queries, agents, manuscripts, now],
  );
  const qcRows = useMemo(() => buildQcRows(queries, agents, activities, now.getTime()), [queries, agents, activities, now]);
  const days = useMemo(() => drawerDays(drawerEvents(entries, qcRows, filter), now), [entries, qcRows, filter, now]);
  return (
    <section className="df1-feedcol" aria-label="Activity feed" data-df1="feedcol">
      <div className="df1-sw" role="group" aria-label="Show">
        {F1_SWITCH.map((f) => (
          <button key={f.key} type="button" data-df1-sw={f.key} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</button>
        ))}
      </div>
      <div className="df1-fscroll" data-df1="fscroll">
        {days.map((d) => (
          <React.Fragment key={d.key}>
            <div className="df1-day">{d.heading}</div>
            {d.events.map((ev) => <FeedRow key={ev.entry.id} ev={ev} onAct={() => {}} />)}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
};
