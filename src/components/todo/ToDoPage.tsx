/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ToDoPage — THE FINAL SHAPE (design-refs/todo-final.html, THE LAWS v4). Top: the stripped
 * HERO (headline + Begin focused session) with the floating search breaking its edge. Left: the
 * FILTER RAIL (vertical quiet pills + settings/Pro foot). Centre: the 812 sheet hosting both
 * views (the wrapped grid · the run sheet) under the resident review. Right: Today (or its
 * narrow chip beside the search).
 *
 * Presentation + view-model only — the task engine, taskFlags and every write path are untouched;
 * lane renames are UI labels (UserTask / taskType enums unchanged in code). The pure view-model is
 * `src/lib/todoBoard.ts` (assembleBoard → three lanes + the cleared union; todaySplit → the two
 * bands; ribbonTiles → the header counts, housekeeping = GAPS via todoHousekeeping.hkGapCount).
 * Theme: F12 only (`.t-f12` tokens). StatusDot consumed verbatim.
 *
 * The AppShell's global help "?" is hidden on /todo (the pack's one out-of-page line) — the
 * sidebar foot carries ⚙ Task settings; help lives on the AppShell FAB (whose /todo menu
 * dispatches the same sa:todo-replay-tour event).
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { F12Page, F12Account } from "../shell/F12Shell";
import { StatusDot } from "../StatusDot";
import { useScriptAllyDb } from "../../lib/db";
import { getPrimaryAction } from "../../lib/queryPrimaryAction";
import { assembleBoard, todaySplit, ribbonTiles, reviewWeek, reviewCompletionSnooze, BoardCard, USER_TASK_FLAG_TYPE } from "../../lib/todoBoard";
import { flagKeyForTask, flagMatchesTask, MUTED_UNTIL } from "../../lib/taskFlags";
import {
  choosePicks, rolledOverCards, todayGhosts, MAX_TODAY,
  quickSendPayload, quickNudgePayload, receiptLine, markSentWriteArgs, nudgeWriteArgs, materialOptsForTask, priorSameTypeSend, duplicateSendPrompt,
} from "../../lib/todoWalk";
import { weekOfQuerying } from "../../lib/dashboardStats";
import { isProUser } from "../../lib/assistFill";
import { groupHousekeeping, hkGapCount, hkGroupProgress, HkGroup, HkRule, HK_RULES, laterHideKey } from "../../lib/todoHousekeeping";
import { deskState, liveQueryCount, liveQueriesLine, clearedListCap } from "../../lib/todoEmpty";
import { ledgerTitle, ledgerDetail, sortLedgerDo, sortLedgerHk, batchChildren, batchDetail, batchTaskCopy, truncateRows } from "../../lib/todoLedger";
import focusArt from "../../assets/todo/focus-art.png";
// VI P2 — the review cup (original ScriptAlly artwork; currentColor → inlined so it inherits ink)
import reviewCupRaw from "../../assets/todo/review-cup.svg?raw";
import { TodoFilterState, DEFAULT_FILTERS, filtersActive, matchesSearch, groupMatchesSearch, visibleDoCard, visibleStaleCard, visibleNoteCard, visibleGroup, filterCounts, isResting, togglePill, FilterType } from "../../lib/todoFilters";
import { SelState, EMPTY_SEL, applySelectClick, moveFocus } from "../../lib/todoSelection";
import { shouldAutoRunTour } from "../../lib/todoTour";
import { TodoTour } from "./TodoTour";
import { ActivityType, QueryStatus } from "../../types";
import { FocusFlow, FocusItem } from "./FocusFlow";
import { TaskSettingsSheet } from "./TaskSettingsSheet";
import "./todo.css";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const localYMD = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
/** The ink header's date line — "Thu 16 Jul" (design-refs/todo-header-ink.html). */
const shortHeaderDate = (ms: number): string =>
  new Date(ms).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
