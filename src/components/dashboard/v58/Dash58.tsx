/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v58 — one screen (ref design-refs/dashboard/dashboard-v58.html).
 *
 * The header is the book being queried. Two framed cards down the left: active queries (today's
 * card and chart) over closed queries. The right column has no container: a typewriter title, one
 * item in focus, and the rest of the list under it. The activity feed is a drawer behind a
 * floating tab.
 *
 * ⚠️ NOTHING HERE WRITES A STATUS. Every action opens the flow that does: the query drawer
 * (`openQueryDrawer`), the agent card, or a route.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Activity, Agent, Manuscript, ManuscriptVersion, Query, Task, TaskFlag, User, UserTask } from "../../../types";
import { scopeActivities, scopeQueries, scopeTasks } from "../../../lib/manuscriptScope";
import { localYMD } from "../../../lib/shellSidebar";
import { liveCount } from "../../../lib/dashBreakdown";
import { closedTile } from "../../../lib/dashClosed";
import { assembleBoardColumns } from "../../../lib/todoColumns";
import { todoRows } from "../../../lib/dashTodo";
import { dashList, focusOf, startingPlan, type ListAction } from "../../../lib/dashList";
import { gettingStartedRows } from "../../../lib/dashEmpty";
import { buildQcRows, rowsForTile } from "../../../lib/qcSummary";
import { feedEntries } from "../../../lib/dashFeed";
import { todayCount } from "../../../lib/dashFeedDrawer";
import { openQueryDrawer } from "../../../lib/queryActions/drawerStore";
import { openAgentCard } from "../../../lib/agentCardStore";
import { queriesPathFor } from "../../../lib/queriesFilterParam";
import { dashAid, useDashHold, type DashAid } from "../../../lib/dashReviewAid";
import { readShape, writeShape } from "../../../lib/dashShape";
import { DashPopupProvider } from "../DashPopup";
import { OneScreenChart } from "../OneScreenChart";
import { Dash58Header } from "./Dash58Header";
import { Dash58Closed } from "./Dash58Closed";
import { Dash58List } from "./Dash58List";
import { Dash58Feed, FeedTab } from "./Dash58Feed";
import "../oneScreen.css";
import "./dash58.css";

export interface Dash58Props {
  loading: boolean;
  queries: Query[];
  agents: Agent[];
  manuscripts: Manuscript[];
  versions?: ManuscriptVersion[];
  tasks: Task[];
  userTasks: UserTask[];
  activities: Activity[];
  taskFlags: TaskFlag[];
  currentUser: User | null;
  activeManuscript: Manuscript | null;
  onNavigate: (tab: string, sub?: string) => void;
  now?: Date;
}

const NO_AID: DashAid = { drop: [], noClosed: false };

