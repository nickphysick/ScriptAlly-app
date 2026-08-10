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
import { Activity, Agent, Manuscript, Query, Task, User, UserTask } from "../../types";
import { longDate } from "../../lib/dashboardStats";
import { achievementPill, Achievement, runStage, tenureLine, tourAutoRuns, tourChipShows } from "../../lib/oneScreen";
import { OneScreenTour, TOUR_BREAKPOINT } from "./OneScreenTour";
import { OneScreenAuthor } from "./OneScreenAuthor";
import { OneScreenChart } from "./OneScreenChart";
import { OneScreenTasks } from "./OneScreenTasks";
import { OneScreenPro } from "./OneScreenPro";
import { OneScreenCounters } from "./OneScreenCounters";
import { scopeActivities, scopeQueries, scopeTasks } from "../../lib/manuscriptScope";
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
  currentUser: User | null;
  /** The manuscript the shell scope names — the kicker repeats it (§2). */
  activeManuscript: Manuscript | null;
  onNavigate: (tab: string, sub?: string) => void;
  onTaskAction: (task: Task) => void;
  updateUserProfile: (fields: Partial<User>) => Promise<void>;
  /** Injectable for tests; defaults to the real clock. */
  now?: Date;
}

/** The achievement pill's tone follows the mockup's map: sage for the wins, plain for the rest. */
const ACH_TONE: Record<Achievement["key"], string> = {
  record: "sg", streak: "sg", fastest: "sg", milestone: "", awaiting: "",
};

/** §8: the per-card shimmer, shaped roughly like the card it stands in for. */
export const Skel: React.FC<{ bars: ("h" | "grow" | "")[] }> = ({ bars }) => (
  <div className="os-skel" aria-hidden="true">
    {bars.map((b, i) => <i key={i} className={b || undefined} style={b === "" ? { width: `${52 + ((i * 17) % 30)}%` } : b === "h" ? { width: `${30 + ((i * 13) % 20)}%` } : undefined} />)}
  </div>
);

