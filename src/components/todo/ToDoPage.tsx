/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ToDoPage — THE WORKSPACE SHELL (design-refs/todo-workspace-shell.html, todo-fix48). The page
 * renders inside TodoShell: the parchment navigation sidebar (WORKSPACE + the FILTER section +
 * foot) and the breadcrumb bar (with the search pill). The page itself is the hero (title +
 * subtitle + the CTA-over-link pair) and ONE bordered panel (the items row, both card sections
 * and the Pro colophon). Today lives in its bottom-right corner pop-up.
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
import { Funnel } from "lucide-react";
import { StatusDot } from "../StatusDot";
import { useScriptAllyDb } from "../../lib/db";
import { getPrimaryAction } from "../../lib/queryPrimaryAction";
import {
  assembleBoard, todaySplit, ribbonTiles, reviewWeek, reviewCompletionSnooze, weekReviewStats,
  briefingCleared, briefingFigures, briefingHeadline, briefingNarrative,
  BoardCard, USER_TASK_FLAG_TYPE,
} from "../../lib/todoBoard";
import { flagKeyForTask, flagMatchesTask, MUTED_UNTIL } from "../../lib/taskFlags";
import {
  choosePicks, rolledOverCards, todayGhosts, MAX_TODAY,
  quickSendPayload, quickNudgePayload, receiptLine, markSentWriteArgs, nudgeWriteArgs, materialOptsForTask, priorSameTypeSend, duplicateSendPrompt,
} from "../../lib/todoWalk";
import { weekOfQuerying } from "../../lib/dashboardStats";
import { isProUser } from "../../lib/assistFill";
import { groupHousekeeping, hkGapCount, hkGroupProgress, HkGroup, HkRule, HK_RULES, laterHideKey } from "../../lib/todoHousekeeping";
import { deskState, liveQueryCount, liveQueriesLine, clearedListCap } from "../../lib/todoEmpty";
import { sortLedgerDo, sortLedgerHk } from "../../lib/todoLedger";
// VI P2 — the review cup (original ScriptAlly artwork; currentColor → inlined so it inherits ink)
import reviewCupRaw from "../../assets/todo/review-cup.svg?raw";
import { useConfirmAsk } from "./ConfirmAsk";
import { FocusedSession, HeroSession } from "./FocusedSession";
import { RITUAL_LINES, progressPct } from "../../lib/sessionStage";
import { TodoFilterState, DEFAULT_FILTERS, filtersActive, matchesSearch, groupMatchesSearch, visibleDoCard, visibleStaleCard, visibleNoteCard, visibleGroup, filterCounts, isResting, togglePill, FilterType } from "../../lib/todoFilters";
import { shouldAutoRunTour } from "../../lib/todoTour";
import { AssistantBand, AssistantModal, AssistantTaskRow } from "./AssistantPromo";
import { PageHeader } from "../shell/PageHeader";
import { TodoTour } from "./TodoTour";
import { ActivityType, QueryStatus } from "../../types";
import { FocusFlow, FocusItem } from "./FocusFlow";
import { TaskSettingsSheet } from "./TaskSettingsSheet";
import "./todo.css";
// The relocated control surfaces' styles + tokens (the chip bench + the Pro sticker) — the
// hardback-spine SHELL itself retired in the shell follow-up; its stylesheet survives trimmed.
import "../shell/todoShell.css";

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
// toolbelt P2 — ONE source for the action labels: the ledger rows AND the card stacks read
// these strings; a future rename touches this object only. (detail P3: the moon + chevron
// left the snooze label — the clock glyph carries the deferral signal.)
const VERB_LABELS = {
  action: "Action now",
  todayAdd: "＋ Today’s list",
  todayRemove: "− Today’s list",
  later: "Snooze or dismiss",
} as const;

// detail P3 — the snooze CLOCK (todo-detail-b.html §1, the recommended plain clock). It
// follows TypeGlyph's exact grammar (currentColor stroke SVG, viewBox 24, aria-hidden, size
// prop) as a page-scoped sibling — TypeGlyph itself is LOCKED to the three material
// ComponentTypes and cannot carry a clock verbatim.
const RewindGlyph: React.FC<{ size?: number }> = ({ size = 12 }) => (
  // hero-pair P2 — the ↺ rewind (todo-hero-pair.html): the review chip's glyph, seated
  // exactly as Begin's play (same flex seat, the button's own gap).
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ display: "inline-flex", flexShrink: 0 }}>
    <path d="M3.5 8 A 9.5 9.5 0 1 1 3 13.5" />
    <path d="M3.5 3.5 v4.5 h4.5" />
  </svg>
);

const ClockGlyph: React.FC<{ size?: number }> = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ display: "inline-flex", flexShrink: 0 }}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </svg>
);

/** grouping P1 — the members page size: 5 render, a dashed cell pages in the rest. */
const GROUP_PAGE = 5;

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

/** THE SECTION HEADING (todo rebuild P1 — ref design-refs/scriptally-todo-sectioned.html).
 *  SECTIONING IS TYPOGRAPHIC: a Playfair heading with its count beside it in mono, closed by a
 *  2px rule whose left 96px carries the lane's identity colour. No box, no bar, no header
 *  actions — nesting on this page ends at the content capsule → cards. Shared by BOTH item
 *  views so cards and rows sit under identical headings.
 *
 *  Deliberately absent (and reported): the lane play button ("Focus on {label}") and the Notes
 *  ＋ went with the header bar — a heading is a heading. No "Clear this section": not built. */
export const SectionHead: React.FC<{
  cls: string; // "do" | "hk" | "nt" — the identity colour of the rule's 96px stub
  label: string;
  count: number;
  /** Deck v2: when the deck narrows this section, the heading appends "x OF y · FILTERED". */
  filtered?: { x: number; y: number; showAll: () => void } | null;
}> = ({ cls, label, count, filtered }) => (
  <>
    <div className="tdb-sec">
      <h2>{label}</h2>
      <span className="tdb-cn">{count}</span>
      {filtered && (
        <span className="tdb-secfilt">
          {filtered.x} OF {filtered.y} · FILTERED · <button type="button" onClick={filtered.showAll}>SHOW ALL</button>
        </span>
      )}
    </div>
    <div className={`tdb-secrule ${cls}`} aria-hidden />
  </>
);

/** One board SECTION — the heading above a wrapping auto-fill card grid. No scroll machinery:
 *  the page scrolls, the grid wraps. */
