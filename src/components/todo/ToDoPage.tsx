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
import { materialRowsFromAgent, materialsWantedFromRows, summaryFromRows, willRecordText } from "../../lib/agentMaterials";
import { queriesMissingMaterials, MATERIALS_BULK_RECORD_ID } from "../../lib/queryMaterialsGap";
import { agentPrimary } from "../../lib/agentDisplay";
import { formatQueryMaterials } from "../../lib/materials";
import { recordSweepRow, sweepWrites, sweepActLabel, type RecordSweepRow } from "../../lib/materialsSweep";
import { Funnel, Pin, ChevronRight, ChevronLeft, X, Clock, ArrowUpDown, ExternalLink, Plus } from "lucide-react";
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
  quickSendPayload, quickNudgePayload, receiptLine, markSentWriteArgs, nudgeWriteArgs, materialOptsForTask, priorSameTypeSend, duplicateSendPrompt, journeyEventISO,
} from "../../lib/todoWalk";
import { weekOfQuerying } from "../../lib/dashboardStats";
import { WriteErrorCode, classifyWriteError, saveErrorCopy } from "../../lib/todoWrite";
import { groupHousekeeping, hkGapCount, HkGroup, HkRule, HK_RULES, laterHideKey } from "../../lib/todoHousekeeping";
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
import { Agent, ActivityType, QueryStatus, SurfaceOffset } from "../../types";
import { AgentDataNeed, agentDataQualityNeeds } from "../../lib/agentDataQuality";
import { SweepMember } from "./PaneSweep";
import { SweepRow, SweepRule, emptySweepRow, isSweepRule, sweepFields, sweepOutcome } from "../../lib/paneSweep";
import { BrandDatePicker } from "../forms";
import { FocusFlow, FocusItem } from "./FocusFlow";
import { TaskSettingsSheet } from "./TaskSettingsSheet";
import {
  TODO_OPEN_COMPOSER, TODO_OPEN_TASK_SETTINGS, TODO_ADD_TO_TODAY,
} from "../../lib/todoRoutes";
/* ⚠️ THE FOUR-COLUMN BOARD IS RETIRED AS THIS PAGE'S BODY (tasks-consolidation P2). `TodoBoard`
   and `TodoSideContainer` are no longer mounted here — the ranked order of ONE list is the plan,
   so a column asking where a card belongs, and a FILTERS facet asking what kind it is, are both
   answered by the groups themselves. Neither component is deleted in this phase (the house rule
   on orphans: flag, then sweep in a commit of its own). */
import { TaskList } from "./TaskList";
import { groupColumn } from "../../lib/todoGroups";
import { daysBetween } from "../../lib/elapsed";
import { useDockActivity } from "./useDockActivity";
import { materialRows, materialName, anchorNoun, bandForward, holderRows } from "../../lib/todoHandoff";
import { notifyGroups, reminderFields } from "../../lib/offerNotify";
import { sendSpecFor } from "../../lib/todoDock";
import { isSlotFilled } from "../../lib/packageMetrics";
import { TasksPageLayout, TplGrow, TplZone } from "./TasksPageLayout";
import { ArtSlot } from "./ArtSlot";
import { TaskPane } from "./TaskPane";
import { TaskPaneBody, SendBodyValues } from "./TaskPaneBody";
import { buildJourney } from "../../lib/taskPaneJourney";
import { liveFamily } from "../../lib/todoFamily";
import { DockTimelineEvent } from "./timelineEvent";
import { assembleBoardColumns, isSweepCard, DropPlan, dropPlan, TodoColumnId, liveBoardCards } from "../../lib/todoColumns";
import { MenuLeaf, cardMenu } from "../../lib/todoMenu";
import { TagPicker } from "./TagPicker";
import { useTagWrites } from "./useTagWrites";
import { todoPrefs } from "../../lib/todoPrefs";
/* `toggleTagSel` still serves the COMPOSER's draft (tags are untouched by the sidebar's
   retirement — only the tag NARROWING went with it); `matchesTags` had no reader left. */
