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
import { Funnel, Pin, ChevronRight, X } from "lucide-react";
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
import { WriteErrorCode, classifyWriteError, saveErrorCopy } from "../../lib/todoWrite";
import { groupHousekeeping, hkGapCount, hkGroupProgress, HkGroup, HkRule, HK_RULES, laterHideKey } from "../../lib/todoHousekeeping";
import { deskState, liveQueryCount, liveQueriesLine, clearedListCap } from "../../lib/todoEmpty";
import { sortLedgerDo, sortLedgerHk } from "../../lib/todoLedger";
// VI P2 — the review cup (original ScriptAlly artwork; currentColor → inlined so it inherits ink)
import reviewCupRaw from "../../assets/todo/review-cup.svg?raw";
import { useConfirmAsk } from "./ConfirmAsk";
import { HeroSession } from "./FocusedSession";
import { RITUAL_LINES, progressPct } from "../../lib/sessionStage";
import { TodoFilterState, DEFAULT_FILTERS, filtersActive, matchesSearch, groupMatchesSearch, visibleDoCard, visibleStaleCard, visibleNoteCard, visibleGroup, filterCounts, isResting, togglePill, FilterType } from "../../lib/todoFilters";
import { shouldAutoRunTour } from "../../lib/todoTour";
/* ⚠️ `AssistantBand` IS NO LONGER IMPORTED (fix pack, 10 Aug) — it is unmounted from this page.
   The MODAL is still reachable, so `AssistantModal` stays; the component and its file survive
   untouched for whoever re-places the band (units first — see reports/STATE.md). */
import { AssistantModal, AssistantTaskRow } from "./AssistantPromo";
import { TodoTour } from "./TodoTour";
import { ActivityType, QueryStatus, SurfaceOffset } from "../../types";
import { BrandDatePicker } from "../forms";
import { FocusFlow, FocusItem } from "./FocusFlow";
import { TaskSettingsSheet } from "./TaskSettingsSheet";
import {
  TODO_OPEN_COMPOSER, TODO_OPEN_TASK_SETTINGS, TODO_WORK_THE_LIST, TODO_ADD_TO_TODAY,
} from "../../lib/todoRoutes";
/* ⚠️ THE FOUR-COLUMN BOARD IS RETIRED AS THIS PAGE'S BODY (tasks-consolidation P2). `TodoBoard`
   and `TodoSideContainer` are no longer mounted here — the ranked order of ONE list is the plan,
   so a column asking where a card belongs, and a FILTERS facet asking what kind it is, are both
   answered by the groups themselves. Neither component is deleted in this phase (the house rule
   on orphans: flag, then sweep in a commit of its own). */
import { TaskList } from "./TaskList";
import { TasksPageLayout, TplGrow, TplZone } from "./TasksPageLayout";
import { ArtSlot } from "./ArtSlot";
import { TodoDock, DockTimelineEvent } from "./TodoDock";
import { assembleBoardColumns, isSweepCard, DropPlan, dropPlan, TodoColumnId, liveBoardCards } from "../../lib/todoColumns";
import { MenuLeaf } from "../../lib/todoMenu";
import { TagPicker } from "./TagPicker";
import { useTagWrites } from "./useTagWrites";
import { todoPrefs } from "../../lib/todoPrefs";
/* `toggleTagSel` still serves the COMPOSER's draft (tags are untouched by the sidebar's
   retirement — only the tag NARROWING went with it); `matchesTags` had no reader left. */
import { tagUsageCounts, toggleTagSel, matchesTags } from "../../lib/todoTags";
import { TagDef } from "../../types";
import { dockQueue, dockFlowKind, nextInQueue, resolveDocked, SendSpec } from "../../lib/todoDock";
/* ⚠️ THE DECISIONS BEHIND completion, snooze and dock entry live in lib/todoActions now — this
   page performs them, it no longer decides them (tasks-consolidation, extraction commit). */
import { clampSnooze, cardLane, snoozeVia, completionVia, snoozeDateLabel } from "../../lib/todoActions";
import { focusesSearch, isTypingTarget } from "../../lib/taskShortcuts";
import { activityEventLabel } from "../../lib/activityEvent";
import { STAGE_SCROLL_ID } from "../../lib/stageScroll";
import {
  TODO_SORTS, DEFAULT_TODO_SORT, TodoSortId, sortBoardCards,
} from "../../lib/todoBoardSort";
/* THE CONSOLIDATED PAGE'S OWN DERIVATIONS — groups, stat chips and the eyebrow, all pure and
   locked away from this component (tasks-consolidation P2). */
