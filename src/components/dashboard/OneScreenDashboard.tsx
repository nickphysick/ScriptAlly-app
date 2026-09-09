/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenDashboard — the one-screen dashboard (refs design-refs/dashboard-one-screen.html +
 * dashboard-one-screen-spec.md; §-references below are the spec's).
 *
 * ⚠️ THE ONE-SCREEN PROMISE (§1): the page fits its slot exactly and never scrolls; only tasks
 * and activity scroll, internally.
 *
 * ⚠️ THE HEIGHT IS PURE CSS NOW — `height:100%` of a slot the shell gives a definite height. The
 * JS lock that used to measure #app-stage-scroll is DELETED, not disabled: it stamped the whole
 * scroller's height, which INCLUDES the 66px sticky bar's band, so the card scrolled by exactly
 * `--head`. The fix is two route declarations — `layout="fill"` on the slot (App.tsx) and `fit`
 * on the work wrapper (AppShell) — which together hand this page the space REMAINING under the
 * bar. Both are required: `.ws-work` is `flex: 1 0 auto` without `fit` and can never shrink below
 * its content, and its own rule records that `min-height: 0` alone does NOT fix that, measured.
 *
 * ⚠️ NEVER 100vh AND NEVER A BAR OFFSET (the house stage law) — `height:100%` inherits whatever
 * the shell decided, so a chrome change cannot silently strand this page.
 *
 * ⚠️ `min-height` IS FORBIDDEN on the lock elements (§1) — it grows past the fold with no
 * scrollbar. Locked in the smoke test against the stylesheet.
 */
import React, { useEffect, useRef, useState } from "react";
import { Activity, Agent, Manuscript, Query, Task, TaskFlag, User, UserTask } from "../../types";
import { runStage, tourAutoRuns, tourChipShows } from "../../lib/oneScreen";
import { OneScreenTour, TOUR_BREAKPOINT } from "./OneScreenTour";
import { OneScreenAuthor } from "./OneScreenAuthor";
import { OneScreenChart } from "./OneScreenChart";
import { OneScreenTasks } from "./OneScreenTasks";
import { OneScreenCounters } from "./OneScreenCounters";
import { OneScreenCommunity } from "./OneScreenCommunity";
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
  /* ⚠️ THE TOP BAR'S SEARCH IS THE APP'S GLOBAL QUERY, NOT A NEW CONTROL. `Dashboard` already
     filters its query list on this value, so the field is live the moment it is typed in — which
     is the difference between the ref's search and a decorative one. Optional so every existing
     mount, including the tests', renders byte-identically without it. */
  searchQuery?: string;
  onSearchChange?: (v: string) => void;
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
  activeManuscript, onNavigate, onTaskAction, updateUserProfile, now = new Date(),
  searchQuery = "", onSearchChange,
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
  const goalProgress = React.useMemo(
    () => deriveGoalProgress(queries, currentUser?.queryingGoals, now),
    [queries, currentUser?.queryingGoals, now],
  );

  const firstName = (currentUser?.name ?? "").trim().split(/\s+/)[0] || "there";

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
     anything, the same reason the chart's `drewIn` is a ref. */
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
    const items = root.querySelectorAll(".os-card, .os-greet");
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
      className="os-root"
    >
      <div className="os-content" data-probe="main">
        {/* ⚠️ THE HEADER IS ITS OWN GRID ROW, spanning both columns — not the first thing in the
            main column. That is what lets the two columns below it start level.

            ⚠️ AND IT IS A FLEX ROW: the greeting sizes to its content, the counters card takes the
            rest, vertically centred against it. The greeting's own stack lives inside `.os-gl` —
            without that wrapper the dateline, name and pills would each become flex items on the
            same line. */}
        {/* ⚠️ THE TOP BAR IS THE PAGE'S, NOT THE SHELL'S — ref `.topbar`, which sits INSIDE `.main`
            and shares the grid's inset. It has to be a page element: the shell's own bar spans the
            window rather than the content column, so a probe on it could never match the ref's
            inset however the field were sized.
            ⚠️ AND IT CARRIES THE SEARCH ALONE. The ref draws Feedback and + New here too, because a
            standalone mockup has no shell to put them in; this app's shell bar already renders
            both, and + New carries three capture contracts. Re-rendering them here would be a
            second mount of a working control — the fault this repo records as "a replacement that
            is ADDED leaves the original reachable". They stay in the bar above, right-aligned,
            which is where the ref puts them anyway. */}
        <div className="os-topbar" data-probe="topbar">
          <span className="os-tbsp" />
          <div className="os-search" data-probe="search">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
            <input
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search agents, queries, manuscripts…"
              aria-label="Search agents, queries and manuscripts"
            />
            <span className="os-kbd">⌘K</span>
          </div>
          <span className="os-tbsp" />
        </div>

        {/* ⚠️ THREE COLUMNS, AND THE CENTRE IS THE ELASTIC ONE (dashboard redesign, Phase 2).
            Left: the manuscript, the community tile, and Pro at the foot. Centre: the chart over
            the to-do panel. Right: goals over activity, which `OneScreenRail` renders as `.os-colR`.

            ⚠️ `.os-midrow` / `.os-lowrow` ARE GONE, ELEMENT AND RULE TOGETHER. They paired the
            author tile with the chart and the community tile with tasks across two rows sharing one
            `grid-template-columns`, so neither pair could drift. With the columns as the grid's own
            tracks there is nothing left to drift — the law is kept by the structure rather than by
            a shared declaration, which is why the declaration goes rather than being retargeted. */}
        {/* ⚠️ THE GRID IS ITS OWN ELEMENT NOW (refdiff pass, Phase 3). It used to BE `.os-content`,
            with the hero as its first row — which meant the hero's height was a grid track and the
            three columns could not be given a row of their own. The ref draws `main` holding a
            `hero` and a `grid3`; this is that, and it is what `data-probe="grid"` measures. */}
        <div className="os-grid" data-probe="grid">
        {/* ⚠️ TWO COLUMNS, AND THE LEFT ONE HAS A ROW OF ITS OWN (ref v22, Phase 3). The
            manuscript tile and the chart card share a `330px | minmax(0,1fr)` top row at equal
            height, and the to-do card takes everything beneath it. Querying goals and the Pro
            banner have no place in this layout and are unmounted; Community leaves the column
            entirely and becomes a strip under both of them. */}
        <div className="os-colL">
          {/* ⚠️ THE HERO IS INSIDE THE LEFT COLUMN NOW (v26) — ref `.page2 > .lcol > .hero`. It used
              to be a row of `main` spanning both columns, which put the activity panel BELOW it;
              the ref starts the activity column level with the greeting, and the only way to do
              that is for the greeting to be the left column's first row. */}
          <div className={`os-greet${loading ? " isload" : ""}`} data-probe="hero">
            {loading && <Skel bars={["h", ""]} />}
            {/* ⚠️ THREE GRID CHILDREN, FLAT — greeting, subtitle, stats. The old `.os-gl` /
                `.os-grow2` nesting existed to stop the dateline, name and pills becoming flex items
                on one line; all three of those are gone, and with the hero a two-row grid the
                wrapper would be the grid item instead of the heading it wraps. */}
            <h1 data-probe-text="greeting">Hello, {firstName}</h1>
            <div className="os-subrow">
              {/* ⚠️ A QUESTION, NOT A DERIVED FACT — the one piece of address on the page, which is
                  why it is a constant. The slot has held a kicker, a date and a lede; v26 states it
                  as its own hero row with its own text probe. */}
              <p className="os-sub2line" data-probe-text="subtitle">What&apos;s on your desk today?</p>
              {chipShows && (
                <button type="button" ref={tourChipRef} className="os-tourchip" onClick={() => { if (wideEnough()) setTouring(true); }}>
                  Take the tour
                </button>
              )}
            </div>
            {/* ⚠️ queries SCOPED, agents NOT — "agents on file" is a person-count, not a per-book fact. */}
            <OneScreenCounters loading={loading} queries={scopedQueries} agents={agents} now={now} />
          </div>
          <div className="os-toprow" data-probe="toprow">
            <OneScreenAuthor
              loading={loading} manuscripts={manuscripts} compact
              currentUser={currentUser} activeManuscript={activeManuscript}
              onNavigate={onNavigate}
            />
            <OneScreenChart
            loading={loading} queries={scopedQueries} agents={agents} now={now}
            dayOne={scopedStage === "day-one"} earlyDays={scopedStage === "early-days"}
              onSendFirst={() => onNavigate("queries", "Send a query")}
            />
          </div>
          {/* ⚠️ SCOPED WHERE SCOPE MEANS SOMETHING, RAW WHERE IT DOES NOT (Phase 5). Tasks and
              activities are the manuscript's; queries, agents and manuscripts are the LOOKUP sets
              the board resolves cards against, and scoping those would hide the agent a scoped
              task is about. `taskFlags` is a stance the writer took on a task, not a per-book fact.
              This is the same split `assembleBoardColumns` is given everywhere else it is called. */}
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
        {/* ⚠️ A STRIP UNDER BOTH COLUMNS, NOT A CARD IN ONE (ref v22). It is the same component
            with a `strip` layout: an icon, a title, one line and the Beta pill on a single row.
            As a column card it competed for height with the work; as a footer it states what it
            is and gets out of the way. */}
        <OneScreenCommunity loading={loading} strip />
      </div>
      {/* ⚠️ LAST CHILD, OVER THE MOUNTED PAGE. The cards stay in the tree beneath it, which is what
          makes "no layout shift" structural rather than a matter of matching numbers — and it is
          why the dissolve works: the page is already finished under there, so this fades off a
          settled picture rather than crossfading between two moving ones. */}
      {skeleton.phase !== "off" && <OneScreenSkeleton leaving={skeleton.phase === "out"} />}
      {touring && <OneScreenTour rootRef={rootRef} onEnd={endTour} />}
    </div>
  );
};
