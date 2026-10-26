/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v58 — one screen (ref design-refs/dashboard/dashboard-v58.html).
 *
 * The header is the book being queried. Down the left, the active-queries chart over the Closed and
 * Agents on file hoop cards (v60). Down the right (v71), the task card, which cycles through the
 * plan's items, over the founding writer card. The activity feed is a drawer behind a folder tab.
 *
 * ⚠️ NOTHING HERE WRITES A STATUS. Every action opens the flow that does: the query drawer
 * (`openQueryDrawer`), the agent card, or a route.
 */
import { claimRightPanel, openQueryPanel, releaseRightPanel, subscribeRightPanel } from "../../../lib/queryPanelStore";
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import type { Activity, Agent, Manuscript, ManuscriptVersion, Query, SmartImportUsage, Task, TaskFlag, User, UserTask } from "../../../types";
import { scopeActivities, scopeQueries, scopeTasks } from "../../../lib/manuscriptScope";
import { localYMD } from "../../../lib/shellSidebar";
import { liveCount, undatedLiveCount } from "../../../lib/dashBreakdown";
import { closedTile } from "../../../lib/dashClosed";
import { assembleBoardColumns } from "../../../lib/todoColumns";
import { todoRows } from "../../../lib/dashTodo";
import { dashList, startingPlan, type ListAction } from "../../../lib/dashList";
import { buildQcRows } from "../../../lib/qcSummary";
import type { TaskCtx } from "../../../lib/dashTaskCard";
import { gettingStartedRows } from "../../../lib/dashEmpty";
import { feedEntries } from "../../../lib/dashFeed";
import { todayCount } from "../../../lib/dashFeedDrawer";
import { readFeedSeen, unseenCount, writeFeedSeen } from "../../../lib/dashFeedSeen";
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
import { Dash71Right } from "../v71/Dash71Right";
import { Dash71Task } from "../v71/Dash71Task";
import { Dash58Feed, FeedTab } from "./Dash58Feed";
import { Dash93Founding } from "../v93/Dash93Founding";
import { agentCoverage, firstUseTiles, isPreQuery, type TileKey } from "../../../lib/dashFirstUse";
import { QueriesDoor, AgentsDoor, AgentsSnap, ClosedHoop, AgentsHoop } from "../v60/Dash60Left";
import { Dash60Lift } from "../v60/Dash60Lift";
import { SpotProvider, WhereStart } from "../v60/WhereStart";
import type { StartKey } from "../../../lib/dashFirstUse";
import { switcherStanding } from "../../../lib/manuscriptStanding";
import { openNewAgentCard } from "../../../lib/agentCardStore";
import "../oneScreen.css";
import "./dash58.css";
import "../v59/dash59.css";
/* ⚠️ LAST: the bundle orders sheets by first import, and v60's rules win ties against v58's and v59's */
import "../v60/dash60.css";
/* ⚠️ AND v71 LAST OF ALL: its rules win ties against v58–v60's */
import "../v71/dash71.css";
/* ⚠️ AND v77 AFTER IT */
import "../v77/dash77.css";
import "../v93/dash93.css";

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
  /** v60: the "Import your journey" tile reads the entitlement from it */
  smartImportUsage?: SmartImportUsage | null;
}

const NO_AID: DashAid = { drop: [], noClosed: false, noAgents: false };
const NO_AGENTS: Agent[] = [];

/** The hawk's shadow, cast across the sheet (v59). The same versioned file the other pages place. */
export const DASH_SHADOW = { src: "/images/hawk-shadow.png", version: 1 };

