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
import { openQueryPanel } from "../../../lib/queryPanelStore";
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
import { dashList, gettingStartedItem, gettingStartedPlan, type ListAction } from "../../../lib/dashList";
import { buildQcRows } from "../../../lib/qcSummary";
import type { TaskCtx } from "../../../lib/dashTaskCard";
import { gettingStartedRows } from "../../../lib/dashEmpty";
import { openQueryDrawer } from "../../../lib/queryActions/drawerStore";
import { openAgentCard } from "../../../lib/agentCardStore";
import { queriesForIds, queriesPathFor } from "../../../lib/queriesFilterParam";
import { CLOSED_BUCKETS } from "../../../lib/dashClosed";
import { contactListForStatus } from "../../../lib/contactList";
import { dashAid, useDashHold, type DashAid } from "../../../lib/dashReviewAid";
import { readShape, writeShape } from "../../../lib/dashShape";
import { MONTHS_SHORT } from "../../../lib/dates";
import { readImportNotice, clearImportNotice, onImportNoticeChange, noticeHeadline, noticeWhy, noticeToggle, NOTICE_DISMISS, type ImportNotice } from "../../../lib/importNotice";
import { DashPopupProvider } from "../DashPopup";
import { OneScreenChart } from "../OneScreenChart";
import { Dash58Header } from "./Dash58Header";
import { Dash71Right } from "../v71/Dash71Right";
import { Dash71Task } from "../v71/Dash71Task";
import { F1Feed } from "../f1/F1Feed";
import { Dash105Founding } from "../v105/Dash105Founding";
import { agentCoverage, isPreQuery } from "../../../lib/dashFirstUse";
import { ClosedHoop, AgentsHoop } from "../v60/Dash60Left";
import { openNewAgentCard } from "../../../lib/agentCardStore";
import { campaignEyebrow, seg, dashPrefsOf, gsHideWrite, gsOrder, nextTip, startPathOf, startPathWrite, stepTip, tipWrite, type GsLink, type StartPath } from "../../../lib/dashFirstVisit";
import type { UserPaths } from "../../../lib/userPaths";
import { DASH_TIPS } from "../../../lib/dashTips";
import { SetUpCard } from "../fv1/SetUpCard";
import { MentorTip } from "../fv1/MentorTip";
import { FirstWinStamp } from "../fv1/FirstWinStamp";
import type { TaskGs } from "../v71/Dash71Task";
import "../oneScreen.css";
import "./dash58.css";
import "../v59/dash59.css";
/* ⚠️ LAST: the bundle orders sheets by first import, and v60's rules win ties against v58's and v59's */
import "../v60/dash60.css";
/* ⚠️ AND v71 LAST OF ALL: its rules win ties against v58–v60's */
import "../v71/dash71.css";
/* ⚠️ AND v77 AFTER IT */
import "../v77/dash77.css";
import "../v105/dash105.css";
/* ⚠️ AND THE FIRST VISIT LAST OF ALL (Dashboard first visit v1): its pre-query layout wins ties */
import "../fv1/fv1.css";
/* ⚠️ AND DASHBOARD FEED v1 AFTER EVERYTHING: the three-column layout (`data-mode="f1"`) wins every tie */
import "../f1/df1.css";

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
  /** v105: records the founding rank last celebrated (users.foundingSeenTier). Absent (the onboarding ghost) → no celebration, no write. */
  onFoundingSeen?: (tier: number) => void | Promise<void>;
  /** First visit v1: writes the page's own prefs (`todoPrefs.dash`, one dotted leaf each). Absent (the onboarding ghost) → nothing is stored. */
  onPrefs?: (paths: UserPaths) => void | Promise<void>;
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
  onFoundingSeen, onPrefs,
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

  /* ⚠️ ABOVE THE PLAN, WHICH READS `gsOpen` DURING RENDER: a `const` read from a memo below its declaration is a
     TDZ that tsc cannot see (CLAUDE.md). */
  /* ── first visit v1: the set-up answer, the tip, and Getting started ──
     ⚠️ EVERY PREFERENCE IS A PREFERENCE, NEVER A SOURCE: the answer chooses a path and an order, the tip
     index chooses which tip opens, and Hide hides a page. None of them is read by anything that counts. */
  const prefs = useMemo(() => dashPrefsOf(currentUser), [currentUser]);
  /* the answer is held locally as well, so a click shows at once and the ghost (no writer) still answers */
  const [localPath, setLocalPath] = useState<Record<string, StartPath>>({});
  const path: StartPath = (scopeId ? localPath[scopeId] : undefined) ?? startPathOf(prefs, scopeId);
  const choosePath = (p: StartPath) => {
    if (!scopeId) return;
    setLocalPath((o) => ({ ...o, [scopeId]: p }));
    void onPrefs?.(startPathWrite(scopeId, p));
  };
  const logQuery = () => openQueryDrawer({ mode: "log", ...(scopeId ? { manuscriptId: scopeId } : {}) });
  const addAgent = () => openNewAgentCard({ from: "button", host: "panel" });
  const goGs = (go: GsLink) => {
    if (go === "manuscript") onNavigate("manuscripts", "Add a manuscript");
    else if (go === "agent") addAgent();
    else if (go === "import") onNavigate("import");
    else if (go === "log") logQuery();
    else if (go === "materials") onNavigate("manuscripts", "Submission packages");
    else onNavigate("manuscripts", "Comparable titles");
  };
  const gsRows = useMemo(() => {
    const rows = gettingStartedRows({ manuscripts, agentCount: agents.length, queryCount: scopedQueries.length, versions, activeManuscript });
    return gsOrder(path).map((k) => ({ key: k, done: rows.find((r) => r.key === k)?.done ?? false }));
  }, [manuscripts, agents.length, scopedQueries.length, versions, activeManuscript, path]);
  const gsHidden = !!scopeId && !!prefs.gsHidden[seg(scopeId)];
  /* Getting started is a page while any row is undone and the writer has not hidden it (Part C) */
  const gsOpen = !gsHidden && gsRows.some((r) => !r.done);
  const gs: TaskGs = {
    rows: gsRows, path, onGo: goGs,
    /* "Hide" only once the first query exists: before it, Getting started is the card's whole job */
    onHide: !empty && scopeId && onPrefs ? () => { void onPrefs(gsHideWrite(scopeId)); } : undefined,
  };

  /* ── the list: the board's own cards, then the contact list's, then the clock's ── */
  const plan = useMemo(() => {
    /* first run: no query on this book yet, so the card is the one Getting started page (first visit v1) */
    if (empty && aid.drop.length === 0) return gettingStartedPlan();
    const cols = assembleBoardColumns({
      tasks: scopedTasks, userTasks, queries, agents, manuscripts, taskFlags, activities: scopedActivities,
      now: now.getTime(), today: localYMD(now.getTime()), mutedTaskRules: currentUser?.mutedTaskRules,
    }).cols;
    const cards = [...cols.todo, ...cols.today];
    const rows = todoRows({ cards, data: { queries, agents, manuscripts, userTasks, activities: scopedActivities } });
    return dashList({
      rows, cards, queries, scopedQueries, agents, activities: scopedActivities, allActivities: activities,
      userTasks, manuscript: activeManuscript, user: currentUser, now, drop: aid.drop,
      /* first visit v1 (Part C): Getting started stays a page — after the real tasks, before housekeeping — until
         every row is done or the writer hides it */
      start: gsOpen ? gettingStartedItem() : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedTasks, userTasks, queries, scopedQueries, agents, manuscripts, taskFlags, scopedActivities, activities, activeManuscript, currentUser, now, aid.drop.join(","), empty, versions, scopeId, gsOpen]);

  /* v71: the task card reads the Query Centre's own rows for the dates it draws */
  const taskCtx = useMemo<TaskCtx>(
    () => ({ queries, agents, qcRows: buildQcRows(scopedQueries, agents, scopedActivities, now.getTime()), nowMs: now.getTime() }),
    [queries, agents, scopedQueries, scopedActivities, now],
  );

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

  /* ── the founding writer card (v105): a press ID — the writer's name and founding number, feedback composed in the
     card, the rank read live from their own `foundingStats` doc. The sidebar's Give feedback (FeedbackDock) is unchanged. */
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
        /* the buttons' right edge; before the first query there are none (first visit v1), so the header's
           own content edge — where they would end — stands in for it */
        /* Dashboard feed v1: the pinned feed column — its top is where it rests (the first left card's top, measured
           at the page's own scroll offset, so it reads the same scrolled or not), and its foot is 14px above the
           sheet's bottom. ⚠️ MEASURED, NEVER `100vh`. */
        const cols = root.querySelector<HTMLElement>('[data-df1="cols"]');
        if (cols) {
          const stick = cols.getBoundingClientRect().top - pr.top + port.scrollTop - (parseFloat(cs.paddingTop) || 0);
          set("--df1-stick", Math.max(0, stick));
          set("--df1-feed-h", Math.max(320, win.bottom - 14 - (pr.top + (parseFloat(cs.paddingTop) || 0) + Math.max(0, stick))));
        }
        const btnEl = root.querySelector<HTMLElement>('[data-d58="buttons"]');
        const head = root.querySelector<HTMLElement>('[data-d58="header"]') ?? cols;
        const btns = btnEl?.getBoundingClientRect();
        const edge = btns && btns.width > 0 ? btns.right
          : head ? head.getBoundingClientRect().right - (parseFloat(getComputedStyle(head).paddingRight) || 0) : 0;
        if (edge > 0) setSheet((o) => {
          const r = Math.round(win.right - edge);
          return o && o.el === winEl && o.r === r ? o : { el: winEl!, r };
        });
      }
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(measure); };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    ro?.observe(port);
    ro?.observe(root);
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
    writeShape({ focusH: h > 0 ? Math.round(h) : shape.focusH, closed: closed && closed.total === 0 ? "none" : "some", today: false, pre: empty, agents: agents.length > 0, hoopNeed: hoopNeedRef.current || shape.hoopNeed });
  }, [loading, plan, closed, shape.focusH, empty, agents.length]);

  /* ── v60: first use, and the two hoops ──
     While loading, the page draws whichever state the shape memory last saw, so the swap never
     flashes; once loaded it is the one predicate's answer. */
  const pre = loading ? shape.pre : empty;
  const hasAgents = loading ? shape.agents : agents.length > 0;
  const cov = useMemo(
    () => agentCoverage({ agents, queries, manuscript: activeManuscript, now, todayIso: localYMD(now.getTime()) }),
    [agents, queries, activeManuscript, now],
  );
  const toContacts = () => onNavigate("agents");

  /* the tip: each visit to the dashboard opens on the next one (stored), ‹ › loop round */
  const [tip, setTip] = useState<number | null>(null);
  const tipAdvanced = useRef(false);
  const onDashNow = useLocation().pathname === "/dashboard";
  useEffect(() => {
    if (!onDashNow) { tipAdvanced.current = false; return; }
    if (loading || tipAdvanced.current) return;
    tipAdvanced.current = true;
    const i = nextTip(prefs.tip, DASH_TIPS.length);
    setTip(i);
    if (currentUser) void onPrefs?.(tipWrite(i));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onDashNow, loading]);
  const tipIndex = tip ?? nextTip(prefs.tip, DASH_TIPS.length);

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
  /* first visit v1: the eyebrow is the campaign's — GETTING READY, QUERYING or BETWEEN ROUNDS — read from this
     manuscript's queries; the stored status stays the sidebar's */
  const eyebrow = campaignEyebrow(scopedQueries);
  const title = (activeManuscript?.title ?? "").trim();

  /* ── the querying page's cards (Dashboard feed v1). Each is the app's own component; the layout below places them. ── */
  const chartCard = (
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
      />
    </div>
  );
  const closedCard = (
    <ClosedHoop loading={loading} tile={closed} play={paint} onSeeAll={() => navigate(queriesPathFor("closed"))}
      /* v118 Part B — a slice or row opens the Query Centre on exactly its queries, this manuscript's only */
      onOpen={(k) => closed && navigate(queriesForIds(closed.members[k] ?? [], CLOSED_BUCKETS.find((b) => b.key === k)?.label))}
      queries={scopedQueries} agents={agents} manuscript={activeManuscript?.title ?? ""} noneWhileLoading={shape.closed === "none"} />
  );
  const agentsCard = (
    <AgentsHoop loading={loading} cov={cov} play={paint} onReady={toContacts}
      /* v118 Part B — a slice or row opens the Contact list filtered to that status */
      onOpen={(k) => navigate(contactListForStatus(k))}
      agents={agents} queries={queries} msId={scopeId}
      onDiscover={() => onNavigate("agents", "Discover")} onImport={() => onNavigate("import")} />
  );
  const taskCard = <Dash71Task loading={loading} plan={plan} ctx={taskCtx} onView={viewTask} innerRef={focusRef} gs={gsHidden ? undefined : gs} />;
  const foundingCard = <Dash105Founding loading={loading} uid={fwUid} name={currentUser?.name ?? null} seenTier={currentUser?.foundingSeenTier ?? null} onSeen={onFoundingSeen} />;

  return (
    <div ref={rootRef} className="os-root d58" data-mode={pre ? "pre" : "f1"} data-paint={paint ? "1" : undefined} style={noticeListH > 0 ? ({ ["--d58-notice-list-h" as string]: `${noticeListH}px` } as React.CSSProperties) : undefined}>
      <DashPopupProvider rootRef={rootRef}>
        <div className="d58-page" data-d58="page" data-loading={loading ? "1" : "0"}>
          {notice && <ImportNoticeRow notice={notice} onDismiss={dismissNotice} onListHeight={setNoticeListH} />}
          {pre ? (
            <>
              {/* first visit v1, unchanged: the book's header, the set-up card and the Mentor */}
              <Dash58Header
                loading={loading}
                title={title}
                author={author}
                onLog={logQuery}
                onRecord={() => onNavigate("queries", "Record a response")}
                onAddAgent={() => onNavigate("agents", "Add an agent")}
                eyebrow={eyebrow}
                buttons="none"
              />
              <div className="d58-body" data-d58="body">
                <div className="d58-left" data-d58="left" data-pre="1">
                  <SetUpCard
                    loading={loading} title={title} path={path} onPath={choosePath}
                    agents={loading ? (hasAgents ? 1 : 0) : agents.length}
                    onImport={() => onNavigate("import")} onLog={logQuery} onAddAgent={addAgent} onDiscover={() => onNavigate("agents", "Discover")}
                  />
                  <MentorTip loading={loading} index={tipIndex} onStep={(d) => setTip(stepTip(tipIndex, d, DASH_TIPS.length))} />
                </div>
                {/* Part B: the first-win stamp — struck over the body, once per kind, user and manuscript */}
                <FirstWinStamp uid={currentUser?.id ?? null} active={onDash && !loading && !rootRef.current?.closest(".im-ghost")} shown={prefs.wins} onPrefs={onPrefs} />
                <Dash71Right task={taskCard} panel={foundingCard} />
              </div>
            </>
          ) : (
            /* ⚠️ DASHBOARD FEED v1: THREE COLUMNS — you and your queries · the feed · what to do. The page may scroll;
               only the feed column is pinned, and it scrolls inside itself. At a sheet of 1300px or less the left and
               right columns' cards share one column (`display: contents`, placed by row) and the feed is the second. */
            <div className="df1-cols" data-df1="cols">
              <div className="df1-left" data-df1="left">
                <div className="df1-slot df1-s-queries" data-df1="queries">{chartCard}{closedCard}</div>
                <div className="df1-slot df1-s-agents" data-df1="agents">{agentsCard}</div>
                <div className="df1-slot df1-s-founding" data-df1="founding">{foundingCard}</div>
              </div>
              <div className="df1-feed" data-df1="feed">
                <F1Feed loading={loading} activities={scopedActivities} queries={queries} agents={agents} manuscripts={manuscripts} now={now} />
              </div>
              <div className="df1-right" data-df1="right">
                <div className="df1-slot df1-s-task" data-df1="task">{taskCard}</div>
              </div>
              <FirstWinStamp uid={currentUser?.id ?? null} active={onDash && !loading && !rootRef.current?.closest(".im-ghost")} shown={prefs.wins} onPrefs={onPrefs} />
            </div>
          )}
        </div>
      </DashPopupProvider>
      {/* ⚠️ ONLY WHILE THE DASHBOARD IS THE PAGE ON SCREEN: every page stays mounted, and a layer
          portalled into the shell's sheet outlives its page otherwise. Never in the onboarding ghost.
          Dashboard feed v1: the floating feed tab is retired; the hawk's shadow stays. */}
      {sheet && onDash && !rootRef.current?.closest(".im-ghost") && createPortal(
        <div className="d58-layer d59-sheet" data-d58="sheet-layer" style={{ ["--d59-tab-r" as string]: `${sheet.r}px` } as React.CSSProperties}>
          <img className="d59-hawkshadow" data-d58="shadow" alt="" aria-hidden="true" draggable={false} src={`${DASH_SHADOW.src}?v=${DASH_SHADOW.version}`} />
        </div>,
        sheet.el,
      )}
    </div>
  );
};