const Lane: React.FC<{
  cls: string;
  label: string;
  count: number;
  isEmpty: boolean;
  onAdd?: () => void;
  onFocusedSession?: () => void; // retained in the signature; the section heading no longer offers it
  /** Deck v2: when the deck narrows this lane, the heading appends "x OF y · FILTERED · SHOW ALL". */
  filtered?: { x: number; y: number; showAll: () => void } | null;
  emptyNode?: React.ReactNode;
  strip?: React.ReactNode; // rendered between the heading and the grid (e.g. muted-rules recovery chips)
  children?: React.ReactNode;
}> = ({ cls, label, count, isEmpty, filtered, emptyNode, strip, children }) => (
  <div className={`tdb-lane ${cls}`} id={`tdb-lane-${cls}`}>
    <SectionHead cls={cls} label={label} count={count} filtered={filtered} />
    {strip}
    {isEmpty ? (
      <div className="tdb-emptylane">{emptyNode}</div>
    ) : (
      <div className="tdb-grid">{children}</div>
    )}
  </div>
);

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
  const { ask: confirmAsk, node: confirmAskNode } = useConfirmAsk();
  // hero-pair P4 — the inline note composer's seat + draft (one composer, two view seats)
  const [composerAt, setComposerAt] = useState<null | "cards" | "ledger">(null);
  const [composerDraft, setComposerDraft] = useState("");
  const composerDraftRef = useRef(composerDraft);
  composerDraftRef.current = composerDraft;
  useEffect(() => {
    if (!composerAt) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && t.closest(".tdb-composer")) return;
      // outside: cancel only when empty — a live draft stays open
      if (!composerDraftRef.current.trim()) setComposerAt(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [composerAt]);
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
  // grouping P1 — per-batch expansion + the "+n more" reveal; recentG scopes the restore
  // animation to the just-collapsed batch (never a page-load flash). P3: the expansion
  // persists per-batch (sa. prefs) and is ONE state — expand in cards, arrive expanded in
  // the ledger.
  const [openGroups, setOpenGroups] = useState<Record<string, true>>(() => {
    try { return JSON.parse(localStorage.getItem("sa.todoGroupsOpen") || "{}"); } catch { return {}; }
  });
  const [pagedGroups, setPagedGroups] = useState<Record<string, true>>({});
  const [recentG, setRecentG] = useState<string | null>(null);
  const toggleGroup = (rule: string) => {
    setOpenGroups((g) => {
      const next = { ...g };
      if (next[rule]) delete next[rule]; else next[rule] = true;
      try { localStorage.setItem("sa.todoGroupsOpen", JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
    setRecentG(rule);
    window.setTimeout(() => setRecentG((r) => (r === rule ? null : r)), 260);
  };
  // doc pass P4 — per-lane ledger fold, persisted under the sa. prefs convention
  const [ledgerFold, setLedgerFold] = useState<{ do: boolean; hk: boolean; nt: boolean }>(() => {
    try { return { do: false, hk: false, nt: false, ...JSON.parse(localStorage.getItem("sa.todoLedgerFold") || "{}") }; } catch { return { do: false, hk: false, nt: false }; }
  });
  const toggleFold = (lane: "do" | "hk" | "nt") => setLedgerFold((f) => {
    const next = { ...f, [lane]: !f[lane] };
    try { localStorage.setItem("sa.todoLedgerFold", JSON.stringify(next)); } catch { /* private mode */ }
    return next;
  });
  // Ledger view state (Phase 3) — session-only: which batch rows are expanded (default collapsed)
  // + which sections dropped their SHOW ALL cap. Collapse restores the scroll position captured at
  // expand (the wrap is the scroller).
  const [openBatches, setOpenBatches] = useState<Record<string, boolean>>({});
  const batchScroll = useRef<Record<string, number>>({});
  const toggleBatch = (rule: string) => {
    setOpenBatches((s) => {
      const open = !s[rule];
      if (open) batchScroll.current[rule] = wrapRef.current?.scrollTop ?? 0;
      else if (wrapRef.current) wrapRef.current.scrollTop = batchScroll.current[rule] ?? wrapRef.current.scrollTop;
      return { ...s, [rule]: open };
    });
  };
  // (the ledger's selection/keyboard/kebab machinery retired with the run sheet — Final Shape P5)
  // (the hardback-spine collapse tier retired with the shell — shell follow-up P3: the v2 shell
  // owns chrome responsiveness; the bench lives in the page body at every width.)
  // Masthead search — the input + ⌘K focus mechanics land here (Phase 1); live filtering is
  // Phase 4's wiring. The page stays MOUNTED behind other routes (StagePage display-toggles), so
  // the ⌘K handler must no-op while the board is hidden — offsetParent is null under display:none.
  const [search, setSearch] = useState("");
  // Drawer filters (Phase 4) — session-only; all-visible defaults (hiding is the writer's act).
  const [filters, setFilters] = useState<TodoFilterState>(DEFAULT_FILTERS);
  const filtersRef = useRef<TodoFilterState>(DEFAULT_FILTERS);
  filtersRef.current = filters;
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

  // "Opened" reads the only stored review record — the completion sentinel finishReview
  // writes — and composes into the frame-P3 seen flag (a completed week never re-shows the
  // banner, on any device).
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
  // ── doc pass P5: THE UNDO TOAST — quick actions never confirm, they UNDO. The write fires
  // immediately; the ink pill slides up with a paper Undo on a 6-second window. Hover pauses
  // the timer (remaining-time model); ONE toast at a time — a new action replaces the current
  // toast, which COMMITS the previous (its write already happened; replacement just ends the
  // takeback). Esc dismisses (= commits). Undo reverses via each action's EXISTING inverse —
  // the primitives are already reversible through the derivation layer; nothing new here. ──
  const toastTimer = useRef<number | null>(null);
  const toastDeadline = useRef(0);
  const clearToastTimer = () => { if (toastTimer.current) { window.clearTimeout(toastTimer.current); toastTimer.current = null; } };
  const armToastTimer = (ms: number) => {
    clearToastTimer();
    toastDeadline.current = Date.now() + ms;
    toastTimer.current = window.setTimeout(() => setToast(null), ms);
  };
  const pauseToast = () => { toastDeadline.current = Math.max(600, toastDeadline.current - Date.now()); clearToastTimer(); };
  const resumeToast = () => armToastTimer(toastDeadline.current || 6000);
  const flash = (msg: string, action?: ToastAction) => {
    setToast({ msg, action });
    armToastTimer(action ? 6000 : 2600);
  };
  useEffect(() => {
    if (!toast) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { clearToastTimer(); setToast(null); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);
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
      flash(`Snoozed until ${days === 1 ? "tomorrow" : "next week"}`, { label: "Undo", fn: async () => { await undo(); clearOverlay(c.key); flash("Restored"); } });
      return;
    }
    if (!c.taskType || !c.relatedRecordId) return;
    dismissTask(c.taskType, c.relatedRecordId, "fixed snooze", days);
    const key = flagKeyForTask(c.taskType, c.relatedRecordId);
    const undo = () => upsertTaskFlag(key, { snoozedUntil: null, unbumpSnooze: true }); // full restore, ×n included
    setOverlay(c.key, { kind: "dismissed", lane, text, undo });
    flash(`Snoozed until ${days === 1 ? "tomorrow" : "next week"}`, { label: "Undo", fn: async () => { await undo(); clearOverlay(c.key); flash("Restored"); } });
  }
  function snoozeGroup(g: HkGroup, days: number, when: string) {
    g.members.forEach((m) => m.agentId && dismissTask("data_quality_poor", m.agentId, "fixed snooze", days));
    const undo = async () => { g.members.forEach((m) => m.agentId && upsertTaskFlag(flagKeyForTask("data_quality_poor", m.agentId), { snoozedUntil: null, unbumpSnooze: true })); };
    const gkey = `group-${g.rule}`;
    setOverlay(gkey, { kind: "dismissed", lane: "hk", text: `Snoozed — back ${when}.`, undo });
    flash(`Snoozed until ${days === 1 ? "tomorrow" : "next week"}`, { label: "Undo", fn: async () => { await undo(); clearOverlay(gkey); flash("Restored"); } });
  }
  // the per-type hide — the SAME single suppression point Task settings drives (restorable there)
  function hideType(c: BoardCard, ruleKey: string) {
    updateUserProfile({ mutedTaskRules: Array.from(new Set([...(currentUser?.mutedTaskRules ?? []), ruleKey])) });
    const undo = () => updateUserProfile({ mutedTaskRules: (currentUser?.mutedTaskRules ?? []).filter((r) => r !== ruleKey) });
    flash(`Hidden — ${c.due}`, { label: "Undo", fn: async () => { await undo(); flash("Restored"); } });
  }
  function muteRuleFromCard(g: HkGroup) {
    updateUserProfile({ mutedTaskRules: Array.from(new Set([...(currentUser?.mutedTaskRules ?? []), g.rule])) });
    const undo = () => updateUserProfile({ mutedTaskRules: (currentUser?.mutedTaskRules ?? []).filter((r) => r !== g.rule) });
    flash(`Hidden — ${g.meta.label}`, { label: "Undo", fn: async () => { await undo(); flash("Restored"); } });
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
  // polish P4 — THE REACTIVE RAIL: while a search runs, every pill re-counts through the SAME
  // shared derivation over the search-narrowed sets (never a parallel tally). Groups narrow
  // WHOLE via groupMatchesSearch — exactly how the sheet keeps them — so a pill's count always
  // matches what picking it would show. SHOW ALL's match total uses the shownX composition
  // (cards + hkGapCount gaps) at rest filters.
  const searchActive = search.trim().length > 0;
  const sDo = searchActive ? board.do.filter((c) => matchesSearch(c, search, sctx)) : board.do;
  const sGroups = searchActive ? hkGroups.filter((g) => groupMatchesSearch(g, search)) : hkGroups;
  const sStale = searchActive ? staleCards.filter((c) => matchesSearch(c, search, sctx)) : staleCards;
  const sNt = searchActive ? board.nt.filter((c) => matchesSearch(c, search, sctx)) : board.nt;
  const searchFc = searchActive
    ? filterCounts({ doCards: sDo, hkGroups: sGroups, staleCards: sStale, ntCards: sNt, committedCount: committedCards.filter((c) => matchesSearch(c, search, sctx)).length })
    : null;
  const searchTotal = searchActive ? sDo.length + hkGapCount(sGroups) + sStale.length + sNt.length : null;
  // grouping P3 — search narrows the MEMBERS of an expanded batch through the SAME
  // matchesSearch the sheet uses; the bar keeps standing with SHOWING {matched} OF {n}.
  const groupMembers = (g: HkGroup) => (searchActive ? g.members.filter((m) => matchesSearch(m.card, search, sctx)) : g.members);
  const groupShowing = (g: HkGroup, matched: number) => (matched === g.members.length ? `SHOWING ALL ${g.members.length}` : `SHOWING ${matched} OF ${g.members.length}`);
  // the zero-member teardown: a rule absent from the UNFILTERED derivation has truly emptied
  // (a filtered-out group still exists) — its open flag prunes so a future re-forming batch
  // arrives collapsed.
  useEffect(() => {
    setOpenGroups((g) => {
      const live = Object.entries(g).filter(([r]) => hkGroups.some((x) => x.rule === r));
      if (live.length === Object.keys(g).length) return g;
      const next = Object.fromEntries(live) as Record<string, true>;
      try { localStorage.setItem("sa.todoGroupsOpen", JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  }, [hkGroups]);
  /** The struck-pair count face: old total struck beside the live match count — during search only. */
  const fnFace = (base: number, live: number) =>
    searchActive && live !== base ? (<><s className="tdb-was">{base}</s>{live}</>) : (<>{base}</>);
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
  const staleSorted = sortLedgerHk(vStale, lctx, now);
  const hkTop: Array<{ kind: "group"; g: HkGroup } | { kind: "card"; c: BoardCard }> = [
    ...vGroups.map((g) => ({ kind: "group" as const, g })),
    ...staleSorted.map((c) => ({ kind: "card" as const, c })),
  ];
  // Bulk actions — the same writes the singles make, applied optimistically with ONE undo-all.

  // v4 P5 — the assistant preview's data source: the user's REAL housekeeping task names
  // (names only — the theatre is canned; nothing writes back).
  // TODO(pro-assistant): replace canned theatre with real single-task free run ("Try one free")
  // when the assistant Cloud Function ships.
  const assistantRows: AssistantTaskRow[] = hkGroups.flatMap((g) =>
    g.members.slice(0, 2).map((m) => ({
      label: `${g.rule === "dq_mswl" ? "Wish list" : g.rule === "dq_materials" ? "Materials" : "Reply window"} — ${m.agentName}${m.agency ? `, ${m.agency}` : ""}`,
      agent: m.agentName,
    }))
  ).slice(0, 4);
  const [assistantOpen, setAssistantOpen] = useState(false);
  // the focused session (the session pack): the queue = the ENGINE's own boardCards order,
  // captured at launch; the cinematic container drives it.
  const [session, setSession] = useState<{ queue: BoardCard[] } | null>(null);
  // the inverses the undo toast already carries, kept by card key so the session's REDO can
  // offer "Undo handled" on a card it stamped (see doneToast — no parallel undo store)
  const doneUndos = useRef<Map<string, () => Promise<void>>>(new Map());
  // v7 — the hero in session: the title crossfade + the fixed sub-slot's single occupant are
  // driven by the FocusedSession through this ONE lifted view-model (the hero stays a real
  // stacked flow — nothing absolutely positioned over the board).
  const [heroSession, setHeroSession] = useState<HeroSession>({ clearing: false, slot: null });
  // frame P3 — the review's AFTERLIFE: opening or dismissing the banner collapses it for the
  // week (per-week sa. prefs; recon found no existing seen/dismissed flags — the completion
  // sentinel is the one stored "opened" record, and it composes into seen below). The rail's
  // REVIEW row is then the sole entry point; a new week resets both.
  const [reviewSeenWk, setReviewSeenWk] = useState<string | null>(() => { try { return localStorage.getItem("sa.todoReviewSeen"); } catch { return null; } });
  const [reviewDismissedWk, setReviewDismissedWk] = useState<string | null>(() => { try { return localStorage.getItem("sa.todoReviewDismissed"); } catch { return null; } });
  const reviewSeen = !reviewWin || reviewSeenWk === reviewWin.key || reviewOpened;
  const reviewDismissed = !reviewWin || reviewDismissedWk === reviewWin.key;
  const markReviewSeen = () => {
    if (!reviewWin) return;
    setReviewSeenWk(reviewWin.key);
    try { localStorage.setItem("sa.todoReviewSeen", reviewWin.key); } catch { /* private mode */ }
  };
  const dismissReviewWeek = () => {
    if (!reviewWin) return;
    setReviewDismissedWk(reviewWin.key);
    try { localStorage.setItem("sa.todoReviewDismissed", reviewWin.key); } catch { /* private mode */ }
  };
  const openReview = () => { markReviewSeen(); openSundayReview(); };
  // THE BRIEFING'S FIGURES — derived from the existing review data, never hardcoded. FOCUSED
  // has no source anywhere in the app (no time is recorded), so that column always drops; a
  // zero cleared/replies drops its column too rather than showing a nought.
  const briefStats = useMemo(
    () => (reviewWin ? weekReviewStats({ activities, queries, agents }, reviewWin) : null),
    [activities, queries, agents, reviewWin?.key], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const briefCleared = reviewWin ? briefingCleared(userTasks, reviewWin) : 0;
  const briefReplies = briefStats ? briefStats.back.length : 0;
  const briefFigures = briefingFigures(briefCleared, briefReplies);
  const briefNarrative = briefStats ? briefingNarrative(briefStats) : null;

  // v4 P3 — CONDITIONAL TODAY: the column exists only with content (≥1 committed OR ≥1 done
  // today — the existing derivation); empty → the board runs 4-up. Exit lags 220ms for the
  // slide-out (reduced motion: instant).
  const todayActive = committedCards.length > 0 || doneN > 0;
  const [todayShown, setTodayShown] = useState(false);
  const [todayLeaving, setTodayLeaving] = useState(false);
  // THE WORKSPACE SHELL (todo-fix48) — Today is back in its corner pop-up: a minimise control
  // collapses it to a pill, the state persisted.
  const [todayMin, setTodayMin] = useState<boolean>(() => { try { return localStorage.getItem("sa.todoTodayMin") === "1"; } catch { return false; } });
  const toggleTodayMin = (v: boolean) => { setTodayMin(v); try { localStorage.setItem("sa.todoTodayMin", v ? "1" : "0"); } catch { /* private mode */ } };
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (todayActive) { setTodayShown(true); setTodayLeaving(false); return; }
    if (reduce) { setTodayShown(false); setTodayLeaving(false); return; }
    setTodayLeaving(true);
    const t = window.setTimeout(() => { setTodayShown(false); setTodayLeaving(false); }, 220);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayActive]);

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
  // The v2 shell sidebar's Task-settings button opens the sheet from outside the page — the
  // same window-event pattern as the tour replay (the page stays mounted behind other routes).
  useEffect(() => {
    const onOpen = () => setSettingsOpen(true);
    window.addEventListener("sa:open-task-settings", onOpen);
    return () => window.removeEventListener("sa:open-task-settings", onOpen);
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
  // session P1 — the Mark-handled gate: TRUE only where quickDone has an honest arm
  // (notes · no-response-close · nudge · the mark-sent quick path). Offers keep the standing
  // no-one-tap rule; dq member cards have no arm (they complete through their journeys).
  function sessionCanQuick(c: BoardCard): boolean {
    if (c.taskType === "offer_received") return false;
    if (c.userTaskId) return true;
    if (c.taskType === "no_response_close" || c.taskType === "nudge_overdue") return true;
    const q = c.relatedRecordId ? queries.find((x) => x.id === c.relatedRecordId) : undefined;
    return !!q && getPrimaryAction(q.status as QueryStatus).kind === "mark-sent";
  }
  // v9 — the session's REDO can offer "Undo handled" on a card it stamped. It calls back to
  // THE SAME inverse the undo toast already carries, remembered by card key — there is no
  // parallel undo store and no second inverse anywhere in the app.
  function doneToast(c: BoardCard, fn: () => Promise<void>) {
    doneUndos.current.set(c.key, fn);
    flash(`Done — “${c.title}”`, { label: "Undo", fn });
  }

  async function quickDone(c: BoardCard) {
    const nowIso = new Date().toISOString();
    if (c.userTaskId) {
      await updateUserTask(c.userTaskId, { done: true, completedAt: nowIso });
      const undo = () => updateUserTask(c.userTaskId!, { done: false });
      setOverlay(c.key, { kind: "receipt", lane: "nt", title: "Note done", line: `${c.title} — struck through on Today.`, undo });
      doneToast(c, async () => { await undo(); clearOverlay(c.key); flash("Restored"); });
      return;
    }
    const q = c.relatedRecordId ? queries.find((x) => x.id === c.relatedRecordId) : undefined;
    if (!q) return;
    if (c.taskType === "no_response_close") {
      const prev = q.status as QueryStatus;
      await updateQueryStatus(q.id, QueryStatus.NO_RESPONSE, "Closed as no response from the quick rail");
      const undo = () => undoQueryStatus(q.id, prev, QueryStatus.NO_RESPONSE);
      setOverlay(c.key, { kind: "receipt", lane: "hk", title: `${c.who || "Query"} — closed`, line: "Logged as no response — not a rejection, so your response rate stays honest." , undo });
      doneToast(c, async () => { await undo(); clearOverlay(c.key); flash("Restored"); });
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
      doneToast(c, async () => { await undo(); clearOverlay(c.key); flash("Restored"); });
      return;
    }
    const action = getPrimaryAction(q.status as QueryStatus);
    if (action.kind !== "mark-sent") return;
    // B3 — the soft duplicate-send guard in the quick-✓'s grammar (the styled ConfirmAsk;
    // decline writes nothing, the card stays). R&R resubmissions are never guarded.
    const prior = priorSameTypeSend(activitiesRef.current, q.id, action.target as QueryStatus, action.markKind === "resubmit");
    if (prior && !(await confirmAsk(duplicateSendPrompt(action.target as QueryStatus, c.who, prior), { confirmLabel: "Send again", cancelLabel: "Cancel" }))) return;
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
    doneToast(c, async () => { await undo(); clearOverlay(c.key); flash("Restored"); });
  }

  // Grouped-card ⏸ fork actions — mute scopes, stated plainly. Nothing is ever deleted.
  function forkNotNowGroup(g: HkGroup) {
    g.members.forEach((m) => m.agentId && dismissTask("data_quality_poor", m.agentId, "fixed snooze", 7));
    const undo = async () => { g.members.forEach((m) => m.agentId && upsertTaskFlag(flagKeyForTask("data_quality_poor", m.agentId), { snoozedUntil: null, unbumpSnooze: true })); };
    const key = `group-${g.rule}`;
    setOverlay(key, { kind: "dismissed", lane: "hk", text: "Snoozed — back in a week.", undo });
    flash(`Snoozed until next week`, { label: "Undo", fn: async () => { await undo(); clearOverlay(key); flash("Restored"); } });
  }
  function forkNeverThese(g: HkGroup) {
    g.members.forEach((m) => m.agentId && upsertTaskFlag(flagKeyForTask("data_quality_poor", m.agentId), { snoozedUntil: MUTED_UNTIL }));
    const undo = async () => { g.members.forEach((m) => m.agentId && upsertTaskFlag(flagKeyForTask("data_quality_poor", m.agentId), { snoozedUntil: null })); };
    const key = `group-${g.rule}`;
    setOverlay(key, { kind: "dismissed", lane: "hk", text: "Muted — we won’t ask about these agents again.", undo });
    flash(`Hidden — ${HK_RULES[g.rule].label}`, { label: "Undo", fn: async () => { await undo(); clearOverlay(key); flash("Restored"); } });
  }
  function forkNeverRule(g: HkGroup) {
    // rule-mute now carries its own Undo (the finishing pack's compensator-table gap): the
    // reversal is the profile filter-out — the same write unmuteRule performs.
    updateUserProfile({ mutedTaskRules: Array.from(new Set([...(currentUser?.mutedTaskRules ?? []), g.rule])) });
    clearOverlay(`group-${g.rule}`);
    const undo = () => updateUserProfile({ mutedTaskRules: (currentUser?.mutedTaskRules ?? []).filter((r) => r !== g.rule) });
    flash(`Hidden — ${HK_RULES[g.rule].label}`, { label: "Undo", fn: async () => { await undo(); flash("Restored"); } });
  }
  function forkStale(c: BoardCard, mode: "notNow" | "neverThis") {
    if (!c.taskType || !c.relatedRecordId) return;
    const key = flagKeyForTask(c.taskType, c.relatedRecordId);
    const undo = () => upsertTaskFlag(key, { snoozedUntil: null });
    if (mode === "notNow") {
      dismissTask(c.taskType, c.relatedRecordId, "fixed snooze", 7);
      const snoozeUndo = () => upsertTaskFlag(key, { snoozedUntil: null, unbumpSnooze: true }); // full restore, ×n included
      setOverlay(c.key, { kind: "dismissed", lane: "hk", text: "Snoozed — back in a week.", undo: snoozeUndo });
      flash(`Snoozed until next week`, { label: "Undo", fn: async () => { await snoozeUndo(); clearOverlay(c.key); flash("Restored"); } });
    } else {
      upsertTaskFlag(key, { snoozedUntil: MUTED_UNTIL });
      setOverlay(c.key, { kind: "dismissed", lane: "hk", text: "Muted — we won’t ask about this query again.", undo });
      flash(`Hidden — “${c.title}”`, { label: "Undo", fn: async () => { await undo(); clearOverlay(c.key); flash("Restored"); } });
    }
  }
  // hero-pair P4 — THE INLINE COMPOSER (todo-composer.html §4): the browser prompt was a
  // placeholder, not a design. addTask now opens the composer in the current view's Notes
  // seat; save wires to the SAME addUserTask action (no new write path).
  function addTask() {
    setComposerDraft("");
    setComposerAt(view === "ledger" ? "ledger" : "cards");
  }
  async function saveComposer() {
    const text = composerDraft.trim();
    if (!text) return;
    await addUserTask({ text });
    setComposerAt(null);
    setComposerDraft("");
  }

  // Shell follow-up P3: the hardback-spine TodoShell is RETIRED — the v2 shell (rail, sidebar,
  // top bar) provides the chrome it drew. The page root keeps the `spine-root` class as the
  // token carrier for the two relocated survivors (the chip bench + the Pro sticker), whose
  // styles live on in the trimmed todoShell.css.
  return (
    <div className="t-f12 spine-root">
      <div className="tdb-wrap today-off" ref={wrapRef}>
        {/* SHELL POLISH P1 — THE CENTRED COLUMN: the hero row and the panel live on ONE
            max-width column (~1360px), centred with equal side gutters that grow with the
            viewport. The title sits flush with the panel's left edge, the CTA/review pair flush
            with its right — one column, one pair of edges. A ≥44px gap sits under the bar. */}
        <div className="tdb-col">
        {renderPageHeader()}
        <div className="tdb-asm tdb-ws">
          {/* THE WORKSPACE SHELL (todo-fix48) — the filters live in the sidebar now; the body
              is the centre stack (the panel arrives in Phase 2) beside the Today corner. */}
          <div className="tdb-centre">
          {/* THE BRIEFING SLOT (briefing-slot pack — ref design-refs/briefing-slot.html option 1;
              SUPERSEDES the todo-rebuild featured card). ONE region between the hero rule and the
              filter row, rendering the review briefing and nothing else.

              THE COLLAPSE LAW: dismissed, or no fresh review, and the slot renders NOTHING — no
              node, no margin, no reserved height, so the filter row moves straight up under the
              hero. That is why the whole block sits inside this one condition and why the slot
              owns no wrapper of its own. Dismissal is already per-review-period
              (sa.todoReviewDismissed keyed on reviewWin.key), so a new review brings it back. */}
          {reviewWin && !reviewSeen && !reviewDismissed && (
            <div className="tdb-brief">
              <div className="tdb-brieftxt">
                <div className="tdb-briefk">↺ LAST WEEK IN REVIEW</div>
                <div className="tdb-brieft">{briefingHeadline(briefCleared, briefReplies)}</div>
                {briefNarrative && <div className="tdb-briefd">{briefNarrative}</div>}
              </div>
              {briefFigures.length > 0 && (
                <div className="tdb-briefstats">
                  {briefFigures.map((f) => (
                    <div key={f.key}>
                      <b>{f.value}</b>
                      <span>{f.label}</span>
                    </div>
                  ))}
                </div>
              )}
              <button type="button" className="tdb-briefbtn" onClick={openReview}>Read the review</button>
              <button type="button" className="tdb-briefx" aria-label="Dismiss for this week" onClick={dismissReviewWeek}>✕</button>
            </div>
          )}
          {/* THE CONTROL LINE (todo rebuild P1) — the filter chips and the list controls are ONE
              row, not two stacked bands: chips left, a flexible spacer, then the list search and
              the view toggle. No container, no label slab — the filter slab's funnel/FILTER head
              and the board panel both went with it. The "{n} items" line went too: the All chip's
              struck total already carries the narrowed count. */}
          <div className="tdb-ctrl">
            {renderFilterChips()}
            <span className="tdb-ctrlsp" />
            <span className="tdb-bsearch">
              <span className="tdb-bsmag" aria-hidden>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.4-3.4" /></svg>
              </span>
              <input
                ref={searchRef}
                type="text"
                placeholder="Search your list…"
                aria-label="Search your list"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") { setSearch(""); (e.target as HTMLInputElement).blur(); } }}
              />
            </span>
            <span className="tdb-vtog" role="group" aria-label="View">
              <button type="button" className={view === "cards" ? "on" : ""} aria-pressed={view === "cards"} aria-label="Cards" title="Cards" onClick={() => pickView("cards")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
              </button>
              <button type="button" className={view === "ledger" ? "on" : ""} aria-pressed={view === "ledger"} aria-label="Rows" title="Rows" onClick={() => pickView("ledger")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
            </span>
          </div>
          <div className="tdb-board">
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
            {vDo.map((c) => renderCard(c))}
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
            {vStale.map((c) => renderCard(c))}
          </Lane>
          )}
          {(!active || vNt.length > 0 || overlayCards("nt").length > 0) && (
          <Lane cls="nt" label="Notes to self" count={active ? vNt.length : tiles.notes} onAdd={addTask} isEmpty={vNt.length === 0 && overlayCards("nt").length === 0 && composerAt !== "cards"}
            filtered={active && vNt.length < tiles.notes ? { x: vNt.length, y: tiles.notes, showAll: resetDeck } : null}
            emptyNode={composerAt === "cards" ? renderComposer() : <button type="button" className="tdb-ghostcard quiet" onClick={addTask} aria-label="Add a note"><span className="tdb-gg" aria-hidden>＋</span></button>}>
            {composerAt === "cards" && vNt.length > 0 && renderComposer()}
            {overlayCards("nt")}
            {vNt.map((c) => renderCard(c))}
          </Lane>
          )}
        </div>
        )}
          </div>
          {/* THE ASSISTANT BAND (briefing-slot P2) — the page's closing note at the foot of the
              content, full column width. The ONE Pro surface on this page. */}
          {!isProUser(currentUser) && (
            <AssistantBand hkCount={tiles.housekeeping} totalCount={shownY} onPreview={() => setAssistantOpen(true)} />
          )}
          </div>
        </div>
        </div>
        {/* THE WORKSPACE SHELL (todo-fix48) — Today, back in its corner: a floating card
            bottom-right of the workspace, minimising to a pill; absent when the list is empty. */}
        {renderTodayCorner()}
      </div>

      {assistantOpen && (
        <AssistantModal
          hkCount={tiles.housekeeping}
          totalCount={shownY}
          rows={assistantRows}
          onClose={() => setAssistantOpen(false)}
          onUpgrade={() => { setAssistantOpen(false); onNavigate("plans"); }}
        />
      )}
      {confirmAskNode}
      {settingsOpen && <TaskSettingsSheet onClose={() => setSettingsOpen(false)} />}
      {tourOpen && <TodoTour onEnd={endTour} />}
      {toast && (
        <div className="tdb-toast" role="status" onMouseEnter={pauseToast} onMouseLeave={resumeToast}>
          {toast.msg}
          {toast.action && <button type="button" className="tdb-toast-act" onClick={() => { toast.action!.fn(); clearToastTimer(); setToast(null); }}>{toast.action.label}</button>}
        </div>
      )}
      {flow && <FocusFlow items={flow.items} mode={flow.mode} ritual={flow.ritual} onClose={() => { setFlow(null); setFlowPrefill(undefined); }} onNavigate={onNavigate} onToast={flash} prefill={flowPrefill} />}
      {session && (
        <FocusedSession
          queue={session.queue}
          wrapEl={wrapRef.current}
          liveKeys={new Set(boardCards.map((c) => c.key))}
          onOpenJourney={(card) => setFlow({ items: [{ kind: "card", card }] })}
          onQuickComplete={quickDone}
          canQuickComplete={sessionCanQuick}
          canUndoHandled={(c) => doneUndos.current.has(c.key)}
          onUndoHandled={async (c) => { const fn = doneUndos.current.get(c.key); if (fn) { doneUndos.current.delete(c.key); await fn(); } }}
          onHero={setHeroSession}
          onClose={() => { setSession(null); setHeroSession({ clearing: false, slot: null }); }}
        />
      )}
    </div>
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
  // date, no counts, no census squares (the counts live on the rail's pills; focus-art.png is
  // reserved for the focused session's opening screen, not this page). The search pill is the
  // ⌘K home and live-filters both views; the narrow Today chip rides beside it. ──
  /** THE PAGE HEADER (todo rebuild P4) — the app-wide `PageHeader`, full variant, with exactly
   *  two actions: "Last week in review" (ghost; the house disabled treatment when no review
   *  exists) and "Add task or note" (the soft-pink primary).
   *
   *  ⚠️ RED GATE, REPORTED: "Begin focused session" is retired here, and it was the ONLY thing
   *  that ever called setSession — so `FocusedSession` (and the hero's title crossfade, ritual
   *  lines and progress slot, which it drove through setHeroSession) is now UNREACHABLE from
   *  the UI. Per the pack, nothing further is deleted: `session`, `heroSession`, `HeroSession`,
   *  `FocusedSession`, `renderHero` below and all their CSS stay in place, dormant, awaiting a
   *  new entry point. */
  function renderPageHeader() {
    return (
      <PageHeader
        title="What’s on your desk?"
        description="Urgent tasks, housekeeping, notes. Here’s everything on your to-do list."
        actions={[
          {
            label: "Last week in review",
            onClick: openReview,
            disabled: !reviewWin,
            icon: <RewindGlyph />,
          },
          {
            label: "Add task or note",
            onClick: addTask,
            primary: true,
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>,
          },
        ]}
      />
    );
  }
  /** DORMANT (todo rebuild P4): the bespoke hero — the focused session's title crossfade,
   *  ritual lines and progress slot. Kept whole rather than deleted; see the red gate above. */
  function renderHero() {
    return (
      // THE WORKSPACE SHELL (todo-fix48) — the hero, plain on the page: the title + subtitle
      // left, the session CTA pair on the right. The search has moved to the breadcrumb bar.
      <div className="tdb-herohead">
        <div className="tdb-herol">
          {/* v7 — the gentle title crossfade (opacity only, 800ms): the stacked pair share the
              line; nothing shifts (the sub-slot below is fixed height). */}
          <h1 className={`tdb-ask t1${heroSession.clearing ? " out" : ""}`}>What’s on your desk?</h1>
          <h1 className={`tdb-ask t2${heroSession.clearing ? " in" : ""}`} aria-hidden={!heroSession.clearing}>In focus</h1>
          {/* the sub-slot below the title: the subtitle at rest → the ritual lines → the v9
              progress row, one crossfading occupant in a fixed-height band (the spacing law). */}
          <div className={`tdb-srchrow${heroSession.slot ? " insession" : ""}`}>
            <p className="tdb-herosub">Urgent tasks, housekeeping, notes. Here’s everything on your to-do list.</p>
            {heroSession.slot && (() => {
              const slot = heroSession.slot;
              return (
                <div className="tdb-heroslot" aria-live="polite">
                  {slot.kind === "ritual" ? (
                    <div className="tdb-fsrit">
                      {RITUAL_LINES.map((l, i) => (
                        <span key={l} className={slot.index === i ? "on" : slot.index > i ? "off" : ""}>{l}</span>
                      ))}
                    </div>
                  ) : (
                    // v9 — the progress treatment (session-v9-header.html V2): a thin ink bar on
                    // #ddd2c2 with a Playfair fraction beside it. No kicker, no other text.
                    <div className="tdb-fsprog" aria-label={`Task ${slot.i} of ${slot.n}`}>
                      <span className="tdb-fsbar" aria-hidden><b style={{ width: `${progressPct(slot.i, slot.n)}%` }} /></span>
                      <span className="tdb-fsfrac">{slot.i} / {slot.n}</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
        {/* the CTA pair: the ink Begin pill with the underlined review link centred beneath it.
            It unmounts for the session (the opening owns the departure). */}
        {heroSession.slot?.kind !== "session" && (
          <div className={`tdb-heroright${heroSession.clearing ? " insession" : ""}`}>
            <button type="button" className="tdb-btnp tdb-herobegin" disabled={boardCards.length === 0} onClick={() => setSession({ queue: boardCards })}>
              <svg width="10" height="11" viewBox="0 0 11 12" aria-hidden><path d="M1.5 1.5 L9.5 6 L1.5 10.5 Z" fill="#f3e7da" /></svg>
              Begin focused session
            </button>
            {reviewWin && (reviewSeen || reviewDismissed) && (
              <button type="button" className={`tdb-revlink${reviewSeen ? " seen" : ""}`} title={`WK ${reviewWin.weekNumber}`} onClick={openReview}>
                <RewindGlyph />
                Last week in review
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Final Shape P2: THE FILTER RAIL (ref .fside) — the quiet-pill law rotated vertical.
  // Full-width 34px pills (white/hairline/ink, 7px family dot, count right), zero-count 40%;
  // the lens below a divider; narrowed = included band-fill burgundy + the SHOWING x OF y ·
  // RESET row under SHOW. Foot: the Task-settings row + the Pro square (non-Pro only). The
  // Focus square is GONE — the hero owns the focused session. ──
  // panel-final P2 — THE CHIP BENCH: the facets as wrapping TOGGLE CHIPS. The selection model is
  // UNCHANGED (togglePill — the solo-then-membership set); the chip only re-dresses the pill. A
  // selected chip fills deep ink; a zero-count chip fades to 45% but stays rendered.
  function benchChip(label: string, key: FilterType, count: number) {
    const on = filters[key];
    const live = searchFc ? searchFc[key] : count;
    return (
      <button type="button" className={`spine-chip${!resting && on ? " on" : ""}${live === 0 ? " zero" : ""}`} aria-pressed={!resting && on} onClick={() => setFilters((f) => togglePill(f, key))}>
        {label}<span className="spine-chipn">{fnFace(count, live)}</span>
      </button>
    );
  }
  // ── hero-pair P4: THE INLINE COMPOSER (todo-composer.html §4) — white, notes-family
  // border, Caveat autofocused and growing, ⌘⏎ saves · Esc cancels · an outside click
  // cancels only when empty. Save rides the existing addUserTask action. ──
  function renderComposer() {
    return (
      <div className="tdb-composer">
        <textarea
          ref={(el) => { if (el) { el.focus(); el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; } }}
          value={composerDraft}
          rows={1}
          placeholder="Jot it down…"
          aria-label="New note"
          onChange={(e) => { setComposerDraft(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${e.target.scrollHeight}px`; }}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); saveComposer(); }
            if (e.key === "Escape") { e.stopPropagation(); setComposerAt(null); }
          }}
        />
        <div className="tdb-compfoot">
          <span className="tdb-comphint" aria-hidden>⌘⏎ SAVE · ESC CANCEL</span>
          <button type="button" className="tdb-btnh tdb-compsave" onClick={() => setComposerAt(null)}>Cancel</button>
          <button type="button" className="tdb-btnh em" onClick={saveComposer}>Save note</button>
        </div>
      </div>
    );
  }
  // ── panel-final P2 — THE CHIP BENCH (design-refs/panel-chip-bench.html · W1): the context zone
  // is a FILTER workbench, not a nav list. An inset deeper-parchment card, self-headed by the
  // funnel + FILTER + a Clear link (shown only when a facet is narrowing); the facets as wrapping
  // toggle chips (All leads as the reset/Show-all). The active-search string rides in the same
  // grammar as a dismissable chip. Baked: Today's list does NOT join the bench — it lives in the
  // corner pop-up, so its old lens row is retired here (filters.todayOnly is untouched, dormant).
  // Every reactive behaviour carries over verbatim (counts, struck totals via fnFace, zero-fade).
  function renderFilterChips() {
    return (
      <>
          {searchActive && (
            <button type="button" className="spine-chip q" aria-label="Clear the search" onClick={() => setSearch("")}>
              “{search.trim().toUpperCase()}” <span aria-hidden>✕</span>
            </button>
          )}
          {/* All is the default-selected chip AND the Show-all reset (filters only; the query
              chip clears the search) */}
          <button type="button" className={`spine-chip all${resting ? " on" : ""}`} aria-pressed={resting} onClick={() => setFilters({ ...DEFAULT_FILTERS })}>
            All<span className="spine-chipn">{fnFace(shownY, searchTotal ?? shownY)}</span>
          </button>
          {benchChip("Offers", "offers", fc.offers)}
          {benchChip("Agent waiting", "overToYou", fc.overToYou)}
          {benchChip("Materials", "materials", fc.materials)}
          {benchChip("Wish lists", "mswl", fc.mswl)}
          {benchChip("Stale", "stale", fc.stale)}
          {benchChip("Snoozed", "snoozed", fc.snoozed)}
          {benchChip("Notes", "notes", fc.notes)}
      </>
    );
  }

  // ── the "Today" card (VI P1, todo-right-column-v1.html) — same state, same handlers
  // (rollover Keep/Clear, committed rows + take-off, Help me pick, Work the list); the anatomy is
  // the ref card: plain paper header (date ⇄ "{n} OF 5"), committed items above a dashed
  // ghost-row invitation (todayGhosts), the collapsed-by-default done row, two footer verbs. ──
  // THE WORKSPACE SHELL (todo-fix48) — the Today corner: the floating card (or its minimised
  // pill), bottom-right of the workspace, absent when the list is empty. The card reuses the
  // one renderTodayPanel (checklist + Work the list) and adds a minimise control.
  function renderTodayCorner() {
    if (!todayShown) return null;
    if (todayMin) {
      return (
        <button type="button" className="tdb-tdpill" onClick={() => toggleTodayMin(false)} aria-label="Open Today" title="Open Today">
          <span className="tdb-tddot" aria-hidden />Today · {committedCards.length}
        </button>
      );
    }
    return (
      <div className={`tdb-tdpop${todayLeaving ? " out" : " in"}`} role="complementary" aria-label="Today">
        <button type="button" className="tdb-tdmin" aria-label="Minimise Today" title="Minimise" onClick={() => toggleTodayMin(true)}>–</button>
        {renderTodayPanel()}
      </div>
    );
  }
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
                  {/* doc pass P5 — Today's tick: the leading dot grows the tick on row hover/
                      focus and completes with the undo toast (offers keep the plain dot) */}
                  {c.taskType === "offer_received" ? (
                    <span className="tdb-tdot">{!c.hk && !c.userTaskId && c.status ? <StatusDot status={c.status as QueryStatus} overrideSize={16} /> : null}</span>
                  ) : (
                    <button type="button" className="tdb-tdot tick" aria-label={`Mark done — ${c.title}`} onClick={(e) => { e.stopPropagation(); quickDone(c); }}>
                      {!c.hk && !c.userTaskId && c.status ? <StatusDot status={c.status as QueryStatus} overrideSize={16} /> : null}
                      <span className="tdb-ttick" aria-hidden>✓</span>
                    </button>
                  )}
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
              <button type="button" className="tdb-btnh" onClick={helpMePick}>＋ Add more</button>
              <button type="button" className="tdb-btnp sm" onClick={() => {
                // C2 family law — the Today walk is a ritual: sage bands whole-walk
                setFlow({ items: committedCards.map((card) => ({ kind: "card", card })), ritual: true });
              }}>Work the list</button>
            </>
          ) : (
            <>
              <button type="button" className="tdb-btnh" onClick={helpMePick}>Help me pick</button>
              {/* the manual doorway — commitment happens on the board's cards */}
              <button type="button" className="tdb-btnh" onClick={() => scrollToLane("do")}>＋ Add</button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── doc pass P4: LEDGER v2 (todo-doc-pass-a.html §3 + todo-doc-pass-b.html §2) — each
  // lane's rows live in a family-washed section (whisper pink / whisper latte / a DERIVED
  // notes whisper — the pack specified two; the wash is territory, not decoration); rows are
  // white cards inside it. DONE lives at the row's HEAD: the 24px family roundel becomes a
  // tick on row hover/focus and completes immediately (offers + batches keep the plain dot —
  // an offer needs its moment, a batch has no single completion). The acting controls sit at
  // the tail, vertically centred: the emphasised lead (OPENS the acting surface, same as
  // row-click — it never marks complete) · ghost "＋ Today's list" · the clock "Snooze or
  // dismiss ▾" (the SAME Later menu, renamed trigger). The cards view keeps its short verbs —
  // a deliberate, baked divergence. Headings stick within the page scroll on a wash-coloured
  // backing; clicking the heading (not its play button) folds the section, persisted per-lane
  // (sa.todoLedgerFold). ──
  function ledgerDot(c: BoardCard) {
    if (c.taskType === "offer_received") {
      return <span className="tdb-ldot" aria-hidden><span className="tdb-lddot" /></span>;
    }
    return (
      <button type="button" className="tdb-ldot tick" aria-label={`Mark done — ${c.title}`}
        onClick={(e) => { e.stopPropagation(); quickDone(c); }}>
        <span className="tdb-lddot" aria-hidden />
        <span className="tdb-ldtick" aria-hidden>✓</span>
      </button>
    );
  }
  /** THE ROW (todo rebuild P2 — ref .row): a hairline card carrying a 42px tinted family tile,
   *  a Playfair title over an italic Playfair subtitle, the mono tag pill right, then a
   *  chevron; the border lifts and a soft shadow arrives on hover.
   *
   *  RECONCILE (reported): the mockup's tile is decorative, but the leading slot on the live
   *  row is the COMPLETION control (the dot that becomes a tick on hover). Rather than lose
   *  that, the dot is SEATED INSIDE the tile — the tile brings the mockup's tint and size, the
   *  dot keeps its behaviour. The action cluster likewise stays: the mockup draws no row
   *  actions, but Action-now / Today / Later are the row's working surface. */
  function runRow(c: BoardCard, fam: "do" | "hk" | "nt" = "do") {
    const committed = onList(c);
    const isOffer = c.taskType === "offer_received";
    const subIsMs = !!c.subtitle && manuscripts.some((m) => m.title === c.subtitle);
    return (
      <div key={c.key} data-tdbkey={c.key} className="tdb-lrow" role="button" tabIndex={0}
        onClick={() => openFlowCards([c])}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); openFlowCards([c]); } }}>
        <span className={`tdb-ltile ${fam}`}>{ledgerDot(c)}</span>
        <div className="tdb-lbody">
          <h3 className="tdb-lbt">{c.title}</h3>
          {c.subtitle && <div className="tdb-lbms">{subIsMs ? <span className="tdb-ms">{c.subtitle}</span> : c.subtitle}</div>}
        </div>
        <div className="tdb-ltags">
          <span className={`tdb-tag due${isOffer ? " offer" : c.warn ? " warn" : ""}`}>{isOffer ? `★ ${c.due}` : c.due}</span>
          {c.snoozes > 0 && <span className="tdb-tag snz">Snoozed ×{c.snoozes}</span>}
          {committed && <span className="tdb-chipon">✓ TODAY</span>}
        </div>
        <div className="tdb-lacts" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="tdb-btnh em" onClick={() => openFlowCards([c])}>{VERB_LABELS.action}</button>
          <button type="button" className="tdb-btnh" onClick={() => toggleToday(c)}>{committed ? VERB_LABELS.todayRemove : VERB_LABELS.todayAdd}</button>
          {laterMenu(c)}
        </div>
        <span className="tdb-lgo" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
        </span>
      </div>
    );
  }
  // ── grouping P2 — the nested MEMBER ROW (todo-grouping.html §2): inset beneath the
  // parent with the family-tinted spine, smaller title, the STANDARD trio of row actions;
  // no head checkbox (the ref draws none — a dq member completes through its journey). ──
  function runMemberRow(c: BoardCard) {
    const committed = onList(c);
    return (
      <div key={c.key} data-tdbkey={c.key} className="tdb-lsub" role="button" tabIndex={0}
        onClick={() => openFlowCards([c])}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); openFlowCards([c]); } }}>
        <div className="tdb-lbody">
          <h3 className="tdb-lbt sm">{c.title}</h3>
          {c.subtitle && <div className="tdb-lbms">{c.subtitle}</div>}
        </div>
        <div className="tdb-lacts" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="tdb-btnh em" onClick={() => openFlowCards([c])}>{VERB_LABELS.action}</button>
          <button type="button" className="tdb-btnh" onClick={() => toggleToday(c)}>{committed ? VERB_LABELS.todayRemove : VERB_LABELS.todayAdd}</button>
          {laterMenu(c)}
        </div>
      </div>
    );
  }
  function runBatchRow(g: HkGroup) {
    // grouping P3 — a group of one renders as its UNIT row
    if (g.members.length === 1) return runRow(g.members[0].card);
    const key = `group-${g.rule}`;
    const copy = G3_COPY[g.rule] ?? { rest: () => ` ${g.meta.label.toLowerCase()}`, sub: "" };
    const prog = hkGroupProgress(agents.length, g.members.length);
    const open = () => setFlow({ items: [{ kind: "group", group: g }] });
    // grouping P2 — the row's non-action click TOGGLES the nest (Action now keeps open —
    // a scoped supersede of the doc-pass "same as row-click" clause for BATCH rows only)
    const expanded = !!openGroups[g.rule];
    const members = groupMembers(g);
    const paged = pagedGroups[g.rule] ? members : members.slice(0, GROUP_PAGE);
    const remaining = members.length - paged.length;
    return (
      <React.Fragment key={key}>
      <div className={`tdb-lrow${expanded ? " open" : ""}`} role="button" tabIndex={0} aria-expanded={expanded}
        onClick={() => toggleGroup(g.rule)}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); toggleGroup(g.rule); } }}>
        <span className="tdb-lchev" aria-hidden>▶</span>
        <div className="tdb-lbody">
          <div className="tdb-tagline"><span className="tdb-tag due">{g.meta.label.toUpperCase()}</span></div>
          <h3 className="tdb-lbt batch"><b>{g.members.length}</b>{copy.rest(g.members.length)}</h3>
          <div className="tdb-lbsub">{copy.sub}</div>
          <div className="tdb-minibar"><i style={{ width: `${prog.pct}%` }} /></div>
          <div className="tdb-mmeta">{prog.caption.toUpperCase()} · {prog.pct}%</div>
        </div>
        {expanded && members.length !== g.members.length && <span className="tdb-lshow">{groupShowing(g, members.length)}</span>}
        <div className="tdb-lacts" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="tdb-btnh em" onClick={open}>{VERB_LABELS.action}</button>
          <span className="tdb-latwrap">
            <button type="button" className="tdb-btnh" aria-haspopup="menu" aria-expanded={laterKey === key} onClick={(e) => { e.stopPropagation(); setLaterKey((k) => (k === key ? null : key)); }}><ClockGlyph />{VERB_LABELS.later}</button>
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
      {expanded && (
        <>
          {paged.map((m) => runMemberRow(m.card))}
          {remaining > 0 && (
            <button type="button" className="tdb-lpage" onClick={() => setPagedGroups((p) => ({ ...p, [g.rule]: true }))}>+ {remaining} more…</button>
          )}
        </>
      )}
      </React.Fragment>
    );
  }
  /** Both views now sit under the SAME typographic heading (todo rebuild P1) — the ledger's own
   *  header bar went with the cards': its fold control (▸/▾), play button and ＋ were part of
   *  that bar. `ledgerFold`/`toggleFold` are left in place, dormant, rather than chased down. */
  function ledgerHeading(lane: "do" | "hk" | "nt", id: string, label: string, count: number) {
    return <span id={id}><SectionHead cls={lane} label={label} count={count} /></span>;
  }
  function renderLedger() {
    return (
      <div className="tdb-runsheet">
        {doSorted.length > 0 && (
          <section className="tdb-lsec p">
            {ledgerHeading("do", "tdb-lane-do", "Urgent", active ? doSorted.length : tiles.urgent)}
            <div className="tdb-rows">{doSorted.map((c) => runRow(c, "do"))}</div>
          </section>
        )}
        {(vGroups.length > 0 || vStale.length > 0) && (
          <section className="tdb-lsec l">
            {ledgerHeading("hk", "tdb-lane-hk", "Housekeeping", active ? hkGapCount(vGroups) + vStale.length : tiles.housekeeping)}
            <div className="tdb-rows">{hkTop.map((r) => (r.kind === "group" ? runBatchRow(r.g) : runRow(r.c, "hk")))}</div>
          </section>
        )}
        {/* detail P3 — the ☰ view keeps Notes to self even when EMPTY (parity with the cards'
            lane): the dashed add-row invites, wired to the same addTask. The lane still hides
            under an active narrow with no matches, exactly as the cards view hides its lanes. */}
        {(!active || vNt.length > 0) && (
          <section className="tdb-lsec n">
            {ledgerHeading("nt", "tdb-lane-nt", "Notes to self", active ? vNt.length : tiles.notes)}
            {vNt.length > 0 ? (
              <div className="tdb-rows">
                {composerAt === "ledger" && renderComposer()}
                {vNt.map((c) => runRow(c, "nt"))}
              </div>
            ) : composerAt === "ledger" ? renderComposer() : (
              <button type="button" className="tdb-laddrow" onClick={addTask}>＋ Add a note</button>
            )}
          </section>
        )}
      </div>
    );
  }

  // (the hover ✓/⏸ quick rail and its pause helper are retired — the card contract's verb row,
  // the ledger's head checkbox + "Snooze or dismiss" menu, and the undo toast are the quick surfaces.)

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

  // ── THE CARD CONTRACT (Deck v2 laws; labels realigned by toolbelt P2) — band = identity +
  // status only (tag, the sage ✓ TODAY chip); body = content only; CLICK ANYWHERE opens (unit →
  // the journey sheet); hover (~150ms intent, 180ms ease) grows the STACK downward as an
  // overlay — the reel never reflows: Action now · ＋/− Today's list · the clock Snooze menu
  // (tomorrow / a week / don't-show-these — the per-type hide, restorable in Task settings;
  // offers keep no hide — the locked row). One grammar with the ledger, via VERB_LABELS. ──
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
        <button type="button" className="tdb-btnh" aria-haspopup="menu" aria-expanded={laterKey === c.key} onClick={(e) => { e.stopPropagation(); setLaterKey((k) => (k === c.key ? null : c.key)); }}><ClockGlyph />{VERB_LABELS.later}</button>
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
  // toolbelt P2 — the cards adopt the ledger's phrases: the expansion stacks the three
  // full-width rows (single-surface mechanics untouched; rest state untouched). The tick verb left
  // the card verbs with the parity — the quickDone pathway stands at its other surfaces
  // (the ledger's head checkbox, Today's tick).
  function cardVerbs(c: BoardCard, hov: boolean) {
    const committed = onList(c);
    return (
      <div className="tdb-vwrap" aria-hidden={!hov}>
        <div className="tdb-vinner">
          <div className="tdb-vstack" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="tdb-btnh em" onClick={() => openFlowCards([c])}>{VERB_LABELS.action}</button>
            <button type="button" className="tdb-btnh" onClick={() => toggleToday(c)}>{committed ? VERB_LABELS.todayRemove : VERB_LABELS.todayAdd}</button>
            {laterMenu(c)}
          </div>
        </div>
      </div>
    );
  }
  // ── full-detail lane card (the contract): band tag (+ ✓ TODAY chip) over title + manuscript. ──
  function renderCard(c: BoardCard, gin = false) {
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
      <div key={c.key} data-tdbkey={c.key} className={`tdb-cell${gin ? " gin" : ""}`}>
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

  // ── the BATCH card (the contract): flat, hairline, count headline + roundels; click anywhere
  // opens the Batch-fix sheet; the hover stack = Action now · the clock Snooze menu (Today's
  // list omitted: groups are not committable — the existing Today primitive is per-card). ──
  // ── grouping P1 — THE GROUP BAR (todo-grouping.html §1): expanding replaces the batch
  // card with a slim full-span bar that OWNS the Collapse control; the members flow beneath
  // as standard unit cards rendered from the batch's OWN member derivation (g.members[].card
  // — never a second query path). The first GROUP_PAGE render; a dashed cell pages in the
  // rest. The fragment sits at the batch's map position, so following cards flow after. ──
  function renderGroupExpanded(g: HkGroup) {
    const copy = G3_COPY[g.rule] ?? { rest: () => ` ${g.meta.label.toLowerCase()}`, sub: "" };
    const members = groupMembers(g);
    const paged = pagedGroups[g.rule] ? members : members.slice(0, GROUP_PAGE);
    const remaining = members.length - paged.length;
    return (
      <React.Fragment key={g.rule}>
        <div className="tdb-gbar">
          <span className="tdb-gbart">{g.members.length}{copy.rest(g.members.length)}</span>
          <span className="tdb-gbarn">{groupShowing(g, members.length)}</span>
          <button type="button" className="tdb-btnh em tdb-gcol" onClick={() => toggleGroup(g.rule)}>Collapse ▴</button>
        </div>
        {paged.map((m) => renderCard(m.card, true))}
        {remaining > 0 && (
          <button type="button" className="tdb-gpage" onClick={() => setPagedGroups((p) => ({ ...p, [g.rule]: true }))}>+ {remaining} more…</button>
        )}
      </React.Fragment>
    );
  }
  function renderGroupCard(g: HkGroup) {
    // grouping P3 — a group of one renders as its UNIT (no batch card, no Expand affordance)
    if (g.members.length === 1) return renderCard(g.members[0].card);
    const key = `group-${g.rule}`;
    const ov = overlays[key];
    if (ov?.kind === "fork") {
      return (
        <div key={g.rule} className="tdb-gcard">
          <div className="tdb-frame">{renderFork(key, false, { notNow: () => forkNotNowGroup(g), neverThis: () => forkNeverThese(g), neverRule: () => forkNeverRule(g) })}</div>
        </div>
      );
    }
    if (openGroups[g.rule]) return renderGroupExpanded(g);
    const faces = g.members.slice(0, 4);
    const copy = G3_COPY[g.rule] ?? { rest: () => ` ${g.meta.label.toLowerCase()}`, sub: "" };
    const prog = hkGroupProgress(agents.length, g.members.length);
    const hov = verbKey === key;
    return (
      <div key={g.rule} className={`tdb-cell b${recentG === g.rule ? " gin" : ""}`}>
        <div className={`tdb-gcard${hov ? " hov" : ""}`}
          onClick={() => setFlow({ items: [{ kind: "group", group: g }] })}
          onMouseEnter={() => armVerbs(key)} onMouseLeave={disarmVerbs}
          onFocus={() => armVerbs(key)} onBlur={disarmVerbs}
          role="button" aria-expanded={hov} tabIndex={0}
          onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); setFlow({ items: [{ kind: "group", group: g }] }); } }}>
          <div className="tdb-band hk">
            <span className="tdb-tag due">{g.meta.label.toUpperCase()}</span>
          </div>
          {/* v4 P4 — the RESTING batch body is trimmed to the unit card's height: band + count
              headline + roundels. The description + progress move into the hover expansion. */}
          <div className="tdb-body">
            <div className="tdb-gtt"><span className="tdb-gn">{g.members.length}</span>{copy.rest(g.members.length)}</div>
            <div className="tdb-avs">
              {faces.map((m) => <span key={m.card.key} title={m.agentName}>{m.card.initials}</span>)}
              {g.members.length > faces.length && <i>+{g.members.length - faces.length}</i>}
            </div>
            {/* grouping P1 — the one rest affordance (below the roundels, above the hover
                verb area; it replaces neither the hover expansion nor Action now) */}
            <button type="button" className="tdb-gxp" onClick={(e) => { e.stopPropagation(); toggleGroup(g.rule); }}>Expand {g.members.length} ▾</button>
          </div>
          <div className="tdb-vwrap" aria-hidden={!hov}>
            <div className="tdb-vinner">
              <div className="tdb-gdetail">
                <div className="tdb-gsub">{copy.sub}</div>
                <div className="tdb-gprog">
                  <div className="tdb-pbar"><i style={{ width: `${prog.pct}%` }} /></div>
                  <div className="tdb-pcap"><span>{prog.caption}</span><span>{prog.pct}%</span></div>
                </div>
              </div>
              <div className="tdb-vstack" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="tdb-btnh em" onClick={() => setFlow({ items: [{ kind: "group", group: g }] })}>{VERB_LABELS.action}</button>
                <span className="tdb-latwrap">
                  <button type="button" className="tdb-btnh" aria-haspopup="menu" aria-expanded={laterKey === key} onClick={(e) => { e.stopPropagation(); setLaterKey((k) => (k === key ? null : key)); }}><ClockGlyph />{VERB_LABELS.later}</button>
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
