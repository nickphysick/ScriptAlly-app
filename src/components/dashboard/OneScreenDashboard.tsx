/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenDashboard — the one-screen dashboard (refs design-refs/dashboard-one-screen.html +
 * dashboard-one-screen-spec.md; §-references below are the spec's).
 *
 * ⚠️ THE ONE-SCREEN LOCK IS DROPPED (stages 2–3, 17 Sep — Nick). The page is a flowing page now: the
 * header, the breakdown and the three-card row span the content width, and the to-do card and the
 * activity column sit side by side beneath them at a FIXED height, each keeping its own scroll. The
 * route is a `flow` slot again and `dashboard` is off the shell's `fit` list; the stage scrolls.
 *
 * ⚠️ THE CONTENT IS A CENTRED BLOCK WITH A MAXIMUM WIDTH (`--dash-page-max`, declared on the dashboard
 * route's `.ws-main` so the shell's top bar can pad itself to the same measure). The activity column is INSIDE the
 * block, never pinned to the window's edge — pinned, a gap opened between it and the content on a
 * wide monitor.
 *
 * ⚠️ NEVER 100vh AND NEVER A BAR OFFSET (the house stage law) still holds: nothing here measures the
 * viewport; the fixed row height is a length, not a fraction of the window.
 */
import React, { useEffect, useRef, useState } from "react";
import { Activity, Agent, Manuscript, ManuscriptVersion, Query, Task, TaskFlag, User, UserPlan, UserTask } from "../../types";
import { runStage, tourAutoRuns, tourChipShows } from "../../lib/oneScreen";
import { OneScreenTour, TOUR_BREAKPOINT } from "./OneScreenTour";
import { OneScreenChart } from "./OneScreenChart";
import { OneScreenBreakdown } from "./OneScreenBreakdown";
import { OneScreenActions } from "./OneScreenActions";
import { OneScreenClosed } from "./OneScreenClosed";
import { liveCount, queryBreakdown, queryingDay } from "../../lib/dashBreakdown";
import { closedTile } from "../../lib/dashClosed";
import { OneScreenTasks } from "./OneScreenTasks";
import { OneScreenHeader } from "./OneScreenHeader";
import { dashHeaderLine, type DashHeaderLine } from "../../lib/dashHeader";
import { localYMD } from "../../lib/shellSidebar";
import { scopeActivities, scopeQueries, scopeTasks } from "../../lib/manuscriptScope";
import { deriveGoalProgress } from "../../lib/queryingGoals";
import { OneScreenRail } from "./OneScreenRail";
import { OneScreenSkeleton } from "./OneScreenSkeleton";
import { useSkeleton } from "../../lib/skeletonTiming";
import "./oneScreen.css";

export interface OneScreenDashboardProps {
  /** Firestore subscriptions still pending → per-card skeletons (§8). */
  loading: boolean;
  queries: Query[];
  agents: Agent[];
  manuscripts: Manuscript[];
  /**
   * ⚠️ READ BY EXACTLY ONE THING — the getting-started `materials` deed's tick (Phase 1). It is
   * optional and defaults to empty, so nothing that does not pass it changes, and the deed reads
   * `PACKAGE_MATERIALS` rather than a list of its own. See `lib/dashEmpty`.
   */
  versions?: ManuscriptVersion[];
  tasks: Task[];
  userTasks: UserTask[];
  activities: Activity[];
  /* ⚠️ THE BOARD'S STANCES (Phase 5) — the to-do panel calls `assembleBoardColumns`, which reads
     them. A stance is the writer's decision about a task (snoozed, muted), never a per-book fact,
     so it is handed down unscoped like `agents`. */
  taskFlags: TaskFlag[];
  currentUser: User | null;
  /** The manuscript the shell scope names — the kicker repeats it (§2). */
  activeManuscript: Manuscript | null;
  onNavigate: (tab: string, sub?: string) => void;
  onTaskAction: (task: Task) => void;
  updateUserProfile: (fields: Partial<User>) => Promise<void>;
  /** Injectable for tests; defaults to the real clock. */
  now?: Date;
}

/** §8: the per-card shimmer, shaped roughly like the card it stands in for. */
export const Skel: React.FC<{ bars: ("h" | "grow" | "")[] }> = ({ bars }) => (
  <div className="os-skel" aria-hidden="true">
    {bars.map((b, i) => <i key={i} className={b || undefined} style={b === "" ? { width: `${52 + ((i * 17) % 30)}%` } : b === "h" ? { width: `${30 + ((i * 13) % 20)}%` } : undefined} />)}
  </div>
);

export const OneScreenDashboard: React.FC<OneScreenDashboardProps> = ({
  loading, queries, agents, manuscripts, tasks, userTasks, activities, taskFlags, currentUser,
  activeManuscript, onNavigate, onTaskAction, updateUserProfile, versions = [], now = new Date(),
}) => {
  /**
   * ⚠️ THE SCOPED SETS ARE DERIVED ONCE, HERE, AND HANDED DOWN (B2). Every card reading the same
   * three arrays is what makes "switching manuscripts changes exactly the scoped figures" a
   * property of the page rather than something maintained card by card.
   *
   * ⚠️ `agents` IS DELIBERATELY ABSENT from this list. An agent is a person you know, not a
   * per-book fact — "agents on file" must not move when the scope does.
   */
  const scopeId = activeManuscript?.id ?? null;
  const msIds = React.useMemo(() => new Set(manuscripts.map((m) => m.id)), [manuscripts]);
  const scopedQueries = React.useMemo(() => scopeQueries(queries, scopeId), [queries, scopeId]);
  const scopedActivities = React.useMemo(() => scopeActivities(activities, scopeId), [activities, scopeId]);
  const scopedTasks = React.useMemo(() => scopeTasks(tasks, queries, msIds, scopeId), [tasks, queries, msIds, scopeId]);
  /**
   * ⚠️ DERIVED HERE, FROM THE UNSCOPED SET, AND HANDED DOWN AS A RESULT.
   *
   * A querying target is the WRITER's, not a book's — "ten queries this month" means ten, however
   * many manuscripts they went out for. Every other list the rail receives is scoped to the
   * manuscript chip, so this is the one derivation that must skip `scopeQueries`, and the rail is
   * deliberately given the finished object rather than the raw list: a second unscoped array
   * beside four scoped ones is an invitation to scope it by mistake, and the resulting bug — a
   * goal count that drops when you switch books — is not one anybody would think to look for.
   */
  /**
   * ⚠️ THE PAGE'S EMPTY MOMENT, DERIVED ONCE AND HANDED DOWN (empty-states pack, Phase 1) — the
   * same discipline as the scoped sets above, and for the same reason: four cards each deciding
   * "am I empty" from a different array is four answers to one question. It is the SCOPED set,
   * because every figure the empty state sits beside is scoped.
   *
   * ⚠️ AND IT IS NOT `scopedStage === "day-one"`. Day one needs no manuscript EITHER, so the
   * commonest first-run state there is — a book on the shelf, nothing sent — never reached it. The
   * ref is drawn for exactly that account: its manuscript card is populated and its first
   * getting-started deed renders done.
   *
   * ⚠️ `loading` IS NOT PART OF IT. The three-way loading / empty / populated split already exists
   * and is `loading`'s job; folding it in here would make one flag answer two questions, and the
   * skeleton would stop showing the moment the empty pack could.
   */
  const empty = scopedQueries.length === 0;

  const goalProgress = React.useMemo(
    () => deriveGoalProgress(queries, currentUser?.queryingGoals, now),
    [queries, currentUser?.queryingGoals, now],
  );

  const firstName = (currentUser?.name ?? "").trim().split(/\s+/)[0] || "there";

  /**
   * ⚠️ THE HEADER'S FIGURES ARE THE CARDS' OWN (stage 1). Queries out is the chart's "Active queries"
   * headline, from the same scoped set; tasks waiting is the to-do card's total, from the SAME inputs
   * `OneScreenTasks` hands `assembleBoardColumns` — scoped tasks and activities, raw lookup sets; and
   * in the empty moment the Getting Started count is the card's badge, from the same inputs it hands
   * `gettingStartedRows`. `dashHeader.test.tsx` renders the page and holds each against its card.
   *
   * ⚠️ NULL WHILE LOADING, NEVER ZERO. The line renders its words without figures until the
   * collections land.
   */
  const headerLine = React.useMemo<DashHeaderLine | null>(() => dashHeaderLine({
    loading, empty, scopedQueries, now,
    board: {
      tasks: scopedTasks, userTasks, queries, agents, manuscripts, taskFlags, activities: scopedActivities,
      now: now.getTime(), today: localYMD(now.getTime()), mutedTaskRules: currentUser?.mutedTaskRules,
    },
    starting: { manuscripts, agentCount: agents.length, queryCount: queries.length, versions, activeManuscript },
  }), [loading, empty, scopedQueries, scopedTasks, userTasks, queries, agents, manuscripts, taskFlags,
    scopedActivities, now, currentUser?.mutedTaskRules, versions, activeManuscript]);

  /**
   * ⚠️ STAGES 2–3's FIGURES, DERIVED ONCE HERE FROM THE SAME SCOPED SETS (17 Sep). The breakdown's
   * total, the chart's headline and the header's "queries out" are one partition (`dashBreakdown`), so
   * they reconcile by construction; the closed tile's buckets are `dashClosed`'s. All are null while
   * loading — Nick's rule, never a number that might change.
   */
  const breakdown = React.useMemo(
    () => (loading ? null : queryBreakdown({ queries: scopedQueries, activities: scopedActivities, agents, now })),
    [loading, scopedQueries, scopedActivities, agents, now],
  );
  const closed = React.useMemo(
    () => (loading ? null : closedTile(scopedQueries, scopedActivities)),
    [loading, scopedQueries, scopedActivities],
  );
  const activeCount = loading ? null : liveCount(scopedQueries);
  const queryingDayN = queryingDay(scopedQueries, now);
  const manuscriptTitle = activeManuscript?.title?.trim() || null;
  const isPro = currentUser?.plan === UserPlan.PRO;

  /* ⚠️ THE FEED'S ACTION AND THE PANEL'S DRAWER, JOINED HERE BECAUSE THEY ARE IN DIFFERENT COLUMNS
     (Phase 6). The rail's "Mark sent" hands up a query id; the to-do panel resolves it against the
     live board and opens its own drawer on the card. One drawer on the page, one session, one write
     path — a second one in the rail would be a second answer to what finishing a send involves. */
  const [feedOpenQueryId, setFeedOpenQueryId] = useState<string | null>(null);

  /* ── §12 · the tour ── */
  const [touring, setTouring] = useState(false);
  /* the rail's expanded state is lifted here so the tour can collapse it before starting */
  const tourChipRef = useRef<HTMLButtonElement>(null);
  const autoRan = useRef(false);
  const wideEnough = () => typeof window !== "undefined" && window.innerWidth > TOUR_BREAKPOINT;
  /* the 7-day chip derives from the AUTH account's creation time — never a stored flag.
     ⚠️ LAZY-LOADED IN AN EFFECT: importing lib/firebase at module level initialises the SDK,
     which the node test environment cannot do (and renderToStaticMarkup never runs effects, so
     the tests never touch it). */
  const [createdAt, setCreatedAt] = useState<string | undefined>(undefined);
  useEffect(() => {
    let live = true;
    import("../../lib/firebase")
      .then(({ auth }) => { if (live) setCreatedAt(auth.currentUser?.metadata?.creationTime ?? undefined); })
      .catch(() => { /* no auth (dev labs) → no chip, never a guess */ });
    return () => { live = false; };
  }, []);
  const chipShows = tourChipShows(createdAt, now, wideEnough());

  useEffect(() => {
    if (loading || autoRan.current) return;
    if (!tourAutoRuns(currentUser?.tourCompletedAt, wideEnough())) return;
    autoRan.current = true;
    const id = window.setTimeout(() => setTouring(true), 700);
    return () => window.clearTimeout(id);
  }, [loading, currentUser?.tourCompletedAt]);

  const endTour = (skipped: boolean) => {
    setTouring(false);
    tourChipRef.current?.focus(); // focus returns to the launcher (§12)
    /* ⚠️ SKIPPING COUNTS AS COMPLETING for auto-run purposes — both roads stamp completion.
       Rules-gated: silently denied until the firestore.rules revision deploys; the tour still
       closes, it just may auto-run again next load until the rules land. */
    void updateUserProfile(skipped
      ? { tourCompletedAt: new Date().toISOString(), tourDismissed: true }
      : { tourCompletedAt: new Date().toISOString() });
  };

  /* One-time entrance stagger — the class is REMOVED after it runs (§6 trap: the animation is
     `fill-mode: both`, so while the class is on, its final keyframe OUTRANKS any inline transform;
     leaving it on arms that trap across every card on the page).

     ⚠️ THE GUARD IS A REF, NOT STATE, AND THAT IS THE WHOLE POINT. With `entered` in state and in
     the deps, setting it re-ran the effect; the cleanup fired FIRST and cleared the pending
     timeout, and the re-run then returned early at the guard without ever re-arming it. The class
     was added and never removed — a self-cancelling effect that read as correct and was verified
     `stillAnimating: true` long after settling. A ref survives the re-render without re-running
     anything. */
  /**
   * ⚠️ THE COVER IS ON FROM THE FIRST PAINT AND OUTLIVES `loading` — never rendered off the flag
   * directly. The hook initialises its phase from `loading`, holds ~500ms once seen, then
   * dissolves; the rule and the full history of why (including the deleted 200ms fast-path delay,
   * which is what made three earlier fixes invisible) live in lib/skeletonTiming.
   *
   * ⚠️ IT IS DECLARED HERE, ABOVE THE ENTRANCE EFFECT THAT READS IT, and that is not cosmetic:
   * a `const` referenced above its declaration sits in the temporal dead zone and throws on the
   * render that reaches it. This file's own house rule says initialisation goes after what it
   * depends on, never before.
   */
  const skeleton = useSkeleton(loading);

  const rootRef = useRef<HTMLDivElement>(null);
  const entered = useRef(false);
  useEffect(() => {
    if (loading || entered.current) return;
    entered.current = true;
    /**
     * ⚠️ THE PAGE MUST NOT ARRIVE TWICE. If the cover was shown, it has already done this
     * animation's job — it occupied these exact boxes while the data was out — so the stagger is
     * SKIPPED and the content is simply there, settled, as the cover dissolves off it. Running
     * both meant the page arrived twice: cards rising under the cover, revealed mid-flight.
     *
     * ⚠️ THE STAGGER IS NOT DELETED. With the cover on from the first paint it is nearly always
     * skipped, but a mount that BEGINS with `loading` false (data already in hand before this
     * page first mounts, dev labs, tests) never shows a cover, and this is then the page's only
     * way of announcing it has arrived.
     */
    if (skeleton.wasShown) return;
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const items = root.querySelectorAll(".os-card, .os-greet, .os-bd");
    items.forEach((el) => el.classList.add("enter"));
    const id = window.setTimeout(() => items.forEach((el) => el.classList.remove("enter")), 900);
    return () => window.clearTimeout(id);
  }, [loading]);

  /* ⚠️ THE ACCOUNT-WIDE `stage` IS GONE WITH THE PILLS (Phase 3). It had exactly two readers —
     `stage === "day-one"` for the single Day-one pill and `stage === "settled"` for the
     achievement — and `tsc` does not flag an assigned-but-unread `const`, so it would have
     sat here computing a value nobody looks at. The SCOPED stage below is untouched: it is a
     different question (this book's state, not the account's) and the chart and tasks both
     still ask it. */
  /**
   * ⚠️ TWO STAGES, BECAUSE THE PAGE AND THE BOOK ARE AT DIFFERENT POINTS (B3).
   *
   * The GREETING's stage is the ACCOUNT's — an established writer adding a fourth manuscript has
   * not gone back to day one, and telling them so would be absurd. But the CHART and the TASKS
   * card are scoped, and a fresh book with no sends must show its own first-run state rather than
   * a populated layout full of zeros: a zero-filled chart claims a reading that was never taken.
   *
   * `runStage` already models exactly this — "a manuscript but no sends: still before the line" —
   * so the scoped stage is the same function over the scoped set, not a fourth state invented
   * here. With no manuscripts at all both stages agree on day-one, which is why that case needs
   * nothing extra.
   */
  const scopedStage = runStage(scopedQueries, manuscripts, now);

  return (
    <div
      ref={rootRef}
      /**
       * ⚠️ `os-loading` STANDS THE PAGE DOWN WHILE THE GHOST HOLDS THE FLOW (v33.2, Phase 4). It is
       * keyed off the cover's own phase rather than off `loading`, so the page comes back at the
       * moment the ghost starts dissolving — `out` is the 250ms where both are on screen and the
       * ghost is absolute over a page that is once again laid out.
       */
      className={`os-root${skeleton.phase === "on" ? " os-loading" : ""}`}
    >
      <div className="os-content" data-probe="main">
        {/* ⚠️ FOUR ROWS IN ONE CENTRED BLOCK (stages 2–3, 17 Sep): the header, the breakdown and the
            three-card row span the block's width, and the to-do card and the activity column sit
            side by side beneath them. The header used to be the left column's first row with the
            activity column beside it; it spans the block now, and its own layout is unchanged. */}
        <OneScreenHeader
          firstName={firstName}
          line={headerLine}
          tour={chipShows ? { onStart: () => { if (wideEnough()) setTouring(true); }, buttonRef: tourChipRef } : null}
        />
        <OneScreenBreakdown breakdown={breakdown} manuscriptTitle={manuscriptTitle} />
        {/* ⚠️ THE MANUSCRIPT TILE IS RETIRED WITH THE TOP ROW IT SAT IN — its title is the quick actions'
            foot now ("Querying …"), and the sidebar's manuscript switcher carries the rest. */}
        <div className="os-row2" data-probe="row2">
          <OneScreenActions
            loading={loading}
            manuscriptTitle={manuscriptTitle}
            manuscriptId={activeManuscript?.id}
            day={queryingDayN}
            isPro={isPro}
            onNavigate={onNavigate}
          />
          <OneScreenChart
            loading={loading}
            queries={scopedQueries}
            activities={scopedActivities}
            activeCount={activeCount}
            now={now}
            empty={empty}
            onSendFirst={() => onNavigate("queries", "Send a query")}
          />
          <OneScreenClosed loading={loading} tile={closed} onSeeAll={() => onNavigate("queries")} />
        </div>
        <div className="os-grid" data-probe="grid">
          {/* ⚠️ SCOPED WHERE SCOPE MEANS SOMETHING, RAW WHERE IT DOES NOT (Phase 5). Tasks and
              activities are the manuscript's; queries, agents and manuscripts are the LOOKUP sets
              the board resolves cards against, and scoping those would hide the agent a scoped
              task is about. `taskFlags` is a stance the writer took on a task, not a per-book fact.
              This is the same split `assembleBoardColumns` is given everywhere else it is called. */}
          <div className="os-colL">
            <OneScreenTasks
              loading={loading}
              tasks={scopedTasks}
              queries={queries}
              agents={agents}
              manuscripts={manuscripts}
              userTasks={userTasks}
              activities={scopedActivities}
              taskFlags={taskFlags}
              currentUser={currentUser}
              now={now}
              dayOne={scopedStage === "day-one"}
              empty={empty}
              versions={versions}
              activeManuscript={activeManuscript}
              onSeeAll={() => onNavigate("todo")}
              onAddManuscript={() => onNavigate("manuscripts", "Add a manuscript")}
              onAddAgent={() => onNavigate("agents", "Add an agent")}
              onNavigate={onNavigate}
              openForQueryId={feedOpenQueryId}
              onOpenHandled={() => setFeedOpenQueryId(null)}
            />
          </div>

          <OneScreenRail
            loading={loading}
            empty={empty}
            queries={scopedQueries}
            agents={agents}
            manuscripts={manuscripts}
            userTasks={userTasks}
            activities={scopedActivities}
            activeManuscript={activeManuscript}
            onNavigate={onNavigate}
            onOpenTask={(queryId) => setFeedOpenQueryId(queryId)}
            now={now}
          />
        </div>
      </div>
      {/* ⚠️ LAST CHILD, OVER THE MOUNTED PAGE. The cards stay in the tree beneath it, which is what
          makes "no layout shift" structural rather than a matter of matching numbers — and it is
          why the dissolve works: the page is already finished under there, so this fades off a
          settled picture rather than crossfading between two moving ones. */}
      {/* ⚠️ THE COVER'S HEADER IS THIS PAGE'S HEADER — the same component with its probes off, so
          the row it holds is the row the page will have. The tour chip rides along only so the
          two rows are the same shape; the cover is `inert`, so it cannot be reached.

          ⚠️ AND IT NEVER STATES A FIGURE. `loading` drops before the board has finished deriving:
          measured on a warm load, the cover read "2 tasks waiting on you" for ~44ms before the
          true 23. The page underneath is stood down for exactly that window, so its own header
          never shows it; a cover that did would put a plausible wrong number on screen. The
          figures arrive with the page, as the dissolve reveals it. */}
      {skeleton.phase !== "off" && (
        <OneScreenSkeleton
          leaving={skeleton.phase === "out"}
          header={<OneScreenHeader ghost firstName={firstName} line={null} tour={chipShows ? { onStart: () => {} } : null} />}
          breakdown={<OneScreenBreakdown ghost breakdown={null} manuscriptTitle={manuscriptTitle} />}
        />
      )}
      {touring && <OneScreenTour rootRef={rootRef} onEnd={endTour} />}
    </div>
  );
};
