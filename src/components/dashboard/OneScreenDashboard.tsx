/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenDashboard — the one-screen dashboard (refs design-refs/dashboard-one-screen.html +
 * dashboard-one-screen-spec.md; §-references below are the spec's).
 *
 * ⚠️ THE ONE-SCREEN PROMISE (§1): the page fits the stage exactly and never scrolls; only tasks
 * and activity scroll, internally. The lock's height is MEASURED from #app-stage-scroll — the
 * dashboard sits in a FLOW StagePage slot, whose % chain breaks at the slot div, so a measured
 * pixel height is the stage-relative way to fill it (never a 100vh, never a bar offset; the house
 * stage law). The ≤1024px and ≤680px releases live in the CSS with !important, which is what
 * outranks an inline height.
 *
 * ⚠️ `min-height` IS FORBIDDEN on the lock elements (§1) — it grows past the fold with no
 * scrollbar. Locked in the smoke test against the stylesheet.
 */
import React, { useEffect, useRef, useState } from "react";
import { Activity, Agent, Manuscript, Query, Task, User, UserTask } from "../../types";
import { longDate } from "../../lib/dashboardStats";
import { achievementPill, Achievement, runStage, tenureLine, tourAutoRuns, tourChipShows } from "../../lib/oneScreen";
import { OneScreenTour, TOUR_BREAKPOINT } from "./OneScreenTour";
import { STAGE_SCROLL_ID } from "../../lib/stageScroll";
import { OneScreenAuthor } from "./OneScreenAuthor";
import { OneScreenChart } from "./OneScreenChart";
import { OneScreenTasks } from "./OneScreenTasks";
import { OneScreenRail } from "./OneScreenRail";
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

/**
 * The stage-measured lock. Returns null until measured — the root renders unlocked for that
 * first frame, which is invisible (the CSS releases handle every no-lock case identically).
 */
const useStageLock = (): number | null => {
  const [h, setH] = useState<number | null>(null);
  useEffect(() => {
    const stage = document.getElementById(STAGE_SCROLL_ID);
    if (!stage) return;
    const measure = () => setH(stage.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);
  return h;
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
  const lockH = useStageLock();
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

  /* One-time entrance stagger — the class is REMOVED after it runs (§6 trap: a persistent
     fill-mode would pin opacity against every later class change). */
  const rootRef = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (loading || entered) return;
    setEntered(true);
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const items = root.querySelectorAll(".os-card, .os-greet");
    items.forEach((el) => el.classList.add("enter"));
    const id = window.setTimeout(() => items.forEach((el) => el.classList.remove("enter")), 900);
    return () => window.clearTimeout(id);
  }, [loading, entered]);

  const tenure = tenureLine(queries);
  const ach = achievementPill(queries, now);
  const stage = runStage(queries, manuscripts, now);

  return (
    <div
      ref={rootRef}
      className="os-root"
      /* the lock: measured stage height. min-height is FORBIDDEN here (§1). */
      style={lockH !== null ? { height: lockH } : undefined}
    >
      <div className="os-content">
        {/* ⚠️ THE HEADER IS ITS OWN GRID ROW, spanning both columns — not the first thing in the
            main column. That is what lets the two columns below it start level. */}
        <div className={`os-greet${loading ? " isload" : ""}`}>
          {loading && <Skel bars={["h", ""]} />}
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
            {/* §2: tenure · achievement · agents-on-file. §9: day one is a single pill; early days
                drops the achievement slot — a day-three account told "2 awaiting a reply" as an
                ACHIEVEMENT is the padding the facts-only rule exists to stop. */}
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
                {/* "on file", never "met" (§2) */}
                <span className="os-pill pk"><b>{agents.length}</b> agents on file</span>
              </>
            )}
          </div>
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
              loading={loading} queries={queries} agents={agents} now={now}
              dayOne={stage === "day-one"} earlyDays={stage === "early-days"}
              onSendFirst={() => onNavigate("queries", "Send a query")}
            />
          </div>

          <OneScreenTasks
            loading={loading}
            tasks={tasks}
            queries={queries}
            agents={agents}
            userTasks={userTasks}
            now={now}
            dayOne={stage === "day-one"}
            onAction={onTaskAction}
            onSeeAll={() => onNavigate("todo")}
            onAddManuscript={() => onNavigate("manuscripts", "Add a manuscript")}
            onAddAgent={() => onNavigate("agents", "Add an agent")}
          />
        </div>

        <OneScreenRail
          expanded={railExpanded}
          setExpanded={setRailExpanded}
          loading={loading}
          queries={queries}
          agents={agents}
          manuscripts={manuscripts}
          userTasks={userTasks}
          activities={activities}
          currentUser={currentUser}
          activeManuscript={activeManuscript}
          onNavigate={onNavigate}
          updateUserProfile={updateUserProfile}
          now={now}
        />
      </div>
      {touring && <OneScreenTour rootRef={rootRef} onEnd={endTour} />}
    </div>
  );
};