// VI P1 — the ghost rows' faded text-bar widths (the ref's 64/78/52), cycled by index.
// ⚠ MODULE scope on purpose: the render helpers live BELOW the component's return statement
// (hoisted function declarations), where a component-body `const` is dead code — never
// initialised — and a hoisted reader hits the TDZ at first render (the crash class that took
// the whole app down twice: openSundayReview `4d4fbed`, GHOST_BARS this fix). The regression
// lock in todoWorkbench.test.ts bans component-level const/let after the return.
const GHOST_BARS = [64, 78, 52];
const fmtTime = (ms?: number): string => {
  if (ms == null) return "";
  if (Date.now() - ms < 120000) return "just now";
  const d = new Date(ms);
  let h = d.getHours();
  const ap = h < 12 ? "am" : "pm";
  h = h % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, "0")}${ap}`;
};

/** G3 grouped-card copy (retoken ref) — RULE-ACCURATE: the approved "Add details of what you sent"
 *  materials line is red-gated (the rule checks the agent's REQUIREMENTS, not query sent-materials);
 *  this copy says what the rule actually checks. Swap one line here if Nick approves new wording. */
const G3_COPY: Record<string, { rest: (n: number) => string; sub: string }> = {
  dq_responseTime: { rest: (n) => ` agent${n === 1 ? "" : "s"} missing a reply window`, sub: "Without one we can’t tell you when a nudge is fair." },
  dq_materials: { rest: (n) => ` agent${n === 1 ? "" : "s"} missing a materials list`, sub: "Add what they ask to receive so your package check can run." },
  dq_mswl: { rest: (n) => ` agent${n === 1 ? "" : "s"} missing a wish list`, sub: "Their wish list is how we tell you who’s worth querying." },
};

type Overlay =
  | { kind: "receipt"; lane: "do" | "hk" | "nt"; title: string; line: string; undo?: () => void | Promise<void>; edit?: () => void }
  | { kind: "dismissed"; lane: "do" | "hk" | "nt"; text: string; undo: () => void | Promise<void>; never?: () => void }
  | { kind: "fork"; single: boolean }
  ;

/** One board SECTION (workbench P2 — the horizontal reels are RETIRED): coloured header row over a
 *  wrapping auto-fill card grid. No scroll machinery — the page scrolls, the grid wraps. The
 *  `tdb-reel` wrapper class name is kept (historical); the head is the shared tinted band (II·B P4). */
const Lane: React.FC<{
  cls: string;
  label: string;
  count: number;
  isEmpty: boolean;
  onAdd?: () => void;
  onFocusedSession?: () => void; // "Focus on {label}" (launches the focus flow's sweep mode; handler unchanged)
  /** Deck v2: when the deck narrows this lane, the heading appends "x OF y · FILTERED · SHOW ALL". */
  filtered?: { x: number; y: number; showAll: () => void } | null;
  emptyNode?: React.ReactNode;
  strip?: React.ReactNode; // rendered between the header and the grid (e.g. muted-rules recovery chips)
  children?: React.ReactNode;
}> = ({ cls, label, count, isEmpty, onAdd, onFocusedSession, filtered, emptyNode, strip, children }) => {
  // Deck v2 P4 — the one-row EXACT-FIT reel (width law v3): the viewport is a fixed 774
  // (3 × 250 + 2 × 12); cards flex:0 0 250; snap paging BY THREE; no partial cards, no edge
  // fades — the heading pagers + counts carry "there's more". The width-aware fit module is
  // retired (nothing to fit). The heading is BAND-LESS: play button (30) · Playfair 20 title with the 25×3 family
  // underline · count chip · [filtered append] · ‹ › pagers right (28px, dimmed at the ends).
  const ref = useRef<HTMLDivElement>(null);
  const [ends, setEnds] = useState({ left: false, right: false });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      setEnds((prev) => {
        const max = el.scrollWidth - el.clientWidth;
        const next = { left: el.scrollLeft > 4, right: el.scrollLeft < max - 4 };
        return next.left === prev.left && next.right === prev.right ? prev : next;
      });
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", check); ro.disconnect(); };
  }, [children]);
  const REEL_PAGE = 3 * (250 + 12); // three cards + their gutters — the snap page
  const page = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * REEL_PAGE, behavior: "smooth" });
  return (
  <div className={`tdb-reel ${cls}`} id={`tdb-lane-${cls}`}>
    <div className={`tdb-lh2 ${cls === "do" ? "p" : cls === "hk" ? "lat" : "n"}`}>
      {onFocusedSession && !isEmpty && (
        <button type="button" className="tdb-playb" title={`Focus on ${label}`} aria-label={`Focus on ${label}`} onClick={onFocusedSession}>
          <svg width="9" height="10" viewBox="0 0 11 12" aria-hidden><path d="M1.5 1.5 L9.5 6 L1.5 10.5 Z" fill="currentColor" /></svg>
        </button>
      )}
      {onAdd && <button type="button" className="tdb-cadd" onClick={onAdd} aria-label="Add a note">＋</button>}
      <span className="tdb-lgt">{label}</span>
      <span className="tdb-ln">{count}</span>
      {filtered && <span className="tdb-lhfilt">{filtered.x} OF {filtered.y} · FILTERED · <button type="button" onClick={filtered.showAll}>SHOW ALL</button></span>}
      {!isEmpty && (
        <span className="tdb-reelpg">
          <button type="button" className="tdb-pg" disabled={!ends.left} onClick={() => page(-1)} aria-label={`Previous ${label} cards`}>‹</button>
          <button type="button" className="tdb-pg" disabled={!ends.right} onClick={() => page(1)} aria-label={`Next ${label} cards`}>›</button>
        </span>
      )}
    </div>
    {strip}
    {isEmpty ? (
      <div className="tdb-emptyreel">{emptyNode}</div>
    ) : (
      <div className="tdb-reeltrack" ref={ref}>{children}</div>
    )}
  </div>
  );
};

export interface ToDoPageProps {
  onNavigate: (tab: string, subPageName?: string, opts?: { agentId?: string; manuscriptId?: string }) => void;
}

type ToastAction = { label: string; fn: () => void };

export const ToDoPage: React.FC<ToDoPageProps> = ({ onNavigate }) => {
  const {
    tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, currentUser,
    addUserTask, updateUserTask, upsertTaskFlag, updateUserProfile,
    recordMaterialsSent, logNudge, dismissTask, undoQueryStatus, updateQueryStatus, deleteActivity, resolveTaskFlag, updateAgent,
  } = useScriptAllyDb();
  const [toast, setToast] = useState<{ msg: string; action?: ToastAction } | null>(null);
  const [rollDismissed, setRollDismissed] = useState(false);
  const [pulsing, setPulsing] = useState<string | null>(null);
  // THE completion surface — the focus flow (queue of one for a card click; a set for the two walks).
  const [flow, setFlow] = useState<{ items: FocusItem[]; mode?: "sweep" | "weeklyReview"; ritual?: boolean } | null>(null);
  const [flowPrefill, setFlowPrefill] = useState<{ sentDate?: string; method?: string; materials?: string[] } | undefined>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false); // the Task Settings sheet ("What lands on your desk?")
  // VI P1 — "Done today" collapses by default to the ✓ row; expanding is in place, session-only.
  const [showDone, setShowDone] = useState(false);
  // ── workbench shell state. View is a DEVICE UI pref → the sa. localStorage convention.
  // (Deck v2 P3: the sidebar fold + its localStorage key retired with the pair — the rail never
  // folds; <1420 it becomes the 56px icon rail instead, P5.)
  const [view, setView] = useState<"cards" | "ledger">(() => { try { return localStorage.getItem("sa.todoView") === "ledger" ? "ledger" : "cards"; } catch { return "cards"; } });
  const pickView = (v: "cards" | "ledger") => { setView(v); try { localStorage.setItem("sa.todoView", v); } catch { /* private mode */ } };
  // Ledger view state (Phase 3) — session-only: which batch rows are expanded (default collapsed)
  // + which sections dropped their SHOW ALL cap. Collapse restores the scroll position captured at
  // expand (the wrap is the scroller).
  const [openBatches, setOpenBatches] = useState<Record<string, boolean>>({});
  const [showAllSec, setShowAllSec] = useState<Record<string, boolean>>({});
  const batchScroll = useRef<Record<string, number>>({});
  const toggleBatch = (rule: string) => {
    setOpenBatches((s) => {
      const open = !s[rule];
      if (open) batchScroll.current[rule] = wrapRef.current?.scrollTop ?? 0;
      else if (wrapRef.current) wrapRef.current.scrollTop = batchScroll.current[rule] ?? wrapRef.current.scrollTop;
      return { ...s, [rule]: open };
    });
  };
  // ── P5: ledger selection (hover checkboxes · shift ranges · parents as one · children never)
  // + the additive keyboard layer + the ⋯ kebab. All session-only; bulk writes ride the EXISTING
  // primitives optimistically with one undo-all flash.
  const [sel, setSel] = useState<SelState>(EMPTY_SEL);
  const [kfocus, setKfocus] = useState(-1);
  const [kebabAt, setKebabAt] = useState<string | null>(null);
  // ── II·B P3: the companion rail ↔ masthead chip. ONE Today panel (renderTodayPanel), TWO
  // mounts — the right column ≥1240px, the strip-chip popover below — XOR'd on `narrow`, so
  // exactly one mounts and the state never forks (halt (c) clear).
  const [narrow, setNarrow] = useState<boolean>(() => typeof window !== "undefined" && window.matchMedia("(max-width: 1239.98px)").matches);
  const [todayPopOpen, setTodayPopOpen] = useState(false);
  // Deck v2 P5 — the compact break (<1420): the rail collapses to the 56px icon rail (assembly
  // 1172) and the deck's trailing pills fold into FILTER ▾.
  const [compact, setCompact] = useState<boolean>(() => typeof window !== "undefined" && window.matchMedia("(max-width: 1419.98px)").matches);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1419.98px)");
    const on = () => setCompact(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1239.98px)");
    const on = () => setNarrow(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  useEffect(() => { if (!narrow) setTodayPopOpen(false); }, [narrow]);
  useEffect(() => {
    if (!todayPopOpen) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.closest(".tdb-todaypop") || t.closest(".tdb-todaychip"))) return;
      setTodayPopOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setTodayPopOpen(false); };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); window.removeEventListener("keydown", onKey); };
  }, [todayPopOpen]);
  // Masthead search — the input + ⌘K focus mechanics land here (Phase 1); live filtering is
  // Phase 4's wiring. The page stays MOUNTED behind other routes (StagePage display-toggles), so
  // the ⌘K handler must no-op while the board is hidden — offsetParent is null under display:none.
  const [search, setSearch] = useState("");
  // Drawer filters (Phase 4) — session-only; all-visible defaults (hiding is the writer's act).
  const [filters, setFilters] = useState<TodoFilterState>(DEFAULT_FILTERS);
  const filtersRef = useRef<TodoFilterState>(DEFAULT_FILTERS);
  filtersRef.current = filters;
  const setF = (k: keyof TodoFilterState, v: boolean) => setFilters((f) => ({ ...f, [k]: v }));
  const searchRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey))) return;
      if (!wrapRef.current || wrapRef.current.offsetParent === null) return; // board not visible
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const plus7iso = () => new Date(Date.now() + 7 * 86400000).toISOString();
  const openFlowCards = (cards: BoardCard[]) => {
    // III P1 — the board is review-free by construction (the banner/bar own the review's entry)
    if (cards.length) setFlow({ items: cards.map((card) => ({ kind: "card", card })) });
  };
  // Quick-rail card states. Receipts/dismissed render as STANDALONE cards (the live card vanishes the
  // moment the write lands — the board is derived); fork/flip replace a still-live card's body.
  const [overlays, setOverlays] = useState<Record<string, Overlay>>({});
  const setOverlay = (key: string, o: Overlay) => setOverlays((s) => ({ ...s, [key]: o }));
  const clearOverlay = (key: string) => setOverlays((s) => { const n = { ...s }; delete n[key]; return n; });
  // Fresh activities for late undo closures (the created nudge row lands AFTER the click's snapshot).
  const activitiesRef = useRef(activities);
  activitiesRef.current = activities;

  const now = Date.now();
  const today = localYMD(now);

  // Deck v2 P1 — the RESIDENT review banner: no windows, no dismissal, one derived boolean.
  // "Opened" reads the only stored review record — the completion sentinel finishReview writes —
  // so the button flips to "View again" once the week's review is finished (recon resolution 1).
  const reviewWin = queries.length > 0 ? reviewWeek(queries, now) : null;
  const reviewOpened = !!reviewWin && taskFlags.some((f) => flagMatchesTask(f, "weekly_review", reviewWin.key) && f.snoozedUntil === reviewCompletionSnooze(reviewWin));
  const board = useMemo(
    () => assembleBoard({ tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, today, now, mutedTaskRules: currentUser?.mutedTaskRules }),
    // now/today are session-stable enough; recomputing on the data arrays is what matters.
    // mutedTaskRules is a board dep because the Sunday CARD reads it directly (nudge/dq/stale mutes
    // change `tasks` upstream, but sunday_review does not).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, userTasks, queries, agents, manuscripts, taskFlags, today, currentUser?.mutedTaskRules],
  );
  // The Housekeeping lane renders the dq rules GROUPED (one card per rule, queried-first members) +
  // STALE queries as INDIVIDUAL cards (real one-off decisions, never batched). The flat board.hk
  // still feeds Today's-list + Help-me-pick unchanged. Rule-muted groups drop out here too.
  const hkGroups = useMemo(
    () => groupHousekeeping(board.hk, agents, currentUser?.mutedTaskRules, queries),
    [board.hk, agents, currentUser, queries],
  );
  const staleCards = useMemo(() => board.hk.filter((c) => c.taskType === "no_response_close"), [board.hk]);
  const mutedRules = (currentUser?.mutedTaskRules ?? []).filter((r): r is HkRule => r in HK_RULES);
  // ONE counts object read by BOTH the ribbon tiles and the lane headers (equality by construction).
  // Housekeeping = the gap count + the individual stale cards (12+9 gaps + 4 stale = 25), never piles.
  const tiles = ribbonTiles(board, hkGapCount(hkGroups) + staleCards.length);
  // Empty-state derivation (todo-empty-states.html): A = new desk (zero queries AND agents);
  // E = desk cleared (all three sets empty AND a non-empty done-log — earned, never default);
  // otherwise each reel handles its own clear. All pure views; nothing stored.
  const hkItemCount = hkGroups.length + staleCards.length;

  // Post-it tap → the lane (the 6B tile-tap behaviour, built here — 6B itself is red-gated).
  const scrollToLane = (cls: "do" | "hk" | "nt") => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(`tdb-lane-${cls}`)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };
  const flash = (msg: string, action?: ToastAction) => {
    const t = { msg, action };
    setToast(t);
    window.setTimeout(() => setToast((cur) => (cur === t ? null : cur)), action ? 5000 : 2600);
  };
  function unmuteRule(rule: HkRule) {
    updateUserProfile({ mutedTaskRules: (currentUser?.mutedTaskRules ?? []).filter((r) => r !== rule) });
    flash("Unmuted — those reminders are back.");
  }
  // ── Deck v2 P4: the hover VERB ROW's state — ~150ms intent delay arms it; leave/blur disarms.
  // The Later menu opens per card (laterKey); click-away closes it. ──
  const [verbKey, setVerbKey] = useState<string | null>(null);
  const [laterKey, setLaterKey] = useState<string | null>(null);
  const verbTimer = useRef<number | null>(null);
  const armVerbs = (key: string) => {
    if (verbTimer.current) window.clearTimeout(verbTimer.current);
    verbTimer.current = window.setTimeout(() => setVerbKey(key), 150);
  };
  const disarmVerbs = () => {
    if (verbTimer.current) window.clearTimeout(verbTimer.current);
    verbTimer.current = null;
    setVerbKey(null); setLaterKey(null);
  };
  useEffect(() => {
    if (!laterKey) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && t.closest(".tdb-latwrap")) return;
      setLaterKey(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [laterKey]);
  // the Later snoozes — the EXISTING primitives, day-parameterised (undo everywhere)
  function snoozeCard(c: BoardCard, days: number, when: string) {
    const lane = (c.stream === "nt" ? "nt" : c.stream === "hk" ? "hk" : "do") as "do" | "hk" | "nt";
    const text = `Snoozed — back ${when}.`;
    if (c.userTaskId) {
      const key = { taskType: USER_TASK_FLAG_TYPE, queryId: c.userTaskId };
      upsertTaskFlag(key, { snoozedUntil: new Date(Date.now() + days * 86400000).toISOString(), bumpSnooze: true });
      const undo = () => upsertTaskFlag(key, { snoozedUntil: null, unbumpSnooze: true }); // full restore, ×n included
      setOverlay(c.key, { kind: "dismissed", lane, text, undo });
      flash(`✓ ${c.title} — snoozed`, { label: "Undo", fn: async () => { await undo(); clearOverlay(c.key); flash("Restored"); } });
      return;
    }
    if (!c.taskType || !c.relatedRecordId) return;
    dismissTask(c.taskType, c.relatedRecordId, "fixed snooze", days);
    const key = flagKeyForTask(c.taskType, c.relatedRecordId);
    const undo = () => upsertTaskFlag(key, { snoozedUntil: null, unbumpSnooze: true }); // full restore, ×n included
    setOverlay(c.key, { kind: "dismissed", lane, text, undo });
    flash(`✓ ${c.title} — snoozed`, { label: "Undo", fn: async () => { await undo(); clearOverlay(c.key); flash("Restored"); } });
  }
  function snoozeGroup(g: HkGroup, days: number, when: string) {
    g.members.forEach((m) => m.agentId && dismissTask("data_quality_poor", m.agentId, "fixed snooze", days));
    const undo = async () => { g.members.forEach((m) => m.agentId && upsertTaskFlag(flagKeyForTask("data_quality_poor", m.agentId), { snoozedUntil: null, unbumpSnooze: true })); };
    const gkey = `group-${g.rule}`;
    setOverlay(gkey, { kind: "dismissed", lane: "hk", text: `Snoozed — back ${when}.`, undo });
    flash(`✓ ${HK_RULES[g.rule].label} — snoozed`, { label: "Undo", fn: async () => { await undo(); clearOverlay(gkey); flash("Restored"); } });
  }
  // the per-type hide — the SAME single suppression point Task settings drives (restorable there)
  function hideType(c: BoardCard, ruleKey: string) {
    updateUserProfile({ mutedTaskRules: Array.from(new Set([...(currentUser?.mutedTaskRules ?? []), ruleKey])) });
    const undo = () => updateUserProfile({ mutedTaskRules: (currentUser?.mutedTaskRules ?? []).filter((r) => r !== ruleKey) });
    flash(`✓ ${c.title} — hidden (restore in Task settings)`, { label: "Undo", fn: async () => { await undo(); flash("Restored"); } });
  }
  function muteRuleFromCard(g: HkGroup) {
    updateUserProfile({ mutedTaskRules: Array.from(new Set([...(currentUser?.mutedTaskRules ?? []), g.rule])) });
    const undo = () => updateUserProfile({ mutedTaskRules: (currentUser?.mutedTaskRules ?? []).filter((r) => r !== g.rule) });
    flash(`✓ ${g.meta.label} — dismissed`, { label: "Undo", fn: async () => { await undo(); flash("Restored"); } });
  }

  // Today: committed band (committedDate === today, the 5-cap set) + done band (the cleared
  // union, uncapped). Rolled-over commitments (a prior day) surface once in the sage Keep/Clear bar.
  const { committed: committedCards, done: doneCards } = todaySplit(board, today);
  const doneN = doneCards.length;
  const desk = deskState({ queryCount: queries.length, agentCount: agents.length, urgent: board.do.length, hkItems: hkItemCount, notes: board.nt.length, clearedToday: doneN });
  // ── Phase 4: search + filters compose AND-wise over BOTH views. The review entry card is
  // furniture — it renders only while nothing is filtered/searched (it would dilute matches).
  const sctx = { queries, agents, manuscripts };
  const active = filtersActive(filters, search);
  const fc = filterCounts({ doCards: board.do, hkGroups, staleCards, ntCards: board.nt, committedCount: committedCards.length });
  const resting = isResting(filters);
  // The Final Shape P1 — the hero's focused-session scope (whole board), hoisted from the rail
  const boardCards = [...board.do, ...board.hk, ...board.nt];
  const vDo = board.do.filter((c) => visibleDoCard(c, filters, today) && matchesSearch(c, search, sctx));
  const vGroups = hkGroups.filter((g) => visibleGroup(g, filters) && groupMatchesSearch(g, search));
  const vStale = staleCards.filter((c) => visibleStaleCard(c, filters, today) && matchesSearch(c, search, sctx));
  const vNt = board.nt.filter((c) => visibleNoteCard(c, filters, today) && matchesSearch(c, search, sctx));
  const anyVisible = vDo.length + vGroups.length + vStale.length + vNt.length > 0;
  // ── the ledger's row model, hoisted (P5): the bulk bar + keyboard walker share the SAME visible
  // top-level order the renderer draws. Children are not in the order — never selectable.
  const lctx = { queries, taskFlags };
  const doSorted = sortLedgerDo(vDo, lctx, now);
  const doCut = truncateRows(doSorted, !!showAllSec.do);
  const staleSorted = sortLedgerHk(vStale, lctx, now);
  const hkTop: Array<{ kind: "group"; g: HkGroup } | { kind: "card"; c: BoardCard }> = [
    ...vGroups.map((g) => ({ kind: "group" as const, g })),
    ...staleSorted.map((c) => ({ kind: "card" as const, c })),
  ];
  const hkCut = truncateRows(hkTop, !!showAllSec.hk);
  const ntCut = truncateRows(vNt, !!showAllSec.nt);
  const ledgerOrder: string[] = view !== "ledger" ? [] : [
    ...doCut.visible.map((c) => c.key),
    ...hkCut.visible.map((r) => (r.kind === "group" ? `group-${r.g.rule}` : r.c.key)),
    ...ntCut.visible.map((c) => c.key),
  ];
  const rowByKey = new Map<string, { kind: "card"; c: BoardCard } | { kind: "group"; g: HkGroup }>([
    ...doCut.visible.map((c) => [c.key, { kind: "card" as const, c }] as const),
    ...hkCut.visible.map((r) => (r.kind === "group" ? [`group-${r.g.rule}`, r] as const : [r.c.key, r] as const)),
    ...ntCut.visible.map((c) => [c.key, { kind: "card" as const, c }] as const),
  ]);
  const selVisible = sel.selected.filter((k) => ledgerOrder.includes(k));
  const clickSelect = (key: string, shift: boolean) => setSel((st) => applySelectClick(st, ledgerOrder, key, shift));
  // Bulk actions — the same writes the singles make, applied optimistically with ONE undo-all.
  function bulkToday() {
    let room = MAX_TODAY - committedCards.length;
    let added = 0;
    for (const k of selVisible) {
      const row = rowByKey.get(k);
      if (!row || row.kind !== "card" || onList(row.c)) continue;
      if (room <= 0) { flash(`Today is full (${MAX_TODAY} max)`); break; }
      setCommitted(row.c, true); room -= 1; added += 1;
    }
    if (added > 0) flash(`＋ ${added} on Today`);
    setSel(EMPTY_SEL);
  }
  function bulkSnooze() {
    const undos: Array<() => void | Promise<void>> = [];
    let n = 0;
    for (const k of selVisible) {
      const row = rowByKey.get(k);
      if (!row) continue;
      if (row.kind === "group") {
        row.g.members.forEach((m) => m.agentId && dismissTask("data_quality_poor", m.agentId, "fixed snooze", 7));
        undos.push(() => row.g.members.forEach((m) => m.agentId && upsertTaskFlag(flagKeyForTask("data_quality_poor", m.agentId), { snoozedUntil: null, unbumpSnooze: true })));
        n += 1;
      } else if (row.c.userTaskId) {
        const key = { taskType: USER_TASK_FLAG_TYPE, queryId: row.c.userTaskId };
        upsertTaskFlag(key, { snoozedUntil: plus7iso(), bumpSnooze: true });
        undos.push(() => upsertTaskFlag(key, { snoozedUntil: null, unbumpSnooze: true }));
        n += 1;
      } else if (row.c.taskType && row.c.relatedRecordId) {
        dismissTask(row.c.taskType, row.c.relatedRecordId, "fixed snooze", 7);
        undos.push(() => upsertTaskFlag(flagKeyForTask(row.c.taskType!, row.c.relatedRecordId!), { snoozedUntil: null, unbumpSnooze: true }));
        n += 1;
      }
    }
    if (n) flash(`✓ ${n} snoozed — back in a week`, { label: "Undo all", fn: async () => { for (const u of undos) await u(); flash("Restored"); } });
    setSel(EMPTY_SEL);
  }
  function bulkDismiss() {
    const undos: Array<() => void | Promise<void>> = [];
    let n = 0;
    for (const k of selVisible) {
      const row = rowByKey.get(k);
      if (!row) continue;
      if (row.kind === "group") {
        row.g.members.forEach((m) => m.agentId && upsertTaskFlag(flagKeyForTask("data_quality_poor", m.agentId), { snoozedUntil: MUTED_UNTIL }));
        undos.push(() => row.g.members.forEach((m) => m.agentId && upsertTaskFlag(flagKeyForTask("data_quality_poor", m.agentId), { snoozedUntil: null })));
        n += 1;
      } else if (row.c.userTaskId) {
        const key = { taskType: USER_TASK_FLAG_TYPE, queryId: row.c.userTaskId };
        upsertTaskFlag(key, { snoozedUntil: MUTED_UNTIL });
        undos.push(() => upsertTaskFlag(key, { snoozedUntil: null }));
        n += 1;
      } else if (row.c.taskType && row.c.relatedRecordId) {
        upsertTaskFlag(flagKeyForTask(row.c.taskType, row.c.relatedRecordId), { snoozedUntil: MUTED_UNTIL });
        undos.push(() => upsertTaskFlag(flagKeyForTask(row.c.taskType!, row.c.relatedRecordId!), { snoozedUntil: null }));
        n += 1;
      }
    }
    if (n) flash(`✓ ${n} dismissed — nothing deleted`, { label: "Undo all", fn: async () => { for (const u of undos) await u(); flash("Restored"); } });
    setSel(EMPTY_SEL);
  }
  // ── P5 keyboard layer — ADDITIVE, never required (every action has a pointer path). Ledger view
  // only; inert while typing, while a journey sheet is up, and while the board is display:none.
  const openRow = (key: string) => {
    const row = rowByKey.get(key);
    if (!row) return;
    if (row.kind === "group") setFlow({ items: [{ kind: "group", group: row.g }] });
    else openFlowCards([row.c]);
  };
  const keyCtx = useRef({ view, ledgerOrder, kfocus, flow: flow as unknown });
  keyCtx.current = { view, ledgerOrder, kfocus, flow };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ctx = keyCtx.current;
      if (ctx.view !== "ledger" || ctx.flow) return;
      if (!wrapRef.current || wrapRef.current.offsetParent === null) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && t.closest("input, textarea, select, [contenteditable=true]")) return;
      const k = e.key;
      if (k === "Escape") { setSel(EMPTY_SEL); setKfocus(-1); setKebabAt(null); return; }
      const order = ctx.ledgerOrder;
      if (k === "ArrowDown" || k === "j" || k === "ArrowUp" || k === "k") {
        e.preventDefault();
        const next = moveFocus(ctx.kfocus, k === "ArrowDown" || k === "j" ? 1 : -1, order.length);
        setKfocus(next);
        const el = document.querySelector(`[data-lkey="${order[next]}"]`);
        el?.scrollIntoView({ block: "nearest" });
        return;
      }
      const key = order[ctx.kfocus];
      if (!key) return;
      const row = rowByKey.get(key);
      if (k === "Enter") { e.preventDefault(); openRow(key); return; }
      if (k === "t" && row?.kind === "card") { e.preventDefault(); toggleToday(row.c); return; }
      if (k === "s") {
        e.preventDefault();
        if (row?.kind === "card") quickPause(row.c);
        else if (row?.kind === "group") forkNotNowGroup(row.g);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function kebabDismiss(c: BoardCard) {
    setKebabAt(null);
    const key = c.userTaskId
      ? { taskType: USER_TASK_FLAG_TYPE, queryId: c.userTaskId }
      : c.taskType && c.relatedRecordId ? flagKeyForTask(c.taskType, c.relatedRecordId) : null;
    if (!key) return;
    upsertTaskFlag(key, { snoozedUntil: MUTED_UNTIL });
    const undo = () => upsertTaskFlag(key, { snoozedUntil: null });
    flash(`✓ ${c.title} — dismissed`, { label: "Undo", fn: async () => { await undo(); flash("Restored"); } });
  }

  // Deck v2 P2 — the shown/total pair (the deck's SHOWING x OF y) + the Esc chain: search
  // clears first, the narrowing second (editables keep their own Esc except the search input,
  // which clears via its own handler).
  const shownX = vDo.length + hkGapCount(vGroups) + vStale.length + vNt.length;
  const shownY = tiles.urgent + tiles.housekeeping + tiles.notes;
  const resetDeck = () => { setFilters(DEFAULT_FILTERS); setSearch(""); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const t = e.target as HTMLElement | null;
      if (t && t.closest("input, textarea, select, [contenteditable]")) return;
      if (search) { setSearch(""); return; }
      if (!isResting(filtersRef.current) || filtersRef.current.todayOnly) setFilters(DEFAULT_FILTERS);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [search]);

  // ── first-visit spotlight tour (Act 1). Auto-runs ONCE: `tourSeenAt` absent ∧ not the new desk;
  // the flag is stamped on Done AND on skip/Esc (never localStorage — it follows the user). The
  // corner ?'s replay item re-opens it regardless of the flag via a CustomEvent. ──
  const [tourOpen, setTourOpen] = useState(false);
  const tourRanRef = useRef(false);
  useEffect(() => {
    if (tourRanRef.current || tourOpen) return;
    if (currentUser && shouldAutoRunTour(currentUser.tourSeenAt, desk)) {
      tourRanRef.current = true;
      setTourOpen(true);
    }
  }, [currentUser, desk, tourOpen]);
  useEffect(() => {
    const onReplay = () => setTourOpen(true);
    window.addEventListener("sa:todo-replay-tour", onReplay);
    return () => window.removeEventListener("sa:todo-replay-tour", onReplay);
  }, []);
  const endTour = () => {
    setTourOpen(false);
    if (!currentUser?.tourSeenAt) void updateUserProfile({ tourSeenAt: new Date().toISOString() });
  };
  const onList = (c: BoardCard) => c.committedDate === today;
  const allCommitted = [...board.do, ...board.hk, ...board.nt].filter((c) => c.committedDate != null);
  const rolled = rollDismissed ? [] : rolledOverCards(allCommitted, today);
  // The pack's ring/footer share: done ÷ (open-committed + done) — the day's items, committed or not.

  function setCommitted(card: BoardCard, on: boolean) {
    const val = on ? today : null;
    if (card.userTaskId) updateUserTask(card.userTaskId, { committedDate: val });
    else if (card.taskType && card.relatedRecordId) upsertTaskFlag(flagKeyForTask(card.taskType, card.relatedRecordId), { committedDate: val });
  }
  function toggleToday(card: BoardCard) {
    if (!onList(card) && committedCards.length >= MAX_TODAY) { flash(`Today is full (${MAX_TODAY} max)`); return; }
    setCommitted(card, !onList(card));
  }
  // Help me pick — a selection gesture: pulse-and-fade, card by card, then commit each.
  async function helpMePick() {
    const picks = choosePicks({ doCards: board.do, hkCards: board.hk, committedCount: committedCards.length });
    if (!picks.length) { flash(`Today is full (${MAX_TODAY} max)`); return; }
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const pool = [...board.do, ...board.hk];
    for (const key of picks) {
      const card = pool.find((c) => c.key === key);
      if (!card) continue;
      if (!reduce) { setPulsing(key); await wait(440); }
      setCommitted(card, true);
      if (!reduce) await wait(120);
    }
    setPulsing(null);
    flash(`Picked ${picks.length} for today`);
  }
  function keepRolled() { rolled.forEach((c) => setCommitted(c, true)); setRollDismissed(true); flash("Kept on Today"); }
  function dropRolled() { rolled.forEach((c) => setCommitted(c, false)); setRollDismissed(true); flash("Cleared — still on the board"); }

  // ── quick rail — "the honest fastest version of actually doing it". Every ✓ funnels through the
  // SAME write paths as the journey (quick*Payload → markSentWriteArgs/nudgeWriteArgs); defaults are
  // stated on the receipt, and Undo deletes/unwinds the created record via the existing primitives.
  async function quickDone(c: BoardCard) {
    const nowIso = new Date().toISOString();
    if (c.userTaskId) {
      await updateUserTask(c.userTaskId, { done: true, completedAt: nowIso });
      const undo = () => updateUserTask(c.userTaskId!, { done: false });
      setOverlay(c.key, { kind: "receipt", lane: "nt", title: "Note done", line: `${c.title} — struck through on Today.`, undo });
      flash(`✓ ${c.title} — done`, { label: "Undo", fn: async () => { await undo(); clearOverlay(c.key); flash("Restored"); } });
      return;
    }
    const q = c.relatedRecordId ? queries.find((x) => x.id === c.relatedRecordId) : undefined;
    if (!q) return;
    if (c.taskType === "no_response_close") {
      const prev = q.status as QueryStatus;
      await updateQueryStatus(q.id, QueryStatus.NO_RESPONSE, "Closed as no response from the quick rail");
      const undo = () => undoQueryStatus(q.id, prev, QueryStatus.NO_RESPONSE);
      setOverlay(c.key, { kind: "receipt", lane: "hk", title: `${c.who || "Query"} — closed`, line: "Logged as no response — not a rejection, so your response rate stays honest." , undo });
      flash(`✓ ${c.title} — done`, { label: "Undo", fn: async () => { await undo(); clearOverlay(c.key); flash("Restored"); } });
      return;
    }
    if (c.taskType === "nudge_overdue") {
      const p = quickNudgePayload({ cardKey: c.key, label: c.title, queryId: q.id, method: q.sendMethod, nowIso });
      const r = await logNudge(...nudgeWriteArgs(p, new Date().toISOString()));
      if (!r.success) { flash(r.error || "Couldn’t log the nudge."); return; }
      // deleteActivity on a NUDGE_SENT fully unwinds it (twins + nudgeDate fields + the flag).
      const undo = async () => {
        const acts = activitiesRef.current
          .filter((a) => a.queryId === q.id && a.activityType === ActivityType.NUDGE_SENT)
          .sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());
        if (acts[0]?.id) await deleteActivity(acts[0].id);
      };
      setOverlay(c.key, { kind: "receipt", lane: "do", title: c.title, line: receiptLine(p, today), undo });
      flash(`✓ ${c.title} — done`, { label: "Undo", fn: async () => { await undo(); clearOverlay(c.key); flash("Restored"); } });
      return;
    }
    const action = getPrimaryAction(q.status as QueryStatus);
    if (action.kind !== "mark-sent") return;
    // B3 — the soft duplicate-send guard in the quick-✓'s grammar (window.confirm; decline
    // writes nothing, the card stays). R&R resubmissions are never guarded.
    const prior = priorSameTypeSend(activitiesRef.current, q.id, action.target as QueryStatus, action.markKind === "resubmit");
    if (prior && !window.confirm(duplicateSendPrompt(action.target as QueryStatus, c.who, prior))) return;
    const p = quickSendPayload({ cardKey: c.key, label: c.title, taskType: c.taskType, queryId: q.id, targetStatus: action.target as QueryStatus, isResubmit: action.markKind === "resubmit", method: q.sendMethod, nowIso });
    const prev = q.status as QueryStatus;
    await recordMaterialsSent(markSentWriteArgs(p)); // the ONE mark-sent write path
    const line = receiptLine(p, today, materialOptsForTask(c.taskType));
    const undo = () => undoQueryStatus(q.id, prev, p.targetStatus);
    const edit = async () => {
      // "Edit details" = undo the quick write, then re-open the journey PRE-FILLED with what was
      // logged — saving again writes once, honestly.
      await undo();
      clearOverlay(c.key);
      setFlowPrefill({ sentDate: p.sentDate.slice(0, 10), method: p.method, materials: p.materials });
      openFlowCards([c]);
    };
    setOverlay(c.key, { kind: "receipt", lane: "do", title: c.title, line, undo, edit });
    flash(`✓ ${c.title} — done`, { label: "Undo", fn: async () => { await undo(); clearOverlay(c.key); flash("Restored"); } });
  }

  function quickPause(c: BoardCard) {
    if (c.taskType === "no_response_close") { setOverlay(c.key, { kind: "fork", single: true }); return; }
    const lane = (c.stream === "nt" ? "nt" : c.stream === "hk" ? "hk" : "do") as "do" | "hk" | "nt";
    const plus7 = new Date(Date.now() + 7 * 86400000).toISOString();
    if (c.userTaskId) {
      const key = { taskType: USER_TASK_FLAG_TYPE, queryId: c.userTaskId };
      upsertTaskFlag(key, { snoozedUntil: plus7, bumpSnooze: true });
      const undo = () => upsertTaskFlag(key, { snoozedUntil: null, unbumpSnooze: true }); // full restore, ×n included
      const muteUndo = () => upsertTaskFlag(key, { snoozedUntil: null });
      setOverlay(c.key, {
        kind: "dismissed", lane, text: "Snoozed — back in a week.", undo,
        never: () => { upsertTaskFlag(key, { snoozedUntil: MUTED_UNTIL }); setOverlay(c.key, { kind: "dismissed", lane, text: "Muted — we won’t ask again.", undo: muteUndo }); flash(`✓ ${c.title} — dismissed`, { label: "Undo", fn: async () => { await muteUndo(); clearOverlay(c.key); flash("Restored"); } }); },
      });
      flash(`✓ ${c.title} — snoozed`, { label: "Undo", fn: async () => { await undo(); clearOverlay(c.key); flash("Restored"); } });
      return;
    }
    if (!c.taskType || !c.relatedRecordId) return;
    dismissTask(c.taskType, c.relatedRecordId, "fixed snooze", 7);
    const key = flagKeyForTask(c.taskType, c.relatedRecordId);
    const undo = () => upsertTaskFlag(key, { snoozedUntil: null, unbumpSnooze: true }); // full restore, ×n included
    const muteUndo = () => upsertTaskFlag(key, { snoozedUntil: null });
    setOverlay(c.key, {
      kind: "dismissed", lane, text: "Snoozed — back in a week.", undo,
      never: () => { upsertTaskFlag(key, { snoozedUntil: MUTED_UNTIL }); setOverlay(c.key, { kind: "dismissed", lane, text: "Muted — we won’t ask again.", undo: muteUndo }); flash(`✓ ${c.title} — dismissed`, { label: "Undo", fn: async () => { await muteUndo(); clearOverlay(c.key); flash("Restored"); } }); },
    });
    flash(`✓ ${c.title} — snoozed`, { label: "Undo", fn: async () => { await undo(); clearOverlay(c.key); flash("Restored"); } });
  }

  // Grouped-card ⏸ fork actions — mute scopes, stated plainly. Nothing is ever deleted.
  function forkNotNowGroup(g: HkGroup) {
    g.members.forEach((m) => m.agentId && dismissTask("data_quality_poor", m.agentId, "fixed snooze", 7));
    const undo = async () => { g.members.forEach((m) => m.agentId && upsertTaskFlag(flagKeyForTask("data_quality_poor", m.agentId), { snoozedUntil: null, unbumpSnooze: true })); };
    const key = `group-${g.rule}`;
    setOverlay(key, { kind: "dismissed", lane: "hk", text: "Snoozed — back in a week.", undo });
    flash(`✓ ${HK_RULES[g.rule].label} — snoozed`, { label: "Undo", fn: async () => { await undo(); clearOverlay(key); flash("Restored"); } });
  }
  function forkNeverThese(g: HkGroup) {
    g.members.forEach((m) => m.agentId && upsertTaskFlag(flagKeyForTask("data_quality_poor", m.agentId), { snoozedUntil: MUTED_UNTIL }));
    const undo = async () => { g.members.forEach((m) => m.agentId && upsertTaskFlag(flagKeyForTask("data_quality_poor", m.agentId), { snoozedUntil: null })); };
    const key = `group-${g.rule}`;
    setOverlay(key, { kind: "dismissed", lane: "hk", text: "Muted — we won’t ask about these agents again.", undo });
    flash(`✓ ${HK_RULES[g.rule].label} — dismissed`, { label: "Undo", fn: async () => { await undo(); clearOverlay(key); flash("Restored"); } });
  }
  function forkNeverRule(g: HkGroup) {
    // rule-mute now carries its own Undo (the finishing pack's compensator-table gap): the
    // reversal is the profile filter-out — the same write unmuteRule performs.
    updateUserProfile({ mutedTaskRules: Array.from(new Set([...(currentUser?.mutedTaskRules ?? []), g.rule])) });
    clearOverlay(`group-${g.rule}`);
    const undo = () => updateUserProfile({ mutedTaskRules: (currentUser?.mutedTaskRules ?? []).filter((r) => r !== g.rule) });
    flash(`✓ ${HK_RULES[g.rule].label} — dismissed`, { label: "Undo", fn: async () => { await undo(); flash("Restored"); } });
  }
  function forkStale(c: BoardCard, mode: "notNow" | "neverThis") {
    if (!c.taskType || !c.relatedRecordId) return;
    const key = flagKeyForTask(c.taskType, c.relatedRecordId);
    const undo = () => upsertTaskFlag(key, { snoozedUntil: null });
    if (mode === "notNow") {
      dismissTask(c.taskType, c.relatedRecordId, "fixed snooze", 7);
      const snoozeUndo = () => upsertTaskFlag(key, { snoozedUntil: null, unbumpSnooze: true }); // full restore, ×n included
      setOverlay(c.key, { kind: "dismissed", lane: "hk", text: "Snoozed — back in a week.", undo: snoozeUndo });
      flash(`✓ ${c.title} — snoozed`, { label: "Undo", fn: async () => { await snoozeUndo(); clearOverlay(c.key); flash("Restored"); } });
    } else {
      upsertTaskFlag(key, { snoozedUntil: MUTED_UNTIL });
      setOverlay(c.key, { kind: "dismissed", lane: "hk", text: "Muted — we won’t ask about this query again.", undo });
      flash(`✓ ${c.title} — dismissed`, { label: "Undo", fn: async () => { await undo(); clearOverlay(c.key); flash("Restored"); } });
    }
  }
  async function addTask() {
    const text = window.prompt("New note");
    if (text && text.trim()) await addUserTask({ text: text.trim() });
  }

  return (
    <F12Page tools={<F12Account onClick={() => onNavigate("account")} />}>
      <div className="tdb-wrap" ref={wrapRef}>
        {/* ── the workbench row (Option B, todo-workbench-shell-v1.html): floating drawer
            (sticky, foldable) beside a CENTRED ~1150px content column — max-width discipline at
            every viewport, surplus pools as symmetric desk. The old full-bleed header band +
            .tdb-ribbon are RETIRED (the masthead is recomposed inside the column); Walk me
            through lives in the drawer now. ── */}
        {/* ── Final Shape P1: THE HERO — two objects only (Playfair 42 headline · ink Begin
            focused session), paper full-bleed, contents locked to the assembly — and THE
            FLOATING SEARCH breaking the hero's bottom edge by half its height. ── */}
        {renderHero()}
        <div className="tdb-asm tdb-ws">
          {renderRail()}
          {/* THE SHEET — the white content panel holding BOTH views (width law v3) */}
          <div className="tdb-mainc">
            {/* ── Final Shape P3: the CORNER ROW (derived mono meta · the ▦/☰ segment) over THE
                RESIDENT REVIEW DOCBAND — same boolean as v2 (opened ≔ the completion sentinel),
                never dismissed, at the top of BOTH views. ── */}
            <div className="tdb-sheethead">
              <span className="tdb-shmeta">{shortHeaderDate(now)} · {shownY} OPEN · SHOWING {shownX}</span>
              <span className="tdb-vseg" role="group" aria-label="View">
                <button type="button" className={view === "cards" ? "on" : ""} aria-pressed={view === "cards"} onClick={() => pickView("cards")}>▦</button>
                <button type="button" className={view === "ledger" ? "on" : ""} aria-pressed={view === "ledger"} onClick={() => pickView("ledger")}>☰</button>
              </span>
            </div>
            {reviewWin && (
              <div className="tdb-docband">
                <span className="tdb-rvcupb" aria-hidden dangerouslySetInnerHTML={{ __html: reviewCupRaw }} />
                <div className="tdb-rvhx">
                  <div className="tdb-rvk2">THE SUNDAY REVIEW · WEEK {reviewWin.weekNumber}</div>
                  <b>Last week in review</b>
                  <p>Every box ticked turns the dial in your favour.</p>
                </div>
                <button type="button" className={`tdb-rvopen${reviewOpened ? " ghost" : ""}`} onClick={openSundayReview}>
                  {reviewOpened ? "View again" : "Open it ›"}
                </button>
              </div>
            )}
        {/* ── the board — cards or ledger by the masthead toggle; the desk states (new-desk /
            desk-cleared) replace BOTH views. Copy verbatim from todo-empty-states.html. ── */}
        {desk === "new-desk" ? renderNewDesk() : desk === "desk-cleared" ? renderDeskCleared() : active && !anyVisible ? (
          <div className="tdb-nomatch">
            Nothing matches — <button type="button" onClick={() => { setFilters(DEFAULT_FILTERS); setSearch(""); }}>clear filters</button>
          </div>
        ) : view === "ledger" ? renderLedger() : (
        <div className="tdb-lanes">
          {(!active || vDo.length > 0 || overlayCards("do").length > 0) && (
          <Lane cls="do" label="Urgent" count={active ? vDo.length : tiles.urgent} isEmpty={vDo.length === 0 && overlayCards("do").length === 0}
            filtered={active && vDo.length < tiles.urgent ? { x: vDo.length, y: tiles.urgent, showAll: resetDeck } : null}
            onFocusedSession={() => setFlow({ items: vDo.map((card) => ({ kind: "card", card })), mode: "sweep" })}
            emptyNode={
              <div className="tdb-clear do">
                <span className="tdb-clric" aria-hidden>✓</span>
                <div><div className="tdb-clrt">Nothing needs you.</div>
                <div className="tdb-clrs">{liveQueriesLine(liveQueryCount(queries))}</div></div>
                <span className="tdb-clrhand" aria-hidden>— go write something</span>
              </div>
            }>
            {overlayCards("do")}
            {vDo.map(renderCard)}
          </Lane>
          )}
          {(!active || vGroups.length > 0 || vStale.length > 0 || overlayCards("hk").length > 0) && (
          <Lane
            cls="hk"
            label="Housekeeping"
            count={active ? hkGapCount(vGroups) + vStale.length : tiles.housekeeping}
            filtered={active && hkGapCount(vGroups) + vStale.length < tiles.housekeeping ? { x: hkGapCount(vGroups) + vStale.length, y: tiles.housekeeping, showAll: resetDeck } : null}
            isEmpty={vGroups.length === 0 && vStale.length === 0 && overlayCards("hk").length === 0}
            onFocusedSession={() => setFlow({ items: [...vGroups.map((g) => ({ kind: "group" as const, group: g })), ...vStale.map((card) => ({ kind: "card" as const, card }))], mode: "sweep" })}
            emptyNode={
              <div className="tdb-clear hk">
                <div><div className="tdb-clrt">Spotless.</div>
                <div className="tdb-clrs">Every agent record is complete and nothing has gone stale.</div></div>
                <div className="tdb-clrbar">
                  <div className="tdb-pbar"><i style={{ width: "100%" }} /></div>
                  <div className="tdb-pcap"><span>{hkGroupProgress(agents.length, 0).caption}</span><span>100%</span></div>
                </div>
              </div>
            }
            strip={mutedRules.length > 0 && (
              <div className="tdb-rulestrip">
                <span className="tdb-rulestrip-l">Muted:</span>
                {mutedRules.map((r) => (
                  <button key={r} type="button" className="tdb-rulechip" title="Unmute — bring these reminders back" onClick={() => unmuteRule(r)}>
                    {HK_RULES[r].label} ✕
                  </button>
                ))}
              </div>
            )}
          >
            {overlayCards("hk")}
            {vGroups.map(renderGroupCard)}
            {vStale.map(renderCard)}
          </Lane>
          )}
          {(!active || vNt.length > 0 || overlayCards("nt").length > 0) && (
          <Lane cls="nt" label="Notes to self" count={active ? vNt.length : tiles.notes} onAdd={addTask} isEmpty={vNt.length === 0 && overlayCards("nt").length === 0}
            filtered={active && vNt.length < tiles.notes ? { x: vNt.length, y: tiles.notes, showAll: resetDeck } : null}
            emptyNode={<button type="button" className="tdb-ghostcard" onClick={addTask}><span className="tdb-ge">Nothing jotted yet.</span><span className="tdb-gg">＋ Add a note</span></button>}>
            {overlayCards("nt")}
            {vNt.map(renderCard)}
          </Lane>
          )}
        </div>
        )}
          </div>
          {/* VI P1 — "Today", ALWAYS ON: the right column is a constant part of the grid at
              every viewport ≥1200px (no collapsed state, no tab, no drawer); below that the
              masthead chip + popover stand. One renderTodayPanel, two mounts, XOR'd on narrow. */}
          {!narrow && (
            <aside className="tdb-railr" aria-label="Today">
              {renderTodayPanel()}
            </aside>
          )}
        </div>
      </div>

      {view === "ledger" && selVisible.length > 0 && (
        <div className="tdb-bulk" role="toolbar" aria-label={`${selVisible.length} selected`}>
          <span className="tdb-bulkn">{selVisible.length} selected</span>
          <button type="button" onClick={bulkToday}>＋ Today</button>
          <button type="button" onClick={bulkSnooze}>⏸ Snooze</button>
          <button type="button" onClick={bulkDismiss}>Dismiss</button>
          <button type="button" className="x" aria-label="Clear selection" onClick={() => setSel(EMPTY_SEL)}>✕</button>
        </div>
      )}
      {settingsOpen && <TaskSettingsSheet onClose={() => setSettingsOpen(false)} />}
      {tourOpen && <TodoTour onEnd={endTour} />}
      {toast && (
        <div className="tdb-toast" role="status">
          {toast.msg}
          {toast.action && <button type="button" className="tdb-toast-act" onClick={() => { toast.action!.fn(); setToast(null); }}>{toast.action.label}</button>}
        </div>
      )}
      {flow && <FocusFlow items={flow.items} mode={flow.mode} ritual={flow.ritual} onClose={() => { setFlow(null); setFlowPrefill(undefined); }} onNavigate={onNavigate} onToast={flash} prefill={flowPrefill} />}
    </F12Page>
  );

  // ── State A: the new desk (zero queries AND zero agents) — one welcome card replaces the three
  // reels; the two real doorways in; the ghost stack is decoration (CSS only). Copy verbatim. ──
  function renderNewDesk() {
    return (
      <div className="tdb-newdesk">
        <div className="tdb-ndtxt">
          <h2>A clean desk — <em>for now.</em></h2>
          <p>Once you’re querying, this page fills itself: requests and deadlines land in <b>Urgent</b>, record tidy-ups gather in <b>Housekeeping</b>, and your own reminders live in <b>Notes to self</b>. Nothing to track by hand.</p>
          <div className="tdb-ndacts">
            <button type="button" className="tdb-ndpri" onClick={() => onNavigate("queries", "Log a query")}>Start your first query →</button>
            <button type="button" className="tdb-ndsec" onClick={() => onNavigate("agents")}>Add agents to your contact list</button>
          </div>
        </div>
        <div className="tdb-ghoststack" aria-hidden>
          <div className="tdb-gc g1"><div className="tdb-gl gtag" /><div className="tdb-gl w85" /><div className="tdb-gl w60" /></div>
          <div className="tdb-gc g2"><div className="tdb-gl gtag" /><div className="tdb-gl w85" /><div className="tdb-gl w40" /></div>
          <div className="tdb-handnote">— your future to-dos</div>
        </div>
      </div>
    );
  }

  // ── State E: "Desk cleared." — all three sets empty AND the done-log is non-empty (earned,
  // never default: with nothing cleared today the per-reel states render instead). ──
  function renderDeskCleared() {
    const { visible, more } = clearedListCap(doneCards);
    return (
      <div className="tdb-walked">
        <div className="tdb-clric big" aria-hidden>✓</div>
        <h2>Desk cleared.</h2>
        <p>Nothing needs you, the records are spotless, and today you cleared:</p>
        <span className="tdb-strike">
          {visible.map((c) => (
            <span key={c.key} className="tdb-strow"><span className="tdb-stick" aria-hidden>✓</span><span className="tdb-sdx">{c.title}</span></span>
          ))}
          {more > 0 && <span className="tdb-smore">and {more} more</span>}
        </span>
        <br />
        <span className="tdb-clrhand big" aria-hidden>— the waiting is the work. Go write.</span>
      </div>
    );
  }

  // ── Final Shape P1: the hero + the floating search. The hero carries NOTHING else — no
  // date, no counts, no post-its (the census lives on the rail's pill counts; focus-art.png is
  // reserved for the focused session's opening screen, not this page). The search pill is the
  // ⌘K home and live-filters both views; the narrow Today chip rides beside it. ──
  function renderHero() {
    return (
      <>
        <div className="tdb-hero">
          <div className="tdb-asm tdb-herorow">
            <h1 className="tdb-ask">What’s on your desk?</h1>
            <button type="button" className="tdb-fsb" disabled={boardCards.length === 0} onClick={() => setFlow({ items: boardCards.map((card) => ({ kind: "card" as const, card })) })}>▶ Begin focused session</button>
          </div>
        </div>
        <div className="tdb-srchrow">
          <span className="tdb-bigsearch">
            <span aria-hidden>⌕</span>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search your desk…"
              aria-label="Search your desk"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") { setSearch(""); (e.target as HTMLInputElement).blur(); } }}
            />
            <kbd aria-hidden>⌘K</kbd>
          </span>
          {narrow && (
            <span className="tdb-todaypopwrap">
              <button type="button" className="tdb-todaychip" aria-haspopup="dialog" aria-expanded={todayPopOpen} onClick={() => setTodayPopOpen((v) => !v)}>
                Today · {committedCards.length} TO GO
              </button>
              {todayPopOpen && (
                <div className="tdb-todaypop" role="dialog" aria-label="Today">{renderTodayPanel()}</div>
              )}
            </span>
          )}
        </div>
      </>
    );
  }

  // ── Final Shape P2: THE FILTER RAIL (ref .fside) — the quiet-pill law rotated vertical.
  // Full-width 34px pills (white/hairline/ink, 7px family dot, count right), zero-count 40%;
  // the lens below a divider; narrowed = included band-fill burgundy + the SHOWING x OF y ·
  // RESET row under SHOW. Foot: the Task-settings row + the Pro square (non-Pro only). The
  // Focus square is GONE — the hero owns the focused session. ──
  function railPill(label: string, key: FilterType, count: number, dot: "p" | "lat" | "y") {
    const on = filters[key];
    const cls = resting ? "" : on ? " nar" : " dim";
    return (
      <button type="button" className={`tdb-fpill d-${dot}${cls}${count === 0 ? " z" : ""}`} aria-pressed={!resting && on} onClick={() => setFilters((f) => togglePill(f, key))}>
        <span className="tdb-dotc" aria-hidden />{label}<span className="tdb-fn">{count}</span>
      </button>
    );
  }
  function renderRail() {
    if (compact) {
      return (
        <aside className="tdb-fside icon" aria-label="Workbench rail">
          <button type="button" className="tdb-ric" title="Focus mode" aria-label="Focus mode" disabled={boardCards.length === 0} onClick={() => setFlow({ items: boardCards.map((card) => ({ kind: "card" as const, card })) })}>▶</button>
          <button type="button" className="tdb-ric" title="Task settings" aria-label="Task settings" onClick={() => setSettingsOpen(true)}>⚙</button>
          {!isProUser(currentUser) && (
            <button type="button" className="tdb-ric pro" title="ScriptAlly Pro — meet the assistant" aria-label="ScriptAlly Pro — meet the assistant" onClick={() => onNavigate("plans")}>✦</button>
          )}
        </aside>
      );
    }
    return (
      <aside className="tdb-fside" aria-label="Filters">
        <div className="tdb-fsec">SHOW</div>
        {!resting && (
          <button type="button" className="tdb-frst" onClick={resetDeck}>SHOWING {shownX} OF {shownY} · RESET</button>
        )}
        {railPill("OFFERS", "offers", fc.offers, "p")}
        {railPill("AGENT WAITING", "overToYou", fc.overToYou, "p")}
        {railPill("MATERIALS", "materials", fc.materials, "lat")}
        {railPill("WISH LISTS", "mswl", fc.mswl, "lat")}
        {railPill("STALE", "stale", fc.stale, "lat")}
        {railPill("SNOOZED", "snoozed", fc.snoozed, "lat")}
        {railPill("NOTES", "notes", fc.notes, "y")}
        <div className="tdb-fdivider" aria-hidden />
        <button type="button" className={`tdb-fpill d-s lens${filters.todayOnly ? " nar" : ""}`} aria-pressed={filters.todayOnly} onClick={() => setF("todayOnly", !filters.todayOnly)}>
          <span className="tdb-dotc" aria-hidden />TODAY’S LIST<span className="tdb-fn">{fc.today}</span>
        </button>
        <div className="tdb-fsfoot">
          <button type="button" className="tdb-setrow" onClick={() => setSettingsOpen(true)}>
            <span className="tdb-sic" aria-hidden>⚙</span>Task settings
          </button>
          {!isProUser(currentUser) && (
            <button type="button" className="tdb-prosq" onClick={() => onNavigate("plans")}>
              <span className="tdb-prok">SCRIPTALLY PRO</span>
              <b>Hand it over</b>
              <p>Let the assistant handle your housekeeping — wish lists and materials filled for you.</p>
              <span className="tdb-progo">Meet the assistant</span>
            </button>
          )}
        </div>
      </aside>
    );
  }

  // ── the "Today" card (VI P1, todo-right-column-v1.html) — same state, same handlers
  // (rollover Keep/Clear, committed rows + take-off, Help me pick, Work the list); the anatomy is
  // the ref card: plain paper header (date ⇄ "{n} OF 5"), committed items above a dashed
  // ghost-row invitation (todayGhosts), the collapsed-by-default done row, two footer verbs. ──
  function renderTodayPanel() {
    const ghosts = todayGhosts(committedCards.length, doneN);
    return (
      <div className="tdb-today2">
        <div className="tdb-th">
          <b className="tdb-t">Today</b>
          <i className="tdb-thr">{committedCards.length === 0 && doneN === 0 ? shortHeaderDate(now) : `${committedCards.length} OF ${MAX_TODAY}`}</i>
        </div>
        {rolled.length > 0 && (
          <div className="tdb-rollbar">
            <span className="tdb-rolltx"><b>{rolled.length}</b> {rolled.length === 1 ? "item" : "items"} rolled over from a previous day.</span>
            <button type="button" onClick={keepRolled}>Keep</button>
            <button type="button" className="drop" onClick={dropRolled}>Clear</button>
          </div>
        )}

        {/* the middle region — P4 makes this the card's one scroller */}
        <div className="tdb-tmid2">
          {committedCards.length > 0 && (
            <div className="tdb-tcommit">
              {committedCards.map((c) => (
                <div key={c.key} className="tdb-trow" onClick={() => openFlowCards([c])}>
                  <span className="tdb-tdot">{!c.hk && !c.userTaskId && c.status ? <StatusDot status={c.status as QueryStatus} overrideSize={16} /> : null}</span>
                  <div className="tdb-tmid"><div className="tdb-tx">{c.title}</div><div className="tdb-tm">{c.record}</div></div>
                  <button type="button" className="tdb-x" title="Take off Today" onClick={(e) => { e.stopPropagation(); toggleToday(c); }}>✕</button>
                </div>
              ))}
            </div>
          )}
          {ghosts > 0 && (
            <div className="tdb-ghostbox" aria-hidden>
              {Array.from({ length: ghosts }, (_, i) => (
                <div key={i} className="tdb-grow"><span className="tdb-cbx" /><span className="tdb-gbar" style={{ width: `${GHOST_BARS[i % GHOST_BARS.length]}%` }} /></div>
              ))}
            </div>
          )}
          {/* done today — collapsed to the ✓ row by default, expanding IN PLACE (session-only);
              the divider + log appear WITH the first completion, never before */}
          {doneN > 0 && (
            <>
              <button type="button" className="tdb-donerow" aria-expanded={showDone} onClick={() => setShowDone((v) => !v)}>✓ {doneN} DONE TODAY {showDone ? "▾" : "▸"}</button>
              {showDone && (
                <div className="tdb-tdone">
                  {doneCards.map((c) => (
                    <div key={c.key} className="tdb-drow">
                      <span className="tdb-tick">✓</span>
                      <div className="tdb-tmid"><div className="tdb-dx">{c.title}</div><div className="tdb-dm2">{[c.record, fmtTime(c.whenMs)].filter(Boolean).join(" · ")}</div></div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="tdb-tf2">
          {committedCards.length > 0 ? (
            <>
              <button type="button" className="tdb-pick" onClick={helpMePick}>＋ Add more</button>
              <button type="button" className="tdb-worklist" onClick={() => {
                // C2 family law — the Today walk is a ritual: sage bands whole-walk
                setFlow({ items: committedCards.map((card) => ({ kind: "card", card })), ritual: true });
              }}>Work the list</button>
            </>
          ) : (
            <>
              <button type="button" className="tdb-pick" onClick={helpMePick}>Help me pick</button>
              {/* the manual doorway — commitment happens on the board's cards */}
              <button type="button" className="tdb-worklist" onClick={() => scrollToLane("do")}>＋ Add</button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── THE LEDGER (workbench P3; ref todo-ledger-v1.html) — a re-projection of the SAME board
  // sets the cards render: shared 9-col grid, tinted section heads, typed batch parents with
  // full-cohort expansion, StatusDot verbatim in the STATUS column. Rows open the same journeys
  // (openFlowCards / group flow); the td circle is the same toggleToday. ──
  function ledgerCardRow(c: BoardCard) {
    const q = c.relatedRecordId ? queries.find((x) => x.id === c.relatedRecordId) : undefined;
    const ag = q ? agents.find((a) => a.id === q.agentId) : undefined;
    const ms = q ? manuscripts.find((m) => m.id === q.manuscriptId) : undefined;
    const isOffer = c.taskType === "offer_received";
    const isNote = !c.taskType;
    const det = ledgerDetail(c, { queries, taskFlags }, now);
    const committed = onList(c);
    const isSel = selVisible.includes(c.key);
    const isFocus = ledgerOrder[kfocus] === c.key;
    return (
      <div key={c.key} data-lkey={c.key} className={`tdb-lrow${isSel ? " lsel-on" : ""}${isFocus ? " kfocus" : ""}${kebabAt === c.key ? " kebab-open" : ""}`} onClick={() => openFlowCards([c])}>
        <span className="tdb-lselc" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" className="tdb-lsel" checked={isSel} readOnly aria-label={`Select ${ledgerTitle(c)}`} onClick={(e) => { e.stopPropagation(); clickSelect(c.key, e.shiftKey); }} />
        </span>
        <button type="button" className={`tdb-ltd${committed ? " on" : ""}`} title={committed ? "On Today — take off" : "＋ Today"} aria-label={committed ? "Take off Today" : "Add to Today"} aria-pressed={committed} onClick={(e) => { e.stopPropagation(); toggleToday(c); }}>✓</button>
        <span className={`tdb-tag${isOffer ? " offer" : c.warn ? " due warn" : " due"}`}>{isOffer ? "★ OFFER" : isNote ? "NOTE" : c.snoozes > 0 ? `Snoozed ×${c.snoozes}` : c.due}</span>
        <span className="tdb-lagn">
          {ag ? (<><span className="tdb-miniav">{c.initials}</span><b>{c.who}</b>{ag.agency && <i>· {ag.agency.toUpperCase()}</i>}</>) : (<><span className="tdb-miniav">{c.initials}</span><b>{c.who || "—"}</b></>)}
        </span>
        <span className="tdb-lti">{ledgerTitle(c)}</span>
        <span className="tdb-lms">{ms?.title ?? ""}</span>
        <span className="tdb-lsd">{c.status ? <StatusDot status={c.status as QueryStatus} overrideSize={13} /> : null}</span>
        <span className={`tdb-ldt${det.tone === "hot" ? " hot" : det.tone === "dim" ? " dim" : ""}`}>{det.label}</span>
        <span className="tdb-lacts">
          {!isOffer && <button type="button" title="Quick done" aria-label="Quick done" onClick={(e) => { e.stopPropagation(); quickDone(c); }}>✓</button>}
          {!isOffer && <button type="button" title="Snooze / stop asking" aria-label="Snooze or stop asking" onClick={(e) => { e.stopPropagation(); quickPause(c); }}>⏸</button>}
          {!isOffer && (
            <button type="button" title="More" aria-label="More actions" aria-haspopup="menu" aria-expanded={kebabAt === c.key} onClick={(e) => { e.stopPropagation(); setKebabAt(kebabAt === c.key ? null : c.key); }}>⋯</button>
          )}
          {kebabAt === c.key && (
            <>
              <div className="tdb-kebback" onClick={(e) => { e.stopPropagation(); setKebabAt(null); }} />
              <div className="tdb-kebab" role="menu" aria-label="Row actions" onClick={(e) => e.stopPropagation()}>
                <button type="button" role="menuitem" onClick={() => kebabDismiss(c)}>Dismiss</button>
                {c.relatedRecordId && !c.userTaskId && (
                  <button type="button" role="menuitem" onClick={() => { setKebabAt(null); onNavigate("queries", c.relatedRecordId); }}>Open query</button>
                )}
                <button type="button" role="menuitem" onClick={() => { setKebabAt(null); setSettingsOpen(true); }}>Task settings</button>
              </div>
            </>
          )}
        </span>
      </div>
    );
  }
  function ledgerBatchRow(g: HkGroup) {
    const open = !!openBatches[g.rule];
    const det = batchDetail(g, agents.length);
    const faces = g.members.slice(0, 3);
    const kids = open ? batchChildren(g, agents, taskFlags) : [];
    const memberIds = new Set(g.members.map((m) => m.agentId).filter(Boolean));
    const openAt = (agentId?: string) => {
      if (!agentId || !memberIds.has(agentId)) { setFlow({ items: [{ kind: "group", group: g }] }); return; }
      // deep-link: the SAME group flow, members reordered target-first (no FocusFlow change)
      const members = [...g.members.filter((m) => m.agentId === agentId), ...g.members.filter((m) => m.agentId !== agentId)];
      setFlow({ items: [{ kind: "group", group: { ...g, members } }] });
    };
    return (
      <React.Fragment key={g.rule}>
        <div data-lkey={`group-${g.rule}`} className={`tdb-lrow batchp${open ? " open" : ""}${selVisible.includes(`group-${g.rule}`) ? " lsel-on" : ""}${ledgerOrder[kfocus] === `group-${g.rule}` ? " kfocus" : ""}`} onClick={() => toggleBatch(g.rule)}>
          <span className="tdb-lselc" onClick={(e) => e.stopPropagation()}>
            <input type="checkbox" className="tdb-lsel" checked={selVisible.includes(`group-${g.rule}`)} readOnly aria-label={`Select ${g.meta.label} (the whole batch)`} onClick={(e) => { e.stopPropagation(); clickSelect(`group-${g.rule}`, e.shiftKey); }} />
          </span>
          <span />
          <span className="tdb-ltagcell">
            <button type="button" className="tdb-lchev" aria-expanded={open} aria-label={`${open ? "Collapse" : "Expand"} ${g.meta.label}`} onClick={(e) => { e.stopPropagation(); toggleBatch(g.rule); }}>▶</button>
            <span className="tdb-tag due">{g.meta.label.toUpperCase()}</span>
          </span>
          <span className="tdb-lagn">
            <span className="tdb-lstack">{faces.map((m) => <span key={m.card.key} className="tdb-miniav">{m.card.initials}</span>)}</span>
            <i>{g.members.length} AGENTS</i>
          </span>
          <span className="tdb-lti">{batchTaskCopy(g.rule)}</span>
          <span className="tdb-lms" />
          <span className="tdb-lsd" />
          <span className="tdb-ldt"><span className="tdb-lbar" aria-hidden><i style={{ width: `${det.pct}%` }} /></span>{det.caption}</span>
          <span className="tdb-lacts">
            <button type="button" title="Batch fix" aria-label={`Batch fix — ${g.meta.label}`} onClick={(e) => { e.stopPropagation(); setFlow({ items: [{ kind: "group", group: g }] }); }}>→</button>
          </span>
        </div>
        {open && kids.map((k) => (
          <div key={`${g.rule}-${k.agentId ?? k.name}`} className="tdb-lrow lchild">
            <span /><span /><span />
            <span className="tdb-lagn"><span className="tdb-miniav">{k.initials}</span><b>{k.name}</b>{k.agency && <i>· {k.agency.toUpperCase()}</i>}</span>
            <span className={`tdb-lti${k.done ? " struck" : ""}`}>Add {g.meta.need === "mswl" ? "wish list" : g.meta.need === "materials" ? "materials" : "reply window"}</span>
            <span className="tdb-lms" />
            <span className="tdb-lsd" />
            {/* grant 2: dated only where the flow stamped resolvedAt — never invented */}
            <span className={`tdb-ldt${k.done ? " sage" : " dim"}`}>{k.done ? `✓ RECORDED${k.doneDate ? ` ${k.doneDate.toUpperCase()}` : ""}` : "NOT RECORDED"}</span>
            <span className="tdb-lacts kid">
              {!k.done && k.agentId && memberIds.has(k.agentId) && (
                <button type="button" className="tdb-ladd" onClick={(e) => { e.stopPropagation(); openAt(k.agentId); }}>ADD →</button>
              )}
            </span>
          </div>
        ))}
        {open && (
          <div className="tdb-lchildmore">
            <button type="button" onClick={() => setFlow({ items: [{ kind: "group", group: g }] })}>OPEN BATCH FIX — WORK THROUGH ALL {g.members.length} →</button>
          </div>
        )}
      </React.Fragment>
    );
  }
  function ledgerSection(opts: { cls: "p" | "lat" | "n"; id: string; label: string; count: number; onSession?: () => void; onAdd?: () => void; children: React.ReactNode; total: number; hidden: number; showAllKey: string }) {
    return (
      <div className="tdb-lsec" id={opts.id}>
        {/* Deck v2 P4: the ledger shares the band-less lane heading (one grammar, both views) */}
        <div className={`tdb-lh2 ${opts.cls}`}>
          {opts.onSession && (
            <button type="button" className="tdb-playb" title={`Focus on ${opts.label}`} aria-label={`Focus on ${opts.label}`} onClick={opts.onSession}>
              <svg width="9" height="10" viewBox="0 0 11 12" aria-hidden><path d="M1.5 1.5 L9.5 6 L1.5 10.5 Z" fill="currentColor" /></svg>
            </button>
          )}
          {opts.onAdd && <button type="button" className="tdb-cadd" onClick={opts.onAdd} aria-label="Add a note">＋</button>}
          <span className="tdb-lgt">{opts.label}</span>
          <span className="tdb-ln">{opts.count}</span>
        </div>
        <div className="tdb-tbl">
        <div className="tdb-lcols" aria-hidden>
          <span /><span /><span>TYPE</span><span>AGENT</span><span>TASK</span><span>MANUSCRIPT</span><span className="ctr">STATUS</span><span className="r sort">DETAIL ↓</span><span />
        </div>
        {opts.children}
        {opts.hidden > 0 && (
          <div className="tdb-lmore">
            <button type="button" onClick={() => setShowAllSec((s) => ({ ...s, [opts.showAllKey]: true }))}>SHOW ALL {opts.total} →</button>
          </div>
        )}
        </div>
      </div>
    );
  }
  function renderLedger() {
    // The review entry card is card-furniture (its own mode + dismiss ✕) — the scrap + cards view
    // carry it; the ledger lists workable rows only. Row model hoisted above (P5 shares it).
    return (
      <div className="tdb-ledger">
        {doSorted.length > 0 && ledgerSection({
          cls: "p", id: "tdb-lane-do", label: "Urgent", count: active ? doSorted.length : tiles.urgent,
          onSession: () => setFlow({ items: doSorted.map((card) => ({ kind: "card", card })), mode: "sweep" }),
          total: doSorted.length, hidden: doCut.hidden, showAllKey: "do",
          children: doCut.visible.map(ledgerCardRow),
        })}
        {(vGroups.length > 0 || vStale.length > 0) && ledgerSection({
          cls: "lat", id: "tdb-lane-hk", label: "Housekeeping", count: active ? hkGapCount(vGroups) + vStale.length : tiles.housekeeping,
          onSession: () => setFlow({ items: [...vGroups.map((g) => ({ kind: "group" as const, group: g })), ...vStale.map((card) => ({ kind: "card" as const, card }))], mode: "sweep" }),
          total: hkTop.length, hidden: hkCut.hidden, showAllKey: "hk",
          children: hkCut.visible.map((r) => (r.kind === "group" ? ledgerBatchRow(r.g) : ledgerCardRow(r.c))),
        })}
        {vNt.length > 0 && ledgerSection({
          cls: "n", id: "tdb-lane-nt", label: "Notes to self", count: active ? vNt.length : tiles.notes,
          onAdd: addTask,
          total: vNt.length, hidden: ntCut.hidden, showAllKey: "nt",
          children: ntCut.visible.map(ledgerCardRow),
        })}
      </div>
    );
  }

  // ── the quick rail (hover / :focus-within, top-right). Offers get NO rail — they need the moment. ──
  // (the hover ✓/⏸ quick rail retired — the card contract's verb row is the action surface;
  // quickPause lives on for the ledger rows' ⏸.)

  // ── the Sunday-review entry card (finishing P3): derived + dismissible for the week; its click
  //    opens the weeklyReview mode with the live Urgent cards as the seed source. ──
  // MUST be a hoisted `function` (not a post-return `const`): the banner/bar JSX calls it from
  // within the component's return — a `const` here sits in the TDZ for the whole render (the
  // demotion bug's lesson).
  function openSundayReview() {
    // board.do is review-free by construction (P1) — no filter needed
    setFlow({ items: board.do.map((card) => ({ kind: "card" as const, card })), mode: "weeklyReview" });
  }

  // Standalone receipt/dismissed cards — the live card vanished with the write; the receipt persists.
  function overlayCards(lane: "do" | "hk" | "nt") {
    return Object.entries(overlays)
      .filter(([, o]) => (o.kind === "receipt" || o.kind === "dismissed") && o.lane === lane)
      .map(([key, o]) => {
        if (o.kind === "receipt") return (
          <div key={`ov-${key}`} className="tdb-tile receipt">
            <div className="tdb-frame">
              <div className="tdb-receiptbody">
                <div className="tdb-rk"><span className="tdb-rtick">✓</span><span className="tdb-rt">{o.title}</span></div>
                <div className="tdb-rlog">{o.line}<br />Wrong? Fix it before you move on.</div>
                <div className="tdb-racts">
                  {o.edit && <button type="button" className="tdb-ra" onClick={o.edit}>Edit details</button>}
                  {o.undo && <button type="button" className="tdb-ra" onClick={async () => { await o.undo!(); clearOverlay(key); }}>Undo</button>}
                </div>
              </div>
            </div>
          </div>
        );
        if (o.kind !== "dismissed") return null;
        return (
          <div key={`ov-${key}`} className="tdb-tile dismissed">
            <div className="tdb-frame">
              <div className="tdb-dismissbody">
                <div className="tdb-dt">{o.text}</div>
                <div className="tdb-dact">
                  <button type="button" className="tdb-ra" onClick={async () => { await o.undo(); clearOverlay(key); }}>Undo</button>
                  {o.never && <button type="button" className="tdb-ra" onClick={o.never}>Never ask</button>}
                </div>
              </div>
            </div>
          </div>
        );
      });
  }

  function renderFork(key: string, single: boolean, acts: { notNow: () => void; neverThis: () => void; neverRule?: () => void }) {
    return (
      <div className="tdb-neverfork" onClick={(e) => e.stopPropagation()}>
        <div className="tdb-nt2">Stop asking — for how long?</div>
        <button type="button" className="tdb-nb" onClick={acts.notNow}><b>Not now</b>&nbsp;— back in a week</button>
        <button type="button" className="tdb-nb" onClick={acts.neverThis}><b>Never</b>&nbsp;— just {single ? "this query" : "these agents"}</button>
        {acts.neverRule && <button type="button" className="tdb-nb" onClick={acts.neverRule}><b>Never</b>&nbsp;— any agent missing this</button>}
        <button type="button" className="tdb-ncancel" onClick={() => clearOverlay(key)}>Cancel</button>
        <button type="button" className="tdb-nsettings" onClick={() => { clearOverlay(key); setSettingsOpen(true); }}>Change what appears here → Task settings</button>
      </div>
    );
  }

  // ── Deck v2 P4: THE CARD CONTRACT (the LAWS, verbatim) — band = identity + status only (tag,
  // the sage ✓ TODAY chip); body = content only; CLICK ANYWHERE opens (unit → the journey sheet);
  // hover (~150ms intent, 180ms ease) grows the VERB ROW downward as an overlay — the reel never
  // reflows: [✓ DONE] · ＋/− TODAY · ☾ LATER ▾ (tomorrow / a week / don't-show-these — the
  // per-type hide, restorable in Task settings). Offers: no ✓ DONE (the journey decides), no
  // hide (the locked row). The old quick rail, body pill and meta row are retired. ──
  // arrow navigation inside the Later menu (P5 a11y): ↓/↑ cycle the menuitems; Esc closes
  function latMenuKeys(e: React.KeyboardEvent<HTMLDivElement>) {
    const items = Array.from((e.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>("[role=menuitem]"));
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
    else if (e.key === "Escape") { e.stopPropagation(); setLaterKey(null); }
  }
  function laterMenu(c: BoardCard) {
    const hideKey = laterHideKey(c.taskType);
    return (
      <span className="tdb-latwrap">
        <button type="button" className="tdb-verb" aria-haspopup="menu" aria-expanded={laterKey === c.key} onClick={(e) => { e.stopPropagation(); setLaterKey((k) => (k === c.key ? null : c.key)); }}>☾ LATER ▾</button>
        {laterKey === c.key && (
          <div className="tdb-latmenu" role="menu" aria-label="Later" onKeyDown={latMenuKeys}>
            <button type="button" role="menuitem" onClick={(e) => { e.stopPropagation(); setLaterKey(null); snoozeCard(c, 1, "tomorrow"); }}>Remind me tomorrow</button>
            <button type="button" role="menuitem" onClick={(e) => { e.stopPropagation(); setLaterKey(null); snoozeCard(c, 7, "in a week"); }}>Give it a week</button>
            {hideKey && (
              <button type="button" role="menuitem" className="warn" onClick={(e) => { e.stopPropagation(); setLaterKey(null); hideType(c, hideKey); }}>Don’t show these again</button>
            )}
          </div>
        )}
      </span>
    );
  }
  // The verb wrapper is ALWAYS mounted (the 0fr→1fr grid trick needs a live element to
  // animate); visibility keeps the collapsed buttons out of the tab order.
  function cardVerbs(c: BoardCard, hov: boolean) {
    const committed = onList(c);
    const isOffer = c.taskType === "offer_received";
    return (
      <div className="tdb-vwrap" aria-hidden={!hov}>
        <div className="tdb-vinner">
          <div className="tdb-verbs" onClick={(e) => e.stopPropagation()}>
            {!isOffer && <button type="button" className="tdb-verb pri" onClick={() => quickDone(c)}>✓ DONE</button>}
            <button type="button" className="tdb-verb" onClick={() => toggleToday(c)}>{committed ? "− TODAY" : "＋ TODAY"}</button>
            {laterMenu(c)}
          </div>
        </div>
      </div>
    );
  }
  // ── full-detail lane card (the contract): band tag (+ ✓ TODAY chip) over title + manuscript. ──
  function renderCard(c: BoardCard) {
    const committed = onList(c);
    const ov = overlays[c.key];
    const isOffer = c.taskType === "offer_received";
    const subIsMs = !!c.subtitle && manuscripts.some((m) => m.title === c.subtitle);
    if (ov?.kind === "fork") {
      return (
        <div key={c.key} className={`tdb-tile ${c.stream}`}>
          <div className="tdb-frame">{renderFork(c.key, true, { notNow: () => forkStale(c, "notNow"), neverThis: () => forkStale(c, "neverThis") })}</div>
        </div>
      );
    }
    const hov = verbKey === c.key;
    // cell + surface (hover hotfix): the CELL holds the reel slot at a fixed resting height and
    // never changes size; the SURFACE (absolute inside it) carries the only border/background/
    // radius/shadow and grows downward over whatever lies beneath — one continuous outline.
    return (
      <div key={c.key} className="tdb-cell">
        <div className={`tdb-tile ${c.stream}${hov ? " hov" : ""}${c.quiet ? " quiet" : ""}${pulsing === c.key ? " pulse" : ""}`}
          onClick={() => openFlowCards([c])}
          onMouseEnter={() => armVerbs(c.key)} onMouseLeave={disarmVerbs}
          onFocus={() => armVerbs(c.key)} onBlur={disarmVerbs}
          role="button" aria-expanded={hov} tabIndex={0}
          onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); openFlowCards([c]); } }}>
          <div className={`tdb-band ${c.stream}`}>
            <span className={`tdb-tag due${isOffer ? " offer" : c.warn ? " warn" : ""}`}>{isOffer ? `★ ${c.due}` : c.due}</span>
            {c.snoozes > 0 && <span className="tdb-tag snz">Snoozed ×{c.snoozes}</span>}
            {committed && <span className="tdb-chipon">✓ TODAY</span>}
          </div>
          <div className="tdb-body">
            <div className="tdb-tt">{c.title}</div>
            {c.subtitle && <div className="tdb-tsub">{subIsMs ? <span className="tdb-ms">{c.subtitle}</span> : c.subtitle}</div>}
          </div>
          {cardVerbs(c, hov)}
        </div>
      </div>
    );
  }

  // ── the BATCH card (the contract): flat, hairline, count headline + sub + progress + roundels;
  // no roundel buttons, no footer CTA, no NEVER — click anywhere opens the Batch-fix sheet;
  // hover verbs [⚡ FIX n →] · ☾ LATER ▾ (＋ TODAY omitted: groups are not committable — the
  // existing Today primitive is per-card; reported). ──
  function renderGroupCard(g: HkGroup) {
    const key = `group-${g.rule}`;
    const ov = overlays[key];
    if (ov?.kind === "fork") {
      return (
        <div key={g.rule} className="tdb-gcard">
          <div className="tdb-frame">{renderFork(key, false, { notNow: () => forkNotNowGroup(g), neverThis: () => forkNeverThese(g), neverRule: () => forkNeverRule(g) })}</div>
        </div>
      );
    }
    const faces = g.members.slice(0, 4);
    const copy = G3_COPY[g.rule] ?? { rest: () => ` ${g.meta.label.toLowerCase()}`, sub: "" };
    const prog = hkGroupProgress(agents.length, g.members.length);
    const hov = verbKey === key;
    return (
      <div key={g.rule} className="tdb-cell batch">
        <div className={`tdb-gcard${hov ? " hov" : ""}`}
          onClick={() => setFlow({ items: [{ kind: "group", group: g }] })}
          onMouseEnter={() => armVerbs(key)} onMouseLeave={disarmVerbs}
          onFocus={() => armVerbs(key)} onBlur={disarmVerbs}
          role="button" aria-expanded={hov} tabIndex={0}
          onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); setFlow({ items: [{ kind: "group", group: g }] }); } }}>
          <div className="tdb-band hk">
            <span className="tdb-tag due">{g.meta.label.toUpperCase()}</span>
          </div>
          <div className="tdb-body">
            <div className="tdb-gtt"><span className="tdb-gn">{g.members.length}</span>{copy.rest(g.members.length)}</div>
            <div className="tdb-gsub">{copy.sub}</div>
            <div className="tdb-gprog">
              <div className="tdb-pbar"><i style={{ width: `${prog.pct}%` }} /></div>
              <div className="tdb-pcap"><span>{prog.caption}</span><span>{prog.pct}%</span></div>
            </div>
            <div className="tdb-avs">
              {faces.map((m) => <span key={m.card.key} title={m.agentName}>{m.card.initials}</span>)}
              {g.members.length > faces.length && <i>+{g.members.length - faces.length}</i>}
            </div>
          </div>
          <div className="tdb-vwrap" aria-hidden={!hov}>
            <div className="tdb-vinner">
              <div className="tdb-verbs" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="tdb-verb pri" onClick={() => setFlow({ items: [{ kind: "group", group: g }] })}>⚡ FIX {g.members.length} →</button>
                <span className="tdb-latwrap">
                  <button type="button" className="tdb-verb" aria-haspopup="menu" aria-expanded={laterKey === key} onClick={(e) => { e.stopPropagation(); setLaterKey((k) => (k === key ? null : key)); }}>☾ LATER ▾</button>
                  {laterKey === key && (
                    <div className="tdb-latmenu" role="menu" aria-label="Later" onKeyDown={latMenuKeys}>
                      <button type="button" role="menuitem" onClick={(e) => { e.stopPropagation(); setLaterKey(null); snoozeGroup(g, 1, "tomorrow"); }}>Remind me tomorrow</button>
                      <button type="button" role="menuitem" onClick={(e) => { e.stopPropagation(); setLaterKey(null); snoozeGroup(g, 7, "in a week"); }}>Give it a week</button>
                      <button type="button" role="menuitem" className="warn" onClick={(e) => { e.stopPropagation(); setLaterKey(null); muteRuleFromCard(g); }}>Don’t show these again</button>
                    </div>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
};

export default ToDoPage;