export const Dash58: React.FC<Dash58Props> = ({
  loading: dataLoading, queries, agents, manuscripts, tasks, userTasks, activities, taskFlags, currentUser,
  activeManuscript, onNavigate, now: nowProp, versions = [],
}) => {
  /* one clock per mount: a new Date on every render would rebuild every derivation below */
  const [mountedAt] = useState(() => new Date());
  const now = nowProp ?? mountedAt;
  const navigate = useNavigate();
  /* ⚠️ BOTH AID READS CARRY THE MODE GATE AT THE CALL SITE. `MODE` is replaced statically, so in a
     production build each branch is dead and the aid's module is unreachable — a guard inside the
     module would fold to inert and still ship. The condition is a build constant, so the hook is
     called on every render or on none. */
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const held = import.meta.env.MODE !== "production" ? useDashHold() : false;
  const loading = dataLoading || held;
  const aid = import.meta.env.MODE !== "production" ? dashAid() : NO_AID;

  const scopeId = activeManuscript?.id ?? null;
  const msIds = useMemo(() => new Set(manuscripts.map((m) => m.id)), [manuscripts]);
  const scopedQueries = useMemo(() => scopeQueries(queries, scopeId), [queries, scopeId]);
  const scopedActivities = useMemo(() => scopeActivities(activities, scopeId), [activities, scopeId]);
  const scopedTasks = useMemo(() => scopeTasks(tasks, queries, msIds, scopeId), [tasks, queries, msIds, scopeId]);
  const empty = scopedQueries.length === 0;

  /* ── the left column ── */
  const activeCount = loading ? null : liveCount(scopedQueries);
  const closed = useMemo(() => {
    if (loading) return null;
    return closedTile(aid.noClosed ? [] : scopedQueries, scopedActivities);
  }, [loading, scopedQueries, scopedActivities, aid.noClosed]);
  const qcRows = useMemo(() => buildQcRows(scopedQueries, agents, scopedActivities, now.getTime()), [scopedQueries, agents, scopedActivities, now]);
  const qcClosed = useMemo(() => rowsForTile(qcRows, "closed").length, [qcRows]);

  /* ── the list: the board's own cards, then the contact list's, then the clock's ── */
  const plan = useMemo(() => {
    /* first run: no query on this book yet, so the list is the getting-started deeds */
    if (empty && aid.drop.length === 0) {
      return startingPlan(gettingStartedRows({ manuscripts, agentCount: agents.length, queryCount: queries.length, versions, activeManuscript }), scopeId);
    }
    const cols = assembleBoardColumns({
      tasks: scopedTasks, userTasks, queries, agents, manuscripts, taskFlags, activities: scopedActivities,
      now: now.getTime(), today: localYMD(now.getTime()), mutedTaskRules: currentUser?.mutedTaskRules,
    }).cols;
    const cards = [...cols.todo, ...cols.today];
    const rows = todoRows({ cards, data: { queries, agents, manuscripts, userTasks, activities: scopedActivities } });
    return dashList({
      rows, cards, queries, scopedQueries, agents, activities: scopedActivities, allActivities: activities,
      userTasks, manuscript: activeManuscript, user: currentUser, now, drop: aid.drop,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedTasks, userTasks, queries, scopedQueries, agents, manuscripts, taskFlags, scopedActivities, activities, activeManuscript, currentUser, now, aid.drop.join(","), empty, versions, scopeId]);

  const [step, setStep] = useState(0);
  const focus = useMemo(() => focusOf(plan, step), [plan, step]);
  useEffect(() => { if (step !== focus.index) setStep(focus.index); }, [step, focus.index]);

  /* ── the feed ── */
  const feed30 = useMemo(
    () => (loading ? [] : feedEntries({ activities: scopedActivities, queries, agents, manuscripts, now, seenAt: null })),
    [loading, scopedActivities, queries, agents, manuscripts, now],
  );
  const today = todayCount(feed30, now);
  const [feedOpen, setFeedOpen] = useState(false);

  const run = (a: ListAction) => {
    if (a.kind === "drawer") openQueryDrawer({ ...a.request });
    else if (a.kind === "agent") openAgentCard(a.agentId, { tab: a.tab, focus: a.focus, from: "hk", sequence: a.sequence });
    else onNavigate(a.tab, a.sub);
  };

  /* ── the page's own scrollport: the height the one screen fills ──
     ⚠️ MEASURED, NEVER `100vh`: the page starts under the top bar. `--d58-chrome` is the rest of
     the window, so the floor below which the page scrolls is a 650px window's scrollport. */
  const rootRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = rootRef.current;
    const port = root?.closest(".ws-wbody") as HTMLElement | null;
    if (!root || !port) return undefined;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const cs = getComputedStyle(port);
      const h = port.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      if (h <= 0) return; // not laid out (another page is on screen): keep the last honest reading
      const set = (k: string, v: number) => { const s = `${Math.round(v)}px`; if (root.style.getPropertyValue(k) !== s) root.style.setProperty(k, s); };
      set("--d58-port-h", h);
      set("--d58-chrome", window.innerHeight - h);
      /* the tab sits a stated distance inside the page SHEET's corner; the page's own box is inset
         from it by the scroller's gutter, so that inset is measured rather than assumed */
      const win = root.closest(".ws-window")?.getBoundingClientRect();
      const box = root.getBoundingClientRect();
      if (win && box.width > 0) set("--d58-inset-r", Math.max(0, win.right - box.right));
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(measure); };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    ro?.observe(port);
    window.addEventListener("resize", schedule);
    return () => { ro?.disconnect(); window.removeEventListener("resize", schedule); if (frame) window.cancelAnimationFrame(frame); };
  }, []);

  /* ── what the loading page should be the shape of: this account's last loaded page ── */
  const [shape] = useState(() => readShape());
  const focusRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (loading) return;
    const h = focusRef.current?.getBoundingClientRect().height ?? 0;
    writeShape({ focusH: h > 0 ? Math.round(h) : shape.focusH, closed: closed && closed.total === 0 ? "none" : "some", today: today > 0 });
  }, [loading, focus.item?.key, closed, today, shape.focusH]);

  const author = (currentUser?.name ?? "").trim();
  const title = (activeManuscript?.title ?? "").trim();

  return (
    <div ref={rootRef} className="os-root d58">
      <DashPopupProvider rootRef={rootRef}>
        <div className="d58-page" data-d58="page" data-loading={loading ? "1" : "0"}>
          <Dash58Header
            loading={loading}
            title={title}
            author={author}
            onLog={() => openQueryDrawer({ mode: "log", ...(scopeId ? { manuscriptId: scopeId } : {}) })}
            onRecord={() => onNavigate("queries", "Record a response")}
            onAddAgent={() => onNavigate("agents", "Add an agent")}
          />
          <div className="d58-body" data-d58="body">
            <div className="d58-left" data-d58="left">
              <div className="d58-active" data-d58="active">
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
                  onSendFirst={() => openQueryDrawer({ mode: "log", ...(scopeId ? { manuscriptId: scopeId } : {}) })}
                />
              </div>
              <Dash58Closed
                loading={loading}
                shape={shape.closed}
                tile={closed}
                qcClosed={qcClosed}
                sentTotal={scopedQueries.length}
                queries={queries}
                agents={agents}
                now={now}
                onSeeAll={() => navigate(queriesPathFor("closed"))}
              />
            </div>
            <Dash58List
              loading={loading}
              focusH={shape.focusH}
              plan={plan}
              focus={focus}
              focusRef={focusRef}
              onStep={setStep}
              onRun={run}
              onAll={() => onNavigate(plan.all.tab, plan.all.sub)}
              onAddAgent={() => onNavigate("agents", "Add an agent")}
            />
          </div>
        </div>
        <div className="d58-dock">
          <FeedTab open={feedOpen} today={loading ? (shape.today ? -1 : 0) : today} onOpen={() => setFeedOpen(true)} />
        </div>
      </DashPopupProvider>
      {feedOpen && (
        <Dash58Feed
          title={title}
          activities={scopedActivities}
          queries={queries}
          scopedQueries={scopedQueries}
          agents={agents}
          manuscripts={manuscripts}
          now={now}
          onClose={() => setFeedOpen(false)}
          onAct={(queryId, mode) => {
            /* the drawer closes first: one asking surface at a time, and the flow is not behind it */
            setFeedOpen(false);
            openQueryDrawer(mode === "offer" ? { mode, queryId, preset: { step: 1 } } : { mode, queryId });
          }}
        />
      )}
    </div>
  );
};
