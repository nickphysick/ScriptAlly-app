/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenDashboard — the dashboard (v16, 18 Sep; top row and card chrome v33, 18 Sep — refs
 * design-refs/dashboard-v16-2026-09-18.html and design-refs/dashboard-v33.html).
 *
 * The header, then two rows: quick actions · the chart · closed, and beneath them the activity feed
 * beside the to-do list. Both cards in the second row end on the same line and scroll inside it.
 *
 * ⚠️ THE ONE-SCREEN LOCK IS DROPPED (stages 2–3, 17 Sep — Nick). The page flows and the stage scrolls
 * it; the route is a `flow` slot and `dashboard` is off the shell's `fit` list.
 *
 * ⚠️ RETIRED WITH v16: the breakdown ("Where your queries stand"), the header's illustration, the
 * activity RAIL and its community tile, the manuscript tile and the quick-action list. The feed is
 * `OneScreenFeed` over `lib/dashFeed` — the rail's own derivation, in a lib, under a new layout.
 *
 * ⚠️ THE CONTENT IS A CENTRED BLOCK WITH A MAXIMUM WIDTH (`--dash-page-max`, declared on the dashboard
 * route's `.ws-main` so the shell's top bar can pad itself to the same measure). The activity column is INSIDE the
 * block, never pinned to the window's edge — pinned, a gap opened between it and the content on a
 * wide monitor.
 *
 * ⚠️ NEVER 100vh AND NEVER A BAR OFFSET (the house stage law) still holds: nothing here measures the
 * viewport; the fixed row height is a length, not a fraction of the window.
 */
import React, { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Activity, Agent, Manuscript, ManuscriptVersion, Query, Task, TaskFlag, User, UserTask } from "../../types";
import { runStage, tourAutoRuns, tourChipShows } from "../../lib/oneScreen";
import { OneScreenTour, TOUR_BREAKPOINT } from "./OneScreenTour";
import { OneScreenChart } from "./OneScreenChart";
import { OneScreenActions } from "./OneScreenActions";
import { OneScreenClosed } from "./OneScreenClosed";
import { liveCount } from "../../lib/dashBreakdown";
import { closedTile } from "../../lib/dashClosed";
import { OneScreenTasks } from "./OneScreenTasks";
import { OneScreenHeader } from "./OneScreenHeader";
import { dashHeaderLine, type DashHeaderLine } from "../../lib/dashHeader";
import { localYMD } from "../../lib/shellSidebar";
import { scopeActivities, scopeQueries, scopeTasks } from "../../lib/manuscriptScope";
import { OneScreenFeed } from "./OneScreenFeed";
/**
 * ⚠️ LAZY, AND FOR THE REASON `DashTaskDrawer` IS. It reaches `useDockActivity` → `lib/firebase`,
 * which initialises the SDK at module load; a static import here would put `auth/invalid-api-key`
 * into every dashboard suite's import graph and they would stop COLLECTING.
 */
const QueryCardLive = React.lazy(() =>
  import("./QueryCardLive").then((m) => ({ default: m.QueryCardLive })));
