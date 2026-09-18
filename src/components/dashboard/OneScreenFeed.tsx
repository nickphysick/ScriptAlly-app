/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenFeed — the activity feed card (v16, 18 Sep; ref design-refs/dashboard-v16-2026-09-18.html).
 *
 * Everything logged in the last thirty days, newest first, under day rules. Each entry states a pill
 * and a time, then what happened as a sentence, then where it came from; an entry that still has
 * something to do carries an underlined link on the right.
 *
 * ⚠️ IT REPLACES `OneScreenRail`, WHICH IS RETIRED WITH THE CONVERSATION. The bubbles, their sides,
 * their tight runs, the filter tabs and the community tile are gone; the derivation they were drawn
 * from moved to `lib/dashFeed` and is the same one — so this is a new layout over a proven feed
 * rather than a new feed.
 *
 * ⚠️ THE "NEW" RULE IS THE CARD'S LEFT MARGIN, NOT A BADGE ON THE ROW. The ref draws a 3px rust rule
 * in the padding beside anything logged since the writer last had this page open; `lib/dashSeen` holds
 * that moment, per device, and stamps it on UNMOUNT — stamping on arrival would clear the marks in the
 * same frame that drew them.
 *
 * ⚠️ AND THE SENTENCE IS RENDERED FROM RUNS, NEVER FROM A STRING WITH MARKUP IN IT. `dashFeed` marks
 * which run is the person and which is the manuscript; the row sets one in semibold and the other in
 * Special Elite. Finding either inside a finished sentence would mean parsing a name back out of
 * prose, which this codebase forbids everywhere it has tried it.
 */
import React from "react";
import type { Activity, Agent, Manuscript, Query } from "../../types";
import { FEED_DAYS, feedDays, feedEntries, type FeedSeg } from "../../lib/dashFeed";
import { FEED_FIRST_RUN_LINE } from "../../lib/dashEmpty";
import { OneScreenPanel } from "./OneScreenPanel";
import { StatePill } from "./StatePill";

const Say: React.FC<{ say: readonly FeedSeg[] }> = ({ say }) => (
  <>
    {say.map((s, i) => (
      s.em ? <i key={i} className="os-fbook">{s.t}</i>
        : s.who ? <b key={i} className="os-fwho">{s.t}</b>
          : <React.Fragment key={i}>{s.t}</React.Fragment>
    ))}
  </>
);

export const OneScreenFeed: React.FC<{
  loading: boolean;
  activities: Activity[];
  queries: Query[];
  agents: Agent[];
  manuscripts: Manuscript[];
  now: Date;
  /** when this device last left the dashboard — `lib/dashSeen` */
  seenAt: number | null;
  /** the page's zero-query branch: the feed states what it will hold rather than drawing nothing */
  empty?: boolean;
  /** an entry offering "Send it" hands its query up; the to-do card opens the drawer on it */
  onOpenTask?: (queryId: string) => void;
}> = ({ loading, activities, queries, agents, manuscripts, now, seenAt, empty = false, onOpenTask }) => {
  const entries = React.useMemo(
    () => (loading ? [] : feedEntries({ activities, queries, agents, manuscripts, now, seenAt })),
    [loading, activities, queries, agents, manuscripts, now, seenAt],
  );
  const days = React.useMemo(() => feedDays(entries), [entries]);

  return (
    <OneScreenPanel
      variant="os-feed" tone="slate" probe="activity-card" loading={loading} skel={["h", "grow", "grow"]}
      /* ⚠️ NO SUB-HEADING UNDER ANY TITLE (v33). The eyebrow that stood here also carried "· N new";
         the rust rule in each new entry's margin is what marks them now, and it marks the entries
         themselves rather than counting them somewhere else. */
      band={(
        <div className="os-bandrow">
          <h3 className="os-cardttl">Activity feed</h3>
          <span className="os-mini">{FEED_DAYS} days</span>
        </div>
      )}
    >
      <div className="os-scroll" data-probe="feed">
        {days.map((d) => (
          <React.Fragment key={d.label}>
            <div className="os-fday">{d.label}</div>
            {d.entries.map((e) => (
              <div
                className={`os-fent${e.isNew ? " os-fent--new" : ""}${e.app ? " os-fent--app" : ""}`}
                key={e.id}
                data-probe="feed-entry"
              >
                <div className="os-fmain">
                  <div className="os-fband">
                    <StatePill status={e.status ?? null} state={e.state} label={e.pill} />
                    <time className="os-ftime">{e.time}</time>
                  </div>
                  <p className="os-fsay">
                    <Say say={e.say} />
                    {e.provenance ? <small className="os-fprov">{e.provenance}</small> : null}
                  </p>
                </div>
                {e.action && onOpenTask
                  ? (
                    <button type="button" className="os-flink" onClick={() => onOpenTask(e.action!.queryId)}>
                      {e.action.label}
                    </button>
                  )
                  : <span />}
              </div>
            ))}
          </React.Fragment>
        ))}
        {!loading && entries.length === 0 && (
          <p className="os-fempty">
            {empty ? FEED_FIRST_RUN_LINE : `Nothing logged in the last ${FEED_DAYS} days.`}
          </p>
        )}
      </div>
    </OneScreenPanel>
  );
};
