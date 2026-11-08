/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v50 — THE TASK WORKSPACE (design-refs/todo-list-v50/todo-list-v50.html). Desktop only (768px up); the
 * phone keeps its own page (`TodoRoute` chooses).
 *
 * A slim navy header names the one task that matters most. Under it the workspace docks at the top of the page: a tray
 * of tasks on the left (To do · Snoozed · Done), and a desk on the right where the selected task is done — the Mentor's
 * line, the questions one at a time, a summary of what gets logged, and the real query or agent card beside it showing
 * the change as it is made.
 *
 * ⚠️ THE TRAY IS THE BOARD'S. The tasks come from `assembleBoardColumns` and `trayItem`, the same derivation the sidebar
 *    badge and every To-do surface reads; this page only expands a housekeeping sweep into one row per agent.
 * ⚠️ EVERY WRITE IS AN EXISTING ONE (see `wsFlows`): nothing here writes a status, a flag or a task any other way.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { WorkspacePageGrid } from "../../shell/WorkspacePageGrid";
import { useScriptAllyDb } from "../../../lib/db";
import type { BoardCard } from "../../../lib/todoBoard";
import {
  NO_WS_FILTERS, STRIP_GROUP, WS_GROUPINGS, WS_TYPES, WS_WHENS, dayBit, doingPhrase, dueChip, mentorLine, passes, priorityTask, startReason, stripWords, whenOf, wsSections,
  type DoneRow, type WsFilters, type WsGroupId, type WsGrouping, type WsTask, type WsType, type WsWhen,
} from "../../../lib/todoWs";
import { RULE_OFF_WORDS, RULE_TITLE, RULE_PLAIN, type SetAsideItem } from "../../../lib/taskSettings";
import { openQueryPanel } from "../../../lib/queryPanelStore";
import { openAgentCard } from "../../../lib/agentCardStore";
import { openQueryDrawer } from "../../../lib/queryActions/drawerStore";
import { ESC_LEVEL, escapeDepth, useEscapeLayer } from "../../../lib/escapeStack";
import { SHORTCUTS, isEditableTarget, matchesShortcut } from "../../../lib/shortcuts";
import { TODO_OPEN_TASK_KEY } from "../../../lib/corkboard";
import { TODO_OPEN_COMPOSER } from "../../../lib/todoRoutes";
import { MON, addDays, dayDiff, fmt } from "../../../lib/queryActions/dates";
import { QueryStatus, type UserTask } from "../../../types";
import { type Answers, type Flow, type FlowDone } from "./wsFlows";
import { useWsCore, useWsBatch } from "./useWsCore";
import { DatePick, DIS, TICK, ZZ, dayFromYmd } from "./WsControls";
import { PreviewAgentCard, PreviewQueryCard, ScaledCard, useQueryLog } from "./WsPreview";
import { stampedCardRows } from "../../queries/centre/qcCardView";
import { quietWeeksOf } from "../../../lib/queryState";
import { packagesUnlocked } from "../../../lib/entitlements";
import { DismissPop, SnoozePop, SwitchedOffPop, type DismissChoice } from "./WsPops";
import { OwnEmptySide, WsOwnTask } from "./WsOwnTask";
import { StatusDot } from "../../StatusDot";
import { AnchoredPanel } from "../AnchoredPanel";
import TagsPane from "../TagsSheet";
import "./todoWs.css";

const MENTOR = "/images/todo/mentor.webp";
const HOUR = "/images/todo/hour.webp";
/** Start here's quill and inkpot: the app's own copy (the pack's start-here-quill.webp is the same drawing, re-encoded) */
const QUILL = "/images/query-centre/quill-ink.webp";
/** the collapsed tray, remembered per device (v52 Part B) */
const SLIM_KEY = "sa.todoTraySlim";
const readSlim = (): boolean => { try { return localStorage.getItem(SLIM_KEY) === "1"; } catch { return false; } };
const writeSlim = (v: boolean) => { try { localStorage.setItem(SLIM_KEY, v ? "1" : "0"); } catch { /* private mode */ } };
const DAY = 86400000;
const UNDO_MS = 7000;

const SVG_FILTER = <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5h14M6 10h8M8.5 15h3" /></svg>;
const SVG_GROUP = <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="2.5" width="15" height="6" rx="1.6" /><rect x="2.5" y="11.5" width="15" height="6" rx="1.6" /></svg>;
const SVG_SLIM = <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M11 5l-5 5 5 5M16 5l-5 5 5 5" /></svg>;
const SVG_WIDE = <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5l5 5-5 5M9 5l5 5-5 5" /></svg>;
/* housekeeping's job marks: a clock (reply time), a heart (wishlist), a tag (genres), a page (what was sent) */
const HK_ICON: Record<"clock" | "heart" | "tag" | "page", React.ReactNode> = {
  clock: <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6.5" /><path d="M10 6.5V10l2.5 1.6" /></svg>,
  heart: <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 15.5s-5.5-3.3-5.5-7.1A2.9 2.9 0 0 1 10 6.6a2.9 2.9 0 0 1 5.5 1.8c0 3.8-5.5 7.1-5.5 7.1z" /></svg>,
  tag: <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4h6l6 6-6 6-6-6z" /><circle cx="7.5" cy="7.5" r="1" /></svg>,
  page: <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 3.5h5.5L14.5 6.5V16.5H6z" /><path d="M11.5 3.5v3h3M8 10h4.5M8 12.8h4.5" /></svg>,
};
const hkIcon = (t: WsTask): React.ReactNode => (t.kind === "batch" || t.need === "materials" ? HK_ICON.page : t.need === "mswl" ? HK_ICON.heart : t.need === "responseTime" ? HK_ICON.clock : HK_ICON.tag);
const SVG_FIND = <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></svg>;

