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
  NO_WS_FILTERS, WS_GROUPINGS, WS_GROUPS, breakdownOf, dueChip, mentorLine, passes, milestoneFor, trayFigure, wsSections,
  type DoneRow, type WsFilters, type WsGrouping, type WsTask,
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
import { DatePick, DeskTiles, DIS, FORM, QUIET_MARK, TICK, ZZ, dayFromYmd } from "./WsControls";
import { NUDGE_MARK } from "../../queries/centre/QcBubble152";
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
import "./todoWs54.css";
import { WsHeader54 } from "./WsHeader54";
import { WsBatch54 } from "./WsBatch54";
import { openingView, type BatchView } from "../../../lib/todoBatch54";
import { devBatchCap } from "../../../lib/todoBatchReviewAid";
import { needRows } from "../../../lib/todoHeader54";
import "./todoWs55.css";
import { WsTrayHead55, SVG_EXPAND } from "./WsTrayHead55";
import { filterLine, stripCounts } from "../../../lib/todoTrayHead55";

const MENTOR = "/images/todo/mentor.webp";
const HOUR = "/images/todo/hour.webp";
/* v55 (D6): the collapse and the grouping are saved to the writer's prefs (todoPrefs.trayCollapsed / trayGrouping, one
   leaf each, beside v54's batchView); v52's per-device `sa.todoTraySlim` is no longer read */
const DAY = 86400000;
const UNDO_MS = 7000;
/** v53 (D10): the snackbar after a log runs for 6s; the stamp holds the logged task on the desk for ~850ms first */
const SNACK_MS = 6000;
const STAMP_MS = 850;
const LEAVE_MS = 380;
const reducedMotion = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };


