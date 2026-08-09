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
import { Activity, ActivityType, Agent, Manuscript, Query, QueryStatus, User, UserTask } from "../../types";
import { StatusDot } from "../StatusDot";
import { goalBlockGap, GoalPeriod, goalMeter, goalState } from "../../lib/oneScreen";
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
  /** What the event is ABOUT. The collapse law keys on it — query events never fold. */
  scope: "query" | "agent" | "manuscript";
  /** How many identical consecutive events this line stands for. 1 = an ordinary row. */
  count: number;
  /** The EARLIEST time in a folded run, so a run reads as a span rather than one instant. */
  fromTime: string;
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

/**
 * ⚠️ EVERY EVENT TYPE GETS ITS OWN LABEL. "Status changed" was being shown for an agent being
 * ADDED — the generic fallback covering for a map that only knew about query statuses. An
 * unmapped type is a BUG, not something to paper over: `feedLabel` returns null for one and the
 * row is dropped, and a test enumerates the whole enum so adding a type without a label fails
 * the suite rather than shipping a mislabelled row.
 */
const TYPE_PILL: Record<string, { label: string; sage: boolean }> = {
  [ActivityType.STATUS_CHANGED]: { label: "Status changed", sage: false },
  [ActivityType.QUERY_SENT]: { label: "Query sent", sage: false },
  [ActivityType.MATERIALS_SENT]: { label: "Materials sent", sage: false },
  [ActivityType.NUDGE_SENT]: { label: "Nudge sent", sage: false },
  [ActivityType.OFFER_ACCEPTED]: { label: "Offer accepted", sage: true },
  [ActivityType.OFFER_DECLINED]: { label: "Offer declined", sage: false },
  [ActivityType.AGENT_ADDED]: { label: "Agent added", sage: false },
  [ActivityType.AGENT_UPDATED]: { label: "Agent updated", sage: false },
  [ActivityType.AGENT_DELETED]: { label: "Agent removed", sage: false },
  [ActivityType.MANUSCRIPT_ADDED]: { label: "Manuscript added", sage: false },
  [ActivityType.MANUSCRIPT_UPDATED]: { label: "Manuscript updated", sage: false },
  [ActivityType.MANUSCRIPT_DELETED]: { label: "Manuscript removed", sage: false },
};

/** Which family an event belongs to decides HOW its subject is found. */
const AGENT_TYPES = new Set<string>([ActivityType.AGENT_ADDED, ActivityType.AGENT_UPDATED, ActivityType.AGENT_DELETED]);
const MS_TYPES = new Set<string>([ActivityType.MANUSCRIPT_ADDED, ActivityType.MANUSCRIPT_UPDATED, ActivityType.MANUSCRIPT_DELETED]);

/** The pill for an event: its resulting STATUS where it has one (more specific), else its type. */
export const feedLabel = (a: Pick<Activity, "activityType" | "resultingStatus">): { label: string; sage: boolean } | null =>
  (a.resultingStatus ? PILL_FOR[a.resultingStatus] : undefined) ?? TYPE_PILL[a.activityType] ?? null;

/**
 * ⚠️ THE SUBJECT IS FOUND PER TYPE, not down one universal path. The single
 * `queryId → query → agent` lookup was the root cause: agent and manuscript events are written
 * with `queryId: ""` DELIBERATELY (they are not query-scoped), so every one of them fell through
 * to an em dash and a "Status changed" label.
 *
 * ⚠️ NO ROW MAY RENDER AN EM DASH WHERE A NAME BELONGS. A row whose subject cannot be resolved is
 * DROPPED, not blanked — and `feedLabel` returning null drops it too.
 *
 * ⚠️ Agent events resolve through their DESCRIPTION, used whole and never parsed: `Activity`
 * carries no `agentId`, and the description is the sentence the writer's own action produced
 * ("Added Sophie Dunn at Curtis Vane"). Using it entire is honest; picking a name out of it with
 * a regex would be the string-parsing this codebase forbids elsewhere.
 */
export const feedRows = (
  activities: Activity[],
  queries: Query[],
  agents: Agent[],
  manuscripts: Manuscript[],
  now: Date,
): FeedRow[] => {
  const from = now.getTime() - 30 * 86400000;
  const rows: FeedRow[] = [];

  for (const { a, t } of activities
    .map((x) => ({ a: x, t: new Date(x.date).getTime() }))
    .filter((x) => Number.isFinite(x.t) && x.t >= from && x.t <= now.getTime())
    .sort((x, y) => y.t - x.t)) {
    const pill = feedLabel(a);
    if (!pill) continue; // an unmapped type is a bug — never a generic row

    let who = "";
    let caption = "";
    let scope: FeedRow["scope"] = "query";
    if (AGENT_TYPES.has(a.activityType)) {
      scope = "agent";
      who = a.description.trim();
    } else if (MS_TYPES.has(a.activityType)) {
      scope = "manuscript";
      who = manuscripts.find((m) => m.id === a.manuscriptId)?.title?.trim() || a.description.trim();
    } else {
      const q = queries.find((x) => x.id === a.queryId);
      const agent = q ? agents.find((x) => x.id === q.agentId) : undefined;
      who = (agent?.name || agent?.agency || "").trim();
      const msTitle = manuscripts.find((m) => m.id === a.manuscriptId)?.title;
      caption = [agent?.agency, msTitle].filter(Boolean).join(" · ");
    }
    /* ⚠️ NEVER AN EM DASH WHERE A NAME BELONGS — an unresolvable subject drops the row */
    if (!who) continue;

    const d = new Date(t);
    rows.push({
      id: a.id,
      dayLabel: `${WD[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`,
      pill: pill.label,
      sage: pill.sage,
      time: d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true }).replace(" ", "").toLowerCase(),
      who,
      caption,
      dotStatus: a.resultingStatus ?? null,
      scope,
      count: 1,
      fromTime: "",
    });
  }
  return collapseFeedRuns(rows);
};

