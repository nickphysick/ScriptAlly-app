/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FEED v1 — THE MANUSCRIPT CARD AND THE GOAL SHEET (Part B; ref design-refs/dashboard-feed-v1/, top left).
 *
 * The card does the retired navy header's job: the book being queried, its campaign word, and the three ways in.
 * The goal sheet hangs under it, tucked beneath its bottom edge: this period's queries against the goal, two weekly
 * tiles, and the streak.
 *
 * ⚠️ EVERY FIGURE IS AN EXISTING DERIVATION, NEVER A NEW ONE: the ring is `deriveGoalProgress` (the goals card's),
 * the streak and the weekly query counts are `weekStreak` over `buildRows` (the Streaks & goals page's), and the
 * weekly agent counts are the Contact list's desk (`deskModel(...).week`). Nothing here counts anything itself.
 * ⚠️ NO PART OF THE SHEET IS EVER EMPTY: with no goal the ring is a "Set a weekly goal" link, and the tiles and the
 * streak still show.
 */
import React, { useMemo, useState } from "react";
import type { Activity, Agent, GoalCadence, Query, User } from "../../../types";
import { appendGoalEntry, deriveGoalProgress } from "../../../lib/queryingGoals";
import { weekStreak } from "../../../lib/milestones";
import { buildRows } from "../../../lib/analytics";
import { deskModel, weekOnWeek } from "../../../lib/contactDesk";
import { GoalTargetSheet } from "../GoalTargetSheet";

/** The three buttons' words — each is also the button's accessible name. */
export const BOOK_BUTTONS = { log: "Log a query", record: "Record a response", agent: "Add an agent" } as const;
export const SET_GOAL = "Set a weekly goal";
/** the streak bar's length, oldest week first, this week last */
export const STREAK_WEEKS = 8;

/** "1 more than last week" / "same as last week" — the Contact list's own words, in lower case after the figure */
export const vsLastWeek = (thisWeek: number, lastWeek: number): string => {
  const t = weekOnWeek(thisWeek, lastWeek).text;
  return t.charAt(0).toLowerCase() + t.slice(1);
};

const Pen = () => (<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1-4L16 5l3 3L8 19z" /></svg>);
const Reply = () => (<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 016 6v4" /></svg>);
const PersonPlus = () => (<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M3 20c1-3.4 3.4-5 6-5s5 1.6 6 5M18 8v6M15 11h6" /></svg>);

export interface F1BookProps {
  loading: boolean;
  title: string;
  author: string;
  coverUrl?: string;
  /** the campaign word in sentence case (`campaignLabel`): "Querying", "Between rounds" */
  label: string;
  onLog: () => void;
  onRecord: () => void;
  onAddAgent: () => void;
  /** every query and agent the writer has: the goal is theirs, not one manuscript's */
  queries: readonly Query[];
  agents: readonly Agent[];
  activities: readonly Activity[];
  currentUser: User | null;
  now: Date;
  /** writes the goal (the goals card's own write); absent → "Set a weekly goal" is shown and does nothing */
  onGoal?: (patch: Partial<User>) => void | Promise<void>;
}

export const F1Book: React.FC<F1BookProps> = ({ loading, title, author, coverUrl, label, onLog, onRecord, onAddAgent, queries, agents, activities, currentUser, now, onGoal }) => {
  const [sheet, setSheet] = useState(false);
  const entries = currentUser?.queryingGoals;
  const m = useMemo(() => {
    const nowMs = now.getTime();
    const goal = deriveGoalProgress(queries, entries ?? [], now);
    const streak = weekStreak(buildRows([...queries], [...activities], [...agents], nowMs).map((r) => r.sentMs), entries, nowMs);
    const weeks = streak.weeks;
    const sentThis = weeks.length ? weeks[weeks.length - 1].count : 0;
    const sentLast = weeks.length > 1 ? weeks[weeks.length - 2].count : 0;
    const added = deskModel({ agents, queries, msId: null, now, hk: { complete: 0, total: 0, gaps: 0, gapAgents: 0 } }).week.bars;
    const addedThis = added[added.length - 1] ?? 0;
    const addedLast = added[added.length - 2] ?? 0;
    /* the last eight weeks, oldest first; weeks before the first send are drawn as not met */
    const last = weeks.slice(-STREAK_WEEKS).map((w) => w.met);
    const bar = [...Array(Math.max(0, STREAK_WEEKS - last.length)).fill(false), ...last] as boolean[];
    return { goal, streak: streak.current, bar, sentThis, sentLast, addedThis, addedLast };
  }, [queries, agents, activities, entries, now]);

  const g = m.goal;
  const R = 25, C = 2 * Math.PI * R;
  const frac = g.target ? Math.min(1, g.count / g.target) : 0;
  return (
    <div className="df1-bookset" data-df1="bookset">
      <section className="df1-book" data-df1="book" aria-label="Your manuscript">
        <div className="df1-bktop">
          {coverUrl
            ? <img className="df1-cov df1-covimg" src={coverUrl} alt="" aria-hidden="true" data-df1="cover" />
            : <div className="df1-cov" aria-hidden="true" data-df1="cover"><span>{title}</span></div>}
          <div className="df1-bktxt">
            <div className="df1-status" data-df1="status">{loading ? " " : label}</div>
            <h1 className={`df1-title${loading ? " d58-sk" : ""}`} data-df1="title" data-page-title="">{loading ? " " : title || "Your manuscript"}</h1>
            {(loading || author) && <div className="df1-by" data-df1="byline">{loading ? " " : `by ${author}`}</div>}
          </div>
        </div>
        <div className="df1-bkacts">
          <button type="button" className="df1-ba df1-ba--pri" data-df1="btn-log" aria-label={BOOK_BUTTONS.log} onClick={onLog}><Pen /><span>{BOOK_BUTTONS.log}</span></button>
          <button type="button" className="df1-ba" data-df1="btn-record" aria-label={BOOK_BUTTONS.record} onClick={onRecord}><Reply /><span>{BOOK_BUTTONS.record}</span></button>
          <button type="button" className="df1-ba" data-df1="btn-agent" aria-label={BOOK_BUTTONS.agent} onClick={onAddAgent}><PersonPlus /><span>{BOOK_BUTTONS.agent}</span></button>
        </div>
      </section>
      <section className="df1-goal" data-df1="goal" aria-label="This week" data-loading={loading ? "1" : "0"}>
        {g.target ? (
          <div className="df1-ring" data-df1="ring" data-count={g.count} data-target={g.target} role="img" aria-label={`${g.count} of ${g.target} queries`}>
            <svg viewBox="0 0 60 60" aria-hidden="true">
              <circle cx="30" cy="30" r={R} fill="none" stroke="#ece7de" strokeWidth="6" />
              {frac > 0 && <circle cx="30" cy="30" r={R} fill="none" stroke="#2d3a50" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(frac * C).toFixed(2)} ${C.toFixed(2)}`} />}
            </svg>
            <div data-df1="ring-text"><b>{loading ? " " : g.count}</b><small>of {g.target}</small></div>
          </div>
        ) : (
          <button type="button" className="df1-setgoal" data-df1="set-goal" onClick={() => setSheet(true)} disabled={!onGoal}>{SET_GOAL}</button>
        )}
        <div className="df1-tiles">
          <div data-df1="tile-sent"><b>{loading ? " " : m.sentThis}</b><span>{m.sentThis === 1 ? "query sent" : "queries sent"}</span><em>{loading ? " " : vsLastWeek(m.sentThis, m.sentLast)}</em></div>
          <div data-df1="tile-added"><b>{loading ? " " : m.addedThis}</b><span>{m.addedThis === 1 ? "agent added" : "agents added"}</span><em>{loading ? " " : vsLastWeek(m.addedThis, m.addedLast)}</em></div>
        </div>
        <div className="df1-streak" data-df1="streak" data-current={m.streak}>
          <b>{loading ? " " : m.streak}</b> {m.streak === 1 ? "week in a row" : "weeks in a row"}
          <span className="df1-weeks" role="img" aria-label={`Last ${STREAK_WEEKS} weeks: ${m.bar.filter(Boolean).length} met the goal`}>
            {m.bar.map((met, i) => <i key={i} className={met ? undefined : "is-off"} data-df1="week" data-met={met ? "1" : "0"} />)}
          </span>
        </div>
      </section>
      {sheet && onGoal && (
        <GoalTargetSheet
          initialTarget={5}
          initialCadence={"week" as GoalCadence}
          now={now}
          onCommit={async (next) => { await onGoal({ queryingGoals: appendGoalEntry(entries, next, now) }); }}
          onClose={() => setSheet(false)}
        />
      )}
    </div>
  );
};
