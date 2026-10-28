/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE PHONE DASHBOARD (Dashboard on the phone v1; ref design-refs/dashboard-mobile-v1/). Below 768px only —
 * `Dashboard` renders this in place of `Dash58` when `useIsMobile()` says so, and at 768px and wider nothing
 * here mounts, so the desktop is the same page it was.
 *
 * Order: the top bar → the stat cards → Up next → the founding writer row → Recent.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Activity, Agent, Manuscript, ManuscriptVersion, Query, SmartImportUsage, Task, TaskFlag, User, UserTask } from "../../../types";
import { openQueryDrawer } from "../../../lib/queryActions/drawerStore";
import { PhoneSearch, PhoneTopBar, type PhoneActions } from "./PhoneTopBar";
import { PhoneStats } from "./PhoneStats";
import { PhoneUpNext } from "./PhoneUpNext";
import { scopeActivities, scopeQueries, scopeTasks } from "../../../lib/manuscriptScope";
import { assembleBoardColumns } from "../../../lib/todoColumns";
import { todoRows } from "../../../lib/dashTodo";
import { dashList, startingPlan, type ListAction } from "../../../lib/dashList";
import { buildQcRows } from "../../../lib/qcSummary";
import type { TaskCtx } from "../../../lib/dashTaskCard";
import { gettingStartedRows } from "../../../lib/dashEmpty";
import { isPreQuery } from "../../../lib/dashFirstUse";
import { openQueryPanel } from "../../../lib/queryPanelStore";
import { openAgentCard } from "../../../lib/agentCardStore";
import { dashAid } from "../../../lib/dashReviewAid";
import { closedTile } from "../../../lib/dashClosed";
import { agentCoverage } from "../../../lib/dashFirstUse";
import { localYMD } from "../../../lib/shellSidebar";
import { activeCard, agentsCard, closedCard, queriesForIds, withAgentsCard } from "../../../lib/dashPhone";
import "./dashPhone.css";

export interface DashPhoneProps {
  loading: boolean;
  queries: Query[];
  agents: Agent[];
  manuscripts: Manuscript[];
  tasks: Task[];
  userTasks: UserTask[];
  activities: Activity[];
  taskFlags: TaskFlag[];
  currentUser: User | null;
  activeManuscript: Manuscript | null;
  versions?: ManuscriptVersion[];
  smartImportUsage?: SmartImportUsage | null;
  onNavigate: (tab: string, subPageName?: string) => void;
  setSearchQuery?: (q: string) => void;
}

/** The body class that dresses the shell's FeedbackDock as this page's bottom sheet, while this page is mounted. */
export const PHONE_BODY_CLASS = "dm1-on";

