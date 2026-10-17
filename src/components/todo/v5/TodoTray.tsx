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
import {
  askDrawerToLeave, currentDrawerRequest, currentParked, discardParked, openQueryDrawer, resumeQueryDrawer, subscribeDrawer, subscribeParked,
  type OpenRequest, type ParkedJourney, type SavedResult,
} from "../../../lib/queryActions/drawerStore";
import { clashAsk, journeyDoing } from "../../../lib/queryActions/parking";
import { DESK_SLOT, placeDeskSlot } from "./deskSlot";
import { currentAgentCard, dataNeedTarget, openAgentCard, subscribeAgentCard } from "../../../lib/agentCardStore";
import { agentDataQualityNeeds } from "../../../lib/agentDataQuality";
import { openQueryPanel } from "../../../lib/queryPanelStore";
import { escapeDepth } from "../../../lib/escapeStack";
import { SHORTCUTS, isEditableTarget, matchesShortcut } from "../../../lib/shortcuts";
import { TODO_OPEN_TASK_KEY } from "../../../lib/corkboard";
import { setAsideItems, RULE_TITLE, RULE_PLAIN, type SetAsideItem } from "../../../lib/taskSettings";
import { courtOf, expectedFor } from "../../../lib/qcSummary";
import { useTodoToast } from "../useTodoToast";
import { useConfirmAsk } from "../ConfirmAsk";
import { useTaskCommit } from "../useTaskCommit";
import { HousekeepingSweep, type SweepItem } from "../HousekeepingSweep";
import { AnchoredPanel } from "../AnchoredPanel";
import TagsPane from "../TagsSheet";
import { SET_ASIDE_EMPTY } from "../SetAsidePanel";
import { SetAsidePop, type PopMode } from "./SetAsidePop";
import { backFact, daysBetween, setAsideRules } from "../../../lib/todoSetAside";
import { dismissedCards, flagForCard, snoozedCards } from "../../../lib/todoColumns";
import { dismissalHolds, flagDismissed, flagKeyForTask, subjectChange, taskFlagId } from "../../../lib/taskFlags";
import { taskSurvivesMute, visibleAgentNeeds } from "../../../lib/todoHousekeeping";
import { BLANK_DRAFT, ComposeCard, dayLabel, dueOf, surfaceDay, type ComposeDraft } from "./ComposeCard";
import { useTagWrites } from "../useTagWrites";
import { taskSurfaced } from "../../../lib/todoBoard";
import { snoozeCardWrites, snoozeGroupWrites } from "../snoozeWrites";
import { TrayHeader } from "./TrayHeader";
import { TrayCalendar, shortDay } from "./TrayCalendar";
import { TrayCalDrawer } from "./TrayCalDrawer";
import { calFilterLabel, calendarItems, dayBuckets, londonToday, passesCalFilter, type CalFilter, type CalItem } from "../../../lib/trayCalendar";
import { TrayFilterRow } from "./TrayFilters";
import { DeskCard, Disc, DoneToday, DueDial } from "./TrayDesk";
import { TrayCaughtUp, TrayNothingYet } from "./TrayEmpty";
import { dayMonth, MONTHS_SHORT } from "../../../lib/dates";
import { trayReviewState } from "../../../lib/todoReviewAid";
import { QueryStatus, type TaskFlag, type UserTask } from "../../../types";
import "../v2/todoV2.css";
import "./todoV5.css";
import "./todoV52.css";

const ACTIVE_MS_KEY = "scriptally_active_manuscript_id";
const SORT_KEY = "sa.todoTray.sort";
const SHUT_KEY = "sa.todoTray.shut";
const DRAFT_KEY = "sa.todoTray.draft";
const BACK_KEY = "sa.todoTray.back";
const DAY = 86400000;
const STAMP_MS = 420, LEAVE_MS = 360, RISE_MS = 420, OUT_MS = 280;

