/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v5 — THE TRAY AND THE DESK (design-refs/todo-list-v5/todo-list-v5.html). Desktop only (768px up); the
 * phone keeps the v2 page (`TodoRoute` chooses).
 *
 * The Contact list v17.1 light header with one card (three counts that filter, a Cleared-this-week ring), v17's
 * filter row, then one white sheet under a sticky navy row: the in-tray of grouped tasks on the left and a desk that
 * holds one task at a time on the right.
 *
 * ⚠️ NOTHING ON THIS PAGE WRITES. A row click selects. The desk's action opens a door that already exists: the query
 *    drawer (`drawerDoorForTask`), the agent card (`openAgentCard` + `dataNeedTarget`, the only agent editor), the
 *    own-task tick (`useTaskCommit().quickDone`, its undo included), or today's sweep for a card with none of those.
 *    "Set aside" opens the snooze panel, which writes through `snoozeWrites` — the one primitive the phone page uses.
 * ⚠️ THE COUNT IS THE SIDEBAR BADGE'S: `boardFigures(cols).cards` off the same `assembleBoardColumns` call.
 * ⚠️ AFTER A SAVE FROM THE DESK the stamp plays only once the card has LEFT the board — the board is derived, so
 *    "left" is the only honest signal that the write landed. The next task is chosen then, from the order as it
 *    stood, never before.
 * ⚠️ "CLEARED" AND "DONE TODAY" ARE `lib/todoCleared`'s. Undo on a slip only where THIS session holds that save's
 *    inverse (the drawer's snapshot undo, or the tick's).
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { WorkspacePageGrid } from "../../shell/WorkspacePageGrid";
import { HalfDrawer } from "../../shell/HalfDrawer";
import { useScriptAllyDb } from "../../../lib/db";
import { assembleBoardColumns, boardFigures } from "../../../lib/todoColumns";
import { localYMD, resolveScopedManuscript } from "../../../lib/shellSidebar";
import type { BoardCard } from "../../../lib/todoBoard";
import {
  NO_FILTERS, SORT_LABEL, SWEEP_NEED, TRAY_GROUPS, actionWords, comingUp, deskFacts, filtersOn, kindCounts, lede, localYmd, matches,
  trayItem, trayOrder, whereItStands, type TrayDb, type TrayFilters, type TrayGroupId, type TrayItem, type TrayKind, type TraySort,
} from "../../../lib/todoTray";
import { clearedThisWeek, clearedToday, type ClearedAct } from "../../../lib/todoCleared";
import { stageHistory } from "../../../lib/qcStages";
import { drawerDoorForTask } from "../../../lib/queryActions/entry";
import { currentDrawerRequest, openQueryDrawer, subscribeDrawer, type SavedResult } from "../../../lib/queryActions/drawerStore";
import { currentAgentCard, dataNeedTarget, openAgentCard, subscribeAgentCard } from "../../../lib/agentCardStore";
import { agentDataQualityNeeds } from "../../../lib/agentDataQuality";
import { openQueryPanel } from "../../../lib/queryPanelStore";
import { escapeDepth } from "../../../lib/escapeStack";
import { SHORTCUTS, isEditableTarget, matchesShortcut } from "../../../lib/shortcuts";
import { TODO_OPEN_TASK_KEY } from "../../../lib/corkboard";
import { hiddenItems } from "../../../lib/taskSettings";
import { courtOf, expectedFor } from "../../../lib/qcSummary";
import { useTodoToast } from "../useTodoToast";
import { useConfirmAsk } from "../ConfirmAsk";
import { useTaskCommit } from "../useTaskCommit";
import { HousekeepingSweep, type SweepItem } from "../HousekeepingSweep";
import { AnchoredPanel } from "../AnchoredPanel";
import { SnoozePanel } from "../TodoFrameMenus";
import { SetAsidePanel } from "../SetAsidePanel";
import { V2Composer } from "../v2/V2Composer";
import { snoozeCardWrites, snoozeGroupWrites } from "../snoozeWrites";
import { TrayHeader } from "./TrayHeader";
import { TrayFilterRow } from "./TrayFilters";
import { DeskCard, Disc, DoneToday, DueDial } from "./TrayDesk";
import { TrayCaughtUp, TrayNothingYet } from "./TrayEmpty";
import { dayMonth } from "../../../lib/dates";
import { trayReviewState } from "../../../lib/todoReviewAid";
import { QueryStatus } from "../../../types";
import "../v2/todoV2.css";
import "./todoV5.css";

const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";
const SORT_KEY = "sa.todoTray.sort";
const SHUT_KEY = "sa.todoTray.shut";
const DAY = 86400000;
const STAMP_MS = 420, LEAVE_MS = 360, RISE_MS = 420, OUT_MS = 280;