import { tagUsageCounts, toggleTagSel, matchesTags } from "../../lib/todoTags";
import { TagDef } from "../../types";
import { dockQueue, resolveDocked, collapseTimelineDuplicates } from "../../lib/todoDock";
import { dropSupersededProvisional, normalizeResultingStatus } from "../../lib/queryDerivation";
import { JourneyKind, JourneySendValues } from "../../lib/paneJourney";
import { CLOSE_REASONS } from "../../lib/todoJourneys";
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
import { taskGroups, railChips, chipGroups, chipMatchesCard, RailChipId } from "../../lib/todoGroups";
import { paneRestLine, showingLine, tasksCsv } from "../../lib/todoHandoff";
import { rowFigure, daysSince, waitAnchorMs, RowFigure, cardBucket, BUCKET_LABEL, rowDeed } from "../../lib/todoBuckets";
import { rowPrimaryLabel } from "../../lib/taskRow";
import { SnoozeDial } from "./SnoozeDial";
import { isTerminalStatus } from "../../lib/agentList";
import { longDate } from "../../lib/dashboardStats";
import {
  TODO_GROUPS, HOUSEKEEPING_FOLD, foldRows, snoozedCount, isSnoozed,
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
/* ⚠️ `VERB_LABELS` IS RETIRED WITH THE ROW/REEL CLUSTER (15 Aug). All four members —
   action · todayAdd · todayRemove · later — were consumed only by `rowActionLane`, `renderCard`,
   `runBatchRow`, `renderGroupCard` and `laterMenu`, every one of which was unreachable. The CARD
   verb is `rowPrimaryLabel` (`lib/taskRow.ts`), which is the one the live command bar reads and
   the one that names the deed. */

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
    tasks, userTasks, queries, agents, manuscripts, taskFlags, activities, packages, versions, currentUser, collectionsReady,
    addUserTask, updateUserTask, deleteUserTask, upsertTaskFlag, updateUserProfile, recordOfferDecision,
    recordMaterialsSent, logNudge, dismissTask, undoQueryStatus, updateQueryStatus, updateQuery, deleteActivity, resolveTaskFlag, updateAgent,
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
  /* ⚠️ `pagedGroups` IS RETIRED WITH THE CLUSTER (15 Aug) — both halves were referenced only by
     `renderGroupExpanded`'s "+ N more…" pager, which had no callers. Four sibling states
     (`pulsing`, `recentG`, `verbKey`, `openGroups`) are now WRITE-ONLY: their setters are still
     called from live code but nothing reads the value, since the readers were all in the cluster.
     Left standing because removing them means unpicking live call sites; recorded so the next
     reader knows they are inert rather than load-bearing. */
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
  /* the command bar's own snooze door — the fifth onto the ONE dial */
  /* the dial's anchor — whichever control opened it. `HTMLElement`, not `HTMLButtonElement`: the
     card's footer hands back its own element and the dial only needs a box to hang off. */
  const cbSnooze = useRef<HTMLElement | null>(null);
  const [cbDial, setCbDial] = useState(false);
  /* the list card's two menus — mutually exclusive, both dismissed the same three ways */
  const [filterOpen, setFilterOpen] = useState(false);
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
  /* ⚠️ THE UNNARROWED SET GOES IN — see `resolveDocked`. Without it a search narrowing and a
     snooze are indistinguishable here, and the pane advances off a card you are still working on. */
  const docked = resolveDocked(dockable, dockKey, dockPos.current, allDockable);
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


  /* ⚠️ THE DOCKED QUERY'S OWN ACTIVITY ROWS — the AUTHORITATIVE subcollection, which is what the
     Query Centre reads. The global `activities` feed the dock used before is a best-effort
     projection twin, and where the twin was never written Tracking rendered "Nothing logged yet."
     on a query with history. One card is docked at a time, so this is one listener. */
  const dockRows = useDockActivity(currentUser?.id, paneCard?.relatedRecordId);

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

  /**
   * ⚠️ BOTH MENUS CLOSE ON OUTSIDE PRESS AND ON ESCAPE, AND NEITHER TRAPS FOCUS (Phase 5). They
   * are narrowing controls on permanent chrome, not dialogues — trapping focus in one would make
   * a filter something you have to escape from. Escape is NOT captured or stopped for the same
   * reason the New popover's is not: this page has its own Escape business (an open card's draft
   * discard), and swallowing the key at this level would reach past these menus.
   */
  useEffect(() => {
    if (!filterOpen && !sortOpen) return;
    const close = () => { setFilterOpen(false); setSortOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [filterOpen, sortOpen]);

  /** Clearing the narrowing is one act, whichever half of it is set. */
  const clearNarrowing = () => { setSearch(""); setChip("all"); };

  /**
   * ⚠️ THE FIGURE, RESOLVED WHERE THE DATA IS. The row renders it; the page derives it, because it
   * needs three things the list has no business holding: the agent's STATED WINDOW
   * (`responseTimeWeeks`), whose move it is (the CTA engine, never a second answer), and the clock.
   *
   * ⚠️ THE BALL-HOLDER COMES FROM `getPrimaryAction` — the same derivation the command bar, the
   * agent list's turn axis and the To-do flows all read. A local "is the agent waiting" test here
   * would be a fourth answer to a question with one.
   */
  /** ⚠️ `responseReceivedAt` and `lastStatusChange` are `Timestamp | string` — the derived pair
   *  carry whichever the write left. One coercion, at the only place that reads them here. */
  const isoOf = (v: unknown): string | undefined => {
    if (typeof v === "string") return v;
    const d = (v as { toDate?: () => Date } | undefined)?.toDate?.();
    return d ? d.toISOString() : undefined;
  };

  function figureFor(c: BoardCard): RowFigure {
    const snoozedKeys = new Set(boardCols.snoozed.map((x) => x.key));
    const ag = c.agentId ? agents.find((a) => a.id === c.agentId) : undefined;
    const q = c.relatedRecordId ? queries.find((x) => x.id === c.relatedRecordId) : undefined;
    const ut = c.userTaskId ? userTasks.find((t) => t.id === c.userTaskId) : undefined;
    const statedWeeks = typeof ag?.responseTimeWeeks === "number" && ag.responseTimeWeeks > 0
      ? ag.responseTimeWeeks : undefined;
    const ballHolder = q ? getPrimaryAction(q.status as QueryStatus).ballHolder ?? null : null;

    /* a sleeping card states its return date and nothing else */
    if (snoozedKeys.has(c.key)) {
      return rowFigure({ card: c, backOn: (c.due || "").replace(/^BACK\s+/i, "") });
    }

    /* ⚠️ AN OFFER'S REPLY-BY IS THE ONE CLOCK THAT COUNTS DOWN, and it can run out — a negative
       remainder is "Reply was due / 3 days ago" rather than a figure quietly clamped to zero. */
    if (c.taskType === "offer_received" && q?.responseDeadline) {
      const left = Math.ceil((Date.parse(q.responseDeadline) - now) / 86400000);
      if (Number.isFinite(left)) return rowFigure({ card: c, replyWithinDays: left });
    }

    /**
     * ⚠️ THE ANCHOR IS PER BUCKET AND IT CAN BE ABSENT. `waitAnchorMs` returns NaN where the record
     * cannot say; `elapsedDays` is then left UNDEFINED and the figure reads "No date on record".
     * There is no `?? now` here any more — that fallback is what printed "Today" on cards that had
     * waited 47 days.
     */
    const anchor = waitAnchorMs(cardBucket(c), c.taskType, {
      dateSent: q?.dateSent,
      partialRequestedDate: q?.partialRequestedDate,
      fullRequestedDate: q?.fullRequestedDate,
      partialSentDate: q?.partialSentDate,
      fullSentDate: q?.fullSentDate,
      lastNudgeSentDate: q?.lastNudgeSentDate,
      lastReplyAt: isoOf(q?.responseReceivedAt),
      statusMovedAt: isoOf(q?.lastStatusChange),
      createdAt: ut?.createdAt,
    });

    return rowFigure({
      card: c,
      statedWeeks,
      ballHolder,
      elapsedDays: Number.isFinite(anchor) ? daysSince(anchor, now) : undefined,
    });
  }

  /**
   * ⚠️ THIS BLOCK SITS HERE, BELOW `userTasks`, `isoOf` AND `figureFor`, AND THAT IS LOAD-BEARING.
   * It was written 150 lines higher and the page threw on render — `useMemo`'s factory runs DURING
   * render, so every `const` declared beneath it was in the temporal dead zone. `tsc` passed and
   * 5,683 tests passed: the references live inside closures, which TypeScript cannot prove run at
   * render time (the same shape this repo has been caught by in `AllManuscripts.tsx`).
   *
   * ⚠️ WHAT CAUGHT IT WAS THE PAGE. The e2e harness could not sign in, because the workspace never
   * mounted — the app's error boundary was showing "Something went wrong" and a source-reading
   * suite cannot see that. Bisected across three worktrees to be sure it was mine and not the
   * concurrent session's onboarding work.
   *
   * Anything moved above `figureFor` reintroduces it, silently.
   */
  /**
   * ⚠️ THE PORTED PANE'S INPUTS, GATHERED ONCE. `TaskPane` renders the mockup's `DATA` shape and
   * nothing else, so everything it needs is answered here from derivations the page already runs —
   * `figureFor` for the wait, `cardMenu` for what a card offers, `rowPrimaryLabel` for the verb.
   * None of it is re-derived: a second opinion here is how the pane and the rail come to state
   * different waits, which this page has already been caught by once.
   */
  const [paneBody, setPaneBody] = React.useState<SendBodyValues>({ materials: [], when: "Today", also: "" });
  /* the answers reset with the card — a half-filled form carried onto another task is answers
     about the wrong query, which is the sweep's own rule applied to one card */
  React.useEffect(() => { setPaneBody({ materials: [], when: "Today", also: "" }); }, [paneCard?.key]);

  /**
   * ⚠️ WHAT A LIST ROW NEEDS BEYOND ITS CARD, and every one of these is a lookup rather than a new
   * derivation. `waitAnchorMs` is the SAME clock the rail's figure already runs on, so the row's
   * duration and the pane's cannot disagree; `sendSpecFor` is what already decides partial-versus-
   * full; `queriesMissingMaterials` is the derivation the bulk card was raised by.
   *
   * ⚠️ AND WHERE THE RECORD IS SILENT, THIS RETURNS NULL RATHER THAN A GUESS. `listMeta` falls back
   * to the agent-and-agency pair, which is the contract's own instruction. Two facts are absent on
   * this account and reported rather than invented: the partial's SPECIFIC ASK ("the first 3
   * chapters") has no field on the request record, and an offer's date is `offerDate`, which the
   * imported queries do not carry.
   */
  const listRowInputs = React.useCallback((c: BoardCard) => {
    const q = c.relatedRecordId ? queries.find((x) => x.id === c.relatedRecordId) : undefined;
    const anchorMs = waitAnchorMs(cardBucket(c), c.taskType, {
      dateSent: q?.dateSent,
      partialRequestedDate: q?.partialRequestedDate,
      fullRequestedDate: q?.fullRequestedDate,
      partialSentDate: q?.partialSentDate,
      fullSentDate: q?.fullSentDate,
      lastNudgeSentDate: q?.lastNudgeSentDate,
      lastReplyAt: isoOf(q?.responseReceivedAt),
      statusMovedAt: isoOf(q?.lastStatusChange),
      createdAt: c.userTaskId ? userTasks.find((t) => t.id === c.userTaskId)?.createdAt : undefined,
    });
    const spec = sendSpecFor(c);
    const offer = isoOf(q?.offerDate);
    const ag = c.agentId ? agents.find((a) => a.id === c.agentId) : undefined;
    return {
      agency: ag?.agency ?? null,
      days: Number.isFinite(anchorMs) ? daysBetween(anchorMs, Date.now()) : null,
      partial: spec?.material === "partial",
      /* the ask, through the ONE materials formatter — absent when the request recorded none */
      ask: formatQueryMaterials(q?.materialsWanted),
      offeredOn: offer ? new Date(offer).toLocaleDateString("en-GB", { day: "numeric", month: "long" }) : null,
      bulkCount: c.taskType === "materials_unrecorded_bulk"
        ? queriesMissingMaterials({ queries, activities, agents, manuscripts, displayName: agentPrimary }).length
        : null,
    };
  }, [queries, userTasks, activities, agents, manuscripts]);

  const paneFacts = React.useMemo(() => {
    if (!paneCard) return [];
    const q = paneCard.relatedRecordId ? queries.find((x) => x.id === paneCard.relatedRecordId) : undefined;
    const ag = paneCard.agentId ? agents.find((a) => a.id === paneCard.agentId) : undefined;
    const f = figureFor(paneCard);
    const anchorMs = waitAnchorMs(cardBucket(paneCard), paneCard.taskType, {
      dateSent: q?.dateSent,
      partialRequestedDate: q?.partialRequestedDate,
      fullRequestedDate: q?.fullRequestedDate,
      partialSentDate: q?.partialSentDate,
      fullSentDate: q?.fullSentDate,
      lastNudgeSentDate: q?.lastNudgeSentDate,
      lastReplyAt: isoOf(q?.responseReceivedAt),
      statusMovedAt: isoOf(q?.lastStatusChange),
      createdAt: paneCard.userTaskId ? userTasks.find((t) => t.id === paneCard.userTaskId)?.createdAt : undefined,
    });
    const longDay = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
    const out: { k: string; v: string }[] = [];
    if (f.label && f.value) out.push({ k: f.label, v: `${f.value}${f.unit ? ` ${f.unit}` : ""}` });
    if (Number.isFinite(anchorMs)) out.push({ k: anchorNoun(paneCard), v: longDay(anchorMs) });
    const fwd = bandForward(paneCard, isoOf(q?.responseDeadline) ?? null, ag?.responseTimeWeeks ?? null,
      (iso) => longDay(new Date(iso).getTime()), !!ag);
    if (fwd) out.push({ k: fwd.k, v: fwd.v });
    return out;
  }, [paneCard, queries, agents, userTasks]);

  /* ⚠️ THE VERBS ARE `cardMenu`'s, NOT A SECOND LIST. The band's Snooze and Dismiss are the same
     entries the ⋯ menu offers, so a card that cannot be snoozed shows no Snooze in either place. */
  const paneVerbs = React.useMemo(() => {
    const none = { disabled: true, onPress: () => {} };
    if (!paneCard) return { snooze: none, openQuery: none, dismiss: none };
    const col = groupColumn(cardBucket(paneCard) === "note" ? "yours" : "urgent");
    const menu = cardMenu(paneCard, col);
    const offers = (id: string) => menu.some((g) => g.entries.some((e) =>
      e.kind === "leaf" ? e.id === id && !e.disabled : e.sub.some((x) => x.id === id && !x.disabled)));
    return {
      snooze: { disabled: !offers("snooze-1"), onPress: (anchor: HTMLElement) => { cbSnooze.current = anchor; setCbDial(true); } },
      openQuery: { disabled: !paneCard.relatedRecordId, onPress: () => paneCard.relatedRecordId && onNavigate("queries", paneCard.relatedRecordId) },
      dismiss: { disabled: !offers("dismiss-week"), onPress: () => forkStale(paneCard, "notNow") },
    };
  }, [paneCard]);

  /* what the primary will write, in the mockup's own `Will record:` grammar */
  const paneWill = paneCard
    ? `${rowPrimaryLabel(paneCard, groupColumn(cardBucket(paneCard) === "note" ? "yours" : "urgent"))} · ${paneBody.when.toLowerCase().replace("…", "")}`
    : "";

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
    /* ⚠️ "Work the list" AND ITS LISTENER ARE RETIRED (corrections, Phase 4). It opened the dock
       over the whole queue; the dock IS the right-hand pane now and never leaves the screen, so
       the button entered a mode you were already in. Recon confirmed nothing else in `src/`
       dispatches `TODO_WORK_THE_LIST` — the event name survives in `todoRoutes` unfired rather
       than being deleted out from under a caller that might exist off this page. */
    const onAdd = (e: Event) => {
      const key = (e as CustomEvent<{ key?: string }>).detail?.key;
      const card = [...board.do, ...board.hk, ...board.nt].find((c) => c.key === key);
      if (card) toggleToday(card); // the cap + the flash come with it, exactly as on this page
    };
    window.addEventListener(TODO_ADD_TO_TODAY, onAdd);
    return () => {
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
          {/**
            * ⚠️ THE WEEKLY REVIEW BANNER IS UNMOUNTED, NOT DELETED — it comes back deliberately.
            *
            * The `.tdb-brief` card rendered here: the review masthead art, `↺ LAST WEEK IN REVIEW`,
            * the headline, the narrative, the figures, `Read the review` and the ✕. Every one of
            * its inputs is still computed a few hundred lines up and still correct — `reviewWin`,
            * `reviewSeen`, `reviewDismissed`, `briefCleared`, `briefReplies`, `briefNarrative`,
            * `briefFigures`, `markReviewSeen`, `dismissReviewWeek`, `openReview` — and
            * `openSundayReview` still opens the review with the live Urgent cards as its seed.
            *
            * ⚠️ SO NOTHING HERE IS ORPHANED BY THIS COMMIT, and that is deliberate rather than
            * untidy: a derivation deleted now is one that has to be rebuilt from the git history
            * when the banner returns, and the reasoning that produced `briefingHeadline`'s copy is
            * not recoverable from its call site. Restoring the card is putting this block back.
            *
            * ⚠️ WHAT THIS CHANGES BESIDES THE BANNER, stated because it is not obvious: the tool
            * row's `.tdb-revlink` renders only when `reviewSeen || reviewDismissed`, and the ONLY
            * thing that set `reviewSeen` was this card being opened or dismissed. With the card
            * gone, a fresh account never sets either — so the link does not appear, and the weekly
            * review has no entry point on this page at all. An account whose localStorage already
            * carries `sa.todoReviewSeen` for the current week WILL still see the link. That is a
            * consequence of unmounting, not a second decision, and it is reported rather than
            * worked around.
            */}

          {/* ⚠️ THE STANDALONE CONTROL BAR IS GONE (board+dock P1). Its search and the retired
              view toggle fold into the header's tool row, which is now the page's single
              instrument — one place to look for anything that changes what the list shows. Two
              instrument rows, one under the other, is how the chip strip and the LISTS rows came
              to disagree; this is the same mistake in a different arrangement. */}
          {/* ⚠️ THE STAT CHIPS ARE RETIRED — THEY STATED WHAT THE PAGE ALREADY SAID, TWICE OVER.
              "Outstanding" is the control bar's own `{n} outstanding`, three inches above; Urgent,
              Done and Snoozed are each printed on the group heading of the very cards they count.
              The chips were the header's statement back when the header was the only thing that
              could make one — the grouped list makes it now, beside the thing being counted, which
              is where a count is worth reading.

              ⚠️ ONE FIGURE WAS NOT A DUPLICATE, AND ITS LOSS IS FLAGGED RATHER THAN QUIET:
              `Estimated {n} min` had no other home. `estimateChip` in `TodoBoard.tsx` is the only
              other display and that component is mounted NOWHERE, so the ⋯ menu's est-5…est-60
              items now write a `UserTask.estimateMin` the writer can never see. `estimateTotal`
              and `taskStats` both survive in `lib/`, pure and locked, so reinstating the one line
              is trivial — but the honest states are "shown somewhere" or "not offered", and the
              menu still offers it. Nick's call: reinstate the figure, or retire the est-* items. */}
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
          <>
          {/**
            * ⚠️ ONE ACTION SURFACE, SPANNING BOTH PANES (visual rebuild, Phase 4). The card's own
            * foot bar is retired in the same commit — two places to act on one task is how they
            * come to offer different verbs, and this one can state the list's count as well,
            * which a bar inside the pane never could.
            *
            * ⚠️ EVERY VERB HERE FIRES AN EXISTING PRIMITIVE, and an inapplicable one renders
            * DISABLED rather than absent: a bar whose buttons come and go makes you re-read it
            * every time the selection changes.
            */}
          {/**
            * ⚠️ THE COMMAND BAR IS GONE, AND EVERY ONE OF ITS CONTENTS IS SOMEWHERE THAT ACTS.
            *   the counts        → the list's own footer (`showingLine`)
            *   Add task or note  → the list's tools row, beside filter and sort
            *   Snooze · Open query · Dismiss → the card's footer, with the deed
            *   previous / next   → the pane header, beside "Task 3 of 30"
            * The "This task" label and the dividers went with the row: they existed to explain
            * which of two scopes a button belonged to, and that ambiguity was the bar's own.
            *
            * ⚠️ IT WAS NEVER A SURFACE — it was where homeless controls collected, because it was
            * the only permanent row on the page. That is a fact about the layout, not about any of
            * the verbs, which is why every one of them had a better home to go to.
            *
            * The snooze DIAL survives below: it is a popover, and it now hangs off whichever
            * control opened it (`cbSnooze` holds that element) rather than off the bar's button.
            */}
          {cbDial && paneCard && cbSnooze.current && (
            <SnoozeDial
              card={paneCard}
              anchor={cbSnooze.current}
              onSnooze={(days, when) => { setCbDial(false); snoozeCard(paneCard, days, when); }}
              onClose={(rf) => { if (rf) cbSnooze.current?.focus(); setCbDial(false); }}
            />
          )}
          <div className="tdw-split">
            <div className="tdw-rail">
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
              {/* ⚠️ THE RAIL'S TOOLBAR AND FOOTER ARE RETIRED — the ported card renders its own,
                  because the contract draws toolbar, body and footer as ONE object. Leaving these
                  would have given the page two toolbars and two footers, and the second footer was
                  the one saying "showing 13 of 12". One surface, one count.

                  ⚠️ AND THE BRACES ARE LOAD-BEARING. In JSX CHILDREN a bare slash-star comment is
                  literal TEXT — the first form of this note rendered on the page, under the list, in
                  full. It is the mirror of the trap at EXPRESSION position, where the braced form
                  parses as a block instead: same characters, opposite rule, decided by where it
                  sits. (And the braced form cannot be quoted inside a comment either — its closing
                  sequence ends the comment early, which is how the second attempt at this failed.) */}
            </div>
            <div className="tdw-work">
              {paneCard ? (
                /* ⚠️ THE PORTED PANE (`TaskPane`), which replaced `TodoDock` wholesale. The old pane's
                    markup and stylesheet are deleted in the same commit — leaving both would have given the
                    page two panes to drift apart, and the class names overlap enough that a stray rule from
                    one would have reached the other.

                    ⚠️ WHAT CROSSED OVER IS BEHAVIOUR: the completion path (`dockPrimary`), snooze, dismiss,
                    open query and task navigation. The verbs are the SAME `cardMenu` derivation the ⋯ menu
                    reads, so the pane and the menu cannot disagree about what applies to a card. */
                <TaskPane
                  journey={buildJourney({
                    card: paneCard,
                    figure: (() => { const f = figureFor(paneCard); return f.value ? { value: String(f.value), unit: f.unit ?? "" } : null; })(),
                    facts: paneFacts,
                    sentPreviously: (() => {
                      const q = paneCard.relatedRecordId ? queries.find((x) => x.id === paneCard.relatedRecordId) : undefined;
                      return formatQueryMaterials(q?.materialsWanted);
                    })(),
                    events: dockTimeline(paneCard).map((e) => ({
                      key: e.key, label: e.label, when: e.when, via: e.via,
                      /* the mockup's `in` rung — an event the AGENT caused */
                      incoming: /requested|offer|rejected|response|reply/i.test(e.label),
                    })),
                    primaryLabel: rowPrimaryLabel(paneCard, groupColumn(cardBucket(paneCard) === "note" ? "yours" : "urgent")),
                    will: paneWill,
                    body: (
                      <TaskPaneBody
                        materials={dockMaterials(paneCard).map((m) => ({ label: m.label, detail: m.sub }))}
                        value={paneBody}
                        onChange={setPaneBody}
                      />
                    ),
                    /* the band's buttons are the mockup's `btns` array — carried behaviour, its markup */
                    btns: [
                      ...(paneVerbs.snooze.disabled ? [] : [{ label: "Snooze", onPress: paneVerbs.snooze.onPress }]),
                      ...(paneVerbs.dismiss.disabled ? [] : [{ label: "Dismiss", onPress: () => paneVerbs.dismiss.onPress() }]),
                    ],
                    onOpenQuery: () => paneVerbs.openQuery.onPress(),
                  })}
                  onPrimary={() => dockPrimary(paneCard)}
                  nav={{
                    index: dockable.findIndex((c) => c.key === paneCard.key) + 1,
                    total: dockable.length,
                    label: liveFamily(paneCard) === "urgent" ? "Urgent" : liveFamily(paneCard) === "housekeeping" ? "Housekeeping" : "Your tasks",
                    onPrev: () => { const i = dockable.findIndex((c) => c.key === paneCard.key); if (i > 0) setDockKey(dockable[i - 1].key); },
                    onNext: () => { const i = dockable.findIndex((c) => c.key === paneCard.key); if (i < dockable.length - 1) setDockKey(dockable[i + 1].key); },
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
          </>
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

  /**
   * ⚠️ THE TOOL ROW IS GONE, NOT EMPTIED (corrections, Phase 4). Everything between the header
   * plate and the control bar comes out: the date / week-of-querying eyebrow, the `#All` tag
   * dropdown, the four count pills and `Work the list`. Search and sort had already moved into
   * the list card; `Add task or note` moves into the CONTROL BAR as the one list-level action
   * there. `TasksPageLayout` renders no row and no hairline when neither `tools` nor `eyebrow` is
   * passed, so the strip costs nothing rather than leaving a bare rule.
   *
   * ⚠️ `Work the list` IS RETIRED BECAUSE THE MODE IT ENTERED IS ALWAYS ON. It opened the dock
   * over the whole queue; the dock IS the right-hand pane now and never leaves the screen, so the
   * button entered a mode you were already in. Its listener went with it — nothing else in `src/`
   * dispatches `TODO_WORK_THE_LIST`, and the event name survives in `todoRoutes` unfired rather
   * than being deleted out from under a caller that might exist off this page.
   */
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
    /**
     * ⚠️ THE SWEEP CARDS JOIN THE QUEUE, WHICH IS WHY A GROUP ROW CAN NOW BE OPENED AT ALL. They
     * were drawn in the rail (which reads `boardCols`) and absent from here (which reads `board`),
     * so clicking one asked `openDock` for a key the queue did not hold — and `openDock` correctly
     * REFUSES an unknown key rather than substituting one, so thirty housekeeping items were
     * unreachable.
     *
     * ⚠️ TAKEN FROM `boardCols`, NEVER REBUILT. `boardColumns` already constructs them; building a
     * second set here would be one fact with two sources, and the two would drift the first time
     * the card's shape changed.
     *
     * ⚠️ THE GROUPED MEMBERS STAY OUT. `board.hk` still holds every individual gap card, and
     * `boardColumns` removes exactly those the sweeps stand for — so adding the sweeps without
     * removing their members would put both the cohort and its sixteen parts in one queue.
     */
    const sweeps = boardCols.todo.filter(isSweepCard);
    const swept = new Set(hkGroups.flatMap((g) => g.members.map((m) => m.card.key)));
    return narrowCards([...board.do, ...sweeps, ...board.hk.filter((c) => !swept.has(c.key)), ...board.nt]);
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
      /* ⚠️ THE ESTIMATE HANDLER IS REMOVED WITH ITS MENU ITEMS (15 Aug). It wrote
         `UserTask.estimateMin` through `updateUserTask`, and nothing now displays that field:
         `.tdg-stats`' total was retired as a duplicate and `estimateChip` lives in the unmounted
         `TodoBoard.tsx`. ⚠️ SO `UserTask.estimateMin` IS NOW WRITTEN BY NOTHING AND READ BY
         NOTHING — its presence in the type, the rules allowlist and any existing document is NOT
         evidence that the feature exists. The derivation (`ESTIMATE_LADDER`, `estimateTotal`,
         `estimateHeadLabel`, `estimateChip`) is deliberately left standing in
         `lib/todoEstimate.ts` so the day a "what can I get done today" view wants it, this is one
         line to restore rather than a rebuild. */
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
    /**
     * ⚠️ AN UNDOCKABLE KEY IS REFUSED, NEVER SUBSTITUTED. This read
     * `activeKey && dockable.some(…) ? activeKey : dockable[0].key`, so naming a card the queue
     * does not hold silently docked the FIRST card instead — measured on the deployed page:
     * clicking the grouped "12 wish lists" row opened Noah Bright's offer. That is worse than a
     * stale selection, because it is always the same card and therefore looks deliberate: the
     * writer clicks one row and is shown another, with nothing saying so.
     *
     * ⚠️ THE `dockable[0]` FALLBACK IS STILL RIGHT WITH NO KEY — that is the "work through the
     * list" entrance, which legitimately means "start at the top". The fault was only ever the
     * case where a key WAS named and could not be honoured.
     *
     * A grouped housekeeping row keeps its real deed, which is expanding its members; it simply no
     * longer pretends to dock.
     */
    if (activeKey && !dockable.some((c) => c.key === activeKey)) return;
    boardScroll.current = document.getElementById(STAGE_SCROLL_ID)?.scrollTop ?? 0;
    const start = activeKey ?? dockable[0].key;
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
  /**
   * ⚠️ IT READS THE QUERY'S OWN ACTIVITY SUBCOLLECTION, NOT THE GLOBAL FEED — and that one word is
   * why Tracking said "Nothing logged yet." on every card. This filtered `users/{uid}/activities`
   * by `queryId`; that collection is a best-effort PROJECTION twin (`recordResponse`: "SECONDARY
   * write — best-effort … failures here must never block undo"), and for this data the twins were
   * never written. The AUTHORITATIVE rows are the per-query subcollection, which is what the Query
   * Centre subscribes to — proven on the deployed site: the Centre rendered "Full requested — 5
   * JUN" for `seed-query-9` while the dock rendered nothing for the same query.
   *
   * ⚠️ A SECOND SOURCE, NOT A SECOND DERIVATION. `activityEventLabel` is still the one label
   * derivation and is untouched; only the store it is handed changed.
   */
  /**
   * ⚠️ WHAT THE RECORD CAN ACTUALLY SAY, WHICH IS LESS THAN THE MOCKUP DRAWS. The ref's sub-line is
   * `v4 · 50,000 words · .docx`; of the three, only the VERSION is derivable, and only where the
   * query has a linked package whose slot is filled. `ManuscriptVersion.fileName` is written
   * nowhere in `src/` outside a dev lab fixture and `contentType: "file"` is a disabled
   * "coming soon" with no Storage — so a format stamp would be invented on every row. A per-
   * material word count does not exist either: `wordCount` belongs to the MANUSCRIPT, and printing
   * it beside a query letter would state the novel's length as the letter's.
   */
  /**
   * ⚠️ §4.4 — WHO ELSE HOLDS MATERIAL, and it REUSES `notifyGroups`. The offer flow's notify door
   * has derived exactly this set for months; only the presentation was missing. Nothing here
   * re-derives who holds what — a second derivation of that is precisely the fault this codebase
   * keeps writing down.
   */
  function dockHolders(card: BoardCard) {
    if (card.taskType !== "offer_received" || !card.relatedRecordId) return [];
    const q = queries.find((x) => x.id === card.relatedRecordId);
    if (!q) return [];
    const ms = manuscripts.find((m) => m.id === q.manuscriptId);
    return holderRows(
      notifyGroups(q, queries, agents, userTasks).pages,
      (agentId) => (agentId ? agents.find((a) => a.id === agentId)?.email : undefined),
      ms?.title ? `${ms.title} — an update` : "An update on my submission",
    );
  }

  function dockMaterials(card: BoardCard) {
    const spec = sendSpecFor(card);
    if (!spec) return [];
    const q = card.relatedRecordId ? queries.find((x) => x.id === card.relatedRecordId) : undefined;
    const pkg = q?.packageId ? packages.find((p) => p.id === q.packageId) : undefined;
    /* ⚠️ THE SLOT FOLLOWS THE MATERIAL. A partial and a full are both the OPENING SAMPLE slot in
       `SubmissionPackage` — there is no "full manuscript" slot, and that is the standing law
       (PACKAGE_MATERIALS): a full manuscript is what you send when asked, not part of a package.
       So a full has no version to quote, and says so rather than quoting the sample's. */
    /* ⚠️ THE SLOT FOLLOWS THE MATERIAL, and a FULL has none. `SubmissionPackage` carries no
       full-manuscript slot — the standing PACKAGE_MATERIALS law: a full is what you send when
       asked, not part of a package. So a full takes the MANUSCRIPT's word count instead, which is
       the one place that figure is about the thing being sent. */
    const isFull = spec.targetStatus !== "Partial Sent";
    const slot = isFull ? undefined : pkg?.samplePagesVersionId;
    const versionName = slot && isSlotFilled(slot) ? versions.find((v) => v.id === slot)?.versionName ?? null : null;
    const ms = q ? manuscripts.find((m) => m.id === q.manuscriptId) : undefined;
    /* ⚠️ THE NAME, NOT THE SPEC'S DISCRIMINATOR. `spec.material` is `"partial" | "full"` — what the
       WRITE path branches on — and it was going straight to the row's label. */
    return materialRows(materialName(spec.material, card.who), { isFull, wordCount: ms?.wordCount, versionName });
  }

  /* ⚠️ THE DAY, NOT THE INSTANT. Two rungs of one status seconds apart are the duplicate; two on
     different days are a re-request. `createdAt` is a Firestore Timestamp on these rows, not the
     ISO string the global feed carries — reading it as a string yields "Invalid Date" rather than
     an error, the same trap the `when` line below already documents. */
  /** "2 Apr" — the rung's day, for a line that states a fact rather than quotes a person. */
  function dayLabel(raw: any): string {
    const ms = raw?.toMillis ? raw.toMillis() : raw?.seconds ? raw.seconds * 1000 : Date.parse(String(raw ?? ""));
    return Number.isFinite(ms) ? new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
  }

  function dayKeyOf(raw: any): string {
    const ms = raw?.toMillis ? raw.toMillis() : raw?.seconds ? raw.seconds * 1000 : Date.parse(String(raw ?? ""));
    return Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : "";
  }

  /**
   * ⚠️ WHAT THE AGENT ASKED FOR, IN THEIR OWN WORDS — the journey's reference block. It is the
   * newest incoming rung's own note, displayed verbatim and never parsed, with the anchor line the
   * card already derives. Absent where the record is silent: a "no request recorded" panel is a
   * heading over an absence.
   */
  function dockAsk(card: BoardCard): { fact?: string; meta?: string } | undefined {
    if (!card.relatedRecordId) return undefined;
    const rows = dockRows.filter((r) => {
      const st = normalizeResultingStatus(r.resultingStatus);
      return st === QueryStatus.PARTIAL_REQUESTED || st === QueryStatus.FULL_REQUESTED || st === QueryStatus.REVISE_RESUBMIT;
    });
    const last = rows[rows.length - 1];
    /* ⚠️ AND A PROVISIONAL RUNG'S NOTE IS THE IMPORT'S BOOKKEEPING, not the agency's words — the
       same rule Item 5 applied to the timeline's sub-line, for the same reason. */
    const note = last && last.dateProvisional !== true && last.note ? String(last.note) : undefined;
    /* ⚠️ THE DATE JOINS THE LINE, which is what makes it read as a fact rather than a sentence
       somebody uttered. The rung's own `createdAt`, through the same reader the timeline uses —
       a Firestore Timestamp on these rows, not the ISO string the global feed carries. */
    const when = last ? dayLabel(last.createdAt ?? last.date) : "";
    const fact = note ? (when ? `${note} · ${when}` : note) : undefined;
    const meta = card.record || undefined;
    return fact || meta ? { ...(fact ? { fact } : {}), ...(meta ? { meta } : {}) } : undefined;
  }

  /**
   * ⚠️ THE JOURNEY'S COMMIT RUNS THE EXISTING WRITE, UNCHANGED. `quickSendPayload` builds the same
   * `StagedPayload` the quick ✓ builds and `markSentWriteArgs` → `recordMaterialsSent` performs it —
   * so the two surfaces cannot come to record different things. What the journey adds is the
   * writer's OWN answers in place of the quick path's stated defaults.
   *
   * ⚠️ IT DOES NOT ADVANCE TO THE NEXT TASK, deliberately and against what the takeover did. The
   * writer stays on the card and watches the record change — the new rung in the timeline, the stat
   * pair flipping, `What goes` and `Where to send it` dropping away because there is nothing left
   * to send. Moving on is a separate press.
   */
  /**
   * ⚠️ WHICH BUCKETS HAVE AN IN-PANE JOURNEY — declared here, one line each, and `undefined` for the
   * rest. A bucket without an entry keeps the takeover through `onPrimary`, which is what lets them
   * move one at a time rather than all at once on a surface nobody has walked.
   */
  function paneJourneyKind(card: BoardCard): JourneyKind | undefined {
    /* ⚠️ THE `decide` BUCKET SPLITS BY TASK TYPE, and forcing one shape on both would be wrong in
       whichever direction it went. An OFFER is a branch — three different acts. An R&R is a SEND:
       `sendSpecFor` returns a spec for it, `recordMaterialsSent` performs it, and the only thing
       distinguishing it is a second pre-ticked row. One bucket, two journeys, because the bucket
       answers "how urgent" and the task type answers "what is this". */
    if (card.userTaskId) return "note";
    if (card.taskType === "offer_received") return "offer";
    if (card.taskType === "revise_resubmit") return "send";
    /* ⚠️ THE SINGLE RECORD GAP ONLY. The bulk card stands for a set and has no query behind it, so
       it has no band subject, no send date and no agent requirements to start from — a one-query
       form pointed at it would state facts about a record that does not exist. It keeps the
       hand-off until its own table lands. */
    if (card.taskType === "materials_unrecorded") return "materials";
    switch (cardBucket(card)) {
      case "send": return "send";
      case "chase": return "chase";
      case "close": return "close";
      /* ⚠️ `fix` EARNS THE PANE ONLY IF THERE IS SOMETHING TO ASK. Its stack is its gaps, so a card
         whose agent has since been filled in — or one with no agent to resolve — would render a
         journey of zero steps and a footer offering to save nothing. It falls back to the takeover,
         which is where grouped housekeeping still lives. */
      case "fix": return cardGaps(card).length > 0 ? "fix" : undefined;
      /* note still opens the takeover for a grouped card */
      default: return undefined;
    }
  }

  /**
   * ⚠️ THE GAPS ARE THE CARD'S, NOT THE JOURNEY'S — read from the agent the card points at, through
   * the SAME `agentDataQualityNeeds` that raised it. A second derivation here is how the journey
   * would come to ask about a field the card was not raised for.
   */
  function cardGaps(card: BoardCard): AgentDataNeed[] {
    const ag = card.relatedRecordId ? agents.find((a) => a.id === card.relatedRecordId) : undefined;
    return ag ? agentDataQualityNeeds(ag) : [];
  }

  /**
   * ⚠️ THE COHORT BEHIND A SWEEP CARD, or nothing. `hkGroups` is the one place a group is built —
   * the rail's row, the ⋯ verbs and the batch sheet all read it — so the pane reads it too rather
   * than grouping the cards a second time.
   */
  function dockSweep(card: BoardCard): { rule: SweepRule; members: SweepMember[] } | undefined {
    if (!isSweepCard(card) || !isSweepRule(card.sweepRule)) return undefined;
    const group = hkGroups.find((g) => g.rule === card.sweepRule);
    if (!group) return undefined;
    return {
      rule: card.sweepRule,
      members: group.members
        .filter((m) => !!m.agentId)
        .map((m) => {
          const ag = agents.find((a) => a.id === m.agentId);
          return {
            agentId: m.agentId!,
            name: m.agentName,
            ...(m.agency ? { agency: m.agency } : {}),
            /* ⚠️ OMITTED WHERE THERE IS NO SITE ON FILE — the row exists because the record is
               incomplete, so a link to nowhere is the same fault one field along. */
            ...(ag?.website ? { website: ag.website } : {}),
          };
        }),
    };
  }

  /**
   * ⚠️ ONE `updateAgent` PER ANSWERED AGENT — the same primitive the `fix` journey uses, and never
   * a batch. There is no apply-to-all above it and none here: sixteen wrong records written by one
   * press is worse than the gap those sixteen have today.
   *
   * ⚠️ AND A PARTIAL RESULT IS REPORTED AS ONE. Some writes can fail while others land, so the
   * receipt counts what ACTUALLY succeeded rather than what was attempted — a toast saying
   * "Recorded 16" over eleven successful writes is the kind of lie that is only found months later.
   */
  async function commitSweep(card: BoardCard, rows: SweepRow[]) {
    const cohort = dockSweep(card);
    if (!cohort) return;
    let done = 0;
    for (let i = 0; i < cohort.members.length; i++) {
      const fields = sweepFields(cohort.rule, rows[i] ?? emptySweepRow());
      if (!fields) continue;
      const id = cohort.members[i].agentId;
      try {
        await updateAgent(id, fields);
        /* the flag resolves only after its own write lands — the `fix` journey's rule, per agent */
        resolveTaskFlag(flagKeyForTask("data_quality_poor", id));
        done++;
      } catch {
        /* keep going: the remaining agents are independent records, and stopping at the first
           failure would discard answers the writer has already given for all of them */
      }
    }
    const total = cohort.members.length;
    if (done === 0) { flash("Couldn’t save those — try again?"); return; }
    flash(sweepOutcome(done, total, cohort.rule));
  }

  /** The one entrance — it routes to the bucket's own write, each of which is the EXISTING one. */
  async function commitFromPane(card: BoardCard, v: JourneySendValues) {
    const kind = paneJourneyKind(card);
    if (kind === "chase") return commitChaseFromPane(card, v);
    if (kind === "close") return commitCloseFromPane(card, v);
    if (kind === "offer") return commitOfferFromPane(card, v);
    /* ⚠️ THE NOTE'S COMMIT IS `quickDone` ITSELF — completion goes through the PRIMITIVE, from
       every path. My first version wrote `updateUserTask({ done: true })` inline, which is a COPY
       of `quickDone`'s user-task arm: the same write, its own receipt, its own undo. The board lock
       caught it, and it was right to — an inline completion is how the undo was bypassed once
       already. One primitive, four entrances. */
    if (kind === "note") return quickDone(card);
    if (kind === "fix") return commitFixFromPane(card, v);
    if (kind === "materials") return commitMaterialsFromPane(card, v);
    return commitSendFromPane(card, v);
  }

  /**
   * ⚠️ THE ONE CONSTRAINT OF THIS WHOLE JOURNEY: it writes `materialsWanted` AND NOTHING ELSE.
   * No status, no response count, no `revisionRound`, no pipeline date. `updateQuery` writes only
   * the fields handed to it, and the field is one — so the query's position is untouched by
   * construction rather than by care.
   *
   * ⚠️ THE ENCODER IS `agentMaterials`' OWN. `materialsWantedFromRows` is what the agent editor
   * writes through; using it here means a sample recorded on this form and one recorded there
   * cannot come out in different shapes. Nothing new is defined.
   *
   * ⚠️ AND THE TARGET IS THE QUERY, NOT THE SEND ACTIVITY — a deliberate, recorded trade-off.
   * `firestore.rules` (1a0c397) names `Activity.materials` the canonical home for what went with an
   * EVENT, because a query-level field has to carry both "what they ask for" and "what you sent".
   * But nothing writes that field yet, there is no `updateActivity` in `db.tsx`, and an imported
   * query may carry no send activity to attach to — so writing there tonight would mean a new db
   * method, a type change, and a target that does not always exist. The query field is what the
   * create pane already writes (`draftMaterialsToQuery`) and what this bucket's own predicate
   * already reads, so the gap closes today and the migration stays exactly as open as it was.
   */
  async function commitMaterialsFromPane(card: BoardCard, v: JourneySendValues) {
    const q = card.relatedRecordId ? queries.find((x) => x.id === card.relatedRecordId) : undefined;
    if (!q) return;
    const wanted = materialsWantedFromRows(v.recordRows);
    /* nothing ticked is not a save — the escape hatch is how you leave without recording */
    if (!wanted.length) return;
    const before = q.materialsWanted;
    await updateQuery(q.id, { materialsWanted: wanted });
    const undo = () => updateQuery(q.id, { materialsWanted: before ?? [] });
    setOverlay(card.key, {
      kind: "receipt", lane: "hk",
      title: card.who || "Recorded",
      line: `${willRecordText(v.recordRows, "and") ?? "Materials"} — on your query to ${card.who || "the agent"}.`,
      undo,
    });
    doneToast(card, async () => { await undo(); clearOverlay(card.key); flash("Restored"); });
  }

  /**
   * ⚠️ THE ESCAPE HATCH WRITES NO MATERIAL DATA — that is the entire reason it exists rather than
   * being "save with nothing ticked". It suppresses the task through the same permanent-dismiss
   * path every other card uses, so the query is untouched and the row does not come back.
   */
  function leaveMaterialsUnrecorded(card: BoardCard) {
    if (!card.relatedRecordId) return;
    dismissTask("materials_unrecorded", card.relatedRecordId, "permanent");
    const undo = () => upsertTaskFlag(
      flagKeyForTask("materials_unrecorded", card.relatedRecordId!), { snoozedUntil: null });
    setOverlay(card.key, {
      kind: "dismissed", lane: "hk",
      text: "Left unrecorded — the query is unchanged.",
      undo,
    });
    flash("Left unrecorded", { label: "Undo", fn: async () => { await undo(); clearOverlay(card.key); flash("Restored"); } });
  }

  /**
   * ⚠️ THE BULK COHORT IS THE SAME DERIVATION THE CARD WAS RAISED BY — `queriesMissingMaterials`,
   * not a second scan. A card that stands for ten queries and a table that lists eleven is the
   * class of disagreement this page has paid for before.
   */
  function recordSweepFor(card: BoardCard): RecordSweepRow[] | undefined {
    if (card.taskType !== "materials_unrecorded_bulk") return undefined;
    const gaps = queriesMissingMaterials({
      queries, activities, agents, manuscripts, displayName: agentPrimary,
    });
    if (!gaps.length) return undefined;
    return gaps.map((g) => {
      const ag = agents.find((a) => a.id === g.agentId);
      return recordSweepRow(g, {
        ...(ag?.agency ? { agency: ag.agency } : {}),
        sentOn: new Date(g.dateSent).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
        ...(ag?.materialsWanted ? { agentMaterials: ag.materialsWanted } : {}),
      });
    });
  }

  /**
   * ⚠️ ONE `updateQuery` PER ANSWERED ROW, AND NOTHING FOR THE REST. Same single-field write as the
   * one-query form, so the bulk path cannot record something the single path could not — and a row
   * the writer skipped or left empty is not written at all.
   */
  async function commitRecordSweep(card: BoardCard, rows: RecordSweepRow[]) {
    const writes = sweepWrites(rows);
    if (!writes.length) return;
    const before = new Map(writes.map((w) => [w.queryId, queries.find((q) => q.id === w.queryId)?.materialsWanted]));
    for (const w of writes) await updateQuery(w.queryId, { materialsWanted: w.materialsWanted });
    const undo = async () => {
      for (const w of writes) await updateQuery(w.queryId, { materialsWanted: before.get(w.queryId) ?? [] });
    };
    setOverlay(card.key, {
      kind: "receipt", lane: "hk",
      title: sweepActLabel(writes.length),
      line: "Recorded on your queries — nothing else about them changed.",
      undo,
    });
    doneToast(card, async () => { await undo(); clearOverlay(card.key); flash("Restored"); });
  }

  /**
   * ⚠️ ONE PRESS FOR THE WHOLE SET — fourteen tasks must not need dismissing one at a time. It
   * writes no material data: each query is suppressed through the same permanent-dismiss path the
   * single form's escape hatch uses.
   */
  function dismissRecordSweep(card: BoardCard, rows: RecordSweepRow[]) {
    for (const r of rows) dismissTask("materials_unrecorded", r.queryId, "permanent");
    dismissTask("materials_unrecorded_bulk", MATERIALS_BULK_RECORD_ID, "permanent");
    const undo = async () => {
      for (const r of rows) await upsertTaskFlag(flagKeyForTask("materials_unrecorded", r.queryId), { snoozedUntil: null });
      await upsertTaskFlag(flagKeyForTask("materials_unrecorded_bulk", MATERIALS_BULK_RECORD_ID), { snoozedUntil: null });
    };
    setOverlay(card.key, {
      kind: "dismissed", lane: "hk",
      text: `Left unrecorded — ${rows.length} ${rows.length === 1 ? "query is" : "queries are"} unchanged.`,
      undo,
    });
    flash("Left unrecorded", { label: "Undo", fn: async () => { await undo(); clearOverlay(card.key); flash("Restored"); } });
  }

  /**
   * ⚠️ THE RECORD CONTEXT IS READ, NEVER GUESSED. The date is the query's own `dateSent`; the
   * requirements are the AGENT's, through the same `materialRowsFromAgent` the agent editor uses.
   * An agency with nothing on file states that rather than rendering an empty affordance.
   */
  function journeyRecord(card: BoardCard) {
    const q = card.relatedRecordId ? queries.find((x) => x.id === card.relatedRecordId) : undefined;
    if (!q) return undefined;
    const ag = agents.find((a) => a.id === q.agentId);
    const asks = materialRowsFromAgent(ag?.materialsWanted);
    const asksLine = summaryFromRows(asks);
    return {
      sentOn: q.dateSent
        ? new Date(String(q.dateSent)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
        : "",
      /* ⚠️ ONLY THE ROWS THE AGENCY ACTUALLY ASKS FOR — `materialRowsFromAgent` returns all four
         whatever is stored, so handing them over wholesale would "start from" a set of unticked
         rows and read as though the button had done nothing. */
      asks: asks.filter((r) => r.on),
      asksLine: asksLine ? `They ask for ${asksLine}` : null,
    };
  }

  /**
   * ⚠️ THREE BRANCHES, THREE EXISTING WRITES — none of them new, and none of them shared.
   *   notify  → `addUserTask` per selected agent, through `reminderFields`. Writes NO activities:
   *             telling someone is something the WRITER does, in their own email; what the app can
   *             honestly do is remember that it needs doing.
   *   decide  → `recordOfferDecision`, which is the task's death condition. Accepted keeps the
   *             OFFER status historically true, so status alone can never clear the card.
   *   time    → `upsertTaskFlag`'s snooze, capped at the reply-by.
   */
  async function commitOfferFromPane(card: BoardCard, v: JourneySendValues) {
    const q = card.relatedRecordId ? queries.find((x) => x.id === card.relatedRecordId) : undefined;
    if (!q || !v.branch) return;

    if (v.branch === "decide") {
      if (!v.decision) return;
      const r = await recordOfferDecision(q.id, v.decision);
      if (!r.success) { flash(r.error || "Couldn’t record the decision — try again."); return; }
      flash(v.decision === "accepted" ? "Recorded — congratulations." : "Recorded — the querying continues.");
      return;
    }

    if (v.branch === "time") {
      if (!v.remindDate) return;
      await upsertTaskFlag(flagKeyForTask("offer_received", q.id), {
        snoozedUntil: journeyEventISO(v.remindDate, new Date().toISOString()),
      });
      flash("Quieter until then — the reply-by date still counts down.");
      return;
    }

    /* notify — one task per selected agent, through the existing builder */
    const groups = notifyGroups(q, queries, agents, userTasks);
    const rows = [...groups.pages, ...groups.queryOnly].filter((r) => v.notifySel[r.queryId]);
    if (!rows.length) return;
    /* ⚠️ `reminderFields` TAKES THE WHOLE SELECTION — one builder, one shape, and the reply-by
       becomes the tasks' due date (omitted where there is none, rather than invented). */
    const fields = reminderFields(rows, q.id, q.responseDeadline);
    let made = 0;
    for (const f of fields) {
      try { await addUserTask(f); made += 1; }
      catch { /* one refusal must not lose the others — the count states what landed */ }
    }
    /* ⚠️ THE TOAST STATES WHAT ACTUALLY LANDED, not what was asked for. A partial failure that
       reported the full number would be the app telling the writer people had been remembered who
       had not. */
    flash(made === rows.length
      ? `${made} reminder${made === 1 ? "" : "s"} added to your list.`
      : `${made} of ${rows.length} reminders added — try the rest again?`);
  }

  /**
   * ⚠️ THE CHASE RUNS `logNudge` THROUGH `nudgeWriteArgs` — the quick rail's own path, unchanged.
   * What the journey adds is the writer's day and their chosen check-back in place of the quick
   * path's stated defaults. Undo deletes the NUDGE_SENT activity, which fully unwinds it (twins,
   * `nudgeDate` fields and the flag) — the same inverse the quick rail already uses.
   */
  async function commitChaseFromPane(card: BoardCard, v: JourneySendValues) {
    const q = card.relatedRecordId ? queries.find((x) => x.id === card.relatedRecordId) : undefined;
    if (!q) return;
    const nowIso = new Date().toISOString();
    const base = quickNudgePayload({ cardKey: card.key, label: card.title, queryId: q.id, method: q.sendMethod, nowIso });
    const p = {
      ...base,
      nudgeDate: v.sentDate,
      checkBackDate: new Date(new Date(`${v.sentDate}T12:00:00`).getTime() + v.checkBackDays * 86400000).toISOString(),
      ...(v.note.trim() ? { note: v.note.trim() } : {}),
    };
    const r = await logNudge(...nudgeWriteArgs(p, nowIso));
    if (!r.success) { flash(r.error || "Couldn’t log the nudge."); return; }
    const undo = async () => {
      const acts = activitiesRef.current
        .filter((a) => a.queryId === q.id && a.activityType === ActivityType.NUDGE_SENT)
        .sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());
      if (acts[0]?.id) await deleteActivity(acts[0].id);
    };
    doneToast(card, async () => { await undo(); flash("Restored"); });
  }

  /**
   * ⚠️ THE CLOSE'S ONE QUESTION WRITES THREE DIFFERENT STATUSES, which is why it has no default and
   * why the reason is the thing that gates the commit. `CLOSE_REASONS` in `lib/todoJourneys.ts` owns
   * the mapping — read, never restated, so the journey and every other close surface agree.
   */
  async function commitCloseFromPane(card: BoardCard, v: JourneySendValues) {
    const q = card.relatedRecordId ? queries.find((x) => x.id === card.relatedRecordId) : undefined;
    if (!q || !v.reason) return;
    const target = CLOSE_REASONS.find((r) => r.key === v.reason);
    if (!target) return;
    const prev = q.status as QueryStatus;
    try {
      await updateQueryStatus(q.id, target.status, v.note.trim() || `Closed — ${target.label.toLowerCase()}`);
    } catch {
      flash("Couldn’t close that — try again?", { label: "Try again", fn: () => commitCloseFromPane(card, v) });
      return;
    }
    const undo = () => undoQueryStatus(q.id, prev, target.status);
    doneToast(card, async () => { await undo(); flash("Restored"); });
  }

  /**
   * ⚠️ THE HOUSEKEEPING SHEET'S OWN WRITE, RE-HOMED — one `updateAgent` carrying only the fields the
   * writer actually answered, then the flag the card was raised by. Nothing here is new: the same
   * three fields, the same `resolveTaskFlag`, the same toast. What changed is where it is asked.
   *
   * ⚠️ AND AN UNANSWERED GAP IS OMITTED, never written empty. `agentDataQualityNeeds` reads
   * `responseTimeWeeks === 0` as the stub and an ABSENT field as "Unknown, and that is an answer" —
   * so writing `0` or `""` for a question they skipped would not clear the gap, it would restate it
   * as a fact. Absence is a first-class state on this record and the write respects it.
   */
  async function commitFixFromPane(card: BoardCard, v: JourneySendValues) {
    const ag = card.relatedRecordId ? agents.find((a) => a.id === card.relatedRecordId) : undefined;
    if (!ag) return;
    const fields: Partial<Agent> = {};
    if (v.fixResponseWeeks.trim()) {
      fields.responseTimeWeeks = Number(v.fixResponseWeeks);
      fields.noResponseMeansNo = v.fixNoMeansNo;
    }
    if (v.fixMaterials.length) fields.materialsWanted = v.fixMaterials;
    if (v.fixMswl.trim()) fields.mswlNotes = v.fixMswl.trim();
    if (!Object.keys(fields).length) return;
    try {
      await updateAgent(ag.id, fields);
    } catch {
      flash("Couldn’t save that — try again?", { label: "Try again", fn: () => commitFixFromPane(card, v) });
      return;
    }
    /* ⚠️ THE FLAG IS RESOLVED ONLY AFTER THE WRITE LANDS. Resolving first would clear the card on a
       failed save, which is the one outcome worse than the card staying. */
    resolveTaskFlag(flagKeyForTask("data_quality_poor", ag.id));
    /* ⚠️ NO UNDO ARM. The other four journeys undo by restoring a query's PREVIOUS status, which
       `recomputeQuery` derives and this write does not touch. Here the previous state is an ABSENT
       field, and "undo" would mean writing `deleteField()` back over three fields the writer may
       have edited elsewhere in between. The agent's own editor is the honest way back.
       So the receipt says what happened and offers nothing it cannot deliver — `doneToast` takes an
       undo arm as a REQUIRED argument, which is the signature doing its job. */
    flash("Saved to the profile.");
  }

  async function commitSendFromPane(card: BoardCard, v: JourneySendValues) {
    const q = card.relatedRecordId ? queries.find((x) => x.id === card.relatedRecordId) : undefined;
    if (!q) return;
    const action = getPrimaryAction(q.status as QueryStatus);
    if (action.kind !== "mark-sent") return;
    const nowIso = new Date().toISOString();
    const base = quickSendPayload({
      cardKey: card.key, label: card.title, taskType: card.taskType, queryId: q.id,
      targetStatus: action.target as QueryStatus, isResubmit: action.markKind === "resubmit",
      method: v.method, nowIso,
    });
    /* the writer's answers replace the defaults; the SHAPE is the quick path's, so the write is */
    const p = {
      ...base,
      sentDate: journeyEventISO(v.sentDate, nowIso),
      method: v.method,
      materials: [...v.materials, ...(v.also.trim() ? [v.also.trim()] : [])],
      ...(v.note.trim() ? { note: v.note.trim() } : {}),
    };
    const prev = q.status as QueryStatus;
    try {
      await recordMaterialsSent(markSentWriteArgs(p));
    } catch {
      flash("Couldn’t record that — try again?", { label: "Try again", fn: () => commitSendFromPane(card, v) });
      return;
    }
    const undo = () => undoQueryStatus(q.id, prev, p.targetStatus);
    doneToast(card, async () => { await undo(); flash("Restored"); });
  }

  /**
   * ⚠️ THE NOTIFY BRANCH'S TWO GROUPS, THROUGH THE SAME PRESENTER §4.4 USES. `holderRows` turns
   * `NotifyRow`s into display rows with a draft-note link; the card shows only `pages`, and the
   * journey shows both because everyone still considering the manuscript should hear about an
   * offer. Narrowing the journey to `pages` would silently stop telling the query-only agents,
   * which is a behaviour change the existing notify flow never made.
   */
  function dockJourneyHolders(card: BoardCard) {
    if (card.taskType !== "offer_received" || !card.relatedRecordId) return undefined;
    const q = queries.find((x) => x.id === card.relatedRecordId);
    if (!q) return undefined;
    const ms = manuscripts.find((m) => m.id === q.manuscriptId);
    const subject = ms?.title ? `${ms.title} — an update` : "An update on my submission";
    const email = (agentId: string | undefined) => (agentId ? agents.find((a) => a.id === agentId)?.email : undefined);
    const g = notifyGroups(q, queries, agents, userTasks);
    return { holding: holderRows(g.pages, email, subject), queried: holderRows(g.queryOnly, email, subject) };
  }

  function dockTimeline(card: BoardCard): DockTimelineEvent[] {
    if (!card.relatedRecordId) return [];
    const q = queries.find((x) => x.id === card.relatedRecordId);
    const ag = q ? agents.find((a) => a.id === q.agentId) : undefined;
    /* ⚠️ §7b — THE SUPERSEDED PROVISIONAL RUNG IS DROPPED BEFORE ANYTHING ELSE. This surface is
       where the duplicate was SEEN: it does not dedupe by status, so an import's `OFFER` rung and
       the writer's later real one both drew, one above the other, the first reading
       "(imported — date needed)". Same predicate as the derivation and the Query Centre —
       `dropSupersededProvisional` — so the three cannot come to differ about which rung is real. */
    const live = dropSupersededProvisional(dockRows, (r) => ({
      status: r.resultingStatus ?? r.type,
      provisional: r.dateProvisional === true,
    }));
    /* ⚠️ ITEM 6 — AND THEN THE SAME-DAY PAIR. `dropSupersededProvisional` above handles an import
       rung superseded by a RECORDED one; it leaves a pair that is both provisional (or both real)
       exactly as it found it, which is the `Partial requested · via email` twice on one date.
       Keyed on (status, DAY), so a re-request on a different day survives — that is a real thing an
       agency does. Display only: both documents are still in Firestore. */
    const once = collapseTimelineDuplicates(live, (r) => ({
      status: r.resultingStatus ?? r.type,
      day: dayKeyOf(r.createdAt ?? r.date),
      provisional: r.dateProvisional === true,
    }));
    const kept = once
      /* ⚠️ `includeSend` — THIS SURFACE HAS NO HERO ROW. The Centre suppresses the send because it
         draws one above its timeline; the card does not, so without this the query going out was
         dropped and a full-requested card showed a single rung with no beginning. */
      .map((r, i) => ({ r, i, label: activityEventLabel(r as { activityType?: unknown; resultingStatus?: unknown }, { includeSend: true }) }))
      .filter((x) => x.label !== null);
    return kept
      .map((x) => {
        /* ⚠️ `createdAt` IS A FIRESTORE TIMESTAMP ON THESE ROWS, not the ISO string the global feed
           carries — reading it as a string yields "Invalid Date" rather than an error. */
        const raw: any = x.r.createdAt ?? x.r.date;
        const ms = raw?.toMillis ? raw.toMillis() : raw?.seconds ? raw.seconds * 1000 : Date.parse(String(raw ?? ""));
        return {
          key: x.r.id ?? `ev-${x.i}`,
          label: x.label as string,
          when: Number.isFinite(ms) ? new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "",
          /* absent where the record is silent — never inferred */
          ...(x.r.via ? { via: String(x.r.via) } : q?.sendMethod ? { via: `via ${String(q.sendMethod).toLowerCase()}` } : {}),
          /* ⚠️ ITEM 5 — A PROVISIONAL RUNG SHOWS THE EVENT AND NOTHING ELSE. The import writes its
             own bookkeeping into `note` — "Full Requested (imported — date needed)" — and the card
             rendered it as the agent's words. It is a message from the importer to itself.
             ⚠️ KEYED ON THE STORED FLAG, NEVER ON THE STRING. Matching "(imported" would be
             deriving state by reading a display string, which is the fault the whole record is
             built to avoid; `dateProvisional` is a real field and says exactly this.
             ⚠️ AND IT SUPPRESSES THE WHOLE SUB-LINE ON A PROVISIONAL RUNG, not just the
             parenthetical — a provisional rung's note is import-written by construction, and
             trimming the brackets off would leave "Full Requested" restating the label above it. */
          ...(x.r.note && x.r.dateProvisional !== true ? { note: String(x.r.note) } : {}),
          /* ⚠️ THE STATUS ITSELF, HANDED TO THE REAL `StatusDot`. It used to be a three-state ring
             derived here and painted by the card's own CSS; `StatusDot` is the app's one drawing of
             a query status and is never recreated locally. `resultingStatus ?? type` is the same
             pair `subcollectionDocToDerivable` reads, so the dot and the derivation agree about
             which field carries the status.
             ⚠️ A NUDGE HAS NO STATUS AND TAKES NO DOT — `NUDGE_SENT` is not a status change. */
          ...((st) => (st ? { status: String(st) } : {}))(x.r.resultingStatus ?? x.r.type),
        } as DockTimelineEvent;
      })
      /* ⚠️ EVERY ENTRY, OLDEST FIRST — the cap is gone. It was `.slice(-6)`, which silently dropped
         the OLDEST rungs, so a long history lost its beginning: precisely the end a reader is
         looking for when they open the record. The body scrolls and the footer is pinned below it,
         so length costs nothing now. Ascending, as `useDockActivity` orders it and as v14 draws it. */
      ;
  }

  /**
   * ⚠️ THE ACTION BUTTON NEVER COMPLETES DIRECTLY. IT OPENS THE JOURNEY, AND THE JOURNEY COMMITS.
   * No exceptions, no card kind carved out — this function's whole body is now one call, and that
   * is the point rather than an accident of refactoring.
   *
   * ⚠️ WHAT THIS REPLACED, SO IT IS NOT REINSTATED AS A "FAST PATH". It called
   * `recordMaterialsSent` inline for any card with a send spec, and `quickDone` for a user task —
   * so the two COMMONEST kinds wrote straight from the bar and the journey never opened, while
   * offer / stale / housekeeping / agent-waiting went the long way. One button, two behaviours,
   * and the split invisible from the label. The materials derivation, the conditional synopsis row,
   * the free-text field and the summary strip were all reachable only on the cards that happened
   * to fall the other way; a send recorded from here logged `sentDate: new Date()` and whatever
   * the spec assumed, with the writer never shown what was about to be written.
   *
   * ⚠️ AND THE INLINE WRITE COULD NOT STATE WHAT IT WROTE. That is the deeper reason it goes
   * rather than being kept behind a preference: a one-press record has nowhere to put the day, the
   * channel, the conditional synopsis or the note, so its speed came from asserting defaults it
   * never showed you. The journey is the only surface that can say what it is about to record.
   *
   * The completion mechanics are unchanged and stay where they always were: the journey's commit
   * runs `recordMaterialsSent` / `updateUserTask` through the same primitives, and the task going
   * away remains DERIVED — the engine stops generating it once the status moves, so nothing ticks
   * it and nothing needs to.
   */
  function dockPrimary(card: BoardCard) {
    openFlowCards([card]);
  }

  /* ⚠️ `advanceDock` IS RETIRED WITH THE INLINE WRITE (one-primary pass). It pointed the pane at
     the next card once the bar had recorded this one — and the bar no longer records anything, so
     there is no moment here to advance FROM. The journey owns its own queue and its own advance,
     which is where "offer the next item, never run it" now lives. Reinstating it would mean the
     pane moving on for a completion that happened in another surface.
     ⚠️ AND `nextInQueue` GOES WITH IT, because `advanceDock` was its only caller here — the dock's
     own ← → step walks `dockable[i ± 1]` by index and never touched it. The pure function survives
     in `lib/todoDock.ts` for any future caller; what is removed is this page's dead import. */

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
  /* ⚠️ `renderRailTools` IS DELETED, NOT ORPHANED. It drew the rail's search, filter, sort and
     add — all four of which the ported card now renders itself, because the contract draws the
     toolbar as part of the card. Leaving the function standing with no caller is the shape this
     repo has been caught by twice: code that looks live, is not, and gets hardened by someone
     who never checks whether it renders. Recoverable in git. */

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

  /**
   * ⚠️ THE LIST IS THE PORTED CARD NOW — it renders its own toolbar, body and footer, because the
   * contract draws all three as one object. The page's `.tdw-tools` and `.tdw-foot` are retired
   * with it: two surfaces stating one scope is exactly the "showing 13 of 12" fault, and the fix
   * is that there is only one place a count can be written.
   */
  function renderList() {
    const chips = railChips(boardCols);
    return (
      <TaskList
        groups={railGroups()}
        onOpen={(c) => openDock(c.key)}
        selectedKey={docked.card?.key}
        rowInputs={listRowInputs}
        search={search}
        onSearch={setSearch}
        onAdd={() => openComposer("task")}
        onExport={exportRail}
        filterActive={filterOpen}
        onFilter={() => { setSortOpen(false); setFilterOpen((v) => !v); }}
        filterMenu={filterOpen ? (
          <div className="tdb-sortmenu" role="menu">
            {chips.map((ch) => (
              <button key={ch.id} type="button" role="menuitem" aria-current={ch.id === chip}
                onClick={() => { setChip(ch.id); setFilterOpen(false); }}>
                {ch.label} <span className="tdw-mn">{ch.count}</span>
              </button>
            ))}
          </div>
        ) : null}
        sortActive={sortOpen}
        onSort={() => { setFilterOpen(false); setSortOpen((v) => !v); }}
        sortMenu={sortOpen ? (
          <div className="tdb-sortmenu" role="menu">
            {TODO_SORTS.map((so) => (
              <button key={so.id} type="button" role="menuitem" aria-current={so.id === sort}
                onClick={() => { setSort(so.id); setSortOpen(false); }}>{so.label}</button>
            ))}
          </div>
        ) : null}
      />
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



};

export default ToDoPage;