const readSession = <T,>(k: string, fb: T, ok: (v: unknown) => v is T): T => {
  try { const v = JSON.parse(sessionStorage.getItem(k) ?? "null"); return ok(v) ? v : fb; } catch { return fb; }
};
const writeSession = (k: string, v: unknown) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
const plusYmd = (ymd: string, n: number) => { const [y, m, d] = ymd.split("-").map(Number); const x = new Date(y, m - 1, d + n, 12); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
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
    addUserTask, updateUserTask, deleteUserTask, restoreUserTask, setUserTaskColour, upsertTaskFlag, dismissTask, updateUserProfile, tasksIgnoringMutes, restoreTaskFlag,
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
  /* ── v5.2 §A/§B — the calendar: one derivation (lib/trayCalendar), read by the card, the drawer, the h1 and the chip ── */
  const calToday = londonToday(now);
  const calItems = useMemo(() => {
    const byKey = new Map(items.map((i) => [i.key, i]));
    return calendarItems({ cards: live, db: trayDb, flags: taskFlags, nowMs: now,
      words: (c) => { const i = byKey.get(c.key); return { deed: i?.deed ?? c.title, who: i?.who ?? c.who }; } });
  }, [live, items, trayDb, taskFlags, now]);
  const calBuckets = useMemo(() => dayBuckets(calItems, live, calToday), [calItems, live, calToday]);
  const calYmdOf = useMemo(() => new Map(calItems.filter((x) => x.surfaced && !x.snoozed && x.ymd).map((x) => [x.key, x.ymd as string])), [calItems]);
  const [calFilter, setCalFilter] = useState<CalFilter | null>(null);
  const [calSel, setCalSel] = useState<string>(() => londonToday(Date.now()));
  const [calDrawer, setCalDrawer] = useState(false);
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

  const visible = useMemo(() => items.filter((i) => matches(i, filters, hasPin) && passesCalFilter(calFilter, calItems, i.key, calToday)),
    [items, filters, hasPin, calFilter, calItems, calToday]);
  const groups = useMemo(() => trayOrder(visible, sort), [visible, sort]);
  const ordered = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const walk = useMemo(() => groups.flatMap((g) => (shut[g.group.id] ? [] : g.items)), [groups, shut]);
  const countFor = useCallback((f: TrayFilters) => items.filter((i) => matches(i, f, hasPin) && passesCalFilter(calFilter, calItems, i.key, calToday)).length, [items, hasPin, calFilter, calItems, calToday]);
  const anyFilter = filtersOn(filters) || !!calFilter;
  const clearAll = () => { setFilters(NO_FILTERS); setCalFilter(null); };

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
  /* v5.1 §E — the journey open ON THE DESK (a request whose slot is the desk's), and the one parked from it */
  const [deskReq, setDeskReq] = useState<OpenRequest | null>(null);
  const [parked, setParked] = useState<ParkedJourney | null>(() => currentParked());
  const [hostEl, setHostEl] = useState<HTMLDivElement | null>(null);
  const holderRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const read = () => {
      const r = currentDrawerRequest();
      setSurfaceOpen(!!r || !!currentAgentCard());
      setDeskReq(r?.panel?.slot === DESK_SLOT ? r : null);
    };
    read();
    const a = subscribeDrawer(read), b = subscribeAgentCard(read), c = subscribeParked((p) => setParked(p));
    return () => { a(); b(); c(); };
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
  /** v5.1 §E — the journey for a task, stepped INTO the desk card: `drawerDoorForTask`'s door, hosted in the desk's slot */
  const [workKey, setWorkKey] = useState<string | null>(null);
  const [clash, setClash] = useState<{ key: string; req: OpenRequest } | null>(null);
  /** `via` — another journey on the same query, from the set-aside popover's doors (send-by, withdraw, plan a nudge) */
  const deskRequest = useCallback((i: TrayItem, via?: Pick<OpenRequest, "mode" | "preset">): OpenRequest | null => {
    const c = i.card;
    if (i.sweep || c.userTaskId || c.taskType === "data_quality_poor") return null;
    const door = via ? (i.query ? { ...via, queryId: i.query.id } : null)
      : drawerDoorForTask(c.taskType, c.relatedRecordId, (id) => queries.find((x) => x.id === id)?.offerRefQueryId);
    if (!door) return null;
    const a = i.agent;
    const name = (a?.name || a?.agency || "").trim();
    return {
      ...door, receipt: true,
      panel: { name, agency: a?.agency ?? "", first: name.split(/\s+/)[0] ?? "", back: false, slot: DESK_SLOT },
      onSaved: (r: SavedResult) => {
        savedUndos.current.push({ queryId: r.queryId, mode: r.mode, undo: r.undo, used: false });
        flash(r.message || "Recorded", { label: "Undo", fn: async () => {
          const e = savedUndos.current.find((s) => s.undo === r.undo);
          if (e) e.used = true;
          await r.undo(); bump((x) => x + 1);
        } });
      },
      onCancel: () => setPending(null),
    };
  }, [queries, flash]);
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
    const req = deskRequest(i);
    if (req) {
      /* ⚠️ ONE JOURNEY AT A TIME (decision 8). A journey parked from this desk for ANOTHER task is asked about on the
         card — "Finish it" or "Discard and start" — never replaced in silence; the same task's journey resumes,
         whichever of its journeys it was (a close that became a response is still this query's). */
      const p = currentParked();
      if (p && p.req.panel?.slot === DESK_SLOT && p.req.queryId !== req.queryId) { setClash({ key: i.key, req }); return; }
      setClash(null);
      setWorkKey(i.key);
      setPending({ key: i.key, at: Date.now() });
      if (p && p.req.queryId === req.queryId && p.req.panel?.slot === DESK_SLOT) resumeQueryDrawer(req);
      else openQueryDrawer(req);
      return;
    }
    /* no door of its own: today's route for a card with no query journey (`openFlowCards`) */
    setPending({ key: i.key, at: Date.now() });
    setFlow({ items: [{ kind: "card", card: c }] });
  }, [hkGroups, queries, quickDone, deskRequest]);

  /* ── set aside (v5.1 §I) ── */
  const asideRef = useRef<HTMLButtonElement | null>(null);
  const deskAsideRef = useRef<HTMLButtonElement | null>(null);
  const asideMoreRef = useRef<HTMLButtonElement | null>(null);
  const tagsRef = useRef<HTMLButtonElement | null>(null);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [trayView, setTrayView] = useState<"tray" | "aside">("tray");
  const [asideSel, setAsideSel] = useState<string | null>(null);
  const [pop, setPop] = useState<{ mode: PopMode; focus: "snooze" | "dismiss" } | null>(null);
  /** ⚠️ THE ONE LIST (lib/taskSettings.setAsideItems): the tab, its count, the header's "Set aside · k" — never the badge */
  const asideList = useMemo(() => setAsideItems(currentUser, taskFlags, agents, queries, now, activities),
    [currentUser, taskFlags, agents, queries, now, activities]);
  const asideN = asideList.length;
  /* brought back from Set aside this session: the row says BACK TODAY and the card says how (nothing stores it) */
  const [manualBack, setManualBack] = useState<Record<string, true>>(() => readSession(BACK_KEY, {}, (v): v is Record<string, true> => !!v && typeof v === "object"));
  const markBack = (k: string) => setManualBack((m) => { const x = { ...m, [k]: true as const }; writeSession(BACK_KEY, x); return x; });
  /** a brought-back task is selected once the board has it again */
  const [selectWhen, setSelectWhen] = useState<{ taskType: string; rid: string } | null>(null);

  /* ── the compose card (v5.1 §F) ── */
  const [compose, setCompose] = useState<{ draft: ComposeDraft; edit: UserTask | null; prevKey: string | null } | null>(null);
  const [composeStamp, setComposeStamp] = useState<string | null>(null);
  /* the N key's door, filled once the doors below exist (a ref: the key handler is bound once) */
  const openComposeRef = useRef<() => void>(() => {});
  /** a draft cancelled with words in it is kept for the session, and "+ Add a task" opens it again */
  const keptDraft = (): ComposeDraft | null => readSession<ComposeDraft | null>(DRAFT_KEY, null, (v): v is ComposeDraft => !!v && typeof v === "object" && typeof (v as ComposeDraft).text === "string");
  const keepDraft = (d: ComposeDraft | null) => { try { if (d) writeSession(DRAFT_KEY, d); else sessionStorage.removeItem(DRAFT_KEY); } catch { /* private mode */ } };
  /* arrival: the Calendar's and the Corkboard's "New task" / "New note" door opens the compose card */
  useEffect(() => {
    if (location.pathname !== "/todo") return;
    let want: string | null = null;
    try { want = sessionStorage.getItem("sa.todoCompose"); } catch { /* private mode */ }
    if (want !== "task" && want !== "note") return;
    try { sessionStorage.removeItem("sa.todoCompose"); } catch { /* private mode */ }
    setCompose({ draft: { ...(keptDraft() ?? BLANK_DRAFT), mode: want }, edit: null, prevKey: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  /* ── keys ── */
  const stateRef = useRef({ walk, sel, act, add: () => {} });
  /* the Set aside tab's and the popover's key doors, filled below (a ref: the key handler is bound once) */
  const asideKeys = useRef<{ view: "tray" | "aside"; list: SetAsideItem[]; sel: string | null; select: (id: string) => void; bring: () => void; pop: (f: "snooze" | "dismiss") => void; toSheet: () => void }>({
    view: "tray", list: [], sel: null, select: () => {}, bring: () => {}, pop: () => {}, toSheet: () => {},
  });
  stateRef.current = { walk, sel, act, add: () => openComposeRef.current() };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (location.pathname !== "/todo") return;
      const root = document.querySelector<HTMLElement>(".td5-root");
      if (!root || root.getBoundingClientRect().height === 0) return;
      if (isEditableTarget(e.target) || escapeDepth() > 0) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      const { walk: w, sel: s, act: a } = stateRef.current;
      const x = asideKeys.current;
      if (matchesShortcut(SHORTCUTS.todoSearch, e)) { e.preventDefault(); findRef.current?.focus(); return; }
      /* v5.1 §I.5 — on the Set aside tab, J/K walk the list and E brings the item back */
      if (x.view === "aside") {
        if (matchesShortcut(SHORTCUTS.todoDown, e) || matchesShortcut(SHORTCUTS.todoUp, e)) {
          if (!x.list.length) return;
          e.preventDefault();
          const at = x.list.findIndex((i) => i.id === x.sel);
          const d = matchesShortcut(SHORTCUTS.todoDown, e) ? 1 : -1;
          const nx = x.list[Math.max(0, Math.min(x.list.length - 1, at < 0 ? 0 : at + d))];
          if (nx) x.select(nx.id);
          return;
        }
        if (matchesShortcut(SHORTCUTS.todoAct, e)) { e.preventDefault(); x.bring(); return; }
        if (matchesShortcut(SHORTCUTS.todoAdd, e)) { e.preventDefault(); stateRef.current.add(); return; }
        return;
      }
      /* v5.1 §I.3 — S and D open the set-aside popover on the desk card, with its section focused */
      if (s && (matchesShortcut(SHORTCUTS.todoSnooze, e) || matchesShortcut(SHORTCUTS.todoDismiss, e))) {
        e.preventDefault();
        x.pop(matchesShortcut(SHORTCUTS.todoDismiss, e) ? "dismiss" : "snooze");
        return;
      }
      if (matchesShortcut(SHORTCUTS.todoDown, e) || matchesShortcut(SHORTCUTS.todoUp, e)) {
        if (!w.length) return;
        e.preventDefault();
        const at = s ? w.findIndex((x) => x.key === s.key) : -1;
        const d = matchesShortcut(SHORTCUTS.todoDown, e) ? 1 : -1;
        const nx = w[Math.max(0, Math.min(w.length - 1, at < 0 ? 0 : at + d))];
        if (nx) { setSelKey(nx.key); scrollRowIntoView(nx.key); x.toSheet(); }
        return;
      }
      if (matchesShortcut(SHORTCUTS.todoAct, e)) { if (s) { e.preventDefault(); a(s); } return; }
      if (matchesShortcut(SHORTCUTS.todoAdd, e)) { e.preventDefault(); stateRef.current.add(); return; }
      if (e.key === "Escape") {
        if (filters.find) { setFilters((f) => ({ ...f, find: "" })); return; }
        setSelKey(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [location.pathname, filters.find]);

  /* ── v5.1 §J · one screen: the sheet is the scrollport's height, published as --td5-port from the scroller's own
     `clientHeight` (never 100vh — the scroller starts below the shell's bar) ── */
  const sheetRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const scroller = () => (sheetRef.current?.closest(".wpg-scroll") ?? rootRef.current?.querySelector(".wpg-scroll")) as HTMLElement | null;
  useLayoutEffect(() => {
    const root = rootRef.current;
    const sc = root?.querySelector<HTMLElement>(".wpg-scroll");
    if (!root || !sc) return undefined;
    const put = () => { const h = sc.clientHeight; if (h > 0) root.style.setProperty("--td5-port", `${h}px`); };
    put();
    const ro = new ResizeObserver(put);
    ro.observe(sc);
    window.addEventListener("resize", put);
    return () => { ro.disconnect(); window.removeEventListener("resize", put); };
  }, []);
  /** starting work brings the sheet's top to the scroller's top (smoothly; at once under reduced motion) */
  const toSheet = () => {
    const sc = scroller(), sheet = sheetRef.current;
    if (!sc || !sheet) return;
    const top = sc.scrollTop + sheet.getBoundingClientRect().top - sc.getBoundingClientRect().top - 10;
    if (Math.abs(top - sc.scrollTop) > 1) sc.scrollTo({ top, behavior: reduced() ? "auto" : "smooth" });
  };

  /* ── the page's state ── */
  const openOwn = aid !== "nothing" && userTasks.some((t) => !t.done && !!t.dueDate);
  const loading = !collectionsReady;
  const state: "loading" | "nothing" | "caught" | "list" = loading ? "loading"
    /* v5.1 §G — with the compose card open (from the empty page's "Add a task yourself", or "+ Add a task" on a clear
       desk) the page is the populated layout around an empty tray; cancelling with nothing saved goes back */
    : live.length > 0 || compose ? "list" : ((aid === "nothing" ? 0 : queries.length) === 0 && !openOwn) ? "nothing" : "caught";
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
  /* v5.1 §E — working: a journey is open on the desk card for the task on it */
  const working = !!deskReq && !!deskItem && workKey === deskItem.key;
  const parkedHere = parked && parked.req.panel?.slot === DESK_SLOT ? parked : null;
  const startedKey = parkedHere ? (items.find((i) => !i.sweep && !i.card.userTaskId && i.bucket !== "fix" && i.query?.id === parkedHere.req.queryId)?.key ?? null) : null;
  /** leave the journey on the desk before looking at something else: parked with answers, closed without */
  const leaveWork = () => { if (deskReq) askDrawerToLeave(); };
  /** the tray's two tabs; switching parks a journey with answers and keeps a draft (§E, §F) */
  const showView = (v: "tray" | "aside") => {
    leaveWork();
    if (compose) closeCompose();
    setPop(null);
    setTrayView(v);
    toSheet();
  };
  const selectRow = (key: string) => {
    if (working && deskItem?.key === key) return;
    leaveWork();
    if (compose) closeCompose();
    if (clash && clash.key !== key) setClash(null);
    setSelKey(key);
    toSheet();
  };
  /* ── the compose card's doors and its save (v5.1 §F) ── */
  const todayYmd = localYMD(now);
  const draftFromTask = (t: UserTask): ComposeDraft => {
    const q = t.queryId ? queries.find((x) => x.id === t.queryId) : undefined;
    const qa = q ? agents.find((a) => a.id === q.agentId) : undefined;
    const a = t.agentId ? agents.find((x) => x.id === t.agentId) : undefined;
    const m = t.manuscriptId ? manuscripts.find((x) => x.id === t.manuscriptId) : undefined;
    const link = q ? { kind: "query" as const, id: q.id, label: (qa?.name || qa?.agency || "A query").trim(), sub: [qa?.agency, String(q.status)].filter(Boolean).join(" · ") }
      : a ? { kind: "agent" as const, id: a.id, label: (a.name || a.agency || "An agent").trim(), sub: [a.agency, "Agent"].filter(Boolean).join(" · ") }
      : m ? { kind: "manuscript" as const, id: m.id, label: m.title || "A manuscript", sub: "Manuscript" } : null;
    return { mode: t.dueDate ? "task" : "note", text: t.text, detail: t.detail ?? "", when: t.dueDate ? "pick" : null, date: t.dueDate ?? null,
      surface: t.surfaceOffset ?? "on-day", link, tags: t.tags ?? [], paper: t.colour ?? "yellow" };
  };
  /** "+ Add a task", the tray's add row, N, and an own task's Edit: the current journey parks first (§E) */
  const openCompose = (edit: UserTask | null = null) => {
    leaveWork();
    setClash(null);
    setComposeStamp(null);
    setCompose({ draft: edit ? draftFromTask(edit) : (keptDraft() ?? BLANK_DRAFT), edit, prevKey: deskItem?.key ?? null });
    toSheet();
  };
  /** Cancel and Escape ask nothing: words typed are kept for the session; an edit is simply dropped */
  function closeCompose() {
    setCompose((c) => {
      if (c && !c.edit) keepDraft(c.draft.text.trim() || c.draft.detail.trim() ? c.draft : null);
      return null;
    });
  }
  const saveCompose = async (): Promise<boolean> => {
    const c = compose;
    if (!c) return false;
    const d = c.draft;
    const isTask = d.mode === "task";
    const due = isTask ? dueOf(d, todayYmd) : null;
    const text = d.text.trim();
    if (!text || (isTask && !due)) return false;
    let id = c.edit?.id ?? "";
    try {
      if (c.edit) {
        await updateUserTask(c.edit.id, {
          text, detail: d.detail.trim() || null, dueDate: isTask ? due : null,
          surfaceOffset: isTask && d.surface !== "on-day" ? d.surface : null, tags: d.tags.length ? d.tags : null,
        });
      } else {
        id = "task-" + Math.random().toString(36).slice(2, 11);
        const link = d.link ? (d.link.kind === "query" ? { queryId: d.link.id } : d.link.kind === "agent" ? { agentId: d.link.id } : { manuscriptId: d.link.id }) : {};
        const got = await addUserTask({
          id, text, ...(d.detail.trim() ? { detail: d.detail.trim() } : {}), ...(isTask ? { dueDate: due!, surfaceOffset: d.surface } : {}),
          ...link, ...(d.tags.length ? { tags: d.tags } : {}),
        });
        if (!got) return false;
        /* a note's paper is its own write, never part of the create (the rules' allowlist: db.setUserTaskColour) */
        if (!isTask && d.paper !== "yellow") await setUserTaskColour(id, d.paper);
      }
    } catch {
      return false;
    }
    keepDraft(null);
    const surfaced = isTask && taskSurfaced(due!, d.surface, todayYmd);
    setComposeStamp(c.edit ? "SAVED" : isTask ? "ADDED" : "PINNED");
    later(() => {
      setComposeStamp(null);
      setCompose(null);
      if (surfaced) {
        setFilters(NO_FILTERS);
        setSelKey(id);
        scrollRowIntoView(id);
        if (!c.edit) flash(`Added to Your tasks · due by ${dayLabel(due!)}`, { label: "Undo", fn: async () => { await deleteUserTask(id); } });
      } else if (isTask) {
        if (c.prevKey) setSelKey(c.prevKey);
        flash(`${c.edit ? "Saved" : "Added"} · due ${dayLabel(due!)}. It joins your tray on ${dayLabel(surfaceDay(due!, d.surface))}.`,
          c.edit ? undefined : { label: "Undo", fn: async () => { await deleteUserTask(id); } });
      } else {
        if (c.prevKey) setSelKey(c.prevKey);
        flash("Pinned to your corkboard", c.edit ? undefined : { label: "Undo", fn: async () => { await deleteUserTask(id); } });
      }
    }, 620);
    return true;
  };
  const { createTagDef } = useTagWrites((m) => flash(m));
  openComposeRef.current = () => openCompose();

  /* ── v5.2 §C — the slide-out calendar hands a task to the desk and starts nothing ── */
  const calWords = (it: CalItem) => {
    const ti = it.card ? items.find((x) => x.key === it.key) : undefined;
    if (ti) return { deed: ti.deed, line: ti.sub };
    if (it.userTask) return { deed: it.userTask.text, line: "Your own task" };
    return { deed: it.title, line: `${it.who ? `${it.who} · ` : ""}back from Set aside` };
  };
  const calToDesk = (it: CalItem) => {
    setCalDrawer(false);
    setCalFilter(null);
    setFilters((f) => (f.find ? { ...f, find: "" } : f));
    /* a task set aside lives in the Set aside tab; an own task that has not surfaced opens on the compose card (Call:
       v5.1's Coming up rows are not pressable, so its "path" was the own task's own Edit) */
    if (it.snoozed) { showView("aside"); return; }
    if (!it.surfaced && it.userTask) { openCompose(it.userTask); return; }
    setTrayView("tray");
    selectRow(it.key);
    scrollRowIntoView(it.key);
  };

  /* ── set aside: the popover's choices (v5.1 §I.3–I.4). Each writes through an existing writer, with Undo, and the
     card flies into the Set aside tab first. No confirmation dialog anywhere: Undo replaces it. ── */
  const DAYMS = 86400000;
  const groupOf = (i: TrayItem) => (i.sweep ? hkGroups.find((g) => g.rule === (i.card as BoardCard & { sweepRule?: string }).sweepRule) : undefined);
  const rulesFor = (i: TrayItem) => (i.card.userTaskId ? null
    : setAsideRules(i.card, i.query, flagForCard(i.card, taskFlags)?.snoozeCount ?? 0, todayYmd));
  const ruleKeyFor = (i: TrayItem): string | null => {
    const r = (i.card as BoardCard & { sweepRule?: string }).sweepRule;
    return r && r in RULE_PLAIN ? r : null;
  };
  const backLineFor = (i: TrayItem): string => {
    /* ⚠️ AN AGENT STORES NO EDIT TIME (taskFlags.subjectChange), so its task's dismissal holds until brought back */
    if (i.sweep || i.bucket === "fix" || !i.query) return "Back only if you bring it back";
    const first = (i.agent?.name || i.agent?.agency || "").trim().split(/\s+/)[0] ?? "";
    return `Back if ${first || "the agent"} replies, or you log something new on the query.`;
  };
  const nextAfter = (i: TrayItem): string | null => {
    const at = walk.findIndex((x) => x.key === i.key);
    return (walk[at + 1] ?? walk[at - 1])?.key ?? null;
  };
  /** the desk card flies into the Set aside tab (500ms); reduced motion: no flight, the same end state */
  const fly = async () => {
    const card = document.querySelector<HTMLElement>(".td5-root [data-todo-v5] .td5-dcard, .td5-root .td5-dcard");
    const tab = document.querySelector<HTMLElement>('.td5-root [data-td5="tab-aside"]');
    if (!card || !tab || reduced() || typeof card.animate !== "function") return;
    const c = card.getBoundingClientRect(), t = tab.getBoundingClientRect();
    const a = card.animate([{ transform: "none", opacity: 1 }, { transform: `translate(${t.left + t.width / 2 - (c.left + c.width / 2)}px,${t.top - (c.top + c.height / 2)}px) scale(.08)`, opacity: 0 }],
      { duration: 500, easing: "cubic-bezier(.5,0,.3,1)", fill: "forwards" });
    await a.finished.catch(() => undefined);
    requestAnimationFrame(() => a.cancel());
  };
  const [bumpTab, setBumpTab] = useState(0);
  const toBack = (i: TrayItem) => () => { setTrayView("tray"); setSelKey(i.key); scrollRowIntoView(i.key); };
  const UNDO_MS = 7000;

  /** ⚠️ EVERY SET-ASIDE UNDO PUTS BACK WHAT WAS THERE (§I.4): the flags as they were — whole, or absent — never an
   *  inverse through the same writer, which always leaves a document behind */
  const captureFlags = (keys: { taskType: string; queryId?: string; agentId?: string }[]) =>
    keys.map((k) => { const id = taskFlagId(k); return { id, was: taskFlags.find((f) => f.id === id) ?? null }; });
  const putBack = (cap: { id: string; was: TaskFlag | null }[]) => Promise.all(cap.map((c) => restoreTaskFlag(c.id, c.was)));
  const doSnooze = async (i: TrayItem, days: number, ymd: string) => {
    setPop(null);
    if (i.card.userTaskId && i.userTask) {
      /* an own task is MOVED, not snoozed: its due date changes and it stays on the Corkboard; Undo writes the task
         back verbatim (restoreUserTask), so not even its updatedAt moves */
      const t = i.userTask;
      await updateUserTask(t.id, { dueDate: ymd });
      flash(`Moved to ${dayLabel(ymd)}`, { label: "Undo", fn: async () => { await restoreUserTask(t); toBack(i)(); } }, UNDO_MS);
      return;
    }
    const r = rulesFor(i);
    const capped = Math.min(days, r?.ceiling ?? days);
    if (capped <= 0) return;
    const until = capped === days ? ymd : plusYmd(todayYmd, capped);
    const next = nextAfter(i);
    await fly();
    const g = groupOf(i);
    const cap = captureFlags(flagKeysFor(i));
    const daysToDeadline = r?.deadline && !r.deadline.passed ? daysBetween(todayYmd, r.deadline.ymd) : undefined;
    const w = g ? snoozeGroupWrites({ upsertTaskFlag, dismissTask }, g, capped) : snoozeCardWrites({ upsertTaskFlag, dismissTask }, i.card, capped, `until ${dayLabel(until)}`, daysToDeadline);
    if (!w) return;
    setSelKey(next); setBumpTab((b) => b + 1);
    flash(`Snoozed until ${dayLabel(until)}`, { label: "Undo", fn: async () => { await putBack(cap); toBack(i)(); } }, UNDO_MS);
  };
  const flagKeysFor = (i: TrayItem) => {
    const g = groupOf(i);
    return g ? g.members.filter((m) => m.agentId).map((m) => flagKeyForTask("data_quality_poor", m.agentId!))
      : i.card.taskType && i.card.relatedRecordId ? [flagKeyForTask(i.card.taskType, i.card.relatedRecordId)] : [];
  };
  const doDismiss = async (i: TrayItem) => {
    setPop(null);
    const keys = flagKeysFor(i);
    if (!keys.length) return;
    const next = nextAfter(i);
    const cap = captureFlags(keys);
    await fly();
    const at = new Date().toISOString();
    await Promise.all(keys.map((k) => upsertTaskFlag(k, { skippedAt: at })));
    setSelKey(next); setBumpTab((b) => b + 1);
    const dated = !!i.query && !i.sweep && i.bucket !== "fix";
    flash(`Dismissed · back ${dated ? "if anything changes" : "when you bring it back"}`,
      { label: "Undo", fn: async () => { await putBack(cap); toBack(i)(); } }, UNDO_MS);
  };
  const doRule = async (i: TrayItem) => {
    setPop(null);
    const rule = ruleKeyFor(i);
    if (!rule) return;
    const before = currentUser?.mutedTaskRules ?? [];
    const next = nextAfter(i);
    await fly();
    await updateUserProfile({ mutedTaskRules: [...new Set([...before, rule])] });
    setSelKey(next); setBumpTab((b) => b + 1);
    flash(`${RULE_TITLE[rule]}: switched off for every agent`, { label: "Undo", fn: async () => { await updateUserProfile({ mutedTaskRules: before }); toBack(i)(); } }, UNDO_MS);
  };
  const doDelete = async (i: TrayItem) => {
    setPop(null);
    const t = i.userTask;
    if (!t) return;
    const next = nextAfter(i);
    await deleteUserTask(t.id);
    setSelKey(next);
    flash(`Deleted · ${i.deed}`, { label: "Undo", fn: async () => { await restoreUserTask(t); toBack(i)(); } }, UNDO_MS);
  };
  const doDoor = (i: TrayItem, d: "sendby" | "offer" | "withdraw" | "plan") => {
    setPop(null);
    const via = d === "sendby" ? { mode: "edit" as const, preset: { sendBy: true } }
      : d === "withdraw" ? { mode: "close" as const, preset: { closeWhy: "withdraw" as const } }
      : d === "plan" ? { mode: "nudge" as const, preset: { nudgeTab: "plan" as const } } : undefined;
    if (!via) { act(i); return; }
    const req = deskRequest(i, via);
    if (!req) return;
    if (currentParked()) { act(i); return; } // one journey at a time: the card asks (§E)
    setWorkKey(i.key);
    openQueryDrawer({ ...req, onSaved: (r: SavedResult) => { req.onSaved?.(r); }, onCancel: () => undefined });
  };

  /* ── the Set aside tab: bring back, change the date, turn back on (§I.5) ── */
  const asideDesk = asideSel ? asideList.find((a) => a.id === asideSel) ?? asideList[0] ?? null : asideList[0] ?? null;
  const asideCard = (a: SetAsideItem | null): TrayItem | null => {
    if (!a || a.kind === "rule" || !a.flag) return null;
    const input = { flags: [a.flag], queries, agents, manuscripts, userTasks, nowMs: now };
    const c = (a.kind === "snooze" || a.legacy ? snoozedCards(input) : dismissedCards(input))[0];
    return c ? trayItem(c, trayDb, now) : null;
  };
  const bringBack = async (a: SetAsideItem) => {
    const r = a.restore;
    if ("rule" in r) {
      const before = currentUser?.mutedTaskRules ?? [];
      const n = wouldRaise(r.rule).n;
      await updateUserProfile({ mutedTaskRules: before.filter((k) => k !== r.rule) });
      setTrayView("tray");
      flash(`${RULE_TITLE[r.rule]}: back on. ${n} ${n === 1 ? "task is" : "tasks are"} in your tray.`, { label: "Undo", fn: async () => { await updateUserProfile({ mutedTaskRules: before }); } }, UNDO_MS);
      return;
    }
    const card = asideCard(a);
    await upsertTaskFlag(r.flag, r.patch);
    if (a.flag) { markBack(`${a.flag.taskType}|${a.flag.queryId ?? a.flag.agentId ?? ""}`); setSelectWhen({ taskType: a.flag.taskType, rid: a.flag.queryId ?? a.flag.agentId ?? "" }); }
    setTrayView("tray");
    flash(`Back in your tray · ${card?.deed ?? "the task"}${card?.who ? ` for ${card.who}` : ""}`, undefined, UNDO_MS);
  };
  const changeDate = async (a: SetAsideItem, days: number, ymd: string) => {
    setPop(null);
    if (!a.flag || a.restore === undefined || "rule" in a.restore) return;
    await upsertTaskFlag(a.restore.flag, { snoozedUntil: new Date(Date.now() + days * DAYMS).toISOString() });
    flash(`Now back on ${dayLabel(ymd)}`);
  };
  /** what a switched-off rule would raise if it were back on — the board's own derivation without that one mute */
  const wouldRaise = (rule: string): { n: number; names: string[] } => {
    const others = (currentUser?.mutedTaskRules ?? []).filter((r) => r !== rule);
    const need = SWEEP_NEED[rule];
    const names = new Set<string>();
    let n = 0;
    for (const t of tasksIgnoringMutes ?? []) {
      if (need) {
        if (t.taskType !== "data_quality_poor") continue;
        const ag = agents.find((x) => x.id === t.relatedRecordId);
        if (!ag || !visibleAgentNeeds(ag, others).includes(need)) continue;
        n++; names.add((ag.name || ag.agency || "").trim());
      } else {
        if (taskSurvivesMute(t.taskType, undefined, [rule]) || !taskSurvivesMute(t.taskType, undefined, others)) continue;
        n++;
        const q = queries.find((x) => x.id === t.relatedRecordId);
        const ag = q ? agents.find((x) => x.id === q.agentId) : undefined;
        if (ag) names.add((ag.name || ag.agency || "").trim());
      }
    }
    return { n, names: [...names].filter(Boolean) };
  };
  asideKeys.current = {
    view: trayView, list: asideList, sel: asideDesk?.id ?? null, select: (id) => { setPop(null); setAsideSel(id); },
    bring: () => { if (asideDesk) void bringBack(asideDesk); },
    pop: (f) => { if (!deskItem || ghost) return; setPop({ mode: deskItem.userTask ? "move" : "aside", focus: f }); },
    toSheet,
  };
  /* a brought-back task is selected the moment the board has it */
  useEffect(() => {
    if (!selectWhen) return;
    const hit = items.find((i) => i.card.taskType === selectWhen.taskType && (i.card.relatedRecordId === selectWhen.rid || (i.query?.id === selectWhen.rid)))
      ?? items.find((i) => i.sweep && selectWhen.taskType === "data_quality_poor");
    if (hit) { setSelKey(hit.key); scrollRowIntoView(hit.key); setSelectWhen(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, selectWhen]);
  /* ── what came back, and why: BACK TODAY (a snooze's day, or brought back by hand) and a dismissal outranked (§I.2, §I.5) ── */
  const backOf = (i: TrayItem): { tag: string; line: string } | null => {
    if (i.card.userTaskId) return null;
    const mk = `${i.card.taskType}|${i.card.relatedRecordId ?? ""}`;
    if (manualBack[mk]) return { tag: "Back today", line: "You brought it back from Set aside." };
    const f = flagForCard(i.card, taskFlags);
    if (f && flagDismissed(f)) {
      const ch = subjectChange(f, activities);
      if (ch && !dismissalHolds(f, ch.ms)) {
        const first = (i.agent?.name || i.agent?.agency || "").trim().split(/\s+/)[0] ?? "";
        return { tag: "Back", line: backFact(ch.act, first, (iso) => dayMonth(iso)).replace(/^Back · /, "") };
      }
    }
    if (i.card.returnedToday) return { tag: "Back today", line: "From a snooze." };
    return null;
  };

  /* ── v5.1 §J — while a journey or the compose card is open the page scroller is LOCKED, with the sheet brought up
     first, so the task fills one screen and only the tray and the card's body scroll. Leaving work unlocks it. ── */
  const busyDesk = working || !!compose;
  useEffect(() => {
    if (!busyDesk) return undefined;
    const sc = scroller();
    if (!sc) return undefined;
    toSheet();
    const was = sc.style.overflowY;
    sc.style.overflowY = "hidden";
    sc.setAttribute("data-td5-locked", "");
    return () => { sc.style.overflowY = was; sc.removeAttribute("data-td5-locked"); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busyDesk]);

  /* the slot node goes where the journey is: into the working card's host, else back to its holder (deskSlot.ts) */
  useLayoutEffect(() => { placeDeskSlot(working ? hostEl : null, holderRef.current); });
  /* a journey parked from a task in this tray shows as that row's "Started", so the corner chip would say it twice */
  const routeOn = location.pathname === "/todo";
  useEffect(() => {
    document.body.classList.toggle("td5-parked-here", routeOn && !!startedKey);
    return () => { document.body.classList.remove("td5-parked-here"); };
  }, [routeOn, startedKey]);
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
    if (nx) { selectRow(nx.key); scrollRowIntoView(nx.key); }
  };

  const header = (
    <TrayHeader
      loading={loading} n={loading ? null : n} caught={state === "caught"} msTitle={msTitle}
      counts={counts} active={kindActive} onKind={(k) => setFilters((f) => ({ ...f, type: f.type === k ? null : k }))}
      cleared={week.length} ringTitle={undated}
      onRing={() => sheetRef.current?.scrollIntoView({ block: "start", behavior: reduced() ? "auto" : "smooth" })}
      onAdd={() => openCompose()} asideN={asideN} asideRef={asideRef} onAside={() => showView("aside")}
      calFiltered={!!calFilter}
      calendar={state === "list" ? (
        <TrayCalendar today={calToday} items={calItems} buckets={calBuckets} n={n} filter={calFilter} onFilter={setCalFilter}
          onOpenDrawer={() => setCalDrawer(true)} onSetAside={() => showView("aside")} drawerOpen={calDrawer} sel={calSel} onSel={setCalSel} />
      ) : undefined}
    >
      {state === "list" || state === "loading" ? (
        <TrayFilterRow filters={filters} setFilters={setFilters} all={items} countFor={countFor} hasPin={hasPin} findRef={findRef} disabled={loading}
          calChip={calFilter ? { label: calFilterLabel(calFilter, shortDay), onClear: () => setCalFilter(null) } : null} />
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
          data-query={i.query?.id} data-cal-ymd={calYmdOf.get(i.key)} data-out={leaving ? "" : undefined} aria-current={!ghost && sel?.key === i.key ? "true" : undefined}
          onClick={() => selectRow(i.key)}>
          <Disc item={i} />
          <span className="td5-tx"><b>{i.deed}{startedKey === i.key ? <span className="td5-tag" data-td5="started">Started</span> : null}{(() => { const b = backOf(i); return b ? <span className="td5-tag" data-back="" data-td5="back-tag">{b.tag}</span> : null; })()}</b><small>{i.sub}</small></span>
          <DueDial dial={i.dial} size={52} />
        </button>
      );
    });
  };

  return (
    <div className="td5-root" data-todo-v5="" data-state={state} ref={rootRef}>
      <WorkspacePageGrid className="td5-wpg" scrollLabel="To-do list" masthead={null}>
        <div className="td5-group" data-td5="group">
          {state === "nothing" ? (
            <TrayNothingYet msTitle={msTitle} onLog={() => openQueryDrawer({ mode: "log" })} onImport={() => navigate("/import")} onAdd={() => openCompose()} />
          ) : (
            <>
              {header}
              <div className="td5-sheet" ref={sheetRef} data-td5="sheet" data-focus={focusMode ? "" : undefined}
                data-one={state === "list" || state === "loading" ? "" : undefined} data-working={busyDesk ? "" : undefined}>
                <div className="td5-nav" data-td5="nav">
                  {state === "caught" ? (
                    <p className="td5-say" data-td5="say">
                      Nothing in your tray.{nextLand[0] ? <> The next task lands on <b>{dayMonth(nextLand[0].ms)}</b>.</> : null}
                    </p>
                  ) : (
                    <div className="td5-say" data-td5="say" style={{ position: "relative", overflow: "visible" }}>
                      {anyFilter ? (
                        <>Showing <b>{visible.length}</b> of <b>{items.length}</b><button type="button" className="td5-clr" data-td5="clear-all" onClick={clearAll}>Clear all</button></>
                      ) : (
                        <>Working through <b>{visible.length} {visible.length === 1 ? "task" : "tasks"}</b>,{" "}
                          <button type="button" className="td5-sortb" data-td5="sort" aria-haspopup="menu" aria-expanded={sortOpen} onClick={() => setSortOpen((o) => !o)}>{SORT_LABEL[sort]}</button>
                        </>
                      )}
                      {sortOpen && !anyFilter ? (
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
                      <div className="td5-strip" data-td5="strip" role="tablist" aria-label="Your tray">
                        <button type="button" role="tab" className="td5-tab" data-td5="tab-tray" aria-selected={trayView === "tray"} onClick={() => showView("tray")}>In your tray <b>{visible.length}</b></button>
                        <button type="button" role="tab" className="td5-tab" data-td5="tab-aside" data-bump={bumpTab || undefined} key={`aside-${bumpTab}`} aria-selected={trayView === "aside"} onClick={() => showView("aside")}>Set aside <b>{asideN}</b></button>
                        <span className="td5-sp" /><span className="td5-h">{trayView === "tray" ? "Due" : "Back"}</span>
                      </div>
                      {trayView === "aside" ? (
                        <div className="td5-aside" data-td5="aside-list">
                          <p className="td5-asidenote">Nothing here is lost. Snoozed tasks come back on their day. Dismissed ones come back if anything changes.</p>
                          {asideList.length ? ([
                            { k: "snooze" as const, name: "Coming back", note: "By date", tint: "#e2e7ef", ink: "#2a3a52" },
                            { k: "dismiss" as const, name: "Dismissed", note: "Back if anything changes", tint: "#ece8e3", ink: "rgba(28,19,15,.6)" },
                            { k: "rule" as const, name: "Switched off", note: "Never raised", tint: "#f1efea", ink: "rgba(28,19,15,.6)" },
                          ].map((sec) => {
                            const rows = asideList.filter((a) => a.kind === sec.k);
                            if (!rows.length) return null;
                            return (
                              <div key={sec.k} className="td5-grp" data-td5="aside-group" data-g={sec.k}>
                                <div className="td5-band td5-band--plain" style={{ background: sec.tint, color: sec.ink }}><span className="td5-bn">{sec.name}</span><span className="td5-bc">{rows.length}</span><span className="td5-bnote">{sec.note}</span></div>
                                <div className="td5-rows">{rows.map((a) => {
                                  const c = asideCard(a);
                                  const on = asideDesk?.id === a.id;
                                  const until = a.until ? new Date(Date.parse(a.until)) : null;
                                  const puts = a.flag?.snoozeCount ?? 0;
                                  return (
                                    <button key={a.id} type="button" className="td5-row2 td5-row2--aside" data-td5="aside-row" data-kind={a.kind} data-legacy={a.legacy ? "" : undefined} data-aside={a.id}
                                      aria-current={on ? "true" : undefined} onClick={() => { setPop(null); setAsideSel(a.id); }}>
                                      {a.kind === "rule" ? <span className="td5-disc" data-rule="" aria-hidden="true">⊘</span> : <span className="td5-disc" data-aside="" aria-hidden="true">{c?.initials || "•"}</span>}
                                      <span className="td5-tx">
                                        <b>{a.kind === "rule" ? a.label : c?.deed ?? a.label}</b>
                                        <small>{a.kind === "snooze" ? `${a.who || c?.who || "Your task"} · back ${until ? dayLabel(localYMD(until.getTime())) : ""}${puts > 1 ? ` · put off ${puts} times` : ""}`
                                          : a.kind === "dismiss" ? `Dismissed${a.at && !a.legacy ? ` ${dayMonth(a.at)}` : ""} · ${a.who || c?.who || "Your task"}` : "For every agent"}</small>
                                      </span>
                                      {until ? <span className="td5-back" aria-hidden="true"><b>{until.getDate()}</b><small>{MONTHS_SHORT[until.getMonth()]}</small></span> : <span />}
                                    </button>
                                  );
                                })}</div>
                              </div>
                            );
                          })) : <div className="td5-noslips" data-td5="aside-empty">{SET_ASIDE_EMPTY}</div>}
                          <button type="button" className="td5-lnk td5-tagsdoor" data-td5="manage-tags" ref={tagsRef} onClick={() => setTagsOpen((o) => !o)}>Manage tags</button>
                        </div>
                      ) : <>
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
                      }) : loading ? null : <div className="td5-none">{items.length ? "Nothing matches. Clear the filter to see the rest of your tray." : "Nothing in your tray yet."}</div>}
                      {loading ? null : <button type="button" className="td5-addrow" data-td5="add-row" onClick={() => openCompose()}>+ Add a task<kbd>N</kbd></button>}
                      </>}
                    </div>
                    <div className="td5-deskcol" data-td5="deskcol">
                      <div className="td5-desk" data-td5="desk">
                        {trayView === "aside" && !compose ? (
                          <div className="td5-stackwrap" data-td5="aside-desk">
                            {asideDesk ? (() => {
                              const a = asideDesk;
                              const c = asideCard(a);
                              const until = a.until ? localYMD(Date.parse(a.until)) : null;
                              const left = until ? daysBetween(todayYmd, until) : 0;
                              const puts = a.flag?.snoozeCount ?? 0;
                              const banner = a.kind === "snooze"
                                ? <div className="td5-asideban" data-kind="snooze" data-td5="aside-banner"><b>Snoozed</b>Back in your tray on {dayLabel(until!)}, in {left} {left === 1 ? "day" : "days"}.{puts > 1 ? ` Put off ${puts} times.` : ""}</div>
                                : a.kind === "dismiss"
                                  ? <div className="td5-asideban" data-kind="dismiss" data-td5="aside-banner"><b>Dismissed</b>{a.at && !a.legacy ? `${dayMonth(a.at)}. ` : ""}{a.datesChanges ? `It comes back by itself if anything changes on ${a.who || "this"}’s record.` : "Back only if you bring it back."}</div>
                                  : null;
                              if (a.kind === "rule") {
                                const wr = wouldRaise(a.rule!);
                                return (
                                  <article className="td5-dcard" data-td5="desk-card" data-asided="" data-kind="rule">
                                    <div className="td5-chead" style={{ background: "#ece8e3", color: "rgba(28,19,15,.6)", paddingLeft: 24 }}><span className="td5-cn">{a.label}</span><span className="td5-why">Housekeeping</span></div>
                                    <div className="td5-cbody">
                                      <div className="td5-asideban" data-kind="rule" data-td5="aside-banner"><b>Switched off</b>For every agent. QueryHawk doesn’t raise these at all while it’s off.</div>
                                      <h2 className="td5-deed" data-td5="deed">{a.label}</h2>
                                      <p className="td5-lede" data-td5="lede">Turn it back on and a task appears for each one it applies to.</p>
                                      <div className="td5-facts" data-td5="facts">
                                        <div><span className="td5-fl">Would raise</span><span className="td5-fv" data-td5="would-raise">{wr.n} {wr.n === 1 ? "task" : "tasks"}</span></div>
                                        <div style={{ gridColumn: "span 2" }}><span className="td5-fl">For</span><span className="td5-fv" data-muted={wr.names.length ? undefined : ""}>{wr.names.length ? wr.names.slice(0, 6).join(", ") + (wr.names.length > 6 ? ` and ${wr.names.length - 6} more` : "") : "Nobody, today"}</span></div>
                                      </div>
                                    </div>
                                    <div className="td5-cfoot" data-td5="card-foot"><button type="button" className="td5-b1" data-td5="bring-back" onClick={() => void bringBack(a)}>Turn it back on</button><span className="td5-sp" /><span className="td5-keys" aria-hidden="true"><kbd>E</kbd> bring back</span></div>
                                  </article>
                                );
                              }
                              if (!c) return <div className="td5-noslips">This one can’t be shown. <button type="button" className="td5-lnk" onClick={() => void bringBack(a)}>Bring it back now</button></div>;
                              return (
                                <DeskCard key={a.id} item={c} facts={deskFacts(c, trayDb, now)} lede={lede(c, trayDb, now)} stops={stopsFor(c)} pastDays={null} pin={pinFor(c)}
                                  action="Bring it back now" onAct={() => void bringBack(a)} asideRef={asideMoreRef} onAside={null} onOpenQuery={null}
                                  stamp={null} phase="rest" asided banner={banner}
                                  foot={(
                                    <div className="td5-cfoot" data-td5="card-foot">
                                      <button type="button" className="td5-b1" data-td5="bring-back" onClick={() => void bringBack(a)}>Bring it back now</button>
                                      {a.kind === "snooze" ? <button type="button" className="td5-b2" data-td5="change-date" ref={asideMoreRef} onClick={() => setPop((p) => (p ? null : { mode: "change", focus: "snooze" }))}>Change the date</button> : null}
                                      <span className="td5-sp" /><span className="td5-keys" aria-hidden="true"><kbd>E</kbd> bring back</span>
                                    </div>
                                  )}
                                  over={pop && pop.mode === "change" && a.kind === "snooze" ? (
                                    <SetAsidePop mode="change" focus="snooze" todayYmd={todayYmd} rules={null} first="" backLine="" rulePlain={null} deedPlain=""
                                      onSnooze={(d, y) => void changeDate(a, d, y)} onDismiss={() => undefined} onRule={() => undefined} onDelete={() => undefined} onDoor={() => undefined}
                                      onClose={() => setPop(null)} opener={asideMoreRef.current} />
                                  ) : null} />
                              );
                            })() : <div className="td5-noslips">Choose something on the left to bring it back.</div>}
                          </div>
                        ) : compose ? (
                          <div className="td5-stackwrap">
                            <div className="td5-stack" aria-hidden="true"><i /><i /></div>
                            <ComposeCard todayYmd={todayYmd} draft={compose.draft} setDraft={(d) => setCompose((c) => (c ? { ...c, draft: d } : c))} edit={compose.edit}
                              queries={queries} agents={agents} manuscripts={manuscripts} userTags={currentUser?.tags ?? []} onCreateTag={(t) => void createTagDef(t)}
                              onSave={saveCompose} onCancel={closeCompose} stamp={composeStamp} />
                          </div>
                        ) : deskItem ? (
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
                                action={startedKey === deskItem.key ? "Carry on" : actionWords(deskItem)} onAct={() => act(deskItem)}
                                work={working} hostRef={setHostEl}
                                asideLabel={deskItem.userTask ? "Move it" : "Set aside"}
                                banner={(() => { const b = backOf(deskItem); return b ? <div className="td5-asideban" data-kind="back" data-td5="back-banner"><b>Back</b>{b.line}</div> : null; })()}
                                over={pop && pop.mode !== "change" && !ghost ? (() => {
                                  const r = rulesFor(deskItem);
                                  const first = (deskItem.agent?.name || deskItem.agent?.agency || "").trim().split(/\s+/)[0] ?? "";
                                  const rk = ruleKeyFor(deskItem);
                                  return (
                                    <SetAsidePop mode={pop.mode} focus={pop.focus} todayYmd={todayYmd} rules={r} first={first} backLine={backLineFor(deskItem)}
                                      rulePlain={rk ? RULE_PLAIN[rk] : null} deedPlain={deskItem.deed.toLowerCase()}
                                      onSnooze={(d, y) => void doSnooze(deskItem, d, y)} onDismiss={() => void doDismiss(deskItem)} onRule={() => void doRule(deskItem)}
                                      onDelete={() => void doDelete(deskItem)} onDoor={(d) => doDoor(deskItem, d)} onClose={() => setPop(null)} opener={deskAsideRef.current} />
                                  );
                                })() : clash && clash.key === deskItem.key && parkedHere ? (() => {
                                  const q = queries.find((x) => x.id === clash.req.queryId);
                                  const c = clashAsk(parkedHere, { doing: journeyDoing(clash.req.mode, q?.status), name: deskItem.who });
                                  const back = items.find((x) => x.query?.id === parkedHere.req.queryId);
                                  return (
                                    <div className="td5-clash" role="alert" data-td5="clash">
                                      <span><b>{c.head}</b>{c.sub}</span>
                                      <button type="button" className="td5-b2" data-td5="clash-finish" onClick={() => { setClash(null); if (back) { setSelKey(back.key); scrollRowIntoView(back.key); setWorkKey(back.key); const r = deskRequest(back); if (r) { setPending({ key: back.key, at: Date.now() }); resumeQueryDrawer(r); } } }}>Finish it</button>
                                      <button type="button" className="td5-b1" data-td5="clash-swap" onClick={() => { const r = clash.req; setClash(null); discardParked(); setWorkKey(deskItem.key); setPending({ key: deskItem.key, at: Date.now() }); openQueryDrawer(r); }}>Discard and start</button>
                                    </div>
                                  );
                                })() : null}
                                asideRef={deskAsideRef} onAside={ghost ? null : () => setPop((p) => (p ? null : { mode: deskItem.userTask ? "move" : "aside", focus: "snooze" }))}
                                onOpenQuery={deskItem.query && !deskItem.card.userTaskId ? () => openQueryPanel(deskItem.query!.id, "other") : null}
                                onEdit={deskItem.userTask ? () => openCompose(deskItem.userTask!) : null}
                                stamp={ghost && ghost.phase !== "hold" ? stampFor(ghost.item) : null}
                                phase={ghost ? (ghost.phase === "hold" ? "rest" : ghost.phase) : rise === deskItem.key ? "rise" : "rest"}
                              />
                            </div>
                          </>
                        ) : loading ? null : <div className="td5-noslips">Nothing in view. Clear the filter or the search.</div>}
                        <DoneToday acts={today} fresh={freshSlip} undoFor={undoFor} />
                        {/* the desk's journey slot waits here, hidden, when no journey is on the card (deskSlot.ts) */}
                        <div ref={holderRef} hidden data-td5="slot-holder" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </WorkspacePageGrid>

      {tagsOpen && tagsRef.current ? (
        <AnchoredPanel anchor={tagsRef.current} ariaLabel="Tags" variant="panel" onClose={(back) => { setTagsOpen(false); if (back) tagsRef.current?.focus(); }}>
          <TagsPane />
        </AnchoredPanel>
      ) : null}
      <TrayCalDrawer open={calDrawer} today={calToday} items={calItems} n={n} sel={calSel} onSel={setCalSel}
        onClose={() => setCalDrawer(false)} onDesk={calToDesk} wordsOf={calWords} onAdd={() => { setCalDrawer(false); openCompose(); }} />
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
