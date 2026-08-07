/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenRail — the 308px rail (spec §6): author/manuscript tile → querying goals → activity →
 * Pro mini-card.
 *
 * ⚠️ THE EXPAND IS FLEX DOING THE WORK: the arrows button collapses the two stowables
 * (max-height→0 with their margins, padding and borders — the rail spaces with margins so the
 * slot's spacing collapses WITH the panel), and activity, being flex:1, grows to fill what they
 * release. The flex recomputation IS the animation; the activity panel's own height is never
 * animated.
 *
 * ⚠️ DISMISS IS DELIBERATE (§6): the toggle, Escape (focus returns to the button), click-outside,
 * or the viewport dropping below the two-column breakpoint. No timer, no mouse-leave.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Agent, Manuscript, Query, QueryStatus, User, UserTask } from "../../types";
import { StatusDot } from "../StatusDot";
import { GOAL_BLOCKS, goalBlocksFilled, GoalPeriod, goalState } from "../../lib/oneScreen";
import { Skel } from "./OneScreenDashboard";

/* ── the 30-day feed, pure (exported for tests) ── */

export interface FeedRow {
  id: string;
  /** "Wed 29 Jul" — a row starts a new day group when this differs from the previous row's. */
  dayLabel: string;
  /** The pill's words — "Query sent", "Full requested", "An offer", "Status changed"… */
  pill: string;
  /** Sage when the motion is the agent's (requests, offers); pink otherwise. */
  sage: boolean;
  time: string;
  who: string;
  caption: string;
  dotStatus: QueryStatus | null;
}

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const PILL_FOR: Partial<Record<QueryStatus, { label: string; sage: boolean }>> = {
  [QueryStatus.QUERIED]: { label: "Query sent", sage: false },
  [QueryStatus.PARTIAL_REQUESTED]: { label: "Partial requested", sage: true },
  [QueryStatus.PARTIAL_SENT]: { label: "Partial sent", sage: false },
  [QueryStatus.FULL_REQUESTED]: { label: "Full requested", sage: true },
  [QueryStatus.FULL_SENT]: { label: "Full sent", sage: false },
  [QueryStatus.REVISE_RESUBMIT]: { label: "Revise & resubmit", sage: true },
  [QueryStatus.OFFER]: { label: "An offer", sage: true },
  [QueryStatus.REJECTED]: { label: "Closed", sage: false },
  [QueryStatus.WITHDRAWN]: { label: "Withdrawn", sage: false },
  [QueryStatus.NO_RESPONSE]: { label: "Closed", sage: false },
};

/** §6: the last 30 days of the activity log, newest first, shaped for the cardlet timeline. */
export const feedRows = (
  activities: Activity[],
  queries: Query[],
  agents: Agent[],
  manuscripts: Manuscript[],
  now: Date,
): FeedRow[] => {
  const from = now.getTime() - 30 * 86400000;
  return activities
    .map((a) => ({ a, t: new Date(a.date).getTime() }))
    .filter((x) => Number.isFinite(x.t) && x.t >= from && x.t <= now.getTime())
    .sort((x, y) => y.t - x.t)
    .map(({ a, t }) => {
      const d = new Date(t);
      const q = queries.find((x) => x.id === a.queryId);
      const agent = q ? agents.find((x) => x.id === q.agentId) : undefined;
      const ms = manuscripts.find((x) => x.id === a.manuscriptId);
      const pill = a.resultingStatus ? PILL_FOR[a.resultingStatus] : undefined;
      return {
        id: a.id,
        dayLabel: `${WD[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`,
        pill: pill?.label ?? "Status changed",
        sage: pill?.sage ?? false,
        time: d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true }).replace(" ", "").toLowerCase(),
        who: agent?.name || agent?.agency || "—",
        caption: [agent?.agency, ms?.title].filter(Boolean).join(" · "),
        dotStatus: a.resultingStatus ?? null,
      };
    });
};

/* ── the rail ── */

