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
import { liveCount, undatedLiveCount } from "../../../lib/dashBreakdown";
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
import { MONTHS_SHORT } from "../../../lib/dates";
import { readImportNotice, clearImportNotice, onImportNoticeChange, noticeHeadline, noticeWhy, noticeToggle, NOTICE_DISMISS, type ImportNotice } from "../../../lib/importNotice";
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

/** "14 Mar 2026" from an ISO date, read as written (no timezone arithmetic). */
const noticeDate = (iso: string | null): string => {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  return m ? `${Number(m[3])} ${MONTHS_SHORT[Number(m[2]) - 1] ?? ""} ${m[1]}` : "Undated";
};

/**
 * THE SKIPPED-ROWS LINE (onboarding v5 part 2; ref design-refs/import-flow-v1).
 *
 * An import that skipped rows says so here, once, with the rows behind it, until it is dismissed.
 * It appears only after such an import: no notice, no row, and no space kept for one.
 *
 * ⚠️ IT TAKES ITS HEIGHT FROM THE CHART, WHICH ALREADY GIVES WAY. It is one more fixed-height row
 * above the header in the page's column, so with the list closed the page is still one screen.
 * Opening the list is the one thing that may make the page scroll: the page grows by the list's
 * own measured height, and nothing else on it changes size.
 */
const ImportNoticeRow: React.FC<{ notice: ImportNotice; onDismiss: () => void; onListHeight: (h: number) => void }> = ({ notice, onDismiss, onListHeight }) => {
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  useLayoutEffect(() => {
    /* its own box and the gap above it: everything opening it adds to the row */
    const el = open ? listRef.current : null;
    onListHeight(el ? el.offsetHeight + (parseFloat(getComputedStyle(el).marginTop) || 0) : 0);
    return () => onListHeight(0);
  }, [open, onListHeight, notice]);
  const why = noticeWhy(notice);
  return (
    <div className="d58-notice" role="status" data-d58="notice">
      <div className="d58-noticeline">
        <p className="d58-noticetext"><b>{noticeHeadline(notice.count)}</b>{why ? ` ${why}` : ""}</p>
        <span className="d58-noticeacts">
          {notice.rows.length > 0 && (
            <button type="button" className="d58-noticebtn" aria-expanded={open} onClick={() => setOpen((o) => !o)} data-d58="notice-toggle">
              {noticeToggle(notice.count, open)}
            </button>
          )}
          <button type="button" className="d58-noticebtn" onClick={onDismiss} data-d58="notice-dismiss">{NOTICE_DISMISS}</button>
        </span>
      </div>
      {open && (
        <ul className="d58-noticelist" ref={listRef} data-d58="notice-list">
          {notice.rows.map((r, i) => (
            <li key={i} data-d58="notice-row">
              <span>{[r.who, r.status, noticeDate(r.sentDate)].filter(Boolean).join(" · ")}</span>
              <small>{r.reason}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

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

  /* ── the skipped-rows line: read for this account, and read again whenever it changes ──
     This page stays mounted while the writer is on the Import page, so reading once showed the
     notice it found on arrival (or none) after an import made there, until a reload. */
  const uid = currentUser?.id ?? "";
  const [notice, setNotice] = useState<ImportNotice | null>(null);
  useEffect(() => {
    if (!uid) return;
    setNotice(readImportNotice(uid));
    return onImportNoticeChange(() => setNotice(readImportNotice(uid)));
  }, [uid]);
  const [noticeListH, setNoticeListH] = useState(0);
  const dismissNotice = () => { clearImportNotice(uid); setNotice(null); setNoticeListH(0); };

  const author = (currentUser?.name ?? "").trim();
  const title = (activeManuscript?.title ?? "").trim();

  return (
    <div ref={rootRef} className="os-root d58" style={noticeListH > 0 ? ({ ["--d58-notice-list-h" as string]: `${noticeListH}px` } as React.CSSProperties) : undefined}>
      <DashPopupProvider rootRef={rootRef}>
        <div className="d58-page" data-d58="page" data-loading={loading ? "1" : "0"}>
          {notice && <ImportNoticeRow notice={notice} onDismiss={dismissNotice} onListHeight={setNoticeListH} />}
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
                  undatedCount={loading ? 0 : undatedLiveCount(scopedQueries)}
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
