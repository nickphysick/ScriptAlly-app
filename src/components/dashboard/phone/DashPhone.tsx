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
import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import type { Activity, Agent, Manuscript, ManuscriptVersion, Query, SmartImportUsage, Task, TaskFlag, User, UserTask } from "../../../types";
import { openQueryDrawer } from "../../../lib/queryActions/drawerStore";
import { PhoneSearch, type PhoneActions } from "./PhoneTopBar";
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
import { FoundingCard, HomeHero, UpNextCard, WhereTheyStand, type StandKey } from "./PhoneHome";
import { ActivityPage, HomeActivity } from "./PhoneActivity";
import { closedSplit, heroFor, readHero, writeHero, type HeroRange, type HeroSeries } from "../../../lib/phoneHome";
import { chipCounts, phoneScopeId, rowsFor } from "../../../lib/queriesPhone";
import { usePhoneBandSlot } from "../../phone/phoneBandStore";
import { GettingStartedCard, HeroFirstRun, StandExample } from "./HomeFirstRun";
import { taskCardModel } from "../../../lib/dashTaskCard";
import { CAUGHT_UP } from "../v71/Dash71Task";
import { useFoundingStats, TIERS } from "../../../lib/foundingStats";
import { foundingRow } from "../../../lib/dashPhone";
import { Dash105How } from "../v105/Dash105How";
import "./phoneHome.css";
import { feedEntries } from "../../../lib/dashFeed";
import { openFeedback } from "../../../lib/feedbackStore";
import { closedTile } from "../../../lib/dashClosed";
import { agentCoverage } from "../../../lib/dashFirstUse";
import { localYMD } from "../../../lib/shellSidebar";
import "./dashPhone.css";
import { CheckRow, checkLine, useTodoDoors, useTodoPhoneModel } from "../../todo/phone/useTodoPhone";
import { PI } from "../../phone/phoneIcons";

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
  /* ── the hero (Phone app v2, Part 2): the dashboard chart's own ledger, the switch remembered per device ── */
  const [heroPick, setHeroPick] = useState(() => readHero());
  const pickHero = (v: { series: HeroSeries; range: HeroRange }) => { setHeroPick(v); writeHero(v); };
  const hero = useMemo(() => heroFor(scopedQueries, now, heroPick.series, heroPick.range), [scopedQueries, now, heroPick]);
  /* Part 8A: before the first query the hero is drawn faded behind the first-query call (FRH C) */
  const firstRun = isPreQuery(scopedQueries) && !loading;
  const heroNode = (
    <HomeHero hero={hero} series={heroPick.series} range={heroPick.range}
      onSeries={(series) => pickHero({ ...heroPick, series })} onRange={(range) => pickHero({ ...heroPick, range })}
      onOpen={() => navigate("/queries")} />
  );
  usePhoneBandSlot("/dashboard", firstRun
    ? <HeroFirstRun hero={heroNode} onLog={() => openQueryDrawer({ mode: "log", ...(scopeId ? { manuscriptId: scopeId } : {}) })} onImport={() => navigate("/import")} />
    : heroNode, [hero, heroPick, firstRun, scopeId]);

  /* ── Where they stand: the Queries tab's own chip counts (whereItStands), on the book the Queries tab is scoped to ── */
  const standScope = useMemo(() => {
    let stored: string | null = null;
    try { stored = window.localStorage.getItem("scriptally_active_manuscript_id"); } catch { /* storage refused */ }
    return phoneScopeId(manuscripts, stored);
  }, [manuscripts]);
  const standRows = useMemo(() => {
    const all = buildQcRows(queries, agents, props.activities, now.getTime());
    return standScope ? all.filter((r) => r.manuscriptId === standScope) : all;
  }, [queries, agents, props.activities, now, standScope]);
  const stand = useMemo(() => chipCounts(standRows, now.getTime()), [standRows, now]);
  const split = useMemo(() => closedSplit(rowsFor(standRows, "closed", now.getTime()).map((r) => r.status)), [standRows, now]);
  const goChip = (k: StandKey | "closed") => navigate(`/queries?chip=${k}`);

  /* ── Up next: Dash58's own list, built the same way (the board's cards, then the contact list's, then the clock's) ── */
  const { tasks, userTasks, taskFlags, currentUser, versions = [] } = props;
  const msIds = useMemo(() => new Set(manuscripts.map((m) => m.id)), [manuscripts]);
  const scopedTasks = useMemo(() => scopeTasks(tasks, queries, msIds, scopeId), [tasks, queries, msIds, scopeId]);
  const empty = isPreQuery(scopedQueries);
  /* the desktop's dev-only review aid (`__SA_DASH_DROP`), read behind the same call-site MODE gate Dash58 uses, so a
     production build carries none of it; the locks use it to put each task kind first */
  const drop = import.meta.env.MODE !== "production" ? dashAid().drop : [];
  const gsRows = useMemo(() => gettingStartedRows({ manuscripts, agentCount: agents.length, queryCount: queries.length, versions, activeManuscript }),
    [manuscripts, agents.length, queries.length, versions, activeManuscript]);
  const plan = useMemo(() => {
    if (empty && drop.length === 0) {
      return startingPlan(gsRows, scopeId);
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
  /* ── Activity (Phone round two v1, 2A): the desktop feed's own entries, arranged by the desktop drawer's own model
     (PhoneActivity). `/dashboard?activity=1` is its page, so the back gesture closes it. ── */
  const feedList = useMemo(
    /* honestDates, as the desktop passes it: a send is dated by its sent date. Without it the phone ordered the same
       events differently from the desktop feed whenever a query was logged after it was sent. */
    () => (loading ? [] : feedEntries({ activities: scopedActivities, queries, agents, manuscripts, now, seenAt: null, honestDates: true })),
    [loading, scopedActivities, queries, agents, manuscripts, now],
  );
  const location = useLocation();
  const activityOpen = new URLSearchParams(location.search).get("activity") === "1";
  const openActivity = () => navigate({ pathname: "/dashboard", search: "?activity=1" }, { state: { pr2Act: true } });
  const closeActivity = () => {
    if ((location.state as { pr2Act?: boolean } | null)?.pr2Act) { navigate(-1); return; }
    navigate({ pathname: "/dashboard", search: "" }, { replace: true });
  };
  const actOnFeed = (queryId: string, mode: "offer" | "sent") =>
    openQueryDrawer(mode === "offer" ? { mode, queryId, preset: { step: 1 } } : { mode, queryId });

  /* ⚠️ "View task" NEVER COMPLETES A TASK — Dash58's own viewTask: a query's task opens that query in the query panel,
     where its next step is offered; anything else opens its own flow or page. */
  const viewTask = (a: ListAction) => {
    const qid = a.kind === "drawer" && a.request.mode !== "log" ? a.request.queryId : undefined;
    if (qid) openQueryPanel(qid, "dashboard");
    else if (a.kind === "drawer") openQueryDrawer({ ...a.request });
    else if (a.kind === "agent") openAgentCard(a.agentId, { tab: a.tab, focus: a.focus, from: "hk", sequence: a.sequence });
    else onNavigate(a.tab, a.sub);
  };

  /* the founding writer card: the founding stats the desktop card reads (rank, and how far to the next) */
  const { loading: fLoading, stats } = useFoundingStats(currentUser?.id ?? null);
  const fRow = foundingRow(stats);
  const fNext = stats.nextTier ? TIERS.find((t) => t.key === stats.nextTier) ?? null : null;
  const fHave = Math.max(0, Math.floor(stats.contributions || 0));
  const fProgress = fNext && stats.toNext != null ? `${fHave} of ${fHave + stats.toNext} to ${fNext.name}` : "Top rank";
  const fPct = fNext && stats.toNext != null ? fHave / Math.max(1, fHave + stats.toNext) : 1;
  const [howOpen, setHowOpen] = useState(false);
  const upHero = useMemo(() => {
    const labelOf = new Map<string, string>();
    for (const g of plan.groups) for (const it of g.items) labelOf.set(it.key, g.label);
    const it = plan.items[0];
    return it ? { it, m: taskCardModel(it, labelOf.get(it.key) ?? "", taskCtx) } : null;
  }, [plan, taskCtx]);

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
    <div ref={rootRef} className="dm1 pa-home" data-dm1="page" data-pa="home" data-loading={loading ? "1" : "0"}>
      {/* Phone app v2 (Part 1C): the page's own top bar (PhoneTopBar) gives way to the shell's navy band, which carries
          the greeting, the book chip, search, feedback and the menu; the + is the tab bar's. Part 2 rebuilds this body. */}
      <div className="dm1-body" data-dm1="body">
        {firstRun ? (
          <>
            <StandExample />
            <GettingStartedCard rows={gsRows} items={plan.items} onAct={viewTask} />
          </>
        ) : <>
        <WhereTheyStand counts={stand} passed={split.passed} noReply={split.noReply} onChip={goChip} />
        <UpNextCard
          loading={loading} total={plan.items.length} dataKey={upHero?.it.key}
          title={upHero ? <>{upHero.m.pre}{upHero.m.who}{upHero.m.post}</> : null}
          line={upHero?.m.line ?? null} caughtUp={CAUGHT_UP}
          onView={() => upHero && viewTask(upHero.it.action)} onSeeAll={() => onNavigate("todo")} />
        <HomeTodo onSeeAll={() => navigate("/todo")} />
        <HomeActivity entries={feedList} qcRows={taskCtx.qcRows} nowMs={now.getTime()} onAct={actOnFeed} onSeeAll={openActivity} />
        </>}
        <FoundingCard name={currentUser?.name ?? ""} rank={fRow.rank} progress={fProgress} pct={fPct} loading={fLoading}
          onFeedback={() => openFeedback()} onHow={() => setHowOpen(true)} />
      </div>
      <Dash105How open={howOpen} onClose={() => setHowOpen(false)} />
      <ActivityPage open={activityOpen} book={(activeManuscript?.title ?? "").trim()} entries={feedList} qcRows={taskCtx.qcRows} nowMs={now.getTime()}
        onAct={(q, m) => { actOnFeed(q, m); }} onBack={closeActivity} />
      {/* ⚠️ PORTALLED: a fixed child cannot rise out of the shell's stacking context, and the window's edge shading painted
          over the sheet's right edge. Under <body>, in the token-carrying `.dm1-layer` host, it covers the whole screen. */}
      {searchOpen && createPortal(
        <div className="dm1-layer">
        <PhoneSearch
          agents={agents} queries={queries} manuscripts={manuscripts}
          onClose={closeSearch}
          onOpenQuery={(id) => onNavigate("queries", id)}
          onOpenAgent={(name) => { setSearchQuery?.(name); navigate("/agents"); }}
        />
        </div>,
        document.body,
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

/* ── Phone round two v1 (2B, ref boot3 `n2`): To-do left the tab bar, so Home lists what is due — up to four of the
   tasks from earlier and today, as checklist rows, with "See all {n}" opening the To-do page. The model and the doors are
   the To-do page's own (useTodoPhone), so the two cannot disagree. ── */
export const HOME_TODO_MAX = 4;
const HomeTodo: React.FC<{ onSeeAll: () => void }> = ({ onSeeAll }) => {
  const [now] = useState(() => Date.now());
  const model = useTodoPhoneModel(now);
  const { act, openRow, askNode } = useTodoDoors(model, true);
  const due = model.items.filter((i) => { const w = model.whenOf(i); return w === "earlier" || w === "today"; })
    .sort((a, b) => ((model.dayOf.get(a.key) ?? "9") < (model.dayOf.get(b.key) ?? "9") ? -1 : 1));
  return (
    <>
      <div className="pa-shd" data-pa="home-todo-head"><h2 className="pa-h2">To-do</h2>
        <button type="button" className="pa-link" data-pa="home-todo-all" onClick={onSeeAll}>See all {model.items.length}</button></div>
      {due.length ? (
        <div className="pa-card pa-todocard" data-pa="home-todo" data-count={due.length}>
          {due.slice(0, HOME_TODO_MAX).map((i) => (
            <CheckRow key={i.key} i={i} line={checkLine(i, model.dayOf.get(i.key) ?? null, model.today)} chev={<span className="pa-chev">{PI.chev}</span>}
              onTick={() => act(i)} onOpen={() => openRow(i)} />
          ))}
        </div>
      ) : <p className="pa-sub" data-pa="home-todo-none" style={{ margin: "0 2px" }}>Nothing due today.</p>}
      {askNode}
    </>
  );
};