const initialsOf = (n: string) => { const w = n.trim().split(/\s+/).filter(Boolean); return (w.length > 1 ? w[0][0] + w[w.length - 1][0] : (w[0] ?? "").slice(0, 2)).toUpperCase() || "··"; };
const dayWord = (ms: number, today: Date): string => {
  const d = new Date(ms); const n = dayDiff(new Date(d.getFullYear(), d.getMonth(), d.getDate()), today);
  return n === 0 ? "Today" : n === -1 ? "Yesterday" : `${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
};

interface Toast { msg: string; undo?: () => Promise<void> }
interface Yay extends FlowDone { nextKey: string | null }

export const TodoWorkspace: React.FC<{ onNavigate: (tab: string, sub?: string, opts?: { agentId?: string; manuscriptId?: string }) => void }> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const db = useScriptAllyDb();
  const {
    tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, packages, currentUser, collectionsReady,
    addUserTask, updateUserTask, deleteUserTask, restoreUserTask, upsertTaskFlag, dismissTask, restoreTaskFlag, updateUserProfile, updateUserPaths,
  } = db;

  /* the clock, re-read each minute */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 60000); return () => window.clearInterval(id); }, []);
  /* To-do on the phone v1, Phase A: the workspace's brain is useWsCore, shared with the phone (moved, unchanged) */
  const core = useWsCore(now);
  const { today, todayYmd, hkGroups: _hk, all, quietFacts, limitFor, snoozeTask, openCard, snoozed, doneRows, asideTitle, offRows } = core;
  void _hk;

  /* ── the tray: tab, filters, grouping ── */
  const [tab, setTab] = useState<"todo" | "snoozed" | "done">("todo");
  const [filters, setFilters] = useState<WsFilters>(NO_WS_FILTERS);
  const filtRef = useRef<HTMLButtonElement>(null);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [grouping, setGrouping] = useState<WsGrouping>("category");
  const [menu, setMenu] = useState<"f" | "g" | null>(null);
  const [shut, setShut] = useState<ReadonlySet<string>>(() => new Set());
  const [hkMore, setHkMore] = useState(false);
  const [slim, setSlimState] = useState<boolean>(readSlim);
  const setSlim = (v: boolean) => { setSlimState(v); writeSlim(v); setMenu(null); };
  const visible = useMemo(() => all.filter((t) => passes(t, filters)), [all, filters]);
  const sections = useMemo(() => wsSections(visible, grouping), [visible, grouping]);
  const order = useMemo(() => sections.flatMap((s) => (shut.has(s.id) ? [] : s.tasks)), [sections, shut]);
  /* ⚠️ ONE COUNT (v51.1): the To do tab, the desk's "n/m" and the group headings all count the rows the tray holds —
     every group, Housekeeping's one-row-per-agent included, a collapsed group too. ‹ › still step only the open groups. */
  const seq = useMemo(() => sections.flatMap((s) => s.tasks), [sections]);
  const findRef = useRef<HTMLInputElement>(null);
  useEscapeLayer(!!menu, () => setMenu(null), ESC_LEVEL.page);

  /* ── selection ── */
  const [selKey, setSelKey] = useState<string | null>(null);
  const selRef = useRef<string | null>(null);
  selRef.current = selKey;
  const sel = order.find((t) => t.key === selKey) ?? all.find((t) => t.key === selKey) ?? order[0] ?? null;
  const [A, setA] = useState<Answers>({});
  const [qi, setQi] = useState(0);
  const [yay, setYay] = useState<Yay | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pop, setPop] = useState<{ kind: "snooze" | "dismiss"; opener: HTMLElement | null } | null>(null);
  /** v52 (7 Nov): "Tasks you've switched off", opened from the Done tab's foot or the Filters menu */
  const [offPop, setOffPop] = useState<HTMLElement | null>(null);
  const [linkPicking, setLinkPicking] = useState(false);
  /* the batch row's place (v51.1): queries skipped this time round, and queries saved but not yet gone from the board */
  /* ⚠️ DECLARED ABOVE `go`, which resets its skips (moved to useWsBatch, unchanged) */
  const batch = useWsBatch(sel, selKey, setSelKey, all);
  const { bRemaining, bCur, deskT } = batch;
  const go = useCallback((key: string | null) => {
    setSelKey(key); setA({}); setQi(0); setYay(null); setAdding(false); setPop(null); setLinkPicking(false); batch.resetSkip();
    /* the row is brought into the tray's own view; never scrollIntoView, which would scroll the page too */
    if (key) requestAnimationFrame(() => {
      const r = document.querySelector<HTMLElement>(`.tws [data-tws-row="${CSS.escape(key)}"]`);
      const list = r?.closest<HTMLElement>(".tws-tl");
      if (!r || !list) return;
      const top = r.offsetTop - list.offsetTop, bot = top + r.offsetHeight;
      if (top < list.scrollTop + 40) list.scrollTop = Math.max(0, top - 40);
      else if (bot > list.scrollTop + list.clientHeight) list.scrollTop = bot - list.clientHeight + 8;
    });
  }, []);
  const move = (dir: 1 | -1) => {
    if (!order.length) return;
    const i = sel ? order.findIndex((t) => t.key === sel.key) : -1;
    go(order[(i + dir + order.length) % order.length].key);
  };

  /* arrival: the Corkboard's "open this task", and "+ New task" from elsewhere */
  useEffect(() => {
    /* read once the board is in: the key is one-shot, so reading it before the tasks arrive would lose the task */
    if (location.pathname !== "/todo" || !collectionsReady) return;
    let id: string | null = null, compose: string | null = null;
    try { id = sessionStorage.getItem(TODO_OPEN_TASK_KEY); compose = sessionStorage.getItem("sa.todoCompose"); } catch { /* private mode */ }
    try { sessionStorage.removeItem(TODO_OPEN_TASK_KEY); sessionStorage.removeItem("sa.todoCompose"); } catch { /* private mode */ }
    if (id) { const t = all.find((x) => x.userTask?.id === id || x.key === id); if (t) go(t.key); }
    if (compose) { setYay(null); setAdding(true); }
  }, [location.pathname, collectionsReady]); // eslint-disable-line react-hooks/exhaustive-deps
  /* the shell's "+ Task" while already on /todo: an event, not the one-shot key (AppShell, TODO_OPEN_COMPOSER) */
  useEffect(() => {
    const on = () => { setYay(null); setAdding(true); };
    window.addEventListener(TODO_OPEN_COMPOSER, on);
    return () => window.removeEventListener(TODO_OPEN_COMPOSER, on);
  }, []);

  /* ── the toast ── */
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number | null>(null);
  const flash = useCallback((msg: string, undo?: () => Promise<void>) => {
    setToast({ msg, undo });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), undo ? UNDO_MS : 3200);
  }, []);
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current); }, []);

  /* ── the scrollport's height, published for the workspace (never 100vh) ── */
  const rootRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = rootRef.current;
    const sc = root?.querySelector<HTMLElement>(".wpg-scroll");
    if (!root || !sc) return undefined;
    const put = () => { const h = sc.clientHeight; if (h > 0) root.style.setProperty("--tws-port", `${h}px`); };
    put();
    const ro = new ResizeObserver(put);
    ro.observe(sc);
    return () => ro.disconnect();
  }, []);

  const nextKeyAfter = (t: WsTask): string | null => { const i = order.findIndex((x) => x.key === t.key); return (order[i + 1] ?? order[i - 1])?.key ?? null; };

  const doSnooze = async (t: WsTask, days: number, until: Date) => {
    setPop(null);
    const next = nextKeyAfter(t);
    const undo = await snoozeTask(t, days);
    if (!undo) { flash("That task can’t be snoozed that far."); return; }
    go(next);
    flash(core.snoozeWords(t, until), async () => { await undo(); go(t.key); });
  };

  const openLinked = (u: UserTask) => {
    if (u.queryId) openQueryPanel(u.queryId, "other");
    else if (u.agentId) openAgentCard(u.agentId);
  };

  const doDismiss = async (t: WsTask, c: DismissChoice) => {
    setPop(null);
    if (c === "logit") { setQi(0); if (t.kind === "nudge") setA((a) => ({ ...a, sent: true })); flash("Answer the questions, and it’s logged."); return; }
    if (c === "card") { openCard(t); return; }
    if (c === "withdraw" && t.query) { openQueryDrawer({ mode: "close", queryId: t.query.id, preset: { closeWhy: "withdraw" } } as never); return; }
    const next = nextKeyAfter(t);
    const w = await core.dismissWrite(t, c);
    if (w === "error") { flash("Couldn’t save that. Nothing was changed."); return; }
    if (!w) return;
    go(next);
    flash(w.msg, w.undo ? async () => { await w.undo!(); if (w.back) go(t.key); } : undefined);
  };

  /* ── the Snoozed and Done tabs ── */
  const clearedN = doneRows.length;
  const turnOn = async (rule: string) => {
    const before = currentUser?.mutedTaskRules ?? [];
    await updateUserProfile({ mutedTaskRules: before.filter((k) => k !== rule) });
    if (offRows.length <= 1) setOffPop(null);
    flash(`${RULE_OFF_WORDS[rule] ?? RULE_TITLE[rule] ?? "Those tasks"} are back on.`, async () => { await updateUserProfile({ mutedTaskRules: before }); });
  };
  const bringBack = async (a: SetAsideItem) => {
    const w = await core.bringBackWrite(a);
    if (w.toTodo) setTab("todo");
    flash(w.msg, w.undo);
  };

  /* ── the batch row on the desk (v51.1): one query at a time ── */
  const skipOne = () => { if (batch.skipOne()) { setA({}); setQi(0); } };

  /* ── the card preview's rows: the Query Centre's own, stamped the same way (v52 Part D) ── */
  const quietWeeks = quietWeeksOf(currentUser);
  const cardRows = useMemo(() => new Map(stampedCardRows(queries, agents, activities, quietWeeks, now).map((r) => [r.id, r])),
    [queries, agents, activities, quietWeeks, now]);
  const cardFree = !packagesUnlocked(currentUser);

  /* ── the flow on the desk ── */
  const qLog = useQueryLog(currentUser?.id ?? null, deskT?.query?.id ?? null);
  const linkLog = useQueryLog(currentUser?.id ?? null, deskT?.kind === "own" ? deskT.userTask?.queryId ?? null : null);
  const userFirst = (currentUser?.name ?? "").trim().split(/\s+/)[0] || "";
  const flow: Flow | null = useMemo(() => core.makeFlow(sel, deskT, A, setA, (m) => flash(m)),
    [sel, deskT, A, today, currentUser?.id, userFirst, queries, agents, manuscripts, activities, taskFlags]); // eslint-disable-line react-hooks/exhaustive-deps

  const qs = flow?.questions ?? [];
  const cur = Math.min(qi, qs.length);
  const allDone = qs.length > 0 && cur >= qs.length;

  const logIt = async () => {
    if (!sel || !flow?.commit || busy) return;
    setBusy(true);
    const next = nextKeyAfter(sel);
    try {
      const d = await flow.commit();
      /* a batch with more to go: a toast with Undo, and the next query opens; the celebration waits for the last */
      if (sel.kind === "batch" && bCur && bRemaining.length > 1) {
        const qid = bCur.queryId;
        batch.markSaved(qid);
        setA({}); setQi(0);
        flash(d.msg, d.undo ? async () => { await d.undo!(); batch.unmarkSaved(qid); } : undefined);
        return;
      }
      setYay({ ...d, nextKey: next });
    } catch (e) {
      console.error("[to-do] the save failed", e);
      flash("Couldn’t save that. Nothing was changed.");
    } finally { setBusy(false); }
  };
  const ownDone = async (t: WsTask) => {
    const u = t.userTask;
    if (!u || busy) return;
    setBusy(true);
    const next = nextKeyAfter(t);
    try {
      const undo = await core.ownDoneWrite(u);
      setYay({ head: "Done.", msg: "One less thing on your mind.", nextKey: next, undo });
    } catch { flash("Couldn’t save that. Nothing was changed."); } finally { setBusy(false); }
  };

  /* ── keys: J/K move, S snooze, D dismiss, / find, N add ── */
  const snzRef = useRef<HTMLButtonElement>(null);
  const disRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (location.pathname !== "/todo" || isEditableTarget(e.target) || escapeDepth() > 0 || e.metaKey || e.ctrlKey || e.altKey) return;
      if (matchesShortcut(SHORTCUTS.todoDown, e) && tab === "todo") { e.preventDefault(); move(1); }
      else if (matchesShortcut(SHORTCUTS.todoUp, e) && tab === "todo") { e.preventDefault(); move(-1); }
      else if (matchesShortcut(SHORTCUTS.todoSearch, e)) { e.preventDefault(); findRef.current?.focus(); }
      else if (matchesShortcut(SHORTCUTS.todoSnooze, e) && sel && !yay && !adding) { e.preventDefault(); setPop({ kind: "snooze", opener: snzRef.current }); }
      else if (matchesShortcut(SHORTCUTS.todoDismiss, e) && sel && !yay && !adding) { e.preventDefault(); setPop({ kind: "dismiss", opener: disRef.current }); }
      else if (matchesShortcut(SHORTCUTS.todoAdd, e)) { e.preventDefault(); setYay(null); setAdding(true); }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });

  /* ── the header's stats line (v52 Part A): the tray's own counts ──
     ⚠️ "late" is a dated task past its date, Gone quiet excluded (it has no due date, only days since a send). The book
        is named only when the account has one manuscript: the counts are the whole tray's, and a book's name in front of
        them would say they were that book's alone. */
  const lateN = seq.filter((t) => t.kind !== "quiet" && t.dueDays != null && t.dueDays < 0).length;
  const statBook = manuscripts.length === 1 ? (manuscripts[0].title ?? "").trim() || null : null;
  /* the priority task (shown in the tray's Start here card from Part B) */
  const prio = useMemo(() => priorityTask(all), [all]);
  const onIt = !!prio.task && !!sel && sel.key === prio.task.key && !yay && !adding && tab === "todo";

  /* ── render: the tray ── */
  const typeCount = (k: WsType) => all.filter((t) => t.type === k).length;
  const whenCount = (k: WsWhen) => all.filter((t) => whenOf(t) === k).length;
  const toggleSet = <T,>(s: ReadonlySet<T>, v: T) => { const n = new Set(s); if (n.has(v)) n.delete(v); else n.add(v); return n; };
  const nFilters = filters.types.size + filters.whens.size;

  const row = (t: WsTask) => {
    const b = dayBit(t);
    const on = !!sel && sel.key === t.key && !adding && !yay;
    const house = t.group === "house";
    const glyph = t.query && (t.kind !== "fix") ? <StatusDot status={t.query.status as QueryStatus} overrideSize={18} decorative /> : null;
    return (
      <div key={t.key} className="tws-ti" role="button" tabIndex={0} data-tws-row={t.key} aria-current={on ? "true" : undefined}
        onClick={() => go(t.key)} onKeyDown={(e) => { if (e.key === "Enter") go(t.key); }} title={t.title}>
        {t.kind === "own" ? <span className="tws-av" data-k="own" aria-hidden="true" />
          : house ? <span className="tws-hk" data-tws="hk-icon" aria-hidden="true">{hkIcon(t)}{t.kind === "batch" ? null : <i>{initialsOf(t.agentName || t.title)}</i>}</span>
          : glyph ? <span className="tws-av" data-k="glyph" aria-hidden="true">{glyph}</span>
          : <span className="tws-av" aria-hidden="true">{initialsOf(t.agentName || t.title)}</span>}
        <span className="tws-tx"><b>{t.title}</b><span>{t.kind === "own" ? "Your task" : t.agency || t.agentName || ""}</span></span>
        {house ? <span className="tws-qf" data-tws="quick-fill">Quick fill</span>
          : <span className="tws-du" data-late={b.late ? "" : undefined}>{b.big ? <b>{b.big}</b> : null}{b.small ? <small>{b.small}</small> : null}</span>}
        <span className="tws-qact">
          <span role="button" tabIndex={0} aria-label={t.kind === "own" ? "Move it" : "Snooze"} title={t.kind === "own" ? "Move it" : "Snooze"}
            onClick={(e) => { e.stopPropagation(); go(t.key); setPop({ kind: "snooze", opener: e.currentTarget as HTMLElement }); }}>{ZZ}</span>
          <span role="button" tabIndex={0} aria-label={t.kind === "own" ? "Delete" : "Dismiss"} title={t.kind === "own" ? "Delete" : "Dismiss"}
            onClick={(e) => { e.stopPropagation(); go(t.key); setPop({ kind: "dismiss", opener: e.currentTarget as HTMLElement }); }}>{DIS}</span>
        </span>
      </div>
    );
  };

  /* ⚠️ DECLARED ABOVE trayBody, which reads it during render (an IIFE reading a later const is a TDZ that tsc cannot see) */
  const sectionsBody = (() => {
    if (!visible.length) return <div className="tws-empty">Nothing matches. <button type="button" onClick={() => setFilters(NO_WS_FILTERS)}>Show everything</button></div>;
    return sections.map((s) => {
      if (!s.tasks.length && s.id !== "yours") return null;
      const isShut = shut.has(s.id);
      const house = s.id === "house" && !hkMore && s.tasks.length > 4;
      const rows = house ? s.tasks.slice(0, 4) : s.tasks;
      return (
        <React.Fragment key={s.id}>
          <button type="button" className="tws-gb" data-band={s.band} aria-expanded={!isShut} onClick={() => setShut((x) => toggleSet(x, s.id))}>
            <b>{s.name}</b><em>{s.tasks.length}</em><span className="tws-cv" aria-hidden="true">⌄</span>
          </button>
          {isShut ? null : (
            <>
              {rows.map(row)}
              {house ? <button type="button" className="tws-more" onClick={() => setHkMore(true)}>Show {s.tasks.length - 4} more</button> : null}
              {s.id === "yours" ? <button type="button" className="tws-addt" onClick={() => { setYay(null); setAdding(true); }}>+ Add a task</button> : null}
            </>
          )}
        </React.Fragment>
      );
    });
  })();

  const trayBody = (() => {
    if (tab === "snoozed") {
      const byDay = new Map<string, SetAsideItem[]>();
      for (const a of [...snoozed].sort((x, y) => (x.until ?? "").localeCompare(y.until ?? ""))) {
        const k = a.until ? `Back on ${fmt(new Date(a.until))}` : "Snoozed";
        byDay.set(k, [...(byDay.get(k) ?? []), a]);
      }
      return (
        <>
          <p className="tws-note">Snoozed tasks come back to <b>To do</b> on their own. Bring one back early if you’re ready for it.</p>
          {snoozed.length === 0 ? <div className="tws-empty">Nothing snoozed.</div> : [...byDay].map(([k, list]) => (
            <React.Fragment key={k}>
              <div className="tws-dlab">{k}</div>
              {list.map((a) => (
                <div key={a.id} className="tws-ti" data-tws-snoozed={a.id}>
                  <span className="tws-av" data-k="muted" aria-hidden="true">{ZZ}</span>
                  <span className="tws-tx"><b>{asideTitle(a)}</b><span>{a.kind === "snooze" ? [a.who, "Snoozed"].filter(Boolean).join(" · ") : a.who}</span></span>
                  <span />
                  <button type="button" className="tws-bb" onClick={() => void bringBack(a)}>Bring back</button>
                </div>
              ))}
            </React.Fragment>
          ))}
        </>
      );
    }
    if (tab === "done") {
      const byDay = new Map<string, DoneRow[]>();
      for (const r of doneRows) { const k = dayWord(r.ms, today); byDay.set(k, [...(byDay.get(k) ?? []), r]); }
      return (
        <>
          <p className="tws-note">{clearedN ? <><b>{clearedN} cleared this week.</b> Anything you dismissed is here too, in case you change your mind.</> : "Nothing cleared yet this week."}</p>
          {[...byDay].map(([k, list]) => (
            <React.Fragment key={k}>
              <div className="tws-dlab">{k}</div>
              {list.map((r) => (
                <div key={r.key} className="tws-ti" data-muted={r.dis ? "" : undefined} data-tws-done={r.key}>
                  <span className="tws-av" data-k={r.dis ? "muted" : "done"} aria-hidden="true">{r.dis ? DIS : TICK}</span>
                  <span className="tws-tx"><b>{r.label}</b><span>{r.sub}</span></span>
                  <span />
                  {r.dis ? <button type="button" className="tws-bb" onClick={() => void bringBack(r.dis!)}>{r.dis.kind === "rule" ? "Turn back on" : "Bring back"}</button> : null}
                </div>
              ))}
            </React.Fragment>
          ))}
          {offRows.length ? <button type="button" className="tws-offlink" data-tws="off-open" onClick={(e) => setOffPop(e.currentTarget)}>Tasks you’ve switched off ({offRows.length})</button> : null}
        </>
      );
    }
    if (!all.length) return <div className="tws-empty">Nothing to do yet.</div>;
    const pt = prio.task;
    const start = pt ? (
      <button type="button" className="tws-start" data-tws="start" data-on={onIt ? "" : undefined} aria-current={onIt ? "true" : undefined}
        onClick={() => { setTab("todo"); setFilters(NO_WS_FILTERS); setShut(new Set()); go(pt.key); }}>
        <img src={QUILL} alt="" aria-hidden="true" />
        <span className="tws-stx">
          <span className="tws-sk2">{prio.urgent ? "Start here" : "Nothing urgent · next best"}</span>
          <b data-tws="start-phrase">{doingPhrase(pt)}</b>
          <em>{onIt ? "You’re on it" : startReason(prio)}</em>
        </span>
        {onIt ? null : <span className="tws-sarr" aria-hidden="true">→</span>}
      </button>
    ) : null;
    if (!visible.length) return <>{start}<div className="tws-empty">Nothing matches. <button type="button" onClick={() => setFilters(NO_WS_FILTERS)}>Show everything</button></div></>;
    return <>{start}{sectionsBody}</>;
  })();
  /* ── render: the desk ── */
  const desk = (() => {
    if (adding) return <AddTask today={today} onCancel={() => setAdding(false)} onAdd={async (text, due, detail) => {
      /* the desk goes back at once; the new task is opened when it lands, unless another has been picked meanwhile
         (the write resolves when the server answers, which can be after the writer has moved on) */
      setAdding(false);
      const before = selRef.current;
      const id = await addUserTask({ text, dueDate: due, ...(detail ? { detail } : {}) });
      flash(`Added “${text}”.`);
      if (id && selRef.current === before) go(id);
    }} />;
    if (yay) {
      const nx = yay.nextKey ? all.find((t) => t.key === yay.nextKey) ?? null : null;
      return (
        <div className="tws-wsx" data-tws="yay">
          <div className="tws-yay">
            <span className="tws-ytick">{TICK}</span>
            <h2>{yay.head}</h2>
            <p>{yay.msg}</p>
            {nx ? (
              <div className="tws-ynext"><span>Next up</span>
                <button type="button" className="tws-ynx" onClick={() => go(nx.key)}><b>{nx.title}</b><em>{nx.kind === "own" ? "Your task" : nx.agency || nx.agentName}</em><i>→</i></button>
              </div>
            ) : <button type="button" className="tws-go" onClick={() => go(order[0]?.key ?? null)}>Back to your tray</button>}
            {yay.undo ? <button type="button" className="tws-lnk" onClick={async () => { const u = yay.undo!; setYay(null); try { await u(); flash("Undone."); } catch { flash("Couldn’t undo that."); } }}>Undo</button> : null}
          </div>
        </div>
      );
    }
    if (!all.length) {
      return (
        <div className="tws-wsx"><div className="tws-calm">
          <img src={MENTOR} alt="" />
          <div><h2>Nothing to do yet</h2><p>Tasks show up here when something needs doing. You pick one from the tray and finish it right here.</p>
            <div className="tws-bt"><button type="button" className="tws-btn" data-k="k" onClick={() => openQueryDrawer({ mode: "log" } as never)}>+ Log a query</button><button type="button" className="tws-btn" data-k="o" onClick={() => setAdding(true)}>+ Add a task</button></div></div>
        </div></div>
      );
    }
    if (!sel) {
      return (
        <div className="tws-wsx"><div className="tws-calm">
          <img src={HOUR} alt="" />
          <div><h2>You’re all caught up.</h2><p>No agent is waiting on you and nothing needs a nudge.</p>
            <div className="tws-bt"><button type="button" className="tws-btn" data-k="o" onClick={() => setAdding(true)}>+ Add a task</button></div></div>
        </div></div>
      );
    }
    const t = deskT ?? sel;
    const chip = dueChip(t);
    const seqPos = seq.findIndex((x) => x.key === t.key);
    const band = t.group === "wait" ? "wait" : t.group;
    const meta = t.kind === "own" ? "Your task" : [t.agentName, t.agency && t.agency !== t.agentName ? t.agency : ""].filter(Boolean).join(" · ");
    const own = t.kind === "own" && t.userTask;
    const linked = own && (t.userTask!.queryId || t.userTask!.agentId);
    const linkQ = own && t.userTask!.queryId ? queries.find((q) => q.id === t.userTask!.queryId) ?? null : null;
    const linkA = own ? agents.find((a) => a.id === (t.userTask!.agentId ?? linkQ?.agentId)) ?? null : null;
    const steps = t.userTask?.steps ?? [];

    /* the questions column */
    let main: React.ReactNode;
    if (own) {
      main = (
        <>
          <div className="tws-mnote"><img src={MENTOR} alt="" /><p>{steps.length ? "This one’s yours. Tick the steps off as you go, then mark it done." : "This one’s yours. Mark it done when it’s finished, or break it into steps if it’s a big one."}</p></div>
          <WsOwnTask task={t.userTask!} today={today} agents={agents} queries={queries} picking={linkPicking} setPicking={setLinkPicking}
            titleOf={(id) => manuscripts.find((m) => m.id === id)?.title?.trim() || null}
            w={{ update: (f) => updateUserTask(t.userTask!.id, f), done: () => void ownDone(t), said: (m) => flash(m) }} />
        </>
      );
    } else if (flow) {
      /* the nudge and Gone quiet lines read the agent's stated reply time, where one is set */
      const facts = t.kind === "quiet" || t.kind === "nudge" ? quietFacts(t) : undefined;
      const curQ = cur < qs.length ? qs[cur] : null;
      main = (
        <>
          <div className="tws-mnote"><img src={MENTOR} alt="" /><p>{mentorLine(t, facts)}</p></div>
          {/* v52 Part C — the answers so far, as chips; only the open question below them; nothing upcoming */}
          {cur > 0 ? (
            <div className="tws-ans" data-tws="answers">
              {qs.slice(0, cur).map((q, i) => (
                <button key={q.key} type="button" className="tws-ach" data-tws-qa={q.key} title={q.title} aria-label={`${q.title}: ${q.summary}. Change`} onClick={() => setQi(i)}>
                  <span className="tws-ack" aria-hidden="true">{TICK}</span><b>{q.summary}</b><em aria-hidden="true">Change</em>
                </button>
              ))}
            </div>
          ) : null}
          {curQ ? (
            <div key={curQ.key} className="tws-q" data-tws-q={curQ.key}>
              <div className="tws-qh"><span className="tws-qn">{cur + 1}</span>{curQ.title}</div>
              {curQ.hint ? <span className="tws-hint">{curQ.hint}</span> : null}
              <div className="tws-qbody">{curQ.body}</div>
            </div>
          ) : null}
          {allDone && flow.commit ? (
            <div className="tws-story" data-tws="story">
              <span className="tws-sk">That’s everything. Here’s what gets logged:</span>
              <p>{flow.sentence}</p>
              <ul>{flow.consequences.map((c) => <li key={c}>{TICK}{c}</li>)}</ul>
            </div>
          ) : null}
        </>
      );
    }

    /* the card preview column */
    const ms = t.query ? manuscripts.find((m) => m.id === t.query!.manuscriptId) ?? null : manuscripts[0] ?? null;
    /* the pending change shows once something has been answered */
    const previewDraft = flow && Object.values(A).some((v) => v !== undefined) ? flow.draft : flow ? { section: flow.draft.section } : null;
    const previewFor = () => {
      if (own) {
        if (linkQ) return (
          <ScaledCard kind="query" focusKey={linkQ.id} label={`Open the full query card ↗`} onOpen={() => openLinked(t.userTask!)}>
            <PreviewQueryCard q={linkQ} row={cardRows.get(linkQ.id) ?? null} agent={linkA} queries={queries} manuscripts={manuscripts} manuscript={manuscripts.find((m) => m.id === linkQ.manuscriptId) ?? null} packages={packages} log={linkLog} draft={null} nowMs={now} quietWeeks={quietWeeks} free={cardFree} />
          </ScaledCard>
        );
        if (linkA) return (
          <ScaledCard kind="agent" focusKey={linkA.id} label="Open the full agent card ↗" onOpen={() => openLinked(t.userTask!)}>
            <PreviewAgentCard agent={linkA} queries={queries} activities={activities} agents={agents} manuscript={manuscripts[0] ?? null} manuscripts={manuscripts} personalGenres={currentUser?.personalGenres ?? []} draft={null} nowMs={now} />
          </ScaledCard>
        );
        return null;
      }
      if (t.kind === "fix" && t.agent) return (
        <ScaledCard kind="agent" focusKey={`${t.key}|${JSON.stringify(previewDraft?.agentPatch ?? {})}`} label="Open the full agent card ↗" onOpen={() => openCard(t)}>
          <PreviewAgentCard agent={t.agent} queries={queries} activities={activities} agents={agents} manuscript={ms} manuscripts={manuscripts} personalGenres={currentUser?.personalGenres ?? []} draft={previewDraft} nowMs={now} />
        </ScaledCard>
      );
      if (t.query) return (
        <ScaledCard kind="query" focusKey={`${t.key}|${previewDraft?.status ?? ""}|${previewDraft?.ghost ? 1 : 0}`} label="Open the full query card ↗" onOpen={() => openCard(t)}>
          <PreviewQueryCard q={t.query} row={cardRows.get(t.query.id) ?? null} agent={t.agent ?? null} queries={queries} manuscripts={manuscripts} manuscript={ms} packages={packages} log={qLog} draft={previewDraft} nowMs={now} quietWeeks={quietWeeks} free={cardFree} />
        </ScaledCard>
      );
      return null;
    };
    const side = own && !linked ? <div className="tws-wp"><div className="tws-wpl"><span>Linked card</span></div><OwnEmptySide onLink={() => setLinkPicking(true)} /></div>
      : (() => { const p = previewFor(); return p ? (
        <div className="tws-wp" data-tws="side">
          {own ? <div className="tws-wpl"><span>{`Linked: ${(linkA?.name || linkA?.agency || "").trim().split(/\s+/)[0]}’s ${linkQ ? "query" : "agent"} card`}</span></div> : null}
          {p}
        </div>
      ) : null; })();

    /* the footer (v52 Part C): the questions column's own. Snooze and Dismiss on the left; "n of m" and the ONE primary
       button on the right, always in this place — nothing advances until it is pressed */
    let primary: React.ReactNode = null;
    let progress: string | null = null;
    if (own) {
      progress = steps.length ? `${steps.filter((x) => x.done).length} of ${steps.length} steps` : null;
      primary = <button type="button" className="tws-go" data-tws="primary" disabled={busy} onClick={() => void ownDone(t)}>{TICK}Mark done</button>;
    } else if (flow) {
      const q = cur < qs.length ? qs[cur] : null;
      const last = cur === qs.length - 1;
      if (q && flow.door && last && q.answered) {
        primary = <button type="button" className="tws-go" data-tws="primary" onClick={flow.door.open}>{flow.door.label}</button>;
      } else if (q) {
        primary = <button type="button" className="tws-go" data-tws="primary" data-next="" disabled={!q.answered} onClick={() => setQi(cur + 1)}>{last && !(t.kind === "quiet" && !A.act) ? "Continue" : "Next"} →</button>;
      } else if (allDone && flow.commit) {
        primary = <button type="button" className="tws-go" data-tws="primary" data-log="" disabled={busy} onClick={() => void logIt()}>{TICK}Log it</button>;
      } else if (!qs.length && flow.door) {
        primary = <button type="button" className="tws-go" data-tws="primary" onClick={flow.door.open}>{flow.door.label}</button>;
      }
      progress = !qs.length ? null : allDone ? "Ready to log" : `${cur + 1} of ${t.kind === "quiet" && !A.act ? "a few" : qs.length}`;
    }
    const foot = (
      <div className="tws-wf" data-tws="footer">
        <button ref={snzRef} type="button" className="tws-sb" aria-label={own ? "Move it" : "Snooze"} title={own ? "Move it (S)" : "Snooze (S)"} aria-expanded={pop?.kind === "snooze"} onClick={(e) => setPop(pop?.kind === "snooze" ? null : { kind: "snooze", opener: e.currentTarget })}>{ZZ}<span>{own ? "Move it" : "Snooze"}</span><kbd>S</kbd></button>
        <button ref={disRef} type="button" className="tws-sb" aria-label={own ? "Delete" : "Dismiss"} title={own ? "Delete (D)" : "Dismiss (D)"} aria-expanded={pop?.kind === "dismiss"} onClick={(e) => setPop(pop?.kind === "dismiss" ? null : { kind: "dismiss", opener: e.currentTarget })}>{DIS}<span>{own ? "Delete" : "Dismiss"}</span><kbd>D</kbd></button>
        <span className="tws-sp" />
        {progress ? <em className="tws-prog" data-tws="progress">{progress}</em> : null}
        {primary}
      </div>
    );

    return (
      <div className="tws-wsx" data-tws="desk" style={{ containerType: "inline-size" } as React.CSSProperties}>
        <div className="tws-wh" data-band={band}>
          <h2 data-tws="desk-title">{t.kind === "batch" && bCur ? `${t.first} · ${bRemaining.indexOf(bCur) + 1} of ${bRemaining.length}` : t.title}</h2>
          {meta ? <span className="tws-m">{t.kind === "batch" ? t.agency || meta : meta}</span> : null}
          <span className="tws-sp" />
          {chip ? <span className="tws-dchip" data-late={chip.late ? "" : undefined}><b>{chip.b}</b>{chip.s ? ` ${chip.s}` : ""}</span> : null}
          {seqPos >= 0 ? <span className="tws-pos" data-tws="pos"><b>{seqPos + 1}</b>/{seq.length}</span> : null}
          <button type="button" className="tws-wb" aria-label="Previous task (K)" title="Previous (K)" onClick={() => move(-1)}>‹</button>
          <button type="button" className="tws-wb" aria-label="Next task (J)" title="Next (J)" onClick={() => move(1)}>›</button>
        </div>
        <div className="tws-wbody">
          <div className="tws-wcol" data-tws="qcol">
            <div className="tws-wq">{main}{t.kind === "batch" && bRemaining.length > 1 && !yay ? (
              <div className="tws-skip"><button type="button" className="tws-lnk" data-tws="skip" onClick={skipOne}>Skip this one</button></div>
            ) : null}</div>
            {foot}
          </div>
          {side}
        </div>
        {pop?.kind === "snooze" ? <SnoozePop t={t} today={today} limit={limitFor(t)} opener={pop.opener} onClose={() => setPop(null)} onSnooze={(d, u) => void doSnooze(t, d, u)} /> : null}
        {pop?.kind === "dismiss" ? (
          <DismissPop t={t} ruleWord={(() => { const r = (t.item.card as BoardCard & { sweepRule?: string }).sweepRule; return r && r in RULE_PLAIN ? RULE_PLAIN[r] : null; })()}
            opener={pop.opener} onClose={() => setPop(null)} onSnoozeInstead={() => setPop({ kind: "snooze", opener: snzRef.current })} onChoose={(c) => void doDismiss(t, c)} />
        ) : null}
      </div>
    );
  })();

  return (
    <div ref={rootRef} className="tws-root" data-tws="root">
      <WorkspacePageGrid className="tws-wpg" scrollLabel="To-do list" masthead={null}>
        <div className="tws" data-tws="page">
          <header className="tws-hd" data-tws="header">
            <div className="tws-ht">
              <h1 className="tws-ttl" data-page-title>Your to-do list</h1>
              <p className="tws-stats" data-tws="stats">
                {statBook ? <>{statBook} · </> : null}<b>{seq.length}</b> to do · <b>{lateN}</b> late · <b>{clearedN}</b> cleared this week
              </p>
            </div>
            <span className="tws-sp" />
            <button type="button" className="tws-addb" onClick={() => { setYay(null); setAdding(true); }}>+ Add a task</button>
          </header>

          <div className="tws-ws" data-tws="workspace" data-slim={slim ? "" : undefined}>
            {slim ? (
              <aside className="tws-tray tws-strip" data-tws="tray" data-slim="" aria-label="Your tasks">
                <button type="button" className="tws-wide" data-tws="expand" onClick={() => setSlim(false)}>{SVG_WIDE}<span>All tasks</span></button>
                <div className="tws-sl" data-tws="list">
                  {sections.map((sec) => (sec.tasks.length ? (
                    <React.Fragment key={sec.id}>
                      <div className="tws-sgb" data-band={sec.band}>{grouping === "category" ? STRIP_GROUP[sec.id as WsGroupId] ?? sec.name : sec.name}<em>{sec.tasks.length}</em></div>
                      {sec.tasks.map((t) => {
                        const w = stripWords(t);
                        const on = !!sel && sel.key === t.key && !adding && !yay;
                        const glyph = t.query && t.kind !== "fix" ? <StatusDot status={t.query.status as QueryStatus} overrideSize={16} decorative /> : null;
                        return (
                          <button key={t.key} type="button" className="tws-si" data-tws-row={t.key} data-tws-strip="" aria-current={on ? "true" : undefined} title={t.title} onClick={() => go(t.key)}>
                            <span className="tws-sav" data-k={t.kind === "own" ? "own" : t.group === "house" ? "house" : undefined} aria-hidden="true">
                              {t.kind === "own" ? null : t.group === "house" ? hkIcon(t) : glyph ?? initialsOf(t.agentName || t.title)}
                            </span>
                            <b data-tws="strip-name">{w.name}</b>
                            <i data-tws="strip-what">{w.what}</i>
                            {w.when ? <small data-tws="strip-when" data-hot={w.hot ? "" : undefined}>{w.when}</small> : null}
                          </button>
                        );
                      })}
                    </React.Fragment>
                  ) : null))}
                </div>
              </aside>
            ) : (
            <aside className="tws-tray" data-tws="tray" aria-label="Your tasks">
              <div className="tws-th">
                <div className="tws-seg" role="group" aria-label="Show">
                  <button type="button" aria-pressed={tab === "todo"} onClick={() => setTab("todo")}>To do <b data-tws="todo-count">{seq.length}</b></button>
                  <button type="button" aria-pressed={tab === "snoozed"} onClick={() => setTab("snoozed")}>Snoozed <b>{snoozed.length}</b></button>
                  <button type="button" aria-pressed={tab === "done"} onClick={() => setTab("done")}>Done <b>{clearedN}</b></button>
                </div>
                {tab === "todo" ? (
                  <>
                    <div className="tws-row">
                      <label className="tws-find">{SVG_FIND}<input ref={findRef} placeholder="Search tasks" value={filters.q} aria-label="Search tasks or agents"
                        onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} onKeyDown={(e) => { if (e.key === "Escape") { setFilters((f) => ({ ...f, q: "" })); (e.target as HTMLInputElement).blur(); } }} /></label>
                      <span style={{ position: "relative" }}>
                        <button type="button" ref={filtRef} className="tws-ib" data-on={nFilters ? "" : undefined} aria-label="Filters" aria-expanded={menu === "f"} onClick={() => setMenu(menu === "f" ? null : "f")}>{SVG_FILTER}{nFilters ? <span className="tws-nb">{nFilters}</span> : null}</button>
                        {menu === "f" ? (
                          <div className="tws-menu" role="dialog" aria-label="Filters" style={{ right: -44 }}>
                            <h6>Task type</h6>
                            <div className="tws-fcs">{WS_TYPES.map((k) => <button key={k} type="button" className="tws-fc" aria-pressed={filters.types.has(k)} disabled={!typeCount(k)} onClick={() => setFilters((f) => ({ ...f, types: toggleSet(f.types, k) }))}>{k}<em>{typeCount(k)}</em></button>)}</div>
                            <h6>When</h6>
                            <div className="tws-fcs">{WS_WHENS.map((k) => <button key={k} type="button" className="tws-fc" aria-pressed={filters.whens.has(k)} disabled={!whenCount(k)} onClick={() => setFilters((f) => ({ ...f, whens: toggleSet(f.whens, k) }))}>{k}<em>{whenCount(k)}</em></button>)}</div>
                            {/* tag management's way in (the retired tray's Tags panel: TagsPane, the only place tags are edited) */}
                            <button type="button" className="tws-mlink" data-tws="tags-open" onClick={() => { setMenu(null); setTagsOpen(true); }}>Manage your tags</button>
                            {offRows.length ? <button type="button" className="tws-mlink tws-mlink--off" data-tws="off-open" onClick={() => { setMenu(null); setOffPop(filtRef.current); }}>Tasks you’ve switched off ({offRows.length})</button> : null}
                          </div>
                        ) : null}
                      </span>
                      <span style={{ position: "relative" }}>
                        <button type="button" className="tws-ib" data-on={grouping !== "category" ? "" : undefined} aria-label="Group" aria-expanded={menu === "g"} onClick={() => setMenu(menu === "g" ? null : "g")}>{SVG_GROUP}</button>
                        {menu === "g" ? (
                          <div className="tws-menu" role="dialog" aria-label="Group the tray by">
                            <h6>Group the tray by</h6>
                            {WS_GROUPINGS.map((g) => (
                              <button key={g.id} type="button" className="tws-gopt" role="radio" aria-checked={grouping === g.id} onClick={() => { setGrouping(g.id); setShut(new Set()); setMenu(null); }}>
                                <i /><span><b>{g.label}</b><small>{g.hint}</small></span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </span>
                      <button type="button" className="tws-ib" data-tws="collapse" aria-label="Collapse the tray" title="Collapse the tray" onClick={() => setSlim(true)}>{SVG_SLIM}</button>
                    </div>
                    {nFilters ? (
                      <div className="tws-chips">
                        {[...filters.types].map((k) => <button key={k} type="button" className="tws-chip" onClick={() => setFilters((f) => ({ ...f, types: toggleSet(f.types, k) }))}>{k}<i>✕</i></button>)}
                        {[...filters.whens].map((k) => <button key={k} type="button" className="tws-chip" onClick={() => setFilters((f) => ({ ...f, whens: toggleSet(f.whens, k) }))}>{k}<i>✕</i></button>)}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
              <div className="tws-tl" data-tws="list">{trayBody}</div>
            </aside>
            )}
            <section className="tws-desk" data-tws="desk-col">{desk}</section>
          </div>
        </div>
      </WorkspacePageGrid>
      {offPop && offRows.length ? <SwitchedOffPop rows={offRows} opener={offPop} onClose={() => setOffPop(null)} onTurnOn={(r) => void turnOn(r)} /> : null}
      {tagsOpen && filtRef.current ? (
        <AnchoredPanel anchor={filtRef.current} ariaLabel="Tags" variant="panel" onClose={(back) => { setTagsOpen(false); if (back) filtRef.current?.focus(); }}>
          <TagsPane />
        </AnchoredPanel>
      ) : null}
      {toast ? (
        <div className="tws-layer tws-toast" role="status" data-tws="toast">
          <span>{toast.msg}</span>
          {toast.undo ? <button type="button" onClick={async () => { const u = toast.undo!; setToast(null); try { await u(); } catch { flash("Couldn’t undo that."); } }}>Undo</button> : null}
        </div>
      ) : null}
    </div>
  );
};

/** + Add a task: the words, a date, and notes. No "task or note" question: a task always has a date.
 *  Exported for the Corkboard's "Add a task" (Corkboard v2), which hosts THIS form rather than a copy. */
export const AddTask: React.FC<{ today: Date; onCancel: () => void; onAdd: (text: string, due: string, detail: string) => Promise<void> }> = ({ today, onCancel, onAdd }) => {
  const [text, setText] = useState("");
  const [due, setDue] = useState<string | null>(null);
  const [cal, setCal] = useState(false);
  const [notes, setNotes] = useState("");
  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const opts: [string, string][] = [["Today", ymd(today)], ["Tomorrow", ymd(addDays(today, 1))], ["Next week", ymd(addDays(today, ((8 - today.getDay()) % 7) || 7))]];
  useEscapeLayer(true, onCancel, ESC_LEVEL.page);
  const ready = text.trim().length > 0 && !!due;
  return (
    <div className="tws-wsx" data-tws="add">
      <div className="tws-wh" data-band="yours"><h2>A new task</h2></div>
      <div className="tws-addcard">
        <input className="tws-newt" autoFocus placeholder="What do you need to do?" value={text} onChange={(e) => setText(e.target.value)} aria-label="What do you need to do" />
        <span className="tws-lbl">When’s it due?</span>
        <div className="tws-opts" role="radiogroup" aria-label="When it’s due">
          {opts.map(([l, v]) => <button key={l} type="button" role="radio" aria-checked={due === v && !cal} onClick={() => { setCal(false); setDue(v); }}>{l}</button>)}
          <button type="button" role="radio" aria-checked={cal} onClick={() => setCal(true)}>{cal && due ? fmt(dayFromYmd(due)) : "A date…"}</button>
        </div>
        {cal ? <div style={{ marginTop: 10 }}><DatePick value={due ? dayFromYmd(due) : addDays(today, 1)} today={addDays(today, -1)} dir="future" onPick={(d) => setDue(ymd(d))} /></div> : null}
        <span className="tws-lbl">Notes <i style={{ fontWeight: 400 }}>· optional</i></span>
        <textarea className="tws-ta" placeholder="Anything to remember" value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Notes" />
      </div>
      <div className="tws-wf">
        <button type="button" className="tws-sb" onClick={onCancel}>Cancel</button>
        <span className="tws-sp" />
        <button type="button" className="tws-go" disabled={!ready} onClick={() => void onAdd(text.trim(), due!, notes.trim())}>Add to your tray →</button>
      </div>
    </div>
  );
};