export const DashPhone: React.FC<DashPhoneProps> = (props) => {
  const { loading, queries, agents, manuscripts, activeManuscript, onNavigate, setSearchQuery } = props;
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const scopeId = activeManuscript?.id ?? null;
  /* one clock per mount, as Dash58's */
  const [now] = useState(() => new Date());

  /* ── the figures: the same calls Dash58 makes, arranged by lib/dashPhone ── */
  const scopedQueries = useMemo(() => scopeQueries(queries, scopeId), [queries, scopeId]);
  const scopedActivities = useMemo(() => scopeActivities(props.activities, scopeId), [props.activities, scopeId]);
  const active = useMemo(() => activeCard(scopedQueries, now), [scopedQueries, now]);
  const withAgents = useMemo(() => withAgentsCard(scopedQueries), [scopedQueries]);
  const closed = useMemo(() => (loading ? null : closedCard(closedTile(scopedQueries, scopedActivities))), [loading, scopedQueries, scopedActivities]);
  const cov = useMemo(
    () => agentCoverage({ agents, queries, manuscript: activeManuscript, now, todayIso: localYMD(now.getTime()) }),
    [agents, queries, activeManuscript, now],
  );
  const agentsFig = useMemo(() => agentsCard(cov), [cov]);

  /* ── Up next: Dash58's own list, built the same way (the board's cards, then the contact list's, then the clock's) ── */
  const { tasks, userTasks, taskFlags, currentUser, versions = [] } = props;
  const msIds = useMemo(() => new Set(manuscripts.map((m) => m.id)), [manuscripts]);
  const scopedTasks = useMemo(() => scopeTasks(tasks, queries, msIds, scopeId), [tasks, queries, msIds, scopeId]);
  const empty = isPreQuery(scopedQueries);
  /* the desktop's dev-only review aid (`__SA_DASH_DROP`), read behind the same call-site MODE gate Dash58 uses, so a
     production build carries none of it; the locks use it to put each task kind first */
  const drop = import.meta.env.MODE !== "production" ? dashAid().drop : [];
  const plan = useMemo(() => {
    if (empty && drop.length === 0) {
      return startingPlan(gettingStartedRows({ manuscripts, agentCount: agents.length, queryCount: queries.length, versions, activeManuscript }), scopeId);
    }
    const cols = assembleBoardColumns({
      tasks: scopedTasks, userTasks, queries, agents, manuscripts, taskFlags, activities: scopedActivities,
      now: now.getTime(), today: localYMD(now.getTime()), mutedTaskRules: currentUser?.mutedTaskRules,
    }).cols;
    const cards = [...cols.todo, ...cols.today];
    const rows = todoRows({ cards, data: { queries, agents, manuscripts, userTasks, activities: scopedActivities } });
    return dashList({
      rows, cards, queries, scopedQueries, agents, activities: scopedActivities, allActivities: props.activities,
      userTasks, manuscript: activeManuscript, user: currentUser, now, drop,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedTasks, userTasks, queries, scopedQueries, agents, manuscripts, taskFlags, scopedActivities, props.activities, activeManuscript, currentUser, now, empty, versions, scopeId, drop.join(",")]);
  const taskCtx = useMemo<TaskCtx>(
    () => ({ queries, agents, qcRows: buildQcRows(scopedQueries, agents, scopedActivities, now.getTime()), nowMs: now.getTime() }),
    [queries, agents, scopedQueries, scopedActivities, now],
  );
  /* ⚠️ "View task" NEVER COMPLETES A TASK — Dash58's own viewTask: a query's task opens that query in the query panel,
     where its next step is offered; anything else opens its own flow or page. */
  const viewTask = (a: ListAction) => {
    const qid = a.kind === "drawer" && a.request.mode !== "log" ? a.request.queryId : undefined;
    if (qid) openQueryPanel(qid, "dashboard");
    else if (a.kind === "drawer") openQueryDrawer({ ...a.request });
    else if (a.kind === "agent") openAgentCard(a.agentId, { tab: a.tab, focus: a.focus, from: "hk", sequence: a.sequence });
    else onNavigate(a.tab, a.sub);
  };

  /* the hairline under the bar arrives once the page's own scroller has moved */
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const port = rootRef.current?.closest(".ws-wbody") as HTMLElement | null;
    if (!port) return undefined;
    let frame = 0;
    const read = () => { frame = 0; setScrolled(port.scrollTop > 0); };
    const on = () => { if (!frame) frame = requestAnimationFrame(read); };
    read();
    port.addEventListener("scroll", on, { passive: true });
    return () => { port.removeEventListener("scroll", on); cancelAnimationFrame(frame); };
  }, []);

  /* the FeedbackDock's phone sheet and its scrim read this class; it comes off with the page */
  useEffect(() => {
    document.body.classList.add(PHONE_BODY_CLASS);
    return () => document.body.classList.remove(PHONE_BODY_CLASS);
  }, []);

  const [searchOpen, setSearchOpen] = useState(false);
  const searchBtn = useRef<HTMLElement | null>(null);
  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    requestAnimationFrame(() => (rootRef.current?.querySelector<HTMLElement>('[data-dm1="search-btn"]'))?.focus({ preventScroll: true }));
  }, []);

  /* the desktop header's own three handlers (Dash58Header's onLog / onRecord / onAddAgent) */
  const actions: PhoneActions = {
    onLog: () => openQueryDrawer({ mode: "log", ...(scopeId ? { manuscriptId: scopeId } : {}) }),
    onRecord: () => onNavigate("queries", "Record a response"),
    onAddAgent: () => onNavigate("agents", "Add an agent"),
  };

  return (
    <div ref={rootRef} className="dm1" data-dm1="page" data-loading={loading ? "1" : "0"}>
      <PhoneTopBar
        onNavigate={onNavigate}
        onPickedManuscript={() => navigate("/dashboard", { replace: true })}
        onSearch={() => { searchBtn.current = document.activeElement as HTMLElement; setSearchOpen(true); }}
        actions={actions}
        scrolled={scrolled}
      />
      <div className="dm1-body" data-dm1="body">
        {/* each card opens exactly its own queries (lib/dashPhone's `queriesForIds`). ⚠️ The Contact list takes no
            status from the URL, so Agents opens it whole (the report says so). */}
        <PhoneStats
          loading={loading}
          active={active} withAgents={withAgents} closed={closed} agents={agentsFig}
          onActive={() => navigate(queriesForIds(active.ids))}
          onWithAgents={() => navigate(queriesForIds(withAgents.ids))}
          onClosed={() => navigate(queriesForIds(closed?.ids ?? []))}
          onAgents={() => onNavigate("agents")}
        />
        <PhoneUpNext loading={loading} plan={plan} ctx={taskCtx} onView={viewTask} onSeeAll={() => onNavigate("todo")} />
      </div>
      {searchOpen && (
        <PhoneSearch
          agents={agents} queries={queries} manuscripts={manuscripts}
          onClose={closeSearch}
          onOpenQuery={(id) => onNavigate("queries", id)}
          onOpenAgent={(name) => { setSearchQuery?.(name); navigate("/agents"); }}
        />
      )}
      {/* the FeedbackDock has no backdrop of its own; on this page its sheet sits over this scrim (CSS shows it
          only while the dock is open), and a tap on the scrim closes the dock the way Escape does */}
      <div
        className="dm1-scrim" data-dm1="scrim" aria-hidden="true"
        onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))}
      />
    </div>
  );
};