export interface OneScreenRailProps {
  /* lifted to the page so the tour can collapse the rail before starting (§12) */
  expanded: boolean;
  setExpanded: (on: boolean) => void;
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
  expanded, setExpanded, loading, queries, agents, manuscripts, activities, currentUser,
  activeManuscript, onNavigate, updateUserProfile, now,
}) => {
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState({ target: 25, period: "quarter" as GoalPeriod });
  const actvRef = useRef<HTMLDivElement>(null);
  const expBtnRef = useRef<HTMLButtonElement>(null);

  const goal = goalState(queries, currentUser?.goalTarget, currentUser?.goalPeriod, now);
  const ms = activeManuscript ?? manuscripts[0] ?? null;
  const rows = useMemo(() => feedRows(activities, queries, agents, manuscripts, now), [activities, queries, agents, manuscripts, now]);

  const setExp = useCallback((on: boolean) => {
    setExpanded(on);
    if (!on) expBtnRef.current?.focus();
  }, []);

  /* §6: Escape, click-away, and the breakpoint all collapse; no timer, no mouse-leave. */
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExp(false); };
    const onDown = (e: MouseEvent) => {
      if (actvRef.current?.contains(e.target as Node)) return;
      setExpanded(false); // click-away does not steal focus back
    };
    const onResize = () => { if (window.innerWidth <= 1024) setExpanded(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onDown);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onDown);
      window.removeEventListener("resize", onResize);
    };
  }, [expanded, setExp]);

  const saveGoal = async () => {
    const target = Math.max(1, Math.min(999, Math.round(goalDraft.target)));
    await updateUserProfile({ goalTarget: target, goalPeriod: goalDraft.period });
    setEditingGoal(false);
  };

  const filled = goal ? goalBlocksFilled(goal.done, goal.target) : 0;

  return (
    <div className={`os-colR${expanded ? " os-rail-expanded" : ""}`}>
      {/* ══ querying goals ══ */}
      <div className={`os-card os-lift os-goal stowable${loading ? " isload" : ""}`}>
        {loading && <Skel bars={["h", "", ""]} />}
        <div className="os-goal-r1">
          <h2>Querying goals</h2>
          {goal && !editingGoal && (
            <button type="button" className="os-goal-num" title="Adjust the goal" onClick={() => { setGoalDraft({ target: goal.target, period: goal.period }); setEditingGoal(true); }}>
              {goal.done}/{goal.target}
            </button>
          )}
        </div>
        {editingGoal || !goal ? (
          editingGoal ? (
            <div className="os-goal-edit">
              <label>
                <span className="os-lbl">Target</span>
                <input type="number" min={1} max={999} value={goalDraft.target}
                  onChange={(e) => setGoalDraft((d) => ({ ...d, target: Number(e.target.value) }))} />
              </label>
              <label>
                <span className="os-lbl">Period</span>
                <select value={goalDraft.period} onChange={(e) => setGoalDraft((d) => ({ ...d, period: e.target.value as GoalPeriod }))}>
                  <option value="quarter">This quarter</option>
                  <option value="month">This month</option>
                  <option value="year">This year</option>
                </select>
              </label>
              <div className="os-goal-btns">
                <button type="button" className="os-btn-mini" onClick={saveGoal}>Save</button>
                <button type="button" className="os-btn-mini ghost" onClick={() => setEditingGoal(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              {/* §9: no goal yet — the ghost meter and the invitation, never fake progress */}
              <div className="os-goal-t">Set a target for the quarter</div>
              <div className="os-blocks ghost" aria-hidden="true">
                {Array.from({ length: GOAL_BLOCKS }, (_, i) => <i key={i} />)}
              </div>
              <button type="button" className="os-btn-mini ghost" onClick={() => { setGoalDraft({ target: 25, period: "quarter" }); setEditingGoal(true); }}>
                Set a goal
              </button>
            </>
          )
        ) : (
          <>
            <div className="os-goal-t">{goal.sentence}</div>
            <div className="os-blocks" role="img" aria-label={`${goal.done} of ${goal.target} — ${filled} of ${GOAL_BLOCKS} blocks filled`}>
              {Array.from({ length: GOAL_BLOCKS }, (_, i) => <i key={i} className={i < filled ? "f" : undefined} style={i < filled ? { animationDelay: `${i * 0.02}s` } : undefined} />)}
            </div>
          </>
        )}
      </div>

      {/* ══ activity ══ */}
      <div className={`os-card os-lift os-actv${loading ? " isload" : ""}`} ref={actvRef}>
        {loading && <Skel bars={["h", "", "", "grow"]} />}
        <div className="os-ahead">
          <span className="os-aln" /><h2>Activity</h2><span className="os-aln" />
          <button
            ref={expBtnRef}
            type="button"
            className="os-exp"
            aria-expanded={expanded}
            aria-controls="os-actv-body"
            title={expanded ? "Collapse the feed" : "Expand the feed"}
            onClick={(e) => { e.stopPropagation(); setExp(!expanded); }}
          >
            {expanded
              ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" /></svg>
              : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>}
          </button>
        </div>
        <div className="os-abody" id="os-actv-body">
          {rows.length === 0 ? (
            <div className="os-aempty">
              <span className="os-aempty-thread" aria-hidden="true" />
              <span>The story starts with your first query.</span>
            </div>
          ) : (
            rows.map((r, i) => (
              <React.Fragment key={r.id}>
                {(i === 0 || r.dayLabel !== rows[i - 1].dayLabel) && <div className="os-tlday os-lbl">{r.dayLabel}</div>}
                <div className="os-tlev">
                  <div className="os-tlthread">
                    {r.dotStatus
                      ? <StatusDot status={r.dotStatus} overrideSize={12} decorative />
                      : <span className="os-tldot" aria-hidden="true" />}
                    <span className="os-tlln" aria-hidden="true" />
                  </div>
                  <div className="os-cardlet">
                    <div className="os-r1"><span className={`os-st${r.sage ? " sg" : ""}`}>{r.pill}</span><span className="os-tm">{r.time}</span></div>
                    <div className="os-who">{r.who}</div>
                    {r.caption && <div className="os-cap">{r.caption}</div>}
                  </div>
                </div>
              </React.Fragment>
            ))
          )}
        </div>
        <div className="os-esc">Click the arrows, press Escape, or click away to close</div>
        {/* §6: the footer is a quiet caption ONLY — no link; the arrows are the sole route in */}
        <div className="os-afoot"><span className="os-ac">Last 30 days</span></div>
      </div>

      {/* ⚠️ THE PRO MINI LEFT THE RAIL (v16 §5) — it is the full-width banner beneath tasks now
          (OneScreenPro). Do not reinstate one here: two upsells on one screen sell the same thing
          twice, and the rail's job is goals and the record. */}
    </div>
  );
};