/**
 * ⚠️ A RUN IS FOLDED, NOT FILTERED (audit P7). Editing one agent six times in an afternoon wrote
 * six identical lines and pushed a week of real querying off the card. The six are still all
 * there — they are one line that says so — because a feed that silently drops events is worse
 * than a noisy one.
 *
 * THREE RULES, and each exists because breaking it loses information:
 *
 * 1. **QUERY-SCOPED EVENTS NEVER FOLD.** Two "Query sent" rows naming the same agent on the same
 *    day are two different queries. Folding them would report one submission where two happened —
 *    the one kind of error this feed must never make. Only agent and manuscript housekeeping
 *    folds, because there the repetition genuinely is one record being worked on.
 *
 * 2. **ONLY CONSECUTIVE ROWS FOLD — a run never merges across an interruption.** If an agent edit
 *    is followed by a query sent and then another edit of the same agent, that is TWO runs of one,
 *    not one run of two: the events did not happen together, and the order is the story the feed
 *    is telling. (This is why the fold walks the sorted list rather than grouping by key — a
 *    `groupBy` would silently merge the two ends around the interruption.)
 *
 * 3. **THE DAY IS PART OF THE KEY.** Rows are already day-grouped in the render, so a run
 *    crossing midnight would render under one day heading while containing another day's events.
 *
 * The fold keeps the FIRST row of the run (newest, since the list is newest-first) so the line
 * carries the most recent state, and records the run's earliest time so it reads as a span.
 */
export const collapseFeedRuns = (rows: FeedRow[]): FeedRow[] => {
  const out: FeedRow[] = [];
  for (const r of rows) {
    const prev = out[out.length - 1];
    const foldable =
      prev
      && prev.scope !== "query" && r.scope !== "query"
      && prev.scope === r.scope
      && prev.dayLabel === r.dayLabel
      && prev.pill === r.pill
      && prev.who === r.who;
    if (foldable) {
      // `prev` is the newer row; `r` is older, so it supplies the run's start time.
      out[out.length - 1] = { ...prev, count: prev.count + 1, fromTime: r.time };
      continue;
    }
    out.push(r);
  }
  return out;
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

  /* ⚠️ ONE BLOCK PER QUERY — the meter and the {done}/{target} beside it are the same two
     numbers, so they cannot disagree. Above the cap it turns proportional and says so. */
  const meter = goalMeter(goal?.done ?? 0, goal?.target ?? 0);

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
              <div className="os-blocks ghost" aria-hidden="true" style={{ gap: goalBlockGap(24) }}>
                {Array.from({ length: 24 }, (_, i) => <i key={i} />)}
              </div>
              <button type="button" className="os-btn-mini ghost" onClick={() => { setGoalDraft({ target: 25, period: "quarter" }); setEditingGoal(true); }}>
                Set a goal
              </button>
            </>
          )
        ) : (
          <>
            <div className="os-goal-t">{goal.sentence}</div>
            <div
              className="os-blocks"
              role="img"
              style={{ gap: goalBlockGap(meter.blocks) }}
              aria-label={meter.proportional
                ? `${goal.done} of ${goal.target} — the meter shows the share completed`
                : `${goal.done} of ${goal.target} queries sent`}
            >
              {Array.from({ length: meter.blocks }, (_, i) => (
                <i key={i} className={i < meter.filled ? "f" : undefined} style={i < meter.filled ? { animationDelay: `${i * 0.02}s` } : undefined} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ══ activity ══ */}
      <div className={`os-card os-lift os-actv${loading ? " isload" : ""}`} ref={actvRef}>
        {loading && <Skel bars={["h", "", "", "grow"]} />}
        <div className="os-ahead">
          {/* ⚠️ THE FLANKING RULES ARE GONE. They existed to centre the title on a plain card
              head; on a filled band they draw two lines across a colour that is already doing
              the separating. The title sits left, as the ref has it. */}
          <h2>Activity</h2>
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
                      ? <StatusDot status={r.dotStatus} overrideSize={9} decorative />
                      : <span className="os-tldot" aria-hidden="true" />}
                    <span className="os-tlln" aria-hidden="true" />
                  </div>
                  <div className="os-cardlet">
                    {/* ⚠️ TWO CHILDREN, ALWAYS. `.os-r1` is space-between, so a bare third child
                        would be pushed to the middle of the row rather than sitting with the pill. */}
                    <div className="os-r1">
                      <span className="os-r1l">
                        <span className={`os-st${r.sage ? " sg" : ""}`}>{r.pill}</span>
                        {/* ⚠️ A FOLDED RUN STATES ITS SIZE AND ITS SPAN — without the count, the
                            fold is indistinguishable from events having gone missing. */}
                        {r.count > 1 && <span className="os-runx">×{r.count}</span>}
                      </span>
                      <span className="os-tm">{r.count > 1 && r.fromTime ? `${r.fromTime}–${r.time}` : r.time}</span>
                    </div>
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