/** The first paint's whole length: the end dot finishes at 900 + 300 = 1200ms; a little after. */
export const PAINT_MS = 1400;


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
  loading: dataLoading, queries, agents: agentsIn, manuscripts, tasks, userTasks, activities, taskFlags, currentUser,
  activeManuscript, onNavigate, now: nowProp, versions = [], smartImportUsage = null,
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
  /* v60: the dev aid's "no agents" hands the page none (the day-one state); production never reads it */
  const agents = aid.noAgents ? NO_AGENTS : agentsIn;

  const scopeId = activeManuscript?.id ?? null;
  const msIds = useMemo(() => new Set(manuscripts.map((m) => m.id)), [manuscripts]);
  const scopedQueries = useMemo(() => scopeQueries(queries, scopeId), [queries, scopeId]);
  const scopedActivities = useMemo(() => scopeActivities(activities, scopeId), [activities, scopeId]);
  const scopedTasks = useMemo(() => scopeTasks(tasks, queries, msIds, scopeId), [tasks, queries, msIds, scopeId]);
  /* ⚠️ THE ONE PRE-QUERY PREDICATE (v60): the chart's empty state AND both columns' first-use swap
     read this one value, so they cannot disagree. Data, never a flag. */
  const empty = isPreQuery(scopedQueries);

  /* ── the left column ── */
  const activeCount = loading ? null : liveCount(scopedQueries);
  const closed = useMemo(() => {
    if (loading) return null;
    return closedTile(aid.noClosed ? [] : scopedQueries, scopedActivities);
  }, [loading, scopedQueries, scopedActivities, aid.noClosed]);

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

  /* v71: the task card reads the Query Centre's own rows for the dates it draws */
  const taskCtx = useMemo<TaskCtx>(
    () => ({ queries, agents, qcRows: buildQcRows(scopedQueries, agents, scopedActivities, now.getTime()), nowMs: now.getTime() }),
    [queries, agents, scopedQueries, scopedActivities, now],
  );

  /* ── the feed ── */
  const feed30 = useMemo(
    () => (loading ? [] : feedEntries({ activities: scopedActivities, queries, agents, manuscripts, now, seenAt: null })),
    [loading, scopedActivities, queries, agents, manuscripts, now],
  );
  const today = todayCount(feed30, now);
  const [feedOpen, setFeedOpen] = useState(false);
  /* v59: the tab's unseen badge — entries newer than this account last opened the drawer */
  const feedUid = currentUser?.id ?? "";
  const [feedSeenAt, setFeedSeenAt] = useState<number | null>(() => readFeedSeen(feedUid));
  useEffect(() => { setFeedSeenAt(readFeedSeen(feedUid)); }, [feedUid]);
  const unseen = loading ? 0 : unseenCount(feed30, feedSeenAt, now);
  const lastUnseen = useRef<number | null>(null);
  const [bump, setBump] = useState(false);
  useEffect(() => {
    if (loading) return undefined;
    const prev = lastUnseen.current;
    lastUnseen.current = unseen;
    if (prev === null || unseen <= prev) return undefined;
    setBump(true);
    const t = window.setTimeout(() => setBump(false), 260);
    return () => window.clearTimeout(t);
  }, [unseen, loading]);
  const openFeed = () => {
    const at = Date.now();
    writeFeedSeen(feedUid, at);
    setFeedSeenAt(at);
    setFeedOpen(true);
  };
  /* Query panel v1 — one right-hand panel at a time: the feed says when it opens, and closes when a query does */
  useEffect(() => {
    if (!feedOpen) return undefined;
    claimRightPanel("feed");
    const off = subscribeRightPanel((o) => { if (o && o !== "feed") setFeedOpen(false); });
    return () => { off(); releaseRightPanel("feed"); };
  }, [feedOpen]);

  const run = (a: ListAction) => {
    if (a.kind === "drawer") openQueryDrawer({ ...a.request });
    else if (a.kind === "agent") openAgentCard(a.agentId, { tab: a.tab, focus: a.focus, from: "hk", sequence: a.sequence });
    else onNavigate(a.tab, a.sub);
  };
  /* ⚠️ "VIEW TASK →" NEVER COMPLETES A TASK (v59). It opens the place where the task is done
     properly: a query's task opens that query in the query panel (as the chart does), where the
     task's step is offered with its fields; housekeeping opens the agent card's editor; a ready agent
     opens the log flow prefilled; a first-run step opens its own flow or page. */
  const viewTask = (a: ListAction) => {
    const qid = a.kind === "drawer" && a.request.mode !== "log" ? a.request.queryId : undefined;
    if (qid) openQueryPanel(qid, "dashboard");
    else run(a);
  };

  /* ── the founding writer card (v93): "Your contributions" — the writer's level, read live from their own
     `foundingStats` doc. Feedback itself is given in the sidebar's Give feedback (FeedbackDock). */
  const fwUid = currentUser?.id ?? null;

  /* ── the page's own scrollport: the height the one screen fills ──
     ⚠️ MEASURED, NEVER `100vh`: the page starts under the top bar. `--d58-chrome` is the rest of
     the window, so the floor below which the page scrolls is a 650px window's scrollport. */
  const rootRef = useRef<HTMLDivElement>(null);
  /* v59: the page SHEET (`.ws-window`) — the folder tab and the hawk's shadow are placed in it, not in
     the page, so neither moves with the page's content. `r` is the page's side gutter (the header
     buttons' right edge, measured). */
  const [sheet, setSheet] = useState<{ el: HTMLElement; r: number } | null>(null);
  const onDash = useLocation().pathname === "/dashboard";
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
      const winEl = root.closest(".ws-window") as HTMLElement | null;
      const win = winEl?.getBoundingClientRect();
      const box = root.getBoundingClientRect();
      if (win && box.width > 0) set("--d58-inset-r", Math.max(0, win.right - box.right));
      /* v59: the folder tab sits on the SHEET's bottom edge, so the page's foot is measured from the
         sheet: what lies between the page's content box and the sheet's bottom is subtracted from the
         room the tab needs (34 + 22). */
      if (win) {
        const pr = port.getBoundingClientRect();
        set("--d58-inset-b", Math.max(0, win.bottom - pr.bottom) + (parseFloat(cs.paddingBottom) || 0));
        const btns = root.querySelector('[data-d58="buttons"]')?.getBoundingClientRect();
        if (btns && btns.width > 0) setSheet((o) => {
          const r = Math.round(win.right - btns.right);
          return o && o.el === winEl && o.r === r ? o : { el: winEl!, r };
        });
      }
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(measure); };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    ro?.observe(port);
    window.addEventListener("resize", schedule);
    return () => { ro?.disconnect(); window.removeEventListener("resize", schedule); if (frame) window.cancelAnimationFrame(frame); };
  }, []);

  const hoopNeedRef = useRef(0);
  /* ── v60: the left column's floor in the querying state — what the two hoop cards need ──
     ⚠️ RESTORED IN DASHBOARD v71 PART E: retiring it with v60's grid was wrong — v71's `1.72fr 1fr` cut the
     Closed legend at 1440×900 and the Agents legend at 1100×800 (DB71 G1). It now feeds v71's grid.
     Each card's width, less its legend's box, plus the legend's NATURAL width (a Range over each row,
     which is the text's own width whatever the column does — so this cannot feed back on itself). */
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const measure = () => {
      /* while loading, the floor is the one the last loaded page measured: the hoops' figures (and
         "+n this week") are not known yet, and a narrower column would jump when they land */
      if (loading) {
        const v = shape.hoopNeed > 0 ? `${shape.hoopNeed}px` : "";
        if (root.style.getPropertyValue("--d60-hoop-need") !== v) { if (v) root.style.setProperty("--d60-hoop-need", v); else root.style.removeProperty("--d60-hoop-need"); }
        return;
      }
      let need = 0;
      const width = (el: Element) => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().width; };
      for (const card of root.querySelectorAll<HTMLElement>(".d60-hoopcard")) {
        const hl = card.querySelector<HTMLElement>(".d60-hl");
        const row = card.querySelector<HTMLElement>(".os-bandrow");
        if (!hl || card.offsetWidth <= 0) continue;
        /* ⚠️ READ UNWRAPPED: a cramped card wraps its labels (the container query), and a wrapped width
           read back as the need would hold the column at the cramped size for ever. `nowrap` for the
           instant of the read, in a layout effect, so nothing is painted that way. */
        const lis = [...hl.querySelectorAll<HTMLElement>("li, .d60-ready")];
        for (const li of lis) li.style.whiteSpace = "nowrap";
        let natural = 0;
        for (const li of hl.querySelectorAll("li")) natural = Math.max(natural, width(li));
        /* ⚠️ FROM FIXED PARTS, never "card − legend box + natural": the legend is shrink-to-fit, so with
           room to spare its box IS its natural width and that sum is just the card's own width — a
           floor that ratchets wider on every load. The card's chrome, the body's padding, the hoop
           and the gap do not depend on the column. */
        const hb = card.querySelector<HTMLElement>(".d60-hb");
        const hoop = card.querySelector<HTMLElement>(".d60-hoop");
        if (hb && hoop) {
          const cs = getComputedStyle(hb);
          const chrome = card.offsetWidth - hb.clientWidth;
          need = Math.max(need, chrome + (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0) + hoop.offsetWidth + (parseFloat(cs.columnGap) || 0) + natural);
        }
        /* and the band: its title and its link side by side, with the row's gap */
        if (row) {
          const kids = [...row.children] as HTMLElement[];
          const sum = kids.reduce((t, k) => t + width(k), 0) + Math.max(0, kids.length - 1) * (parseFloat(getComputedStyle(row).columnGap) || 12);
          need = Math.max(need, card.offsetWidth - row.clientWidth + sum);
        }
        for (const li of lis) li.style.whiteSpace = "";
      }
      const n = need > 0 ? Math.ceil(need) : 0;
      /* remembered for the next loading page the moment it changes — the shape effect below runs before
         the webfonts land, and a floor written then is the narrower one */
      if (n > 0 && n !== hoopNeedRef.current) writeShape({ ...readShape(), hoopNeed: n });
      hoopNeedRef.current = n;
      const v = need > 0 ? `${Math.ceil(need)}px` : "";
      if (root.style.getPropertyValue("--d60-hoop-need") !== v) {
        if (v) root.style.setProperty("--d60-hoop-need", v); else root.style.removeProperty("--d60-hoop-need");
      }
    };
    measure();
    window.addEventListener("resize", measure);
    void document.fonts?.ready.then(measure);
    return () => window.removeEventListener("resize", measure);
  });

  /* ── what the loading page should be the shape of: this account's last loaded page ── */
  const [shape] = useState(() => readShape());
  const focusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (loading) return;
    const h = focusRef.current?.getBoundingClientRect().height ?? 0;
    writeShape({ focusH: h > 0 ? Math.round(h) : shape.focusH, closed: closed && closed.total === 0 ? "none" : "some", today: unseen > 0, pre: empty, agents: agents.length > 0, hoopNeed: hoopNeedRef.current || shape.hoopNeed });
  }, [loading, plan, closed, unseen, shape.focusH, empty, agents.length]);

  /* ── v60: first use, and the two hoops ──
     While loading, the page draws whichever state the shape memory last saw, so the swap never
     flashes; once loaded it is the one predicate's answer. */
  const pre = loading ? shape.pre : empty;
  const hasAgents = loading ? shape.agents : agents.length > 0;
  /* v60.1 "Where do I start?": page state only — nothing stored, nothing routed */
  const [startOpen, setStartOpen] = useState(false);
  const [startAnswer, setStartAnswer] = useState<StartKey | null>(null);
  const spotValue = useMemo(() => ({ answer: pre ? startAnswer : null, hasAgents }), [pre, startAnswer, hasAgents]);
  useEffect(() => { if (!pre) { setStartOpen(false); setStartAnswer(null); } }, [pre]);
  const cov = useMemo(
    () => agentCoverage({ agents, queries, manuscript: activeManuscript, now, todayIso: localYMD(now.getTime()) }),
    [agents, queries, activeManuscript, now],
  );
  const tiles = useMemo(
    () => firstUseTiles({ plan: currentUser?.plan, usage: smartImportUsage, manuscript: activeManuscript, versions, now }),
    [currentUser?.plan, smartImportUsage, activeManuscript, versions, now],
  );
  /* ⚠️ EACH TILE OPENS AN EXISTING PAGE. The add-material button (Submission packages), the comps add
     drawer and the version dialog (Manuscripts) are each the page's own state with no door from
     outside, so the tile lands on the page that holds the button — never a route invented here. */
  const onTile = (k: TileKey) => {
    if (k === "import") onNavigate("import");
    else if (k === "mats") onNavigate("manuscripts", "Submission packages");
    else if (k === "comps") onNavigate("manuscripts", "Comparable titles");
    else onNavigate("manuscripts");
  };
  const toContacts = () => onNavigate("agents");
  /* "Log a query" on the queries door: with agents, the drawer's log journey; with none, the new-agent
     panel first (the one every "Add an agent" opens, over this page), as the hint says */
  const logFromDoor = () => {
    if (agents.length === 0) openNewAgentCard({ from: "button", host: "panel" });
    else openQueryDrawer({ mode: "log", ...(scopeId ? { manuscriptId: scopeId } : {}) });
  };

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

  /* ── the first paint (v59): once per mount, at the moment the data first finishes loading ──
     Never on a refresh, a re-render, a resize, a drawer closing or a manuscript switch: the latch
     is the first loading → loaded edge and nothing else. A LAYOUT effect, so the attribute is on the
     page in the same frame the loaded content first paints. It comes off when the sequence is over,
     because a transform held by `fill-mode` keeps a stacking context alive — and a column that is a
     stacking context would trap its cards beneath the hawk's shadow on hover. */
  const [paint, setPaint] = useState(false);
  const painted = useRef(false);
  useLayoutEffect(() => {
    if (loading || painted.current) return undefined;
    painted.current = true;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    setPaint(true);
    const t = window.setTimeout(() => setPaint(false), PAINT_MS);
    return () => window.clearTimeout(t);
  }, [loading]);

  const author = (currentUser?.name ?? "").trim();
  /* v60.1: the eyebrow reads the sidebar's own function */
  const standing = activeManuscript ? switcherStanding(activeManuscript, scopedQueries) : null;
  const title = (activeManuscript?.title ?? "").trim();

  return (
    <div ref={rootRef} className="os-root d58" data-mode={pre ? "pre" : "q"} data-paint={paint ? "1" : undefined} style={noticeListH > 0 ? ({ ["--d58-notice-list-h" as string]: `${noticeListH}px` } as React.CSSProperties) : undefined}>
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
            status={standing?.status ?? null}
            start={pre ? <WhereStart hasAgents={hasAgents} open={startOpen} setOpen={setStartOpen} answer={startAnswer} setAnswer={setStartAnswer} disabled={loading} /> : undefined}
          />
          <SpotProvider value={spotValue}>
          <div className="d58-body" data-d58="body">
            <div className="d58-left" data-d58="left" data-pre={pre ? "1" : "0"}>
              {pre ? (
                <>
                  <QueriesDoor loading={loading} agents={loading ? (hasAgents ? 1 : 0) : agents.length} onLog={logFromDoor} />
                  {hasAgents
                    ? <AgentsSnap loading={loading} cov={cov} onReady={toContacts} />
                    : <AgentsDoor loading={loading} onAdd={() => openNewAgentCard({ from: "button", host: "panel" })} onImport={() => onNavigate("import")} />}
                </>
              ) : (
                <>
                  <div className="d58-active" data-d58="active">
                    <OneScreenChart
                      loading={loading}
                      queries={scopedQueries}
                      activities={scopedActivities}
                      agents={agents}
                      manuscripts={manuscripts}
                      /* Query panel v1: the query opens in the side panel, over this page */
                      onOpenQuery={(id) => openQueryPanel(id, "dashboard")}
                      activeCount={activeCount}
                      undatedCount={loading ? 0 : undatedLiveCount(scopedQueries)}
                      now={now}
                      empty={empty}
                      onSendFirst={() => openQueryDrawer({ mode: "log", ...(scopeId ? { manuscriptId: scopeId } : {}) })}
                    />
                  </div>
                  {/* v60: Closed folds into a pair of hoops beneath the full-width chart, beside Agents on file */}
                  <div className="d60-hoops" data-d60="hoops">
                    <ClosedHoop loading={loading} tile={closed} play={paint} onSeeAll={() => navigate(queriesPathFor("closed"))} />
                    <AgentsHoop loading={loading} cov={cov} play={paint} onReady={toContacts} />
                  </div>
                </>
              )}
            </div>
            <Dash71Right
              task={<Dash71Task loading={loading} plan={plan} ctx={taskCtx} onView={viewTask} innerRef={focusRef} />}
              lift={pre ? <Dash60Lift loading={loading} tiles={tiles} hasAgents={hasAgents} onTile={onTile} /> : undefined}
              panel={
                <Dash93Founding loading={loading} uid={fwUid} />
              }
            />
          </div>
          </SpotProvider>
        </div>

      </DashPopupProvider>
      {/* ⚠️ ONLY WHILE THE DASHBOARD IS THE PAGE ON SCREEN: every page stays mounted, and a layer
          portalled into the shell's sheet outlives its page otherwise. Never in the onboarding ghost. */}
      {sheet && onDash && !rootRef.current?.closest(".im-ghost") && createPortal(
        <div className="d58-layer d59-sheet" data-d58="sheet-layer" style={{ ["--d59-tab-r" as string]: `${sheet.r}px` } as React.CSSProperties}>
          <img className="d59-hawkshadow" data-d58="shadow" alt="" aria-hidden="true" draggable={false} src={`${DASH_SHADOW.src}?v=${DASH_SHADOW.version}`} />
          <FeedTab open={feedOpen} unseen={loading ? (shape.today ? -1 : 0) : unseen} bump={bump} onOpen={openFeed} />
        </div>,
        sheet.el,
      )}
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