export const OneScreenDashboard: React.FC<OneScreenDashboardProps> = ({
  loading, queries, agents, manuscripts, tasks, userTasks, activities, currentUser,
  activeManuscript, onNavigate, onTaskAction, updateUserProfile, now = new Date(),
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

  const firstName = (currentUser?.name ?? "").trim().split(/\s+/)[0] || "there";

  /* ── §12 · the tour ── */
  const [touring, setTouring] = useState(false);
  /* the rail's expanded state is lifted here so the tour can collapse it before starting */
  const [railExpanded, setRailExpanded] = useState(false);
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
    const id = window.setTimeout(() => { setRailExpanded(false); setTouring(true); }, 700);
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
  const rootRef = useRef<HTMLDivElement>(null);
  const entered = useRef(false);
  useEffect(() => {
    if (loading || entered.current) return;
    entered.current = true;
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const items = root.querySelectorAll(".os-card, .os-greet");
    items.forEach((el) => el.classList.add("enter"));
    const id = window.setTimeout(() => items.forEach((el) => el.classList.remove("enter")), 900);
    return () => window.clearTimeout(id);
  }, [loading]);

  /* ⚠️ TENURE IS ACCOUNT-SCOPED — "querying since" is when YOU started, not when this book did. */
  const tenure = tenureLine(queries);
  /**
   * ⚠️ THE ACHIEVEMENT PILL STAYS ACCOUNT-SCOPED, beside the tenure pill it partners. "Your best
   * month" and "a new fastest reply" are facts about your querying, and narrowing them to one book
   * turns a real record into a weaker claim about a subset — while the pill sits next to a tenure
   * line that is explicitly account-wide. Two neighbouring pills answering at different scopes is
   * the two-numbers-one-name fault in a new place.
   */
  const ach = achievementPill(queries, now);
  const stage = runStage(queries, manuscripts, now);
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

  /**
   * ⚠️ THE PAGE SKELETON IS NOT `loading` (P1). It lags the flag at BOTH ends on purpose — it
   * refuses to appear for a wait under ~200ms, and once it has appeared it outlives the data by
   * up to ~400ms. Rendering it straight off `loading` would reinstate exactly the flash the delay
   * buys off. The rule lives in lib/skeletonTiming.
   */
  const skeleton = useSkeleton(loading);

  return (
    <div
      ref={rootRef}
      className="os-root"
    >
      <div className="os-content">
        {/* ⚠️ THE HEADER IS ITS OWN GRID ROW, spanning both columns — not the first thing in the
            main column. That is what lets the two columns below it start level.

            ⚠️ AND IT IS A FLEX ROW: the greeting sizes to its content, the counters card takes the
            rest, vertically centred against it. The greeting's own stack lives inside `.os-gl` —
            without that wrapper the dateline, name and pills would each become flex items on the
            same line. */}
        <div className={`os-greet${loading ? " isload" : ""}`}>
          {loading && <Skel bars={["h", ""]} />}
          <div className="os-gl">
            {/* ⚠️ NO KICKER (v16 §1). A muted DATE LINE sits above the greeting instead — the week
                number and the manuscript were repeating what the chrome already says. */}
            <div className="os-dateline">{longDate(now)}</div>
            <div className="os-grow2">
              {/* ⚠️ PLAYFAIR 700 AT 46px, PLAIN INK. No burgundy, no italics — the third and final
                  swing of that pendulum, recorded at each turn. */}
              <h1>Hello, {firstName}</h1>
              <span className="os-spacer" />
              {chipShows && (
                <button type="button" ref={tourChipRef} className="os-tourchip" onClick={() => { if (wideEnough()) { setRailExpanded(false); setTouring(true); } }}>
                  Take the tour
                </button>
              )}
            </div>
            <div className="os-pills">
              {/* §2: tenure · achievement. ⚠️ THE AGENTS PILL IS GONE — the counters card states
                  that figure now, and two homes for one number is how they come to disagree.
                  §9: day one is a single pill; early days drops the achievement slot — a day-three
                  account told "2 awaiting a reply" as an ACHIEVEMENT is the padding the facts-only
                  rule exists to stop. */}
              {stage === "day-one" ? (
                <span className="os-pill">Day one</span>
              ) : (
                <>
                  {tenure && <span className="os-pill">{tenure.replace(/ ([^ ]+ \d{4})$/, "")} <b>{tenure.match(/([^ ]+ \d{4})$/)?.[1]}</b></span>}
                  {stage === "settled" && (
                    <span className={`os-pill ach ${ACH_TONE[ach.key]}`.trim()}>
                      {ach.pre}<b>{ach.strong}</b>{ach.post}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
          {/* ⚠️ queries SCOPED, agents NOT — "agents on file" is a person-count, not a per-book fact. */}
          <OneScreenCounters loading={loading} queries={scopedQueries} agents={agents} now={now} />
        </div>

        <div className="os-colM">
          {/* ⚠️ A FIXED 302px ROW, and the LEFT column owns the height. The author tile's natural
              size sets it; the chart fills beside it. Never `1fr` — the rail would then drive the
              row and the page would grow past the fold. */}
          <div className="os-midrow">
            <OneScreenAuthor
              loading={loading} manuscripts={manuscripts}
              currentUser={currentUser} activeManuscript={activeManuscript}
              onNavigate={onNavigate}
            />
            <OneScreenChart
              loading={loading} queries={scopedQueries} agents={agents} now={now}
              dayOne={scopedStage === "day-one"} earlyDays={scopedStage === "early-days"}
              onSendFirst={() => onNavigate("queries", "Send a query")}
            />
          </div>

          <OneScreenTasks
            loading={loading}
            tasks={scopedTasks}
            queries={queries}
            agents={agents}
            userTasks={userTasks}
            now={now}
            dayOne={scopedStage === "day-one"}
            onAction={onTaskAction}
            onSeeAll={() => onNavigate("todo")}
            onAddManuscript={() => onNavigate("manuscripts", "Add a manuscript")}
            onAddAgent={() => onNavigate("agents", "Add an agent")}
          />

          {/* ⚠️ SHOWN ONLY WHERE THE EXTRA ROW GENUINELY FITS — the CSS gates it on viewport
              height AND width (§5). Below either threshold it is not rendered small, it is not
              rendered at all: a squeezed upsell costs the page its one-screen promise. */}
          <OneScreenPro loading={loading} currentUser={currentUser} onNavigate={onNavigate} />
        </div>

        <OneScreenRail
          expanded={railExpanded}
          setExpanded={setRailExpanded}
          loading={loading}
          queries={scopedQueries}
          agents={agents}
          manuscripts={manuscripts}
          userTasks={userTasks}
          activities={scopedActivities}
          currentUser={currentUser}
          activeManuscript={activeManuscript}
          onNavigate={onNavigate}
          updateUserProfile={updateUserProfile}
          now={now}
        />
      </div>
      {/* ⚠️ LAST CHILD, OVER THE MOUNTED PAGE. The cards stay in the tree beneath it — the
          entrance stagger has to find them the moment this lifts, and leaving them mounted is what
          makes "no layout shift" structural rather than a matter of matching numbers. */}
      {skeleton && <OneScreenSkeleton />}
      {touring && <OneScreenTour rootRef={rootRef} onEnd={endTour} />}
    </div>
  );
};