const readSession = <T,>(k: string, fb: T, ok: (v: unknown) => v is T): T => {
  try { const v = JSON.parse(sessionStorage.getItem(k) ?? "null"); return ok(v) ? v : fb; } catch { return fb; }
};
const writeSession = (k: string, v: unknown) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** the stamp's word for the act the desk's door begins */
const stampFor = (i: TrayItem): { word: string; navy: boolean } => {
  switch (i.bucket) {
    case "send": return { word: "SENT", navy: false };
    case "decide": return i.card.taskType === "revise_resubmit" ? { word: "SENT", navy: false } : { word: "ANSWERED", navy: false };
    case "chase": return { word: "NUDGED", navy: true };
    case "close": return { word: "CLOSED", navy: false };
    case "fix": return { word: "SAVED", navy: true };
    default: return { word: "DONE", navy: false };
  }
};
/** which cleared kinds a drawer mode's save produces — how a slip finds the undo this session holds */
const MODE_KINDS: Record<string, ClearedAct["kind"][]> = {
  sent: ["sent", "resubmitted"], nudge: ["nudged"], close: ["closed"], offer: ["answered"],
};

export const TodoTray: React.FC<{ onNavigate: (tab: string, sub?: string, opts?: { agentId?: string; manuscriptId?: string }) => void }> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const db = useScriptAllyDb();
  const {
    tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, packages, currentUser, collectionsReady,
    addUserTask, upsertTaskFlag, dismissTask,
  } = db;
  const { toast, flash, dismiss: dismissToast, pause: pauseToast, resume: resumeToast, remember: rememberUndo } = useTodoToast();
  const { ask: confirmAsk, node: confirmAskNode } = useConfirmAsk();

  /* the clock: re-read each minute, so "today" and the dials move without a reload */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 60000); return () => window.clearInterval(id); }, []);

  /* ── the one board ── */
  const { cols, hkGroups } = useMemo(() => assembleBoardColumns({
    tasks, userTasks, queries, agents, manuscripts, taskFlags, activities,
    now, today: localYMD(now), mutedTaskRules: currentUser?.mutedTaskRules,
  }), [tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, now, currentUser?.mutedTaskRules]);
  /* dev only: the review aid that empties the board (lib/todoReviewAid); production reads the board as it is */
  const aid = import.meta.env.MODE === "production" ? null : trayReviewState();
  const live: BoardCard[] = useMemo(() => (aid ? [] : [...cols.todo, ...cols.today]), [cols, aid]);
  const n = aid ? 0 : boardFigures(cols).cards;
  const trayDb: TrayDb = useMemo(() => ({ queries, agents, manuscripts, userTasks, activities, packages, taskFlags, hkGroups }),
    [queries, agents, manuscripts, userTasks, activities, packages, taskFlags, hkGroups]);
  const items = useMemo(() => live.map((c) => trayItem(c, trayDb, now)), [live, trayDb, now]);
  const counts = useMemo(() => kindCounts(live), [live]);

  /* the manuscript in scope: the shared key, as the Contact list reads it */
  const scoped = useMemo(() => {
    let id: string | null = null;
    try { id = window.localStorage.getItem(ACTIVE_MS_KEY); } catch { id = null; }
    return resolveScopedManuscript(manuscripts, id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the key is the switch's signal
  }, [manuscripts, location.key]);
  const msTitle = scoped?.title?.trim() || null;

  /* ── the cleared acts ── */
  const clearedData = useMemo(() => ({ activities, taskFlags, userTasks, queries, agents }), [activities, taskFlags, userTasks, queries, agents]);
  const week = useMemo(() => clearedThisWeek(clearedData, now), [clearedData, now]);
  const today = useMemo(() => clearedToday(clearedData, now), [clearedData, now]);
  const undated = "Counts sends, revisions, nudges, closes, offer answers, profile gaps filled and your own tasks ticked, Monday to now. Snoozes don’t count.";

  /* ── corkboard notes for the desk's pin ── */
  const tagLabel = useCallback((id: string | undefined) => (id ? currentUser?.tags?.find((t) => t.id === id)?.label : undefined), [currentUser?.tags]);
  const pinFor = useCallback((i: TrayItem) => {
    const aid = i.agent?.id, qid = i.query?.id;
    if (!aid && !qid) return null;
    const notes = userTasks
      .filter((t) => !t.done && (!t.dueDate || t.colour !== undefined) && t.id !== i.userTask?.id && ((aid && t.agentId === aid) || (qid && t.queryId === qid)))
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    const t = notes[0];
    if (!t) return null;
    const tag = tagLabel(t.tags?.[0]);
    return { text: t.text, meta: `Pinned ${t.createdAt ? dayMonth(t.createdAt) : ""}${tag ? ` · #${tag.toLowerCase()}` : ""}` };
  }, [userTasks, tagLabel]);
  const hasPin = useCallback((i: TrayItem) => !!pinFor(i), [pinFor]);

  /* ── filters, sort, folding, focus ── */
  const [filters, setFilters] = useState<TrayFilters>(NO_FILTERS);
  const [sort, setSortState] = useState<TraySort>(() => readSession<TraySort>(SORT_KEY, "urgent", (v): v is TraySort => v === "urgent" || v === "oldest" || v === "agent"));
  const setSort = (s: TraySort) => { setSortState(s); writeSession(SORT_KEY, s); };
  const [shut, setShutState] = useState<Partial<Record<TrayGroupId, true>>>(() => readSession(SHUT_KEY, {}, (v): v is Partial<Record<TrayGroupId, true>> => !!v && typeof v === "object"));
  const toggleShut = (g: TrayGroupId) => setShutState((s) => { const x = { ...s }; if (x[g]) delete x[g]; else x[g] = true; writeSession(SHUT_KEY, x); return x; });
  const [focusMode, setFocusMode] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const visible = useMemo(() => items.filter((i) => matches(i, filters, hasPin)), [items, filters, hasPin]);
  const groups = useMemo(() => trayOrder(visible, sort), [visible, sort]);
  const ordered = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const walk = useMemo(() => groups.flatMap((g) => (shut[g.group.id] ? [] : g.items)), [groups, shut]);
  const countFor = useCallback((f: TrayFilters) => items.filter((i) => matches(i, f, hasPin)).length, [items, hasPin]);

  /* ── selection ── */
  const [selKey, setSelKey] = useState<string | null>(null);
  const sel = ordered.find((i) => i.key === selKey) ?? ordered[0] ?? null;
  const findRef = useRef<HTMLInputElement>(null);
  const scrollRowIntoView = (key: string) => {
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`.td5-root [data-td5-row="${CSS.escape(key)}"]`);
      el?.scrollIntoView({ block: "nearest", behavior: reduced() ? "auto" : "smooth" });
    });
  };

  /* arrival: the Corkboard's "open this task" selects it and opens nothing */
  useEffect(() => {
    if (location.pathname !== "/todo") return;
    let id: string | null = null;
    try { id = sessionStorage.getItem(TODO_OPEN_TASK_KEY); } catch { /* private mode */ }
    if (!id) return;
    try { sessionStorage.removeItem(TODO_OPEN_TASK_KEY); } catch { /* private mode */ }
    setSelKey(id);
    scrollRowIntoView(id);
  }, [location.pathname]);

  /* the sweep the desk opened (declared above the sequence, which waits for it to close: the TDZ order rule) */
  const [flow, setFlow] = useState<{ items: SweepItem[] } | null>(null);
  /* ── the commit sequence ── */
  const [pending, setPending] = useState<{ key: string; at: number } | null>(null);
  /* ⚠️ "hold" FIRST: the board drops the card the instant the save lands (the local snapshot), while the drawer, the
     agent card or the sweep is still on screen over the desk. The stamp waits until that surface has gone, or the writer
     never sees it (measured: the first stamp screenshot showed it playing under the closing drawer). */
  const [ghost, setGhost] = useState<{ item: TrayItem; index: number; next: string | null; phase: "hold" | "stamp" | "leave" } | null>(null);
  const [rise, setRise] = useState<string | null>(null);
  const [freshSlip, setFreshSlip] = useState<string | null>(null);
  const orderRef = useRef<TrayItem[]>([]);
  const timers = useRef<number[]>([]);
  useEffect(() => () => { timers.current.forEach((t) => window.clearTimeout(t)); }, []);
  const later = (fn: () => void, ms: number) => { const t = window.setTimeout(fn, reduced() ? 0 : ms); timers.current.push(t); };
  useLayoutEffect(() => {
    if (!pending) { orderRef.current = ordered; return; }
    if (ordered.some((i) => i.key === pending.key)) { orderRef.current = ordered; return; }
    /* the card has LEFT the board: the write landed. The next task is chosen from the order as it stood. */
    const before = orderRef.current;
    const idx = before.findIndex((i) => i.key === pending.key);
    const item = before[idx];
    setPending(null);
    orderRef.current = ordered;
    if (!item) return;
    const next = before.slice(idx + 1).find((i) => ordered.some((o) => o.key === i.key))
      ?? [...before.slice(0, idx)].reverse().find((i) => ordered.some((o) => o.key === i.key)) ?? null;
    setGhost({ item, index: idx, next: next ? next.key : null, phase: "hold" });
  }, [ordered, pending]);
  /* the surface that took the action: the query drawer, the agent card, or the sweep */
  const [surfaceOpen, setSurfaceOpen] = useState(false);
  useEffect(() => {
    const read = () => setSurfaceOpen(!!currentDrawerRequest() || !!currentAgentCard());
    read();
    const a = subscribeDrawer(read), b = subscribeAgentCard(read);
    return () => { a(); b(); };
  }, []);
  const ghostPhase = ghost?.phase;
  useEffect(() => {
    if (ghostPhase !== "hold" || surfaceOpen || flow) return undefined;
    /* the surface has gone: give its exit a beat, then the stamp, the leave, and the next task */
    const t = window.setTimeout(() => {
      setGhost((g) => (g ? { ...g, phase: "stamp" } : g));
      later(() => setGhost((g) => (g ? { ...g, phase: "leave" } : g)), STAMP_MS);
      later(() => {
        setGhost((g) => {
          const next = g?.next ?? null;
          setSelKey(next);
          if (next) { setRise(next); scrollRowIntoView(next); }
          return null;
        });
        later(() => setRise(null), RISE_MS);
      }, STAMP_MS + LEAVE_MS);
    }, reduced() ? 0 : 200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ghostPhase, surfaceOpen, flow]);
  /* a door left open without a save lets go after a while */
  useEffect(() => {
    if (!pending) return undefined;
    const t = window.setTimeout(() => setPending((p) => (p && p.at === pending.at ? null : p)), 10 * 60000);
    return () => window.clearTimeout(t);
  }, [pending]);
  /* the newest slip lands with a little drop */
  const lastSlip = useRef<string | null>(null);
  useEffect(() => {
    const top = today[0]?.id ?? null;
    if (top && lastSlip.current && top !== lastSlip.current) { setFreshSlip(top); later(() => setFreshSlip(null), 600); }
    lastSlip.current = top;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  /* ── the undo this session holds ── */
  const savedUndos = useRef<{ queryId: string; mode: string; undo: () => Promise<void>; used: boolean }[]>([]);
  const tickUndos = useRef(new Map<string, () => Promise<void>>());
  const [, bump] = useState(0);
  const undoFor = useCallback((a: ClearedAct): (() => void) | null => {
    if (a.kind === "ticked" && a.taskId) {
      const fn = tickUndos.current.get(a.taskId);
      return fn ? () => { tickUndos.current.delete(a.taskId!); void fn(); bump((x) => x + 1); } : null;
    }
    if (!a.queryId) return null;
    const e = savedUndos.current.find((s) => !s.used && s.queryId === a.queryId && (MODE_KINDS[s.mode] ?? []).includes(a.kind));
    return e ? () => { e.used = true; void e.undo(); bump((x) => x + 1); } : null;
  }, []);

  const { quickDone } = useTaskCommit({
    flash,
    rememberUndo: (key, fn) => { rememberUndo(key, fn); tickUndos.current.set(key, fn); },
    confirmAsk,
    openFlow: (card) => setFlow({ items: [{ kind: "card", card }] }),
  });

  /* ── the doors ── */
  const act = useCallback((i: TrayItem) => {
    const c = i.card;
    if (i.sweep) {
      const group = hkGroups.find((g) => g.rule === (c as BoardCard & { sweepRule?: string }).sweepRule);
      if (!group) return;
      setPending({ key: i.key, at: Date.now() });
      /* one agent: that agent's card, at the field (the agent card is the only agent editor); several: today's sweep */
      const need = SWEEP_NEED[group.rule];
      const only = group.members.length === 1 ? group.members[0].agentId : undefined;
      if (only && need) { openAgentCard(only, { ...(dataNeedTarget([need]) ?? {}), from: "task" }); return; }
      setFlow({ items: [{ kind: "group", group }] });
      return;
    }
    if (c.userTaskId) {
      setPending({ key: i.key, at: Date.now() });
      void quickDone(c).then((ok) => { if (!ok) setPending(null); });
      return;
    }
    if (c.taskType === "data_quality_poor" && i.agent) {
      const target = dataNeedTarget(agentDataQualityNeeds(i.agent));
      setPending({ key: i.key, at: Date.now() });
      openAgentCard(i.agent.id, { ...(target ?? {}), from: "task" });
      return;
    }
    const door = drawerDoorForTask(c.taskType, c.relatedRecordId, (id) => queries.find((x) => x.id === id)?.offerRefQueryId);
    if (door) {
      setPending({ key: i.key, at: Date.now() });
      openQueryDrawer({
        ...door, receipt: true,
        onSaved: (r: SavedResult) => {
          savedUndos.current.push({ queryId: r.queryId, mode: r.mode, undo: r.undo, used: false });
          flash(r.message || "Recorded", { label: "Undo", fn: async () => {
            const e = savedUndos.current.find((s) => s.undo === r.undo);
            if (e) e.used = true;
            await r.undo(); bump((x) => x + 1);
          } });
        },
        onCancel: () => setPending(null),
      });
      return;
    }
    /* no door of its own: today's route for a card with no query journey (`openFlowCards`) */
    setPending({ key: i.key, at: Date.now() });
    setFlow({ items: [{ kind: "card", card: c }] });
  }, [hkGroups, queries, quickDone, flash]);

  /* ── set aside ── */
  const asideRef = useRef<HTMLButtonElement | null>(null);
  const [asideOpen, setAsideOpen] = useState(false);
  const asideN = hiddenItems(currentUser?.mutedTaskRules, taskFlags, agents, queries, now).length;
  const deskAsideRef = useRef<HTMLButtonElement | null>(null);
  const [snoozeFor, setSnoozeFor] = useState<TrayItem | null>(null);
  const runSnooze = (i: TrayItem, days: number, when: string) => {
    const group = i.sweep ? hkGroups.find((g) => g.rule === (i.card as BoardCard & { sweepRule?: string }).sweepRule) : undefined;
    const r = group ? snoozeGroupWrites({ upsertTaskFlag, dismissTask }, group, days) : snoozeCardWrites({ upsertTaskFlag, dismissTask }, i.card, days, when);
    if (r) flash(r.message, { label: "Undo", fn: async () => { await r.undo(); flash("Restored"); } });
  };

  /* ── the composer ── */
  const [composing, setComposing] = useState(false);
  useEffect(() => {
    if (location.pathname !== "/todo") return;
    let want: string | null = null;
    try { want = sessionStorage.getItem("sa.todoCompose"); } catch { /* private mode */ }
    if (want !== "task" && want !== "note") return;
    try { sessionStorage.removeItem("sa.todoCompose"); } catch { /* private mode */ }
    if (want === "note") { navigate("/todo/corkboard"); return; }
    setComposing(true);
  }, [location.pathname, navigate]);
  const addTask = async (f: { text: string; dueDate: string; agentId?: string }): Promise<boolean> => {
    const id = "task-" + Math.random().toString(36).slice(2, 11);
    const got = await addUserTask({ id, text: f.text, dueDate: f.dueDate, ...(f.agentId ? { agentId: f.agentId } : {}) });
    if (!got) return false;
    setComposing(false);
    setFilters(NO_FILTERS);
    setSelKey(got);
    scrollRowIntoView(got);
    return true;
  };
  const addNote = async (f: { text: string }): Promise<boolean> => !!(await addUserTask({ text: f.text }));

  /* ── keys ── */
  const stateRef = useRef({ walk, sel, act });
  stateRef.current = { walk, sel, act };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (location.pathname !== "/todo") return;
      const root = document.querySelector<HTMLElement>(".td5-root");
      if (!root || root.getBoundingClientRect().height === 0) return;
      if (isEditableTarget(e.target) || escapeDepth() > 0) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      const { walk: w, sel: s, act: a } = stateRef.current;
      if (matchesShortcut(SHORTCUTS.todoSearch, e)) { e.preventDefault(); findRef.current?.focus(); return; }
      if (matchesShortcut(SHORTCUTS.todoDown, e) || matchesShortcut(SHORTCUTS.todoUp, e)) {
        if (!w.length) return;
        e.preventDefault();
        const at = s ? w.findIndex((x) => x.key === s.key) : -1;
        const d = matchesShortcut(SHORTCUTS.todoDown, e) ? 1 : -1;
        const nx = w[Math.max(0, Math.min(w.length - 1, at < 0 ? 0 : at + d))];
        if (nx) { setSelKey(nx.key); scrollRowIntoView(nx.key); }
        return;
      }
      if (matchesShortcut(SHORTCUTS.todoAct, e)) { if (s) { e.preventDefault(); a(s); } return; }
      if (e.key === "Escape") {
        if (filters.find) { setFilters((f) => ({ ...f, find: "" })); return; }
        setSelKey(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [location.pathname, filters.find]);

  /* ── the navy row squares off once it pins ── */
  const sheetRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const sheet = sheetRef.current;
    const sc = sheet?.closest(".wpg-scroll") as HTMLElement | null;
    if (!sheet || !sc) return undefined;
    let raf = 0;
    const read = () => { raf = 0; const s = sc.getBoundingClientRect(); const r = sheet.getBoundingClientRect(); if (s.height > 0) setStuck(r.top <= s.top + 0.5); };
    const ask = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    sc.addEventListener("scroll", ask, { passive: true });
    window.addEventListener("resize", ask);
    return () => { sc.removeEventListener("scroll", ask); window.removeEventListener("resize", ask); if (raf) cancelAnimationFrame(raf); };
  });

  /* ── the desk's sticky top: under the navy row when it fits, by its bottom when it does not ── */
  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    const desk = sheet?.querySelector<HTMLElement>(".td5-desk");
    const sc = sheet?.closest(".wpg-scroll") as HTMLElement | null;
    if (!sheet || !desk || !sc) return undefined;
    const put = () => {
      const port = sc.clientHeight, h = desk.offsetHeight;
      if (!(port > 0) || !(h > 0)) return;
      const nav = sheet.querySelector<HTMLElement>(".td5-nav")?.offsetHeight ?? 76;
      const fit = nav + 22;
      sheet.style.setProperty("--td5-desk-top", `${Math.min(fit, port - h - 16)}px`);
    };
    put();
    const ro = new ResizeObserver(put);
    ro.observe(desk); ro.observe(sc);
    return () => ro.disconnect();
  });

  /* ── the page's state ── */
  const openOwn = aid !== "nothing" && userTasks.some((t) => !t.done && !!t.dueDate);
  const loading = !collectionsReady;
  const state: "loading" | "nothing" | "caught" | "list" = loading ? "loading"
    : live.length > 0 ? "list" : ((aid === "nothing" ? 0 : queries.length) === 0 && !openOwn) ? "nothing" : "caught";
  const kindActive: TrayKind | null = filters.type === "you" || filters.type === "chase" || filters.type === "tidy" ? filters.type : null;
  const holding = queries.filter((q) => courtOf(q.status as QueryStatus) === "agent").length;
  const pastReply = queries.filter((q) => {
    if (courtOf(q.status as QueryStatus) !== "agent") return false;
    const e = expectedFor(q, agents.find((a) => a.id === q.agentId));
    return e.ms != null && e.ms < now;
  }).length;
  const nextLand = state === "caught" ? comingUp(trayDb, now, 3) : [];

  /* the desk's card: the ghost while the sequence plays, else the selection */
  const deskItem = ghost?.item ?? sel;
  const deskIndex = ghost ? ghost.index : sel ? ordered.findIndex((i) => i.key === sel.key) : -1;
  const deskList = ghost ? orderRef.current : ordered;
  const stopsFor = (i: TrayItem) => {
    if (!i.query || i.bucket === "fix" || i.bucket === "note") return [];
    const log = activities.filter((a) => a.queryId === i.query!.id);
    return whereItStands(i.query, stageHistory(i.query, log as never).spans, activities);
  };
  const pastDaysFor = (i: TrayItem) => (i.dial.kind === "late" && i.dial.ymd ? Math.max(1, Math.round((Date.parse(`${localYmd(now)}T12:00:00`) - Date.parse(`${i.dial.ymd}T12:00:00`)) / DAY)) : null);
  const step = (d: number) => {
    const at = sel ? walk.findIndex((x) => x.key === sel.key) : -1;
    const nx = walk[at + d];
    if (nx) { setSelKey(nx.key); scrollRowIntoView(nx.key); }
  };

  const header = (
    <TrayHeader
      loading={loading} n={loading ? null : n} caught={state === "caught"} msTitle={msTitle}
      counts={counts} active={kindActive} onKind={(k) => setFilters((f) => ({ ...f, type: f.type === k ? null : k }))}
      cleared={week.length} ringTitle={undated}
      onRing={() => sheetRef.current?.scrollIntoView({ block: "start", behavior: reduced() ? "auto" : "smooth" })}
      onAdd={() => setComposing(true)} asideN={asideN} asideRef={asideRef} onAside={() => setAsideOpen((o) => !o)}
    >
      {state === "list" || state === "loading" ? (
        <TrayFilterRow filters={filters} setFilters={setFilters} all={items} countFor={countFor} hasPin={hasPin} findRef={findRef} disabled={loading} />
      ) : null}
    </TrayHeader>
  );

  /* the tray's rows, with the ghost held in place while it leaves */
  const renderRows = (g: { group: (typeof TRAY_GROUPS)[number]; items: TrayItem[] }) => {
    const rows = [...g.items];
    if (ghost && ghost.item.group.id === g.group.id && !rows.some((r) => r.key === ghost.item.key)) {
      const before = orderRef.current.filter((x) => x.group.id === g.group.id);
      const at = before.findIndex((x) => x.key === ghost.item.key);
      rows.splice(Math.max(0, Math.min(rows.length, at)), 0, ghost.item);
    }
    return rows.map((i) => {
      const leaving = ghost?.item.key === i.key;
      return (
        <button key={i.key} type="button" className="td5-row2" data-td5-row={i.key} data-td5="row" data-group={i.group.id} data-bucket={i.bucket}
          data-task-type={i.card.taskType ?? (i.card.userTaskId ? "own" : undefined)} data-sweep={i.sweep ? String((i.card as BoardCard & { sweepOf?: number }).sweepOf ?? "") : undefined}
          data-out={leaving ? "" : undefined} aria-current={!ghost && sel?.key === i.key ? "true" : undefined}
          onClick={() => { setSelKey(i.key); }}>
          <Disc item={i} />
          <span className="td5-tx"><b>{i.deed}</b><small>{i.sub}</small></span>
          <DueDial dial={i.dial} size={52} />
        </button>
      );
    });
  };

  return (
    <div className="td5-root" data-todo-v5="" data-state={state}>
      <WorkspacePageGrid className="td5-wpg" scrollLabel="To-do list" masthead={null}>
        <div className="td5-group" data-td5="group">
          {state === "nothing" ? (
            <TrayNothingYet msTitle={msTitle} onLog={() => openQueryDrawer({ mode: "log" })} onImport={() => navigate("/import")} onAdd={() => setComposing(true)} />
          ) : (
            <>
              {header}
              <div className="td5-sheet" ref={sheetRef} data-td5="sheet" data-focus={focusMode ? "" : undefined}>
                <div className="td5-nav" data-td5="nav" data-stuck={stuck ? "" : undefined}>
                  {state === "caught" ? (
                    <p className="td5-say" data-td5="say">
                      Nothing in your tray.{nextLand[0] ? <> The next task lands on <b>{dayMonth(nextLand[0].ms)}</b>.</> : null}
                    </p>
                  ) : (
                    <div className="td5-say" data-td5="say" style={{ position: "relative", overflow: "visible" }}>
                      {filtersOn(filters) ? (
                        <>Showing <b>{visible.length}</b> of <b>{items.length}</b><button type="button" className="td5-clr" data-td5="clear-all" onClick={() => setFilters(NO_FILTERS)}>Clear all</button></>
                      ) : (
                        <>Working through <b>{visible.length} {visible.length === 1 ? "task" : "tasks"}</b>,{" "}
                          <button type="button" className="td5-sortb" data-td5="sort" aria-haspopup="menu" aria-expanded={sortOpen} onClick={() => setSortOpen((o) => !o)}>{SORT_LABEL[sort]}</button>
                        </>
                      )}
                      {sortOpen && !filtersOn(filters) ? (
                        <div className="td5-sortmenu" role="menu" onMouseLeave={() => setSortOpen(false)}>
                          {(Object.keys(SORT_LABEL) as TraySort[]).map((k) => (
                            <button key={k} type="button" role="menuitemradio" aria-checked={sort === k} onClick={() => { setSort(k); setSortOpen(false); }}>{SORT_LABEL[k]}</button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                  <span className="td5-sp" />
                  {state === "list" ? (
                    <>
                      <span className="td5-keys" aria-hidden="true"><kbd>J</kbd><kbd>K</kbd> move<span className="td5-gap" /><kbd>E</kbd> act</span>
                      <button type="button" className="td5-focusbtn" data-td5="focus" aria-pressed={focusMode} onClick={() => setFocusMode((f) => !f)}>
                        <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="2.5" y="3" width="11" height="10" rx="1.5" /><path d="M5.5 6.5h5M5.5 9.5h3" /></svg>
                        Just the desk
                      </button>
                    </>
                  ) : null}
                </div>
                {state === "caught" ? (
                  <TrayCaughtUp holding={holding} pastReply={pastReply} upcoming={nextLand} now={now} done={today} undoFor={undoFor} onQuery={() => navigate("/agents")} />
                ) : (
                  <div className="td5-body">
                    <div className="td5-tray" data-td5="tray">
                      <div className="td5-strip" data-td5="strip"><span className="td5-h">In your tray · <b>{visible.length}</b></span><span className="td5-sp" /><span className="td5-h">Due</span></div>
                      {groups.length || ghost ? TRAY_GROUPS.map((gd) => {
                        const g = groups.find((x) => x.group.id === gd.id) ?? (ghost?.item.group.id === gd.id ? { group: gd, items: [] } : null);
                        if (!g) return null;
                        return (
                          <div key={gd.id} className="td5-grp" data-td5="group-block" data-g={gd.id} data-shut={shut[gd.id] ? "" : undefined}>
                            <button type="button" className="td5-band" data-td5="band" style={{ background: gd.tint, color: gd.ink }} aria-expanded={!shut[gd.id]} onClick={() => toggleShut(gd.id)}>
                              <img src={gd.art.src} alt="" aria-hidden="true" data-td5="band-art" style={{ width: gd.art.w, left: gd.art.l, top: gd.art.t }} />
                              <span className="td5-bn">{gd.name}</span><span className="td5-bc">{g.items.length}</span><span className="td5-chv" aria-hidden="true">▾</span>
                            </button>
                            {shut[gd.id] ? null : <div className="td5-rows">{renderRows(g)}</div>}
                          </div>
                        );
                      }) : loading ? null : <div className="td5-none">Nothing matches. Clear the filter to see the rest of your tray.</div>}
                    </div>
                    <div className="td5-deskcol" data-td5="deskcol">
                      <div className="td5-desk" data-td5="desk">
                        {deskItem ? (
                          <>
                            <div className="td5-pos" data-td5="pos">
                              <span>{deskIndex + 1} of {deskList.length}</span>
                              <span className="td5-dots" aria-hidden="true">{deskList.map((x, k) => <i key={x.key} data-on={k === deskIndex ? "" : undefined} />)}</span>
                              <button type="button" aria-label="Previous task" disabled={!!ghost || deskIndex <= 0} onClick={() => step(-1)}>‹</button>
                              <button type="button" aria-label="Next task" disabled={!!ghost || deskIndex >= deskList.length - 1} onClick={() => step(1)}>›</button>
                            </div>
                            <div className="td5-stackwrap">
                              <div className="td5-stack" aria-hidden="true">{deskList.length > 2 ? <><i /><i /></> : deskList.length > 1 ? <i /> : null}</div>
                              <DeskCard
                                key={deskItem.key}
                                item={deskItem} facts={deskFacts(deskItem, trayDb, now)} lede={lede(deskItem, trayDb, now)}
                                stops={stopsFor(deskItem)} pastDays={pastDaysFor(deskItem)} pin={pinFor(deskItem)}
                                action={actionWords(deskItem)} onAct={() => act(deskItem)}
                                asideRef={deskAsideRef} onAside={ghost ? null : () => setSnoozeFor(deskItem)}
                                onOpenQuery={deskItem.query && !deskItem.card.userTaskId ? () => openQueryPanel(deskItem.query!.id, "other") : null}
                                stamp={ghost && ghost.phase !== "hold" ? stampFor(ghost.item) : null}
                                phase={ghost ? (ghost.phase === "hold" ? "rest" : ghost.phase) : rise === deskItem.key ? "rise" : "rest"}
                              />
                            </div>
                          </>
                        ) : loading ? null : <div className="td5-noslips">Nothing in view. Clear the filter or the search.</div>}
                        <DoneToday acts={today} fresh={freshSlip} undoFor={undoFor} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </WorkspacePageGrid>

      {asideOpen && asideRef.current ? (
        <AnchoredPanel anchor={asideRef.current} ariaLabel="Set aside and tags" variant="panel" onClose={(back) => { setAsideOpen(false); if (back) asideRef.current?.focus(); }}>
          <SetAsidePanel />
        </AnchoredPanel>
      ) : null}
      {snoozeFor && deskAsideRef.current ? (
        <AnchoredPanel anchor={deskAsideRef.current} ariaLabel="Snooze this task" variant="panel" onClose={(back) => { setSnoozeFor(null); if (back) deskAsideRef.current?.focus(); }}>
          <SnoozePanel deed={snoozeFor.deed} onCancel={() => setSnoozeFor(null)} onConfirm={(days, when) => { runSnooze(snoozeFor, days, when); setSnoozeFor(null); }} />
        </AnchoredPanel>
      ) : null}
      <HalfDrawer probe="todo-compose" open={composing} onClose={() => setComposing(false)} label="Add a task" width="min(560px, 46vw)"
        head={<div className="td5-drh"><b>Add a task</b><button type="button" aria-label="Close" onClick={() => setComposing(false)}>✕</button></div>}>
        <div className="td5-drb td5-root" data-td5="composer">
          {composing ? <V2Composer today={localYMD(now)} agents={agents} onAddTask={addTask} onAddNote={addNote} onNote={() => { setComposing(false); navigate("/todo/corkboard"); }} autoFocus /> : null}
        </div>
      </HalfDrawer>
      {flow ? <HousekeepingSweep items={flow.items} onClose={() => { setFlow(null); }} onNavigate={onNavigate} onToast={flash} /> : null}
      {confirmAskNode}
      {toast && (
        <div className={`tdb-toast${toast.tone === "warn" ? " warn" : ""}`} role={toast.tone === "warn" ? "alert" : "status"} onMouseEnter={pauseToast} onMouseLeave={resumeToast}>
          {toast.msg}
          {toast.action && <button type="button" className="tdb-toast-act" onClick={() => { void toast.action!.fn(); dismissToast(); }}>{toast.action.label}</button>}
        </div>
      )}
    </div>
  );
};

export default TodoTray;
