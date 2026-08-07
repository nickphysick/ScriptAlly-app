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
import { longDate, weekOfQuerying } from "../../lib/dashboardStats";
import { achievementPill, Achievement, runStage, tenureLine } from "../../lib/oneScreen";
import { STAGE_SCROLL_ID } from "../../lib/stageScroll";
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
  /* §9: day one's kicker is "Getting started" — there is no week to number yet. */
  const kicker = stage === "day-one"
    ? "Getting started"
    : `${weekOfQuerying(queries, now)} of querying${activeManuscript ? ` · ${activeManuscript.title}` : ""}`;

  return (
    <div
      ref={rootRef}
      className="os-root"
      /* the lock: measured stage height. min-height is FORBIDDEN here (§1). */
      style={lockH !== null ? { height: lockH } : undefined}
    >
      <div className="os-content">
        <div className="os-colM">
          <div className={`os-greet${loading ? " isload" : ""}`}>
            {loading && <Skel bars={["h", ""]} />}
            <span className="os-kicker">{kicker}</span>
            <div className="os-grow2">
              {/* ⚠️ PLAIN INK, NO BURGUNDY, NO ITALICS (§2) — this reverses the settled desk's
                  burgundy-italic name on the new spec's authority. */}
              <h1>Hello, {firstName}</h1>
              <span className="os-spacer" />
              <span className="os-datechip">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                {longDate(now)}
              </span>
            </div>
            <div className="os-pills">
              {/* §2: tenure · achievement · agents-on-file, in that order — the middle one is the
                  one ≤1200px drops first, and the CSS indexes on that.
                  §9: DAY ONE is a single "Day one" pill; EARLY DAYS drops the achievement slot —
                  §7's fallback is technically always true, but a day-three account being told
                  "2 queries awaiting a reply" as an achievement is the padding the facts-only
                  rule exists to stop. §9 is the specific section and wins. */}
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

          <OneScreenChart
            loading={loading} queries={queries} agents={agents} now={now}
            dayOne={stage === "day-one"} earlyDays={stage === "early-days"}
            onSendFirst={() => onNavigate("queries", "Send a query")}
          />

          <OneScreenTasks
            loading={loading}
            tasks={tasks}
            queries={queries}
            agents={agents}
            dayOne={stage === "day-one"}
            onAction={onTaskAction}
            onSeeAll={() => onNavigate("todo")}
            onAddManuscript={() => onNavigate("manuscripts", "Add a manuscript")}
            onAddAgent={() => onNavigate("agents", "Add an agent")}
          />
        </div>

        <OneScreenRail
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
    </div>
  );
};