const initialsOf = (n: string) => { const w = n.trim().split(/\s+/).filter(Boolean); return (w.length > 1 ? w[0][0] + w[w.length - 1][0] : (w[0] ?? "").slice(0, 2)).toUpperCase() || "··"; };
const dayWord = (ms: number, today: Date): string => {
  const d = new Date(ms); const n = dayDiff(new Date(d.getFullYear(), d.getMonth(), d.getDate()), today);
  return n === 0 ? "Today" : n === -1 ? "Yesterday" : `${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
};

const dayIsoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** the check step's day words: Today, Yesterday, Tomorrow, else "31 Jan" */
const whenWord3 = (d: Date, today: Date): string => { const n = dayDiff(d, today); return n === 0 ? "Today" : n === -1 ? "Yesterday" : n === 1 ? "Tomorrow" : fmt(d); };

/** v53 (D10): a cleared group's words (the button names the next group, or the desk) */
const MILESTONE: Partial<Record<string, { head: string; msg: string }>> = {
  wait: { head: "No agents waiting on you.", msg: "You’ve sent everything that was asked for." },
  nudge: { head: "No nudges due.", msg: "Every nudge on your list is logged." },
  quiet: { head: "Nothing’s gone quiet.", msg: "Every quiet query has an answer from you." },
  house: { head: "Housekeeping’s done.", msg: "Every gap on your list is filled in." },
  yours: { head: "Your own tasks are done.", msg: "Nothing of yours is left on the list." },
};

interface Toast { msg: string; sub?: string; undo?: () => Promise<void>; id: number }
/** v53 (D10): the task just logged, held on the desk and in the tray while it is stamped and slides out */
interface Held { task: WsTask; phase: "stamp" | "leave" }
/** v53 (D10): the celebration, for a milestone only — a group emptied, or the whole list */
interface Mile { head: string; msg: string; btn: string }

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
  const { today, todayYmd, hkGroups: _hk, all: liveAll, quietFacts, limitFor, snoozeTask, openCard, snoozed, doneRows, asideTitle, offRows } = core;
  void _hk;

  /* v53 (D10): while a logged task is stamped and slides out it stays in the tray (the save has already taken it off
     the live board); the counts tick over once it has gone */
  const [held, setHeld] = useState<Held | null>(null);
  const [mile, setMile] = useState<Mile | null>(null);
  const all = useMemo(() => (held && !liveAll.some((t) => t.key === held.task.key) ? [...liveAll, held.task] : liveAll), [liveAll, held]);
  const logged = !!held;

  /* ── the tray: tab, filters, grouping ── */
  const [tab, setTab] = useState<"todo" | "snoozed" | "done">("todo");
  const [filters, setFilters] = useState<WsFilters>(NO_WS_FILTERS);
  const filtRef = useRef<HTMLButtonElement>(null);
  const [tagsOpen, setTagsOpen] = useState(false);
  /* v55 (D6): the grouping and the collapse come back from the writer's prefs; a choice made here wins until the page
     is left, and is written as one leaf each. Filters and search are never saved. */
  const prefs = currentUser?.todoPrefs as { trayGrouping?: WsGrouping; trayCollapsed?: boolean } | undefined;
  const [groupingPick, setGroupingPick] = useState<WsGrouping | null>(null);
  const grouping: WsGrouping = groupingPick ?? (WS_GROUPINGS.some((g) => g.id === prefs?.trayGrouping) ? prefs!.trayGrouping! : "category");
  const [menu, setMenuState] = useState(false);
  /* v55 (D2): search turns the head's one line into a field */
  const [searching, setSearching] = useState(false);
  /* v53 (D4): Housekeeping starts folded — its header, its count and Quick fill; the header opens it */
  const [shut, setShut] = useState<ReadonlySet<string>>(() => new Set(["house"]));
  const [hkMore, setHkMore] = useState(false);
  const [slimPick, setSlimPick] = useState<boolean | null>(null);
  const slim = slimPick ?? prefs?.trayCollapsed === true;
  const setMenu = (open: boolean) => { setMenuState(open); };
  const setSlim = (v: boolean) => {
    setSlimPick(v); setMenuState(false);
    void updateUserPaths({ "todoPrefs.trayCollapsed": v }).catch(() => flash("Couldn’t save that choice."));
  };
  const setGrouping = (g: WsGrouping) => {
    setGroupingPick(g); setShut(new Set());
    void updateUserPaths({ "todoPrefs.trayGrouping": g }).catch(() => flash("Couldn’t save that choice."));
  };
  const visible = useMemo(() => all.filter((t) => passes(t, filters)), [all, filters]);
  const sections = useMemo(() => wsSections(visible, grouping), [visible, grouping]);
  const order = useMemo(() => sections.flatMap((s) => (shut.has(s.id) ? [] : s.tasks)), [sections, shut]);
  /* ⚠️ ONE COUNT (v51.1): the To do tab, the desk's "n/m" and the group headings all count the rows the tray holds —
     every group, Housekeeping's one-row-per-agent included, a collapsed group too. ‹ › still step only the open groups. */
  const seq = useMemo(() => sections.flatMap((s) => s.tasks), [sections]);
  useEscapeLayer(menu, () => setMenuState(false), ESC_LEVEL.page);
  const openSearch = () => { setTab("todo"); setMenuState(false); setSearching(true); };
  const closeSearch = () => { setSearching(false); setFilters((f) => ({ ...f, q: "" })); };

  /* ── selection ── */
  const [selKey, setSelKey] = useState<string | null>(null);
  const selRef = useRef<string | null>(null);
  selRef.current = selKey;
  const sel = order.find((t) => t.key === selKey) ?? all.find((t) => t.key === selKey) ?? order[0] ?? null;
  const [A, setA] = useState<Answers>({});
  const [qi, setQi] = useState(0);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pop, setPop] = useState<{ kind: "snooze" | "dismiss"; opener: HTMLElement | null } | null>(null);
  /** v52 (7 Nov): "Tasks you've switched off", opened from the Done tab's foot or the Filters menu */
  const [offPop, setOffPop] = useState<HTMLElement | null>(null);
  const [linkPicking, setLinkPicking] = useState(false);
  /* v54 (D9): the batch's view this time round (null: the saved choice, else by size); the row whose card the side shows */
  const [batchView, setBatchView] = useState<BatchView | null>(null);
  const [batchFocus, setBatchFocus] = useState<string | null>(null);
  /* the batch row's place (v51.1): queries skipped this time round, and queries saved but not yet gone from the board */
  /* ⚠️ DECLARED ABOVE `go`, which resets its skips (moved to useWsBatch, unchanged) */
  const batch = useWsBatch(sel, selKey, setSelKey, all);
  const { bRemaining, bCur, deskT } = batch;
  const go = useCallback((key: string | null) => {
    setSelKey(key); setA({}); setQi(0); setMile(null); setAdding(false); setPop(null); setLinkPicking(false); batch.resetSkip(); setBatchView(null); setBatchFocus(null);
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
    if (compose) { setMile(null); setAdding(true); }
  }, [location.pathname, collectionsReady]); // eslint-disable-line react-hooks/exhaustive-deps
  /* the shell's "+ Task" while already on /todo: an event, not the one-shot key (AppShell, TODO_OPEN_COMPOSER) */
  useEffect(() => {
    const on = () => { setMile(null); setAdding(true); };
    window.addEventListener(TODO_OPEN_COMPOSER, on);
    return () => window.removeEventListener(TODO_OPEN_COMPOSER, on);
  }, []);

  /* ── the toast ── */
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number | null>(null);
  const toastSeq = useRef(0);
  const flash = useCallback((msg: string, undo?: () => Promise<void>, sub?: string) => {
    setToast({ msg, undo, sub, id: ++toastSeq.current });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), sub ? SNACK_MS : undo ? UNDO_MS : 3200);
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

  /* ── v53 (D1): the questions scroll above the pinned footer; the footer takes a soft shadow while more is hidden
     beneath its edge. Derived from the scroller's own numbers on scroll, resize and any change inside it. ── */
  const [wqEl, setWqEl] = useState<HTMLDivElement | null>(null);
  const [over, setOver] = useState(false);
  useEffect(() => {
    const el = wqEl;
    if (!el) { setOver(false); return undefined; }
    const f = () => setOver(el.scrollHeight > el.clientHeight + 2 && el.scrollTop + el.clientHeight < el.scrollHeight - 2);
    f();
    el.addEventListener("scroll", f, { passive: true });
    const ro = new ResizeObserver(f); ro.observe(el);
    const mo = new MutationObserver(f); mo.observe(el, { subtree: true, childList: true, characterData: true });
    return () => { el.removeEventListener("scroll", f); ro.disconnect(); mo.disconnect(); };
  }, [wqEl]);

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
  const qLog = useQueryLog(currentUser?.id ?? null, (sel?.kind === "batch" ? batchFocus : null) ?? deskT?.query?.id ?? null);
  const linkLog = useQueryLog(currentUser?.id ?? null, deskT?.kind === "own" ? deskT.userTask?.queryId ?? null : null);
  const userFirst = (currentUser?.name ?? "").trim().split(/\s+/)[0] || "";
  const flow: Flow | null = useMemo(() => core.makeFlow(sel, deskT, A, setA, (m) => flash(m)),
    [sel, deskT, A, today, currentUser?.id, userFirst, queries, agents, manuscripts, activities, taskFlags]); // eslint-disable-line react-hooks/exhaustive-deps

  const qs = flow?.questions ?? [];
  const cur = Math.min(qi, qs.length);
  const allDone = qs.length > 0 && cur >= qs.length;
  /* v53 (D7): the check step is open once every question is answered, on any flow that logs */
  const onCheck = !!flow?.commit && cur >= qs.length;

  /**
   * v53 (D10) — "STAMP, THEN ON". Log it saves, then for ~850ms the desk shows it landed (the button reads "✓ Logged", the
   * card's new step is real and stamped, the row's glyph ticks); then the row slides out, the desk crossfades to the next
   * task, the counts tick over and the snackbar names what happened, with Undo. Only a milestone — a group emptied, or
   * the whole list — earns the celebration.
   * ⚠️ Undo is the save's own (the drawer's snapshot): every document back, and the task back in its place.
   */
  const finish = (t: WsTask, next: string | null, d: FlowDone, groupGone: boolean, listGone: boolean) => {
    const go2 = () => {
      setHeld(null);
      go(next);
      const undo = d.undo ? async () => { await d.undo!(); setMile(null); go(t.key); } : undefined;
      flash(d.snack?.msg ?? d.head, undo, d.snack?.sub ?? d.msg);
      if (listGone) setMile({ head: "All caught up.", msg: "Nothing needs you right now.", btn: "Back to the desk" });
      else if (groupGone) {
        const name = WS_GROUPS.find((g) => g.id === t.group)?.name ?? "";
        const nextG = next ? WS_GROUPS.find((g) => g.id === all.find((x) => x.key === next)?.group)?.name ?? null : null;
        const m = MILESTONE[t.group] ?? { head: `${name} is clear.`, msg: "" };
        setMile({ head: m.head, msg: m.msg, btn: nextG ? `On to ${nextG.toLowerCase()} →` : "Back to the desk" });
      }
    };
    if (reducedMotion()) { go2(); return; }
    setHeld({ task: t, phase: "stamp" });
    window.setTimeout(() => {
      setHeld((h) => (h && h.task.key === t.key ? { ...h, phase: "leave" } : h));
      window.setTimeout(go2, LEAVE_MS);
    }, STAMP_MS);
  };
  const logIt = async () => {
    if (!sel || !flow?.commit || busy || held) return;
    setBusy(true);
    const t = sel;
    const next = nextKeyAfter(t);
    const ms = milestoneFor(all, t);
    const groupGone = ms === "group", listGone = ms === "list";
    try {
      const d = await flow.commit();
      /* a batch with more to go: the snackbar, and the next query opens; the stamp waits for the last */
      if (t.kind === "batch" && bCur && bRemaining.length > 1) {
        const qid = bCur.queryId;
        batch.markSaved(qid);
        setA({}); setQi(0);
        flash(d.snack?.msg ?? d.msg, d.undo ? async () => { await d.undo!(); batch.unmarkSaved(qid); } : undefined, d.snack?.sub);
        return;
      }
      finish(t, next, d, groupGone, listGone);
    } catch (e) {
      console.error("[to-do] the save failed", e);
      flash("Couldn’t save that. Nothing was changed.");
    } finally { setBusy(false); }
  };
  const ownDone = async (t: WsTask) => {
    const u = t.userTask;
    if (!u || busy || held) return;
    setBusy(true);
    const next = nextKeyAfter(t);
    const ms = milestoneFor(all, t);
    const groupGone = ms === "group", listGone = ms === "list";
    try {
      const undo = await core.ownDoneWrite(u);
      finish(t, next, { head: "Done.", msg: "", undo, snack: { msg: `Done: “${(u.text ?? "").trim() || "your task"}”`, sub: "it’s on your Done list" } }, groupGone, listGone);
    } catch { flash("Couldn’t save that. Nothing was changed."); } finally { setBusy(false); }
  };

  /* v53 (D8): the new bubble's paperclip lists what went; the card is a picture (inert), so the hover is read off the
     chip's place under the pointer and the list is drawn over the page, where nothing can cut it off */
  const [clipPop, setClipPop] = useState<{ x: number; y: number } | null>(null);
  const clipHover = (e: React.MouseEvent<HTMLElement>) => {
    const c = e.currentTarget.querySelector<HTMLElement>('[data-qc153="clip"]');
    const r = c?.getBoundingClientRect();
    const inside = !!r && e.clientX >= r.left - 2 && e.clientX <= r.right + 2 && e.clientY >= r.top - 2 && e.clientY <= r.bottom + 2;
    if (inside && r && !clipPop) setClipPop({ x: r.left + r.width / 2, y: r.bottom });
    else if (!inside && clipPop) setClipPop(null);
  };

  /* ── keys: J/K move, S snooze, D dismiss, / find, N add ── */
  const snzRef = useRef<HTMLButtonElement>(null);
  const disRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (location.pathname !== "/todo" || isEditableTarget(e.target) || escapeDepth() > 0 || e.metaKey || e.ctrlKey || e.altKey) return;
      if (matchesShortcut(SHORTCUTS.todoDown, e) && tab === "todo") { e.preventDefault(); move(1); }
      else if (matchesShortcut(SHORTCUTS.todoUp, e) && tab === "todo") { e.preventDefault(); move(-1); }
      else if (matchesShortcut(SHORTCUTS.todoSearch, e)) { e.preventDefault(); openSearch(); }
      else if (matchesShortcut(SHORTCUTS.todoSnooze, e) && sel && !held && !adding) { e.preventDefault(); setPop({ kind: "snooze", opener: snzRef.current }); }
      else if (matchesShortcut(SHORTCUTS.todoDismiss, e) && sel && !held && !adding) { e.preventDefault(); setPop({ kind: "dismiss", opener: disRef.current }); }
      else if (matchesShortcut(SHORTCUTS.todoAdd, e)) { e.preventDefault(); setMile(null); setAdding(true); }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });

  /* ── v53 (D2): the thin header names the page, and the book beside it only when the account has one (the tray spans
     every book, so a book's name over all of them would be false) ── */
  const statBook = manuscripts.length === 1 ? (manuscripts[0].title ?? "").trim() || null : null;
  /* ── v53 (D3): the breakdown bar reads the category groups the tray draws, so its counts are the groups' counts ── */
  /* v55 (D4): read off EVERY task, never the filtered view — a search or a filter narrows the list, never the counts */
  const bd = useMemo(() => breakdownOf(wsSections(all, "category")), [all]);
  const jump = (id: string) => {
    setShut((x) => { const n = new Set(x); n.delete(id); return n; });
    /* the TRAY scrolls, never the page: its own scrollTop, never scrollIntoView */
    requestAnimationFrame(() => {
      const list = document.querySelector<HTMLElement>(".tws [data-tws=\"list\"]");
      const head = list?.querySelector<HTMLElement>(`[data-tws-group="${id}"]`);
      if (!list || !head) return;
      const top = head.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop - 8;
      list.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    });
  };

  /* v54 (D1): the legend's rows, read off the same category sections as the bar */
  const needRowsV = useMemo(() => needRows(wsSections(all, "category"), bd, now), [all, bd, now]);
  /* v54 (D1): "Quick fill" opens the "Fill in what you sent" batch (there is one: v51.1 folds every gap into it) */
  const quickFill = () => { setTab("todo"); go("materials-batch"); setBatchView("table"); };
  /* D9: a pick is remembered (todoPrefs.batchView, one leaf) and used from then on */
  const savedBatchView = (currentUser?.todoPrefs as { batchView?: BatchView } | undefined)?.batchView ?? null;
  const pickBatchView = (v: BatchView) => { setBatchView(v); void updateUserPaths({ "todoPrefs.batchView": v }).catch(() => flash("Couldn’t save that choice.")); };

  /* ── render: the tray ── */
  const toggleSet = <T,>(s: ReadonlySet<T>, v: T) => { const n = new Set(s); if (n.has(v)) n.delete(v); else n.add(v); return n; };
  /* v55 (D4): the filters (never the search, never the grouping) clear here; the line says what is showing */
  const clearFilters = () => setFilters((f) => ({ ...f, types: new Set(), whens: new Set() }));
  const fLine = filterLine(filters, visible.length, all.length);

  const row = (t: WsTask) => {
    const fig = trayFigure(t, now);
    const on = !!sel && sel.key === t.key && !adding;
    const house = t.group === "house";
    /* v53 (D4): every row leads with its glyph — the query's status (StatusDot), a nudge's "!" ring, Gone quiet's dotted
       ring, a form for housekeeping, a real tick for the writer's own task */
    const glyph = t.kind === "nudge" ? NUDGE_MARK : t.kind === "quiet" ? QUIET_MARK
      : t.query ? <StatusDot status={t.query.status as QueryStatus} overrideSize={20} decorative /> : null;
    return (
      <div key={t.key} className="tws-ti" role="button" tabIndex={0} data-tws-row={t.key} data-kind={t.kind} aria-current={on ? "true" : undefined}
        data-ticked={held?.task.key === t.key ? "" : undefined} data-leaving={held?.task.key === t.key && held.phase === "leave" ? "" : undefined}
        onClick={() => go(t.key)} onKeyDown={(e) => { if (e.key === "Enter") go(t.key); }} title={t.title}>
        {t.kind === "own" ? <span className="tws-av" data-k="own" data-tws="glyph" aria-hidden="true">{TICK}</span>
          : house ? <span className="tws-av" data-k="form" data-tws="glyph" aria-hidden="true">{FORM}</span>
          : glyph ? <span className="tws-av" data-k="glyph" data-tws="glyph" aria-hidden="true">{glyph}</span>
          : <span className="tws-av" data-tws="glyph" aria-hidden="true">{initialsOf(t.agentName || t.title)}</span>}
        <span className="tws-tx"><b>{t.title}</b><span>{t.kind === "own" ? "Your task" : t.agency || t.agentName || ""}</span></span>
        {house ? <span className="tws-qf" data-tws="quick-fill">Quick fill</span>
          : <span className="tws-du" data-tws="figure" data-late={fig?.late ? "" : undefined}>{fig ? <><b>{fig.n}</b>{fig.words ? <small>{fig.words}</small> : null}</> : null}</span>}
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
    if (!visible.length) return <p className="tws55-none" data-tws55="none">No tasks match. <button type="button" onClick={() => setFilters(NO_WS_FILTERS)}>Clear the filters</button></p>;
    return sections.map((s) => {
      if (!s.tasks.length && s.id !== "yours") return null;
      const isShut = shut.has(s.id);
      const house = s.id === "house" && !hkMore && s.tasks.length > 4;
      const rows = house ? s.tasks.slice(0, 4) : s.tasks;
      return (
        <React.Fragment key={s.id}>
          <div className="tws-gbw" data-tws-group={s.id}>
            <button type="button" className="tws-gb" data-band={s.band} aria-expanded={!isShut} onClick={() => setShut((x) => toggleSet(x, s.id))}>
              <b>{s.name}</b><em>{s.tasks.length}</em><span className="tws-cv" aria-hidden="true">⌄</span>
            </button>
            {/* v53 (D4): Housekeeping's Quick fill opens the group on its first task */}
            {s.id === "house" && s.tasks.length ? (
              <button type="button" className="tws-qfb" data-tws="quick-fill-group"
                onClick={() => { setShut((x) => { const n = new Set(x); n.delete("house"); return n; }); go(s.tasks[0].key); }}>Quick fill</button>
            ) : null}
          </div>
          {isShut ? null : (
            <>
              {rows.map(row)}
              {house ? <button type="button" className="tws-more" onClick={() => setHkMore(true)}>Show {s.tasks.length - 4} more</button> : null}
              {s.id === "yours" ? <button type="button" className="tws-addt" onClick={() => { setMile(null); setAdding(true); }}>+ Add a task</button> : null}
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
    return sectionsBody;
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
      const hasCheck = !!flow.commit;
      /* v53 (D6) — THE STEPS AS A RAIL: one question open, the finished ones a line each ("change" goes back with the
         later answers kept), the ones to come a grey line; "Check it, then log it" is the last step on every kind that
         logs (D7). The hawk sits above the rail, and steps aside on the check step. */
      main = (
        <DeskTiles.Provider value={true}>
          {onCheck ? null : <div className="tws-mnote" data-tws="hawk"><img src={MENTOR} alt="" /><p>{mentorLine(t, facts)}</p></div>}
          <ol className="tws-rail" data-tws="rail">
            {qs.map((q, i) => i < cur ? (
              <li key={q.key} className="tws-st" data-st="done" data-tws-step={q.key}>
                <span className="tws-sn" aria-hidden="true">{TICK}</span>
                <div className="tws-sx"><span className="tws-sq">{q.title}</span>
                  <span className="tws-sa" data-tws-qa={q.key}><b>{q.summary}</b> · <button type="button" className="tws-chg" aria-label={`Change: ${q.title}`} onClick={() => setQi(i)}>change</button></span></div>
              </li>
            ) : i === cur && curQ ? (
              <li key={q.key} className="tws-st tws-q" data-st="open" data-tws-q={q.key} data-tws-step={q.key}>
                <span className="tws-sn" aria-hidden="true">{i + 1}</span>
                <div className="tws-sx"><h3 className="tws-qh">{q.title}</h3>
                  {q.hint ? <span className="tws-hint">{q.hint}</span> : null}
                  <div className="tws-qbody">{q.body}</div></div>
              </li>
            ) : (
              <li key={q.key} className="tws-st" data-st="todo" data-tws-step={q.key}>
                <span className="tws-sn" aria-hidden="true">{i + 1}</span>
                <div className="tws-sx"><span className="tws-sq">{q.title}</span></div>
              </li>
            ))}
            {hasCheck ? (
              <li className="tws-st" data-st={onCheck ? "open" : "todo"} data-tws="check" data-tws-step="check">
                <span className="tws-sn" aria-hidden="true">{qs.length + 1}</span>
                <div className="tws-sx">
                  {onCheck ? <h3 className="tws-qh tws-chh">Check it, then log it</h3> : <span className="tws-sq">Check it, then log it</span>}
                  {onCheck ? (
                    <div className="tws-sumx" data-tws="story">
                      <span className="tws-ill" data-art="courier-hawk" aria-hidden="true" />
                      <div className="tws-sumb">
                        <p className="tws-lead" data-tws="sentence">{flow.sentence}</p>
                        {flow.timeline?.length ? (
                          <ol className="tws-tl3" data-tws="timeline" data-n={Math.min(3, flow.timeline.length)}>
                            {flow.timeline.slice(0, 3).map((pt, k) => (
                              <li key={k} data-now={k === 0 ? "" : undefined} data-tws-at={dayIsoOf(pt.at)}>
                                <span className="tws-tart" data-art={pt.art} aria-hidden="true" />
                                <span className="tws-tdot" aria-hidden="true" />
                                <b className="tws-twhen">{whenWord3(pt.at, today)}</b>
                                <span className="tws-twhat">{pt.what}</span>
                              </li>
                            ))}
                          </ol>
                        ) : null}
                        <p className="tws-after" data-tws="after">{flow.after ?? "This task leaves your list."} The card on the right shows how it’ll look.</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </li>
            ) : null}
          </ol>
        </DeskTiles.Provider>
      );
    }

    /* the card preview column */
    const ms = t.query ? manuscripts.find((m) => m.id === t.query!.manuscriptId) ?? null : manuscripts[0] ?? null;
    /* the pending change shows once something has been answered */
    /* once logged, the draft only names the new step (for the card's stamp); the card itself is the live one */
    const previewDraft = held ? flow?.draft ?? null : flow && Object.values(A).some((v) => v !== undefined) ? flow.draft : flow ? { section: flow.draft.section } : null;
    /* v53 (D8): typing dots while questions are open, the future card on the check step, the stamped card once logged */
    const cardMode: "typing" | "future" | "logged" | "plain" = held?.task.key === t.key ? "logged"
      : onCheck && flow?.draft.ghost ? "future" : flow?.commit && cur < qs.length ? "typing" : "plain";
    const previewFor = () => {
      if (own) {
        if (linkQ) return (
          <ScaledCard kind="query" focusKey={linkQ.id} label={`Open the full query card ↗`} onOpen={() => openLinked(t.userTask!)}>
            <PreviewQueryCard q={linkQ} row={cardRows.get(linkQ.id) ?? null} agent={linkA} queries={queries} manuscripts={manuscripts} manuscript={manuscripts.find((m) => m.id === linkQ.manuscriptId) ?? null} packages={packages} log={linkLog} draft={null} nowMs={now} quietWeeks={quietWeeks} free={cardFree} mode="plain" />
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
        <ScaledCard kind="query" focusKey={`${t.key}|${cardMode}`} label="Open the full query card ↗" onOpen={() => openCard(t)}>
          <PreviewQueryCard q={t.query} row={cardRows.get(t.query.id) ?? null} agent={t.agent ?? null} queries={queries} manuscripts={manuscripts} manuscript={ms} packages={packages} log={qLog} draft={previewDraft} nowMs={now} quietWeeks={quietWeeks} free={cardFree}
            mode={cardMode} agents={agents} activities={activities} />
        </ScaledCard>
      );
      return null;
    };
    const side = own && !linked ? <div className="tws-wp"><div className="tws-wpl"><span>Linked card</span></div><OwnEmptySide onLink={() => setLinkPicking(true)} /></div>
      : (() => { const p = previewFor(); const fut = cardMode === "future" && !!t.query; return p ? (
        <div className="tws-wp" data-tws="side" data-future={fut ? "" : undefined} onMouseMove={clipHover} onMouseLeave={() => setClipPop(null)}>
          {own ? <div className="tws-wpl"><span>{`Linked: ${(linkA?.name || linkA?.agency || "").trim().split(/\s+/)[0]}’s ${linkQ ? "query" : "agent"} card`}</span></div> : null}
          {fut ? <p className="tws-flabel" data-tws="future-label">How {t.first}’s card will look once you log it</p> : null}
          {p}
        </div>
      ) : null; })();

    /* the footer (v52 Part C): the questions column's own. Snooze and Dismiss on the left; "n of m" and the ONE primary
       button on the right, always in this place — nothing advances until it is pressed */
    let primary: React.ReactNode = null;
    let progress: string | null = null;
    let back: React.ReactNode = null;
    if (own) {
      progress = steps.length ? `${steps.filter((x) => x.done).length} of ${steps.length} steps` : null;
      primary = <button type="button" className="tws-go" data-tws="primary" disabled={busy} onClick={() => void ownDone(t)}>{TICK}Mark done</button>;
    } else if (flow) {
      const q = cur < qs.length ? qs[cur] : null;
      const last = cur === qs.length - 1;
      const total = qs.length + (flow.commit ? 1 : 0);
      if (q && flow.door && last && q.answered) {
        primary = <button type="button" className="tws-go" data-tws="primary" onClick={flow.door.open}>{flow.door.label}</button>;
      } else if (q) {
        primary = <button type="button" className="tws-go" data-tws="primary" data-next="" disabled={!q.answered} onClick={() => setQi(cur + 1)}>Next →</button>;
      } else if (onCheck) {
        primary = <button type="button" className="tws-go" data-tws="primary" data-log="" data-logged={logged ? "" : undefined} disabled={busy || logged} onClick={() => void logIt()}>{logged ? <>{TICK}Logged</> : flow.verb ?? "Log it"}</button>;
      } else if (!qs.length && flow.door) {
        primary = <button type="button" className="tws-go" data-tws="primary" onClick={flow.door.open}>{flow.door.label}</button>;
      }
      progress = !total ? null : `${cur + 1} of ${t.kind === "quiet" && !A.act ? "a few" : total}`;
      back = cur > 0 && !logged ? <button type="button" className="tws-sb tws-back" data-tws="back" onClick={() => setQi(cur - 1)}>← Back</button> : null;
    }
    /* v54 (D4–D9): a "Fill in what you sent" batch is its own desk — the band, the view switch and two views */
    const isBatch = sel.kind === "batch" && (sel.batch?.length ?? 0) > 1;
    /* ⚠️ a dev-only review aid trims the batch (lib/todoBatchReviewAid); gated HERE so production never reaches it */
    const cap = import.meta.env.MODE !== "production" ? devBatchCap() : null;
    const bQueue = isBatch ? (cap ? sel.batch!.slice(0, cap) : sel.batch!) : [];
    const batchViewNow: BatchView = batchView ?? openingView(bQueue.length, savedBatchView);
    const footBtns = (
      <>
          <button ref={snzRef} type="button" className="tws-sb" aria-label={own ? "Move it" : "Snooze"} title={own ? "Move it (S)" : "Snooze (S)"} aria-expanded={pop?.kind === "snooze"} onClick={(e) => setPop(pop?.kind === "snooze" ? null : { kind: "snooze", opener: e.currentTarget })}>{ZZ}<span>{own ? "Move it" : "Snooze"}</span><kbd>S</kbd></button>
          <button ref={disRef} type="button" className="tws-sb" aria-label={own ? "Delete" : "Dismiss"} title={own ? "Delete (D)" : "Dismiss (D)"} aria-expanded={pop?.kind === "dismiss"} onClick={(e) => setPop(pop?.kind === "dismiss" ? null : { kind: "dismiss", opener: e.currentTarget })}>{DIS}<span>{own ? "Delete" : "Dismiss"}</span><kbd>D</kbd></button>
      </>
    );
    const foot = (
      <div className="tws-wf" data-tws="footer" data-over={over ? "" : undefined}>
        {footBtns}
        <span className="tws-sp" />
        {progress ? <em className="tws-prog" data-tws="progress">{progress}</em> : null}
        {back}
        {primary}
      </div>
    );

    return (
      <div key={t.key} className="tws-wsx tws-in" data-tws="desk" data-phase={held?.task.key === t.key ? held.phase : undefined} style={{ containerType: "inline-size" } as React.CSSProperties}>
        {isBatch ? (
          <WsBatch54 key={`${sel.key}|${bQueue.length}`} queue={bQueue} queries={queries} agents={agents} wordCount={ms?.wordCount ?? null}
            view={batchViewNow} onView={pickBatchView} updateQuery={(id, patch) => db.updateQuery(id, patch)} flash={flash}
            onFocus={setBatchFocus} footLeft={footBtns}
            card={(() => { const fq = queries.find((q) => q.id === batchFocus) ?? t.query ?? null; const fa = fq ? agents.find((x) => x.id === fq.agentId) ?? null : null; return fq ? (
              <ScaledCard kind="query" focusKey={`${fq.id}|batch`} label="Open the full query card ↗" onOpen={() => openQueryPanel(fq.id, "other")}>
                <PreviewQueryCard q={fq} row={cardRows.get(fq.id) ?? null} agent={fa} queries={queries} manuscripts={manuscripts} manuscript={manuscripts.find((m) => m.id === fq.manuscriptId) ?? null} packages={packages} log={qLog} draft={null} nowMs={now} quietWeeks={quietWeeks} free={cardFree} mode="plain" agents={agents} activities={activities} />
              </ScaledCard>
            ) : null; })()} />
        ) : (
          <>
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
              <div className="tws-wq" ref={setWqEl} data-tws="questions">{main}{t.kind === "batch" && bRemaining.length > 1 && !held ? (
                <div className="tws-skip"><button type="button" className="tws-lnk" data-tws="skip" onClick={skipOne}>Skip this one</button></div>
              ) : null}</div>
              {foot}
            </div>
            {side}
          </div>
          </>
        )}
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
          {/* v54 (D1): the page header, in the Query Centre's dress — the hawk at the desk, "{n} things to do", "for {book}"
              between rules (one book only), "+ Add a task" and "Quick fill", the ring and "What needs doing". */}
          <WsHeader54 todo={all.length} bd={bd} rows={needRowsV} book={statBook}
            onAdd={() => { setMile(null); setAdding(true); }}
            onQuickFill={all.some((x) => x.key === "materials-batch") ? () => quickFill() : null}
            onJump={(k) => jump(k)} />

          <div className="tws-ws" data-tws="workspace" data-slim={slim ? "" : undefined}>
            {slim ? (
              /* v55 (D5): the tray as a 64px strip — » and one round count per category group (the name is its
                 tooltip); a click anywhere on the strip opens the tray again */
              <aside className="tws-tray tws55-strip" data-tws="tray" data-slim="" aria-label="Your tasks" onClick={() => setSlim(false)}>
                <button type="button" className="tws55-ic" data-tws="expand" aria-label="Open the list" title="Open the list" onClick={(e) => { e.stopPropagation(); setSlim(false); }}>{SVG_EXPAND}</button>
                {stripCounts(all).map((g) => (
                  <span key={g.id} className="tws55-sdot" data-k={g.id} data-tws55-strip={g.id} title={g.name} aria-label={`${g.name}: ${g.n}`}>{g.n}</span>
                ))}
              </aside>
            ) : (
            <aside className="tws-tray" data-tws="tray" aria-label="Your tasks">
              <div className="tws55-th">
                <WsTrayHead55 tab={tab} onTab={(t) => { setTab(t); setMenuState(false); }} todo={all.length}
                  searching={searching} q={filters.q} onQ={(q) => setFilters((f) => ({ ...f, q }))} onOpenSearch={openSearch} onCloseSearch={closeSearch}
                  menu={menu} onMenu={setMenu}
                  filters={filters} onType={(k) => { setTab("todo"); setFilters((f) => ({ ...f, types: toggleSet(f.types, k) })); }}
                  onWhen={(k) => { setTab("todo"); setFilters((f) => ({ ...f, whens: toggleSet(f.whens, k) })); }}
                  onClear={clearFilters}
                  grouping={grouping} onGroup={(g) => { setTab("todo"); setGrouping(g); }} groupings={WS_GROUPINGS}
                  onCollapse={() => setSlim(true)} menuRef={filtRef}
                  extra={<button type="button" className="tws-mlink" data-tws="tags-open" onClick={() => { setMenuState(false); setTagsOpen(true); }}>Manage your tags</button>} />
                {tab === "todo" && fLine ? (
                  <p className="tws55-fline" data-tws55="fline">{fLine} · <button type="button" data-tws55="fline-clear" onClick={clearFilters}>Clear</button></p>
                ) : null}
              </div>
              <div className="tws-tl" data-tws="list">{trayBody}</div>
            </aside>
            )}
            <section className="tws-desk" data-tws="desk-col">{desk}
              {mile ? (
                <div className="tws-mile" data-tws="milestone" role="status">
                  <div><span className="tws-mph" data-art="hawk" aria-hidden="true" /><h2>{mile.head}</h2>{mile.msg ? <p>{mile.msg}</p> : null}
                    <button type="button" className="tws-mbtn" data-tws="milestone-go" onClick={() => setMile(null)}>{mile.btn}</button></div>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </WorkspacePageGrid>
      {offPop && offRows.length ? <SwitchedOffPop rows={offRows} opener={offPop} onClose={() => setOffPop(null)} onTurnOn={(r) => void turnOn(r)} /> : null}
      {tagsOpen && filtRef.current ? (
        <AnchoredPanel anchor={filtRef.current} ariaLabel="Tags" variant="panel" onClose={(back) => { setTagsOpen(false); if (back) filtRef.current?.focus(); }}>
          <TagsPane />
        </AnchoredPanel>
      ) : null}
      {clipPop && flow?.draft.sent && flow.draft.sent.length > 1 ? (
        <div className="tws-layer tws-clippop" role="tooltip" data-tws="clip-pop"
          style={{ left: Math.max(8, Math.min(clipPop.x - 110, window.innerWidth - 228)), top: Math.min(clipPop.y + 8, window.innerHeight - 140) }}>
          {flow.draft.sent.map((x) => <span key={x}>{x}</span>)}{flow.draft.version ? <span className="tws-cpv">{flow.draft.version}</span> : null}
        </div>
      ) : null}
      {toast ? (
        <div key={toast.id} className="tws-layer tws-toast" role="status" data-tws="toast" data-snack={toast.sub ? "" : undefined}>
          {toast.sub ? <span className="tws-snt" aria-hidden="true">{TICK}</span> : null}
          <span>{toast.msg}{toast.sub ? <small data-tws="snack-sub"> · {toast.sub}</small> : null}</span>
          {toast.undo ? <button type="button" data-tws="undo" onClick={async () => { const u = toast.undo!; setToast(null); try { await u(); } catch { flash("Couldn’t undo that."); } }}>Undo</button> : null}
          {toast.sub ? <span className="tws-snbar" aria-hidden="true"><i /></span> : null}
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