import { readSeenAt, writeSeenAt } from "../../lib/dashSeen";
import { OneScreenSkeleton } from "./OneScreenSkeleton";
import { useSkeleton } from "../../lib/skeletonTiming";
import { DashPopupProvider } from "./DashPopup";
import { DASH_ART, artUrl } from "../../lib/dashArt";
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
  /* ⚠️ `onTaskAction` IS RETIRED (v16). It was destructured and never called — `tsc` does not flag an
     unused prop, so it sat here as a handler the page could not reach. The To-do drawer is how a task
     is acted on from this page. */
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
  activeManuscript, onNavigate, updateUserProfile, versions = [], now = new Date(),
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

  /* ⚠️ THE GOAL DERIVATION IS RETIRED (v16). `deriveGoalProgress` was computed here and read by
     nothing — the goals card left the page with the rail's rebuild and the `const` stayed, which is
     the assigned-but-unread shape this file's own notes warn about two screens down. */

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
  const closed = React.useMemo(
    () => (loading ? null : closedTile(scopedQueries, scopedActivities)),
    [loading, scopedQueries, scopedActivities],
  );
  const activeCount = loading ? null : liveCount(scopedQueries);

  /**
   * ⚠️ READ ONCE, ON ARRIVAL; WRITTEN WHEN THE PAGE GOES (Nick, 18 Sep). The feed marks what is new
   * since this device last left the dashboard, so the moment must be the PREVIOUS visit's — stamping
   * on mount would clear the rules in the same frame that drew them.
   *
   * ⚠️ AND `pagehide` CARRIES THE COMMON CASE. The workspace keeps its pages mounted and toggles
   * `display`, so React's unmount fires on a tier crossing and on a reload it does not fire at all;
   * `pagehide` is the event a refresh and a closing tab both raise. Both paths write the same stamp.
   */
  const [seenAt] = useState<number | null>(() => readSeenAt());
  useEffect(() => {
    const stamp = () => writeSeenAt();
    window.addEventListener("pagehide", stamp);
    return () => { window.removeEventListener("pagehide", stamp); stamp(); };
  }, []);

  /* ⚠️ THE FEED'S ACTION AND THE PANEL'S DRAWER, JOINED HERE BECAUSE THEY ARE IN DIFFERENT COLUMNS
     (Phase 6). The rail's "Mark sent" hands up a query id; the to-do panel resolves it against the
     live board and opens its own drawer on the card. One drawer on the page, one session, one write
     path — a second one in the rail would be a second answer to what finishing a send involves. */
  const [feedOpenQueryId, setFeedOpenQueryId] = useState<string | null>(null);
  /**
   * ⚠️ ONE PEEK AT A TIME, AND IT HOLDS THE ROW IT CAME FROM. The anchor is the element the writer
   * clicked: the popover is placed against it and the row stays highlighted behind it, so what was
   * clicked is still visible while it is being read. A second open peek would be two answers to
   * "which query am I looking at".
   */
  const [peek, setPeek] = useState<{ entryId: string; queryId: string; anchor: HTMLElement } | null>(null);

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
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);

  /**
   * ⚠️ THE SECOND ROW'S HEIGHT IS MEASURED FROM THE PAGE'S OWN SCROLL AREA, NEVER FROM THE VIEWPORT
   * (Nick, 18 Sep). The ref's `calc(100vh - 560px)` is right on a page that starts at the top of the
   * window; this one sits under the beta strip, the top bar and the window's inset, so `100vh`
   * over-claims by all of it — the house stage law, and the 21px the Tasks chassis lost to exactly
   * this arithmetic. The two figures published here are the scroller's own height and the distance
   * from its top to this row; the clamp in oneScreen.css does the rest.
   *
   * ⚠️ AND IT CANNOT FEED ITSELF. What is measured is the PORT (sized by the shell) and the row's TOP
   * (set by the header and the first row) — neither moves when this row's height changes. The write is
   * guarded on the value anyway, so even a surprising reflow settles in one pass rather than looping.
   *
   * ⚠️ A LAYOUT EFFECT, SO THE FIRST PAINTED FRAME CARRIES THE MEASURED VALUE. As a passive effect the
   * first frame rendered at the token's sentinel — the row at its FLOOR — and corrected a frame later,
   * which is a visible jump on the loading cover and put the skeleton gate's first-frame read 5px out
   * while a settled read was within 1. The skeleton's own `GhostRows` measures in a layout effect for
   * the same reason, and says so.
   */
  useLayoutEffect(() => {
    const root = rootRef.current;
    const row = row2Ref.current;
    if (!root || !row) return undefined;
    const port = root.closest(".ws-wbody") as HTMLElement | null;
    let frame = 0;
    const set = (name: string, px: number) => {
      const next = `${Math.round(px)}px`;
      if (root.style.getPropertyValue(name) !== next) root.style.setProperty(name, next);
    };
    /* ⚠️ NO VIEWPORT FALLBACK. With no scroller found there is nothing honest to say, so the two
       sentinels stand and the row sits at its floor — `window.innerHeight` here would be the exact
       over-claim the token's own note forbids, arriving through the back door. */
    if (!port) return undefined;
    /**
     * ⚠️ THE ROW IS READ WHEREVER IT IS ON SCREEN — THE PAGE'S, OR THE COVER'S.
     *
     * While the loading cover holds, `.os-root.os-loading > .os-content` is `display: none`, so the
     * real row's rect is all zeros and `top - portTop` came out NEGATIVE (measured −115). The clamp
     * then took its ceiling and the ghost's second row rendered 560 against a loaded 383 — a 177px
     * jump at the exact moment the cover lifts, which is the one thing the cover exists to prevent.
     *
     * The cover renders the page's own containers, so its `[data-sk="row2"]` sits where the real row
     * will: measuring THAT while the page is down gives the honest figure before there is anything to
     * jump. A `display: none` element has a null `offsetParent`, which is how the two are told apart.
     */
    const liveRow = (): HTMLElement =>
      (row.offsetParent ? row : (document.querySelector('[data-sk="row2"]') as HTMLElement | null) ?? row);
    const measure = () => {
      frame = 0;
      const portBox = port.getBoundingClientRect();
      const r = liveRow().getBoundingClientRect();
      set("--os-port-h", port.clientHeight);
      /* ⚠️ AND A ZERO RECT IS REFUSED RATHER THAN WRITTEN. If neither row is laid out there is
         nothing honest to say, and the token's sentinel leaves the row at its floor. */
      if (r.height <= 0 && r.top === 0) return;
      set("--os-row2-top", r.top - portBox.top);
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(measure); };
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(schedule);
    ro.observe(port);
    if (row1Ref.current) ro.observe(row1Ref.current);
    window.addEventListener("resize", schedule);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [loading]);
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
      /**
       * ⚠️ `os-loading` STANDS THE PAGE DOWN WHILE THE GHOST HOLDS THE FLOW (v33.2, Phase 4). It is
       * keyed off the cover's own phase rather than off `loading`, so the page comes back at the
       * moment the ghost starts dissolving — `out` is the 250ms where both are on screen and the
       * ghost is absolute over a page that is once again laid out.
       */
      className={`os-root${skeleton.phase === "on" ? " os-loading" : ""}`}
    >
      {/* ⚠️ THE HAWK'S SHADOW BELONGS TO THE GREETING (v33). One image, behind the cards (`z-index: 0`;
          every row is above it), inert, and ABSOLUTE INSIDE THE CONTENT — so it scrolls with the page
          rather than hanging on the window. A wing crosses the greeting and runs up behind the search
          bar; the body disappears under the first two cards; a sliver shows in the gutter between
          them. Nothing shows through a card: the cards are opaque and above it.
          ⚠️ IT IS THE SOLID FILE, NOT THE LANDING PAGE'S — see `lib/dashArt`. */}
      <DashPopupProvider rootRef={rootRef}>
      <div className="os-content" data-probe="main">
        <div className="os-greetshadow" aria-hidden="true" data-probe="greet-shadow">
          <img src={artUrl(DASH_ART.shadow)} width={DASH_ART.shadow.width} height={DASH_ART.shadow.height} alt="" decoding="async" />
        </div>
        {/* ⚠️ FOUR ROWS IN ONE CENTRED BLOCK (stages 2–3, 17 Sep): the header, the breakdown and the
            three-card row span the block's width, and the to-do card and the activity column sit
            side by side beneath them. The header used to be the left column's first row with the
            activity column beside it; it spans the block now, and its own layout is unchanged. */}
        <OneScreenHeader
          firstName={firstName}
          line={headerLine}
          tour={chipShows ? { onStart: () => { if (wideEnough()) setTouring(true); }, buttonRef: tourChipRef } : null}
        />

        {/* ⚠️ ROW ONE IS THREE CARDS OF ONE HEIGHT — `align-items: stretch` and nothing measured. The
            quick actions fill their card in equal thirds, the chart fills what the header leaves, and
            the closed card fills its 320px column. */}
        <div className="os-row1" data-probe="row1" ref={row1Ref}>
          <OneScreenActions loading={loading} onNavigate={onNavigate} />
          <OneScreenChart
            loading={loading}
            queries={scopedQueries}
            activities={scopedActivities}
            agents={agents}
            manuscripts={manuscripts}
            onOpenQuery={(id) => onNavigate("queries", id)}
            activeCount={activeCount}
            now={now}
            empty={empty}
            onSendFirst={() => onNavigate("queries", "Send a query")}
          />
          <OneScreenClosed
            loading={loading} tile={closed} queries={queries} agents={agents}
            onSeeAll={() => onNavigate("queries")} onOpenQuery={(id) => onNavigate("queries", id)}
          />
        </div>

        {/* ⚠️ ROW TWO IS ONE HEIGHT AND TWO SCROLLERS. The row's height is a clamp on the page's own
            scroll area (see oneScreen.css) rather than on the viewport — the house stage law — and
            each card is a flex column whose body scrolls inside it, so both end on the same line
            however much either holds. */}
        <div className="os-row2" data-probe="row2" ref={row2Ref}>
          <OneScreenFeed
            loading={loading}
            activities={scopedActivities}
            queries={queries}
            agents={agents}
            manuscripts={manuscripts}
            now={now}
            seenAt={seenAt}
            empty={empty}
            onOpenTask={(queryId) => setFeedOpenQueryId(queryId)}
            onPeek={(entry, anchor) => setPeek(
              entry.queryId ? { entryId: entry.id, queryId: entry.queryId, anchor } : null)}
            openPeekId={peek?.entryId ?? null}
          />
          {/* ⚠️ SCOPED WHERE SCOPE MEANS SOMETHING, RAW WHERE IT DOES NOT (Phase 5). Tasks and
              activities are the manuscript's; queries, agents and manuscripts are the LOOKUP sets the
              board resolves cards against, and scoping those would hide the agent a scoped task is
              about. `taskFlags` is a stance the writer took on a task, not a per-book fact. */}
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
            /* the page owns the one card; the row raises the request and stays lit while it is up */
            onQuickRef={(queryId, anchor) => setPeek((p) => (
              p?.queryId === queryId ? null : { entryId: `todo:${queryId}`, queryId, anchor }))}
            refQueryId={peek?.queryId ?? null}
          />
        </div>
      </div>
      {/* ⚠️ MOUNTED ONLY WHILE ONE IS OPEN, WITH NO FALLBACK. The popover's own arrival announces it;
          a spinner in its place would be a second thing appearing beside the row. */}
      {peek && (() => {
        const q = queries.find((x) => x.id === peek.queryId);
        if (!q) return null;
        return (
          <Suspense fallback={null}>
            <QueryCardLive
              uid={currentUser?.id}
              query={q}
              agent={agents.find((a) => a.id === q.agentId)}
              manuscript={manuscripts.find((m) => m.id === q.manuscriptId)}
              anchor={peek.anchor}
              onClose={() => setPeek(null)}
              onOpenQuery={(id) => { setPeek(null); onNavigate("queries", id); }}
            />
          </Suspense>
        );
      })()}
      </DashPopupProvider>
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
        />
      )}
      {touring && <OneScreenTour rootRef={rootRef} onEnd={endTour} />}
    </div>
  );
};