import { taskGroups, taskStats, tasksEyebrow, railChips, chipGroups, chipMatchesCard, RailChipId } from "../../lib/todoGroups";
import { paneRestLine, showingLine, tasksCsv } from "../../lib/todoHandoff";
import { isTerminalStatus } from "../../lib/agentList";
import { estimateTotal } from "../../lib/todoEstimate";
import { longDate } from "../../lib/dashboardStats";
import {
  TODO_GROUPS, HOUSEKEEPING_FOLD, foldRows, snoozedCount, returnedToday, returnedChipLabel, isSnoozed,
} from "../../lib/todoListPage";
import { ToastAction, useTodoToast } from "./useTodoToast";
import "./todo.css";
import "./todoGroups.css";
import "./todoSplit.css";
/* the tag filter’s trigger + menu — the SHARED control, one home (see taskChrome.css) */
import "./taskChrome.css";
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
  cls: string; // "do" | "hk" | "nt" — kept for the Lane ids; the heading itself is family-neutral now
  label: string;
  count: number;
  /** Deck v2: when the deck narrows this section, the heading appends "x OF y · FILTERED". */
  filtered?: { x: number; y: number; showAll: () => void } | null;
}> = ({ label, count, filtered }) => (
  // the tightening P1 — ONE line: Playfair label · mono count · a hairline filling the remaining
  // width. The separate family-stub rule beneath is retired; the filtered note sits past the rule.
  <div className="tdb-sec">
    <h2>{label}</h2>
    <span className="tdb-cn">{count}</span>
    <span className="tdb-secrule" aria-hidden />
    {filtered && (
      <span className="tdb-secfilt">
        {filtered.x} OF {filtered.y} · FILTERED · <button type="button" onClick={filtered.showAll}>SHOW ALL</button>
      </span>
    )}
  </div>
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

/* ⚠️ THE TOAST MOVED OUT (extraction E1) — useTodoToast, so the four To-do pages share ONE
   takeback window. Four page-local toasts could all be open at once, each with its own timer and
   an Undo that reversed whichever you happened to click. The type comes with it. */

export const ToDoPage: React.FC<ToDoPageProps> = ({ onNavigate }) => {
  const {
    tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, currentUser, collectionsReady,
    addUserTask, updateUserTask, deleteUserTask, upsertTaskFlag, updateUserProfile,
    recordMaterialsSent, logNudge, dismissTask, undoQueryStatus, updateQueryStatus, deleteActivity, resolveTaskFlag, updateAgent,
  } = useScriptAllyDb();
  const { toast, flash, dismiss: dismissToast, pause: pauseToast, resume: resumeToast, remember: rememberUndo, recall: recallUndo } = useTodoToast();
  const { ask: confirmAsk, node: confirmAskNode } = useConfirmAsk();
  // hero-pair P4 — the inline note composer's seat + draft (one composer, two view seats)
  const [composerAt, setComposerAt] = useState<null | "cards" | "ledger">(null);
  // notes-and-tasks P1 — the composer's NATURE: a note (dateless, pinned) or a task (dated).
  // The seat's view ("cards"/"ledger") and the nature are orthogonal; the nature drives the
  // Phase-2 live transformation. The section's "Write a note" opens note mode.
  const [composerMode, setComposerMode] = useState<"note" | "task">("note");
  const [composerDraft, setComposerDraft] = useState("");       // the title (required)
  const [composerDetail, setComposerDetail] = useState("");     // the optional detail line
  const [composerDate, setComposerDate] = useState("");         // task only — ISO "YYYY-MM-DD"
  const [composerSurface, setComposerSurface] = useState<SurfaceOffset>("on-day"); // task only
  const [composerTags, setComposerTags] = useState<string[]>([]); // tasks-pages P5 — the draft's tags
  /* board fixes II P1 — EDIT MODE: the ⋯ menu's "Edit the task…" opens the SAME composer seeded
     from the card, and save routes to `updateUserTask` on this id instead of a create. One
     surface, two verbs — a second edit sheet would be a second copy of every field rule here. */
  const [composerEdit, setComposerEdit] = useState<string | null>(null); // the UserTask id under edit
  // save-and-today P1 — THE SAVE STATE MACHINE: idle → pending → (saved | failed). A denied/dropped
  // write must fail VISIBLY (never a silent close), and the optimistic insert must not flicker — so
  // the in-flight id is hidden from the board until the write resolves.
  const [saveState, setSaveState] = useState<"idle" | "pending" | "failed">("idle");
  const [saveError, setSaveError] = useState<WriteErrorCode | null>(null);
  const [pendingSaveId, setPendingSaveId] = useState<string | null>(null); // the in-flight create, hidden until resolved
  const [saveSlow, setSaveSlow] = useState(false); // the quiet inline spinner, only past ~300ms
  const savePending = saveState === "pending";
  // dirty = any field carries content; an outside click / Esc only prompts to discard when dirty.
  const composerDirty = !!(composerDraft.trim() || composerDetail.trim() || composerDate);
  const composerDirtyRef = useRef(composerDirty);
  composerDirtyRef.current = composerDirty;
  useEffect(() => {
    if (!composerAt) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && t.closest(".tdb-nc")) return;
      // outside: cancel only when empty — a live draft stays open (never silently discarded)
      if (!composerDirtyRef.current) setComposerAt(null);
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
  /* (showDone was the corner panel's done-row toggle — retired with it in workspace P3.) */
  // ── workbench shell state. View is a DEVICE UI pref → the sa. localStorage convention.
  // (Deck v2 P3: the sidebar fold + its localStorage key retired with the pair — the rail never
  // folds; <1420 it becomes the 56px icon rail instead, P5.)
  /* Phase 2 — the housekeeping fold and the snoozed band. Both are VIEW state and deliberately
     session-only: a fold you left open a week ago is not a preference, and a snoozed band that
     remembered being open would greet you with the things you had put away. */
  const [hkExpanded, setHkExpanded] = useState(false);
  /* THE LISTS FILTER (corrections fix 3) — the side container's facets, which replace the retired
     chip strip. Session-only: a narrowing you left behind last week is not a preference. */
  /* THE PAGE-LEVEL NARROWINGS (board+dock P1/P2). Both are session-only: a sort or a filter you
     left behind last week is not a preference, and arriving at a board that is silently showing
     you a third of itself is the worst way to learn you had set one. */
  const [sort, setSort] = useState<TodoSortId>(DEFAULT_TODO_SORT);
  const [sortOpen, setSortOpen] = useState(false);
  /* ⚠️ THE FILTERS FACET IS RETIRED WITH THE SIDEBAR (tasks-consolidation P2), AND THE TAG
     NARROWING CAME BACK (P2 follow-up, Nick's call). The facet asked "what KIND of thing is
     this" — the question the five groups now answer permanently and in the open, so a control
     that narrowed to one kind was a way of hiding four. A TAG is a different question entirely:
     it is the writer's own axis, it exists app-wide, and a page that cannot filter by one is a
     dead end. It returns as the Noteboard's OWN control — `#All ▾`, single-select, the same
     `.cal-nav` + `.cal-viewmenu` grammar — because two tag filters that looked different would
     be two things to learn. */
  const [tagSel, setTagSel] = useState<string | null>(null);
  const [tagOpen, setTagOpen] = useState(false);
  const [tagsFor, setTagsFor] = useState<BoardCard | null>(null);
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
      /* ⚠️ THE ZONE IS THE SCROLLER NOW, NOT THE WRAP (tasks-viewport P1). Under the viewport
         lock the wrap is `overflow: hidden`, so its scrollTop is permanently 0 — reading it here
         would have restored every collapse to the top of the board, silently. */
      if (open) batchScroll.current[rule] = zoneRef.current?.scrollTop ?? 0;
      else if (zoneRef.current) zoneRef.current.scrollTop = batchScroll.current[rule] ?? zoneRef.current.scrollTop;
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
  /* ⚠️ THE RAIL'S ONE NARROWING BESIDE THE SEARCH (Phase 4) — a single-select chip, session-only.
     It is deliberately NOT `todoFilters`' seven-type state: that model was built for a retired
     sidebar, narrows nothing the rail draws, and a chip strip in a third vocabulary beside the
     group headings would file one card under two names. */
  const [chip, setChip] = useState<RailChipId>("all");
  // Drawer filters (Phase 4) — session-only; all-visible defaults (hiding is the writer's act).
  const [filters, setFilters] = useState<TodoFilterState>(DEFAULT_FILTERS);
  const filtersRef = useRef<TodoFilterState>(DEFAULT_FILTERS);
  filtersRef.current = filters;
  const searchRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  /* the board's scrollzone — the scroll-restore contract's element under the viewport lock */
  const zoneRef = useRef<HTMLDivElement>(null);
  /* ⚠️ SEARCH IS REACHABLE FROM ANYWHERE ON THE PAGE, AND THAT MATTERS MORE SINCE THE HEADINGS
     STARTED STICKING. The listener is on `window`, not on the field or the tool row, so it fires
     wherever focus happens to be — deep in the list, on a verb button, on nothing at all.
     (The tool row itself does NOT scroll away: it lives in `TasksPageLayout`'s fixed header block
     and only `.tpl-zone` scrolls. The shortcuts are for reach, not for rescue.)
     `offsetParent === null` is the visibility guard — the Tasks slots stay MOUNTED under
     `display: none`, so without it a hidden page would steal the key from the visible one. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      /* ⚠️ `/` IS NEW (9 Aug) — it was never bound on this page, or anywhere in live code. The
         DECISION lives in `lib/taskShortcuts` because its two easy mistakes (firing while you
         type, firing under a modifier that means something else) are invisible to a source-string
         test; the page performs, it does not decide. */
      if (!focusesSearch(e, isTypingTarget(e.target))) return;
      if (!wrapRef.current || wrapRef.current.offsetParent === null) return; // page not visible
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
  /* ⚠️ THE ONE DERIVATION (tasks-pages P2): assemble → groups → sweeps → columns, through the
     SAME assembleBoardColumns every Tasks surface and the sidebar badge use — identically scoped,
     so no two counts can disagree again. save-and-today P1's in-flight hide rides the input
     (hiddenUserTaskId); the Sunday CARD's mutedTaskRules dep is unchanged. */
  const assembled = useMemo(
    () => assembleBoardColumns({
      tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, today, now,
      mutedTaskRules: currentUser?.mutedTaskRules, hiddenUserTaskId: pendingSaveId,
    }),
    // now/today are session-stable enough; recomputing on the data arrays is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, userTasks, pendingSaveId, queries, agents, manuscripts, taskFlags, today, currentUser?.mutedTaskRules],
  );
  const board = assembled.board;
  const hkGroups = assembled.hkGroups;
  const staleCards = useMemo(() => board.hk.filter((c) => c.taskType === "no_response_close"), [board.hk]);
  const mutedRules = (currentUser?.mutedTaskRules ?? []).filter((r): r is HkRule => r in HK_RULES);
  // ONE counts object read by BOTH the ribbon tiles and the lane headers (equality by construction).
  // Housekeeping = the gap count + the individual stale cards (12+9 gaps + 4 stale = 25), never piles.
  const tiles = ribbonTiles(board, hkGapCount(hkGroups) + staleCards.length);
  /* ⚠️ THE COLUMNS, HOISTED — AND CARDS ARE THE UNIT (board fixes II, P5). The page used to show
     THREE figures from THREE derivations in TWO units: the subtitle summed the tiles (members —
     every agent inside a sweep counted loose), the FILTERS panel counted the raw lanes (members
     again, snoozed invisible to it), and the columns drew collapsed sweeps plus a flags-built
     Snoozed. 42 / 27 / fourteen, all "correct" in their own unit, none describing the board.
     One derivation now: boardColumns is computed ONCE here, and the subtitle, the FILTERS counts
     and the rendered columns all read IT. A sweep is one card everywhere; its member figure
     appears only inside the card, as n-of-m. `tiles` survives for the desk state and the
     assistant band, whose subjects genuinely are items, not cards. */
  const boardCols = assembled.cols; // the same object the subtitle, FILTERS and badge read
  const userTags: TagDef[] = currentUser?.tags ?? [];
  const tagCounts = useMemo(() => tagUsageCounts(userTasks), [userTasks]);
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
    /* ⚠️ THE CEILING IS APPLIED IN lib/todoActions, NOT HERE (tasks-consolidation, extraction).
       It was an inline `if` in this function — which made this function the choke point, and a
       choke point inside a 2,000-line component about to be rebuilt is a coincidence rather than
       a guarantee. `clampSnooze` is the single clamp now; every path reaches it, and its ceilings
       are unit-tested away from this file. */
    ({ days, when } = clampSnooze(c, days, when));
    const lane = cardLane(c);
    const text = `Snoozed — back ${when}.`;
    if (snoozeVia(c) === "user-task-flag") {
      const key = { taskType: USER_TASK_FLAG_TYPE, queryId: c.userTaskId! };
      upsertTaskFlag(key, { snoozedUntil: new Date(Date.now() + days * 86400000).toISOString(), bumpSnooze: true });
      const undo = () => upsertTaskFlag(key, { snoozedUntil: null, unbumpSnooze: true }); // full restore, ×n included
      setOverlay(c.key, { kind: "dismissed", lane, text, undo });
      flash(`Snoozed until ${snoozeDateLabel(days)}`, { label: "Undo", fn: async () => { await undo(); clearOverlay(c.key); flash("Restored"); } });
      return;
    }
    if (snoozeVia(c) !== "dismiss-task") return;
    dismissTask(c.taskType!, c.relatedRecordId!, "fixed snooze", days);
    const key = flagKeyForTask(c.taskType, c.relatedRecordId);
    const undo = () => upsertTaskFlag(key, { snoozedUntil: null, unbumpSnooze: true }); // full restore, ×n included
    setOverlay(c.key, { kind: "dismissed", lane, text, undo });
    flash(`Snoozed until ${snoozeDateLabel(days)}`, { label: "Undo", fn: async () => { await undo(); clearOverlay(c.key); flash("Restored"); } });
  }
  function snoozeGroup(g: HkGroup, days: number, when: string) {
    g.members.forEach((m) => m.agentId && dismissTask("data_quality_poor", m.agentId, "fixed snooze", days));
    const undo = async () => { g.members.forEach((m) => m.agentId && upsertTaskFlag(flagKeyForTask("data_quality_poor", m.agentId), { snoozedUntil: null, unbumpSnooze: true })); };
    const gkey = `group-${g.rule}`;
    setOverlay(gkey, { kind: "dismissed", lane: "hk", text: `Snoozed — back ${when}.`, undo });
    flash(`Snoozed until ${snoozeDateLabel(days)}`, { label: "Undo", fn: async () => { await undo(); clearOverlay(gkey); flash("Restored"); } });
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
  /* (`active` and `anyVisible` are DELETED with the body branch they served — Phase 4. They
     answered "is a narrowing hiding everything" over four `v*` sets built with a filter model the
     rail never read; `railEmpty` asks the array the rail actually draws. The `v*` sets themselves
     survive: the ledger's sorts and `shownX` still read them.) */
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
  /**
   * ⚠️ THE PANE HOLDS A SELECTION, NOT A LIST (rail + workspace, Phase 5). It used to store its
   * own `queue` snapshot taken at open time — harmless while the dock REPLACED the list, and a
   * live divergence the moment the rail stood beside it: snooze from the rail and the card left
   * the rail while the pane's stack kept showing it and kept counting it.
   *
   * Two lists that can disagree about what is outstanding is the same failure as two writers of
   * query status, and it takes the same answer. The queue is DERIVED at render from
   * `dockAllCards()`; the state is one key.
   *
   * The board's scroll position is remembered because closing must put you back where you were,
   * not at the top of a list you had scrolled halfway down.
   */
  const [dockKey, setDockKey] = useState<string | null>(null);
  /* ⚠️ A RECOVERY HINT, NEVER THE SOURCE OF TRUTH — `resolveDocked` carries the reasoning. A ref
     rather than state because it must not itself cause a render: it is written in passing while
     resolving, and read only when the key it accompanied has gone. */
  const dockPos = useRef(0);
  /* ⚠️ THE LAST CARD THE PANE SHOWED — view memory for the HOLD, never a second list. It is one
     card, it is only read when a narrowing has emptied the rail, and nothing derives from it. */
  const heldCard = useRef<BoardCard | null>(null);
  const boardScroll = useRef(0);

  /**
   * ⚠️ THE ONE LIST, DERIVED — read by the rail, the pane, the arrows and the forward look alike.
   * `dockAllCards()` is the narrowing already applied to the list, so what you work through is
   * exactly what you were looking at; `dockQueue` drops notes and finished work, which are not
   * things to work through.
   *
   * (Placed here rather than beside its consumers on purpose: every value it closes over —
   * `board`, `search`, `sctx`, `tagSel`, `sort` — is initialised above this line. `dockAllCards`
   * is a hoisted `function`, so it is callable here; its CLOSURE is what would have thrown, which
   * is the TDZ trap this file has been bitten by before.)
   */
  const allDockable = dockQueue(dockAllCards());
  /* the chip narrows the SAME list the rail draws, so the pane walks exactly what you can see */
  const dockable = allDockable.filter((c) => chipMatchesCard(chip, c));
  /* ⚠️ THE REF IS WRITTEN DURING RENDER, and that is safe because it is idempotent: the value is
     a pure function of this render's own inputs, so a repeated render writes the same number. */
  const docked = resolveDocked(dockable, dockKey, dockPos.current);
  if (docked.card) { dockPos.current = docked.pos; heldCard.current = docked.card; }

  /**
   * ⚠️ THE PANE HOLDS WHEN A NARROWING EMPTIES THE RAIL — it does not clear (Phase 4). Emptying
   * the pane because a search box narrowed is the worst thing this page could do: you filtered to
   * find something else, not to abandon what you were doing. So a rail with nothing in it and a
   * pane still showing your card is the CORRECT pair, and clearing the search brings the rail back
   * around it.
   *
   * ⚠️ THE PANE CLOSES ONLY WHEN THERE IS NO WORK AT ALL — `allDockable`, unnarrowed. That is the
   * one distinction that matters: an empty rail because you filtered is a view, an empty rail
   * because you finished is a fact, and the two must not look the same.
   */
  const paneCard = docked.card ?? (allDockable.length > 0 ? heldCard.current : null);

  /**
   * ⚠️ THE KEY FOLLOWS THE RESOLUTION, or the rail would mark nothing while the pane showed
   * something. `resolveDocked` already answers which card is on screen; this writes that answer
   * back so `selectedKey` and the pane cannot name different cards.
   *
   * ⚠️ AND A NARROWING CHANGE GOES TO THE FIRST MATCH, NOT TO THE REMEMBERED POSITION. The two
   * causes are genuinely different: a WRITE removes one card from a set you are still in, so the
   * position you held is meaningful and `resolveDocked` clamps to it; a FILTER replaces the whole
   * set, where a position carries no meaning at all and the first match is the only predictable
   * answer. Distinguished by the narrowing's own signature rather than guessed at.
   *
   * The signatures are the deps rather than the arrays: a fresh array every render would fire this
   * on every render, and what matters is whether the MEMBERSHIP or the NARROWING changed.
   */
  /* ⚠️ THE RAIL'S EMPTINESS IS READ FROM THE LIST IT DRAWS, not from a parallel predicate. It
     used to be `active && !anyVisible`, computed over four `v*` sets built with a DIFFERENT
     filter model from the one the rail rendered — two derivations of "is there anything here",
     which could answer differently. This is the same array the rail maps over. */
  /**
   * ⚠️ THE PANE IS NEVER PROVISIONALLY EMPTY (Phase 5). On arrival it takes the FIRST open card in
   * the current filter, so the workspace is doing its job before you touch anything — a blank
   * right-hand column beside a full rail is a page that looks broken rather than ready.
   *
   * ⚠️ ONCE, AND ONLY WHILE NOTHING IS CHOSEN. It fires on the transition from "no selection" to
   * "there is work", not on every render with a null key — otherwise closing the pane deliberately
   * would re-open it on the next frame, which is a control that refuses to be used.
   */
  const restedOnce = useRef(false);
  useEffect(() => {
    if (dockKey || dockable.length === 0) return;
    if (restedOnce.current) return;
    restedOnce.current = true;
    dockPos.current = 0;
    setDockKey(dockable[0].key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dockable.length, dockKey]);

  const dockSig = dockable.map((c) => c.key).join("|");
  const narrowSig = `${chip}|${search.trim().toLowerCase()}|${tagSel ?? ""}`;
  const lastNarrowSig = useRef(narrowSig);
  useEffect(() => {
    const narrowed = lastNarrowSig.current !== narrowSig;
    lastNarrowSig.current = narrowSig;
    if (!dockKey) return;
    if (allDockable.length === 0) { setDockKey(null); return; }  // nothing left anywhere — close
    if (dockable.length === 0) return;                           // narrowed to nothing — HOLD
    if (dockable.some((c) => c.key === dockKey)) return;         // still on screen
    setDockKey(narrowed ? dockable[0].key : (docked.card?.key ?? dockable[0].key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dockSig, dockKey, narrowSig, allDockable.length]);

  /** Clearing the narrowing is one act, whichever half of it is set. */
  const clearNarrowing = () => { setSearch(""); setChip("all"); };

  /** What the rail is showing — the groups it draws, flattened. One derivation, two readers. */
  function railShown(): number {
    return railGroups().reduce((n, g) => n + g.cards.length, 0);
  }

  /**
   * ⚠️ THE EXPORT WRITES WHAT THE RAIL SHOWS, which is what the count beside it states. Every
   * column is a value the row already renders — nothing is re-derived for the file, so a CSV
   * cannot disagree with the list it came from.
   */
  function exportRail() {
    /* ⚠️ EVERY COLUMN IS A VALUE THE ROW ALREADY RENDERS — nothing is re-derived for the file, so
       a CSV cannot disagree with the list it came from. (Phase 2 repoints `bucket` and `deed` at
       the bucket derivations when they exist; the fields it reads today are the ones the row
       reads today, which is the same rule.) */
    const rows = railGroups().flatMap((g) => g.cards.map((c) => ({
      bucket: c.kind ?? "",
      deed: c.title,
      agent: c.who ?? "",
      agency: c.record ?? "",
      figureLabel: g.label,
      figure: c.due ?? "",
    })));
    const blob = new Blob([tasksCsv(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", "scriptally-tasks.csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // the inverses the undo toast already carries, kept by card key so the session's REDO can
  // offer "Undo handled" on a card it stamped (see doneToast — no parallel undo store)
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

  /* (The corner pop-up and ALL its state went in workspace P3 — todayActive / todayShown /
     todayLeaving / todayMin, the slide effect and the help-FAB clearance. Today is a route now,
     and the only reason any of this existed was to float a copy of it over this page.) */

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
    window.addEventListener(TODO_OPEN_TASK_SETTINGS, onOpen);
    return () => window.removeEventListener(TODO_OPEN_TASK_SETTINGS, onOpen);
  }, []);
  /* ⚠️ THE BAR'S ＋ New, ON A TO-DO PAGE (Phase 1) — the same window-event pattern again. It opens
     THIS composer rather than a second create surface, in TASK mode (audit item 7: one verb per
     control; the page's own pink action is the one that lets you choose). The shell announces and
     the page opens, so the chrome never has to learn what a composer is. */
  useEffect(() => {
    const onCompose = () => { setComposerMode("task"); setComposerAt("ledger"); };
    window.addEventListener(TODO_OPEN_COMPOSER, onCompose);
    return () => window.removeEventListener(TODO_OPEN_COMPOSER, onCompose);
  }, []);

  /* ⚠️ THE TODAY PAGE ANNOUNCES; THIS PAGE ANSWERS (workspace P3). Its two controls need verbs
     that live here — the focused session and the commit primitive — and the alternative was to
     host a second copy of each on that page, which is how two surfaces start disagreeing about
     what is on today's list. Both listeners call the EXISTING functions, unchanged.

     This works because the To-do slots stay mounted (StagePage toggles display, it does not
     unmount), so a sibling Tasks route has this page alive beside it. That is a real dependency,
     so it is stated here rather than left to be discovered. */
  useEffect(() => {
    /* ⚠️ "Work the list" opens THE SAME DOCK, AND NOW ON THE SAME QUEUE (tasks-consolidation P2).
       It used to walk Today's committed subset; Today is retired, so "the list" means the one
       ranked list — `dockAllCards`, the narrowing respected. The listener survives as the
       cross-surface contract and the tool row's button is what calls it, so there is exactly one
       definition of what gets walked. */
    const onWork = () => openDock();
    const onAdd = (e: Event) => {
      const key = (e as CustomEvent<{ key?: string }>).detail?.key;
      const card = [...board.do, ...board.hk, ...board.nt].find((c) => c.key === key);
      if (card) toggleToday(card); // the cap + the flash come with it, exactly as on this page
    };
    window.addEventListener(TODO_WORK_THE_LIST, onWork);
    window.addEventListener(TODO_ADD_TO_TODAY, onAdd);
    return () => {
      window.removeEventListener(TODO_WORK_THE_LIST, onWork);
      window.removeEventListener(TODO_ADD_TO_TODAY, onAdd);
    };
  });
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
    rememberUndo(c.key, fn);
    flash(`Done — “${c.title}”`, { label: "Undo", fn });
  }

  /* (strikeThenDone + its strikeIds set went with the corner panel in workspace P3 — the
     strike-in-place was the PANEL's grammar, and its only reader was the panel's own row. The
     Today PAGE strikes its cleared items from the done set instead, which is derived, so the
     behaviour survives without a second piece of state to keep in step.) */
  async function quickDone(c: BoardCard) {
    const nowIso = new Date().toISOString();
    /* ⚠️ WHICH WRITE PATH A KIND TAKES IS `completionVia` (tasks-consolidation, extraction). It
       was an if-ladder here, so "which kinds can be ticked at all" was answerable only by reading
       this function to its end — and the row needs that answer BEFORE it draws a tick. */
    const via = completionVia(c);
    if (via === "none") return;
    if (via === "user-task") {
      // save-and-today P1 — ticking is a write like any other: it must not silently no-op. On a
      // denied/dropped write, surface a Try-again toast rather than the old unhandled throw.
      try {
        await updateUserTask(c.userTaskId, { done: true, completedAt: nowIso });
      } catch {
        flash("Couldn’t mark that done — try again?", { label: "Try again", fn: () => quickDone(c) });
        return;
      }
      const undo = () => updateUserTask(c.userTaskId!, { done: false });
      setOverlay(c.key, { kind: "receipt", lane: "nt", title: "Note done", line: `${c.title} — struck through on Today.`, undo });
      doneToast(c, async () => { await undo(); clearOverlay(c.key); flash("Restored"); });
      return;
    }
    const q = c.relatedRecordId ? queries.find((x) => x.id === c.relatedRecordId) : undefined;
    if (!q) return;
    if (via === "close-query") {
      const prev = q.status as QueryStatus;
      await updateQueryStatus(q.id, QueryStatus.NO_RESPONSE, "Closed as no response from the quick rail");
      const undo = () => undoQueryStatus(q.id, prev, QueryStatus.NO_RESPONSE);
      setOverlay(c.key, { kind: "receipt", lane: "hk", title: `${c.who || "Query"} — closed`, line: "Logged as no response — not a rejection, so your response rate stays honest." , undo });
      doneToast(c, async () => { await undo(); clearOverlay(c.key); flash("Restored"); });
      return;
    }
    if (via === "log-nudge") {
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
    flash(`Snoozed until ${snoozeDateLabel(7)}`, { label: "Undo", fn: async () => { await undo(); clearOverlay(key); flash("Restored"); } });
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
      /* the same formatter every other receipt uses — "next week" was right for a fixed 7 days
         and would still have been a second way of saying a date the app now states once */
      flash(`Snoozed until ${snoozeDateLabel(7)}`, { label: "Undo", fn: async () => { await snoozeUndo(); clearOverlay(c.key); flash("Restored"); } });
    } else {
      upsertTaskFlag(key, { snoozedUntil: MUTED_UNTIL });
      setOverlay(c.key, { kind: "dismissed", lane: "hk", text: "Muted — we won’t ask about this query again.", undo });
      flash(`Hidden — “${c.title}”`, { label: "Undo", fn: async () => { await undo(); clearOverlay(c.key); flash("Restored"); } });
    }
  }
  // hero-pair P4 — THE INLINE COMPOSER (todo-composer.html §4): the browser prompt was a
  // placeholder, not a design. addTask now opens the composer in the current view's Notes
  // seat; save wires to the SAME addUserTask action (no new write path).
  // notes-and-tasks P1/P2 — open the composer in a chosen NATURE, at the current view's seat,
  // on a clean draft.
  const resetSaveMachine = () => { setSaveState("idle"); setSaveError(null); setPendingSaveId(null); setSaveSlow(false); };
  const openComposer = (mode: "note" | "task") => {
    setComposerMode(mode);
    setComposerEdit(null);
    setComposerDraft("");
    setComposerDetail("");
    setComposerDate("");
    setComposerSurface("on-day");
    setComposerTags([]);
    resetSaveMachine();
    setComposerAt("cards"); // one view now (board+dock P1)
    /* ⚠️ THE LIST RETURNS TO ITS TOP AS THE COMPOSER OPENS. The composer mounts above the scroll
       zone; opening it from halfway down a long list otherwise leaves you typing into a card with
       an unrelated stretch of work under it. One frame later, so the card is in the DOM first. */
    requestAnimationFrame(() => { if (zoneRef.current) zoneRef.current.scrollTop = 0; });
  };
  /* board fixes II P1 — the ⋯ menu's Edit: the same composer, seeded from the card. The nature
     follows the card's own (a dated task edits as a task); clearing the date on save DOWNGRADES
     it to a note through the same update, which is the two-natures law applied to editing. */
  const openComposerEdit = (c: BoardCard) => {
    if (!c.userTaskId) return;
    setComposerMode(c.dueYmd ? "task" : "note");
    setComposerEdit(c.userTaskId);
    setComposerDraft(c.title);
    setComposerDetail(c.detail ?? "");
    setComposerDate(c.dueYmd ?? "");
    setComposerSurface(c.surfaceOffset ?? "on-day");
    setComposerTags(c.tags ?? []);
    resetSaveMachine();
    setComposerAt("cards");
  };
  const closeComposer = () => {
    setComposerAt(null);
    setComposerEdit(null);
    setComposerDraft("");
    setComposerDetail("");
    setComposerDate("");
    setComposerSurface("on-day");
    setComposerTags([]);
    resetSaveMachine();
  };
  // Esc / Cancel: confirm the discard ONLY when the draft carries content (no native dialog —
  // the styled useConfirmAsk). SUPPRESSED while a save is pending (fields are locked mid-write).
  async function tryCloseComposer() {
    if (savePending) return;
    if (composerDirty) {
      const ok = await confirmAsk("Discard this?", { confirmLabel: "Discard", cancelLabel: "Keep editing" });
      if (!ok) return;
    }
    closeComposer();
  }
  // The generic "add a note" affordances (the Notes section, the ledger add-row) open note mode;
  // the hero's "Add task or note" opens task mode.
  function addTask() { openComposer("note"); }
  // notes-gaps — DELETE a note/task. A note is deleted or edited, never ticked (the two-natures
  // law), so removal is the note's completion. Undo re-creates the SAME document id through the
  // existing addUserTask (no new write path); a failed delete surfaces Try again — the P1
  // no-silent-no-op rule applies to every write, not just the composer's.
  async function deleteUserNote(c: BoardCard) {
    if (!c.userTaskId) return;
    // Deleting is destructive and the ✕ sits on the card itself, so it ALWAYS asks first — an undo
    // toast is a safety net, not a substitute for consent. A task warns harder than a note: it
    // carries a date and may be committed to Today, so more is lost than a jotted line.
    const isTask = c.nature === "task";
    const ok = await confirmAsk(
      isTask
        ? `Delete “${c.title}”? This task and its date will be removed from your board${c.committed || c.surfaced ? " and from Today’s list" : ""}.`
        : `Delete “${c.title}”?`,
      { confirmLabel: isTask ? "Delete the task" : "Delete the note", cancelLabel: "Keep it" },
    );
    if (!ok) return;
    try {
      await deleteUserTask(c.userTaskId);
    } catch {
      flash("Couldn’t delete that — try again?", { label: "Try again", fn: () => deleteUserNote(c) });
      return;
    }
    flash(`Deleted — “${c.title}”`, {
      label: "Undo",
      fn: async () => {
        try {
          await addUserTask({ id: c.userTaskId, text: c.title, detail: c.detail, dueDate: c.dueYmd, surfaceOffset: c.surfaceOffset });
        } catch {
          flash("Couldn’t restore that — try again?", { label: "Try again", fn: () => undefined });
        }
      },
    });
  }
  const composerCanSave = !!composerDraft.trim() && (composerMode === "note" || !!composerDate);
  // save-and-today P1 — THE MACHINE. On save → PENDING (button disabled, fields read-only, Esc off,
  // the in-flight id hidden from the board so the optimistic insert never flickers). The write
  // RESOLVES → SAVED (unhide the settled item, close in place). It THROWS → FAILED (the composer
  // stays open with every character intact, editable again, an inline error + Try again).
  async function saveComposer() {
    if (!composerCanSave || savePending) return;
    const isTask = composerMode === "task";
    /* board fixes II P1 — the EDIT branch: same machine, same states, the update primitive
       instead of the create. Clears are explicit nulls (a task losing its date becomes a note);
       there is no pendingSaveId to hide because the doc already renders — a failed update leaves
       it exactly as it was, which is the honest outcome. */
    if (composerEdit) {
      setSaveState("pending");
      setSaveError(null);
      const slow = window.setTimeout(() => setSaveSlow(true), 300);
      try {
        await updateUserTask(composerEdit, {
          text: composerDraft.trim(),
          detail: composerDetail.trim() || null,
          dueDate: isTask && composerDate ? composerDate : null,
          surfaceOffset: isTask && composerDate && composerSurface !== "on-day" ? composerSurface : null,
          tags: composerTags.length ? composerTags : null, // P5 — the draft's tags land with the same save
        });
        window.clearTimeout(slow);
        closeComposer();
      } catch (e) {
        window.clearTimeout(slow);
        setSaveSlow(false);
        setSaveError(classifyWriteError(e));
        setSaveState("failed");
      }
      return;
    }
    const id = "task-" + Math.random().toString(36).slice(2, 11);
    setSaveState("pending");
    setSaveError(null);
    setPendingSaveId(id);
    const slow = window.setTimeout(() => setSaveSlow(true), 300);
    try {
      await addUserTask({
        id,
        text: composerDraft.trim(),
        detail: composerDetail.trim() || undefined,
        dueDate: isTask ? composerDate : undefined,
        surfaceOffset: isTask ? composerSurface : undefined,
        tags: composerTags.length ? composerTags : undefined, // P5
      });
      window.clearTimeout(slow);
      setPendingSaveId(null); // the settled item may now render
      closeComposer();
    } catch (e) {
      window.clearTimeout(slow);
      setSaveSlow(false);
      setPendingSaveId(null); // the optimistic insert rolled back — nothing left to hide
      setSaveError(classifyWriteError(e));
      setSaveState("failed");
    }
  }

  // Shell follow-up P3: the hardback-spine TodoShell is RETIRED — the v2 shell (rail, sidebar,
  // top bar) provides the chrome it drew. The page root keeps the `spine-root` class as the
  // token carrier for the two relocated survivors (the chip bench + the Pro sticker), whose
  // styles live on in the trimmed todoShell.css.
  /* ⚠️ NARROWED TO NOTHING — a RAIL fact, and the rail alone says it (Phase 4). Read from the
     groups the rail actually draws, so the message and the list cannot disagree. */
  const railEmpty = railGroups().length === 0;

  return (
    <div className="t-f12 spine-root">
      <div className="tdb-wrap today-off" ref={wrapRef}>
        {/* SHELL POLISH P1 — THE CENTRED COLUMN: the hero row and the panel live on ONE
            max-width column (~1360px), centred with equal side gutters that grow with the
            viewport. The title sits flush with the panel's left edge, the CTA/review pair flush
            with its right — one column, one pair of edges. A ≥44px gap sits under the bar. */}
        {/* ⚠️ THE ALIGNMENT CONTRACT (tasks-pages P1): one TasksPageLayout on every Tasks page —
            the header block (title → subtitle → tool row) spans the full content width, the
            hairline is the tool row's own bottom edge, and the sidebar + body start together
            BELOW it. This page's hand-assembled column (tdb-col → PageHeader → tdb-ws → tdw)
            is superseded by the shared grid. */}
        {/* ⚠️ THE MONO EYEBROW ARRIVES WITH THE CONSOLIDATION (P2) and the PROSE SUBTITLE LEAVES.
            The stat chips beneath the tool row state the same facts the subtitle used to — how
            much is outstanding and how much of it will not wait — so keeping both would be two
            statements of one derivation, which is precisely the fault the counting law exists to
            prevent. `boardFigures`/`boardSubtitleCopy` survive in `todoColumns`, unmounted.

            ⚠️ THE SIDEBAR IS GONE FROM THIS PAGE, so no Tasks page carries one. Task settings is
            still reachable (the Settings page's second door, tasks-viewport P5) and so is the
            Noteboard (its own nav row) — the sidebar's other two jobs. */}
        <TasksPageLayout
          title="To-do list"
          mark="todo"
          eyebrow={tasksEyebrow(longDate(new Date(now)), weekOfQuerying(queries, new Date(now)))}
          tools={renderTools()}
        >
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
              {/* ⚠️ ART · REVIEW-MASTHEAD (board-optimise P3) — the ONE place a header
                  illustration earns its keep, and the ref says why: the card is TEMPORARY and
                  celebratory. It is inside the briefing card, never the page header, and it
                  leaves with the card when the week is read or dismissed. */}
              <ArtSlot name="review-masthead" className="tdb-briefart" />
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
          {/* ⚠️ THE STANDALONE CONTROL BAR IS GONE (board+dock P1). Its search and the retired
              view toggle fold into the header's tool row, which is now the page's single
              instrument — one place to look for anything that changes what the list shows. Two
              instrument rows, one under the other, is how the chip strip and the LISTS rows came
              to disagree; this is the same mistake in a different arrangement. */}
          {/* ⚠️ THE STAT CHIPS ARE THE HEADER'S STATEMENT (P2) — four figures from the ONE
              derivation, each counting CARDS, which is the unit the groups and the sidebar badge
              both speak. They REPORT and never appraise: no "good day" verdict, no bar, and the
              estimate chip is simply absent when nothing carries an estimate rather than reading
              "0 min". "Outstanding" is deliberately not the sum of the panels below it — Snoozed
              is live work merely asleep, and Done is not outstanding at all. */}
          {!desk && (
            <div className="tdg-stats">
              {taskStats(boardCols, estimateTotal([...boardCols.todo, ...boardCols.today].map((c) => c.estimateMin)))
                .map((s) => (
                  <span key={s.label} className="tdg-stat">{s.label} <b>{s.value}</b></span>
                ))}
            </div>
          )}
          {/* ⚠️ `.tdb-board` IS DELETED, DIV AND RULE (scroll fix, 9 Aug) — and it was HALF THE BUG.
              It contributed `width: 100%; box-sizing: border-box` and nothing else, but it was a
              BLOCK sitting between `.tpl-body` and `.tpl-zone`. `.tpl-zone`'s `flex: 1;
              min-height: 0` therefore acted on nothing: the zone became a plain block at content
              height, its `overflow: auto` never engaged, and `.tdb-wrap`'s viewport lock clipped
              2,099px of list with no scrollbar anywhere (browser-measured, 1440×900).
              ⚠️ THE CHILDREN ARE NOW DIRECT CHILDREN OF `.tdb-centre`, which is a flex column —
              so the zone is a flex item again and the chain reaches it. */}
        {/* ⚠️ THE COMPOSER'S MOUNT (board fixes II, P3). "＋ Add task or note" set composerAt and
            NOTHING RENDERED IT — the mount lived in the retired lane/grid views, so the button
            did nothing a reader could see. It sits here, above whichever body state renders,
            because the add must work from every one of them (a new desk included). */}
        {composerAt && renderComposer()}
        {/* ── the grouped list; the desk states (new-desk / desk-cleared) replace it wholesale.
            ⚠️ BOTH DESK STATES READ UNFILTERED — `deskState` takes the raw lanes, never the
            searched ones, so a search that happens to match nothing can never fake a clear desk.
            Copy verbatim from todo-empty-states.html. ── */}
        {desk === "new-desk" ? renderNewDesk() : desk === "desk-cleared" ? renderDeskCleared() : (
          /**
           * ⚠️ THE SPLIT (Phase 2). The list is the RAIL and the dock is the WORKSPACE, standing
           * side by side instead of taking turns.
           *
           * ⚠️ THE DOCK MOVED; IT DID NOT MULTIPLY. Its old note said it "takes the board's place
           * rather than floating over it", and the reasoning behind that sentence — this is where
           * the work happens now — is the reasoning FOR the pane: a modal was refused because it
           * would imply the list was still reachable, and here it genuinely is, in its own
           * column, which is a different arrangement rather than the one that was rejected.
           * `openDock` is still the single entrance and the dock is still the single recording
           * surface; nothing in the rail records anything, so the law holds unchanged.
           */
          <div className="tdw-split">
            <div className="tdw-rail">
              {renderRailTools()}
              {/* ⚠️ A NARROWED-TO-NOTHING RAIL IS A RAIL FACT, AND IT STAYS IN THE RAIL (Phase 4).
                  It used to replace the whole body, which meant a search that matched nothing took
                  the workspace with it — the pane cleared because a search box narrowed, which is
                  the one behaviour this page must not have. The pane HOLDS; only the rail says so.
                  ⚠️ It names WHAT you searched for — a bare "nothing matches" leaves you wondering
                  whether the page heard you — and states the size of the set you get back, which
                  is what makes clearing an informed choice rather than a guess. */}
              {railEmpty ? (
                <div className="tdg-empty tdw-empty">
                  <h3>{search.trim() ? `Nothing matches “${search.trim()}”` : "Nothing in this filter"}</h3>
                  <p>Clear it to see all {allDockable.length}.</p>
                  <button type="button" className="tdg-emptyact" onClick={clearNarrowing}>
                    {search.trim() ? "Clear search" : "Show all"}
                  </button>
                </div>
              ) : renderList()}
              {/* ⚠️ THE FOOTER CLOSES THE CARD, and it states the scope the EXPORT writes. A count
                  saying "12 of 34" beside a button that wrote 34 would be two statements of one
                  scope, and the button's is the one nobody checks until the file is open. */}
              <div className="tdw-foot">
                <span className="tdw-showing">{showingLine(railShown(), allDockable.length)}</span>
                <span className="tdw-footgrow" />
                <button
                  type="button"
                  className="tdw-export"
                  disabled={railShown() === 0}
                  onClick={exportRail}
                >
                  Export CSV
                </button>
              </div>
            </div>
            <div className="tdw-work">
              {paneCard ? (
                <TodoDock
                  queue={dockable}
                  activeKey={paneCard.key}
                  onSelect={(key) => setDockKey(key)}
                  onClose={closeDock}
                  timeline={dockTimeline}
                  onPrimary={(c, spec) => void dockPrimary(c, spec)}
                  onSnoozeDays={(c, days, when) => snoozeCard(c, days, when)}
                  tagsSlot={(c) => c.userTaskId ? (
                    <TagPicker
                      compact
                      tags={userTags}
                      selected={c.tags ?? []}
                      onToggle={(tid) => void applyTagToggle(c.userTaskId!, c.tags, tid)}
                      onCreate={(tag) => { void createTagDef(tag); void applyTagToggle(c.userTaskId!, c.tags, tag.id); }}
                    />
                  ) : null}
                  onMore={(c) => openFlowCards([c])}
                  /* ⚠️ THE HAND-OFF READS THE RECORD OR NOTHING. The agent's own fields and the
                     manuscript's title, looked up by id — never composed from the card's display
                     strings, which are prose and would put "Send your full to Marcus Reed" in a
                     subject line. An absent agent yields an absent link, which greys and says so. */
                  handoff={(c) => {
                    const ag = c.agentId ? agents.find((a) => a.id === c.agentId) : undefined;
                    return { email: ag?.email, website: ag?.website, msTitle: c.msTitle };
                  }}
                />
              ) : (
                /**
                 * ⚠️ THE EMPTY PANE REPORTS, IT DOES NOT CONGRATULATE (Phase 5). "Nothing needs
                 * you." is the whole verdict; beneath it are two facts and no adjectives — how
                 * many queries are out, and when the next reply window falls. No exclamation, no
                 * "great work", no tally of what you cleared: the app states what is true and
                 * leaves the feeling to the writer.
                 *
                 * ⚠️ AND THE SECOND LINE OMITS WHAT IT CANNOT ANSWER. No live queries → no clause
                 * about them; no window derivable → no date invented. A sentence assembled from
                 * whichever facts exist beats one padded with zeroes.
                 */
                <div className="tdw-none">
                  <ArtSlot name="desk-clear" className="tdw-noneart" />
                  <h3>Nothing needs you.</h3>
                  <p>{paneRestLine(queries.filter((q) => !isTerminalStatus(q.status)), new Date(now))}</p>
                </div>
              )}
            </div>
          </div>
        )}

          {/* ⚠️ THE ASSISTANT BAND IS UNMOUNTED FROM THIS PAGE (fix pack, 10 Aug) — a PLACEMENT
              decision, not a deletion. `AssistantBand` and `AssistantPromo.tsx` are untouched, and
              the modal it opened is still reachable from the same state. It sat as the last child
              of `.tdb-centre`, taking its own height PLUS the column's row-gap out of the scroll
              zone on every render — on a page whose complaint was that the window was too short.

              ⚠️ AND ITS FIGURES ARE WRONG, WHICH IS WHY IT MUST NOT SIMPLY BE MOVED. It was fed
              `tiles.housekeeping` and `shownY` — MEMBER-unit counts, every sweep uncollapsed —
              while "Outstanding" beside it counts CARDS. That is the "38 of your 44 tasks" seen
              against an Outstanding of 16 in production. Whoever re-places it fixes the units
              first; the note is in reports/STATE.md. Not fixed here: this pack is four fixes and
              a units change to a Pro surface is neither of them. */}
          </div>{/* .tdb-centre */}
        </TasksPageLayout>
        {/* THE WORKSPACE SHELL (todo-fix48) — Today, back in its corner: a floating card
            bottom-right of the workspace, minimising to a pill; absent when the list is empty. */}
        {/* ⚠️ THE CORNER POP-UP IS RETIRED (workspace P3), AND SO IS THE PAGE THAT REPLACED IT
            (tasks-consolidation P1, 9 Aug). Both retirements are the same argument at different
            scales: a floating duplicate of the day's list, and then a second PAGE over an
            overlapping subset of the same tasks, are each a surface that has to agree with the
            first about what you committed to. One ranked list. One home. */}
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
      {/* tasks-pages P5 — MOUNT 3 of 3: the ⋯ menu's "Tags…" sheet, the same ONE picker. Writes
          are immediate (toggle → the task; create → the definitions + the task in hand). */}
      {tagsFor && tagsFor.userTaskId && (
        <div className="cal-dayscrim" onClick={() => setTagsFor(null)}>
          <div className="cal-daypanel tdb-tagsheet" role="dialog" aria-label={`Tags for ${tagsFor.title}`} onClick={(e) => e.stopPropagation()}>
            <div className="cal-dayhead">
              Tags — {tagsFor.title}
              <button type="button" className="cal-dayx" aria-label="Close" onClick={() => setTagsFor(null)}>✕</button>
            </div>
            <TagPicker
              tags={userTags}
              selected={(userTasks.find((t) => t.id === tagsFor.userTaskId)?.tags) ?? []}
              onToggle={(tid) => {
                const cur = userTasks.find((t) => t.id === tagsFor.userTaskId)?.tags;
                void applyTagToggle(tagsFor.userTaskId!, cur, tid);
              }}
              onCreate={(tag) => {
                const cur = userTasks.find((t) => t.id === tagsFor.userTaskId)?.tags;
                void createTagDef(tag);
                void applyTagToggle(tagsFor.userTaskId!, cur, tag.id);
              }}
            />
          </div>
        </div>
      )}
      {tourOpen && <TodoTour onEnd={endTour} />}
      {toast && (
        <div className={`tdb-toast${toast.tone === "warn" ? " warn" : ""}`}
          role={toast.tone === "warn" ? "alert" : "status"}
          onMouseEnter={pauseToast} onMouseLeave={resumeToast}>
          {toast.msg}
          {toast.action && <button type="button" className="tdb-toast-act" onClick={() => { void toast.action!.fn(); dismissToast(); }}>{toast.action.label}</button>}
        </div>
      )}
      {flow && <FocusFlow items={flow.items} mode={flow.mode} ritual={flow.ritual} onClose={() => { setFlow(null); setFlowPrefill(undefined); }} onNavigate={onNavigate} onToast={flash} prefill={flowPrefill} />}
      {/* ⚠️ FocusedSession IS RETIRED (board+dock P4). It was a SECOND work surface, and two of
          them would have had to agree about what "done" means — the first time they disagreed,
          one would have been silently wrong. The dock is the one surface, and "Focused session"
          and Today's "Work the list" are entrances to it rather than to anything of their own.
          FocusFlow survives as the per-kind flow engine, which is what it was always good at. */}
    </div>
  );

  // ── State A: the new desk (zero queries AND zero agents) — one welcome card replaces the three
  // reels; the two real doorways in; the ghost stack is decoration (CSS only). Copy verbatim. ──
  function renderNewDesk() {
    return (
      <div className="tdb-newdesk">
        {/* ⚠️ ART · FIRST-RUN-BOARD (board-optimise P3) — the board before the first query.
            DISTINCT FROM DESK-CLEAR, and the distinction is the whole point: this one is NOT
            YET, that one is WELL DONE. Same page, opposite meanings — so they are two briefs,
            never one asset reused. Once per manuscript, by the desk state's own derivation. */}
        <ArtSlot name="first-run-board" className="tdb-ndart" />
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
        {/* ⚠️ ART · DESK-CLEAR — RE-EARNED (tasks-consolidation P2). Its mount went with the Today
            page in P1; the slot itself never left the census. It belongs HERE, and only here,
            because this state is WELL DONE where the new desk's slot is NOT YET — same page,
            opposite meanings, so they stay two briefs and never one asset reused.
            ⚠️ THE TRIGGER READS UNFILTERED: `deskState` takes the raw lanes (nothing urgent ∧ no
            housekeeping ∧ no notes) plus a non-empty cleared log, so a search can never fake it. */}
        <ArtSlot name="desk-clear" className="tdb-clrart" />
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
   *  (corrections fix 3: ONE action now — the review pill went to the briefing seat.) Formerly
   *  two actions: the review pill (ghost; the house disabled treatment when no review
   *  exists) and "Add task or note" (the soft-pink primary).
   *
   *  ⚠️ RED GATE, REPORTED: "Begin focused session" is retired here, and it was the ONLY thing
   *  that ever called setSession — so `FocusedSession` (and the hero's title crossfade, ritual
   *  lines and progress slot, which it drove through setHeroSession) is now UNREACHABLE from
   *  the UI. Per the pack, nothing further is deleted: `session`, `heroSession`, `HeroSession`,
   *  `FocusedSession`, `renderHero` below and all their CSS stay in place, dormant, awaiting a
   *  new entry point. */
  /* ⚠️ THE PROSE SUBTITLE IS RETIRED (tasks-consolidation P2), AND ITS DERIVATION IS NOT.
     `boardSubtitle` composed the copy helper over the figures helper — the cards the four
     columns rendered, sweeps as one, urgency by the consolidated family. The STAT CHIPS state
     those same facts from `taskStats`, over the same `boardCols`; keeping both would be two
     statements of one derivation, which is the exact fault the counting law exists to prevent.
     `boardFigures` and `boardSubtitleCopy` stay in `todoColumns`, pure and locked, unmounted. */

  /* ⚠️ THE TOOL ROW IS THE PAGE'S SINGLE INSTRUMENT (board+dock P1; re-homed by tasks-pages P1
     into TasksPageLayout's tool row). Search, sort, the Add and — since Today's retirement —
     "Work the list" all live here: one place to look for anything that changes what the list
     shows or walks it, with the pink creation action pinned to the RIGHT SLOT per the contract.
     (A hoisted `function`, not a post-return const — the render calls it; the TDZ law.) */
  function renderTools() {
    return (
      <>
            {/* ⚠️ THE SEARCH MOVED TO THE RAIL (Phase 4), and it is the one control that had to.
                It narrows the RAIL — that is what a search over a list of tasks does — and with
                the page split in two, a control that acts on one pane belongs above that pane.
                Sort stays here: it orders every group at once and has no pane of its own.
                (Flagged in the report: two instruments over one list now sit in two places, which
                is a tension this pack's own history warns about. The pack put the search in the
                rail explicitly and the ref draws it there.) */}
            {/* ⚠️ SORT MOVED INTO THE RAIL (visual rebuild, Phase 1). Its old note here read
                "it reorders every group at once, which is why it sits with the page's instruments
                and never inside a panel" — true of a page that WAS one panel. The rail is the
                list now, sort orders the list, and leaving it up here kept two instruments over
                one set in two places. The v9 ref draws it beside the search; that settles the
                tension flagged when the search moved. */}
            {/* ⚠️ THE TAG NARROWING — THE NOTEBOARD'S OWN CONTROL, NOT A LOOKALIKE (P2 follow-up).
                Same markup, same `.cal-nav` trigger and `.cal-viewmenu` menu, same single-select
                `#All ▾` vocabulary; only the set it narrows differs. Rendered ONLY where there is
                something to pick — a filter over an empty vocabulary is a control over nothing,
                which is the fault this same pass retired `goodDay` for. */}
            {userTags.length > 0 && (
              <span className="nb-tagwrap">
                <button type="button" className={`cal-nav${tagSel ? " on" : ""}`} aria-haspopup="menu" aria-expanded={tagOpen}
                  onClick={() => setTagOpen((v) => !v)}>
                  #{tagSel ? (userTags.find((t) => t.id === tagSel)?.label ?? tagSel) : "All"} ▾
                </button>
                {tagOpen && (
                  <div className="cal-viewmenu" role="menu">
                    <button type="button" role="menuitem" aria-current={tagSel === null}
                      onClick={() => { setTagSel(null); setTagOpen(false); }}>#All</button>
                    {userTags.map((t) => (
                      <button key={t.id} type="button" role="menuitem" aria-current={tagSel === t.id}
                        onClick={() => { setTagSel(t.id); setTagOpen(false); }}>
                        #{t.label}
                      </button>
                    ))}
                  </div>
                )}
              </span>
            )}

            {/* The Add was orphaned mid-page; it belongs with the page's other instruments. */}
            <TplGrow />
            <button type="button" className="tdb-addb" onClick={() => openComposer("task")}>
              ＋ Add task or note
            </button>
            {/* ⚠️ "WORK THE LIST" COMES BACK HERE (tasks-consolidation P2) — it was Today's ink
                button, and Today is retired. It DISPATCHES rather than calling openDock, so the
                page's own listener stays the single definition of what gets walked (one queue,
                one entrance). DISABLED AT ZERO in the house grammar: an enabled button with
                nothing to walk offers to walk an empty list. */}
            <button
              type="button"
              className="tdb-workb"
              disabled={boardCols.todo.length + boardCols.today.length === 0}
              onClick={() => window.dispatchEvent(new CustomEvent(TODO_WORK_THE_LIST))}
            >
              ▶ Work the list
            </button>
      </>
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
            <button type="button" className="tdb-btnp tdb-herobegin" disabled={dockable.length === 0} onClick={() => openDock()}>
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
  // ── notes-and-tasks P2 — THE COMPOSER (design-refs/notes-and-tasks.html · frame 2): ONE
  // composer, two natures. The type segment leads; switching TRANSFORMS it live — the title +
  // detail swap Caveat (note) ↔ typeset (task), the offset block swaps butter ↔ sage, the date +
  // surfacing fields appear only for a task, the note shows the "NO DATE" line, and the save verb
  // changes. Content survives every switch (the fields are component state, never reset on toggle).
  // ⌘⏎ saves · Esc cancels (a styled confirm only when dirty). No native prompt/alert/confirm. ──
  function renderComposer() {
    const isTask = composerMode === "task";
    /* ⚠️ ENTER COMMITS FROM THE TITLE (fix pack, 10 Aug). It used to want ⌘⏎ everywhere, which is
       a keystroke for a form with many fields — this one has a title and an optional line, and the
       title is where you already are. ⌘⏎ survives for the detail field, where a bare Enter is a
       new line. Escape dismisses from either. */
    const onKey = (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); saveComposer(); }
      if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); tryCloseComposer(); }
    };
    const onTitleKey = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveComposer(); return; }
      onKey(e);
    };
    return (
      <div className={`tdb-nc tdb-nc--${composerMode}${saveState === "failed" ? " failed" : ""}`}>
        <div className="tdb-nc-seg" role="tablist" aria-label="Note or task">
          <button type="button" role="tab" aria-selected={!isTask} className={`tdb-nc-sgb${isTask ? "" : " on"}`} disabled={savePending} onClick={() => setComposerMode("note")}>✎ Note</button>
          <button type="button" role="tab" aria-selected={isTask} className={`tdb-nc-sgb${isTask ? " on" : ""}`} disabled={savePending} onClick={() => setComposerMode("task")}>✓ Task</button>
        </div>
        <div className="tdb-nc-body">
          <input
            className={`tdb-nc-ttl${isTask ? "" : " note"}`}
            value={composerDraft}
            placeholder={isTask ? "What needs doing?" : "Jot it down…"}
            aria-label="Title"
            autoFocus
            readOnly={savePending}
            onChange={(e) => setComposerDraft(e.target.value)}
            onKeyDown={onTitleKey}
          />
          <textarea
            className={`tdb-nc-dtl${isTask ? "" : " note"}`}
            value={composerDetail}
            rows={1}
            placeholder="Add a little more (optional)…"
            aria-label="Detail"
            readOnly={savePending}
            onChange={(e) => { setComposerDetail(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${e.target.scrollHeight}px`; }}
            onKeyDown={onKey}
          />
          <div className="tdb-nc-meta">
            {isTask ? (
              <>
                <span className={`tdb-nc-date${savePending ? " lock" : ""}`}><BrandDatePicker value={composerDate} onChange={setComposerDate} placeholder="Add a date" /></span>
                {composerDate && (
                  <label className="tdb-nc-surface">
                    <span className="tdb-nc-surflbl">Show it in Today’s list</span>
                    <select value={composerSurface} disabled={savePending} onChange={(e) => setComposerSurface(e.target.value as SurfaceOffset)} aria-label="Show it in Today’s list">
                      <option value="on-day">On the day</option>
                      <option value="day-before">A day early</option>
                      <option value="week-before">A week early</option>
                    </select>
                  </label>
                )}
              </>
            ) : (
              <span className="tdb-nc-nomark">NO DATE · NOTHING WILL CHASE YOU</span>
            )}
            {/* tasks-pages P5 — MOUNT 1 of 3: the composer's tag row (compact). Creation happens
                where tagging happens; the draft holds ids until the one save writes them. */}
            <span className="tdb-nc-tags">
              <TagPicker
                compact
                tags={userTags}
                selected={composerTags}
                onToggle={(tid) => setComposerTags((sel) => toggleTagSel(sel, tid))}
                onCreate={(tag) => { void createTagDef(tag); setComposerTags((sel) => [...sel, tag.id]); }}
              />
            </span>
          </div>
          {saveState === "failed" && (
            <div className="tdb-nc-err" role="alert">
              <span className="tdb-nc-errtx">{saveErrorCopy(saveError ?? "unknown")}</span>
              <button type="button" className="tdb-nc-retry" onClick={saveComposer}>Try again</button>
            </div>
          )}
        </div>
        {/* ⚠️ THE COMMIT AFFORDANCE IS A FOOTER ROW (fix pack, 10 Aug). The Save used to sit inline
            at the end of the tag row, where it competed with the tags for the same line and was the
            first thing a narrow card carried off the edge. Hint left, then Cancel, then Save —
            the destructive-adjacent control never sits on the far right where the thumb lands. */}
        <div className="tdb-nc-foot">
          <span className="tdb-nc-hint" aria-hidden>ENTER SAVES · ESC DISMISSES</span>
          {/* ⚠️ CANCEL DISCARDS OUTRIGHT — no confirmation. It is the button whose whole meaning is
              "I did not want this"; asking again is the app not believing you. (Escape still routes
              through `tryCloseComposer`, which asks, because Escape is also hit by accident.) */}
          <button type="button" className="tdb-nc-cancel" disabled={savePending} onClick={closeComposer}>Cancel</button>
          <button type="button" className="tdb-nc-save" disabled={!composerCanSave || savePending} onClick={saveComposer}>
            {saveSlow && <span className="tdb-nc-spin" aria-hidden />}
            {composerEdit ? "Save changes" : isTask ? "Add the task" : "Pin the note"}
          </button>
        </div>
      </div>
    );
  }
  // ── notes-and-tasks P1 — THE EMPTY NOTES SECTION (design-refs/notes-and-tasks.html · frame 1):
  // when the Notes section holds nothing, one dashed butter card explains what a note is for and
  // offers the ink "Write a note" (opening the composer in note mode). It vanishes the moment a
  // note exists; the section head + its honest count still render above it. ──
  function renderNotesEmpty() {
    return (
      <div className="tdb-nte">
        <span className="tdb-nte-ic" aria-hidden><Pin size={16} /></span>
        <div className="tdb-nte-tx">
          <h4>Nothing pinned here yet</h4>
          <p>Notes are for the things you want to remember but don’t need chasing — a thought about an agent, a line for the query letter, a reminder of where you left off.</p>
        </div>
        <button type="button" className="tdb-nte-btn" onClick={() => openComposer("note")}>＋ Write a note</button>
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
  /* (renderFilterChips is GONE — corrections fix 3. The chip strip was the LISTS facets'
     stand-in while the page had no side container. It has one now, so the strip is a second
     narrowing surface with nothing to narrow that the sidebar does not. Its search chip is the
     tool row's field.) */

  // ── the "Today" card (VI P1, todo-right-column-v1.html) — same state, same handlers
  // (rollover Keep/Clear, committed rows + take-off, Help me pick, Work the list); the anatomy is
  // the ref card: plain paper header (date ⇄ "{n} OF 5"), committed items above a dashed
  // ghost-row invitation (todayGhosts), the collapsed-by-default done row, two footer verbs. ──
  // THE WORKSPACE SHELL (todo-fix48) — the Today corner: the floating card (or its minimised
  // pill), bottom-right of the workspace, absent when the list is empty. The card reuses the
  // one renderTodayPanel (checklist + Work the list) and adds a minimise control.
  /* ⚠️ renderTodayCorner + its launcher are GONE (workspace P3, −the corner). The Today list has
     its own route now; a floating copy of it here would be a second surface owning the same
     commitment, and the two would disagree the first time one of them was wrong. The panel's
     collapse state, its localStorage key and its help-FAB clearance went with it. */
  /* ⚠️ renderTodayPanel IS GONE TOO (workspace P3). It was the corner pop-up's contents, and
     with the corner retired nothing called it. The Today page renders the day's list from the
     same `todaySplit` derivation, so the behaviour moved rather than being rebuilt — but the
     MARKUP had to go: two implementations of one list is how the corner and the page would have
     started disagreeing. */

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
  /** THE ROW (todo rebuild P2 — ref .row): a hairline card carrying a 42px tinted family tile,
   *  a Playfair title over an italic Playfair subtitle, the mono tag pill right, then a
   *  chevron; the border lifts and a soft shadow arrives on hover.
   *
   *  RECONCILE (reported): the mockup's tile is decorative, but the leading slot on the live
   *  row is the COMPLETION control (the dot that becomes a tick on hover). Rather than lose
   *  that, the dot is SEATED INSIDE the tile — the tile brings the mockup's tint and size, the
   *  dot keeps its behaviour. The action cluster likewise stays: the mockup draws no row
   *  actions, but Action-now / Today / Later are the row's working surface. */
  // ── the tightening P2 — THE ROW IS A GRID (design-refs/ledger-grid.html · system A). Every row
  // shares the same fixed tracks — dot · task · kind · status · action — so tags, figures and
  // buttons form straight vertical lines down the page. THE LAYOUT LAW: no cell positions itself
  // with margin-left:auto or from a sibling's content width. The action lane is RESERVED: a
  // chevron at rest, the buttons revealed on hover/focus-within WITHIN the same fixed lane. ──
  function rowActionLane(c: BoardCard, committed: boolean) {
    return (
      <div className="tdb-lact" onClick={(e) => e.stopPropagation()}>
        <span className="tdb-lrest" aria-hidden>▸</span>
        <div className="tdb-lacts">
          <button type="button" className="tdb-lprime" onClick={() => openFlowCards([c])}>{VERB_LABELS.action}</button>
          <button type="button" className="tdb-lib" aria-label={committed ? VERB_LABELS.todayRemove : VERB_LABELS.todayAdd} title={committed ? VERB_LABELS.todayRemove : VERB_LABELS.todayAdd} onClick={() => toggleToday(c)}>{committed ? "−" : "＋"}</button>
          {laterMenu(c, true)}
        </div>
      </div>
    );
  }
  function runRow(c: BoardCard, fam: "do" | "hk" | "nt" = "do") {
    const committed = onList(c);
    const isOffer = c.taskType === "offer_received";
    const subIsMs = !!c.subtitle && manuscripts.some((m) => m.title === c.subtitle);
    /* Phase 2 — THE RETURNED-FROM-SNOOZE CHIP, for today only. A row that reappears with no
       explanation reads as a bug in a list you thought you had cleared; this says why it is back.
       Clock-driven, never stored: it is derived from the flag's own expiry against today. */
    const backFlag = taskFlags.find((f) =>
      (c.relatedRecordId && flagMatchesTask(f, c.taskType ?? "", c.relatedRecordId))
      || (c.userTaskId && flagMatchesTask(f, USER_TASK_FLAG_TYPE, c.userTaskId)));
    const cameBack = returnedToday(backFlag, now);
    return (
      <div key={c.key} data-tdbkey={c.key} className="tdb-lrow" role="button" tabIndex={0}
        onClick={() => openFlowCards([c])}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); openFlowCards([c]); } }}>
        <span className={`tdb-ldot ${fam}`} aria-hidden />
        <div className="tdb-ltask">
          <h3 className="tdb-lbt">{c.title}</h3>
          {c.subtitle && <div className="tdb-lbms">{subIsMs ? <span className="tdb-ms">{c.subtitle}</span> : c.subtitle}</div>}
          {cameBack && backFlag?.snoozedUntil && (
            <div className="tdb-lbms"><span className="tdg-back">{returnedChipLabel(backFlag.snoozedUntil)}</span></div>
          )}
        </div>
        <div className="tdb-lkind">
          {c.kind && <span className="tdb-ktag">{isOffer ? `★ ${c.kind}` : c.kind}</span>}
          {(c.snoozes > 0 || committed) && (
            <span className="tdb-kmeta">
              {c.snoozes > 0 && <span className="tdb-ktag snz">×{c.snoozes}</span>}
              {committed && <span className="tdb-ktag on">✓ TODAY</span>}
            </span>
          )}
        </div>
        <div className="tdb-lstat">{c.due}</div>
        {rowActionLane(c, committed)}
      </div>
    );
  }
  // ── grouping P2 — the nested MEMBER ROW (todo-grouping.html §2): inset beneath the
  // parent with the family-tinted spine, smaller title, the STANDARD trio of row actions;
  // no head checkbox (the ref draws none — a dq member completes through its journey). ──
  function runMemberRow(c: BoardCard) {
    const committed = onList(c);
    return (
      <div key={c.key} data-tdbkey={c.key} className="tdb-lrow lsub" role="button" tabIndex={0}
        onClick={() => openFlowCards([c])}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); openFlowCards([c]); } }}>
        <span className="tdb-ldot sub" aria-hidden />
        <div className="tdb-ltask">
          <h3 className="tdb-lbt sm">{c.title}</h3>
          {c.subtitle && <div className="tdb-lbms">{c.subtitle}</div>}
        </div>
        <div className="tdb-lkind">{c.kind && <span className="tdb-ktag">{c.kind}</span>}</div>
        <div className="tdb-lstat">{c.due}</div>
        {rowActionLane(c, committed)}
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
      <div className={`tdb-lrow batch${expanded ? " open" : ""}`} role="button" tabIndex={0} aria-expanded={expanded}
        onClick={() => toggleGroup(g.rule)}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); toggleGroup(g.rule); } }}>
        <span className="tdb-lchev" aria-hidden>▶</span>
        <div className="tdb-ltask">
          <h3 className="tdb-lbt batch"><b>{g.members.length}</b>{copy.rest(g.members.length)}</h3>
          <div className="tdb-lbms">{copy.sub}{expanded && members.length !== g.members.length ? ` · ${groupShowing(g, members.length)}` : ""}</div>
        </div>
        <div className="tdb-lkind"><span className="tdb-ktag">{g.meta.label.toUpperCase()}</span></div>
        <div className="tdb-lstat">
          <div className="tdb-minibar"><i style={{ width: `${prog.pct}%` }} /></div>
          <span className="tdb-lstatn">{prog.pct}% · {g.members.length}</span>
        </div>
        <div className="tdb-lact" onClick={(e) => e.stopPropagation()}>
          <span className="tdb-lrest" aria-hidden>▸</span>
          <div className="tdb-lacts">
          <button type="button" className="tdb-lprime" onClick={open}>{VERB_LABELS.action}</button>
          <span className="tdb-latwrap">
            <button type="button" className="tdb-lib" aria-label={VERB_LABELS.later} title={VERB_LABELS.later} aria-haspopup="menu" aria-expanded={laterKey === key} onClick={(e) => { e.stopPropagation(); setLaterKey((k) => (k === key ? null : key)); }}><ClockGlyph /></button>
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
  // the tightening P2 — the mono COLUMN HEADER above each section's rows, on the SAME grid
  // tracks as the rows themselves, so its alignment cannot drift from the columns' contents.
  function ledgerColhead() {
    return (
      <div className="tdb-colhead" aria-hidden>
        <span />
        <span>TASK</span>
        <span>KIND</span>
        <span>STATUS</span>
        <span className="r">ACTION</span>
      </div>
    );
  }
  /** Return a snoozed card NOW — the snooze's own reversal (the same write its undo performs). */
  function unsnoozeCard(c: BoardCard) {
    const key = c.userTaskId
      ? { taskType: USER_TASK_FLAG_TYPE, queryId: c.userTaskId }
      : c.taskType && c.relatedRecordId ? flagKeyForTask(c.taskType, c.relatedRecordId) : null;
    if (key) upsertTaskFlag(key, { snoozedUntil: null, unbumpSnooze: true });
  }
  /** Un-tick — quickDone's own reverse, which is exactly what its undo toast already calls. */
  async function unDone(c: BoardCard) {
    if (!c.userTaskId) return;
    try { await updateUserTask(c.userTaskId, { done: false }); }
    catch { flash("Couldn’t undo that — try again?"); }
  }

  /* ── THE MOVE MATRIX, PERFORMED (board+dock P3) ────────────────────────────────────────────
     The board asks; this performs, and every branch is a verb the app already has. */
  function performBoardPlan(card: BoardCard, plan: DropPlan) {
    switch (plan.kind) {
      case "commit": toggleToday(card); break;            // the cap + its flash come with it
      case "uncommit": setCommitted(card, false); break;
      /* ⚠️ THE POPOVER, NOT A SNOOZE — opening the card's own Later menu. The card stays where it
         is until a date is chosen there. */
      case "snooze-popover": setLaterKey(card.key); break;
      case "unsnooze": unsnoozeCard(card); break;
      /* ⚠️ COMPLETION ALWAYS GOES THROUGH THE PRIMITIVE (P3). quickDone carries the undo toast;
         a drag that wrote the completion field directly would finish the task with no way back —
         which is exactly what the drag path used to do. */
      case "complete": void quickDone(card); break;
      case "uncomplete": void unDone(card); break;
      /* ⚠️ THE BOUNCE — a derived card cannot be ticked, because ticking is not what finishes it.
         The card returns and the toast names the act that WOULD, with a way straight to it. */
      case "bounce":
        flash(plan.why ?? "That is not what completes this", {
          label: "Open",
          /* ⚠️ THE BOUNCE'S WAY THROUGH — it docks the item, which is where the act it named
             actually happens. Bouncing without a route would be a rule with no door. */
          fn: async () => { openDock(card.key); },
        });
        break;
      case "none": if (plan.why) flash(plan.why); break;  // the offer guard states its reason
    }
  }

  /* (The session launcher's one-line opener is DELETED — board fixes II P3. It was
     openDock() over the whole list, and its only caller was the retired tool-row button. The dock's
     entrances are now the cards themselves, the menu's Action now, the bounce toast's Open, and
     Today's "Work the list".) */

  /**
   * ⚠️ ONE NARROWING, APPLIED IN ONE PLACE (tasks-consolidation P2). The list, the dock's queue
   * and the "nothing matches" branch all read THIS — so what you work through is exactly what you
   * were looking at. It used to compose the FILTERS facet and the tag selection too; both retired
   * with the sidebar, and the search is what is left.
   *
   * (A hoisted `function`, not a post-return const — the render calls it; the TDZ law.)
   */
  function narrowCards(cards: BoardCard[]): BoardCard[] {
    const searched = search.trim() ? cards.filter((c) => matchesSearch(c, search, sctx)) : cards;
    /* ⚠️ ONE TAG PREDICATE, SHARED WITH THE CALENDAR AND THE NOTEBOARD — `matchesTags` takes a
       SET, so the single selection is passed as a set of one rather than growing a second
       comparison. Derived cards carry no tags, so any selection narrows to the writer's own
       content: the honest answer, since only user content can be tagged. */
    const tagged = tagSel ? searched.filter((c) => matchesTags(c.tags, [tagSel])) : searched;
    return sortBoardCards(tagged, sort);
  }

  /** The queue the dock walks — the list's own order, narrowing respected. */
  function dockAllCards(): BoardCard[] {
    return narrowCards([...board.do, ...board.hk, ...board.nt]);
  }

  /* tasks-pages P5 — the tag writes; board-optimise P2 moved the pair into useTagWrites so the
     four Tasks pages share ONE copy (see the hook's head note). */
  const { createTagDef, applyTagToggle } = useTagWrites(flash);

  /* ⚠️ THE ⋯ VERBS, PERFORMED — every one an EXISTING primitive, exactly as the drags are (board
     fixes II P1: the menu grew its per-kind and per-column shapes in `cardMenu`; this switch just
     routes each leaf to the verb that already owns it). */
  function performCardVerb(card: BoardCard, item: MenuLeaf, column: TodoColumnId) {
    /* A sweep card's verbs act on its RULE GROUP — the same group the batch sheet and the group
       fork already operate on. The card is one stand-in; the group is the thing. */
    const group = isSweepCard(card) ? hkGroups.find((g) => g.rule === card.sweepRule) : undefined;
    switch (item.id) {
      case "action":
        if (group) { setFlow({ items: [{ kind: "group", group }] }); break; } // Start the sweep — the batch sheet
        openDock(card.key);                                                   // ⚠️ the dock — the one work surface
        break;
      case "today": performBoardPlan(card, dropPlan(card, column, column === "today" ? "todo" : "today")); break;
      /* The date tiers write through the EXISTING snooze primitives — never a menu-local date. */
      case "snooze-1": group ? snoozeGroup(group, 1, "tomorrow") : snoozeCard(card, 1, "tomorrow"); break;
      case "snooze-7": group ? snoozeGroup(group, 7, "in a week") : snoozeCard(card, 7, "in a week"); break;
      case "unsnooze": performBoardPlan(card, dropPlan(card, "snoozed", "todo")); break;
      /* ⚠️ DISMISS IS THE EXISTING FORK, not a new write — each tier is one of `forkStale`'s (or
         the group fork's) own arms, so the menu and the fork card cannot disagree about what a
         tier does. A board-local dismissal would be a second path to the same stance. */
      case "dismiss-week": group ? forkNotNowGroup(group) : forkStale(card, "notNow"); break;
      case "dismiss-never": group ? forkNeverThese(group) : forkStale(card, "neverThis"); break;
      case "dismiss-rule":
        /* ⚠️ "STOP SHOWING THIS KIND" IS THE MUTE, AND IT REACHES AN EXISTING PRIMITIVE (Fix 4).
           A sweep mutes its whole rule through the fork; a single card mutes its TYPE through
           `hideType`, which the retired later-menu already used and which writes its own undo.
           No second dismiss path: `dismissTask` is untouched, and this is a different verb. */
        if (group) { forkNeverRule(group); break; }
        { const hk = laterHideKey(card.taskType); if (hk) hideType(card, hk); }
        break;
      case "undo-done":
        if (card.userTaskId) {
          void updateUserTask(card.userTaskId, { done: false })
            .then(() => flash("Put back on the board"))
            .catch(() => flash("Couldn’t undo that — try again?"));
        }
        break;
      case "open-query": if (card.relatedRecordId) onNavigate("queries", card.relatedRecordId); break;
      /* ⚠️ VIEW THE AGENT hands the id over via the one-shot reveal key — the agent list reads it
         once on arrival, scrolls the card into view and clears it. sessionStorage, deliberately:
         a reveal is a gesture, not a preference, and it must not survive the tab. */
      case "view-agent":
        if (card.agentId) {
          try { sessionStorage.setItem("sa.agentReveal", card.agentId); } catch { /* private mode */ }
          onNavigate("agents");
        }
        break;
      case "edit-task": openComposerEdit(card); break;
      case "tags": setTagsFor(card); break;                     // tasks-pages P5 — the tag sheet
      /* board-optimise P7 — the ladder writes minutes (or clears with null) through the ONE
         existing updateUserTask path; no new primitive, no new failure mode. */
      case "est-5": case "est-10": case "est-25": case "est-45": case "est-60": case "est-none":
        if (card.userTaskId) {
          const mins = item.id === "est-none" ? null : Number(item.id.slice(4));
          void updateUserTask(card.userTaskId, { estimateMin: mins })
            .catch(() => flash("Couldn’t set that — try again?"));
        }
        break;
      case "delete-task": void deleteUserNote(card); break;     // the styled confirm + undo ride along
    }
  }

  /** ⚠️ THE ONE ENTRANCE FUNCTION — Action now, the bounce toast's Open, "Focused session" and
   *  Today's "Work the list" all arrive here. Two work surfaces would have to agree about what
   *  "done" means; there is one. */
  function openDock(activeKey?: string) {
    /* ⚠️ THE QUEUE IS NOT AN ARGUMENT ANY MORE — it is derived, so there is nothing to hand over.
       Callers used to pass `dockAllCards()` (and one passed the UNnarrowed `boardCards`, which
       quietly contradicted `narrowCards`' own law that what you work through is what you were
       looking at). Naming only the card removes the chance to pass the wrong list. */
    if (dockable.length === 0) { flash("Nothing to work through"); return; }
    boardScroll.current = document.getElementById(STAGE_SCROLL_ID)?.scrollTop ?? 0;
    const start = activeKey && dockable.some((c) => c.key === activeKey) ? activeKey : dockable[0].key;
    dockPos.current = dockable.findIndex((c) => c.key === start);
    setDockKey(start);
  }

  function closeDock() {
    setDockKey(null);
    // restore where the board was — after the board has painted again
    requestAnimationFrame(() => {
      const el = document.getElementById(STAGE_SCROLL_ID);
      if (el) el.scrollTop = boardScroll.current;
    });
  }

  /** The docked item's timeline — derived from the activity log, never stored. */
  function dockTimeline(card: BoardCard): DockTimelineEvent[] {
    if (!card.relatedRecordId) return [];
    return activities
      .filter((a) => a.queryId === card.relatedRecordId)
      .map((a, i) => ({ a, i, label: activityEventLabel(a) }))
      .filter((x) => x.label !== null)
      .map((x) => ({
        key: x.a.id ?? `ev-${x.i}`,
        label: x.label as string,
        when: new Date(x.a.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      }));
  }

  /**
   * ⚠️ THE FLOW'S ONE INK ACT — and for a send, ONE ACT, THREE RECORDS.
   *
   * `recordMaterialsSent` is the existing primitive and it does two of them: it appends the
   * MATERIALS_SENT activity and moves the query's status. The third — the task going away — is
   * DERIVED, not written: the engine generates a partial_requested task because the query sits at
   * PARTIAL_REQUESTED, so moving the status retires the task by construction. Nothing ticks it,
   * and nothing needs to; a write there would be a second record of a fact the first already
   * carries, and the two would eventually disagree.
   */
  async function dockPrimary(card: BoardCard, spec: SendSpec | null) {
    const flow = dockFlowKind(card);
    if (spec && card.relatedRecordId) {
      try {
        await recordMaterialsSent({
          queryId: card.relatedRecordId,
          targetStatus: spec.targetStatus === "Partial Sent" ? QueryStatus.PARTIAL_SENT : QueryStatus.FULL_SENT,
          sentDate: new Date().toISOString(),
          ...(spec.isResubmit ? { isResubmit: true } : {}),
        });
        flash(`Recorded — the ${spec.material} is away`, { label: "Undo", fn: async () => {
          if (card.relatedRecordId) await undoQueryStatus(card.relatedRecordId, card.status as QueryStatus, spec.targetStatus === "Partial Sent" ? QueryStatus.PARTIAL_SENT : QueryStatus.FULL_SENT);
        } });
      } catch { flash("Couldn’t record that — try again?"); return; }
      advanceDock(card);
      return;
    }
    /* Every other flow hands off to the surface that already owns it, rather than the dock
       growing a second implementation of a dialogue that exists. */
    if (flow === "user-task") { await quickDone(card); advanceDock(card); return; }
    if (flow === "offer" || flow === "stale" || flow === "housekeeping" || flow === "agent-waiting") {
      openFlowCards([card]);
    }
  }

  /** ⚠️ ADVANCE OFFERS THE NEXT ITEM — it never runs it. A surface that started the next act on
   *  your behalf would be deciding at exactly the moment you had stopped paying attention. */
  function advanceDock(done: BoardCard) {
    /* ⚠️ ITS FILTER IS GONE WITH THE SNAPSHOT. That line reconciled a stored queue against a
       reality it could not see; the queue is derived now, so the finished card leaves the list on
       its own the moment the write lands. All that is left is to point at the successor.
       ⚠️ AND NOTHING IS CLEARED WHEN THERE IS NONE. Pointing at the card that is about to vanish
       is correct: `resolveDocked` then finds the key gone, takes the position it held and clamps
       to the end — so finishing the LAST item lands on the one before it rather than at the top. */
    const next = nextInQueue(dockable, done.key);
    if (next) setDockKey(next.key);
  }

  /**
   * ⚠️ THE FOUR COLUMNS ARE RETIRED; THIS IS THE GROUPED LIST (tasks-consolidation P2).
   *
   * The columns asked WHERE a card belonged and then had to keep four of them agreeing about one
   * set. `taskGroups` asks what KIND of thing it is — a question the app can already answer from
   * the same `boardCols` the badge and every count read — and the ranked order inside each group
   * IS the plan. Nothing about a group is stored, so this rebuild needed no migration.
   *
   * THE ONE NARROWING LEFT IS THE SEARCH, and it is applied to every group alike before the
   * grouping runs: narrowing one group would leave the page showing differently-scoped views of
   * one set, and you would have to remember which.
   */
  /**
   * ⚠️ THE RAIL'S OWN INSTRUMENTS, ABOVE ITS OWN SCROLLER (Phase 4; ref todo-workspace-concept-v3
   * `.rail-tools`). Search then chips, in a bordered block that does not scroll with the list it
   * narrows — a control that scrolls away is gone exactly when a long list makes you want it.
   *
   * (A hoisted `function`, not a post-return const — the render calls it; the TDZ law.)
   */
  function renderRailTools() {
    const chips = railChips(boardCols);
    return (
      <div className="tdw-tools">
        <div className="tdw-toolrow">
        <div className={`tdw-search${search ? " has" : ""}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.4-3.4" /></svg>
          <input
            ref={searchRef}
            type="text"
            placeholder="Search your list…"
            aria-label="Search your list"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") { setSearch(""); (e.target as HTMLInputElement).blur(); } }}
          />
          {/* ⚠️ THE CLEAR APPEARS ONLY WITH A QUERY — a permanent × on an empty field is a control
              that does nothing, and it sits where your eye goes to check whether anything is set. */}
          {search && (
            <button type="button" className="tdw-clr" aria-label="Clear the search" onClick={() => setSearch("")}>
              <X size={13} aria-hidden />
            </button>
          )}
        </div>
        {/* sort, beside the field it orders */}
        <span className="tdw-sortwrap">
          <button type="button" className="tdw-sort" aria-haspopup="menu" aria-expanded={sortOpen}
            onClick={() => setSortOpen((v) => !v)}>
            ⇅ {TODO_SORTS.find((x) => x.id === sort)!.label}
          </button>
          {sortOpen && (
            <div className="tdb-sortmenu" role="menu">
              {TODO_SORTS.map((o) => (
                <button key={o.id} type="button" role="menuitem" aria-current={o.id === sort}
                  onClick={() => { setSort(o.id); setSortOpen(false); }}>
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </span>
        </div>
        {/* ⚠️ EVERY COUNT IS LIVE AND COMES FROM `railChips`, which reads the same `taskGroups` the
            headings do — so a chip and the panel it names can never state different figures. */}
        <div className="tdw-chips" role="group" aria-label="Filter the list">
          {chips.map((ch) => (
            <button
              key={ch.id}
              type="button"
              className={`tdw-chip${ch.id === chip ? " on" : ""}`}
              aria-pressed={ch.id === chip}
              onClick={() => setChip(ch.id)}
            >
              {ch.label}<span className="n">{ch.count}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /**
   * ⚠️ THE GROUPS THE RAIL DRAWS — computed ONCE and read by both the list and the "is it empty"
   * question (Phase 4). That question used to be answered by `active && !anyVisible`, over four
   * `v*` sets built with a DIFFERENT filter model from the one the rail rendered: two derivations
   * of "is there anything here", free to answer differently. This is the array the rail maps over.
   *
   * (A hoisted `function` for the TDZ law, called from both places rather than a const either
   * would have had to be declared above.)
   */
  function railGroups() {
    const narrowed = {
      todo: narrowCards(boardCols.todo),
      today: narrowCards(boardCols.today),
      snoozed: narrowCards(boardCols.snoozed),
      done: narrowCards(boardCols.done),
    };
    return chipGroups(taskGroups(narrowed), chip);
  }

  function renderList() {
    /* ⚠️ THE LIST REGION IS THE SCROLLZONE (tasks-viewport P1). The page never scrolls; the
       header block is fixed and the groups scroll inside this zone. */
    return (
      <TplZone scrollRef={zoneRef} label="Your tasks" hem={false}>
        <TaskList
          groups={railGroups()}
          hkExpanded={hkExpanded}
          onToggleHk={() => setHkExpanded(true)}
          onOpen={(c) => openDock(c.key)}
          /* ⚠️ THE MARK IS THE PANE'S OWN KEY, NOT A SECOND SELECTION. The rail marks what the
             workspace is showing, so the two cannot disagree about which one is current — and
             when nothing is docked, nothing is marked. */
          selectedKey={docked.card?.key}
          onTick={(c) => void quickDone(c)}
          onVerb={(c, v, column) => performCardVerb(c, v, column)}
          /* ⚠️ THE DIAL DECIDES NOTHING — it hands over an ALREADY-CLAMPED value and the page
             performs it through `snoozeCard`, the same primitive the ⋯ tiers and the dock use.
             One choke point, three entrances. */
          onSnooze={(c, days, when) => snoozeCard(c, days, when)}
          /* ⚠️ "NO TASKS" AND "WE DO NOT KNOW YET" ARE DIFFERENT SENTENCES (P5). `collectionsReady`
             is the db's own first-snapshot flag — the same one the Dashboard's skeleton reads — so
             the page cannot tell the second as the first and flash an empty desk on boot. */
          loading={!collectionsReady}
        />
      </TplZone>
    );
  }

  /* ⚠️ `performBoardPlan` AND `dropPlan` SURVIVE UNMOUNTED — drag was the board's, and the list
     has no drop targets. They are left whole rather than deleted because every verb a drag
     performed is also on the ⋯ menu, which is what the list uses; the sweep is a commit of its
     own (the house rule on orphans). */
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
  function laterMenu(c: BoardCard, icon = false) {
    const hideKey = laterHideKey(c.taskType);
    return (
      <span className="tdb-latwrap">
        {icon ? (
          <button type="button" className="tdb-lib" aria-label={VERB_LABELS.later} title={VERB_LABELS.later} aria-haspopup="menu" aria-expanded={laterKey === c.key} onClick={(e) => { e.stopPropagation(); setLaterKey((k) => (k === c.key ? null : c.key)); }}><ClockGlyph /></button>
        ) : (
          <button type="button" className="tdb-btnh" aria-haspopup="menu" aria-expanded={laterKey === c.key} onClick={(e) => { e.stopPropagation(); setLaterKey((k) => (k === c.key ? null : c.key)); }}><ClockGlyph />{VERB_LABELS.later}</button>
        )}
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
  // ── notes-and-tasks P3 — THE TWO NATURES ON THE BOARD (design-refs/notes-and-tasks.html · frame
  // 3): a NOTE is butter with an ✎ NOTE band, Caveat, a PINNED footer and NO completion circle; a
  // TASK is sage (the user-created family) with a ✓ YOUR TASK band, typeset, a date chip and a
  // completion tick (the existing quickDone + undo toast). A task PROMOTES on its due day — pink
  // offset + band, a DUE TODAY tag — while its lane (Urgent) and Today's-list membership are
  // derived upstream. Blue is reserved for Pro and NEVER appears here. ──
  function renderUserCard(c: BoardCard) {
    const isTask = c.nature === "task";
    const promoted = c.dueState === "today" || c.dueState === "overdue";
    const surfLead = c.surfaceOffset && c.surfaceOffset !== "on-day" ? c.surfaceOffset : null;
    return (
      <div key={c.key} data-tdbkey={c.key} className={`tdb-ntc ${c.nature}${promoted ? " due" : ""}`}>
        <div className="tdb-ntc-b">
          <i className="tdb-ntc-tag">{isTask ? "✓ YOUR TASK" : "✎ NOTE"}</i>
          {promoted && <i className="tdb-ntc-tag hot">{c.dueState === "overdue" ? "OVERDUE" : "DUE TODAY"}</i>}
          {/* removal is a note's completion (it is never ticked); the task can be ticked OR removed */}
          <button type="button" className="tdb-ntc-del" onClick={() => deleteUserNote(c)} aria-label={`Delete “${c.title}”`} title="Delete">✕</button>
        </div>
        <div className="tdb-ntc-in">
          <h4 className="tdb-ntc-ttl">{c.title}</h4>
          {c.detail && <div className="tdb-ntc-d">{c.detail}</div>}
          <div className="tdb-ntc-ft">
            {isTask ? (
              <>
                <span className={`tdb-ntc-dchip${promoted ? " due" : ""}`}>{c.due}</span>
                {surfLead && <span className="tdb-ntc-surf">{surfLead === "week-before" ? "SHOWS A WEEK EARLY" : "SHOWS A DAY EARLY"}</span>}
                <button type="button" className="tdb-ntc-tick" onClick={() => quickDone(c)} aria-label={`Mark “${c.title}” done`} />
              </>
            ) : (
              <span className="tdb-ntc-pin">{c.due}</span>
            )}
          </div>
        </div>
      </div>
    );
  }
  // ── full-detail lane card (the contract): band tag (+ ✓ TODAY chip) over title + manuscript. ──
  function renderCard(c: BoardCard, gin = false) {
    if (c.nature) return renderUserCard(c); // notes-and-tasks: user notes/tasks wear their own grammar
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
    // the tightening P3 — THE ROW STOOD UPRIGHT (design-refs/card-grid.html): the same three
    // lanes as the ledger. Band = kind tag left + the SAME tabular figures right; body = title +
    // manuscript line; foot = the identical action lane, PINNED with margin-top:auto inside the
    // shared min-height, so feet align across a row whatever the title length. The hover-verb
    // expansion machinery is superseded — the foot is always present.
    return (
      <div key={c.key} data-tdbkey={c.key} className={`tdb-cell${gin ? " gin" : ""}`}>
        <div className={`tdb-tile ${c.stream}${hov ? " hov" : ""}${c.quiet ? " quiet" : ""}${pulsing === c.key ? " pulse" : ""}`}
          onClick={() => openFlowCards([c])}
          onMouseEnter={() => armVerbs(c.key)} onMouseLeave={disarmVerbs}
          onFocus={() => armVerbs(c.key)} onBlur={disarmVerbs}
          role="button" tabIndex={0}
          onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); openFlowCards([c]); } }}>
          <div className={`tdb-band ${c.stream}`}>
            <span className="tdb-bandl">
              {/* ⚠️ GUARDED, like the list row at the top of this file. `kind` is "" for a user
                  task (todoBoard's default branch), so an unguarded render drew an EMPTY PILL —
                  chrome with nothing in it, which reads as a load failure rather than an absence. */}
              {c.kind && <span className="tdb-ktag">{isOffer ? `★ ${c.kind}` : c.kind}</span>}
              {c.snoozes > 0 && <span className="tdb-ktag snz">×{c.snoozes}</span>}
              {committed && <span className="tdb-ktag on">✓ TODAY</span>}
            </span>
            <span className="tdb-when">{c.due}</span>
          </div>
          <div className="tdb-body">
            <div className="tdb-tt">{c.title}</div>
            {c.subtitle && <div className="tdb-tsub">{subIsMs ? <span className="tdb-ms">{c.subtitle}</span> : c.subtitle}</div>}
          </div>
          <div className="tdb-cfoot" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="tdb-lprime" onClick={() => openFlowCards([c])}>{VERB_LABELS.action}</button>
            <button type="button" className="tdb-lib" aria-label={committed ? VERB_LABELS.todayRemove : VERB_LABELS.todayAdd} title={committed ? VERB_LABELS.todayRemove : VERB_LABELS.todayAdd} onClick={() => toggleToday(c)}>{committed ? "−" : "＋"}</button>
            {laterMenu(c, true)}
            <span className="tdb-crest" aria-hidden>▸</span>
          </div>
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
            <span className="tdb-bandl"><span className="tdb-ktag">{g.meta.label.toUpperCase()}</span></span>
            <span className="tdb-when">{g.members.length}</span>
          </div>
          {/* the tightening P3 — the batch body carries its PROGRESS in the fixed slot (present on
              batch cards, absent on unit cards — the pinned foot never moves either way); the
              hover expansion that used to hold it is superseded. */}
          <div className="tdb-body">
            <div className="tdb-gtt"><span className="tdb-gn">{g.members.length}</span>{copy.rest(g.members.length)}</div>
            <div className="tdb-avs">
              {faces.map((m) => <span key={m.card.key} title={m.agentName}>{m.card.initials}</span>)}
              {g.members.length > faces.length && <i>+{g.members.length - faces.length}</i>}
            </div>
            <div className="tdb-cprog">
              <div className="tdb-minibar"><i style={{ width: `${prog.pct}%` }} /></div>
              <div className="tdb-pcap"><span>{prog.caption}</span><span>{prog.pct}%</span></div>
            </div>
            {/* grouping P1 — the one rest affordance (it replaces neither the foot nor Action now) */}
            <button type="button" className="tdb-gxp" onClick={(e) => { e.stopPropagation(); toggleGroup(g.rule); }}>Expand {g.members.length} ▾</button>
          </div>
          <div className="tdb-cfoot" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="tdb-lprime" onClick={() => setFlow({ items: [{ kind: "group", group: g }] })}>{VERB_LABELS.action}</button>
            <span className="tdb-latwrap">
              <button type="button" className="tdb-lib" aria-label={VERB_LABELS.later} title={VERB_LABELS.later} aria-haspopup="menu" aria-expanded={laterKey === key} onClick={(e) => { e.stopPropagation(); setLaterKey((k) => (k === key ? null : key)); }}><ClockGlyph /></button>
              {laterKey === key && (
                <div className="tdb-latmenu" role="menu" aria-label="Later" onKeyDown={latMenuKeys}>
                  <button type="button" role="menuitem" onClick={(e) => { e.stopPropagation(); setLaterKey(null); snoozeGroup(g, 1, "tomorrow"); }}>Remind me tomorrow</button>
                  <button type="button" role="menuitem" onClick={(e) => { e.stopPropagation(); setLaterKey(null); snoozeGroup(g, 7, "in a week"); }}>Give it a week</button>
                  <button type="button" role="menuitem" className="warn" onClick={(e) => { e.stopPropagation(); setLaterKey(null); muteRuleFromCard(g); }}>Don’t show these again</button>
                </div>
              )}
            </span>
            <span className="tdb-crest" aria-hidden>▸</span>
          </div>
        </div>
      </div>
    );
  }
};

export default ToDoPage;
