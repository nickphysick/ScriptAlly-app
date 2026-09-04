/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useLayoutEffect, useState, useEffect, useRef } from "react";
import jsPDF from "jspdf";
import { motion, AnimatePresence } from "motion/react";
import { useScriptAllyDb } from "../lib/db";
import {
  doc,
  updateDoc,
  setDoc,
  collection,
  Timestamp,
  deleteField,
  onSnapshot,
  query,
  orderBy,
  limit
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
/* §6 — the same atomic path the Edit drawer saves its dates through; recompute derives the rest. */
import { commitQueryEdits } from "../lib/saveQueryEdits";
import { QueryStatus, Agent, Manuscript, Query, SubmissionMethod, SubmissionStatus, ActivityType, QueryMaterial, UserPlan, ComponentType , SubmissionPackage} from "../types";
import { TypeGlyph } from "./packages/TypeGlyph";
import { StatusPill, getStatusLabel } from "./StatusPill";
import { StatusDot } from "./StatusDot";
import { PillTrig, F12Popover, F12Menu, F12Panel, PopSection, PRow, Chip } from "./shell/F12Shell";
import { QueryJourneySheet } from "./queries/QueryJourneySheet";
import { PaneCard } from "./queries/PaneCard";
import { QueryCreatePane } from "./queries/QueryCreatePane";
import { emptyDraft, draftDirty, draftReady, draftToPayload, materialRowsForDraft, todayInputDate, type QueryDraft, type ReminderChoice } from "../lib/queryDraft";
import { requirements } from "../lib/createSteps";
import { prefersReducedMotion } from "../lib/reducedMotion";
import { ResponsePane, type RespStepId } from "./queries/ResponsePane";
import {
  emptyResponseDraft, responseReady, responseChips, responseDraftToPayload, OUTCOME_LABEL,
  stepsFor, OUTCOME_STATUS, OUTCOME_SEAL, type SealKind, type ResponseDraft, type RespStep,
  type ResponseOutcome,
} from "../lib/responseDraft";
import { jumpIn, advanceIn, reseatInto } from "../lib/stepStack";

/** The receipt channel for a logged query — see ToastOptions.replaces. Named once so the save and
 *  the save-and-log-another cannot end up on two channels and stack after all. */
const CREATE_RECEIPT_CHANNEL = "query-created";
/** ⚠️ A SEPARATE CHANNEL from the create receipt. Logging a query and recording a reply are two
 *  different facts; one replacing the other would delete a receipt whose undo had not been used. */
const RESPONSE_RECEIPT_CHANNEL = "query-response";
import { pickableManuscripts } from "../lib/lifecycle";
import { resolveInitialManuscriptId } from "../lib/logQuerySeed";
import { PageHeader } from "./shell/PageHeader";
import { WorkspacePageGrid } from "./shell/WorkspacePageGrid";
import { READING_PANE_FLOOR_PX } from "../lib/agentsPage";
import { queryAmbientStatus, commandBarStatus, queryBucket, queriesPulse, createPlaceLine, recordPlaceLine, agentRepliesForManuscript, consequenceLine, trackingStatCells, DAY } from "../lib/queryAmbient";
import {
  QueriesStatusFilter, filterStateFor, isOverdueForReply as isOverdueForReplyPure,
} from "../lib/queriesFilterParam";
import { getPrimaryAction } from "../lib/queryPrimaryAction";
import { PaneScroll } from "./queries/PaneScroll";
import { RecordResponseModal } from "./RecordResponseModal";
import { RecordResponseFocusForm } from "./RecordResponseFocusForm";
import { recordQueryResponse } from "../lib/recordResponse";
import { responseToastTitle, type ResponseStyle } from "../lib/responseToastTitle";
import { activityEventLabel } from "../lib/activityEvent";
import { agentLabel, agentAgencyLine, agentPrimary, agentInitials, agentWebsiteHref, sendMethodLabel } from "../lib/agentDisplay";
import { QueryCentreGrid, type GridCard } from "./queries/QueryCentreGrid";
import { QueryPanel, type PanelRung } from "./queries/QueryPanel";
import { rungFacts, waitProgress } from "../lib/queryPanelRungs";
import { cardFacts, cardMaterials, turnFor, MATERIAL_SLOTS, type Turn } from "../lib/queryCardFacts";
import { MATERIAL_ROW_NAMES } from "../lib/agentMaterials";
import {
  QUICK_FILTERS, quickCounts, GRID_GROUPS, GRID_SORTS,
  emptyGridFilters, gridFiltersAreEmpty, gridFilterCount, matchesGridFilters, type GridFilters,
  type QuickKey, type GroupKey,
} from "../lib/queryCentreGrid";
import { measureFlip, playFlip, clearFlip, type FlipRects } from "../lib/flip";

/**
 * ⚠️ EVERY COURT NAMES ITSELF. This was a ternary covering two values; extending `turnFilter` to
 * five would have left it printing "WAITING" for offers and for closed queries — a filter chip
 * confidently stating the wrong filter, which is worse than no chip at all.
 */
/**
 * ⚠️ THE GRID IS THE PAGE, ALWAYS — Phase 4. Opening a query overlays the panel instead of swapping
 * the layout, so the masthead still says Query Centre and the crumb still reads
 * `Queries / Query Centre`: you have not gone anywhere.
 *
 * ⚠️ IT IS TYPED `boolean` RATHER THAN LEFT AS THE LITERAL `true`, and that is deliberate. A literal
 * makes the record branch provably dead, at which point TypeScript stops NARROWING inside it — and
 * 2,226 lines that had typechecked for months produced three errors about a discriminated union it
 * had always narrowed correctly. The branch is deleted in Phase 6 with the reachability sweep that
 * deserves; until then it stays honest to the checker.
 */
const GRID_IS_THE_PAGE: boolean = true;

const TURN_CHIP_LABEL: Record<"move" | "wait" | "offer" | "closed", string> = {
  move: "YOUR MOVE",
  wait: "WAITING",
  offer: "OFFERS",
  closed: "CLOSED",
};
/* §1 (provenance pack) — the writer's own expected date: its field name and its one accessor. */
import { WRITER_EXPECTED_FIELD, WRITER_EXPECTED_SET_AT_FIELD, writerExpectedIso, writerExpectedWrite, resolveExpectedDate } from "../lib/expectedDate";
/* the shared date formatter — it OMITS an unparseable date rather than printing "Invalid Date" */
import { refDate } from "../lib/responseContext";
import { classifyQueryMaterial, parseAgentMaterials, SAMPLE_UNITS, SampleUnit, snapToUnit, stepAmount } from "../lib/agentMaterials";
import { formatQueryMaterial, materialLabel, materialToken, sampleMaterialText } from "../lib/materials";
import { formatListRowDate } from "../lib/listRowDate";
import { MarkSentPopover } from "./MarkSentPopover";
import { createPortal } from "react-dom";
import { NudgeModal } from "./NudgeModal";
import { queryTaskBadge } from "../lib/queryTaskBadge";
/* §5 — the list's four groups and the position figure, both derived, both composing rules that
   already exist (`queryBucket` for membership, `taskPrecedence` for the clock). */
import { GROUP_ORDER, GROUP_LABEL, listGroupFor, foldClosed, lastSendMs, listIsGrouped, type ListSection } from "../lib/queryCentreGroups";
import { exactDate, elapsedPhrase, agoLabel, daysBetween } from "../lib/elapsed";
import { nextIndex, typeAheadIndex, nearestSurvivor, pageSizeFor, isListNavKey, isTypeAheadKey, TYPEAHEAD_MS } from "../lib/listKeyboard";
/* ⚠️ §4 — NUDGE NO LONGER READS `replyTaskFor`, AND THE RULE ITSELF IS UNTOUCHED. It is the
   to-do list's rule — "should the app raise this?" — which needs a stated window, a send date and
   fourteen days of grace before it can be true. The button answers a different question ("may I
   chase?"), and gating one on the other is what made Nudge permanently grey. The list's OVERDUE
   group still composes it, through `queryCentreGroups`. */
import { nudgeStanding, nudgeReason, nudgeConfirm, nudgeTimes, nudgedAgo, scheduledReminder } from "../lib/nudgeState";
import { NUDGE_NESTED_TYPE } from "../lib/logNudge";
import { useFixedMenu } from "./forms/useFixedMenu";
import { PackagePicker } from "./reading-pane/PackagePicker";
import { QueryCentreSkeleton, SKELETON_FLOOR_MS } from "./reading-pane/QueryCentreSkeleton";
/* §2b — the shared art registry, already consumed by two other Query Centre panels. */
import { ArtSlot } from "./todo/ArtSlot";
import {
  attachablePackages, canAttachPackages, groupByOrigin, materialName,
  packageMenuRow, detachMenuRows, detachToast, withoutPackage, linkedChips,
} from "../lib/packageAttach";
import { queryPortion } from "../lib/queryPortion";
import { PackageGroup, LooseMaterials } from "./reading-pane/PackageGroup";
import { VersionLines } from "./reading-pane/VersionLines";
import { bookVersionsOf } from "../lib/bookVersions";
import { openingRead, versionsActive, listVersion, UNRECORDED_VERSION } from "../lib/queryVersions";
import { isPackageLocked, materialsLinkWrites } from "../lib/packageMetrics";
import { useConfirmAsk } from "./todo/ConfirmAsk";
import { useOpenEditQuery } from "./EditQueryHost";
import { MobileSheet } from "./shell/MobileSheet";
import { useIsMobile, useMobileChrome } from "./shell/mobileChrome";
import { QueryTimeline, buildTimelineRows } from "./reading-pane/QueryTimeline";
import { NotesThread } from "./reading-pane/NotesThread";
import type { TimelineEntryRef } from "./reading-pane/QueryTimeline";
import { useToast } from "./toast/ToastProvider";
import { deriveQueryFields } from "../lib/queryDerivation";
import { subcollectionDocToDerivable } from "../lib/recomputeQuery";
/* the correction pack — one engine, one set of guards, one undo contract */
import { previewCorrection, type CorrectionDiff } from "../lib/correctionPreview";
import { canCorrect, rootGuard, dependencyGuard, type GuardEvent, moveGuard } from "../lib/correctionGuards";
import { undoMessage, undoMoveMessage, undoStillValid, type PendingUndo } from "../lib/correctionUndo";
import { moveCandidates, moveNotices, closureDateOf, type MoveCandidate, type MoveNotices } from "../lib/correctionMove";
import { CorrectionFork, CorrectionEdit, ConsequenceSheet, MovePicker, MoveSheet } from "./reading-pane/CorrectionSheet";
import { TasksPopover } from "./TasksPopover";
import { MountCard } from "./MountCard";
import { ScriptAllyLogo } from "./ScriptAllyLogo";
import {
  kraft, parchment, PAPER_TEXTURE,
  burgundy, deepBurgundy, FONT_SERIF, FONT_MONO, mountShadow, labelColor,
  qdbCardLine,
  qdbBoldInk, qdbBoldInk2, qdbBoldMuted,
} from "../lib/designTokens";

/** An ISO date to the `<input type="date">` value the browser wants, or "" when there is none. */
const toDateInputValue = (iso?: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const normalizeStatus = (status: string | QueryStatus): QueryStatus => {
  if (!status) return QueryStatus.QUERIED;
  const s = status.trim();
  if (s.toLowerCase() === 'passed') return QueryStatus.REJECTED;
  for (const key of Object.values(QueryStatus)) {
    if (key.toLowerCase() === s.toLowerCase()) {
      return key;
    }
  }
  return status as QueryStatus;
};

// ── Contextual primary CTA ──────────────────────────────────────────────────
// The status→primary-action map (the "CTA engine") now lives in src/lib/queryPrimaryAction.ts so
// the To-do focus/ledger flows share ONE source with this command bar — behaviour here is unchanged.

// Display-only label: appends a revision marker once a query has been resubmitted as a full (v2+).
// Renders from revisionRound and never enters `status`, so every status === comparison is safe.
const statusDisplayLabel = (q: { status: QueryStatus; revisionRound?: number }): string => {
  const base = getStatusLabel(q.status);
  if (q.status === QueryStatus.FULL_SENT && (q.revisionRound ?? 1) >= 2) {
    return `${base} (v${q.revisionRound})`;
  }
  return base;
};

import {
  Search,
  Star,
  ChevronRight,
  ChevronLeft,
  Check,
  Download,
  Plus,
  Activity,
  Paperclip,
  Notebook,
  FolderLock,
  Send,
  Sparkles,
  AlertTriangle,
  Book,
  GitCommit,
  MessageSquare,
  X,
  Camera,
  Move,
  Image as ImageIcon,
  Bell,
  XCircle,
  User,
  ListChecks,
  RotateCcw
} from "lucide-react";
import { csvCell } from "../lib/csvCell";

// Materials are rendered through the single formatQueryMaterial helper (src/lib/materials.ts) —
// the one place a material (legacy string or structured QueryMaterial) becomes display text.

function formatWhatsAppDate(dateString: string): string {
  const d = new Date(dateString);
  const day = d.getDate();
  const month = d.toLocaleString("en-GB", { month: "short" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day} ${month}, ${time}`;
}

/* §3 — one vocabulary for how a query was sent: `sendMethodLabel` in lib/agentDisplay. The two
   copies that lived here — this one lower-case for a retired sentence, and `getSentViaLabel` inside
   the PDF export capitalised — had already diverged, so one query printed `email` on the page and
   `Email` in its own PDF. */

/* ── Command-bar button (v2, ref queries-hub-v2.html .c) — icon+label SIDE-BY-SIDE, flat (no fill),
   faint hover; greyed-not-hidden when disabled so the bar keeps its shape. `primary` = coffee icon
   (#6f4e37) + semibold label; `dim`/`iconOnly` = the muted PDF · ⋯ pair. Badge renders inline after
   the label. ── */
const CmdBtn = React.forwardRef<HTMLButtonElement, {
  icon: React.ReactNode;
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
  dim?: boolean;
  iconOnly?: boolean;
  destructive?: boolean;
  title?: string;
  badge?: React.ReactNode;
}>(({ icon, label, onClick, disabled, primary, dim, iconOnly, destructive, title, badge }, ref) => (
  <button
    ref={ref}
    type="button"
    title={title}
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    className="qp-c"
    style={{
      position: "relative", display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0,
      fontFamily: "'Inter',sans-serif", fontWeight: primary ? 600 : 500, fontSize: 13,
      color: disabled ? "#b7ab99" : (destructive ? "#9a3b2a" : (dim ? "var(--hub-label, #8f877b)" : "var(--hub-item, #1a1512)")),
      background: "none", border: "none", borderRadius: 9,
      padding: iconOnly ? "9px 10px" : "9px 13px",
      cursor: disabled ? "default" : "pointer", whiteSpace: "nowrap",
      opacity: disabled ? 0.35 : 1,
    }}
  >
    <span aria-hidden="true" style={{ display: "flex", alignItems: "center", color: disabled || dim || destructive ? "currentColor" : (primary ? "#6f4e37" : "#7a6f61") }}>{icon}</span>
    {label && <span>{label}</span>}
    {badge}
  </button>
));
CmdBtn.displayName = "CmdBtn";

/* ── Overflow-menu row (Close reasons + More). Left-aligned icon + label; greyed when a feature is
   stubbed this pass; destructive tint for Delete. ── */
const RibbonMenuItem: React.FC<{
  icon?: React.ReactNode; label: string; onClick?: () => void; disabled?: boolean; destructive?: boolean; title?: string;
}> = ({ icon, label, onClick, disabled, destructive, title }) => (
  <button
    type="button"
    title={title}
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    className="qp-menuitem"
    style={{
      display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left",
      background: "transparent", border: "none", borderRadius: 7, padding: "8px 10px",
      fontFamily: "'Inter',sans-serif", fontSize: 12.5, fontWeight: 500,
      color: disabled ? "#b7ab99" : (destructive ? "#9a3b2a" : "#2c2017"),
      cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.7 : 1, whiteSpace: "nowrap",
    }}
  >
    {icon && <span aria-hidden="true" style={{ display: "flex", flexShrink: 0 }}>{icon}</span>}
    <span>{label}</span>
  </button>
);
RibbonMenuItem.displayName = "RibbonMenuItem";

/**
 * ⚠️ THE LAST-VIEWED STORE IS DELETED, WRITER AND KEY, because its only reader was the auto-select
 * that made the browsing grid unreachable. It remembered which query you had open so the page could
 * restore it on the next visit — coherent when the two-pane layout WAS the page and there was
 * nowhere else to land. `?q=` is the only thing that selects now, so a stored id had nobody to tell.
 *
 * ⚠️ AND THE WRITER WENT WITH THE READER RATHER THAN SURVIVING IT. A store nothing consumes is the
 * shape this repo keeps finding late: it looks live, it costs a write on every selection, and the
 * next person to open the file has to trace it to nothing before they can be sure.
 */

/**
 * Has the writer moved BEYOND the When step? (§4)
 *
 * ⚠️ THE ORDER IS THE DRAFT'S, NOT A CONSTANT — the record stack changes shape with the outcome, so
 * "which step is after When" is a question only `stepsFor` can answer. Asking a fixed list would be
 * right for the commonest journey and wrong for the others.
 */
const pastWhen = (outcome: ResponseOutcome | null, reached: RespStepId): boolean => {
  const order = stepsFor(outcome);
  return order.indexOf(reached) > order.indexOf("when");
};

export const Queries: React.FC<{
  searchQuery: string;
  onNavigate?: (tab: string, subPageName?: string) => void;
  activeSubPage?: string;
  inShell?: boolean;
  /** v4 P2 — App's log-a-query interception hands the hub a SEED instead of opening a popup.
   *  A new object each time, so a repeat "Log query" with no seeds still fires the effect. */
  createSeed?: { agentId?: string | null; manuscriptId?: string | null } | null;
  onCreateSeedConsumed?: () => void;
  /** v4 P4 — true while /queries is the visible route. Drives the ROUTE-ENTRY load animation:
   *  pages stay mounted here, so a plain CSS mount animation would only ever run once. */
  routeActive?: boolean;
  /** The shell's Queries child, as `?status=`. Absent = the plain hub, filters untouched. */
  statusFilter?: QueriesStatusFilter;
  /**
   * ⚠️ THE VIEW IS A ROUTE AND ARRIVES AS A PROP, on the same seam as `statusFilter` and `?q=`.
   * `cards` is the browsing grid; `detail` is the two-pane surface. App.tsx derives it — `?q=<id>`
   * implies `detail`, so every existing deep link from To-do, Calendar and Noteboard opens a record
   * directly in the working view without being rewritten.
   */
  view?: "cards" | "detail";
  onSelectView?: (view: "cards" | "detail") => void;
  /** opening a card is a NAVIGATION — it sets `?q=<id>`, which is what puts the page in detail view */
  onOpenQuery?: (id: string) => void;
}> = ({ searchQuery, onNavigate, activeSubPage, inShell = false, createSeed, onCreateSeedConsumed, routeActive = false, statusFilter, view = "cards", onSelectView, onOpenQuery }) => {
  const {
    currentUser,
    manuscripts,
    agents,
    queries,
    collectionsReady,
    packages,
    /* §2 — the package's slots are version ids; the picker resolves them to names. Both stores
       are the DbProvider's own, which Queries already consumes, so this adds no import edge. */
    versions,
    activities,
    journalEntries,
    tasks,
    addJournalEntry,
    addQuery,
    addAgent,
    updateQuery,
    deleteQuery,
    recordMaterialsSent,
    recordHoldingReply,
    deleteJournalEntry,
    updateJournalEntry,
    pinJournalEntry,
    /* §6b/§6c — the stored task store the ghost rung reads, and the path that creates one */
    userTasks,
    addUserTask,
    deleteActivity, deleteActivities, readQueryActivity, moveActivity,
    editActivity,
    updateAgent,
    updateQueryStatus,
    logNudge, setQueryPackage} = useScriptAllyDb();
  const { showConfirm, showToast } = useToast();
  // Query editing is the app-level Edit Query drawer (the inline isEditMode editor is retired).
  const openEditQuery = useOpenEditQuery();
  /**
   * ⚠️ THE APP'S ONE BLOCKING-CHOICE PRIMITIVE, REUSED RATHER THAN A SECOND DIALOG BUILT (D10).
   * `useConfirmAsk` already owns Escape, the scrim, one-at-a-time and the promise — the parts worth
   * sharing. Its card wears To-do's `tdb-ask*` styling, so the ref's two-line `h5 + p` structure is
   * folded into one paragraph: the WORDS are the ref's, the shape is the primitive's. Building a
   * third confirm look for one sentence would have been the worse trade, and it is flagged.
   */
  const { ask: askConfirm, node: confirmNode } = useConfirmAsk();

  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);
  const [selectedQuery, setSelectedQuery] = useState<any | null>(null);

  /* ── Mobile Pass 1 · LIST → DETAIL (ref design-refs/mobile-concept-v1.html frames 02/03) ──
     Below md the two-pane desk presents as a pushed pair: the list full-screen, the reading
     pane a pushed detail. `mobileView` is PRESENTATION state only — the selection still exists
     on desktop's terms (the hub auto-selects), so the switch, not the selection, decides which
     pane shows. Both panes stay mounted (translated, never display:none'd), so the list's
     scroll survives the push for free. */
  const isMobile = useIsMobile();
  const { setMobileDetail } = useMobileChrome();
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  /**
   * Select a row: on mobile this is also the push.
   *
   * ⚠️ IT NAVIGATES AS WELL AS SETTING STATE, because `?q=` is the record view. Setting only local
   * state left the URL naming one query while the pane showed another — and the breadcrumb, which
   * resolves the param, would then say a different agent's name from the bar three pixels above it.
   */
  const pickRow = (id: string) => {
    setSelectedQueryId(id);
    onOpenQuery?.(id);
    setMobileView("detail");
  };
  /** The freshest closeCreate + creating flag for the shell bar's back handler (the registered
   *  spec is stable across renders, so it reads through refs — never a stale closure). */
  const closeCreateRef = useRef<(then?: () => void) => void>(() => {});
  const creatingRef = useRef(false);

  /* ── v4 P2 · INLINE QUERY CREATION ────────────────────────────────────────────────────────
     The draft is LOCAL STATE — nothing reaches Firestore until Save, which goes through the
     existing addQuery path (one creation path, and it still seeds the QUERY_SENT activity).
     `createBase` is the untouched baseline: Cancel/Esc/click-away discard silently when the
     draft still matches it, and confirm when it doesn't. */
  const [createDraft, setCreateDraft] = useState<QueryDraft | null>(null);
  const [createBase, setCreateBase] = useState<QueryDraft | null>(null);
  /* Which create-mode steps have been opened — reported up by the pane, which owns the stack. */
  const [createOpened, setCreateOpened] = useState({ when: false, what: false });
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const creating = createDraft !== null;

  /* ── CHOREOGRAPHY STATE ────────────────────────────────────────────────────────────────────
     `stashedSelection` is whatever was open when create mode started: entry clears the selected
     state, discard puts it back. `pendingSave` carries the saved id until the listener delivers
     the row. `graceRow` force-shows a saved query the filters would hide, long enough to settle
     before it collapses out behind the toast.

     ⚠️ THE DRAFT ROW AND ITS FLIP ARE GONE (v3). The list is hidden entirely while creating, so
     there was nothing for a draft row to sit in and nothing for the saved row to fly FROM — a
     hidden element measures 0, so the FLIP would have animated every save from the top of the
     window. The confirmation is now the list RETURNING with the new row in it, wearing the
     settle the list already draws. `draftIn` / `draftSaved` / `draftRowRef` went with it. */
  const [stashedSelection, setStashedSelection] = useState<string | null>(null);
  const [pendingSave, setPendingSave] = useState<
    { id: string; again?: { dateSent: string; sendMethod: SubmissionMethod; reminder: ReminderChoice; manuscriptId: string } } | null
  >(null);
  const [settleId, setSettleId] = useState<string | null>(null);
  /* ⚠️ THE EXIT PLAYS ON WRITE SUCCESS, NEVER ON CLICK. A failed save must not have already shown
     a row that then vanishes, so nothing animates until `addQuery` resolves: the button holds its
     pressed state and the takeover stays put while the write is in flight. A spinner in place is
     honest; an optimistic exit is a claim the app cannot yet make. */
  const [createExiting, setCreateExiting] = useState(false);
  /* The row that has just landed — carries the sage ring for one beat. */
  const [landedId, setLandedId] = useState<string | null>(null);
  /* ⚠️ THE ENTRANCE IS SCOPED TO ONE OPENING, which is the whole job of this flag. The stagger is
     written as descendant rules under `.qc-entering`; hung off a class that lives as long as create
     mode does, they would replay whenever their elements remounted — and picking an agent remounts
     stage 1's question and picker into stage 2's hero and stack, so choosing someone would cost
     another 410ms before the first field felt live. Cleared when the last child lands. */
  const [createEntering, setCreateEntering] = useState(false);
  /* ── RECORDING A RESPONSE (§1) ────────────────────────────────────────────────────────────
     The same takeover as create, and deliberately the same STATE SHAPE: a draft that is local
     until Save, a baseline for the dirty check, and the three motion flags. Two journeys, one
     rhythm — see StepStack, extracted for exactly this. */
  const [respDraft, setRespDraft] = useState<ResponseDraft | null>(null);
  const [respBase, setRespBase] = useState<ResponseDraft | null>(null);
  const [respQueryId, setRespQueryId] = useState<string | null>(null);
  const [respStep, setRespStep] = useState<{ active: RespStepId; reached: RespStepId }>({ active: "outcome", reached: "outcome" });
  const [respOpened, setRespOpened] = useState({ when: false });
  /* What the last change of outcome discarded. Held here rather than in the pane so it survives the
     re-render that the change itself causes, and so it can be cleared on the next deliberate move. */
  const [respDropped, setRespDropped] = useState<RespStep[]>([]);
  const [respSaving, setRespSaving] = useState(false);
  const [respError, setRespError] = useState<string | null>(null);
  const [respEntering, setRespEntering] = useState(false);
  const [respCancelling, setRespCancelling] = useState(false);
  const [respExiting, setRespExiting] = useState(false);

  /**
   * ⚠️ THE SEAL (§5, device 3) — set PAST THE WRITE, never on the click. A seal that appeared on
   * press would be a promise; this one is a receipt, and a failed save must not have already
   * stamped one.
   *
   * ⚠️ `thenExit` IS WHY THIS IS AN OBJECT AND NOT A COLOUR. The seal is the beat BEFORE the sheet
   * leaves, so its `animationend` arms the exit — one animation ending starts the next, which is
   * this page's existing law and the reason no timer sequences any of it. "Save & log another" is
   * the one save with no exit to arm: it seals, and the sheet stays for the next query.
   */
  const [seal, setSeal] = useState<{ kind: SealKind; thenExit: boolean } | null>(null);
  const recording = respDraft !== null;
  /* The control that opened it — focus goes back there on every exit, as create's does. */
  const recordTriggerRef = useRef<HTMLButtonElement>(null);
  /* The cancel exit — a DIFFERENT STATEMENT from the save, which is why it is a different flag and
     a different animation rather than a shared "exiting". Save says "the form became that row";
     cancel says "nothing happened", and is deliberately the faster of the two: undoing an opening
     should not feel like an event. */
  const [createCancelling, setCreateCancelling] = useState(false);
  /* The caller's continuation, held across the 150ms — `closeCreate(() => pickRow(id))` must still
     select that row, and the teardown that runs it now happens at the end of the motion. */
  const cancelThenRef = useRef<(() => void) | undefined>(undefined);
  /* ⚠️ "SAVE & LOG ANOTHER" IS NOT AN EXIT — it is the one path where the takeover does not leave,
     and pretending otherwise would be a lie: you never went anywhere. The body wipes and reseats in
     place while the header stays put. */
  const [createReseating, setCreateReseating] = useState(false);
  /* How many have been logged in THIS sitting. Session-only and deliberately not stored: it counts
     a stretch of work, not a fact about the account. */
  const [sessionLogged, setSessionLogged] = useState(0);
  /* ⚠️ READ FRESH AT UNDO TIME, NOT CAPTURED AT SAVE TIME. The receipt's closure is built during the
     write, when the journal entry it needs to remove has not yet come back from the listener — a
     captured array would be empty exactly when it mattered, and the entry would survive its
     query. */
  const journalEntriesRef = useRef(journalEntries);
  journalEntriesRef.current = journalEntries;
  /* Focus returns to the control that opened the takeover — leaving it on a removed node drops the
     writer at the top of the document. */
  const logTriggerRef = useRef<HTMLButtonElement>(null);
  const [graceRow, setGraceRow] = useState<{ id: string; leaving: boolean } | null>(null);

  /** Enter create mode. A seeded agent pre-fills the materials checklist from what they ask for,
   *  and counts as part of the baseline — an untouched seeded draft still discards silently. */
  const openCreate = (seed: { agentId?: string | null; manuscriptId?: string | null } = {}) => {
    /* IDEMPOTENT. Every "Log query" in the app funnels here — masthead, rail capture, dashboard,
       agent cards, manuscript plates — and a second call used to wipe the draft you were typing
       AND the stashed selection it needs to restore on discard, leaving the pane in create mode
       with no row. A seeded re-entry is a no-op too: swapping the seeded agent into a live draft
       would silently overwrite work (flagged as a decision, not implemented). The toast is what
       stops "nothing happened" reading as a broken button. */
    if (creating) {
      showToast({ message: "You're already logging a query" });
      return;
    }
    const seedAgent = seed.agentId ? agents.find((a) => a.id === seed.agentId) ?? null : null;
    // The popup's manuscript preselect, kept: honour a seeded id when it's actually pickable, else
    // fall back to the first pickable book — so a one-manuscript library doesn't open with an empty
    // picker and a disabled Save. (This is why logQuerySeed.ts survives the popup's retirement.)
    const manuscriptId = resolveInitialManuscriptId(seed.manuscriptId ?? undefined, pickableManuscripts(manuscripts));
    const base: QueryDraft = { ...emptyDraft({ agentId: seed.agentId, manuscriptId }), materials: materialRowsForDraft(seedAgent) };
    // v5 P2 — stash what was open, then clear the selected state: while you're drafting, nothing
    // else is "the query you're looking at". Discard puts it back.
    setStashedSelection(selectedQueryId);
    setSelectedQueryId(null);
    setCreateBase(base);
    setCreateDraft(base);
    setCreateError(null);
    setCreateSaving(false);
    setCreateOpened({ when: false, what: false });
    /* ⚠️ NOT ARMED UNDER REDUCED MOTION. The scope class would resolve to `animation: none` on
       every child, so `qc-in-last` would never fire and the class would sit on the pane for the
       rest of the session (see lib/reducedMotion.ts). Focus is unaffected either way: the field
       autofocuses on mount, and the entrance's completion only GUARANTEES that ending place. */
    setCreateEntering(!prefersReducedMotion());
    /* A fresh sitting starts at nothing. The tally counts this opening, so it must not carry over
       from the last one — a takeover that opened stating "3 logged" would be counting a session the
       writer has already finished. */
    setSessionLogged(0);
    setCreateReseating(false);
    setSeal(null);
  };

  /**
   * Open the response takeover. ⚠️ THE ONLY DOOR — the "Record response" primary is now the single
   * entry point in the Query Centre, which is what removing the inline composer bought: a primary
   * and a composer behaving differently were two implementations of one journey, and the primary
   * did not even record anything (it focused the composer).
   */
  const openRecord = (q: { id: string }) => {
    if (recording) return;
    const base = emptyResponseDraft(todayInputDate());
    setRespQueryId(q.id);
    setRespDraft(base);
    setRespBase(base);
    setRespError(null);
    setRespSaving(false);
    setRespOpened({ when: false });
    setRespDropped([]);
    setRespStep({ active: "outcome", reached: "outcome" });
    setRespCancelling(false);
    setRespExiting(false);
    setSeal(null);
    /* Not armed under reduced motion — `animation: none` fires no `animationend`, so the scope
       class would never be cleared (lib/reducedMotion.ts). */
    setRespEntering(!prefersReducedMotion());
  };

  const shutRecord = () => {
    /* ⚠️ THE SEAL IS CLEARED ON EVERY TEARDOWN AND EVERY FRESH OPEN. Under reduced motion it is set
       without an `animationend` to clear it, so a "Save & log another" would otherwise leave last
       query's seal sitting in the dock of the next one — a receipt for something else. */
    setSeal(null);
    setRespDraft(null);
    setRespBase(null);
    setRespQueryId(null);
    setRespError(null);
    setRespEntering(false);
    setRespCancelling(false);
    setRespExiting(false);
  };

  /** Cancel — nothing happened. Dirty drafts confirm first; the motion plays on the decision. */
  const closeRecord = () => {
    if (respCancelling) return;
    const leave = () => {
      setRespEntering(false);
      if (prefersReducedMotion()) { shutRecord(); recordTriggerRef.current?.focus(); return; }
      setRespCancelling(true);
    };
    const dirty = !!respDraft && !!respBase && JSON.stringify(respDraft) !== JSON.stringify(respBase);
    if (dirty) {
      showConfirm({
        title: "Discard this response?",
        danger: true,
        confirmLabel: "Discard",
        cancelLabel: "Keep editing",
        body: <p style={{ margin: 0 }}>Nothing has been saved yet — what you've entered will be lost.</p>,
        onConfirm: leave,
      });
      return;
    }
    leave();
  };

  /**
   * Save. ⚠️ THE WRITE GOES THROUGH `recordQueryResponse` — the app's single response path. It
   * appends the activity carrying its `resultingStatus` and lets `recomputeQuery` derive status,
   * response count, revision round and every pipeline date. Nothing here writes any of those.
   */
  const saveResponse = async () => {
    if (!respDraft || !respQueryId || !responseReady(respDraft) || respSaving) return;
    const q = queries.find((x) => x.id === respQueryId);
    if (!q || !currentUser) return;
    setRespSaving(true);
    setRespError(null);
    try {
      const agent = agents.find((a) => a.id === q.agentId) ?? null;
      /**
       * ⚠️ PHASE 3 · THE HOLDING BRANCH DOES NOT GO THROUGH `recordQueryResponse`, AND THAT IS THE
       * POINT RATHER THAN AN EXCEPTION. That function is the app's single RESPONSE path: it exists
       * to append a rung carrying a `resultingStatus` and let `recomputeQuery` derive from it. A
       * holding reply has no status, so routing it through there would mean either inventing one or
       * threading a "no status" case through the one function whose whole contract is that there
       * always is one. `buildHoldingReplyWrites` is its sibling — same twin-store shape, same
       * shared id — and the two cannot be confused because neither can produce the other's writes.
       */
      let res: { undo: () => Promise<void> | void };
      if (respDraft.outcome === "holding") {
        const r = await recordHoldingReply(q.id, {
          repliedOn: new Date(`${respDraft.dateArrived}T12:00:00`).toISOString(),
          weeks: respDraft.replyWeeks.trim() ? Number(respDraft.replyWeeks) : null,
          note: respDraft.theirWords,
        });
        if (!r.success) throw new Error(r.error || "Failed to record the reply.");
        res = r;
      } else {
      /* ⚠️ deps FIRST, then the payload — and the payload is built by a named function rather
         than assembled at the call site, so the eighteen fields it needs are stated in one place
         that can be tested without a database. */
      res = await recordQueryResponse(
        { userId: currentUser.id, query: q, agent, manuscript: { title: activeMs?.title } },
        responseDraftToPayload(respDraft),
      );
      }
      /* ⚠️ PAST THE WRITE, NEVER ON THE CLICK — a failed save must not have already animated a row
         that then reverts. Reduced motion completes directly, for want of an `animationend`.

         ⚠️ THE SEAL STAMPS FIRST AND THE EXIT FOLLOWS IT (§5). Armed together the 650ms seal would
         be cut off a third of the way through by the 220ms exit, so the seal's own `animationend`
         arms the exit — one animation ending starts the next, which is how every other transition
         on this page is sequenced and why no timer is involved.

         ⚠️ UNDER REDUCED MOTION THE SEAL IS SHOWN BUT NOT WAITED ON. `animation: none` fires no
         `animationend`, so waiting would strand the sheet open forever. The seal renders at its
         final frame — it is a receipt, and suppressing it would remove the confirmation rather than
         the movement — while the teardown runs directly, exactly as it already did. */
      const kind = OUTCOME_SEAL[respDraft.outcome!];
      if (prefersReducedMotion()) { setSeal({ kind, thenExit: false }); shutRecord(); recordTriggerRef.current?.focus(); }
      else setSeal({ kind, thenExit: true });
      showToast({
        replaces: RESPONSE_RECEIPT_CHANNEL,
        message: `${OUTCOME_LABEL[respDraft.outcome!]} recorded`,
        undo: () => res.undo(),
      });
    } catch {
      /* The takeover STAYS OPEN with its error, and nothing is animated. */
      setRespError("Couldn't save that response — please try again.");
    } finally {
      setRespSaving(false);
    }
  };

  /** The picker's inline quick-add — lifted verbatim from the retired popup, so a brand-new agent
   *  is born with exactly the defaults (and schema-valid shape) it always was. */
  const handleCreateAgentInline = async (d: { name: string; agency: string; email: string; responseTimeWeeks?: number; starRating?: number }) => {
    const payload = {
      name: d.name.trim(),
      agency: d.agency.trim(),
      email: d.email.trim(),
      website: "",
      genres: [] as string[],
      mswlNotes: "",
      starRating: ((d.starRating ?? 3) as 1 | 2 | 3 | 4 | 5),
      submissionStatus: SubmissionStatus.OPEN,
      responseTimeWeeks: d.responseTimeWeeks ?? 0,
      noResponseMeansNo: false,
      submissionMethod: SubmissionMethod.EMAIL,
      materialsWanted: ["Query Letter"],
      notes: "",
      agentNotes: "",
    };
    const result = await addAgent(payload);
    if (!result.success || !result.id) return { ok: false, error: result.error };
    const agent: Agent = {
      ...payload,
      id: result.id,
      userId: currentUser?.id || "",
      dateAdded: new Date().toISOString(),
      lastCheckedDate: new Date().toISOString(),
    };
    return { ok: true, agent };
  };

  /* ⚠️ THE DISCARD IS NOT DEFERRED INTO A REF WAITING ON SOMETHING ELSE'S MOTION. It once was —
     parked and fired by the draft row's height transitionend — and when that row was deleted the
     closure was never called, so Cancel did nothing at all: create mode simply refused to close,
     with no error anywhere.

     Fix pack 5 §2 gives Cancel its own 150ms exit, which IS a deferral, so the distinction matters:
     it waits on the TAKEOVER's own animation — the element that is leaving, which is by definition
     rendered — never on a sibling that may not exist. And under reduced motion nothing is deferred
     at all, because `animation: none` fires no `animationend` (lib/reducedMotion.ts). The hazard
     was waiting on a thing that never happens, not waiting as such.

     The selection is restored here: the stashed query if it still exists, else the first row of the
     current sort. Hoisted out of `closeCreate` because the exit's completion needs it too. */
  const shutCreate = (then?: () => void) => {
    setCreateDraft(null);
    setCreateBase(null);
    setCreateError(null);
    /* Cleared on the way out, or a takeover discarded mid-entrance would leave the scope class
       set and the NEXT opening would render its children already at rest — the stagger silently
       playing only for writers who did not change their mind. */
    setCreateEntering(false);
    setCreateCancelling(false);
    /* ⚠️ AND THE SEAL, for the same reason the entrance scope is cleared here: under reduced motion
       it is armed with no `animationend` to retire it, so a stale receipt would greet the next
       sitting. */
    setSeal(null);
    const restore = stashedSelection && queries.some((q) => q.id === stashedSelection)
      ? stashedSelection
      : (sortedListRef.current[0]?.id ?? null);
    setSelectedQueryId(restore);
    setStashedSelection(null);
    then?.();
  };

  /** The cancel exit's completion, at the end of its one gesture. */
  const finishCancelExit = () => {
    const then = cancelThenRef.current;
    cancelThenRef.current = undefined;
    shutCreate(then);
    /* ⚠️ FOCUS RETURNS TO THE CONTROL THAT OPENED IT. Leaving it on a node that has just been
       unmounted drops the writer at the top of the document. */
    logTriggerRef.current?.focus();
  };

  /** Leave create mode. Untouched → silent; dirty → confirm. `then` runs once it's actually shut
   *  (so clicking another row selects it only after the draft is resolved). */
  const closeCreate = (then?: () => void) => {
    /* Already leaving. Without this, a second Esc during the 150ms would re-arm the animation from
       its first frame — the takeover flashing back to full opacity on its way out. */
    if (createCancelling) return;
    const leave = () => {
      /* ⚠️ ONE GESTURE, AND NEVER A REVERSED STAGGER. The entrance's scope class goes first, so any
         children still arriving settle at once and the frame leaves as a single object. A staggered
         exit makes leaving feel like work, and the writer who opened this by accident has to sit
         through it. */
      setCreateEntering(false);
      if (prefersReducedMotion()) { shutCreate(then); logTriggerRef.current?.focus(); return; }
      cancelThenRef.current = then;
      setCreateCancelling(true);
    };
    if (createDraft && createBase && draftDirty(createDraft, createBase)) {
      showConfirm({
        title: "Discard this query?",
        danger: true,
        confirmLabel: "Discard",
        cancelLabel: "Keep editing",
        body: <p style={{ margin: 0 }}>Nothing has been saved yet — this draft will be lost.</p>,
        /* The motion plays on the DECISION, not on the click that raised the question — a takeover
           that started leaving while the confirm was still open would be answering for the writer. */
        onConfirm: leave,
      });
      return;
    }
    leave();
  };
  closeCreateRef.current = closeCreate;
  creatingRef.current = creating;

  /* Mobile Pass 1 — create mode IS a detail screen below md: entering it pushes to the pane
     (the draft owns it), and the shell bar's ‹ back runs the same dirty-guarded closeCreate a
     click-away does. Desktop never reads mobileView. */
  useEffect(() => {
    if (creating) setMobileView("detail");
  }, [creating]);
  const mobileDetailOn = mobileView === "detail" && (creating || selectedQueryId !== null);
  useEffect(() => {
    if (!(isMobile && mobileDetailOn)) {
      setMobileDetail("queries", null);
      return;
    }
    setMobileDetail("queries", {
      kind: "back",
      title: "Queries",
      onBack: () => {
        if (creatingRef.current) closeCreateRef.current(() => setMobileView("list"));
        else setMobileView("list");
      },
    });
    return () => setMobileDetail("queries", null);
  }, [isMobile, mobileDetailOn, setMobileDetail]);

  /* ── THE SAVE EXIT'S COMPLETION ───────────────────────────────────────────────────────────
     ⚠️ NOT `closeCreate`, which is the DISCARD door and does two things this path must not do.
     It owns the dirty-confirm — so a slow listener would put "Discard this query?" on screen
     AFTER a successful save — and it restores the stashed selection, which would override the
     saved row the `pendingSave` effect has just selected. Saving tears the draft down through
     that effect; this only ends the motion and returns focus.

     The draft nulls here as well because the effect waits on the listener: if the row never
     arrives, this is what stops the takeover sitting open over a query that was written. */
  const finishSaveExit = () => {
    setCreateExiting(false);
    setCreateEntering(false);
    setCreateDraft(null);
    setCreateBase(null);
    logTriggerRef.current?.focus();
  };

  /**
   * Undo a create — the receipt's own action (fix pack 5 §3).
   *
   * ⚠️ IT DELETES THE RECORDS THE CREATE MADE. It never writes a compensating one: that is the
   * repo's standing undo law, and it is the difference between a query that never happened and a
   * query with a cancellation stapled to it. `deleteQuery` is the existing cascade — it removes the
   * per-query activity subcollection, the global-feed twins of those activities (so the seeded
   * QUERY_SENT goes from both places), and any taskFlags — so this is one door, not a second one.
   *
   * ⚠️ JOURNAL ENTRIES ARE NOT IN THAT CASCADE. They live in a TOP-LEVEL `journalEntries`
   * collection keyed by queryId, so `deleteQuery` cannot see them, and a create that carried an
   * opening note would leave that note behind attached to a query that no longer exists. Removed
   * here first, while the query is still there to identify them by.
   *
   * (That gap is a property of `deleteQuery` itself, so the Delete button orphans them too. Fixing
   * it at source belongs in db.tsx, which another stream is holding — flagged in the report rather
   * than patched from here.)
   */
  const undoCreate = async (id: string, wasBatch: boolean) => {
    for (const j of journalEntriesRef.current.filter((e) => e.queryId === id)) {
      await deleteJournalEntry(j.id);
    }
    /* Off the screen before it goes off the database: the reading pane resolves its record from the
       selected id, and a selection pointing at a deleted query is a pane with nothing behind it. */
    setSelectedQueryId((cur) => (cur === id ? null : cur));
    setLandedId((cur) => (cur === id ? null : cur));
    setGraceRow((cur) => (cur?.id === id ? null : cur));
    await deleteQuery(id);
    /* The tally counted it; undoing it must uncount it, or the sitting reports work that is no
       longer there. `max(0, …)` because the floor is a real one — never a negative count. */
    if (wasBatch) setSessionLogged((n) => Math.max(0, n - 1));
  };

  /** The reseat's completion. The takeover never left, so there is nothing to tear down — this only
   *  ends the motion and makes sure focus is back where the next query begins. */
  const finishReseat = (pane: HTMLElement) => {
    setCreateReseating(false);
    /* The picker remounts with the agent cleared and autofocuses itself, so this is the GUARANTEE
       rather than the mechanism — and, as with the entrance, it must not take focus off a writer
       who has already started typing into it. */
    if (pane.contains(document.activeElement)) return;
    pane.querySelector<HTMLElement>(".qc-pickfield")?.focus();
  };

  /** The entrance's completion — bound to the LAST child's own animation NAME (see f12.css), which
   *  is the only deterministic way to ask `animationend` "was that the last one?". */
  const finishEntrance = (pane: HTMLElement) => {
    setCreateEntering(false);
    /* ⚠️ FOCUS ENDS IN THE FIELD; IT IS NOT GRABBED AGAIN. The field autofocuses on mount so
       typing works from the first frame — this only guarantees where focus ENDS UP. A writer who
       clicked or tabbed somewhere inside the takeover while it was arriving keeps where they went;
       stealing them back at 650ms is the behaviour that would actually eat a keystroke. */
    if (pane.contains(document.activeElement)) return;
    pane.querySelector<HTMLElement>(".qc-pickfield")?.focus();
  };

  /* `logAnother` keeps create mode open after the write instead of handing over to the saved
     record — the batch case (a morning's worth of queries in one sitting). */
  const saveCreate = async (logAnother = false) => {
    if (!createDraft || !draftReady(createDraft) || createSaving) return;
    setCreateSaving(true);
    setCreateError(null);
    try {
      const agent = agents.find((a) => a.id === createDraft.agentId) ?? null;
      const res = await addQuery(draftToPayload(createDraft, agent) as any);
      if (!res.success || !res.id) {
        // Whatever addQuery reports (a permission or network failure) surfaces in the footer bar.
        // There is NO query-count limit on the free tier — that gate was never a product rule.
        setCreateError(res.error || "Couldn't save that query — please try again.");
        return;
      }
      if (createDraft.journal.trim()) await addJournalEntry(res.id, createDraft.journal.trim());
      const newId = res.id;
      /* ⚠️ HERE, AND ONLY HERE — past every early return, so a rejected write leaves the takeover
         open with its error and no row anywhere.

         ⚠️ AND UNDER REDUCED MOTION THE CLASS IS NEVER ARMED. `animation: none` fires no
         `animationend` (see lib/reducedMotion.ts), so arming it there would leave the pane wearing
         a rule that is `opacity: 0` with no event left to clear it — every save blanking the
         reading pane for the rest of the session. The completion runs directly instead. */
      /* ⚠️ CREATE ALWAYS SEALS BURGUNDY (§5). There is one thing that can have happened here — a
         query went out — so there is nothing for the colour to vary with, and varying it would
         invent a distinction. `Save & log another` seals too and does NOT exit: the seal marks the
         save, not the leaving, and the sheet stays for the next one. */
      if (prefersReducedMotion()) {
        setSeal({ kind: "burgundy", thenExit: false });
        if (!logAnother) finishSaveExit();
      } else {
        setSeal({ kind: "burgundy", thenExit: !logAnother });
      }
      setLandedId(newId);
      /* THE RECEIPT IS THE APP'S EXISTING TOAST, not a second primitive. `showToast` already owns
         one-at-a-time replacement and the undo affordance elsewhere in this app; a receipt built
         here would be a parallel system that drifts. */
      {
        const savedAgent = agents.find((a) => a.id === createDraft.agentId) ?? null;
        const who = agentPrimary(savedAgent ?? ({} as never)) || "that agent";
        showToast({
          /* ⚠️ ONE RECEIPT AT A TIME, which is what the channel buys. Logging a second query
             without leaving create mode would otherwise leave two receipts on screen, each
             offering Undo, with nothing to say which undoes which. The tally does the counting. */
          replaces: CREATE_RECEIPT_CHANNEL,
          message: logAnother
            ? `Query to ${who} logged. Ready for the next.`
            : `Query to ${who} logged`,
          /* ⚠️ THE RECEIPT OWNS THE UNDO. `newId` is bound here, at the write — reading it back off
             the draft when the button is pressed would undo whatever is being drafted NOW, which
             after "Save & log another" is a different query entirely. */
          undo: () => undoCreate(newId, logAnother),
        });
      }
      /* The list is hidden while creating, so there is no draft row to shed a skin or to fly
         from. The effect below waits for the real row to arrive; the list returning WITH it —
         settling — is the confirmation. */
      setPendingSave({
        id: newId,
        /* The facts that outlive the agent. Captured HERE, at the write, not read back off the
           draft in the effect — by then it may already have been replaced. */
        again: logAnother ? {
          dateSent: createDraft.dateSent, sendMethod: createDraft.sendMethod,
          reminder: createDraft.reminder, manuscriptId: createDraft.manuscriptId,
        } : undefined,
      });
    } catch {
      setCreateError("Couldn't save that query — please try again.");
    } finally {
      setCreateSaving(false);
    }
  };

  /* v5 P2 — beats 2–5. The write is async, so we wait for the saved query to actually arrive in
     `queries` before handing over: until then the draft row stays put wearing its saved skin, and
     there is no gap. Once it lands we drop the draft, select the new row, and let the layout
     effect below FLIP it from the draft's old top. */
  useEffect(() => {
    if (!pendingSave) return;
    const saved = queries.find((q) => q.id === pendingSave.id);
    if (!saved) return; // the listener hasn't caught up yet
    /* ⚠️ BATCH FORK. "Save & log another" keeps create mode open: the rail grows the saved row
       exactly as a normal save does, and the draft tile RESETS rather than leaving. The agent is
       cleared because it is the one thing that must differ; the manuscript, date, send method and
       nudge are agent-INDEPENDENT facts about this sitting and carry over.
       Materials are deliberately NOT carried: they are derived from the agent's stated
       requirements, so keeping B's ticks from A would quietly claim you sent B what A asked for.
       They re-derive from the next agent (P4 adds the no-data fallback). */
    if (pendingSave.again) {
      const next: QueryDraft = {
        ...emptyDraft({ manuscriptId: pendingSave.again.manuscriptId }),
        dateSent: pendingSave.again.dateSent,
        sendMethod: pendingSave.again.sendMethod,
        reminder: pendingSave.again.reminder,
      };
      setCreateDraft(next);
      setCreateBase(next);
      /* ⚠️ THE CHIPS RESET WITH THE DRAFT. They report which steps have been OPENED, and this is a
         new query — leaving them ticked would state that the writer had confirmed a date and a
         manuscript for a record they have not looked at yet. The values carry over; the claim that
         they were checked does not. */
      setCreateOpened({ when: false, what: false });
      setSessionLogged((n) => n + 1);
      /* The body wipes and reseats in place. Not armed under reduced motion, where it would resolve
         to `animation: none` and leave no `animationend` to complete on. */
      if (!prefersReducedMotion()) setCreateReseating(true);
      setPendingSave(null);
      return;
    }
    setCreateDraft(null);
    setCreateBase(null);
    setStashedSelection(null);
    setSelectedQueryId(pendingSave.id);
    // Would the current filters hide it? Ask THE predicate, never a copy of it.
    if (!matchesFilters(saved)) setGraceRow({ id: pendingSave.id, leaving: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSave, queries]);


  // The seed from App's interception — every "Log query" launch point in the app arrives here.
  useEffect(() => {
    if (!createSeed) return;
    openCreate(createSeed);
    onCreateSeedConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createSeed]);

  
  // Refs for State and Listener Management
  const unsubscribeRef = useRef<any>(null);
  // Snapshot of the query before the last recorded response, for an instant optimistic revert on Undo.
  const preSubmissionSnapshotRef = useRef<any>(null);
  // Reverts the most recent recorded response (status, activity docs, agent pref). Set by recordQueryResponse().
  const undoFnRef = useRef<(() => Promise<void>) | null>(null);
  const [trackingEvents, setTrackingEvents] = useState<any[]>([]);

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isRecordResponseModalOpen, setIsRecordResponseModalOpen] = useState(false);
  const [isRecordResponseFocusFormOpen, setIsRecordResponseFocusFormOpen] = useState(false);
  // Mark-Sent popover — anchored to the contextual CTA via useFixedMenu so the reading panel's
  // overflow-hidden can't clip it.
  const [isMarkSentOpen, setIsMarkSentOpen] = useState(false);
  // The Mark-sent trigger now lives in the pane's command bar (pinned low), so the popover opens
  // UPWARD from it (additive placement — every other useFixedMenu caller keeps the default).
  // Desktop: anchored to the reading-pane hero button, opening downward. Mobile Pass 1: the
  // anchor moves to the floating command bar's primary (the hero button hides <md), and the
  // popover opens UPWARD from it — the trigger is pinned to the viewport foot.
  /**
   * §1 — EVERY ANCHORED POPOVER ON THIS PAGE NOW FLIPS AND CONSTRAINS, and none of them do it
   * themselves. `useFixedMenu` owns both: `auto` measures the panel and opens upward only when
   * there is genuinely no room below AND more room above, `constrain` caps the height to the room
   * that is left. The panels that grow — the menus, the task list — pin their chrome and scroll
   * their body, which is the arrangement `F12Popover` already used to stop its DONE button
   * scrolling away.
   *
   * ⚠️ THE FAULT WAS NEVER MISSING ANCHORING. All of these were already `position: fixed` off the
   * trigger's rect; what they lacked was any instruction about what to do when the trigger sits
   * low. A fixed popover with no flip is exactly as clipped as an absolute one, and looks correct
   * everywhere except the bottom of the window.
   */
  const markSentPanelRef = useRef<HTMLElement>(null);
  const { triggerRef: markSentTriggerRef, menuStyle: markSentMenuStyle } = useFixedMenu<HTMLButtonElement>(
    isMarkSentOpen,
    isMobile ? { placement: "up", constrain: true } : { placement: "auto", constrain: true, menuRef: markSentPanelRef },
  );
  // Control-ribbon secondary surfaces — Nudge (modal), Close-reasons menu (anchored upward off its
  // ribbon tile), and the Delete confirmation dialog. (v3: the More ⋯ menu was removed.)
  const [isNudgeOpen, setIsNudgeOpen] = useState(false);
  const [isCloseMenuOpen, setIsCloseMenuOpen] = useState(false);
  /* §5 — the CLOSED group's fold. Session-only and deliberately not persisted: it is a "let me look
     at that for a moment" gesture, not a preference, and a fold that survived a reload would leave
     the writer's own history hidden by a decision they made a week ago. Closed by default, and only
     offered at all once the group is long enough for folding to earn its place (`foldClosed`). */
  const [closedOpen, setClosedOpen] = useState(false);
  /**
   * ⚠️ §8's NOTES EXPANSION IS RETIRED WITH ITS SUBJECT (§1). It measured the stack's height, hid
   * "What you sent" and held the column at the height it had been — careful machinery for a real
   * problem, which was that Notes shared a column and got what was left of it. The merge removed
   * the problem rather than the symptom: there is no sibling to expand over, so `notesOpen`, the
   * measured floor, the pointerdown-away listener and the per-query reset all had nothing left to
   * do. Deleted rather than left inert, because state nobody sets is state someone re-wires.
   */
  // ⋯ overflow menu on the command bar (PDF demoted here — a rare action, chrome tidy).
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const { triggerRef: moreTrigRef, menuStyle: moreMenuStyle } = useFixedMenu<HTMLButtonElement>(isMoreOpen);
  // View tasks — the record-scoped popover (5c), anchored to the command-bar button.
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const tasksPanelRef = useRef<HTMLElement>(null);
  const { triggerRef: tasksTrigRef, menuStyle: tasksMenuStyle } = useFixedMenu<HTMLButtonElement>(
    isTasksOpen, { placement: "auto", constrain: true, menuRef: tasksPanelRef },
  );
  // Timeline composer (5a): the CTA button scrolls + focuses this; Offer/R&R + "Add more detail"
  // open the rich form pre-set via these seam props.
  const [richInitialType, setRichInitialType] = useState<QueryStatus | undefined>(undefined);
  const [richInitialDraft, setRichInitialDraft] = useState<{ dateReceived?: string; note?: string } | undefined>(undefined);
  const openRichForm = (rt: QueryStatus, draft?: { dateReceived?: string; note?: string }) => {
    setRichInitialType(rt); setRichInitialDraft(draft); setIsRecordResponseFocusFormOpen(true);
  };
  // 5b — timeline corrections. Edit reopens the composer in place; Delete confirms with the DERIVED
  // consequence (the status the query recomputes to once this entry is gone) — never a bare "sure?".
  /**
   * ══ CORRECTING THE RECORD (refs 169/170/171/172) ═══════════════════════════════════════════
   *
   * ⚠️ THE FORK COMES FIRST AND IS NOT A CONFIRMATION. "I did it wrong" and "the world moved" are
   * different OPERATIONS — one edits history, the other appends to it — so the writer says which
   * before any form appears. Branch two ROUTES to Record response; no new append flow exists.
   *
   * ⚠️ AND EVERY SHEET BELOW IS DRIVEN BY `previewCorrection`, the real engine run against the
   * proposed log. Nothing here restates what an edit will do.
   */
  const [correcting, setCorrecting] = useState<
    | { step: "fork"; entry: TimelineEntryRef }
    | { step: "edit"; entry: TimelineEntryRef }
    | { step: "sheet"; entry: TimelineEntryRef; question: string; diff: CorrectionDiff; commit: () => Promise<void>; partners: string[] }
    /* the move's two steps — choose a destination, then read what it costs on BOTH queries */
    | { step: "pick"; entry: TimelineEntryRef }
    | {
        step: "move"; entry: TimelineEntryRef; target: MoveCandidate;
        notices: MoveNotices; sourceDiff: CorrectionDiff; targetDiff: CorrectionDiff; note: string;
      }
    | null
  >(null);

  /** The log as raw docs, the shape the engine reads. */
  const asRawDocs = (evts: any[]) => evts.map((e) => ({ id: e.id, data: e as Record<string, unknown> }));

  /* ⚠️ ONE BUILDER, BOTH SIDES — the page's own, so the preview cannot model a timeline the page
     does not render. This is the injection `previewCorrection` was written for. */
  const previewFor = (proposed: any[]) => previewCorrection({
    current: asRawDocs(trackingEvents),
    proposed: asRawDocs(proposed),
    buildRows: (docs) => buildTimelineRows(docs.map((d) => ({ id: d.id, ...d.data })), activeQuery as never, activeAgent ?? null) as never,
    query: activeQuery as never,
    agencyWeeks: activeAgent?.responseTimeWeeks,
  });

  const guardEvents = (): GuardEvent[] => trackingEvents.map((e: any) => ({
    activityId: e.id, status: e.resultingStatus ?? e.type, timeMs: toMs(e.createdAt),
  }));

  /** ⚠️ ONE TOAST PER OPERATION, and the undo retires when a newer write lands (Phase 4). */
  /**
   * ⚠️ A PENDING UNDO RETIRES WHEN A NEWER WRITE LANDS ON THE SAME QUERY, and the check that found
   * this had two toasts on screen at once — the older still offering to restore a record the second
   * write had moved past. Pressing it would not have restored a previous state; it would have
   * produced a THIRD one nobody chose, which is the failure `undoStillValid` was written to prevent
   * and which nothing was calling.
   *
   * ⚠️ THE SIGNAL IS THE SET OF ACTIVITY IDS, read live at PRESS TIME rather than captured. The feed
   * is already an `onSnapshot` in this page, so the ids are current whatever the writer has done in
   * the meantime — including on a query they have since navigated away from, which a check against
   * the selected query's own log could not see.
   *
   * ⚠️ AND A RETIRED UNDO SAYS SO INSTEAD OF GOING QUIET. A button that silently does nothing is the
   * empty-closure fault wearing a different face; this one explains why it cannot act.
   */
  const activitiesRef = useRef(activities);
  useEffect(() => { activitiesRef.current = activities; }, [activities]);

  const finishCorrection = async (msg: string, restore: () => Promise<void>, queryId?: string) => {
    setCorrecting(null);
    const qid = queryId ?? selectedQueryId ?? "";
    const idsAfter = activitiesRef.current.filter((a: any) => a.queryId === qid).map((a: any) => a.id);
    const pending: PendingUndo = { queryId: qid, idsAfter, restore, message: msg };
    showToast({
      message: msg,
      undo: () => {
        const now = activitiesRef.current.filter((a: any) => a.queryId === qid).map((a: any) => a.id);
        if (!undoStillValid(pending, now)) {
          showToast({ message: "That can't be undone now — this query has changed since." });
          return;
        }
        void restore();
      },
    });
  };

  /** The subject line's date — the app's short spelling, so the sheet names the event as the row does. */
  const fmtShortISO = (iso: string): string => {
    const t = new Date(iso).getTime();
    return Number.isNaN(t) ? "" : new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const onEditEntry = (entry: TimelineEntryRef) => setCorrecting({ step: "fork", entry });

  /**
   * ⚠️ A FUNCTION, NOT A `useMemo`, AND THE REASON IS THE TDZ. `activeQuery` is declared further
   * down this component, so a memo here EVALUATES DURING RENDER against a `const` in its temporal
   * dead zone and throws — taking the whole page with it. `tsc` caught this one because the
   * reference shares the declaration's scope; the same mistake read from inside a helper typechecks
   * clean, which is how this shape has shipped before. Called from the JSX, it runs after.
   *
   * ⚠️ AN EMPTY RESULT MEANS THE FORK SHOWS NO MOVE ROW — never a disabled one. The writer's only
   * query has nowhere to send an entry, and a control that can never act is worse than its absence.
   */
  const moveTargetsFor = () => (activeQuery ? moveCandidates(queries as never, agents as never, activeQuery.id) : []);

  /**
   * ⚠️ BOTH SIDES COME FROM `previewCorrection`, RUN ONCE PER QUERY — the same engine, the same row
   * builder, twice. The target's log has to be READ (the page only subscribes to the selected
   * query's), and the target's rows are built with the TARGET's query and agent, or the preview
   * would describe the destination using the source's context.
   */
  const openMoveSheet = async (entry: TimelineEntryRef, target: MoveCandidate) => {
    if (!activeQuery) return;
    const moving = trackingEvents.find((e: any) => e.id === entry.activityId);
    if (!moving) return;

    const targetDocs = await readQueryActivity(target.queryId);
    const targetQuery = queries.find((q) => q.id === target.queryId);
    const targetAgent = agents.find((a) => a.id === targetQuery?.agentId) ?? null;

    const sourceDiff = previewFor(trackingEvents.filter((e: any) => e.id !== entry.activityId));
    const targetDiff = previewCorrection({
      current: targetDocs as never,
      proposed: [...targetDocs, { id: entry.activityId, data: moving as Record<string, unknown> }] as never,
      buildRows: (docs) => buildTimelineRows(docs.map((d) => ({ id: d.id, ...d.data })), targetQuery as never, targetAgent as never) as never,
      agencyWeeks: (targetAgent as never as { responseTimeWeeks?: number } | null)?.responseTimeWeeks ?? null,
      query: { id: target.queryId },
    });

    setCorrecting({
      step: "move",
      entry,
      target,
      /**
       * ⚠️ THE NOTICE IS GIVEN THE EVENT AND THE CLOSURE DATE (D4), so it can state which case this
       * move is rather than reciting a rule the reader has to apply. `closedAt` is the target's LAST
       * status-bearing rung, which on a closed query IS the closure — derived here from the same log
       * the status derivation reads, so the sentence and the outcome cannot disagree.
       */
      notices: moveNotices(
        target,
        entry.note,
        agentPrimary(activeAgent),
        { date: (moving as { date?: string }).date, resultingStatus: (moving as { resultingStatus?: string }).resultingStatus ?? null },
        target.closed ? closureDateOf(targetDocs as never) : null,
      ),
      sourceDiff,
      targetDiff,
      note: entry.note,
    });
  };

  /**
   * ⚠️ ONE TOAST, ONE UNDO, BOTH QUERIES — the reversal is `moveActivity`'s own closure, built from
   * documents captured before the batch. Never a toast per side: two receipts for one decision
   * leaves the writer choosing which half of a move to keep.
   */
  const commitMove = async (entry: TimelineEntryRef, target: MoveCandidate, note: string) => {
    if (!activeQuery) return;
    const fromName = agentPrimary(activeAgent);
    const res = await moveActivity(
      entry.activityId, activeQuery.id, target.queryId,
      note !== entry.note ? { note } : undefined,
    );
    if (!res.success) {
      setCorrecting(null);
      showToast({ message: res.error || "Couldn't move that entry." });
      return;
    }
    await finishCorrection(
      undoMoveMessage(entry.label, fromName, target.agentName),
      res.undo,
      activeQuery.id,
    );
  };

  /**
   * ⚠️ DELETE GOES THROUGH THE CONSEQUENCE SHEET NOW, not a status-only confirm. The old dialog
   * derived one fact — the status the query would recompute to — which was the right instinct and
   * a fraction of the answer: a removal can also drop a chapter heading, re-anchor the wait and
   * change whose window is being counted, none of which it mentioned.
   *
   * ⚠️ AND THE DEPENDENCY GUARD OFFERS BOTH RATHER THAN CASCADING. Removing a request a send
   * answers would strand the send; removing both is usually what is meant, and editing instead is
   * what is meant when only a detail was wrong.
   */
  const onDeleteEntry = (entry: TimelineEntryRef) => {
    if (!activeQuery) return;
    const evts = guardEvents();
    const me = evts.find((e) => e.activityId === entry.activityId);
    if (!me) return;

    /* the root is editable and never removable — the path out is deleting the query itself */
    const root = rootGuard(me, evts);
    if (root.kind === "route") {
      showConfirm({
        title: "This is the first entry",
        body: <p style={{ margin: 0 }}>{root.message}</p>,
        confirmLabel: "Close",
        onConfirm: async () => {},
      });
      return;
    }

    const dep = dependencyGuard(me, evts);
    const doomed = new Set<string>([entry.activityId, ...(dep.kind === "cascade" ? dep.partners.map((p) => p.activityId!) : [])]);
    const proposed = trackingEvents.filter((e: any) => !doomed.has(e.id));
    const diff = previewFor(proposed);

    const commit = async () => {
      /* ⚠️ ONE CALL, HOWEVER MANY DOCUMENTS MOVED — and it hands back the closure that reverses it.
         The undo contract (Phase 4) is one toast per operation; a loop of single deletes would have
         no inverse to give it, which is how the first wiring came to offer an Undo that did nothing. */
      const restore = await deleteActivities(Array.from(doomed));
      await finishCorrection(undoMessage(entry.label, agentPrimary(activeAgent), doomed.size), restore, activeQuery?.id);
    };

    setCorrecting({
      step: "sheet",
      entry,
      question: doomed.size > 1 ? "Remove both entries?" : "Remove this entry?",
      diff,
      commit,
      partners: dep.kind === "cascade" ? dep.partners.map((p) => p.activityId!) : [],
    });
  };

  const closePanelRef = useRef<HTMLElement>(null);
  const { triggerRef: closeTriggerRef, menuStyle: closeMenuStyle } = useFixedMenu<HTMLButtonElement>(
    isCloseMenuOpen, { placement: "auto", constrain: true, menuRef: closePanelRef },
  );
  /* §4c — the confirm hangs off the Nudge button itself; the control row sits at the top of the
     pane, so it opens downward like every other menu in that row. */
  /**
   * §6 — which of Tracking's two dates is being edited. `sent` writes the SEND date through the
   * activity log's own commit; `expected` writes the stored `responseDeadline` override.
   */
  /**
   * §7 — which of the agent's two contact fields is being added. It edits the AGENT record, not the
   * query, which is why the popover names the agent and the toast says where it landed.
   */
  const [agentEdit, setAgentEdit] = useState<null | "email" | "website">(null);
  const [agentDraft, setAgentDraft] = useState("");
  const agentEditPanelRef = useRef<HTMLElement>(null);
  const { triggerRef: agentEditTrigRef, menuStyle: agentEditStyle } = useFixedMenu<HTMLElement>(
    !!agentEdit, { placement: "auto", constrain: true, menuRef: agentEditPanelRef },
  );
  const [dateEdit, setDateEdit] = useState<null | "sent" | "expected">(null);
  const [dateDraft, setDateDraft] = useState("");
  const datePanelRef = useRef<HTMLElement>(null);
  const { triggerRef: dateTrigRef, menuStyle: dateMenuStyle } = useFixedMenu<HTMLElement>(
    !!dateEdit, { placement: "auto", constrain: true, menuRef: datePanelRef },
  );
  const [nudgeAsk, setNudgeAsk] = useState<{ title: string; body: string; bar?: { pct: number; sentLabel: string; closesLabel: string } } | null>(null);
  const nudgePanelRef = useRef<HTMLDivElement>(null);
  const { triggerRef: nudgeTriggerRef, menuStyle: nudgeAskStyle } = useFixedMenu<HTMLButtonElement>(
    !!nudgeAsk, { placement: "auto", constrain: true, menuRef: nudgePanelRef },
  );
  // Close every ribbon popover/modal whenever the reader moves to a different query.
  useEffect(() => { setIsMarkSentOpen(false); setIsNudgeOpen(false); setIsCloseMenuOpen(false); setIsTasksOpen(false); setIsMoreOpen(false); setNudgeAsk(null); }, [selectedQueryId]);
  // 5e — the delete is now WIRED to db.deleteQuery (cascades the per-query activity log + the
  // global-feed twins; models deleteAgent). No undo — a cascade restore isn't offered; the counted
  // confirm below is the safety. Clear the selection so the pane doesn't dangle on a deleted id.
  const handleDeleteQuery = (id: string) => {
    setSelectedQueryId(null);
    void deleteQuery(id);
  };

  /* The counted confirm, now through the SHARED dialog (ToastProvider) rather than a bespoke
     modal — so it wears the house treatment: terracotta outline on the destructive action, the
     safe action as the soft-pink primary on the right, and the app's focus ring. The counted body
     is unchanged: what it says is the safety, and this was only ever a styling problem. */
  const askDeleteQuery = () => {
    if (!activeQuery || !activeAgent) return;
    // Bound HERE, not read at confirm time: the shared dialog (unlike the bespoke modal it
    // replaces) isn't force-closed when the selection changes, so reading activeQuery on confirm
    // could delete a query the dialog never named.
    const id = activeQuery.id;
    const agentName = agentPrimary(activeAgent) || "this agent";
    const evCount = activities.filter(a => a.queryId === activeQuery.id).length;
    const responded = activeQuery.hasAgentResponded === true;
    showConfirm({
      title: "Delete this query?",
      danger: true,
      confirmLabel: "Delete query",
      cancelLabel: "Keep it",
      body: (
        <p style={{ margin: 0 }}>
          This permanently deletes your query to <b style={{ color: "var(--ink)" }}>{agentName}</b>
          {activeMs?.title ? <> for <b style={{ color: "var(--ink)" }}>{activeMs.title}</b></> : null}
          {evCount > 0
            ? <>, along with its <b style={{ color: "var(--ink)" }}>{evCount} tracking event{evCount > 1 ? "s" : ""}</b></>
            : <>, along with its tracking history</>}.
          {responded ? <> Your <b style={{ color: "var(--ink)" }}>response stats</b> will change.</> : null}{" "}
          <b style={{ color: "var(--terra)" }}>This can’t be undone.</b>
        </p>
      ),
      onConfirm: () => handleDeleteQuery(id),
    });
  };

  // Toast state for Undo. responseStyle is the REAL response union (or null for the
  // no-specific-type path) — typed so a phantom status string cannot compile (Tier 3 · Phase 1).
  const [undoToast, setUndoToast] = useState<{
    id: string;
    queryId: string;
    agentName: string;
    manuscriptTitle: string;
    responseStyle: ResponseStyle | null;
  } | null>(null);

  // Second toast state for status feedback of Undo
  const [feedbackToast, setFeedbackToast] = useState<{
    message: string;
    subMessage?: string;
  } | null>(null);

  // Keyset of query IDs currently undergoing undoing write
  const [undoingQueryIds, setUndoingQueryIds] = useState<Set<string>>(new Set());

  // Setup the single query listener (Fix 5)
  useEffect(() => {
    if (!currentUser || !selectedQueryId) {
      setSelectedQuery(null);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }

    // Unsubscribe from previous listener if any
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    unsubscribeRef.current = onSnapshot(
      doc(db, `users/${currentUser.id}/queries/${selectedQueryId}`),
      (snap) => {
        if (snap.exists()) {
          setSelectedQuery({ id: snap.id, ...snap.data() });
        } else {
          setSelectedQuery(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${currentUser.id}/queries/${selectedQueryId}`);
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [currentUser?.id, selectedQueryId]);

  // Setup real-time listener for the query's activity subcollection (Fix 3)
  useEffect(() => {
    if (!currentUser || !selectedQueryId) {
      setTrackingEvents([]);
      return;
    }

    const unsubscribe = onSnapshot(
      query(
        collection(db, 'users', currentUser.id, 'queries', selectedQueryId, 'activity'),
        orderBy('createdAt', 'asc')
      ),
      (snapshot) => {
        const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTrackingEvents(events);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${currentUser.id}/queries/${selectedQueryId}/activity`);
      }
    );

    return () => unsubscribe();
  }, [selectedQueryId, currentUser?.id]);

  const triggerToast = (config: {
    queryId: string;
    agentName: string;
    manuscriptTitle: string;
    responseStyle: ResponseStyle | null;
  }) => {
    // Generate unique ID for toast to prevent any stale timeout collision
    const toastId = Math.random().toString(36).substr(2, 9);
    setUndoToast({
      id: toastId,
      ...config
    });

    // Auto dismiss after 10 seconds
    setTimeout(() => {
      setUndoToast(current => {
        if (current && current.id === toastId) {
          return null;
        }
        return current;
      });
    }, 10000);
  };

  const handleUndo = async () => {
    if (!undoToast || !currentUser) return;

    const { queryId, agentName } = undoToast;
    const undoFn = undoFnRef.current;

    // Immediately dismiss toast
    setUndoToast(null);

    // Show inline loading state on the query card
    setUndoingQueryIds(prev => {
      const next = new Set(prev);
      next.add(queryId);
      return next;
    });

    // Pause the live listener and optimistically restore the pre-change snapshot so the
    // revert feels instant; we resubscribe once the revert write lands.
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }
    if (preSubmissionSnapshotRef.current) {
      setSelectedQuery(preSubmissionSnapshotRef.current);
    }

    const resubscribe = () => {
      const unsub = onSnapshot(
        doc(db, `users/${currentUser.id}/queries/${queryId}`),
        (snap) => {
          setSelectedQuery(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.id}/queries/${queryId}`);
        }
      );
      unsubscribeRef.current = unsub;
    };

    try {
      // Single shared revert: undoes status, the activity docs and any agent-pref write.
      if (undoFn) {
        await undoFn();
      }
      undoFnRef.current = null;
      resubscribe();

      setFeedbackToast({ message: "Changes undone", subMessage: agentName });
      setTimeout(() => setFeedbackToast(null), 3000);
    } catch (err) {
      console.error("Failed to undo Firestore write", err);
      resubscribe();

      setFeedbackToast({ message: "Couldn't undo — please refresh", subMessage: "" });
      setTimeout(() => setFeedbackToast(null), 3000);

      handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.id}/queries/${queryId}`);
    } finally {
      setUndoingQueryIds(prev => {
        const next = new Set(prev);
        next.delete(queryId);
        return next;
      });
    }
  };

  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);
  const [editingJournalText, setEditingJournalText] = useState("");

  // States and Handlers for Query Attachment Image Upload & Edit
  const [queryImage, setQueryImage] = useState<string | null>(null);
  const [queryImageX, setQueryImageX] = useState<number>(0);
  const [queryImageY, setQueryImageY] = useState<number>(0);
  const [queryImageScale, setQueryImageScale] = useState<number>(100);

  useEffect(() => {
    if (selectedQueryId) {
      const storedImg = localStorage.getItem(`query_image_${selectedQueryId}`);
      const storedX = localStorage.getItem(`query_image_x_${selectedQueryId}`);
      const storedY = localStorage.getItem(`query_image_y_${selectedQueryId}`);
      const storedScale = localStorage.getItem(`query_image_scale_${selectedQueryId}`);
      
      setQueryImage(storedImg || null);
      setQueryImageX(storedX ? parseInt(storedX) : 0);
      setQueryImageY(storedY ? parseInt(storedY) : 0);
      setQueryImageScale(storedScale ? parseInt(storedScale) : 100);
    } else {
      setQueryImage(null);
      setQueryImageX(0);
      setQueryImageY(0);
      setQueryImageScale(100);
    }
  }, [selectedQueryId]);

  const handleQueryImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedQueryId) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setQueryImage(base64String);
        localStorage.setItem(`query_image_${selectedQueryId}`, base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveQueryImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (selectedQueryId) {
      setQueryImage(null);
      localStorage.removeItem(`query_image_${selectedQueryId}`);
      localStorage.removeItem(`query_image_x_${selectedQueryId}`);
      localStorage.removeItem(`query_image_y_${selectedQueryId}`);
      localStorage.removeItem(`query_image_scale_${selectedQueryId}`);
      setQueryImageX(0);
      setQueryImageY(0);
      setQueryImageScale(100);
    }
  };

  const handleUpdateImageOffset = (dx: number, dy: number) => {
    if (selectedQueryId) {
      const newX = queryImageX + dx;
      const newY = queryImageY + dy;
      setQueryImageX(newX);
      setQueryImageY(newY);
      localStorage.setItem(`query_image_x_${selectedQueryId}`, String(newX));
      localStorage.setItem(`query_image_y_${selectedQueryId}`, String(newY));
    }
  };

  const handleUpdateImageScale = (newScale: number) => {
    if (selectedQueryId) {
      setQueryImageScale(newScale);
      localStorage.setItem(`query_image_scale_${selectedQueryId}`, String(newScale));
    }
  };

  const handleResetImagePosition = () => {
    if (selectedQueryId) {
      setQueryImageX(0);
      setQueryImageY(0);
      setQueryImageScale(100);
      localStorage.setItem(`query_image_x_${selectedQueryId}`, "0");
      localStorage.setItem(`query_image_y_${selectedQueryId}`, "0");
      localStorage.setItem(`query_image_scale_${selectedQueryId}`, "100");
    }
  };
  
  // States for Agent Notes card
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [notesFade, setNotesFade] = useState({ top: false, bottom: false });
  
  // Left Filters state (configured to always align with Agents-style)
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<string[]>(["All"]);
  /**
   * Part E, D11 — filter by version, alongside the existing filters.
   *
   * ⚠️ `null` IS "NOT FILTERING", NOT "NO VERSION". A writer wanting the queries whose version is
   * unrecorded picks `UNRECORDED_VERSION`; `null` is the resting state. Collapsing the two would
   * make the resting list mean "show me the ones I know nothing about".
   */
  const [versionFilter, setVersionFilter] = useState<string | null>(null);
  /* ── F12 filter model (ref queries-hub-v14.html filter popover) ──
     turn — WHOSE TURN radio, derived from the CTA engine's queryBucket (the ONE source of
     truth): "move" = writer's turn, "wait" = agent's court; never a second derivation.
     statusSel — exact QueryStatus enum strings, multi-select (empty OR full set = no filter).
     needsOverdue / needsTasks — the NEEDS ATTENTION checkboxes, both derived (reply overdue
     from responseDeadline while waiting; open tasks from the derived tasks array). */
  /**
   * ⚠️ FIVE VALUES NOW, AND THE FIRST THREE ARE UNTOUCHED. The browsing grid's quick filters and
   * the detail popover's "Whose turn" radio are ONE state, deliberately: two controls over one
   * narrowing is how a page comes to show a set that neither control claims to have chosen.
   *
   * ⚠️ `offer` AND `closed` SPLIT WHAT `queryBucket` CALLS `closed`, which is the grid's one
   * documented departure from the CTA engine's split (see `queryCardFacts.test.ts`, which locks it
   * as exactly one divergence). An offer is the least closed thing that can happen to a query; the
   * agent list already reads it that way. The two `queryBucket` lines below are left EXACTLY as
   * they were — `queryBucket.test.ts` asserts them verbatim, and they are still the whole of how
   * "move" and "wait" are decided.
   */
  const [turnFilter, setTurnFilter] = useState<"all" | "move" | "wait" | "offer" | "closed">("all");
  /**
   * ⚠️ THE GRID'S GROUPING IS LOCAL AND UNPERSISTED, and that is deliberate. It is a way of READING
   * the set you already chose, not a filter — nothing is hidden by it, so nothing is lost by it
   * resetting. Persisting it would mean arriving at a page arranged by a question you asked last
   * week and cannot see you asked.
   */
  const [gridGroup, setGridGroup] = useState<GroupKey>("none");
  /**
   * ⚠️ THE THREE FACETS THE PAGE DID NOT HAVE — agency, how it was sent, and what went with it.
   * `GridFilters` and `matchesGridFilters` were built and unit-locked in §3a and mounted NOWHERE,
   * which is the "hardening something nothing renders" fault this repo has an audit about. This is
   * the wiring; the derivation is unchanged.
   *
   * ⚠️ SEPARATE FROM `statusSel` AND `turnFilter` DELIBERATELY. Those are the page's own facets and
   * the record view's popover reads them; these are the ref's, and folding them into one bag would
   * make `resetAllFilters` a thing that clears two vocabularies at once.
   */
  const [gridFilters, setGridFilters] = useState<GridFilters>(emptyGridFilters);
  const toggleFacet = (facet: keyof GridFilters, value: string) =>
    setGridFilters((f) => {
      const next = new Set(f[facet]);
      if (next.has(value)) next.delete(value); else next.add(value);
      return { ...f, [facet]: next };
    });
  const [groupPopOpen, setGroupPopOpen] = useState(false);

  /**
   * ⚠️ THE `/` HINT IS WIRED, NOT DRAWN. The ref puts a keycap inside the search field; this repo
   * has a standing rule three files over (`SearchPalette.tsx`) that "a hint for a key that does
   * nothing is worse than no hint: it teaches a gesture and then fails silently". So either the key
   * works or the cap comes off.
   *
   * ⚠️ AND `/` IS UNOWNED, WHICH IS WHY THIS IS SAFE. `usePalette` registers ⌘K and nothing else;
   * grepping found no other `/` handler. One registration, as the shell's rule requires.
   *
   * ⚠️ SKIPPED WHILE AN EDITABLE HAS FOCUS — otherwise typing a slash into any field on the page
   * would yank the cursor into this one.
   */
  const browseSearchRef = useRef<HTMLInputElement>(null);
  const [statusSel, setStatusSel] = useState<QueryStatus[]>([]);     // committed live (no draft/Apply)
  const [selectedManuscriptFilter, setSelectedManuscriptFilter] = useState<string>("All");
  const [needsOverdue, setNeedsOverdue] = useState(false);

  /* ── THE ?status= FILTER (shell-rebuild pack, Phase 3) ──
     The shell's four Queries children are this same hub under different filters. The param is
     APPLIED to the filter state the hub ALREADY models — it never becomes a fifth filter with
     its own pipeline, because two filter models over one list is exactly how a nav entry and the
     page it opens come to disagree.

     ⚠️ IT ARRIVES AS A PROP, NOT FROM useLocation. Queries renders in the app's router but its
     specs do not mount one; reaching for the router here would make every existing Queries spec
     depend on a provider it has never needed. App.tsx already reads params for `?q=` — this
     rides the same seam.

     Re-running only when the PARAM changes is deliberate: navigating to a child sets the
     filters, and any hand-adjustment you make afterwards survives, because the effect has
     nothing new to say. */
  useEffect(() => {
    if (!statusFilter) return;
    const next = filterStateFor(statusFilter);
    setTurnFilter(next.turn);
    setStatusSel(next.statusSel);
    setNeedsOverdue(next.needsOverdue);
  }, [statusFilter]);
  const [needsTasks, setNeedsTasks] = useState(false);
  const [filterPopOpen, setFilterPopOpen] = useState(false);
  const [sortPopOpen, setSortPopOpen] = useState(false);

  /* The shortcut reads these through refs rather than closing over them: the listener is bound
     once per create session, and a stale closure would keep answering with the readiness the
     draft had when it opened. */
  const createReadyRef = useRef(false);
  const createSavingRef = useRef(false);
  const saveCreateRef = useRef<() => void>(() => {});

  /**
   * ⚠️ ESCAPE IS THE SHEET'S NOW (§3), AND THERE MUST BE EXACTLY ONE. Two window-level listeners
   * both calling `closeCreate()` would run the dirty guard twice — two confirm dialogs stacked on
   * one keypress, the second asking about a draft the first has already discarded. `useOverlay`
   * binds it for both journeys, from the first frame of the entrance, which is what the deleted
   * record-side comment was protecting and remains true.
   *
   * ⚠️ THE POPOVER GATE (`filterPopOpen || sortPopOpen`) WENT WITH THEM, AND IS NOT NEEDED. It let
   * an open Filter/Sort popover own Escape first — a real precedence problem while the journey and
   * the list controls shared one page-level listener. They no longer do: the popovers are in the
   * list head BEHIND the scrim, on a background that is `inert` while the sheet is open, so neither
   * can be open at the same time as a journey.
   *
   * What is kept below is the half that was never about Escape.
   */
  // ⌘/Ctrl+Enter SAVES FROM ANYWHERE in create mode — including inside the notes textarea, where
  // plain Enter is a newline and therefore cannot be the finish key. Gated on the same readiness
  // the buttons read, so the shortcut can never do what a disabled button would not.
  useEffect(() => {
    if (!creating) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || !(e.metaKey || e.ctrlKey)) return;
      if (!createReadyRef.current || createSavingRef.current) return;
      e.preventDefault();
      saveCreateRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [creating]);

  /**
   * ══ §8 · THE FILTER AND SORT PANELS ═══════════════════════════════════════════════════════
   *
   * Portalled, anchored through `useFixedMenu` — the page's ONE anchoring primitive, which the
   * mark-sent popover, the close menu, the tasks surface and both editors above already use. A
   * third mechanism would be the third thing to keep in step.
   *
   * ⚠️ THREE OPTIONS, EACH FOR A MEASURED FAULT. `align: "right"` because a 288px panel hung off
   * the LEFT of a 40px icon reached 248px across the pane beside it. `placement: "auto"` so it
   * flips above when there is no room below — measured at 1024×900 running 85px past the fold,
   * with the foot (and its Done) at 984 against a 900px window. `constrain` because capping the
   * BODY at 70vh was never enough: the head and the foot sit outside it, so the panel was always
   * taller than the limit it appeared to have.
   *
   * ⚠️ AND `auto` NEEDS THE MENU'S REAL HEIGHT, which is why each passes a ref — the flip is
   * decided by measurement, not by a guess at how tall a filter panel is.
   */
  const filterPopRef = useRef<HTMLElement>(null);
  const sortPopRef = useRef<HTMLElement>(null);
  const { triggerRef: filterTrigRef, menuStyle: filterMenuStyle } = useFixedMenu<HTMLButtonElement>(
    filterPopOpen, { placement: "auto", align: "right", constrain: true, menuRef: filterPopRef },
  );
  const { triggerRef: sortTrigRef, menuStyle: sortMenuStyle } = useFixedMenu<HTMLButtonElement>(
    /* ⚠️ `auto` RATHER THAN A FIXED SIDE — these three sit in a row, so which of them is past the
       midline changes with the viewport and with the cap. A hard-coded side is right at one width. */
    sortPopOpen, { placement: "auto", align: "auto", constrain: true, menuRef: sortPopRef },
  );
  /* The grid's Group control. Same anchoring contract as Sort — one popover mechanism on this
     page, never a second. It aligns LEFT because it sits at the left of the quick row. */
  const groupPopRef = useRef<HTMLElement>(null);
  const { triggerRef: groupTrigRef, menuStyle: groupMenuStyle } = useFixedMenu<HTMLButtonElement>(
    groupPopOpen, { placement: "auto", align: "auto", constrain: true, menuRef: groupPopRef },
  );
  // 5d — reading-pane click-to-pick: send method + manuscript, constrained to valid values, written
  // straight to the query (updateQuery is a plain patch; both keys are in the query update allowlist)
  // with an undo. The Edit drawer stays the home for everything else (agent, dates, materials…).
  const [methodPickOpen, setMethodPickOpen] = useState(false);
  const methodPanelRef = useRef<HTMLElement>(null);
  const { triggerRef: methodPickTrigRef, menuStyle: methodPickMenuStyle } = useFixedMenu<HTMLButtonElement>(
    methodPickOpen, { placement: "auto", constrain: true, menuRef: methodPanelRef },
  );
  // Phase 6 — the What-you-sent sample-materials inline editor (unit toggle + quantity). Wired to the
  // existing QueryMaterial.type/quantity via updateQuery — no new fields.
  /* §5 — the Attach menu and the Other free-text editor. Both portal through the page's own
     `F12Menu` / `F12Popover`, anchored by `useFixedMenu`, which already close on Escape and on an
     outside click. A second popover primitive on this page would be a third way to open a menu. */
  /**
   * §5 — the per-chip popover. ONE popover, anchored to whichever chip opened it, rather than one
   * per chip: the content is a function of the material, and three mounted popovers would be three
   * places for the open state to disagree.
   *
   * ⚠️ THE ANCHOR IS ASSIGNED FROM THE CLICK, the pattern the send-method picker already uses —
   * `useFixedMenu` positions against `triggerRef.current`, so handing it the element that was
   * actually pressed is what keeps the popover under the right chip after the row reflows.
   */
  /**
   * §2 — which pill's editor is open. `oth` carries the ITEM as well, because "Other" is free text
   * and the editor has to save back over the one it opened rather than appending a second.
   */
  const [matPop, setMatPop] = useState<null | "ql" | "syn" | "smp" | "oth">(null);
  const [otherEditing, setOtherEditing] = useState<string | QueryMaterial | null>(null);
  const matPopPanelRef = useRef<HTMLElement>(null);
  /* §1 — anchored, flipping and constrained exactly as the filter and sort panels are */
  const { triggerRef: matPopTrigRef, menuStyle: matPopStyle } = useFixedMenu<HTMLElement>(
    !!matPop, { placement: "auto", constrain: true, menuRef: matPopPanelRef },
  );
  const openMatPop = (key: "ql" | "syn" | "smp" | "oth", el: HTMLElement) => {
    (matPopTrigRef as React.MutableRefObject<HTMLElement | null>).current = el;
    setMatPop(key);
  };
  /* ⚠️ FOCUS RETURNS TO THE CHIP THAT OPENED IT (§6) — a popover that closes into nowhere ends the
     keyboard session, and the next Tab restarts at the page's first control. */
  const closeMatPop = () => { const el = matPopTrigRef.current; setMatPop(null); setOtherEditing(null); el?.focus(); };
  const [addMatOpen, setAddMatOpen] = useState(false);
  /**
   * §2 — the package picker. Anchored to the same Attach chip the menu hangs off, because the menu
   * is gone by the time this opens and a popover needs something on screen to hang from.
   */
  const [pkgPickOpen, setPkgPickOpen] = useState(false);
  const pkgPickPanelRef = useRef<HTMLElement>(null);
  const { triggerRef: pkgPickTrigRef, menuStyle: pkgPickStyle } = useFixedMenu<HTMLElement>(
    pkgPickOpen, { placement: "auto", constrain: true, menuRef: pkgPickPanelRef },
  );
  /* §1 — the reported fault: this had the primitive and never asked it to flip or cap. */
  const addMatPanelRef = useRef<HTMLElement>(null);
  const { triggerRef: addMatTrigRef, menuStyle: addMatMenuStyle } = useFixedMenu<HTMLButtonElement>(
    addMatOpen, { placement: "auto", constrain: true, menuRef: addMatPanelRef },
  );
  const [otherText, setOtherText] = useState("");
  /* ⚠️ THE SHARED `SampleUnit`, NOT A LOCAL TRIPLE. This page had its own
     `["pages","chapters","words"]` — the same concept the agent list's Materials editor already
     owned, spelled differently and with no physics behind it. Two implementations of one idea is
     the pattern this repo keeps paying for. */
  const [sampleUnit, setSampleUnit] = useState<SampleUnit>("Pages");
  const [sampleQty, setSampleQty] = useState("");
  /* F12 sort — grouped Activity / Dates / Pipeline (ref sort popover). Default: last activity. */
  const [sortKey, setSortKey] = useState<string>("last_activity");
  /* Legacy shim — the hidden (display:none) mobile filter region still references this;
     nothing in the F12 chrome drives it. Cleanup candidate. */
  const [sortOption, setSortOption] = useState<string>("Newest first");
  const [devTheme, setDevTheme] = useState<"burgundy" | "slate" | "emerald">("burgundy");
  const [filterAccordionOpen, setFilterAccordionOpen] = useState(true);
  const [groupAccordionOpen, setGroupAccordionOpen] = useState(false);
  const [sortAccordionOpen, setSortAccordionOpen] = useState(false);

  const THEMES = {
    burgundy: {
      name: "Burgundy Heritage",
      primary: "#7c3a2a",
      primaryHover: deepBurgundy, // consolidated on designTokens' #6b3023 (Tier 3+4 · Phase 10) — the drifted #632e22 twin is gone
      primaryLight: "#FAF1EF",
      primaryDark: "#3a1c14",
      bgMain: "#FDF8F6",
      bgContainer: "#FBF6F4",
      borderMain: "#EBDCD3",
      borderLight: "border-[#EBDCD3]/60",
      textPrimary: "text-[#3a1c14]",
      textAccent: "text-[#7c3a2a]",
      bgSelected: "bg-[#FDF8F6]",
      bgHover: "hover:bg-[#FBF6F4]",
      borderLeftSelected: "3.5px solid #7c3a2a",
      timelineDot: "bg-[#7c3a2a]",
      timelineDotBorder: "border-[#c9a89e]",
      timelineLine: "bg-[#e8d5cc]",
      starRating: "text-[#BA7517]",
      cardHeaderBg: "bg-[#7c3a2a]",
      primaryRGB: "124, 58, 42",
      accentRGB: "124, 58, 42",
      primaryLightRGB: "250, 241, 239",
      whiteCardBg: "#ffffff",
      outerBg: "#F5F0EA",
      containerMainBg: "#FAFAF9",
      folderRailBg: "#efefef"
    },
    slate: {
      name: "Slate Minimalist",
      primary: "#1e293b",
      primaryHover: "#0f172a",
      primaryLight: "#f1f5f9",
      primaryDark: "#0f172a",
      bgMain: "#f8fafc",
      bgContainer: "#f1f5f9",
      borderMain: "#cbd5e1",
      borderLight: "border-slate-200/60",
      textPrimary: "text-slate-900",
      textAccent: "text-slate-800",
      bgSelected: "bg-slate-200",
      bgHover: "hover:bg-slate-50",
      borderLeftSelected: "3.5px solid #1e293b",
      timelineDot: "bg-[#1e293b]",
      timelineDotBorder: "border-[#94a3b8]",
      timelineLine: "bg-[#cbd5e1]",
      starRating: "text-slate-600",
      cardHeaderBg: "bg-slate-800",
      primaryRGB: "30, 41, 59",
      accentRGB: "30, 41, 59",
      primaryLightRGB: "241, 245, 249",
      whiteCardBg: "#ffffff",
      outerBg: "#f1f5f9",
      containerMainBg: "#f8fafc",
      folderRailBg: "#e2e8f0"
    },
    emerald: {
      name: "Oxford Library",
      primary: "#1b4332",
      primaryHover: "#122a1f",
      primaryLight: "#f4f6f0",
      primaryDark: "#0c1f16",
      bgMain: "#fdfbf7",
      bgContainer: "#ecefe6",
      borderMain: "#d8dbcf",
      borderLight: "border-[#d8dbcf]/60",
      textPrimary: "text-[#112211]",
      textAccent: "text-[#1b4332]",
      bgSelected: "bg-[#e2e6d8]",
      bgHover: "hover:bg-[#FAF9F4]",
      borderLeftSelected: "3.5px solid #1b4332",
      timelineDot: "bg-[#1b4332]",
      timelineDotBorder: "border-[#aab199]",
      timelineLine: "bg-[#d8dbcf]",
      starRating: "text-[#854d0e]",
      cardHeaderBg: "bg-[#1b4332]",
      primaryRGB: "27, 67, 50",
      accentRGB: "27, 67, 50",
      primaryLightRGB: "244, 246, 240",
      whiteCardBg: "#ffffff",
      outerBg: "#ecefe6",
      containerMainBg: "#fdfbf7",
      folderRailBg: "#dfe3d6"
    }
  };

  const curTheme = THEMES[devTheme];
  
  // Quick list search
  const [listSearch, setListSearch] = useState("");
  // List-header dropdowns (Filter / Sort) — the menus themselves are built in a later phase.
  // (filterMenuOpen/sortMenuOpen retired with the list-header menus — filtering moved to the bar.)

  // Journal text input
  const [journalInput, setJournalInput] = useState("");

  // Chat scroll container ref
  const chatContainerRef = React.useRef<HTMLDivElement>(null);
  /**
   * ⚠️ THE LIST'S EDGE FADES ARE GONE, AND THEY HAD ALREADY STOPPED RENDERING (fix pack §1). The
   * state was computed on every scroll, every resize and every ResizeObserver burst — rAF-throttled,
   * with a timeout fallback, an observer on two elements and a bail-out guard against loops — and
   * `listFade` was READ BY NOTHING. A whole mechanism, carefully built, driving no pixels.
   *
   * ⚠️ AND THE FADE SHOULD NOT COME BACK. A fade at the foot of this list claims there is more below
   * it; directly beneath sits a foot stating "Showing 24 of 24", so the two contradict each other on
   * one screen. Scroll is signalled by the scrollbar and by that count.
   *
   * The ref survives because the rows container still needs one for keyboard scroll-into-view.
   */
  const listScrollRef = React.useRef<HTMLDivElement>(null);
  // Stable refs for keyboard navigation (updated each render before return)
  const sortedListRef = useRef<any[]>([]);
  const selectedQueryIdRef = useRef<string | null>(null);

  // Contextual action states
  const [showActionDropdown, setShowActionDropdown] = useState(false);

  // Query editing now lives entirely in the Edit Query drawer (openEditQuery) — the inline
  // isEditMode editor and its edit-state are retired. The reading pane below is view-only.

  /**
   * ══ THE PARAM IS THE SELECTION ════════════════════════════════════════════════════════════════
   *
   * ⚠️ THIS EFFECT USED TO AUTO-SELECT ON LOAD AND IT MADE THE GRID UNREACHABLE. Its fallback read
   * the LAST-VIEWED query out of storage and selected it whenever nothing was selected — legacy
   * behaviour from when the two-pane layout WAS the page, and harmless while there was nowhere else
   * to be. With `?q=` meaning "record view", it fired on every arrival at `/queries`, so the browsing
   * grid could not be reached at all: the page opened straight into a record.
   *
   * ⚠️ AND IT NEVER CLEARED, WHICH IS THE SECOND HEAD OF THE SAME FAULT. `← All queries` deletes the
   * param and navigates; the effect saw `activeSubPage` fall back to its default, failed its `find`,
   * and dropped through to the storage restore — so the back link re-selected the query it had just
   * left. Either fault alone would have been enough; both together made the symptom look like the
   * link was inert.
   *
   * ⚠️ NOTHING SELECTS IMPLICITLY NOW. The param is read in BOTH directions — present and resolvable
   * selects, absent clears — so there is exactly one place a selection can come from, and it is one
   * a reader can see in the address bar.
   */
  useEffect(() => {
    const wanted = activeSubPage && activeSubPage !== "All queries"
      && activeSubPage !== "Queries database" && activeSubPage !== "Query database"
      ? activeSubPage : null;
    if (wanted && queries.some((q) => q.id === wanted)) {
      if (selectedQueryId !== wanted) {
        setSelectedQueryId(wanted);
        /* Deep-linked arrival: bring the row into the middle of the list viewport so it lands clear
           of both edge fades. Only on the selection CHANGE — not on every data tick. */
        document.getElementById(`query-row-${wanted}`)?.scrollIntoView({ block: "center" });
      }
      return;
    }
    /* ⚠️ CLEARED ONLY WHEN THE PARAM IS GENUINELY ABSENT, never merely unresolvable. A `?q=` naming a
       query that has not loaded yet must not clear the selection on the way past — that would race
       the data and drop the reader back to the grid on a slow connection. */
    if (!wanted && selectedQueryId !== null) setSelectedQueryId(null);
  }, [queries, selectedQueryId, activeSubPage]);

  // The active query + its agent/manuscript, resolved live. The reading pane is view-only EXCEPT the
  // 5d click-to-pick shortcuts (send method + manuscript); everything else edits via the Edit Query
  // drawer (openEditQuery) — agent, dates, materials, journal, corrections.
  const activeQuery = selectedQueryId ? (selectedQuery || queries.find(q => q.id === selectedQueryId)) : null;
  const currentStatus = activeQuery?.status ?? selectedQuery?.status;
  const activeAgent = activeQuery ? agents.find(a => a.id === activeQuery.agentId) : null;
  const activeMs = activeQuery ? manuscripts.find(m => m.id === activeQuery.manuscriptId) : null;
  /**
   * The active manuscript's BOOK versions — named orderings, NOT the `versions` subcollection, which
   * holds materials. See the note on `BookVersion` in types.ts.
   *
   * ⚠️ READ THROUGH `bookVersionsOf`, the one defended accessor, so a malformed stored value cannot
   * reach four surfaces raw.
   */
  const activeBookVersions = bookVersionsOf(activeMs ?? null);
  // 5d — click-to-pick writers (constrained values, plain updateQuery + undo). No cascade needed:
  // sendMethod is a display field; manuscriptId reassignment is a plain patch (historical activities
  // keep their own manuscriptId — the same derived-over-stored limitation the drawer has).
  const pickSendMethod = (m: SubmissionMethod) => {
    setMethodPickOpen(false);
    if (!activeQuery || m === activeQuery.sendMethod) return;
    const id = activeQuery.id, prev = activeQuery.sendMethod;
    void updateQuery(id, { sendMethod: m });
    showToast({ message: `Sent by ${sendMethodLabel(m)}`, undo: () => void updateQuery(id, prev ? { sendMethod: prev } : { sendMethod: deleteField() as unknown as string }) });
  };
  // Phase 6 — What-you-sent material writes. The query's own materialsWanted is the record of what was
  // sent; when it's empty we DISPLAY the agent's expected set, and the first edit promotes that set onto
  // the query. Writes patch materialsWanted (allowlisted) with an undo restoring the prior stored value.
  /**
   * ⚠️ THE CANONICAL CLASSIFIER, NOT THREE GUESSES. These were `includes("query")`,
   * `includes("synopsis")`, and — the live bug — a CATCH-ALL: `!queryLetter && !synopsis` meant
   * "sample". So any free text a writer had entered was reported back to them as an opening
   * sample. That is the app misstating a fact about their own submission, not merely failing to
   * model one, and it is why this is a fix rather than a tidy-up.
   *
   * ⚠️ ONE SET OF PATTERNS, IN `agentMaterials.ts`, where they have always lived. A fourth copy
   * here — even a correct one — is the shape this repo keeps paying for.
   */
  const matKind = (it: string | QueryMaterial) => classifyQueryMaterial(it);
  const isQueryLetterMat = (it: string | QueryMaterial) => matKind(it) === "queryLetter";
  const isSynopsisMat = (it: string | QueryMaterial) => matKind(it) === "synopsis";
  const isSampleMat = (it: string | QueryMaterial) => matKind(it) === "sample";
  const isOtherMat = (it: string | QueryMaterial) => matKind(it) === "other";
  const baseMaterialsFor = (q: Query, ag: Agent | null | undefined): (string | QueryMaterial)[] => {
    const own = (q as any).materialsWanted;
    if (Array.isArray(own) && own.length) return own;
    return ag && Array.isArray(ag.materialsWanted) ? ag.materialsWanted : [];
  };
  /**
   * ⚠️ THE ONE WRITER FOR EVERY MATERIALS CHANGE — add, edit, mark sent, remove. A second path
   * would be a second answer to what the query holds.
   *
   * ⚠️ AND IT LOGS NO ACTIVITY, DELIBERATELY. Editing what you sent is a CORRECTION to a factual
   * record, not an event that happened — the same rule the timeline's ⋯ corrections follow. An
   * entry reading "materials changed" would put a thing you did to the RECORD into the story of
   * what the agent and the writer did to each other. The undo restores the prior stored value,
   * which is what a correction needs instead. Do not "fix" this by adding a log entry.
   */
  /* ⚠️ `attachPackage` IS RETIRED (D12) — the snapshot path. It appended the package's material
     NAMES to `materialsWanted` and wrote `packageId: ""`, which meant the send could only ever say
     `Covering letter` where a link says `LETTER Hook-first`, and it contributed to no scorecard at
     all. Snapshots existed to stop a package changing under a send; the LOCK does that now, so the
     copy bought nothing and cost the two-models problem. Existing snapshots are untouched and keep
     rendering — they are a true record of what was sent (D13). */

  /**
   * ⚠️ REMOVES WHAT THAT PACKAGE BROUGHT AND NOTHING ELSE — matched on the item's MARK, never on its
   * name, so a synopsis the writer added by hand survives the removal of a package that also carried
   * one.
   *
   * ⚠️ IT IS THE INVERSE OF A PATH THAT NO LONGER RUNS, AND IT STAYS FOR THAT REASON. `attachPackage`
   * was retired with D12, so nothing creates a snapshot group any more — but the groups that already
   * exist are a true record of what was sent (D13), and a record you cannot correct is worse than one
   * you cannot make. This is the only way to take an item out of one.
   *
   * ⚠️ IT DOES NOT TOUCH `packageId`, AND THAT IS NOT AN OMISSION. The retired path wrote
   * `packageId: ""` as the snapshot landed — attaching a snapshot REPLACED a link rather than sitting
   * beside it — so on any group that exists there is no link left to clear. Re-clearing it would
   * add a key to `affectedKeys` for no change, and RESTORING the pre-attach link would be wrong:
   * this is not an undo of the attach (the toast below is), it is a removal of the items.
   *
   * ⚠️ AND IT IS A CORRECTION, NOT HISTORY. No activity is appended; no status, date or count is
   * written. `recomputeQuery` stays the single writer of every derived field, and the package's
   * sent/replies/requests figures are derived from the queries at read time — so they follow this
   * write without anything having to update them.
   *
   * ⚠️ THE PRIOR VALUE IS CAPTURED BEFORE THE WRITE. The empty-closure law: an undo built from state
   * read back afterwards restores what it just wrote.
   */
  /**
   * ⚠️ THE POINTER, NOT THE CONTENTS (Ruling 1). Changing which package a query used is a CORRECTION
   * to that query's own field — it rewrites nothing about the package, and it moves the query's
   * contribution from one scorecard to the other because both are derived at read time.
   *
   * ⚠️ NO ACTIVITY, EVER (D4). Editing what you sent is a correction to a factual record, not an
   * event in the story between the writer and the agent — the same rule `writeMaterials` and the
   * timeline's own corrections already follow. The undo restores the prior value instead.
   */
  /**
   * ⚠️ SWITCHING BRANCH REPLACES, AND IT SAYS SO ONCE (D10). The two are exclusive, so choosing a
   * package drops the list this query was carrying — stated plainly, with no warning tone and no
   * scolding. `materialsLinkWrites` is what actually does the replacing; this only asks first.
   *
   * ⚠️ THE COUNT IS DERIVED, so the sentence says "two materials" when there are two. A fixed
   * "your materials" would be vaguer than the app's own knowledge.
   */
  /**
   * ⚠️ IT ASKS AT THE POINT OF THE WRITE NOW, NOT BEFORE THE PICKER (D5). It used to sit behind
   * `Save as package ›` — confirm, then open the picker — and that control is retired (D7), which
   * would have left the replacement happening silently from the Attach menu. So the question moved
   * to where the replacement actually occurs: choose a package while materials are listed, and it
   * asks before writing.
   *
   * ⚠️ AND IT NAMES THE PACKAGE, because by this point the writer has chosen one. The old wording
   * could not — it ran before the picker opened.
   */
  const confirmReplace = async (count: number, pkgName: string): Promise<boolean> =>
    count === 0 ||
    askConfirm(
      `Attach ${pkgName}? The ${count === 1 ? "material" : `${count} materials`} listed here will be replaced by the package's contents. Nothing else about this query changes.`,
      { confirmLabel: "Attach the package", cancelLabel: "Cancel" },
    );

  const changeQueryPackage = async (q: Query, pkg: SubmissionPackage) => {
    const before = q.packageId || "";
    /**
     * ⚠️ THE UNDO MUST CAPTURE THE MATERIALS, NOT JUST THE POINTER — attaching CLEARS them.
     * `setQueryPackage` writes through `materialsLinkWrites`, which enforces one-or-the-other, so
     * arriving here from the loose state (the switch) destroys the list. An undo that restored only
     * `packageId` left the query with NEITHER the package nor its materials, while the toast said it
     * had been reversed. Measured: a query showing two loose materials, switched, undone — both gone.
     *
     * ⚠️ AND IT IS RESTORED THROUGH THE SAME INVARIANT IT WAS CLEARED BY. `materialsLinkWrites`
     * decides what a restore looks like: a prior LINK restores as a link with an empty list, a prior
     * loose list restores as a list with no link. Hand-writing the two cases here is how the two
     * halves drift apart.
     */
    const beforeMats = ((q as Query).materialsWanted ?? []) as (string | QueryMaterial)[];
    const restore = materialsLinkWrites({ packageId: before, materials: beforeMats });
    setPkgPickOpen(false);
    const err = await setQueryPackage(q.id, pkg.id);
    if (err) { showToast({ message: err }); return; }
    showToast({
      message: `This query now carries ${pkg.packageName}`,
      /* ⚠️ THE PRIOR VALUE IS CAPTURED BEFORE THE WRITE — an undo built from state read back
         afterwards restores what it just wrote. */
      undo: () => void updateQuery(q.id, restore),
    });
  };

  /** Remove the pointer. The package is untouched — and stays stamped, because it was still sent. */
  const removeQueryPackage = async (q: Query, name: string) => {
    const before = q.packageId || "";
    const err = await setQueryPackage(q.id, "");
    if (err) { showToast({ message: err }); return; }
    showToast({
      message: `Removed ${name} from this query`,
      undo: () => void setQueryPackage(q.id, before),
    });
  };

  const detachPackage = (q: Query, packageId: string, name: string) => {
    const before = ((q as Query).materialsWanted ?? []) as (string | QueryMaterial)[];
    const next = withoutPackage(before, packageId);
    void updateQuery(q.id, { materialsWanted: next });
    showToast({
      message: detachToast(before.length - next.length, name),
      undo: () => void updateQuery(q.id, { materialsWanted: before }),
    });
  };

  const writeMaterials = (q: Query, next: (string | QueryMaterial)[], msg: string) => {
    const prev = (q as any).materialsWanted;
    const restore = Array.isArray(prev) ? { materialsWanted: prev } : { materialsWanted: deleteField() as unknown as QueryMaterial[] };
    void updateQuery(q.id, { materialsWanted: next });
    showToast({ message: msg, undo: () => void updateQuery(q.id, restore) });
  };
  /**
   * ⚠️ THE FOUR LOCKED TYPES, IN ONE PLACE, READ BY THE MENU. Query letter · Synopsis · Opening
   * sample · Other. Author bio and Full manuscript are NOT here and must not come back: they were
   * removed deliberately, and `materialsWantedFromRows` sheds them from legacy data on every write.
   *
   * ⚠️ `Opening sample` IS THE NAME, not "Sample pages". The three units all store as one
   * `ComponentType`, so the artefact does not know which unit was asked for — a "Sample pages"
   * label would assert a unit the data does not carry.
   *
   * ⚠️ AND `added` IS A PREDICATE RATHER THAN A FLAG, so the menu reads the query's real state
   * every time it opens rather than a copy taken when something last changed.
   */
  /**
   * §2 — the agent's own stated sample size, for the editor's hint line and its default.
   *
   * ⚠️ IT LIVES IN `agent.materialsWanted`, the same `string[]` the Add-Agent form and the Edit
   * drawer write — encoded and read back through `agentMaterials.ts`, never parsed here. The three
   * sample pills ("Sample pages" / "Sample chapters" / "Sample words") carry the unit and
   * `counts[pill]` carries the number.
   *
   * ⚠️ AND IT IS A PREFERENCE, NOT A DEFAULT WITH AUTHORITY: absent, the editor falls back to the
   * unit already on the send, and the hint line simply does not render. An agency that has said
   * nothing must not appear to have asked for ten pages.
   */
  const agentSamplePref = (ag: Agent | null | undefined): { unit: SampleUnit; qty: string } | null => {
    const parsed = parseAgentMaterials(ag?.materialsWanted as string[] | undefined);
    const pill = parsed.selected.find((p) => p.startsWith("Sample "));
    if (!pill) return null;
    const unit: SampleUnit = pill === "Sample chapters" ? "Chapters" : pill === "Sample words" ? "Words" : "Pages";
    const qty = parsed.counts[pill] || snapToUnit(unit);
    return { unit, qty };
  };

  /**
   * ⚠️ THE FOUR LOCKED TYPES, IN ONE PLACE, READ BY THE MENU. Query letter · Synopsis · Opening
   * sample · Other. Author bio and Full manuscript are NOT here and must not come back: they were
   * removed deliberately, and `materialsWantedFromRows` sheds them from legacy data on every write.
   *
   * ⚠️ `Opening sample` IS THE NAME, not "Sample pages". The three units all store as one
   * `ComponentType`, so the artefact does not know which unit was asked for — a "Sample pages"
   * label would assert a unit the data does not carry.
   *
   * ⚠️ AND `added` IS A PREDICATE RATHER THAN A FLAG, so the menu reads the query's real state
   * every time it opens rather than a copy taken when something last changed.
   *
   * ⚠️ EACH ROW SAYS WHAT CHOOSING IT WILL DO (§2). Two of the four attach and close — there is
   * nothing to configure about a query letter. The other two HAND OVER to an editor, and the hint
   * says so before the click rather than after it: a sample without a size is half a fact, and
   * `Other` without its words is a pill reading "Other".
   */
  const MATERIAL_MENU: { label: string; hint?: string; added: (ql: boolean, syn: boolean, smp: boolean, oth: boolean) => boolean; add: (anchor: HTMLElement) => void }[] = [
    { label: materialLabel("Query letter"), added: (ql) => ql, add: () => activeQuery && activeAgent && toggleDocMaterial(activeQuery, activeAgent, "query") },
    { label: "Synopsis", added: (_q, syn) => syn, add: () => activeQuery && activeAgent && toggleDocMaterial(activeQuery, activeAgent, "synopsis") },
    {
      label: "Opening sample", hint: "→ SIZE", added: (_q, _s, smp) => smp,
      /* ⚠️ IT ATTACHES AND HANDS OVER, in that order — the pill exists before its editor opens, so
         closing without touching the stepper leaves a real material at the default rather than
         nothing. The default is the AGENT's stated size where there is one. */
      add: (anchor) => {
        if (!activeQuery || !activeAgent) return;
        const pref = agentSamplePref(activeAgent);
        const unit = pref?.unit ?? sampleUnit;
        const qty = pref?.qty ?? snapToUnit(unit);
        setSampleUnit(unit); setSampleQty(qty);
        commitSample(qty, unit);
        openMatPop("smp", anchor);
      },
    },
    /* ⚠️ OTHER TAKES FREE TEXT, NOT A STEPPER — a quantity of what? Its chip's label is whatever
       the writer types, verbatim, which is why it has no unit and no amount. */
    {
      label: "Other…", hint: "FREE TEXT", added: (_q, _s, _m, oth) => oth,
      add: (anchor) => {
        if (!activeQuery || !activeAgent) return;
        const item: QueryMaterial = { material: "Other", type: "other", quantity: "" };
        writeMaterials(activeQuery, [...baseMaterialsFor(activeQuery, activeAgent), item], "Material attached");
        setOtherEditing(item); setOtherText("");
        openMatPop("oth", anchor);
      },
    },
  ];

  const toggleDocMaterial = (q: Query, ag: Agent | null | undefined, kind: "query" | "synopsis") => {
    const base = baseMaterialsFor(q, ag);
    const pred = kind === "query" ? isQueryLetterMat : isSynopsisMat;
    const name = kind === "query" ? "Query letter" : "Synopsis";
    const present = base.some(pred);
    const next = present ? base.filter((it) => !pred(it)) : [...base, { material: kind === "query" ? "Query Letter" : "Synopsis" } as QueryMaterial];
    /* ⚠️ "removed" / "attached", NOT "unmarked" / "marked sent" (§2). Marking was the vocabulary of
       a state that no longer exists: a material is on the send or it is not. */
    writeMaterials(q, next, present ? `${name} removed` : `${name} attached`);
  };
  /**
   * §1 — the sample commits on every change rather than on a Save.
   *
   * ⚠️ IT TAKES THE VALUES RATHER THAN READING THE STATE. `setSampleQty` is asynchronous, so a
   * commit that read `sampleQty` would write the value BEFORE the keystroke — the classic
   * one-behind bug, and invisible until someone types two digits.
   *
   * ⚠️ AND AN EMPTY FIELD WRITES NOTHING. Clearing the box while retyping is not a request to
   * remove the material; `Remove from this send` is.
   */
  const commitSample = (qty: string, unit: SampleUnit) => {
    if (!activeQuery || !qty.trim()) return;
    const numeric = /^[\d,]+$/.test(qty.trim()) ? Number(qty.trim().replace(/,/g, "")) : qty.trim();
    const item: QueryMaterial = { material: "Sample Pages", type: unit.toLowerCase() as QueryMaterial["type"], quantity: numeric };
    const next = [...baseMaterialsFor(activeQuery, activeAgent).filter((it) => !isSampleMat(it)), item];
    writeMaterials(activeQuery, next, "Opening sample updated");
  };
  /* ⚠️ `saveSampleMaterial` IS DELETED WITH THE SAVE BUTTON IT SERVED (§1). Its only caller was the
     popover's `Save quantity`; the editor commits on every change through `commitSample`, which
     takes the values rather than reading state one keystroke behind. A writer with no caller is the
     next reader's second way to do this. */
  /**
   * §2 — edit an existing `Other` in place: it saves OVER the item it opened rather than appending.
   *
   * ⚠️ IDENTITY BY REFERENCE, which is safe here and stated because it would not be everywhere:
   * `baseMaterialsFor` returns the stored array itself, so the item handed to the editor is the
   * same object the filter compares against. Two identical `Other` strings would otherwise be
   * indistinguishable, and editing one would rewrite whichever came first.
   */
  const saveOtherEdit = (q: Query, ag: Agent | null | undefined, item: string | QueryMaterial, text: string) => {
    const t = text.trim();
    if (!t) return;
    const next = baseMaterialsFor(q, ag).map((it) => (it === item ? ({ material: "Other", type: "other", quantity: t } as QueryMaterial) : it));
    writeMaterials(q, next, "Material updated");
  };
  const removeOtherMaterial = (q: Query, ag: Agent | null | undefined, item: string | QueryMaterial) => {
    writeMaterials(q, baseMaterialsFor(q, ag).filter((it) => it !== item), "Material removed");
  };
  const removeSampleMaterial = (q: Query, ag: Agent | null | undefined) => {
    writeMaterials(q, baseMaterialsFor(q, ag).filter((it) => !isSampleMat(it)), "Opening sample removed");
      };
  // Queries Hub subtitle — the manuscript currently in scope ("Tracking …").
  const trackedManuscript = selectedManuscriptFilter !== "All" ? manuscripts.find(m => m.id === selectedManuscriptFilter) : null;
  // Manuscripts that actually have queries — the MANUSCRIPT pill group only shows these.
  /** The scope value for "no manuscript". Not an id — no manuscript has it, which is the point. */
  const UNASSIGNED_MS = "__unassigned__";
  const UNASSIGNED_LABEL = "Unassigned";
  const manuscriptsWithQueries = manuscripts.filter(m => queries.some(q => q.manuscriptId === m.id));
  /**
   * ⚠️ DERIVED, NEVER STORED (D6's rule applied here). "Unassigned" is not a manuscript and has no
   * record; it is the count of queries whose manuscript does not resolve — an absent id and an id
   * naming nothing alike, because a reader cannot tell those apart and should not have to.
   */
  const unassignedCount = queries.filter(q => !manuscripts.some(m => m.id === q.manuscriptId)).length;
  /**
   * ⚠️ THE FLAG IS THE DATA (D6). Nothing is stored and nothing is dismissed: a query is flagged
   * because its manuscript or its agent does not resolve, so the banner appears when the first such
   * row arrives and goes when the last one is resolved — with no field to keep in step and no
   * dismissal state to get stuck. The summary at the end of an import is a moment; this is the
   * record, and it is the same fact counted rather than a copy of it.
   */
  const needsDecisionCount = queries.filter(q =>
    !manuscripts.some(m => m.id === q.manuscriptId) || !agents.some(a => a.id === q.agentId)).length;
  const hubSubtitle = trackedManuscript ? trackedManuscript.title : "all manuscripts";
  // (The grand masthead + its pulse line are RETIRED with the F12 shell — the breadcrumb and
  // the list footer carry the page name and counts now; queriesPulse remains a lib for others.)

  // Synchronise Agent Notes values when activeAgent changes
  useEffect(() => {
    if (activeAgent) {
      setNotesValue(activeAgent.notes || "");
    } else {
      setNotesValue("");
    }
    setIsEditingNotes(false);
  }, [activeAgent?.id]);

  // Auto scroll chat container to bottom when journalEntries or selectedQueryId changes
  useEffect(() => {
    const el = chatContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
      setNotesFade({ top: el.scrollHeight > el.clientHeight, bottom: false });
    }
  }, [journalEntries, selectedQueryId]);

  /**
   * ⚠️ THE WINDOW-LEVEL ARROW HANDLER IS DELETED (§4b), AND IT WAS THE FAULT ITSELF. It walked
   * `sortedListRef` — the SORT order — while the list has been drawn in GROUPS since §5 of the
   * polish pass. So Down did not "fail to cross a group boundary"; it never knew there were
   * groups, and moved through a sequence that has not matched the rendered one for two packs.
   * Measured while replacing it: the selection stepped 20 → 7 → 6 → 5 while the eye was on the
   * first group.
   *
   * ⚠️ AND IT WAS ON `window`, WHICH IS THE OTHER HALF. It called `preventDefault()` on every arrow
   * key anywhere on the page that was not in a field — including in the reading pane — so the list
   * owned a key it was often not the subject of. The replacement is on the listbox: it fires when
   * the list has focus and at no other time, which is what a composite widget is.
   *
   * ⚠️ IT ALSO MOVED THE SELECTION WITHOUT MOVING FOCUS, so the ring and the marked row could point
   * at different rows — the divergence that made "selection follows focus" untestable.
   *
   * See `onListKeyDown` and `lib/listKeyboard.ts`.
   */

  const triggerNotesEdit = () => {
    if (activeAgent) {
      setNotesValue(activeAgent.notes || "");
      setIsEditingNotes(true);
    }
  };

  const handleSaveNotes = async () => {
    if (activeAgent) {
      await updateAgent(activeAgent.id, { notes: notesValue });
      setIsEditingNotes(false);
    }
  };

  if (!currentUser) return null;

  // Aggregate stats row
  const activeQueriesCount = queries.filter(q =>
    ![QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE].includes(q.status)
  ).length;
  
  const requestCount = queries.filter(q =>
    [QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED].includes(q.status)
  ).length;
  
  const closedCount = queries.filter(q =>
    [QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE].includes(q.status)
  ).length;
  
  const offerCount = queries.filter(q => q.status === QueryStatus.OFFER).length;

  // Sidebar filter group visibility (only show group label when ≥1 row would render)
  const hasActiveQueries = queries.some(q =>
    [QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT,
     QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT, QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER]
     .includes(q.status)
  );
  const hasClosedQueries = queries.some(q =>
    [QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE].includes(q.status)
  );

  const RESPONSE_RECEIVED_STATUSES = [
    QueryStatus.PARTIAL_REQUESTED,
    QueryStatus.PARTIAL_SENT,
    QueryStatus.FULL_REQUESTED,
    QueryStatus.FULL_SENT,
    QueryStatus.REVISE_RESUBMIT,
    QueryStatus.OFFER,
    QueryStatus.REJECTED,
    QueryStatus.WITHDRAWN,
    QueryStatus.NO_RESPONSE,
  ];

  const responsesReceivedVal = queries.filter(q =>
    RESPONSE_RECEIVED_STATUSES.includes(q.status as QueryStatus)
  ).length;

  const responseRate = queries.length > 0
    ? Math.round((responsesReceivedVal / queries.length) * 100)
    : 0;

  const ACTIVE_STATUSES = [QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT, QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER];
  const CLOSED_STATUSES = [QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE];
  const nonZeroActiveStatuses = ACTIVE_STATUSES.filter(s => queries.some(q => q.status === s));
  const nonZeroClosedStatuses = CLOSED_STATUSES.filter(s => queries.some(q => q.status === s));
  const allActiveHighlighted = nonZeroActiveStatuses.length > 0 && !selectedStatusFilters.includes("All") && nonZeroActiveStatuses.every(s => selectedStatusFilters.includes(s)) && !CLOSED_STATUSES.some(s => selectedStatusFilters.includes(s));
  const allClosedHighlighted = nonZeroClosedStatuses.length > 0 && !selectedStatusFilters.includes("All") && nonZeroClosedStatuses.every(s => selectedStatusFilters.includes(s)) && !ACTIVE_STATUSES.some(s => selectedStatusFilters.includes(s));

  // Status multi-select is "active" (a real filter) only on a proper partial selection —
  // an empty OR complete selection means "All" (no status filtering).
  const ALL_QUERY_STATUSES = Object.values(QueryStatus) as QueryStatus[];
  const statusFilterActive = statusSel.length > 0 && statusSel.length < ALL_QUERY_STATUSES.length;

  // ── F12 filter pipeline (ref queries-hub-v14.html filter popover) ──
  const nowMs = Date.now();
  /* ⚠️ THE OVERDUE PREDICATE MOVED TO lib/queriesFilterParam (shell-rebuild pack, Phase 3). It
     was inline here; the shell's "Needs attention" count and the top-nav mega panel both needed
     the same figure, and the choice was to export it or to keep a second copy that would agree
     until the day it did not. Same rule, one home. */
  const isOverdueForReply = (q: Query): boolean => isOverdueForReplyPure(q, nowMs);

  /* v5 P2 — THE filter predicate, extracted so there is exactly one. The list renders through it,
     and the create flow asks it "would the query I just saved be visible?" — asking a copy would
     be the classic drift bug (the row silently vanishes because the copy disagreed). */
  /**
   * The versions the version filter can offer (D11).
   *
   * ⚠️ SCOPED TO THE FILTERED MANUSCRIPT, and empty at "All manuscripts" — see the section's own
   * note. Two books can each have an opening called "Draft two", and a list mixing them would let
   * the writer choose one and get the other.
   */
  const versionFilterOptions = (() => {
    if (selectedManuscriptFilter === "All" || selectedManuscriptFilter === UNASSIGNED_MS) return [];
    return bookVersionsOf(manuscripts.find((m) => m.id === selectedManuscriptFilter) ?? null);
  })();

  const matchesFilters = (q: Query): boolean => {
    const agent = agents.find(a => a.id === q.agentId);
    const ms = manuscripts.find(m => m.id === q.manuscriptId);

    /**
     * ⚠️ AN UNRESOLVABLE ROW IS SHOWN, NOT DROPPED (F-AF, D2). This was
     * `if (!agent || !ms) return false` — so a query naming a manuscript or agent that does not
     * exist vanished from the list at EVERY scope, with no filter selected and nothing to say it
     * was there. Measured: two probes planted, 46 queries stored, 44 rows rendered.
     *
     * ⚠️ AND STORING `""` DOES NOT FIX IT BY ITSELF, which is the trap. The import stopped writing
     * invented ids in Phase 1, and an unassigned query STILL failed `!ms` here — the same row,
     * invisible for the same reason. A row must never be hidden by the thing that is missing from
     * it, and that is a property of this predicate rather than of what was written.
     */

    // Whose turn — the CTA engine's queryBucket is the ONE source of truth (never re-derived):
    // "move" = the agent replied, your turn; "waiting" = ball in the agent's court.
    const bkt = queryBucket(q.status as QueryStatus);
    if (turnFilter === "move" && bkt !== "move") return false;
    if (turnFilter === "wait" && bkt !== "waiting") return false;
    /* The grid's two extra courts. `turnFor` refines the bucket rather than replacing it — the
       reconciliation is locked in `queryCardFacts.test.ts`, in both directions. */
    if (turnFilter === "offer" && turnFor(q.status as QueryStatus) !== "offer") return false;
    if (turnFilter === "closed" && turnFor(q.status as QueryStatus) !== "closed") return false;

    /* The ref's four facets. Ticks WITHIN one are alternatives; the facets narrow each other. */
    if (!gridFiltersAreEmpty(gridFilters)) {
      const ag = agents.find((a) => a.id === q.agentId);
      const { materials } = cardMaterials(q.materialsWanted);
      const slots = new Set(
        (Object.keys(materials) as (keyof typeof materials)[]).filter((k) => materials[k]),
      );
      if (!matchesGridFilters(
        {
          id: q.id, status: q.status as QueryStatus, turn: turnFor(q.status as QueryStatus),
          agency: agentAgencyLine(ag), name: agentPrimary(ag),
          lastMs: null, sentMs: null, expectedMs: null,
          via: sendMethodLabel(q.sendMethod), slots,
        },
        gridFilters,
      )) return false;
    }

    // Status multi-select — the exact QueryStatus strings; only a partial selection filters.
    if (statusFilterActive && !statusSel.includes(q.status as QueryStatus)) return false;

    /* Manuscript filter. ⚠️ `UNASSIGNED_MS` matches every query whose manuscript does not resolve —
       an empty id AND an id naming nothing, because both are the same fact to a reader. */
    if (selectedManuscriptFilter === UNASSIGNED_MS) {
      if (ms) return false;
    } else if (selectedManuscriptFilter !== "All" && q.manuscriptId !== selectedManuscriptFilter) {
      return false;
    }

    // Needs attention — both derived (reply overdue; open tasks via the derived Task[]).
    /**
     * Part E, D11 — the version filter.
     *
     * ⚠️ IT READS THE SAME `listVersion` THE COLUMN DRAWS, so a row can never be filtered out by a
     * version it is not showing. One derivation, two readers — the rule this whole feature is built
     * on, applied to its own two surfaces.
     */
    if (versionFilter !== null) {
      const v = listVersion(q as never, packages, versions, activities, bookVersionsOf(ms ?? null));
      if (versionFilter === UNRECORDED_VERSION) { if (v) return false; }
      else if (v?.id !== versionFilter) return false;
    }
    if (needsOverdue && !isOverdueForReply(q)) return false;
    if (needsTasks && queryTaskBadge(tasks, q.id).count === 0) return false;

    // Search bar filters
    const term = (listSearch || searchQuery).toLowerCase();
    if (term) {
      return (
        /* ⚠️ NULL-SAFE, because the bail above is gone. An unassigned row has no title and no
           agent name to match, and `UNASSIGNED_LABEL` is searchable so "unassigned" finds them. */
        (agent?.name ?? "").toLowerCase().includes(term) ||
        (agent?.agency ?? "").toLowerCase().includes(term) ||
        (ms?.title ?? "").toLowerCase().includes(term) ||
        (!ms || !agent ? UNASSIGNED_LABEL.toLowerCase().includes(term) : false)
      );
    }

    return true;
  };
  /* The masthead's set: manuscript scope only — the status filter and the search narrow the LIST,
     never the page's own totals (the rule `queriesPulse` already follows). */
  const mastheadScopedQueries = selectedManuscriptFilter === "All"
    ? queries
    : queries.filter((q) => q.manuscriptId === selectedManuscriptFilter);

  /**
   * THE PLACE LINES (§2b) — where the act being composed sits in the campaign. Derived at render,
   * never stored, and every clause omits itself when its figure is unavailable.
   */
  const createPlace = createDraft ? createPlaceLine({
    priorForManuscript: createDraft.manuscriptId
      ? queries.filter((q) => q.manuscriptId === createDraft.manuscriptId).length : undefined,
    manuscriptTitle: manuscripts.find((m) => m.id === createDraft.manuscriptId)?.title,
  }) : "";
  const respPlace = (() => {
    if (!respQueryId) return "";
    const q = queries.find((x) => x.id === respQueryId);
    if (!q) return "";
    /**
     * ⚠️ REPLIES IN THE LOG, NOT QUERIES THAT HAVE LEFT A BUCKET (§4). The old rule here was
     * `queryBucket(...) !== "waiting"` — which counted a query CLOSED WITH NO REPLY as a response
     * received, because "closed" is not "waiting". Silence became a reply, quietly, in the one
     * sentence whose whole job is to say how many times an agent has actually written back.
     *
     * It also counted queries rather than replies, so a query that went partial → full → offer
     * contributed one instead of three — an ordinal that drifted further from the truth the longer
     * a campaign ran.
     *
     * `agentRepliesForManuscript` counts activity rungs in `AGENT_RESPONSE_STATUSES`, excluding
     * this query's own, so both faults go together and a correction to an existing response cannot
     * double-count its history.
     */
    return recordPlaceLine({
      manuscriptTitle: manuscripts.find((m) => m.id === q.manuscriptId)?.title,
      priorRepliesForManuscript: agentRepliesForManuscript(activities, q.manuscriptId, q.id),
    });
  })();

  const filteredList = queries.filter(matchesFilters);

  // ── F12 sort (ref sort popover: Activity / Dates / Pipeline) — all derived from fields
  // already on the query; no reads. MAXT stands in for "missing" so undated rows sink.
  const STATUS_SORT_ORDER = [
    QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT,
    QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT, QueryStatus.REVISE_RESUBMIT,
    QueryStatus.OFFER, QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE,
  ];
  const MAXT = Number.MAX_SAFE_INTEGER;
  const toMs = (v: any): number => !v ? 0 : typeof v === "string" ? (new Date(v).getTime() || 0) : (v?.toDate?.()?.getTime?.() ?? 0);
  /** Latest of the query's own date fields — the "last activity" anchor. */
  const lastActivityMs = (q: any): number => Math.max(
    toMs(q.lastStatusChange), toMs(q.responseReceivedAt), toMs(q.dateSent),
    toMs(q.partialSentDate), toMs(q.fullSentDate), toMs(q.nudgeDate), toMs(q.lastNudgeSentDate)
  );
  /** The send the agent is sitting on (latest send date) — the "waiting since" anchor. */
  const waitAnchorMs = (q: any): number => Math.max(toMs(q.dateSent), toMs(q.partialSentDate), toMs(q.fullSentDate));
  /** Pipeline depth rank — deepest active first (Offer → … → Queried), closed statuses last. */
  const journeyRank = (q: Query): number => {
    const idx = STATUS_SORT_ORDER.indexOf(q.status as QueryStatus);
    return idx <= 6 ? 6 - idx : 10 + idx;
  };

  /* v5 P2 — THE sort comparator, extracted for the same reason as the predicate: the create
     flow's FLIP travel asks it where the saved row belongs, and it must be the comparator the
     list itself is ordered by, or the row animates to the wrong slot. */
  const compareQueries = (a: Query, b: Query): number => {
    const agA = agents.find(ag => ag.id === a.agentId)?.name || "";
    const agB = agents.find(ag => ag.id === b.agentId)?.name || "";
    switch (sortKey) {
      case "agent_az": return agA.localeCompare(agB);
      case "date_newest": return toMs(b.dateSent) - toMs(a.dateSent);
      case "date_oldest": return (toMs(a.dateSent) || MAXT) - (toMs(b.dateSent) || MAXT);
      case "waiting_longest": {
        const aW = queryBucket(a.status as QueryStatus) === "waiting" ? (waitAnchorMs(a) || MAXT) : MAXT;
        const bW = queryBucket(b.status as QueryStatus) === "waiting" ? (waitAnchorMs(b) || MAXT) : MAXT;
        return aW - bW;
      }
      case "due_soonest": {
        /* ⚠️ §2 · SORTS ON THE RESOLVED DATE. Reading the retired column made this comparator
           return MAXT for every row, so "Due soonest" silently became "no order at all". */
        const dueMs = (x: Query) => resolveExpectedDate(x, lastSendMs(x), agents.find(ag => ag.id === x.agentId)?.responseTimeWeeks).ms ?? MAXT;
        const aD = dueMs(a);
        const bD = dueMs(b);
        return aD - bD;
      }
      case "journey_depth": return journeyRank(a) - journeyRank(b);
      case "last_activity":
      default: return lastActivityMs(b) - lastActivityMs(a);
    }
  };
  const sortedList = [...filteredList].sort(compareQueries);

  /**
   * ⚠️ THE GRID READS `sortedList`, THE SAME DERIVED SET THE DETAIL LIST READS. One filter
   * pipeline, one sort, two views — so the browsing grid and the list can never show a different
   * set of the same queries under the same controls.
   *
   * ⚠️ AND THE FACTS ARE DERIVED ONCE PER CARD, HERE. `cardFacts` needs the AGENCY's window, which
   * lives on the agent record and is never stored on the query; handing it in at the one place the
   * agent is already resolved is what stops a card reaching for it.
   */
  useEffect(() => {
    if (!routeActive || activeQuery) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || t?.isContentEditable) return;
      const el = browseSearchRef.current;
      if (!el) return;
      e.preventDefault();
      el.focus();
      el.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [routeActive, activeQuery]);

  const gridRows: GridCard[] = sortedList.map((q) => {
    const agent = agents.find((a) => a.id === q.agentId);
    const facts = cardFacts(q as Query, new Date(), { agencyWeeks: agent?.responseTimeWeeks });
    return {
      id: q.id,
      status: q.status as QueryStatus,
      turn: facts.turn,
      name: agentPrimary(agent),
      agency: agentAgencyLine(agent),
      initials: agentInitials(agent),
      lastMs: lastActivityMs(q),
      sentMs: toMs(q.dateSent) || null,
      expectedMs: facts.expectedReply ? facts.expectedReply.getTime() : null,
      facts,
    };
  });

  /**
   * ⚠️ THE PANEL READS THE SAME ROW THE GRID BUILT. `gridRows` is already derived from
   * `sortedList`, so the card and the panel cannot disagree about a status, a date or a stage —
   * and the panel's position (`N of M`) is an index into that same order, which is what makes
   * ←/→ follow what the reader is looking at rather than some other ordering.
   */
  const panelIndex = activeQuery ? gridRows.findIndex((r) => r.id === activeQuery.id) : -1;
  const panelRow = panelIndex >= 0 ? gridRows[panelIndex] : null;

  /**
   * ⚠️ THE RAIL IS THE ACTIVITY LOG, NOT A RECONSTRUCTION. `trackingEvents` is the per-query
   * `activity` subcollection the record view has always read, in the same order — which is the
   * parity that has to hold before that view can be deleted.
   */
  /**
   * ⚠️ THE PANEL'S EDITORS CALL THE RECORD VIEW'S OWN HANDLERS. `onEditEntry` opens
   * `CorrectionFork`; `onDeleteEntry` runs the consequence preview and the delete. Building a
   * second correction path for the same activities is how two surfaces come to disagree about what
   * an edit does — and the whole point of decision 4 is that they do not.
   *
   * ⚠️ AND A DOTTED FIELD GOES STRAIGHT TO THE MISTAKE BRANCH (decision 4): clicking a date or a
   * method says "this was recorded wrong", which is one of the fork's two answers. The fork itself
   * is still reachable from the ⋯ menu, for the other one.
   */
  const rungEntry = (activityId: string): TimelineEntryRef | null => {
    const raw = (trackingEvents as { id: string; type?: string; resultingStatus?: string; note?: string; createdAt?: unknown }[])
      .find((e) => e.id === activityId);
    if (!raw || !activeQuery) return null;
    const facts = rungFacts([raw as never]);
    const f = facts[0];
    return {
      activityId,
      status: (raw.resultingStatus as QueryStatus | undefined) ?? (activeQuery.status as QueryStatus),
      label: f?.event ?? "",
      dateISO: f?.ms ? new Date(f.ms).toISOString() : new Date().toISOString(),
      note: raw.note ?? "",
    };
  };
  const openRungDateEdit = (activityId: string) => {
    const entry = rungEntry(activityId);
    if (entry) setCorrecting({ step: "edit", entry });
  };
  const openRungMenu = (activityId: string, _anchor: HTMLElement) => {
    const entry = rungEntry(activityId);
    if (entry) onEditEntry(entry);
  };
  /**
   * ⚠️ THE EXPECTED DATE IS THE WRITER'S OWN FIELD, NOT AN ACTIVITY. It writes
   * `writerExpectedDate` through the existing override path, so `resolveExpectedDate` prefers it
   * and the card behind the panel re-derives — which is the assertion that proves this wiring.
   */
  /**
   * ⚠️ ONE WRITER FOR THE EXPECTED DATE, extracted from the record view's inline handler so the
   * panel calls the same function rather than a second copy of it. The provenance argument it
   * carries is structural — a value in `writerExpectedDate` is the writer's because there is
   * nowhere else it can have come from — and a second write path is exactly what would end that.
   *
   * ⚠️ THE DATE AND ITS SET-AT STAMP GO IN ONE WRITE, and the undo restores BOTH columns or clears
   * both: an undo that left a stamp behind would date a statement that no longer exists.
   */
  const commitExpectedDate = (iso: string) => {
    if (!activeQuery) return;
    const id = activeQuery.id;
    const prev = writerExpectedIso(activeQuery);
    const prevAt = (activeQuery as unknown as Record<string, unknown>)[WRITER_EXPECTED_SET_AT_FIELD];
    void updateQuery(id, writerExpectedWrite(iso) as never);
    showToast({
      message: `Expecting a reply by ${new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`,
      undo: () => void updateQuery(id, (prev
        ? { [WRITER_EXPECTED_FIELD]: prev, [WRITER_EXPECTED_SET_AT_FIELD]: typeof prevAt === "string" ? prevAt : deleteField() }
        : { [WRITER_EXPECTED_FIELD]: deleteField(), [WRITER_EXPECTED_SET_AT_FIELD]: deleteField() }) as never),
    });
  };
  const [expectedEditOpen, setExpectedEditOpen] = useState(false);
  const openExpectedEdit = () => setExpectedEditOpen(true);

  const panelRungs: PanelRung[] = (() => {
    if (!panelRow || !activeQuery) return [];
    const facts = rungFacts(trackingEvents as never[]);
    const out: PanelRung[] = facts.map((r, i) => ({
      id: r.id,
      status: r.status,
      event: r.event,
      detail: i === 0 && activeQuery.sendMethod ? `· ${sendMethodLabel(activeQuery.sendMethod)}` : undefined,
      dateLabel: r.ms ? fmtShortISO(new Date(r.ms).toISOString()) : "—",
      onEditDate: () => openRungDateEdit(r.id),
      onMenu: (anchorEl) => openRungMenu(r.id, anchorEl),
    }));

    /* ⚠️ THE WAITING RUNG IS DERIVED AND CARRIES NO MENU. It records nothing — a rung you can
       delete must correspond to a document. */
    const sentMs = lastSendMs(activeQuery);
    const expMs = panelRow.expectedMs;
    const prog = waitProgress(sentMs, expMs, Date.now());
    if ((panelRow.turn === "sand" || panelRow.turn === "agent") && prog) {
      out.push({
        id: null,
        status: QueryStatus.NO_RESPONSE,
        event: "Waiting to hear back",
        detail: activeAgent?.responseTimeWeeks
          ? `— ${agentAgencyLine(activeAgent)} advise ${activeAgent.responseTimeWeeks} weeks` : undefined,
        dateLabel: panelRow.facts.caption.split(" · ")[0] ?? "",
        pending: true,
        progress: {
          pct: prog.pct,
          past: prog.past,
          sentLabel: sentMs ? `Sent ${fmtShortISO(new Date(sentMs).toISOString())}` : "Sent",
          expectedLabel: expMs
            ? `Expected by ${fmtShortISO(new Date(expMs).toISOString())}${panelRow.facts.expectedSource === "writer" ? " · your date" : ""}`
            : "No date expected",
          onEditExpected: () => openExpectedEdit(),
        },
      });
    }
    return out;
  })();

  /* ⚠️ COUNTED OVER THE MANUSCRIPT-SCOPED SET, NEVER THE FILTERED VIEW — the same rule the
     masthead's own figures follow. A pill that counted what the pills had already narrowed would
     read `0` for every court you were not currently looking at. */
  const quickTally = quickCounts(
    mastheadScopedQueries.map((q) => turnFor(q.status as QueryStatus)),
  );

  /** Quick filters and the popover's "Whose turn" are ONE state — see `turnFilter`. */
  const quickKey: QuickKey =
    turnFilter === "all" ? "all"
      : turnFilter === "move" ? "you"
        : turnFilter === "wait" ? "agent"
          : turnFilter;
  const setQuickKey = (k: QuickKey) =>
    setTurnFilter(k === "all" ? "all" : k === "you" ? "move" : k === "agent" ? "wait" : k);

  // ── F12 active-filter chips + the FILTER / SORT popovers (ref queries-hub-v14.html) ──
  const resetAllFilters = () => {
    setTurnFilter("all"); setStatusSel([]); setSelectedManuscriptFilter("All");
    /* ⚠️ BUILT, NEVER TYPED OUT — a hand-written literal here is how a facet added later silently
       stops being cleared, which has happened on the agent list to the door facet. */
    setGridFilters(emptyGridFilters());
    setNeedsOverdue(false); setNeedsTasks(false);
  };
  const activeFilterChips: { key: string; label: string; remove: () => void }[] = [
    ...(turnFilter !== "all" ? [{ key: "turn", label: TURN_CHIP_LABEL[turnFilter], remove: () => setTurnFilter("all") }] : []),
    /* Every tick is its own removable chip — one that cleared a whole facet would take away
       choices the writer did not make. */
    ...(["via", "included"] as const).flatMap((facet) =>
      [...gridFilters[facet]].map((v) => ({
        key: `${facet}:${v}`,
        label: (facet === "included"
          ? `WITH ${MATERIAL_ROW_NAMES[v as keyof typeof MATERIAL_ROW_NAMES] ?? v}`
          : v).toUpperCase(),
        remove: () => toggleFacet(facet, v),
      })),
    ),
    ...(selectedManuscriptFilter !== "All" ? [{ key: "ms", label: (manuscriptsWithQueries.find(m => m.id === selectedManuscriptFilter)?.title || "MANUSCRIPT").toUpperCase(), remove: () => setSelectedManuscriptFilter("All") }] : []),
    ...(statusFilterActive ? statusSel.map(s => ({ key: `st:${s}`, label: (s === QueryStatus.REVISE_RESUBMIT ? "R&R" : s).toUpperCase(), remove: () => setStatusSel(prev => prev.filter(x => x !== s)) })) : []),
    ...(needsOverdue ? [{ key: "overdue", label: "OVERDUE FOR A REPLY", remove: () => setNeedsOverdue(false) }] : []),
    ...(needsTasks ? [{ key: "tasks", label: "HAS OPEN TASKS", remove: () => setNeedsTasks(false) }] : []),
  ];
  const activeFilterCount = activeFilterChips.length;
  /* Is the list narrowed? Both doors count — the filter popovers AND either search (the list's
     own field or the shell's global one), since matchesFilters reads both. Declared here, well
     above the return, deliberately: the render reads it. */
  /* The save gate, in ONE place: the header's two save buttons must agree, and a second copy of
     draftReady(createDraft) is how they would stop agreeing. */
  const createReady = createDraft ? draftReady(createDraft) : false;
  /* ⚠️ ASSIGNED HERE, NOT WHERE THE REFS ARE DECLARED. The ⌘↵ listener is bound ~470 lines
     above, before `createReady` exists — writing `createReadyRef.current = createReady` up there
     is a same-scope use-before-declaration, and tsc rejected it. The refs are declared early so
     the listener can close over them and assigned here so they carry the live value. */
  createReadyRef.current = createReady;
  createSavingRef.current = createSaving;
  saveCreateRef.current = () => { void saveCreate(); };

  const listNarrowed = activeFilterCount > 0 || (listSearch || searchQuery || "").trim() !== "";

  const OPEN_STATUSES_F12 = STATUS_SORT_ORDER.slice(0, 7);
  const CLOSED_STATUSES_F12 = STATUS_SORT_ORDER.slice(7);
  /* The mockup labels Revise & Resubmit "R&R" — the FILTER VALUE stays the exact enum string. */
  const statusDisplay = (s: QueryStatus) => (s === QueryStatus.REVISE_RESUBMIT ? "R&R" : s);

  const renderFilterPopover = () => (
    <F12Popover
      width={288}
      title="Filter"
      style={filterMenuStyle}
      panelRef={filterPopRef}
      onClose={() => setFilterPopOpen(false)}
      headAction={<button type="button" className="f12-reset" onClick={resetAllFilters}>RESET ALL</button>}
      footText={<><b>{filteredList.length}</b>&nbsp;OF {queries.length} QUERIES</>}
    >
      <PopSection label="Whose turn">
        <PRow kind="rad" on={turnFilter === "all"} label="All queries" sub="Everything, open and closed" onClick={() => setTurnFilter("all")} />
        <PRow kind="rad" on={turnFilter === "move"} label="Your move" sub="The agent has replied — your turn" onClick={() => setTurnFilter("move")} />
        <PRow kind="rad" on={turnFilter === "wait"} label="Waiting" sub="Ball is in the agent's court" onClick={() => setTurnFilter("wait")} />
      </PopSection>
      {/**
        * Part E, D11 — filter by version, alongside the existing filters.
        *
        * ⚠️ THE SECTION RENDERS ONLY WHEN THE FILTERED MANUSCRIPT HAS TWO OR MORE (D12/D8). With
        * "All manuscripts" selected it would have to offer every book's versions in one list, where
        * two manuscripts could each have an opening called "Draft two" and the writer could not
        * tell which they were choosing. A filter that cannot name what it filters is worse than no
        * filter.
        *
        * ⚠️ AND "NOT RECORDED" IS ITS OWN OPTION, not the resting state. `versionFilter === null`
        * means not filtering; a writer asking which queries have no version recorded is asking a
        * real question — the ordinary one, in fact, since no send predating this feature has one.
        */}
      {versionFilterOptions.length >= 2 && (
        <PopSection label="Version">
          <PRow kind="rad" on={versionFilter === null} label="Any version" onClick={() => setVersionFilter(null)} />
          {versionFilterOptions.map((v) => (
            <PRow key={v.id} kind="rad" on={versionFilter === v.id} label={v.name}
                  onClick={() => setVersionFilter(v.id)} />
          ))}
          <PRow kind="rad" on={versionFilter === UNRECORDED_VERSION} label="Not recorded"
                sub="Sent before you named your versions" onClick={() => setVersionFilter(UNRECORDED_VERSION)} />
        </PopSection>
      )}
      {/* ⚠️ AGENCY IS NOT A FILTER FACET — decision 2, and the ref removed it in `1ce96f02`. It was
          here for one pass, added when `GridFilters` was wired. Agency remains reachable under Sort
          and Group, which is the better home for it: a facet lists every agency a writer has ever
          queried and grows without bound, where a sort orders the same set in one row. */}
      <PopSection label="Sent via">
        {[...new Set(mastheadScopedQueries.map((q) => sendMethodLabel(q.sendMethod)))]
          .filter(Boolean).sort().map((v) => (
            <PRow key={v} kind="box" on={gridFilters.via.has(v)} label={v}
              onClick={() => toggleFacet("via", v)} />
          ))}
      </PopSection>

      {/* ⚠️ "INCLUDED" MEANS ALL OF THEM — it describes the parcel, not a shortlist. Locked. */}
      <PopSection label="Included">
        {MATERIAL_SLOTS.map((k) => (
          <PRow key={k} kind="box" on={gridFilters.included.has(k)} label={MATERIAL_ROW_NAMES[k]}
            onClick={() => toggleFacet("included", k)} />
        ))}
      </PopSection>

      <PopSection label="Manuscript">
        <PRow kind="rad" on={selectedManuscriptFilter === "All"} label="All manuscripts" onClick={() => setSelectedManuscriptFilter("All")} />
        {manuscriptsWithQueries.map(m => (
          <PRow key={m.id} kind="rad" on={selectedManuscriptFilter === m.id} label={m.title} onClick={() => setSelectedManuscriptFilter(m.id)} />
        ))}
        {/* ⚠️ OFFERED ONLY WHEN THERE IS SOMETHING IN IT (derived, never stored). An always-present
            "Unassigned" would teach that the state is normal; an absent one on an account that has
            some would hide them. The count is derived like every other figure on this page. */}
        {unassignedCount > 0 && (
          <PRow kind="rad" on={selectedManuscriptFilter === UNASSIGNED_MS}
                label={`${UNASSIGNED_LABEL} · ${unassignedCount}`}
                onClick={() => setSelectedManuscriptFilter(UNASSIGNED_MS)} />
        )}
      </PopSection>
      <PopSection label="Status">
        <div className="f12-quick">
          <button type="button" onClick={() => setStatusSel([...OPEN_STATUSES_F12])}>OPEN ONLY</button>
          <button type="button" onClick={() => setStatusSel([...CLOSED_STATUSES_F12])}>CLOSED ONLY</button>
          <button type="button" onClick={() => setStatusSel([])}>CLEAR</button>
        </div>
        {STATUS_SORT_ORDER.map(s => (
          <PRow
            key={s}
            kind="box"
            on={statusSel.includes(s)}
            label={statusDisplay(s)}
            lead={<StatusDot status={s} overrideSize={15} decorative />}
            onClick={() => setStatusSel(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
          />
        ))}
      </PopSection>
      <PopSection label="Needs attention">
        <PRow kind="box" on={needsOverdue} label="Overdue for a reply" onClick={() => setNeedsOverdue(v => !v)} />
        <PRow kind="box" on={needsTasks} label="Has open tasks" onClick={() => setNeedsTasks(v => !v)} />
      </PopSection>
    </F12Popover>
  );

  const F12_SORT_GROUPS: { group: string; items: { key: string; label: string; sub?: string }[] }[] = [
    { group: "Activity", items: [
      { key: "last_activity", label: "Last activity", sub: "Most recently moved first" },
    ]},
    { group: "Dates", items: [
      { key: "date_newest", label: "Date sent · newest", sub: "Your latest queries first" },
      { key: "date_oldest", label: "Date sent · oldest" },
      { key: "waiting_longest", label: "Waiting longest", sub: "Silence, longest first" },
      { key: "due_soonest", label: "Reply due soonest", sub: "Floats overdue queries to the top" },
    ]},
    { group: "Pipeline", items: [
      { key: "journey_depth", label: "Journey depth", sub: "Offers and fulls above fresh queries" },
      { key: "agent_az", label: "Agent · A to Z" },
    ]},
  ];
  /**
   * ⚠️ GROUPING IS A WAY OF READING, NOT A FILTER — nothing is hidden by it. That is why it is not
   * in the Filter popover and why it does not persist: a heading arrangement you cannot see you
   * chose is worse than none.
   */
  const renderGroupPopover = () => (
    <F12Popover
      width={252}
      title="Group"
      style={groupMenuStyle}
      panelRef={groupPopRef}
      onClose={() => setGroupPopOpen(false)}
      footText={(GRID_GROUPS.find((g) => g.key === gridGroup)?.label || "None").toUpperCase()}
    >
      {GRID_GROUPS.map((g) => (
        <PRow
          key={g.key}
          kind="rad"
          on={gridGroup === g.key}
          label={g.label}
          onClick={() => { setGridGroup(g.key); setGroupPopOpen(false); }}
        />
      ))}
    </F12Popover>
  );

  const renderSortPopover = () => (
    <F12Popover
      width={276}
      title="Sort"
      style={sortMenuStyle}
      panelRef={sortPopRef}
      onClose={() => setSortPopOpen(false)}
      footText={(F12_SORT_GROUPS.flatMap(g => g.items).find(i => i.key === sortKey)?.label || "Last activity").toUpperCase()}
    >
      {F12_SORT_GROUPS.map(g => (
        <PopSection key={g.group} label={g.group}>
          {g.items.map(i => (
            <PRow key={i.key} kind="rad" on={sortKey === i.key} label={i.label} sub={i.sub} onClick={() => setSortKey(i.key)} />
          ))}
        </PopSection>
      ))}
    </F12Popover>
  );

  /**
   * Re-point the selection when the one being read is filtered out.
   *
   * ⚠️ IT RESCUES A SELECTION; IT DOES NOT CREATE ONE (§2a). Without the `selectedQueryId &&` guard
   * this also fired on mount — nothing selected is trivially "not in the list" — so it was one of
   * the two things auto-selecting the first row on load. Its stated job is to keep the pane from
   * reading a row that has gone; with nothing selected there is nothing to keep.
   */
  const statusFiltersKey = `${turnFilter}|${statusSel.join(",")}|${needsOverdue}|${needsTasks}`;
  useEffect(() => {
    if (sortedList.length > 0) {
      if (selectedQueryId && !sortedList.some(q => q.id === selectedQueryId)) {
        setSelectedQueryId(sortedList[0].id);
      }
    } else {
      setSelectedQueryId(null);
    }
  }, [statusFiltersKey, selectedManuscriptFilter, listSearch, searchQuery, queries.length]);

  // Keep the list edge-fades in sync as content height, grouping, or selection changes, and on
  // viewport resize. Scroll-driven updates come from the container's onScroll handler. The
  // Reactive date sent change handler that automatically projects response due expectations
  // Query-field editing (manuscript, dates, method, materials/package, personalisation, deadline,
  // if-no-response, rejection details) now lives in the Edit Query drawer (openEditQuery), which
  // commits through saveQueryEdits. The inline handleSaveChanges path is retired.

  // Active query activity timeline logs
  const activeActivities = activities
    .filter(act => act.queryId === selectedQueryId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handlePostJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQueryId || !journalInput.trim()) return;
    addJournalEntry(selectedQueryId, journalInput.trim());
    setJournalInput("");
  };

  const getListStatusPill = (status: QueryStatus) => {
    return <StatusPill status={status} size="sm" />;
  };

  const exportQueriesToCSV = (listToExport: Query[], baseFilename: string) => {
    /* ⚠️ THE QUOTING WAS RIGHT AND IT WAS NOT ENOUGH. This escaped `"`, `,`, CR and LF and never
       looked at the first character, so a cell beginning `=`/`+`/`-`/`@` was written out and
       EVALUATED when the file opened — RFC quoting cannot neutralise a formula, because the
       spreadsheet strips the CSV quotes before it parses the cell. And the text is not always the
       writer's own: agent name, agency and email reach these rows through Smart Import, which
       parses third-party CSVs and pasted emails. `csvCell` neutralises then quotes; the null /
       number / trim handling that is this caller's own stays here. */
    const escapeCSVField = (val: string | number | undefined | null): string => {
      if (val === undefined || val === null) return "";
      return csvCell(String(val).trim());
    };

    const formatCSVDate = (isoString?: string): string => {
      if (!isoString) return "";
      try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return "";
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      } catch (e) {
        return "";
      }
    };

    const formatJournalDate = (isoString?: string): string => {
      if (!isoString) return "";
      try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return "";
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${d.getDate()} ${months[d.getMonth()]}`;
      } catch (e) {
        return "";
      }
    };

    const getCSVStatusLabel = (status: string | QueryStatus): string => {
      const norm = normalizeStatus(status);
      switch (norm) {
        case QueryStatus.QUERIED: return "Queried";
        case QueryStatus.PARTIAL_REQUESTED: return "Partial requested";
        case QueryStatus.PARTIAL_SENT: return "Partial sent";
        case QueryStatus.FULL_REQUESTED: return "Full requested";
        case QueryStatus.FULL_SENT: return "Full sent";
        case QueryStatus.REVISE_RESUBMIT: return "Revise & Resubmit";
        case QueryStatus.OFFER: return "Offer";
        case QueryStatus.REJECTED: return "Rejected";
        case QueryStatus.WITHDRAWN: return "Withdrawn";
        case QueryStatus.NO_RESPONSE: return "No response";
        default: return norm || "";
      }
    };

    const calculateDaysSince = (dateSentIso?: string): string => {
      if (!dateSentIso) return "";
      try {
        const sent = new Date(dateSentIso);
        if (isNaN(sent.getTime())) return "";
        const today = new Date();
        const diffTime = today.getTime() - sent.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 ? String(diffDays) : "0";
      } catch (e) {
        return "";
      }
    };

    const getLastStatusChangeDate = (q: Query, activitiesList: any[]): string => {
      const dates: Date[] = [];
      if (q.dateSent) {
        const d = new Date(q.dateSent);
        if (!isNaN(d.getTime())) dates.push(d);
      }
      if (q.partialRequestedDate) {
        const d = new Date(q.partialRequestedDate);
        if (!isNaN(d.getTime())) dates.push(d);
      }
      if (q.partialSentDate) {
        const d = new Date(q.partialSentDate);
        if (!isNaN(d.getTime())) dates.push(d);
      }
      if (q.fullRequestedDate) {
        const d = new Date(q.fullRequestedDate);
        if (!isNaN(d.getTime())) dates.push(d);
      }
      if (q.fullSentDate) {
        const d = new Date(q.fullSentDate);
        if (!isNaN(d.getTime())) dates.push(d);
      }

      const qActs = activitiesList.filter(
        (act) =>
          act.queryId === q.id &&
          (act.activityType === ActivityType.STATUS_CHANGED || act.activityType === ActivityType.MATERIALS_SENT)
      );
      qActs.forEach((act) => {
        if (act.date) {
          const d = new Date(act.date);
          if (!isNaN(d.getTime())) dates.push(d);
        }
      });

      if (dates.length === 0) return "";
      const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
      return formatCSVDate(maxDate.toISOString());
    };

    const headers = [
      "Agent",
      "Agency",
      "Agent email",
      "Manuscript",
      "Status",
      "Date sent",
      "Days since sent",
      "Sent via",
      "Materials included",
      "Personalisation note",
      "Response deadline",
      "Nudge date",
      "Last status change",
      "Guidelines URL",
      "Notes",
      "Query ID"
    ];

    let csvContent = headers.join(",") + "\n";

    listToExport.forEach(q => {
      const ag = agents.find(a => a.id === q.agentId);
      const ms = manuscripts.find(m => m.id === q.manuscriptId);

      const agentName = ag ? agentPrimary(ag) : "";
      const agencyName = ag?.agency || "";
      const agentEmail = ag?.email || "";
      const manuscriptTitle = ms?.title || "";
      const statusLabel = getCSVStatusLabel(q.status);
      const dateSentClean = formatCSVDate(q.dateSent);
      const daysSinceSent = calculateDaysSince(q.dateSent);
      const sentVia = sendMethodLabel(q.sendMethod || ag?.submissionMethod);

      const matsRaw = Array.isArray((q as any).materials)
        ? (q as any).materials
        : Array.isArray((q as any).materialsWanted)
          ? (q as any).materialsWanted
          : Array.isArray(ag?.materialsWanted)
            ? ag.materialsWanted
            : [];
      const cleanMats = matsRaw.map((v: string | QueryMaterial) => formatQueryMaterial(v)).filter((v: string) => !!v);
      const materialsIncluded = cleanMats.join(", ");

      const personalisationNote = q.personalisationNotes || "";
      /* ⚠️ §2 · THE EXPORT STATES THE RESOLVED DATE, so a spreadsheet does not go blank the day the
         column it read stopped being written. */
      const responseDeadlineClean = formatCSVDate(
        resolveExpectedDate(q, lastSendMs(q), agents.find(ag => ag.id === q.agentId)?.responseTimeWeeks).ms
          ? new Date(resolveExpectedDate(q, lastSendMs(q), agents.find(ag => ag.id === q.agentId)?.responseTimeWeeks).ms!).toISOString()
          : undefined,
      );
      const nudgeDateClean = formatCSVDate(q.nudgeDate);
      const lastStatusChange = getLastStatusChangeDate(q, activities);
      const guidelinesUrl = ag?.website || "";

      const qNotesMatched = journalEntries
        .filter(j => j.queryId === q.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      const notesSerialized = qNotesMatched
        .map(entry => {
          const dateStr = formatJournalDate(entry.createdAt);
          const txt = entry.entryText || "";
          return dateStr ? `${dateStr}: ${txt}` : txt;
        })
        .filter(t => !!t)
        .join(" | ");

      const queryIdVal = q.id || "";

      const rowValues = [
        agentName,
        agencyName,
        agentEmail,
        manuscriptTitle,
        statusLabel,
        dateSentClean,
        daysSinceSent,
        sentVia,
        materialsIncluded,
        personalisationNote,
        responseDeadlineClean,
        nudgeDateClean,
        lastStatusChange,
        guidelinesUrl,
        notesSerialized,
        queryIdVal
      ];

      csvContent += rowValues.map(v => escapeCSVField(v)).join(",") + "\n";
    });

    const bom = "\uFEFF";
    const fileBlob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const fileUrl = URL.createObjectURL(fileBlob);
    const linkObj = document.createElement("a");
    linkObj.href = fileUrl;
    linkObj.setAttribute("download", `${baseFilename}.csv`);
    document.body.appendChild(linkObj);
    linkObj.click();
    document.body.removeChild(linkObj);
  };

  const handleExportFilteredCSV = () => {
    exportQueriesToCSV(sortedList, `ScriptAlly_Filtered_Queries_${new Date().toISOString().slice(0, 10)}`);
  };

  const renderContextualActionBanner = () => null;


  const countQueried = queries.filter(q => q.status === QueryStatus.QUERIED).length;
  const countPartialReq = queries.filter(q => q.status === QueryStatus.PARTIAL_REQUESTED).length;
  const countPartialSent = queries.filter(q => q.status === QueryStatus.PARTIAL_SENT).length;
  const countFullReq = queries.filter(q => q.status === QueryStatus.FULL_REQUESTED).length;
  const countFullSent = queries.filter(q => q.status === QueryStatus.FULL_SENT).length;
  const countRR = queries.filter(q => q.status === QueryStatus.REVISE_RESUBMIT).length;
  const countOffer = queries.filter(q => q.status === QueryStatus.OFFER).length;
  const countClosed = closedCount;

  const handleDownloadPDF = async () => {
    if (!activeQuery || !activeAgent || !activeMs) return;
    setIsGeneratingPDF(true);
    try {
      const agentName = agentPrimary(activeAgent);
      const agencyName = activeAgent.agency;
      const status = getStatusLabel(activeQuery.status);
      const sendMethod = activeQuery.sendMethod;
      const starCount = activeAgent.starRating;
      const manuscriptTitle = activeMs.title;
      const genre = activeMs.genre;
      const wordCount = activeMs.wordCount;
      const synopsis = activeMs.logline || "";

      const timelineEvents: {
        title: string;
        date: string;
        formattedDate: string;
        detail: string | null;
        materials: string | null;
        expectedDate: string | null;
        nudgeDate: string | null;
      }[] = [];

      /* ⚠️ RENAMED OFF `sendMethodLabel` (§3) — that name is now the shared display helper, and a
         local `const` of the same name inside this function would shadow the import for every line
         below it, silently. This one is the RAW stored value, not the label. */
      const rawSendMethod = activeQuery.sendMethod || "Email";
      const queryMaterialsList = (() => {
        const list = Array.isArray((activeQuery as any).materialsWanted)
          ? (activeQuery as any).materialsWanted
          : Array.isArray(activeAgent.materialsWanted)
            ? activeAgent.materialsWanted
            : [];
        return list;
      })();
      timelineEvents.push({
        title: "Query sent",
        date: activeQuery.dateSent,
        formattedDate: new Date(activeQuery.dateSent).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        detail: `via ${rawSendMethod}`,
        materials: queryMaterialsList.length > 0 ? queryMaterialsList.map(formatQueryMaterial).join(", ") : null,
        expectedDate: null,
        nudgeDate: null
      });

      // Typed-fields mapping (activityEventLabel, Tier 3 · Phase 2): resultingStatus +
      // activityType only — rewording activity prose can no longer change the timeline, and a
      // row with no typed signal is inert rather than mis-mapped.
      const otherActs = activeActivities
        .filter(act => activityEventLabel(act) !== null)
        .map(act => ({ type: activityEventLabel(act)!, date: act.date, details: act.details || null }));
      otherActs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      otherActs.forEach(act => {
        let materialsSent: string | null = null;
        if (act.type === "Partial sent") materialsSent = "Partial Manuscript";
        else if (act.type === "Full sent") materialsSent = "Full Manuscript";
        let displayedDetail = act.details;
        if (displayedDetail && displayedDetail.toLowerCase().includes("heard back")) {
          const isQuerySentStatus = activeQuery.status === QueryStatus.QUERIED;
          const isPartialSentStatus = activeQuery.status === QueryStatus.PARTIAL_SENT;
          const isFullSentStatus = activeQuery.status === QueryStatus.FULL_SENT;
          if (!isQuerySentStatus && !isPartialSentStatus && !isFullSentStatus) displayedDetail = null;
        }
        timelineEvents.push({
          title: act.type,
          date: act.date,
          formattedDate: new Date(act.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
          detail: displayedDetail,
          materials: materialsSent,
          expectedDate: null,
          nudgeDate: null
        });
      });

      const isQueryActive = [
        QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT,
        QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT
      ].includes(activeQuery.status);

      if (isQueryActive) {
        /* ⚠️ §2 · RESOLVED, not the retired column — a PDF is the one artefact a writer keeps. */
        const resolvedExp = resolveExpectedDate(activeQuery, lastSendMs(activeQuery), activeAgent?.responseTimeWeeks);
        const deadlineDate = (resolvedExp.ms ? new Date(resolvedExp.ms).toISOString() : undefined) || activeQuery.dateSent;
        timelineEvents.push({
          title: "Waiting to hear back",
          date: deadlineDate,
          formattedDate: new Date(deadlineDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
          detail: null,
          materials: null,
          expectedDate: resolvedExp.ms ? new Date(resolvedExp.ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "None set",
          nudgeDate: activeQuery.nudgeDate ? new Date(activeQuery.nudgeDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null
        });
      } else {
        let finalLabel = "Final Decision Outcome Marker Logged";
        if (activeQuery.status === QueryStatus.REJECTED) finalLabel = "Rejected";
        if (activeQuery.status === QueryStatus.WITHDRAWN) finalLabel = "Withdrawn Pipeline";
        if (activeQuery.status === QueryStatus.NO_RESPONSE) finalLabel = "Archived as No Response";
        if (activeQuery.status === QueryStatus.OFFER) finalLabel = "Offer of Representation! 🏆";
        const lastActivityDate = activeActivities.length > 0 ? activeActivities[activeActivities.length - 1].date : activeQuery.dateSent;
        timelineEvents.push({
          title: finalLabel,
          date: lastActivityDate,
          formattedDate: new Date(lastActivityDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
          detail: activeQuery.status === QueryStatus.REJECTED ? "Pipeline archived. We keep tracking performance metrics on packages." : null,
          materials: null,
          expectedDate: null,
          nudgeDate: null
        });
      }

      const notes = journalEntries
        .filter(entry => entry.queryId === activeQuery.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map(entry => ({
          text: entry.entryText,
          formattedDate: new Date(entry.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
        }));

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);

      doc.setFillColor(124, 61, 61);
      doc.rect(0, 0, 210, 4, 'F');
      let y = 14;

      const checkPageBreak = (neededSpace = 10) => {
        if (y + neededSpace > 277) {
          doc.addPage();
          doc.setFillColor(124, 61, 61);
          doc.rect(0, 0, 210, 4, 'F');
          y = 20;
        }
      };

      const addLine = (yPos: number) => {
        doc.setDrawColor(232, 224, 216);
        doc.setLineWidth(0.2);
        doc.line(margin, yPos, pageWidth - margin, yPos);
      };

      const logoImg = document.querySelector('nav img, header img, .logo img, img[alt*="ScriptAlly"], img[alt*="Script"]') as HTMLImageElement | null;
      if (logoImg && logoImg.naturalWidth && logoImg.naturalHeight) {
        const logoCanvas = document.createElement('canvas');
        logoCanvas.width = logoImg.naturalWidth;
        logoCanvas.height = logoImg.naturalHeight;
        const ctx = logoCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(logoImg, 0, 0);
          const logoData = logoCanvas.toDataURL('image/png');
          const logoW = 36;
          const logoH = (logoImg.naturalHeight / logoImg.naturalWidth) * logoW;
          doc.addImage(logoData, 'PNG', (210 - logoW) / 2, y, logoW, logoH);
          y += logoH + 4;
        } else {
          doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(124, 61, 61);
          doc.text('ScriptAlly', 105, y, { align: 'center' }); y += 8;
        }
      } else {
        doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(124, 61, 61);
        doc.text('ScriptAlly', 105, y, { align: 'center' }); y += 8;
      }

      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(201, 168, 158);
      doc.text('EXPORTED QUERY RECORD', 105, y, { align: 'center' }); y += 5;
      doc.setDrawColor(232, 224, 216); doc.setLineWidth(0.2);
      doc.line(margin, y, pageWidth - margin, y); y += 8;

      const statusLabel = status;
      const exportedDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      const headerStartY = y;

      doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(58, 28, 20);
      doc.text(agentName, margin, y); y += 7;
      doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(160, 128, 112);
      doc.text(agencyName, margin, y); y += 8;

      const metaRows = [['Status', statusLabel], ['Sent via', sendMethod], ['Rating', `${starCount} stars`], ['Exported', exportedDate]];
      metaRows.forEach(([label, value]) => {
        doc.setFontSize(10); doc.setTextColor(160, 128, 112);
        doc.text(label, margin, y);
        doc.setTextColor(58, 28, 20);
        doc.text(String(value || '—'), margin + 30, y); y += 5.5;
      });

      const agentBlockBottomY = y;
      doc.setFontSize(18); doc.setTextColor(232, 224, 216);
      doc.text('→', 105, agentBlockBottomY - 16, { align: 'center' });

      const msX = 113;
      const msW = pageWidth - margin - msX;
      const msBoxH = 52;
      doc.setFillColor(253, 248, 246); doc.setDrawColor(232, 224, 216); doc.setLineWidth(0.3);
      doc.roundedRect(msX, headerStartY - 5, msW, msBoxH, 3, 3, 'FD');
      let msY = headerStartY + 1;
      doc.setFontSize(7); doc.setTextColor(201, 168, 158); doc.setFont('helvetica', 'normal');
      doc.text('MANUSCRIPT', msX + 5, msY); msY += 5;
      doc.setFontSize(12); doc.setTextColor(58, 28, 20); doc.setFont('helvetica', 'bold');
      const msTitleLines = doc.splitTextToSize(manuscriptTitle, msW - 10);
      doc.text(msTitleLines, msX + 5, msY); msY += msTitleLines.length * 5 + 2;
      doc.setFontSize(9); doc.setTextColor(160, 128, 112); doc.setFont('helvetica', 'normal');
      doc.text(genre || '—', msX + 5, msY); msY += 5;
      doc.setDrawColor(232, 224, 216); doc.line(msX + 5, msY, msX + msW - 5, msY); msY += 4;
      doc.setFontSize(9); doc.setTextColor(106, 80, 69); doc.setFont('helvetica', 'italic');
      const blurbLines = doc.splitTextToSize(`"${synopsis || ''}"`, msW - 10);
      doc.text(blurbLines, msX + 5, msY);

      const msBottomY = headerStartY - 5 + msBoxH + 4;
      y = Math.max(agentBlockBottomY, msBottomY) + 6;
      doc.setDrawColor(232, 224, 216); doc.setLineWidth(0.2);
      doc.line(margin, y, pageWidth - margin, y); y += 8;

      checkPageBreak(10);
      doc.setFontSize(8); doc.setTextColor(201, 168, 158); doc.setFont('helvetica', 'normal');
      doc.text('TRACKING', margin, y); y += 2;
      doc.setDrawColor(232, 224, 216); doc.line(margin + 22, y - 1, pageWidth - margin, y - 1); y += 8;

      (timelineEvents || []).forEach((event, i) => {
        checkPageBreak(20);
        const isFuture = new Date(event.date) > new Date();
        if (!isFuture) { doc.setFillColor(124, 61, 61); doc.circle(margin + 2, y - 1, 2, 'F'); }
        else { doc.setDrawColor(201, 168, 158); doc.setLineWidth(0.5); doc.circle(margin + 2, y - 1, 2, 'S'); }
        if (i < (timelineEvents.length - 1)) { doc.setDrawColor(232, 224, 216); doc.setLineWidth(0.3); doc.line(margin + 2, y + 1, margin + 2, y + 16); }
        doc.setFontSize(11); doc.setTextColor(58, 28, 20); doc.setFont('helvetica', 'bold');
        doc.text(event.title, margin + 8, y);
        doc.setFontSize(10); doc.setTextColor(201, 168, 158); doc.setFont('helvetica', 'normal');
        doc.text(event.formattedDate || '', pageWidth - margin, y, { align: 'right' }); y += 5;
        if (event.detail) { doc.setFontSize(10); doc.setTextColor(160, 128, 112); doc.text(event.detail, margin + 8, y); y += 5; }
        if (event.materials) { doc.setFontSize(10); doc.setTextColor(160, 128, 112); doc.text('Sent: ', margin + 8, y); doc.setTextColor(58, 28, 20); doc.text(event.materials, margin + 18, y); y += 5; }
        if (isFuture && event.expectedDate) {
          doc.setFillColor(255, 240, 240); doc.setDrawColor(245, 200, 200); doc.roundedRect(margin + 8, y - 3, contentWidth - 8, 10, 2, 2, 'FD');
          doc.setFontSize(10); doc.setTextColor(124, 61, 61);
          const hasNudgeStr = (event.nudgeDate && event.nudgeDate !== '!') ? ` · Nudge: ${event.nudgeDate}` : '';
          doc.text(`Response expected: ${event.expectedDate}${hasNudgeStr}`, margin + 11, y + 3); y += 12;
        }
        y += 6;
      });

      y += 4; checkPageBreak(10); addLine(y); y += 8;

      doc.setFontSize(8); doc.setTextColor(201, 168, 158); doc.setFont('helvetica', 'normal');
      doc.text('NOTES', margin, y); y += 2;
      doc.setDrawColor(232, 224, 216); doc.line(margin + 14, y - 1, pageWidth - margin, y - 1); y += 8;

      if (!notes || notes.length === 0) {
        checkPageBreak(10);
        doc.setFontSize(11); doc.setTextColor(201, 168, 158); doc.setFont('helvetica', 'italic');
        doc.text('No notes recorded.', margin, y); y += 8;
      } else {
        notes.forEach((note) => {
          checkPageBreak(15);
          doc.setFontSize(9); doc.setTextColor(201, 168, 158); doc.setFont('helvetica', 'normal');
          doc.text(note.formattedDate || '', margin, y); y += 5;
          doc.setFontSize(11); doc.setTextColor(58, 28, 20);
          const noteLines = doc.splitTextToSize(note.text, contentWidth);
          doc.text(noteLines, margin, y); y += noteLines.length * 5 + 4;
          doc.setDrawColor(240, 232, 224); doc.line(margin, y, pageWidth - margin, y); y += 5;
        });
      }

      checkPageBreak(10); y += 4; addLine(y); y += 6;
      doc.setFontSize(10); doc.setTextColor(201, 168, 158); doc.setFont('helvetica', 'normal');
      doc.text('ScriptAlly', margin, y);
      doc.text(`Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`, pageWidth - margin, y, { align: 'right' });

      const pdfFilename = `${(agentName || 'agent').toLowerCase().replace(/\s+/g, '-')}-${(manuscriptTitle || 'manuscript').toLowerCase().replace(/\s+/g, '-')}-query.pdf`;
      doc.save(pdfFilename);
    } catch (error: any) {
      console.error('PDF generation failed:', error?.message || error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Keep stable refs in sync for keydown handler (runs before each render's effects)
  sortedListRef.current = sortedList;
  /* v5 P2 — the GRACE ROW. A query the filters would hide still gets to appear and settle, so a
     save is never a silent no-op; it then collapses out behind the toast. It is placed by the real
     comparator, not pinned to the top, so the brief moment it is on screen is honest about where
     it lives. */
  const graceQuery = graceRow ? queries.find((q) => q.id === graceRow.id) ?? null : null;
  const renderList = graceQuery && !sortedList.some((q) => q.id === graceQuery.id)
    ? [...sortedList, graceQuery].sort(compareQueries)
    : sortedList;


  /* ══ §4 · THE LIST'S ONE VISUAL ORDER ════════════════════════════════════════════════════════
   *
   * ⚠️ DERIVED ONCE, READ BY THE ARROWS AND BY THE RENDER. The grouping used to be computed inside
   * an IIFE in the JSX; a keyboard model computing it a second time is two answers to "which rows
   * are showing", and they come apart at exactly the states that are hard to notice — a folded
   * group, a grace row mid-collapse. Down skipping a row that is plainly on screen is what that
   * looks like from the outside.
   *
   * ⚠️ AND `shut` IS PART OF THE DERIVATION, not of the render. A folded group contributes no rows
   * to the order, which is why "Down crosses a group boundary" needs no special case anywhere: the
   * headings and the hidden rows are simply not in the array.
   *
   * ⚠️ PLAIN CONSTS, DECLARED HERE. `useMemo` would need `Date.now()` in its dependencies to keep
   * the overdue split honest across a day boundary; the grouping was computed per render before
   * this and still is. What moved is WHERE, not how often.
   */
  /**
   * §1 — ⚠️ THE LIST OPENS FLAT, AND GROUPING IS NOT DELETED: IT MOVES BEHIND THE FILTER.
   *
   * Grouping answers "who do I chase", which is a question the writer asks by CHOOSING it. On load
   * they have not asked anything yet, so four headings over a short list is the page arranging
   * itself before being told what for — and on an account with a handful of queries the headings
   * outnumbered the rows they organised.
   *
   * ⚠️ THE TRIGGER IS THE FILTER THEY ALREADY SET, NOT A NEW CONTROL. `Whose turn` and `Status` are
   * the two sections that ask about state, and state is what the groups partition — so choosing
   * either brings the grouped reading back, exactly as it renders today. A separate "Group by"
   * control would be a second way to say the same thing, and the two would eventually disagree.
   *
   * ⚠️ AND THE GROUPING ITSELF IS UNTOUCHED — same `listGroupFor`, same `GROUP_ORDER`, same fold on
   * the closed group. What is conditional is whether the partition is DRAWN, never how it is made:
   * the flat list is one section holding every row, so keyboard order, `visibleIds` and the
   * selection-holds-a-fold rule all keep working without a second code path.
   */
  const listGrouped = listIsGrouped(turnFilter, statusSel);

  /**
   * §2b — is the pane in its unselected state? ⚠️ IT MIRRORS THE RENDER'S OWN BRANCH CHAIN
   * (creating → a selection → filtered-to-zero → nothing selected), because the chassis has to come
   * off in exactly the case the bare pane renders. Derived from the same three values the chain
   * reads, so the two cannot fall out of step.
   */
  /**
   * §3a — THE LIST'S HEAD, DEFINED ONCE AND RENDERED IN BOTH STATES.
   *
   * ⚠️ THE CHROME DOES NOT SKELETON — the search and the Filter/Sort controls stay exactly as they
   * are while the rows below them load. They act on state that exists without data, so there is
   * nothing to wait for, and a writer can start typing a search before the list arrives.
   *
   * ⚠️ AND IT IS THE SAME ELEMENT, NOT A MATCHING ONE. The skeleton used to draw its own search
   * block instead: a 40px `.f12-lhead` replaced by a different box, so the rows beneath it started
   * at a different height and everything shifted when data landed — the exact jump the skeleton
   * exists to prevent, built into the skeleton.
   */
  const listHead = (
            <div className="f12-lhead">
              <div className="f12-lsearch">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                <input
                  type="text"
                  placeholder="Search"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  aria-label="Search queries"
                />
              </div>
              {/* ⚠️ FILTER AND SORT ARE BACK IN THIS ROW (§3a), REVERSING §1's MOVE ON ITS OWN
                  TERMS. §1 argued they "narrow the list, so they stay over the list" and put them
                  beside the count — which is over the list, and is also the row the pack labelled
                  THIS QUERY. Two controls acting on the whole set sat inside a row named for one
                  record. They act on the LIST, so they belong in the list's own row, beside the
                  field they act with.

                  ⚠️ NOTHING IS LOST IN THE MOVE, and that is worth stating because it looks like it
                  should be: `PillTrig` has been a 36px icon button since v5 P1 — the word lives in
                  the title, the aria-label and the popover's own header — so the sort's chosen value
                  was never on its face. The field shortens by two buttons and a gap; the wiring,
                  handlers, popovers and refs are untouched. */}
              <div className="f12-popwrap">
                <PillTrig
                  ref={filterTrigRef}
                  label="Filter"
                  open={filterPopOpen}
                  active={activeFilterCount > 0}
                  count={activeFilterCount}
                  onClick={() => { setSortPopOpen(false); setGroupPopOpen(false); setFilterPopOpen(o => !o); }}
                  icon={<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18l-7 8v6l-4-2v-4L3 5z" /></svg>}
                />
                {filterPopOpen && renderFilterPopover()}
              </div>
              {/* ⚠️ GROUP JOINS THE TRIO RATHER THAN SITTING ALONE. It was a lone icon at the end of
                  the quick-filter row, which read as a sixth pill; measured against the ref, that
                  row holds courts and nothing else. Filter · Group · Sort narrow-and-arrange
                  together, and the ref draws them together.
                  ⚠️ ONE `listHead` SERVES BOTH VIEWS, so the trio's refs are attached once — the
                  browsing grid and the record are mutually exclusive branches, never both mounted. */}
              <div className="f12-popwrap">
                <PillTrig
                  ref={groupTrigRef}
                  label="Group"
                  open={groupPopOpen}
                  active={gridGroup !== "none"}
                  value={gridGroup !== "none" ? GRID_GROUPS.find((g) => g.key === gridGroup)?.label : undefined}
                  onClick={() => { setFilterPopOpen(false); setSortPopOpen(false); setGroupPopOpen((o) => !o); }}
                  icon={<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10" /></svg>}
                />
                {groupPopOpen && renderGroupPopover()}
              </div>
              <div className="f12-popwrap">
                <PillTrig
                  ref={sortTrigRef}
                  label="Sort"
                  open={sortPopOpen}
                  active={sortKey !== "last_activity"}
                  value={sortKey !== "last_activity" ? (F12_SORT_GROUPS.flatMap(g => g.items).find(i => i.key === sortKey)?.label || undefined) : undefined}
                  onClick={() => { setFilterPopOpen(false); setGroupPopOpen(false); setSortPopOpen(o => !o); }}
                  icon={<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v14M7 18l-3-3M7 18l3-3M17 20V6M17 6l-3 3M17 6l3 3" /></svg>}
                />
                {sortPopOpen && renderSortPopover()}
              </div>
            </div>
  );

  const paneUnselected = !creating && !selectedQueryId && sortedList.length > 0;

  /**
   * §2 — ONE READINESS VALUE, READ EVERYWHERE.
   *
   * ⚠️ THE 180ms GRACE IS GONE, AND IT WAS THE FAULT. It started its timer at MOUNT, and this page
   * mounts when `authReady` resolves — measured at ~336ms — so for the next 180ms the skeleton's
   * own condition was false and the branch beneath it rendered "Your first query starts here".
   * Data arrived at 491ms, INSIDE that window, so the skeleton could never appear at all and the
   * empty state covered the entire load. A grace before a skeleton is a grace during which
   * something else renders, and that something was the wrong answer.
   *
   * ⚠️ A SKELETON ON A FAST LOAD IS HARMLESS; A WRONG ANSWER IS NOT. The flash it was written to
   * avoid is handled by the minimum-display floor in §3 instead — which holds the skeleton rather
   * than delaying it, and so cannot leave a gap for anything else to fill.
   */
  const dataReady = collectionsReady;

  /**
   * §3b — THE MINIMUM-DISPLAY FLOOR, and §3c's resolution.
   *
   * ⚠️ A FLOOR HOLDS THE SKELETON; A GRACE DELAYED IT. That is the whole difference. The retired
   * 180ms grace left a gap at the START of the load for the wrong answer to fill; a floor extends
   * the RIGHT answer at the end, so there is never a moment with nothing correct to show.
   *
   * ⚠️ AND IT NEVER RUNS WHEN THE DATA IS ALREADY THERE. `startedUnready` is decided at the first
   * render and never again: arrive with collections loaded — a second visit, since this page stays
   * mounted — and the skeleton is skipped entirely. A floor that fired regardless would be a timer
   * showing a skeleton after the data had arrived, which is the one thing it must not become.
   */
  const startedUnready = useRef<boolean | null>(null);
  if (startedUnready.current === null) startedUnready.current = !dataReady;
  const [floorDone, setFloorDone] = useState(false);
  useEffect(() => {
    if (!startedUnready.current) { setFloorDone(true); return; }
    const t = setTimeout(() => setFloorDone(true), SKELETON_FLOOR_MS);
    return () => clearTimeout(t);
  }, []);

  /**
   * §3c — ⚠️ A REMEMBERED SELECTION RESOLVES BEHIND THE SKELETON, NEVER IN FRONT OF IT. The restore
   * runs in an effect once the queries arrive, so the content would render UNSELECTED for one frame
   * and the remembered query would appear after it — a flash of "Select a query to get started" on
   * every return visit. Reading the id at mount lets the skeleton stay up until the selection it is
   * going to resolve into has actually been applied.
   *
   * ⚠️ IT WAITS ONLY FOR AN ID THE DATA ACTUALLY CONTAINS. A remembered query that has since been
   * deleted would otherwise hold the skeleton forever, waiting for a row that is never coming.
   */
  /**
   * ⚠️ `awaitingRemembered` IS DELETED WITH THE AUTO-SELECT IT SERVED. It held the skeleton until the
   * LAST-VIEWED query had loaded, so the page would not flash a list before restoring the record —
   * which was the right compensation while something restored one. Nothing does: `?q=` is the only
   * thing that selects, and a deep link's id is in the URL from the first frame. Keeping it would
   * have held the grid behind a skeleton waiting for a row it was never going to open.
   */
  const showSkeleton = !!startedUnready.current && (!dataReady || !floorDone);

  /**
   * ⚠️ THE FADE IS ARMED ONLY WHEN A SKELETON ACTUALLY PRECEDED THE CONTENT. A page that was ready
   * at mount has nothing to cross-fade FROM, and fading it in anyway would put a 200ms veil over
   * every ordinary return to this page.
   */
  const fadeIn = !!startedUnready.current && !showSkeleton;

  const listGroups = (() => {
    const nowMs = Date.now();
    const rows = renderList
      .map((q) => ({ q, agent: agents.find((a) => a.id === q.agentId), ms: manuscripts.find((m) => m.id === q.manuscriptId) }))
      /* ⚠️ THE SECOND DROP, AND IT IS WHY FIXING `matchesFilters` ALONE DID NOTHING. This read
         `.filter((r) => !!r.agent && !!r.ms)` — a join that silently discarded any row whose agent
         or manuscript did not resolve, after the predicate above had already agreed to show it.
         Measured: with the predicate fixed and this still in place, 47 stored and 44 rendered.
         Two independent gates on the same fact, and only the second one was load-bearing. */
      ;
    /* ⚠️ ONE SECTION, IN THE SORT'S OWN ORDER — `rows` is already sorted (grouping partitions an
       already-sorted list), so the flat view is that same array undivided. It is deliberately the
       same shape the grouped path returns, so everything downstream reads one structure. */
    if (!listGrouped) return [{ g: "flat" as ListSection, items: rows, foldable: false, shut: false }];
    return GROUP_ORDER
      /* ⚠️ `listGroupFor` READS THE AGENT'S RESPONSE WINDOW, so an unresolvable agent threw and took
         the WHOLE LIST with it — measured 0 rows rendered, the page-won't-load shape. An unassigned
         row has no stated window and therefore no honest group: it goes to `waiting`, which is what
         the function returns when nothing is overdue, rather than being guessed into `overdue`. */
      .map((g) => ({ g, items: rows.filter((r) => (r.agent ? listGroupFor(r.q as never, r.agent, nowMs) : "waiting") === g) }))
      .filter((s) => s.items.length > 0)
      .map(({ g, items }) => {
        /* the fold is the closed group's alone, and only once folding earns its place */
        const foldable = g === "closed" && foldClosed(items.length);
        /* a fold never hides the row the pane is reading — derived, never an effect that opens it */
        const holdsSelection = foldable && items.some((r) => r.q.id === selectedQueryId);
        return { g, items, foldable, shut: foldable && !closedOpen && !holdsSelection };
      });
  })();
  const visibleIds = listGroups.flatMap(({ items, shut }) => (shut ? [] : items.map((r) => r.q.id)));

  /* ══ §4c · THE LIST IS ONE COMPOSITE WIDGET ═════════════════════════════════════════════════
   *
   * ⚠️ ONE TAB STOP, ROVING. Forty rows, each a `<button>`, was forty tab stops between the search
   * field and the reading pane — Tab as a way THROUGH the list rather than PAST it. The row holding
   * the cursor carries `tabIndex={0}` and every other carries `-1`, so Tab enters the list at where
   * the writer was and the next Tab leaves it.
   *
   * ⚠️ IT DEFAULTS TO THE SELECTION, not to the top. The pane is already reading a query; entering
   * the list anywhere else would move the reading on the first arrow press.
   */
  /**
   * ⚠️ THE CURSOR IS DERIVED FROM THE SELECTION, NOT STORED — a FIX, not a preference. It was a
   * `rovingId` state that only the keyboard handler wrote while clicks wrote the selection, so the
   * two disagreed the moment a writer used one after the other. Measured on the deployed build:
   * keyboard to row 7, click row 2, press Down, and focus landed on row EIGHT — the stale stored
   * cursor was still 7 and the click had never touched it.
   *
   * ⚠️ THE SELECTED QUERY ALREADY IS THE CURSOR. Selection follows focus here, so every navigation
   * key moves the selection anyway; a second position alongside it was recording what could be
   * read. Derived, the disagreement is structurally impossible rather than fixed — there is no
   * second value for a future call site to forget to write.
   *
   * ⚠️ AND THE INDEX IS TAKEN AT THE POINT OF USE, from `visibleIds` — the one visual order, with
   * group headings and folded rows simply not in it. That is why position IS derivable from the
   * selected id alone, which is the condition the pack sets for not storing one.
   */
  const cursorId = selectedQueryId && visibleIds.includes(selectedQueryId) ? selectedQueryId : visibleIds[0] ?? null;
  /* type-ahead's buffer — refs, because a keystroke must read the run it is extending rather than
     the run as it was when the handler was last rendered */
  const typeBufRef = useRef("");
  const typeAtRef = useRef(0);
  /**
   * ⚠️ FOCUS AND SCROLL ARE AN EFFECT OF THE STATE, NOT OF THE KEYSTROKE. Calling `.focus()` inside
   * the handler focuses the row as it was BEFORE the re-render, which on a list that reorders under
   * a sort is the wrong element. This runs after the row with `tabIndex={0}` exists.
   *
   * ⚠️ AND IT ONLY TAKES FOCUS IF THE LIST ALREADY HAD IT. Otherwise selecting a row by clicking
   * the pane, or a `?q=` deep link, would yank focus into the list from wherever the writer was.
   */
  const kbdMoveRef = useRef(false);
  useEffect(() => {
    if (!kbdMoveRef.current || !cursorId) return;
    kbdMoveRef.current = false;
    const el = document.getElementById(`query-row-${cursorId}`);
    if (!el) return;
    el.focus();
    /* ⚠️ `nearest`, so a row already on screen does not scroll the list at all. `center` would
       jog the whole list on every arrow press. */
    el.scrollIntoView({ block: "nearest" });
  }, [cursorId]);

  /**
   * ⚠️ WHEN THE LIST CHANGES UNDER FOCUS, THE NEAREST SURVIVOR TAKES IT — never the top, never
   * `<body>`. Both are the same fault: the widget forgetting where the writer was because its
   * contents moved. The previous order is a ref rather than state, because reading it is the whole
   * point and re-rendering on it would be a loop.
   */
  const prevVisibleRef = useRef<string[]>([]);
  useEffect(() => {
    const prev = prevVisibleRef.current;
    prevVisibleRef.current = visibleIds;
    if (!prev.length || prev.join("\u0000") === visibleIds.join("\u0000")) return;
    if (!selectedQueryId || visibleIds.includes(selectedQueryId)) return;
    const landing = nearestSurvivor(prev, visibleIds, selectedQueryId);
    /* ⚠️ AND IT TAKES FOCUS, NOT JUST THE ROVING — "not the top, not `<body>`" is the clause, and
       a removed row leaves focus on `<body>`, where the next Tab restarts at the page's first
       control. Preserving the roving alone would keep the WIDGET's memory and lose the writer's.

       ⚠️ ONLY FROM THE LIST OR FROM NOWHERE. If the change came from typing in the search field or
       from a control in the filter popover, focus belongs to that control and stealing it would
       move the cursor out of the field the writer is still using. `<body>` is included because that
       is where focus falls when the element holding it is removed. */
    const a = document.activeElement;
    if (a === document.body || (a instanceof Node && listScrollRef.current?.contains(a))) kbdMoveRef.current = true;
    /* ⚠️ IT MOVES THE SELECTION, WHICH IS THE CURSOR. With the cursor derived there is nothing else
       to update — the fault this section fixes was a second thing to remember. */
    if (landing) setSelectedQueryId(landing);
  }, [visibleIds.join("\u0000")]);   // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * ⚠️ ONE HANDLER, ON THE LISTBOX. Per-row handlers would be forty closures over a list that
   * changes, and the container is where a composite widget's keys belong.
   *
   * ⚠️ SELECTION FOLLOWS FOCUS — this is a master–detail list over local data, so moving to a row
   * reads it, exactly as a mail client does. That is what makes Enter and Space no-ops rather than
   * a second mechanism: a `<button>` activates on both, which would fire `pickRow` again for the
   * row that is already selected.
   */
  const onListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); return; }
    if (!visibleIds.length) return;
    const at = cursorId ? visibleIds.indexOf(cursorId) : -1;
    let to: number | null = null;

    if (isListNavKey(e.key)) {
      const scroller = listScrollRef.current;
      const row = cursorId ? document.getElementById(`query-row-${cursorId}`) : null;
      to = nextIndex(e.key, at, visibleIds.length, pageSizeFor(scroller?.clientHeight ?? 0, row?.offsetHeight ?? 0));
    } else if (isTypeAheadKey(e.key, { alt: e.altKey, ctrl: e.ctrlKey, meta: e.metaKey })) {
      const now = Date.now();
      typeBufRef.current = now - typeAtRef.current > TYPEAHEAD_MS ? e.key : typeBufRef.current + e.key;
      typeAtRef.current = now;
      /* ⚠️ THE LABELS ARE THE AGENT NAMES THE ROWS DRAW, in the order they are drawn — taken from
         the same derivation, so a search can never match a row the writer cannot see. */
      const labels = visibleIds.map((id) => {
        const q = renderList.find((x) => x.id === id);
        const a = q ? agents.find((ag) => ag.id === q.agentId) : undefined;
        return a ? agentPrimary(a) : "";
      });
      to = typeAheadIndex(labels, typeBufRef.current, at);
    } else {
      return;
    }

    if (to == null) return;
    e.preventDefault();
    const id = visibleIds[to];
    kbdMoveRef.current = true;
    if (id !== selectedQueryId) { if (creating) closeCreate(() => pickRow(id)); else pickRow(id); }
  };

  selectedQueryIdRef.current = selectedQueryId;

  /* ⚠️ THE FLIP IS GONE, and removing it was not optional. It inverted the saved row from the
     draft row's last position so the two read as one row transforming. The list is now hidden
     while creating: a hidden element's getBoundingClientRect() is all zeros, so the "from" would
     have been the top of the WINDOW and every save would have flown the new row up the page.
     What remains is the settle — the list comes back and the arriving row pulses. One beat, in
     the place the eye is already going. */
  useLayoutEffect(() => {
    if (!pendingSave) return;
    const el = document.getElementById(`query-row-${pendingSave.id}`);
    if (!el) return; // not rendered yet (or hidden by a filter with no grace row)
    setPendingSave(null);
    setSettleId(pendingSave.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSave, sortedList]);

  /**
   * ⚠️ THE AUTO-SELECT FALLBACK IS RETIRED (§2a). It landed on the first row of the resolved sort
   * whenever nothing was selected, so the page always opened reading SOMETHING — a query chosen by
   * the sort rather than by the writer, presented in a pane that looks exactly like one they asked
   * for. A pane showing a real agent's record is a claim that this is what you came for.
   *
   * ⚠️ AMENDED: NOTHING SELECTS ON LOAD BUT A DEEP LINK. This note used to say the last-viewed id
   * restored too — true then, and the reason the browsing grid could not be reached once `?q=` began
   * to mean "record view". `?q=` is the only selector now.
   */

  /* ⚠️ THE LAST-VIEWED WRITE IS DELETED WITH ITS READER — see the note at the top of the file. */

  /* v4 P4 — the ROUTE-ENTRY load animation. The page stays mounted across navigation, so the entry
     is a class toggled on becoming visible, not a mount. The ANIMATION is entirely CSS (no JS
     timers drive it); this timeout only takes the class back off so the next entry can re-run it —
     the same housekeeping StagePage does for its own entry class. The keyframes use
     `animation-fill-mode: backwards`, so once they finish the elements hold NO transform and can
     never become a containing block for the page's position:fixed furniture. */
  const [entering, setEntering] = useState(false);
  const prevRouteActive = useRef(false);
  useEffect(() => {
    if (routeActive && !prevRouteActive.current) setEntering(true);
    prevRouteActive.current = routeActive;
  }, [routeActive]);
  useEffect(() => {
    if (!entering) return;
    const id = window.setTimeout(() => setEntering(false), 700); // past the last column's 0.23s + 0.24s
    return () => window.clearTimeout(id);
  }, [entering]);

  return (
    /* ── F12 root, headerless (shell rollout Phase 6): the v2 shell's top bar draws the crumb
       and the sidebar carries the account block, so F12Page's CrumbStrip + F12Account chrome
       retire — the .t-f12 f12-root scope stays (every f12-* class reads it). The page's own
       header is the compact PageHeader in the centred column below. ── */
    /* ⚠️ `qh-take` AND `qh-create` ARE GONE (§2). Both existed to tell the page a takeover had
       replaced the work area — `qh-take` hid the list, `qh-create` scoped what was create's alone.
       A journey is a sheet over the desk now; the desk changes in no way at all when one opens, so
       there is nothing for either class to key. Deleted rather than left applied-and-unmatched: a
       className that computes on every render and matches no rule is the shape someone later
       "restores" on the assumption it once did something. */
    <div className={`t-f12 qc-neutral f12-root${entering ? " qh-enter" : ""}${mobileDetailOn ? " qh-mv-detail" : " qh-mv-list"}`}>
    <div
      className="w-full flex flex-col overflow-hidden font-sans relative queries-container-theme"
      style={{ flex: 1, minHeight: 0 }}
    >
      <style>{`
        .custom-query-list-scrollbar::-webkit-scrollbar {
          width: 8px !important;
          display: block !important;
        }
        .custom-query-list-scrollbar::-webkit-scrollbar-track {
          background: ${curTheme.bgMain} !important;
        }
        .custom-query-list-scrollbar::-webkit-scrollbar-thumb {
          background-color: ${curTheme.borderMain} !important;
          border-radius: 999px !important;
          border: 1.5px solid ${curTheme.bgMain} !important;
        }
        .custom-query-list-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: ${curTheme.primary} !important;
        }
        .custom-query-list-scrollbar {
          scrollbar-width: thin !important;
          scrollbar-color: ${curTheme.borderMain} ${curTheme.bgMain} !important;
        }

        /* DYNAMIC COLORS - OVERRIDING DEFAULT BURGUNDY */
        .queries-container-theme .bg-\[\#FAF1EF\] {
          background-color: ${curTheme.primaryLight} !important;
        }
        .queries-container-theme .text-\[\#7c3a2a\] {
          color: ${curTheme.primary} !important;
        }
        .queries-container-theme .border-\[\#7c3a2a\] {
          border-color: ${curTheme.primary} !important;
        }
        .queries-container-theme .border-\[\#7c3a2a\]\/20 {
          border-color: rgba(${curTheme.primaryRGB}, 0.2) !important;
        }
        .queries-container-theme .border-\[\#7c3a2a\]\/40 {
          border-color: rgba(${curTheme.primaryRGB}, 0.4) !important;
        }
        .queries-container-theme .text-\[\#7c3a2a\]\/80 {
          color: rgba(${curTheme.primaryRGB}, 0.8) !important;
        }
        .queries-container-theme .hover\:text-\[\#7c3a2a\]:hover {
          color: ${curTheme.primary} !important;
        }
        .queries-container-theme .hover\:bg-\[\#7c3a2a\]\/5:hover {
          background-color: rgba(${curTheme.primaryRGB}, 0.05) !important;
        }
        .queries-container-theme .hover\:bg-\[\#7c3a2a\]\/10:hover {
          background-color: rgba(${curTheme.primaryRGB}, 0.1) !important;
        }
        .queries-container-theme .bg-\[\#FAF1EF\]\/85 {
          background-color: rgba(${curTheme.primaryRGB}, 0.08) !important;
        }
        .queries-container-theme .hover\:bg-\[\#FAF1EF\]\/85:hover {
          background-color: rgba(${curTheme.primaryRGB}, 0.12) !important;
        }
        .queries-container-theme .bg-\[\#7c3a2a\] {
          background-color: ${curTheme.primary} !important;
        }
        .queries-container-theme .bg-\[\#3a1c14\] {
          background-color: ${curTheme.primaryDark} !important;
        }
        .queries-container-theme .text-\[\#3a1c14\] {
          color: ${curTheme.primaryDark} !important;
        }
        .queries-container-theme h4.text-\[\#3a1c14\], .queries-container-theme h2.text-\[\#3a1c14\], .queries-container-theme h3.text-\[\#3a1c14\] {
          color: ${curTheme.primaryDark} !important;
        }
        .queries-container-theme .text-\[\#3a1c14\]\/75 {
          color: rgba(${curTheme.primaryRGB}, 0.75) !important;
        }
        .queries-container-theme .text-\[\#3a1c14\]\/65 {
          color: rgba(${curTheme.primaryRGB}, 0.65) !important;
        }
        .queries-container-theme .bg-\[\#FDF8F6\] {
          background-color: ${curTheme.bgMain} !important;
        }
        .queries-container-theme .hover\:bg-\[\#FBF6F4\]:hover {
          background-color: ${curTheme.primaryLight} !important;
        }
        .queries-container-theme .bg-\[\#FBF6F4\] {
          background-color: ${curTheme.bgContainer} !important;
        }
        .queries-container-theme .bg-\[\#FAF8F5\] {
          background-color: ${curTheme.primaryLight} !important;
        }
        .queries-container-theme .border-\[\#EBDCD3\] {
          border-color: ${curTheme.borderMain} !important;
        }
        .queries-container-theme .border-\[\#EBDCD3\]\/60 {
          border-color: rgba(${curTheme.primaryRGB}, 0.25) !important;
        }
        .queries-container-theme .border-\[\#EBDCD3\]\/85 {
          border-color: rgba(${curTheme.primaryRGB}, 0.4) !important;
        }
        .queries-container-theme .border-\[\#EBDCD3\]\/40 {
          border-color: rgba(${curTheme.primaryRGB}, 0.15) !important;
        }
        .queries-container-theme .border-\[\#e8d5cc\] {
          border-color: ${curTheme.borderMain} !important;
        }
        .queries-container-theme .border-\[\#e8d5cc\]\/60 {
          border-color: rgba(${curTheme.primaryRGB}, 0.25) !important;
        }
        .queries-container-theme .border-\[\#e8d5cc\]\/30 {
          border-color: rgba(${curTheme.primaryRGB}, 0.15) !important;
        }
        .queries-container-theme .border-\[#ebd5cc\]\/20 {
          border-color: rgba(${curTheme.primaryRGB}, 0.1) !important;
        }
        .queries-container-theme .focus\:outline-\[#7c3a2a\]:focus {
          outline-color: ${curTheme.primary} !important;
        }
        .queries-container-theme .hover\:border-\[\#7c3a2a\]\/40:hover {
          border-color: rgba(${curTheme.primaryRGB}, 0.45) !important;
        }
        .queries-container-theme .bg-\[\#7c3d3d\] {
          background-color: ${curTheme.primary} !important;
        }
        .queries-container-theme .hover\:bg-\[\#632f2f\]:hover {
          background-color: ${curTheme.primaryHover} !important;
        }
        @keyframes queriesCursorBlink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        .queries-cursor-blink {
          animation: queriesCursorBlink 1s steps(1, end) infinite;
        }
        /* (The old .qdesk / .queries-content-grid short-screen fallback is retired — both panes
           now live in the shared .f12-body column, same as the Contact List page.) */
      `}</style>





      {/* MAIN CONTENT — the control bar then the two-column desk (list + reading pane).
          ⚠️ NO GROUND HERE. This carried a hardcoded `background: "#faf5ee"` — a cream inline
          style, predating the white sheet, that wrapped the header, the frame, the list AND the
          pane. It was THE cream ground, and it survived two passes that hunted for it in
          stylesheets and theme tokens: an inline hex matches no token grep and outranks every
          rule. The sheet is white; nothing between it and the cards paints.
          (`overflowY: auto` is kept deliberately — it is a nested scroller inside the shell's
          own, currently inert under .ws-work--fit, and it is the safety net if content ever
          exceeds the fit. Retiring it is a separate call — flagged, not taken.) */}
      <div
        className="w-full"
        style={{ paddingLeft: 0, flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column" }}
        id="queries-main-panel-container"
      >

        {/* OLD LEFT PANEL — hidden, kept for structural integrity */}
        <div style={{ display: "none" }}>
          

         {/* Scrollable subdivisions */}
         <div 
           className="flex-grow overflow-y-auto space-y-4 pt-3 pb-1.5 px-3 select-none custom-query-list-scrollbar" 
           
         >
           
           {false ? (
             <>
               {/* FILTER SECTION */}
               <div className="space-y-2">
                 <span className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold select-none border-b border-[#EBDCD3]/63 pb-0.5 mb-1.5">
                   Filter
                 </span>

                 {/* Status nested filter */}
                 <div>
                   <span className="block text-[9px] font-mono uppercase text-[#7c3a2a]/65 font-bold mb-1 pl-1">
                     Query Status
                   </span>
                   <div className="space-y-0.5">
                     {[
                       { type: "filter", id: "All", label: "All queries", count: queries.length },
                       { type: "sublabel", label: "Active" },
                       { type: "filter", id: QueryStatus.QUERIED, label: "Queried", count: queries.filter(q => q.status === QueryStatus.QUERIED).length },
                       { type: "filter", id: QueryStatus.PARTIAL_REQUESTED, label: "Partial requested", count: queries.filter(q => q.status === QueryStatus.PARTIAL_REQUESTED).length },
                       { type: "filter", id: QueryStatus.PARTIAL_SENT, label: "Partial sent", count: queries.filter(q => q.status === QueryStatus.PARTIAL_SENT).length },
                       { type: "filter", id: QueryStatus.FULL_REQUESTED, label: "Full requested", count: queries.filter(q => q.status === QueryStatus.FULL_REQUESTED).length },
                       { type: "filter", id: QueryStatus.FULL_SENT, label: "Full sent", count: queries.filter(q => q.status === QueryStatus.FULL_SENT).length },
                       { type: "filter", id: QueryStatus.REVISE_RESUBMIT, label: "Revise & resubmit", count: queries.filter(q => q.status === QueryStatus.REVISE_RESUBMIT).length },
                       { type: "filter", id: QueryStatus.OFFER, label: "Offers", count: queries.filter(q => q.status === QueryStatus.OFFER).length, isOffer: true },
                       { type: "sublabel", label: "Closed" },
                       { type: "filter", id: QueryStatus.REJECTED, label: "Rejected", count: queries.filter(q => q.status === QueryStatus.REJECTED).length, isClosed: true },
                       { type: "filter", id: QueryStatus.WITHDRAWN, label: "Withdrawn", count: queries.filter(q => q.status === QueryStatus.WITHDRAWN).length, isClosed: true },
                       { type: "filter", id: QueryStatus.NO_RESPONSE, label: "No response", count: queries.filter(q => q.status === QueryStatus.NO_RESPONSE).length, isClosed: true },
                     ].map((item, idx) => {
                       if (item.type === "sublabel") {
                         return (
                           <div key={idx} className="text-[9px] font-mono tracking-wider text-stone-400 mt-1 mb-0.5 uppercase font-medium pl-1 select-none font-sans">
                             {item.label}
                           </div>
                         );
                       }

                       const isActive = item.id ? selectedStatusFilters.includes(item.id) : false;
                       const isZero = item.count === 0;

                       const handleStatusClick = () => {
                         if (!item.id) return;
                         if (item.id === "All") {
                           setSelectedStatusFilters(["All"]);
                         } else {
                           let nextFilters = [...selectedStatusFilters];
                           if (nextFilters.includes("All")) {
                             nextFilters = nextFilters.filter(f => f !== "All");
                           }
                           if (nextFilters.includes(item.id)) {
                             nextFilters = nextFilters.filter(f => f !== item.id);
                           } else {
                             nextFilters.push(item.id);
                           }
                           if (nextFilters.length === 0) {
                             nextFilters = ["All"];
                           }
                           setSelectedStatusFilters(nextFilters);
                         }
                       };

                       return (
                         <button
                           key={idx}
                           onClick={handleStatusClick}
                           className="w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium transition-all flex justify-between items-center cursor-pointer border-0"
                           style={{ backgroundColor: isActive ? "#FAF1EF" : "transparent" }}
                         >
                           <span className="flex items-center gap-1.5 min-w-0" style={{ color: isActive ? "#7c3a2a" : "#3a1c14" }}>
                             {item.type === "filter" && item.id !== "All" && (
                               <StatusDot status={item.id as QueryStatus} size={13} decorative />
                             )}
                             <span className={`truncate ${isActive ? "font-bold" : ""}`}>{item.label}</span>
                           </span>
                           <span className={`text-[10px] font-mono font-semibold ${isActive ? "text-[#7c3a2a]" : isZero ? "text-stone-400" : "text-[#7c3a2a]"}`}>
                             {isZero ? "-" : item.count}
                           </span>
                         </button>
                       );
                     })}
                   </div>
                 </div>

                 {/* Manuscript nested filter */}
                 <div>
                   <span className="block text-[9px] font-mono uppercase text-[#7c3a2a]/65 font-bold mb-1 pl-1">
                     Manuscript
                   </span>
                   <div className="space-y-0.5">
                     {[
                       { id: "All", title: "All queries", count: queries.length },
                       ...manuscripts.map(m => ({ id: m.id, title: m.title, count: queries.filter(q => q.manuscriptId === m.id).length }))
                     ].map((mOpt, mIdx) => {
                       const isActive = selectedManuscriptFilter === mOpt.id;
                       const isZero = mOpt.count === 0;
                       return (
                         <button
                           key={mIdx}
                           onClick={() => setSelectedManuscriptFilter(mOpt.id)}
                           className="w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium transition-all flex justify-between items-center cursor-pointer border-0"
                           style={{ backgroundColor: isActive ? "#FAF1EF" : "transparent" }}
                         >
                           <span className={`min-w-0 flex-1 leading-snug mr-2 text-left ${isActive ? "text-[#7c3a2a] font-bold" : "text-[#3a1c14]/75"}`}>{mOpt.title}</span>
                           <span className={`text-[10px] font-mono font-semibold shrink-0 ${isActive ? "text-[#7c3a2a]" : isZero ? "text-stone-400" : "text-[#7c3a2a]"}`}>
                             {isZero ? "-" : mOpt.count}
                           </span>
                         </button>
                       );
                     })}
                   </div>
                 </div>
               </div>

               <hr className="border-[#EBDCD3]/80" />

               {/* SORT SECTION */}
               <div>
                 <span className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold select-none border-b border-[#EBDCD3]/63 pb-0.5 mb-1.5">
                   Sort
                 </span>
                 <select
                   value={sortOption}
                   onChange={(e) => setSortOption(e.target.value)}
                   className="w-full text-[11px] p-1 bg-white border border-[#EBDCD3] rounded text-[#3a1c14] focus:outline-[#7c3a2a] cursor-pointer"
                 >
                   <option value="Newest first">Newest first</option>
                   <option value="Oldest first">Oldest first</option>
                   <option value="Agent name A-Z">Agent A–Z</option>
                   <option value="Agent name Z-A">Agent Z–A</option>
                   <option value="Status">Status</option>
                   <option value="Response due soonest">Response due soonest</option>
                 </select>
               </div>
             </>
           ) : (
             <>
               {/* AGENTS-STYLE FILTERS & SORT */}
               {/* 1. Query Status */}
               <div className="space-y-1">
                 <span className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold border-b border-[#ebdcd3] pb-0.5 mb-1.5 pl-1">
                   Query status
                 </span>
                 <div className="space-y-0.5">
                   {[
                     { type: "filter", id: "All", label: "All queries", count: queries.length },
                     { type: "sublabel", label: "Active" },
                     { type: "filter", id: QueryStatus.QUERIED, label: "Queried", count: queries.filter(q => q.status === QueryStatus.QUERIED).length },
                     { type: "filter", id: QueryStatus.PARTIAL_REQUESTED, label: "Partial req", count: queries.filter(q => q.status === QueryStatus.PARTIAL_REQUESTED).length },
                     { type: "filter", id: QueryStatus.PARTIAL_SENT, label: "Partial sent", count: queries.filter(q => q.status === QueryStatus.PARTIAL_SENT).length },
                     { type: "filter", id: QueryStatus.FULL_REQUESTED, label: "Full req", count: queries.filter(q => q.status === QueryStatus.FULL_REQUESTED).length },
                     { type: "filter", id: QueryStatus.FULL_SENT, label: "Full sent", count: queries.filter(q => q.status === QueryStatus.FULL_SENT).length },
                     { type: "filter", id: QueryStatus.REVISE_RESUBMIT, label: "R&R", count: queries.filter(q => q.status === QueryStatus.REVISE_RESUBMIT).length },
                     { type: "filter", id: QueryStatus.OFFER, label: "Offers", count: queries.filter(q => q.status === QueryStatus.OFFER).length, isOffer: true },
                     { type: "sublabel", label: "Closed" },
                     { type: "filter", id: QueryStatus.REJECTED, label: "Rejected", count: queries.filter(q => q.status === QueryStatus.REJECTED).length, isClosed: true },
                     { type: "filter", id: QueryStatus.WITHDRAWN, label: "Withdrawn", count: queries.filter(q => q.status === QueryStatus.WITHDRAWN).length, isClosed: true },
                     { type: "filter", id: QueryStatus.NO_RESPONSE, label: "No response", count: queries.filter(q => q.status === QueryStatus.NO_RESPONSE).length, isClosed: true },
                   ].map((item, idx) => {
                     if (item.type === "sublabel") {
                       return (
                         <div key={idx} className="text-[9px] font-mono tracking-wider text-stone-400 mt-2 mb-0.5 uppercase font-medium pl-1.5 select-none font-sans">
                           {item.label}
                         </div>
                       );
                     }

                     const isActive = item.id ? selectedStatusFilters.includes(item.id) : false;

                     const handleStatusClick = () => {
                       if (!item.id) return;
                       if (item.id === "All") {
                         setSelectedStatusFilters(["All"]);
                       } else {
                         let nextFilters = [...selectedStatusFilters];
                         if (nextFilters.includes("All")) {
                           nextFilters = nextFilters.filter(f => f !== "All");
                         }
                         if (nextFilters.includes(item.id)) {
                           nextFilters = nextFilters.filter(f => f !== item.id);
                         } else {
                           nextFilters.push(item.id);
                         }
                         if (nextFilters.length === 0) {
                           nextFilters = ["All"];
                         }
                         setSelectedStatusFilters(nextFilters);
                       }
                     };

                     return (
                       <button
                         key={idx}
                         onClick={handleStatusClick}
                         className={`w-full text-left py-1 px-1.5 text-[11px] rounded transition-all cursor-pointer flex justify-between items-center border-0 ${
                           isActive 
                             ? "bg-[#FAF1EF] text-[#7c3a2a] font-bold border-l-2 border-[#7c3a2a]" 
                             : "text-stone-600 hover:bg-stone-50"
                         }`}
                       >
                         <span className="flex items-center gap-1.5 min-w-0">
                           {item.id !== "All" && (
                             <StatusDot status={item.id as QueryStatus} size={13} decorative />
                           )}
                           <span className="truncate">{item.label}</span>
                         </span>
                         <span className="text-[9px] text-stone-400 font-mono">
                           ({item.count})
                         </span>
                       </button>
                     );
                   })}
                 </div>
               </div>

               {/* 2. Manuscripts */}
               <div className="space-y-1">
                 <span className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold border-b border-[#ebdcd3] pb-0.5 mb-1.5 pl-1">
                   Manuscripts
                 </span>
                 <div className="space-y-0.5">
                   {[
                     { id: "All", title: "All queries", count: queries.length },
                     ...manuscripts.map(m => ({ id: m.id, title: m.title, count: queries.filter(q => q.manuscriptId === m.id).length }))
                   ].map((mOpt, mIdx) => {
                     const isActive = selectedManuscriptFilter === mOpt.id;
                     return (
                       <button
                         key={mIdx}
                         onClick={() => setSelectedManuscriptFilter(mOpt.id)}
                         className={`w-full text-left py-1 px-1.5 text-[11px] rounded transition-all cursor-pointer flex justify-between items-center border-0 ${
                           isActive 
                             ? "bg-[#FAF1EF] text-[#7c3a2a] font-bold border-l-2 border-[#7c3a2a]" 
                             : "text-stone-600 hover:bg-stone-50"
                         }`}
                       >
                         <span className="truncate flex-1 text-left leading-normal mr-2 pr-1">{mOpt.title}</span>
                         <span className="text-[9px] text-stone-400 font-mono shrink-0">
                           ({mOpt.count})
                         </span>
                       </button>
                     );
                   })}
                 </div>
               </div>

               {/* 3. Sort Options */}
               <div className="space-y-1">
                 <span className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold border-b border-[#ebdcd3] pb-0.5 mb-1.5 pl-1">
                   Sort Options
                 </span>
                 <div className="space-y-0.5">
                   {[
                     { id: "Newest first", label: "Newest first" },
                     { id: "Oldest first", label: "Oldest first" },
                     { id: "Agent name A-Z", label: "Agent A–Z" },
                     { id: "Agent name Z-A", label: "Agent Z–A" },
                     { id: "Status", label: "Status" },
                     { id: "Response due soonest", label: "Response due soonest" }
                   ].map(item => {
                     const isActive = sortOption === item.id;
                     return (
                       <button
                         key={item.id}
                         onClick={() => setSortOption(item.id)}
                         className={`w-full text-left py-1 px-1.5 text-[11px] rounded transition-all cursor-pointer flex justify-between items-center border-0 ${
                           isActive 
                             ? "bg-[#FAF1EF] text-[#7c3a2a] font-bold border-l-2 border-[#7c3a2a]" 
                             : "text-stone-600 hover:bg-stone-50"
                         }`}
                       >
                         <span>{item.label}</span>
                         {isActive && <Check className="w-3.5 h-3.5 text-[#7c3a2a]" />}
                       </button>
                     );
                   })}
                 </div>
               </div>
             </>
           )}

         </div>

         {/* Bottom Control & CSV Buttons */}
         <div className="p-3 border-t border-[#EBDCD3]/80 bg-[#FAF8F5]/30 shrink-0 space-y-1.5">
           <button
             type="button"
             onClick={() => {
               const next = false;
               // no-op
               localStorage.setItem("scriptally_classic_filters", next ? "true" : "false");
             }}
             className="w-full py-1.5 px-2 bg-[#FAF1EF] hover:bg-[#ebdcd3]/45 text-[#7c3a2a] border border-dashed border-[#7c3a2a]/30 rounded-lg text-[9.5px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-3xs hidden"
           >
             {false ? "✨ Apply Agents-Style" : "⏪ Undo Style (Classic)"}
           </button>

           <button
             type="button"
             onClick={() => {
               exportQueriesToCSV(queries, `ScriptAlly_Queries_${new Date().toISOString().slice(0, 10)}`);
             }}
             className="w-full py-2 px-3 bg-white hover:bg-[#FAF1EF] text-[#7c3a2a] border border-[#d1d5db] rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-3xs"
           >
             <Download className="w-3.5 h-3.5" />
             <span>Download all as CSV</span>
           </button>
         </div>

      </div>

        {/* ── The F12 work area — control bar + chips + panes stack directly in the oat column
            (the old qdesk/deskpad wrappers are retired with the hub-token paint). Each branch
            renders its own bands; everything below the header sits in the centred --maxw column
            via the f12-ctl / f12-chips / f12-body classes. ── */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>

        {/* ── The compact page header (shell rollout Phase 6): title inline with Export + Log
            query, rule beneath. Export runs the existing filtered-CSV handler (the list foot
            keeps its copy for now — same handler, flagged in the report); Log query is the
            existing interception, relocated here from the control bar's left zone. ── */}
        {/* ⚠️ THE GRID, LAST OF THE TEN. Measured before converting: chrome from header-top to
            pane-top was 116px and becomes 134 (plate 96 + gap 18 + topGap 20), so the panes lose
            18px — inside the ~20px threshold the spec sets for proceeding.
            ⚠️ IT STRIPS ON MODE, NOT ON SCROLL. Nothing scrolls at page level here — the list and
            reading panes scroll internally, so `.wpg-scroll` never moves and the derived state
            would never fire. `creating || recording` is the union, computed from the two flags
            that already exist rather than a third boolean; the offer and R&R branches run inside
            `recording` and strip on the same flag for free.
            ⚠️ THE MODALS STAY OUTSIDE THE GRID, below it — fixed-position overlays have no
            business inside the scrollport they cover. */}
        <WorkspacePageGrid
          className="qc-wpg"
          /* ⚠️ A FILL PAGE — the panes scroll, the page does not, and this is the declaration that
             makes that true. `.f12-body` says `flex: 1; min-height: 0`, written when its parent was
             `.f12-root`; against a block scroll row both apply to nothing, so browsing grew past the
             row (729px of page scroll where the spec says zero) and the journey — which hides the
             list that was propping the row open — collapsed its whole body to 0px with every
             element inside it mounted and correct. Proven on the deployed build: this one
             declaration took `.qc-take-body` from 0 to 418px. */
          /**
           * ⚠️ THE VIEW DECIDES BOTH, AND THAT IS THE WHOLE OF THE TWO-VIEW CHANGE. The browsing
           * grid is an ordinary scrolling page — full masthead, handoff to the bar exactly as every
           * other page — so it must NOT be `fill`; the detail surface is the two-pane layout this
           * page has always been, which fills the viewport and scrolls its panes internally.
           *
           * ⚠️ AND `barOnly` IS WHY THIS PAGE COULD NOT HAND OFF BEFORE. A fill page has nothing to
           * scroll, so its masthead never left and the bar's 150px threshold was unreachable — it
           * measured a scroll range of 0. In the detail view there is still nothing to scroll, so the
           * bar is simply present from the start: identity in 46px instead of a third of the working
           * area saying a name nothing else states.
           */
          /**
           * ⚠️ THE RECORD IS THE VIEW, AND THE PROP IS ITS PRESENCE RATHER THAN A MODE FLAG. A page
           * that carried a `view` string could be in `detail` with nothing selected, which is a state
           * with no content and no way to describe itself; deriving both from the selected query
           * means the record view cannot exist without a record in it.
           */
          /**
           * ⚠️ NEITHER PROP, SINCE §4. They belonged to the record VIEW — a second page layout with
           * its own 46px identity bar and its own back link. There is no second layout now: the
           * panel overlays the grid, so the page underneath has not changed and must not say it
           * has. Measured before this: the crumb read `Queries / Elinor Hale` and an `← ALL
           * QUERIES` bar sat behind the panel, both describing a navigation that had not happened.
           *
           * ⚠️ `record` STAYS ON `WorkspacePageGrid` FOR `AllManuscripts`, its other consumer. The
           * prop is not the problem; this page having two layouts was.
           */
          scrollLabel="Query Centre"
          /* ⚠️ THE LIST STRIP (§1c) — the three controls that act on the LIST, and only those.
             `View tasks` and `Nudge` are NOT here despite sounding page-level: both are gated on
             `!sel`, so both act on the selected query, and putting them in a list-scope strip
             would leave two dead controls whenever nothing is selected — the exact fault the
             split exists to remove. They are behind the hero's kebab with the other three.
             ⚠️ THE GRID ALREADY DRAWS THIS ROW. It has had a `toolbar` slot since the conversion
             and this page never used one, so the controls lived inside the list column instead —
             which is why they read as the list's chrome rather than the page's. */
          /* ⚠️ NO `dock` PROP (§2). The dock left grid row 4 for the SHEET'S foot — it states what
             committing the composition will do, so it belongs to the composition rather than to the
             page the composition is lying on. Its definition now sits with the journeys below.

             ⚠️ AND THE RHYTHM PACK'S SCROLLPORT WARNING RETIRES WITH IT. "A dock's height comes out
             of the scrollport" was true of a grid row and is not true of a child of an overlay. The
             token it used to be coupled to — `--wpg-reclaim-pad`, the settle's compensation — no
             longer exists either; the warning still stands for any page that puts a dock back in
             row 4, for the scrollport reason alone. */
          /* ⚠️ NO `toolbar` PROP (§1c). Search, Filter and Sort act on the LIST and nothing else,
             so they sit at the head of the list COLUMN rather than in a page-wide strip. The grid's
             row 2 is gone from this page entirely; `.wpg-scroll`'s own `padding-top` pays the
             18px gap instead, which is the grid's documented no-toolbar case ("two elements, one
             gap, never both") — so the rhythm is unchanged by the move. */
          /* ⚠️ NO `condensed` PROP EITHER (§2). It stripped the header band on `creating ||
             recording`, which was right while a journey REPLACED the page. A journey is an overlay
             now: the desk stays whole underneath it, band and all, and stripping the chrome behind
             a scrim would animate a page the writer is not looking at. */
          masthead={
          <PageHeader
            variant="workspace"
            /* ⚠️ NO MARK — the illustration bleeding across this band IS the page's picture, and a
               glyph beside a 47px title in front of it is a second picture competing with the
               first. Removed with the trial's carve-out, which names mark absence as one of the
               four things it changes; `mastheadMatrix` counts the markless pages, so a third
               cannot drop its mark unnoticed and this one cannot silently get it back. */
            /* The workspace masthead: this page is a fixed-height master–detail surface, so
               header height is working area taken from the panes. The description is KEPT as a
               prop though compact doesn't render it — the copy stays where it lives, so bringing
               it back is a flag flip rather than a hunt. */
            /* ⚠️ RENAMED (Amendment 1, H2): "Queries Hub" → "Query Centre". The nav, the crumb
               and the page's own heading must say the same thing — a page whose sidebar entry
               and title disagree makes you check you are where you think you are. */
            title="Query Centre"
            /* ⚠️ MOVED FROM `.qc-phead`, NOT COPIED. That row is this page's control row in all but
               the grid's prop name — its own comment calls it "their seat" — so a header primary
               beside it would be the page stating its one creative verb twice, which is the fault
               this format exists to end. The button is deleted there in the same commit. */
            primary={{ label: "Log new query", disabled: creating, onClick: () => onNavigate?.("queries", "Log a query") }}
            /**
             * ⚠️ THE DESCRIPTION IS REINSTATED (Nick's copy, supplied directly), AND §1b's
             * REASONING IS AMENDED RATHER THAN DELETED — because the objection it recorded was to a
             * DIFFERENT SENTENCE, not to the idea of a subtitle.
             *
             * What §1b threw out was "Every query you've sent, and exactly where each one stands",
             * on the grounds that it told the reader what page they were on while they stood on it.
             * That objection stands and this copy does not meet it: the first clause says what the
             * page holds, and the second says what you can DO here — log, review, update — which is
             * the thing a writer arriving for the first time cannot get by looking.
             *
             * ⚠️ AND IT MATCHES MANUSCRIPTS BY MECHANISM, NOT BY IMITATION. `PageHeader` renders any
             * `description` as the same `.wsh-sub` paragraph and steps the title from 40px to 38px
             * by dropping `wsh--solo`; there is no second treatment to keep in step, which is why
             * "same format as the manuscripts page" needed no styling at all.
             *
             * The counts §1b put here in its place are separately retired (see the note below) —
             * so this is not displacing them, it is filling a slot that has been empty since.
             */
            description="Every query, every response — track every step of your journey so far"
            /* ⚠️ WHY THE COUNTS WENT (§1b, then §1). They were two facts the reader could not get by
               looking, both from `queryBucket` — the same function the filter pills and
               `getPrimaryAction` read — and manuscript-scoped rather than view-scoped, so the
               status filter and the search narrowed the LIST and never the page's own totals. */
            /* ⚠️ THE MASTHEAD'S COUNT IS RETIRED (§1), AND THE EARLIER PACK PREDICTED THIS. It
               flagged the duplication rather than resolving it — "the plate's description is not
               drawn once the header condenses, which is the state the page spends its life in" —
               and accepted it because the count then had no permanent home. It has one now: the
               sage cap on the column it counts, in every state. Measured with both present: "20
               queries" twice on one screen.
               ⚠️ AND THE CAP IS THE ONE THAT SURVIVES, not the masthead. The figure describes the
               LIST, and the cap sits on the list; the masthead describes the page.
               ⚠️ `queriesMastheadCounts` IS THEREFORE ORPHANED — I first wrote that it "keeps its
               other readers" and then checked, which it does not: nothing in `src/` renders it now,
               only its own tests. Reported rather than deleted, and deliberately: it is a pure
               function with a live suite covering a real rule (the zero clause is omitted, never
               printed), and removing one in a visual pass is a separate decision. The cap derives
               the same two figures from the same `queryBucket`, so they cannot disagree. */
            /**
             * ⚠️ NO ACTIONS AT ALL (in-flow masthead, step 1). Two lived here and each left by a
             * different route, which is worth stating because they look like one change:
             *
             *   `Export`      → DROPPED. The list column's FOOT has carried an `EXPORT CSV` button
             *                   calling the same `handleExportFilteredCSV` for as long as the foot
             *                   has existed, so the masthead's copy was a third seat for one act.
             *                   The foot is also the honest home: both read `sortedList`, the
             *                   FILTERED column, and the foot states `SHOWING n OF m` right beside
             *                   it — so what you are about to export is named next to the button
             *                   that exports it. The masthead's note claimed Export "acts on the
             *                   page, not on the column"; the call disagreed with the note.
             *
             *   `Log query`   → DROPPED. It rendered only in the empty branch, where
             *                   `.qc-welcome` already draws `Log your first query` calling the same
             *                   `openCreate()`. One control, two seats, one screen.
             *
             * ⚠️ AND THE JOURNEY CASE DISSOLVES WITH THEM. The band emptied its actions on
             * `creating || recording` so a second journey could not be started on top of an open
             * one; with no actions in any state there is nothing left to gate.
             */
          />
          }
        >

        {/* `&& !creating`: create mode lives in the populated branch, so without this a
            first-run "Log your first query" set a draft that NOTHING rendered — the CTA read as
            dead. Found during the re-entry work; see the report. */}
        {/**
          * §3 — ⚠️ THE SKELETON GOES AHEAD OF THE EMPTY-DATABASE BRANCH, because that branch is what
          * currently renders during the load. `queries` is `[]` until the first snapshot arrives, so
          * a returning writer with forty queries met "No queries yet" and "Your first query starts
          * here" — the page stating a fact about their account that it had not yet read.
          *
          * ⚠️ THE FLAG ALREADY EXISTED AND THIS PAGE DID NOT CONSUME IT. `collectionsReady` is false
          * until manuscripts, agents AND queries have each delivered a first snapshot; the Dashboard
          * has told loading from empty with it since the clean-load work. Same flag, same ~180ms
          * grace so a fast load never flashes the skeleton — a second mechanism here would be a
          * second answer to one question.
          */}
        {showSkeleton ? <QueryCentreSkeleton head={listHead} /> : queries.length === 0 && !creating ? (
          /* ── Empty database — F12 shell: a list pane with a "No queries yet" placeholder
             (Export disabled) beside the welcome pane (Smart Import + manual add). ── */
          <>
          {/* Empty split — list placeholder + welcome pane in the centred column. f12-body-empty
              opts OUT of the mobile pusher: at <md the two panes stack instead (the welcome pane
              must never hide behind a push that has nothing to push to). */}
          <div data-qc-fade={fadeIn ? "in" : undefined} className="f12-body f12-body-empty" style={{ paddingTop: "var(--gut)" }}>

            {/* List pane — search + centred placeholder + disabled CSV foot */}
            <div className="f12-list">
              <div className="f12-lsearch">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                <input type="text" placeholder="Search queries…" value={listSearch} onChange={(e) => setListSearch(e.target.value)} aria-label="Search queries" />
              </div>
              <div className="f12-rows" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24, gap: 8 }}>
                <span style={{ color: "var(--faint)", display: "flex" }}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                </span>
                <span style={{ fontFamily: "var(--f12-serif)", fontWeight: 600, fontSize: 15, color: "var(--ink)" }}>No queries yet</span>
                <span style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)", maxWidth: 200 }}>Your queries will appear here once you log or import them.</span>
              </div>
              <div className="f12-lfoot">
                <span><b>SHOWING 0 OF 0</b></span>
                <span style={{ opacity: 0.5 }}>EXPORT CSV</span>
              </div>
            </div>

            {/* Welcome pane — centred onboarding */}
            {/* GHOST PREVIEW zero-state (v4 P3; ref empty-states-ref.html, option 1) — a faded,
                non-interactive skeleton of the real anatomy (hero + three columns) behind a centred
                welcome card, so the CTA lands with context: you can see what the page becomes.
                The two secondary routes (Smart Import, the import template) are kept as quiet links
                rather than dropped with the old welcome pane. */}
            <div className="f12-pane f12-detail" style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
              <div className="qc-ghost" aria-hidden="true">
                <div className="qc-ghost-hero"><span className="qc-ghost-av" /><span className="qc-ghost-line" /></div>
                <div className="qc-ghost-cols">
                  {[60, 70, 50].map((w, i) => (
                    <div className="qc-ghost-col" key={i}>
                      <div className="qc-ghost-band" />
                      <div className="qc-ghost-ln" />
                      <div className="qc-ghost-ln" style={{ width: `${w}%` }} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="qc-welcome">
                <h3>Your first query starts here</h3>
                <p>Track every submission — who has it, what you sent, and when to follow up.</p>
                <button ref={logTriggerRef} type="button" className="f12-btn-pri" onClick={() => openCreate()}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" /></svg>
                  Log your first query
                </button>
                <div className="qc-welcome-alt">
                  <button type="button" onClick={() => onNavigate?.("import")}>Import a spreadsheet</button>
                  <span aria-hidden="true">·</span>
                  <a href="/ScriptAlly-pipeline-import-template.xlsx" download>Download the template</a>
                </div>
              </div>
            </div>
          </div>
          </>
        ) : (
        <>


        {/* Active filters — removable pink chips on the oat beneath the bar (panes never resize). */}
        {activeFilterChips.length > 0 && (
          <div className="f12-chips">
            {activeFilterChips.map((c) => (
              <Chip key={c.key} onRemove={c.remove}>{c.label}</Chip>
            ))}
            <button type="button" className="f12-clear" onClick={resetAllFilters}>CLEAR ALL</button>
          </div>
        )}

        {/* MarkSentPopover — anchored via useFixedMenu to the actions-toolbar CTA */}
        <AnimatePresence>
          {isMarkSentOpen && activeQuery && activeAgent && (() => {
            const a2 = getPrimaryAction(currentStatus as QueryStatus);
            if (a2.kind !== "mark-sent") return null;
            return (
              <MarkSentPopover
                key="mark-sent"
                style={markSentMenuStyle}
                panelRef={markSentPanelRef}
                kind={a2.markKind}
                query={activeQuery}
                agent={activeAgent}
                triggerRef={markSentTriggerRef}
                onClose={() => setIsMarkSentOpen(false)}
                onRecordResponseInstead={() => {
                  setIsMarkSentOpen(false);
                  setIsRecordResponseFocusFormOpen(true);
                }}
                /**
                 * ⚠️ THE VERSIONS AND THE PRE-FILL COME FROM THE SAME DERIVATIONS THE PANE READS
                 * (Part E, D5). `openingRead` reaches the version THROUGH the package's sample, so
                 * the field's default and the "Opening read" line beneath the strip cannot disagree
                 * — they are one derivation with two readers.
                 */
                bookVersions={activeBookVersions}
                readVersion={openingRead(activeQuery, packages, versions, activeBookVersions)}
                onSave={async ({ sentDate, writerExpectedDate, nudgeDate, bookVersionId }) => {
                  await recordMaterialsSent({
                    queryId: activeQuery.id,
                    targetStatus: a2.target as QueryStatus.PARTIAL_SENT | QueryStatus.FULL_SENT,
                    sentDate,
                    isResubmit: a2.markKind === "resubmit",
                    writerExpectedDate,
                    nudgeDate,
                    /* undefined where nothing was chosen — the write path omits the key (D7) */
                    bookVersionId,
                  });
                }}
              />
            );
          })()}
        </AnimatePresence>

        {/* Close-reasons menu — anchored upward off the Close ribbon tile */}
        {/**
          * ⚠️ THE CORRECTION SURFACES — fork, then edit, then the consequence sheet. One scrim, one
          * chassis, and Escape at every step returns to where the writer was rather than dumping
          * them on the page.
          */}
        {correcting && activeQuery && (
          <div className="cor-scrim" role="presentation" onClick={() => setCorrecting(null)}>
            <div onClick={(e) => e.stopPropagation()}>
              {correcting.step === "fork" && (
                <CorrectionFork
                  subject={`${correcting.entry.label} · ${fmtShortISO(correcting.entry.dateISO)}`}
                  onCorrect={() => setCorrecting({ step: "edit", entry: correcting.entry })}
                  /* ⚠️ BRANCH TWO ROUTES — the record is true, so the answer is to append, and the
                     flow that appends already exists. No third way to record a response. */
                  onAppend={() => { setCorrecting(null); setIsRecordResponseFocusFormOpen(true); }}
                  /* ⚠️ MOVE SITS ON THE CORRECTION BRANCH, not beside it. Filing an event under the
                     wrong agent IS the record being wrong, so it belongs with "I'm correcting a
                     mistake"; offering it as a third peer would suggest a move is a different KIND
                     of act from an edit, which is the distinction the fork exists to draw. */
                  onMove={moveTargetsFor().length ? () => {
                    const evts = guardEvents();
                    const me = evts.find((e) => e.activityId === correcting.entry.activityId);
                    const guard = me ? moveGuard(me, evts) : { kind: "allow" as const };
                    if (guard.kind === "route") {
                      showConfirm({ title: "This entry cannot move", body: <p style={{ margin: 0 }}>{guard.message}</p>, confirmLabel: "Close", onConfirm: async () => {} });
                      return;
                    }
                    setCorrecting({ step: "pick", entry: correcting.entry });
                  } : undefined}
                  onCancel={() => setCorrecting(null)}
                />
              )}

              {correcting.step === "edit" && (() => {
                const evts = guardEvents();
                const me = evts.find((e) => e.activityId === correcting.entry.activityId);
                /* the root may be edited and never removed — removal routes to deleting the query */
                const root = me ? rootGuard(me, evts) : { kind: "allow" as const };
                return (
                  <CorrectionEdit
                    subject={`${correcting.entry.label} · ${fmtShortISO(correcting.entry.dateISO)}`}
                    initial={{ dateISO: correcting.entry.dateISO, note: correcting.entry.note }}
                    removable={root.kind === "allow"}
                    removeBlockedReason={root.kind === "route" ? root.message : undefined}
                    onRemove={() => onDeleteEntry(correcting.entry)}
                    onCancel={() => setCorrecting(null)}
                    /**
                     * ⚠️ THE PREVIEW IS COMPUTED ON SAVE, NOT ON KEYSTROKE — a date mid-typing reads
                     * "2" of "22 August", and a sheet recomputing under the writer's hands would show
                     * consequences of a date they never meant.
                     */
                    onSave={(d) => {
                      /* ⚠️ THE DATE IS ONLY REWRITTEN WHEN IT CHANGED. Sending it always normalised
                         the event's time to midday on every save, so editing a note silently moved
                         the event by hours — invisible on the page, and enough to shift the waiting
                         anchor's underlying value. The preview then had a real difference to report
                         about a fact the writer had not touched. Both halves are fixed: the diff
                         compares what it STATES, and the write no longer moves what was not edited. */
                      const dateChanged = d.dateISO !== correcting.entry.dateISO;
                      const nextIso = new Date(`${d.dateISO}T12:00:00`).toISOString();
                      const proposed = trackingEvents.map((e: any) =>
                        e.id === correcting.entry.activityId
                          ? { ...e, ...(dateChanged ? { createdAt: nextIso } : {}), note: d.note }
                          : e);
                      const diff = previewFor(proposed);
                      /* ⚠️ THE PRIOR VALUES ARE CAPTURED BEFORE THE WRITE, not read back after it.
                         This closure was `async () => {}` — the same empty-undo fault found on the
                         removal, in the branch beside it: the toast said UNDO and the correction
                         would have stood. One fault, two call sites, and the second survived an
                         audit of the first because it hides behind a positional argument rather
                         than an `undo:` key. */
                      const wasDate = new Date(`${correcting.entry.dateISO}T12:00:00`).toISOString();
                      const wasNote = correcting.entry.note;
                      const commit = async () => {
                        await editActivity(activeQuery.id, correcting.entry.activityId, {
                          ...(dateChanged ? { date: nextIso } : {}),
                          details: d.note,
                        });
                        await finishCorrection(
                          `${correcting.entry.label} corrected`,
                          async () => { await editActivity(activeQuery.id, correcting.entry.activityId, { ...(dateChanged ? { date: wasDate } : {}), details: wasNote }); },
                          activeQuery.id,
                        );
                      };
                      /* ⚠️ AN EMPTY DIFF RAISES NO SHEET — it saves, toasts, and is done. */
                      if (diff.empty) { void commit(); return; }
                      setCorrecting({ step: "sheet", entry: correcting.entry, question: "Save this correction?", diff, commit, partners: [] });
                    }}
                  />
                );
              })()}

              {correcting.step === "pick" && (
                <MovePicker
                  subject={`${correcting.entry.label} · ${fmtShortISO(correcting.entry.dateISO)}`}
                  candidates={moveTargetsFor()}
                  onPick={(c) => void openMoveSheet(correcting.entry, c)}
                  /* ⚠️ ESCAPE AND CANCEL BOTH RETURN TO THE FORK, not to the page. The writer is
                     mid-correction; dropping them out of the flow entirely would make backing out of
                     a destination list cost them the whole act. */
                  onCancel={() => setCorrecting({ step: "fork", entry: correcting.entry })}
                />
              )}

              {correcting.step === "move" && (
                <MoveSheet
                  subject={`${correcting.entry.label} · ${fmtShortISO(correcting.entry.dateISO)}`}
                  target={correcting.target}
                  notices={correcting.notices}
                  sourceDiff={correcting.sourceDiff}
                  targetDiff={correcting.targetDiff}
                  note={correcting.note}
                  onNoteChange={(v) => setCorrecting({ ...correcting, note: v })}
                  actions={[
                    /* ⚠️ CARD 10's TWO OFFERS ARE ONE CONTROL PLUS ONE, not a mode switch. "Move
                       with edited note" is the ordinary action once the note has been edited in
                       place above; "Move and clear the note" is the shortcut for prose that should
                       not travel at all. Both are moves — neither is a confirmation of the other. */
                    ...(correcting.notices.staleNote
                      ? [
                          { label: "Move with this note", cost: "the note travels as written above", onClick: () => void commitMove(correcting.entry, correcting.target, correcting.note) },
                          { label: "Move and clear the note", cost: "the event travels, the prose does not", onClick: () => void commitMove(correcting.entry, correcting.target, "") },
                        ]
                      : [{ label: "Move it", cost: "one undo restores both queries", onClick: () => void commitMove(correcting.entry, correcting.target, correcting.note) }]),
                    /* ⚠️ CARD 11 — the offer to reopen comes FIRST in the writer's mind and second
                       in the stack, because it is the rarer intention. It routes to the close menu
                       rather than reopening silently: reopening is a status change with its own
                       consequences, and burying it inside a move would perform two acts on one press. */
                    ...(correcting.target.closed
                      ? [{ label: `Reopen ${correcting.target.agentName}'s query first…`, cost: "opens that query so you can change its status", onClick: () => { setCorrecting(null); setSelectedQueryId(correcting.target.queryId); } }]
                      : []),
                  ]}
                  onCancel={() => setCorrecting({ step: "pick", entry: correcting.entry })}
                />
              )}

              {correcting.step === "sheet" && (
                <ConsequenceSheet
                  question={correcting.question}
                  subject={`${correcting.entry.label} · ${fmtShortISO(correcting.entry.dateISO)}`}
                  diff={correcting.diff}
                  actions={[
                    ...(correcting.partners.length
                      ? [{
                          label: "Remove both",
                          cost: "one undo restores them",
                          danger: true,
                          onClick: () => void correcting.commit(),
                        }]
                      : [{ label: correcting.question.startsWith("Save") ? "Save the correction" : "Remove", cost: "one undo restores it", danger: !correcting.question.startsWith("Save"), onClick: () => void correcting.commit() }]),
                    { label: "Edit instead", cost: "keep it, fix the details", onClick: () => setCorrecting({ step: "edit", entry: correcting.entry }) },
                  ]}
                  onCancel={() => setCorrecting(null)}
                />
              )}
            </div>
          </div>
        )}

        {isCloseMenuOpen && activeQuery && (
          <>
            <div onClick={() => setIsCloseMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 59 }} aria-hidden="true" />
            <div ref={closePanelRef as React.RefObject<HTMLDivElement>} style={{ ...closeMenuStyle, zIndex: 60, display: "flex", flexDirection: "column", minHeight: 0, overflowY: "auto", background: "#fffefb", border: "1px solid var(--bd)", borderRadius: 12, boxShadow: "0 12px 34px rgba(58,44,31,.18)", padding: 6, minWidth: 198 }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: ".12em", textTransform: "uppercase", color: "#b7ab99", padding: "6px 10px 5px" }}>Close this query as…</div>
              {[QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE].map((reason) => (
                <RibbonMenuItem
                  key={reason}
                  icon={<StatusDot status={reason} overrideSize={15} decorative />}
                  label={reason}
                  onClick={() => { setIsCloseMenuOpen(false); updateQueryStatus(activeQuery.id, reason); }}
                />
              ))}
            </div>
          </>
        )}

        {/* Delete confirmation — destructive, no undo. v3 promoted Delete to the bar (the ⋯ More menu
            was removed). The final deletion is a flagged STUB (no deleteQuery handler yet — see the
            handleDeleteQuery note above); the confirm flow itself is real. */}

        {/* ── Split — list pane beside the reading pane, in the SAME centred column as the
            Contact List page (.f12-body: max-width --maxw, auto margins, --gut bottom gap;
            the two panes are --listw / flex:1, locked to the control-bar zones above). ── */}
        {/* ⚠️ NO INLINE TOP PADDING (§1a). It added `--gut` when no filter chips were showing, which
            on top of the row's own gap made the band-to-content distance 82px in the commonest
            state and 70 in the other. The page states ONE offset now, 18px, and states it on the
            row where every other page's lives. */}
        {/* ⚠️ THE FADE RIDES A DATA ATTRIBUTE, NOT THE CLASS LIST, and that is deliberate rather
            than incidental. Four locks slice this file on the literal `className="f12-body"` to
            find the populated branch — the bounded-slice pattern, working exactly as designed —
            and folding transient state into that attribute would make a structural anchor vary
            with a 200ms animation. The class states what this element IS; the attribute states
            what it is momentarily doing — and it is written BEFORE the class so `className="f12-body">`
            stays literally intact, which is what those slices anchor on. */}
        {/**
          * ⚠️ NO TAB RAIL. This page is a list and a record, not two modes: the grid IS the page, and
          * opening a card opens that query. A `Detail view` tab named a MODE beside a SET — the pair
          * never read as parallel — and once the record is reached by opening a card there is nothing
          * left for a second tab to select.
          */}
        {/**
          * ⚠️ THE GRID IS THE PAGE NOW, ALWAYS. Opening a query no longer swaps the layout — the
          * panel overlays, so the masthead still says Query Centre and the crumb still reads
          * `Queries / Query Centre`, because you have not gone anywhere. That is the whole
          * difference from the record view this replaces.
          *
          * ⚠️ THE RECORD BRANCH BELOW IS UNREACHABLE FROM HERE AND IS DELETED IN PHASE 6, in one
          * commit, with its imports swept. It is left standing for exactly one commit so the
          * panel's parity with it can be asserted against a surface that still exists.
          */}
        {GRID_IS_THE_PAGE ? (
          /**
           * ⚠️ THE BROWSING GRID READS THE SAME DERIVED LIST THE ROWS DO. `sortedList` is already
           * filtered by the page's own scope, search, status and sort, so the two views cannot show
           * different sets of the same queries — which is the failure a second data path would make
           * inevitable and invisible.
           */
          <>
          <div className="qcc-col">
            {/* ⚠️ THE COUNTS ARE THE WHOLE SET'S, AND THE PILLS NARROW IT. A pill that stated the
                filtered figure would read `0` for every court you were not currently in, which
                turns a set of counts into a set of tautologies. */}
            <div className="qcc-quick" role="group" aria-label="Quick filters">
              {QUICK_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className="qcc-qf"
                  aria-pressed={quickKey === f.key}
                  onClick={() => setQuickKey(f.key)}
                >
                  {f.swatch && (
                    <span
                      className="qcc-qf-sw"
                      aria-hidden="true"
                      style={{ background: `var(--stage-${f.swatch})` }}
                    />
                  )}
                  {f.label}
                  <span className="qcc-qf-n">{quickTally[f.key]}</span>
                </button>
              ))}
              <span className="qcc-qf-sep" aria-hidden="true" />
              {/* The same ink ring the card uses, so the toggle and the marker read as one idea. */}
              <button
                type="button"
                className="qcc-qf"
                aria-pressed={needsOverdue}
                onClick={() => setNeedsOverdue((v) => !v)}
              >
                <span className="qcc-qf-mk" aria-hidden="true">!</span>
                Past expected
              </button>

            </div>

            {/**
              * ⚠️ THE REF'S TOOLBAR — LABELLED, WITH THE CURRENT VALUE ON THE BUTTON'S FACE. It
              * replaces `{listHead}`'s icon triggers on THIS view only; the record view keeps them
              * until Phase 6 deletes that surface. The two cannot disagree about what is selected,
              * because the popovers, their refs and their state are the same objects — only the
              * trigger's presentation differs.
              *
              * ⚠️ AND `Group None` / `Sort Last activity` IS THE POINT, not decoration. An icon
              * cannot state how the grid is currently arranged, so a reader had to open a popover
              * to find out. That is what earns the label its width.
              */}
            <div className="qcc-tb" role="group" aria-label="Query tools">
              <div className="qcc-tb-search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a08a78" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  placeholder="Search agents or agencies"
                  autoComplete="off"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  aria-label="Search agents or agencies"
                  ref={browseSearchRef}
                />
                {/* the `/` hint the ref draws, inside the field */}
                <span className="qcc-tb-kbd" aria-hidden="true">/</span>
              </div>

              <div className="f12-popwrap">
                <button
                  type="button" className="qcc-tb-btn" ref={filterTrigRef}
                  aria-expanded={filterPopOpen} aria-haspopup="dialog"
                  onClick={() => { setSortPopOpen(false); setGroupPopOpen(false); setFilterPopOpen((o) => !o); }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 5h18M6 12h12M10 19h4" /></svg>
                  Filter
                  {activeFilterCount > 0 && <span className="qcc-tb-cnt">{activeFilterCount}</span>}
                  <svg className="qcc-tb-chev" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#7c3a2a" strokeWidth="2.4" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                </button>
                {filterPopOpen && renderFilterPopover()}
              </div>

              <div className="f12-popwrap">
                <button
                  type="button" className="qcc-tb-btn" ref={groupTrigRef}
                  aria-expanded={groupPopOpen} aria-haspopup="dialog"
                  onClick={() => { setFilterPopOpen(false); setSortPopOpen(false); setGroupPopOpen((o) => !o); }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="4" width="18" height="6" rx="1.5" /><rect x="3" y="14" width="18" height="6" rx="1.5" /></svg>
                  Group <span className="qcc-tb-val">{GRID_GROUPS.find((g) => g.key === gridGroup)?.label ?? "None"}</span>
                  <svg className="qcc-tb-chev" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#7c3a2a" strokeWidth="2.4" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                </button>
                {groupPopOpen && renderGroupPopover()}
              </div>

              <div className="f12-popwrap">
                <button
                  type="button" className="qcc-tb-btn" ref={sortTrigRef}
                  aria-expanded={sortPopOpen} aria-haspopup="dialog"
                  onClick={() => { setFilterPopOpen(false); setGroupPopOpen(false); setSortPopOpen((o) => !o); }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M7 4v13M7 17l-3-3M7 17l3-3M17 20V7M17 7l-3 3M17 7l3 3" /></svg>
                  Sort <span className="qcc-tb-val">{F12_SORT_GROUPS.flatMap((g) => g.items).find((i) => i.key === sortKey)?.label ?? "Last activity"}</span>
                  <svg className="qcc-tb-chev" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#7c3a2a" strokeWidth="2.4" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                </button>
                {sortPopOpen && renderSortPopover()}
              </div>

              <span className="qcc-tb-spacer" />
              <button
                type="button" className="qcc-tb-primary" disabled={creating}
                onClick={() => onNavigate?.("queries", "Log a query")}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                Log new query
              </button>
            </div>

            {gridRows.length === 0 ? (
              /* ⚠️ THIS IS THE NO-MATCH STATE, NOT THE NO-QUERIES STATE. The page's own empty
                 branch already owns the latter; saying "nothing matches" to someone who has never
                 logged a query would be the worst lie this page could tell. */
              <p className="qcc-none">
                Nothing matches.
                <button type="button" className="qcc-none-btn" onClick={resetAllFilters}>
                  Clear filters
                </button>
              </p>
            ) : (
              <QueryCentreGrid
                rows={gridRows}
                group={gridGroup}
                onOpen={(id) => onOpenQuery?.(id)}
                selectedId={selectedQueryId}
              />
            )}

            <div className="qcc-foot">
              <span>
                Showing <b>{gridRows.length}</b> of <b>{mastheadScopedQueries.length}</b>
              </span>
              <button
                type="button"
                className="qcc-foot-lnk"
                disabled={gridRows.length === 0}
                onClick={handleExportFilteredCSV}
              >
                Export CSV
              </button>
            </div>
          </div>

          {/**
            * ⚠️ THE PANEL IS A SIBLING OF THE COLUMN, NOT A CHILD OF THE GRID. It is `position:
            * fixed` and must not inherit the 1360 cap or sit inside anything that clips.
            *
            * ⚠️ AND IT RENDERS ONLY WITH A ROW TO SHOW. `panelRow` comes from `gridRows`, so a
            * query filtered out of the current view has no panel — which is the same rule the
            * position counter follows, and stops `N of M` counting something you cannot step to.
            */}
          {panelRow && activeQuery && (
            <QueryPanel
              open
              facts={panelRow.facts}
              status={panelRow.status}
              name={panelRow.name}
              agency={panelRow.agency}
              initials={panelRow.initials}
              sentLabel={activeQuery.dateSent ? fmtShortISO(activeQuery.dateSent) : "—"}
              viaLabel={sendMethodLabel(activeQuery.sendMethod)}
              manuscriptTitle={manuscripts.find((m) => m.id === activeQuery.manuscriptId)?.title ?? null}
              position={{ index: panelIndex, total: gridRows.length }}
              /* the CTA engine's own answer — never a second table of verbs */
              primaryLabel={
                panelRow.facts.turn === "you" ? "Mark sent"
                  : panelRow.facts.turn === "offer" ? "Record decision"
                    : "Record response"
              }
              onPrimary={() => {
                /* ⚠️ THE PAGE'S OWN OPENERS — `openRecord` is the single entry point the record
                   view already funnels through, and `MarkSentPopover` is the mark-sent home. This
                   panel decides WHICH to ask for and nothing about what either does. */
                if (panelRow.facts.turn === "you") setIsMarkSentOpen(true);
                else openRecord(activeQuery);
              }}
              onNudge={() => setIsNudgeOpen(true)}
              onMarkClosed={() => setIsCloseMenuOpen(true)}
              onClose={() => onSelectView?.("cards")}
              onStep={(delta) => {
                if (!gridRows.length) return;
                const next = gridRows[(panelIndex + delta + gridRows.length) % gridRows.length];
                onOpenQuery?.(next.id);
                /* ⚠️ THE CARD BEHIND IS SCROLLED INTO VIEW, so stepping never leaves the reader
                   looking at a panel whose card is off screen. `nearest` rather than `center`:
                   a card already visible must not jump. */
                requestAnimationFrame(() => {
                  document.querySelector(`[data-qcc-id="${next.id}"]`)
                    ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
                });
              }}
              rungs={panelRungs}
              elapsed={(() => {
                const [n, u] = (panelRow.facts.caption.match(/^(\d+)\s+(\w+)/) ?? [null, "—", ""]).slice(1) as [string, string];
                return {
                  value: n ?? "—",
                  unit: u ?? "",
                  caption: panelRow.facts.turn === "you" ? "since request"
                    : panelRow.facts.turn === "closed" ? "since close" : "waiting so far",
                };
              })()}
              expectedLabel={panelRow.expectedMs ? fmtShortISO(new Date(panelRow.expectedMs).toISOString()) : "—"}
              materialsRecorded={panelRow.facts.materialsRecorded}
              /* the existing Edit Query drawer owns materials — one editor, not a second one here */
              onListMaterials={() => openEditQuery(activeQuery.id)}
              onEditMaterials={() => openEditQuery(activeQuery.id)}
              noteCount={journalEntries.filter((j) => j.queryId === activeQuery.id).length}
            />
          )}
          </>
        ) : (
        <div data-qc-fade={fadeIn ? "in" : undefined} className="f12-body">
          {/* ⚠️ §3 · ONE HAIRLINE UNDER THE WHOLE BAR. A grid child spanning both columns, so it
              crosses the channel and reads as one rule rather than two borders with a gap in it. */}
          <span className="qc-barrule" aria-hidden="true" />

          {/* ══ §1 · THE CONTROL LAYER, SPLIT BY COLUMN ══════════════════════════════════════════
              ⚠️ TWO CELLS OF THE SPLIT'S OWN GRID, NOT TWO ROWS ABOVE IT. Alignment is structural:
              the count sits over the list and the verbs over the pane because all four children
              read one `grid-template-columns`. See `.f12-body` in f12.css for why a strip spanning
              both columns was the wrong shape, and why the channel is a `column-gap` now.

              ⚠️ THE COUNT IS THE SCOPE'S, THE FOOT'S IS THE FILTER'S — two different facts, which
              is what earns the second number its place. `mastheadScopedQueries` is the
              manuscript-scoped set (the status pills and the search narrow the LIST, never the
              page's totals), and the sub-count reads `queryBucket`, the same function the filter
              pills and `getPrimaryAction` read. Three surfaces, one membership.

              ⚠️ REPORTED: the masthead's own `description` states these same two figures at rest.
              The pack protects the header, so this is deliberate duplication in ONE state — the
              plate's description is not drawn once the header condenses, which is the state the ref
              draws and the state this page spends its life in. Flagged, not silently reconciled. */}
          <div className="qc-lhead">
            {/**
              * ⚠️ THE LIST'S OWN CONTROLS SIT HERE NOW, OVER THE LIST. Search, filter and sort were
              * inside the list panel's header; they govern the rows beneath them either way, but as a
              * CELL OF THE BODY'S GRID they sit on the same line as the pane's verbs and read as one
              * command row rather than two strips at different heights. The panel then starts
              * straight into rows with no header of its own.
              *
              * ⚠️ AND `Log new query` WENT THE OTHER WAY, to the right cell. It was here on the
              * reasoning that a creative verb belongs over the column it lengthens — true, and it put
              * the page's one pink surface over a column whose other controls are all filters. The
              * command row now reads left-to-right as "narrow the list · act on the record".
              */}
            {listHead}
          </div>

          {/* ⚠️ THE PANE'S VERBS CAME UP OUT OF THE HERO BAND (§1). They acted on the selected query
              from inside the card that names it, which reads as the card's own chrome; a query's
              verbs belong to the column, above the thing they change, on the same line as the list's.
              §2 settles WHICH verbs — this row is their seat. */}
          <div className="qc-phead">
            {/* ══ THE PAGE'S ONE CREATIVE ACTION, FIRST IN THE ROW ═══════════════════════════
                ⚠️ IT WAS IN THE MASTHEAD BAND, beside Export and above both columns — a creative
                verb filed with the page's chrome. Here it sits over the list it lengthens, which is
                where the thing it makes will appear.
                ⚠️ AND IT IS THE PAGE'S ONLY PINK SURFACE apart from §4's agent disc. Pink means
                "you can make something" here, which is why the toolbar's other buttons stay white:
                one emphasis, spent on the one verb that adds rather than ends. */}
            {/* ⚠️ `Log new query` HAS GONE TO THE MASTHEAD (compact header, §1). The argument that
                put it here — a creative verb belongs over the column it lengthens — was answered by
                the masthead scrolling out of reach and taking the action with it. The slim bar
                carries the same primary now, so it survives the scroll and this row does not have
                to hold it. What stays here is what acts on the LIST: search, filter, sort. */}

            {/* ⚠️ `THIS QUERY` IS RETIRED (§3c), AND ITS OWN SENTENCE IS WHY. §3a says the label
                "was being contradicted" by Filter and Sort sitting in this row; with them gone it
                is true — and now redundant, because the column IS the query's and the pairing card
                sits directly beneath it. It also occupied the one position §3c needs: the primary
                has to start at the pane's left edge for the two columns to read as one grid, and a
                label there pushes it off by its own width. */}
            {/* ⚠️ AN IIFE IN THE RENDER, NOT A `const` ABOVE IT. Every handler these verbs call is a
                `const` arrow declared further down the component; a `paneVerbs` const defined up
                beside `activeQuery` would read them from their temporal dead zone and throw on the
                first render — the shape this repo has recorded twice, which `tsc` does not catch
                when the reference sits inside a helper. Computed here, everything it names is
                already initialised. */}
            {activeQuery && activeAgent ? (() => {
              const verbAction = getPrimaryAction(activeQuery.status as QueryStatus);
              const verbWaitingOnAgent = verbAction.ballHolder === "agent";
              const verbClosed = activeQuery.status === QueryStatus.REJECTED || activeQuery.status === QueryStatus.WITHDRAWN || activeQuery.status === QueryStatus.NO_RESPONSE;
              const verbIsMark = verbAction.kind === "mark-sent" && !verbClosed;
              const verbLabel = verbClosed ? "Reopen"
                : verbAction.kind === "mark-sent" ? (verbAction.markKind === "resubmit" ? "Record resubmission" : "Mark sent")
                : "Record response";
              /* ⚠️ §4a · NUDGE FOLLOWS WHOSE TURN IT IS, NOT WHETHER A DATE HAS PASSED. It read
                 `replyTaskFor(...) === "nudge"` — the rule that fires the to-do TASK, which needs a
                 stated window AND a send date AND fourteen days past the deadline. Most agencies
                 state no response time, so that condition was simply never true and the control was
                 permanently grey. Nothing was broken; it was answering the app's question ("should
                 I raise this?") where the writer was asking their own ("may I chase?").

                 ⚠️ AND THE DERIVATION IS THE CTA ENGINE'S, the one the command bar's primary, the
                 agent list's whose-turn axis and this pane's waiting state already share. */
              const nudgeAt = nudgeStanding(activeQuery.status as QueryStatus);
              const nudgeWhy = nudgeReason(activeQuery.status as QueryStatus, activeAgent);
              /* §4d — how long ago the last nudge on THIS round went. The round begins at the last
                 status change, so a nudge that worked stops being current when the reply lands. */
              const nudgeRoundMs = activeQuery.lastStatusChange ? toMs(activeQuery.lastStatusChange) : null;
              const nudgeAgoDays = nudgedAgo(
                nudgeTimes(trackingEvents, NUDGE_NESTED_TYPE, (v) => toMs(v)),
                Number.isNaN(nudgeRoundMs as number) ? null : nudgeRoundMs,
                Date.now(),
              );
              return (
                <>
                  {/* ⚠️ THE ONLY FILLED CONTROL ON THE PAGE (§3). Pink, `--pinkb` rim, and BLACK text
                      — never burgundy, which means outgoing status in the dot system; the primary
                      action should not borrow a colour that already says something else. */}
                  <button
                    /* Mobile Pass 1: below md the floating command bar's primary carries the
                       Mark-sent anchor instead (this row is display:none there, and a hidden
                       anchor positions a popover at 0,0). */
                    ref={verbIsMark && !isMobile ? markSentTriggerRef : undefined}
                    type="button"
                    className="qc-btn qc-btn-fwd"
                    onClick={() => openRecord(activeQuery)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" /></svg>
                    <span>{verbLabel}</span>
                  </button>
                  {/* ⚠️ DISABLED IS A LIGHTER BORDER AND A MUTED ICON, NEVER ABSENCE. A verb that
                      vanished when it did not apply would reflow the row every time the selection
                      moved between a query that is due a chase and one that is not — so the row
                      would never be in the same place twice. `title` says WHY, which absence cannot. */}
                  {/* ⚠️ §4b · `aria-disabled`, NOT `disabled` — and that is a correctness fix, not a
                      preference. A `disabled` button dispatches no mouse events, so its `title`
                      never appears: the old control carried a reason nobody could ever read. It
                      stays focusable, announces itself as disabled, and no-ops on click. */}
                  <span className="f12-popwrap" style={{ display: "inline-flex" }}>
                  <button
                    ref={nudgeTriggerRef}
                    type="button"
                    className={`qc-btn qc-btn-shrink qc-btn-fwd${nudgeAt === "available" ? "" : " qc-btn-off"}${nudgeAgoDays != null ? " qc-btn-quiet" : ""}`}
                    aria-disabled={nudgeAt !== "available"}
                    title={nudgeAt === "available" ? (nudgeAgoDays != null ? `Nudged ${agoLabel(nudgeAgoDays)} — nudge again` : "Send a nudge") : nudgeWhy}
                    onClick={() => {
                      if (nudgeAt !== "available") return;
                      /* §4c — inside the agency's own stated window, state the facts and ask. Past
                         it, or with no window stated at all, there is nothing left to say. */
                      const ask = nudgeConfirm({
                        agent: activeAgent,
                        /* ⚠️ THE SEND ANCHOR COMES FROM THE SHARED DERIVATION, never re-mapped
                           here. `queryAmbientStatus` already knows which date the current stage
                           was sent on; a second status→date map is how the confirm and the
                           tracking bar would come to name two different days. */
                        sentMs: queryAmbientStatus(activeQuery, verbAction.ballHolder, verbAction.kind === "mark-sent" ? verbAction.markKind : undefined, Date.now(), activeAgent?.responseTimeWeeks).sentMs,
                        now: Date.now(),
                        formatDate: exactDate,
                      });
                      if (ask) setNudgeAsk({ title: ask.title, body: ask.body, bar: ask.bar });
                      else setIsNudgeOpen(true);
                    }}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>
                    {/* ⚠️ §4d · THE STATE IS THE LABEL. "Nudged · 3 days ago" is what stops a writer
                        sending a second follow-up they have already sent, and it uses §4's one
                        duration formatter rather than a count of days. */}
                    <span>{nudgeAgoDays != null ? "Nudged" : "Nudge"}</span>
                    {nudgeAgoDays != null && <span className="qc-btn-sub">· {agoLabel(nudgeAgoDays)}</span>}
                  </button>
                  </span>
                  {/**
                    * ══ §5 · VIEW RELATED TASKS ═══════════════════════════════════════════════
                    *
                    * ⚠️ IT REUSES WHAT ALREADY LINKS TASKS TO QUERIES, both halves: `queryTaskBadge`
                    * for the count — the same derivation the list row's badge and the filter read,
                    * never a fresh tally — and `TasksPopover` with a `{ queryId }` scope for the
                    * surface, which itself reads `Task.relatedRecordId` for the derived suggestions
                    * and `UserTask.queryId` for the stored ones. Nothing new links anything.
                    *
                    * ⚠️ HIDDEN AT ZERO, NOT DISABLED READING "(0)". A control that opens onto
                    * nothing is a control that lies about having something to show — and a disabled
                    * one states a number whose only content is that there is nothing to state.
                    *
                    * ⚠️ THE COUNT IS A MONO FIGURE, NOT A BADGE. A badge is an alert; this is a
                    * quantity beside a verb, and the bar has no other alerts on it.
                    */}
                  {queryTaskBadge(tasks, activeQuery.id).count > 0 && (
                    <span className="f12-popwrap" style={{ display: "inline-flex" }}>
                      <button
                        ref={tasksTrigRef}
                        type="button"
                        className="qc-btn qc-btn-shrink qc-btn-fwd"
                        aria-haspopup="dialog"
                        aria-expanded={isTasksOpen}
                        title="Tasks on this query"
                        onClick={() => setIsTasksOpen((o) => !o)}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11l3 3 8-8M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                        <span>View related tasks</span>
                        <span className="qc-btn-sub">({queryTaskBadge(tasks, activeQuery.id).count})</span>
                      </button>
                    </span>
                  )}
                  {/* ⚠️ THE GAP CARRIES THE DIVISION, NOT A RULE (§3c). Two groups: what moves the
                      query forward, then what ends it or takes it out of the app. A 1px rule between
                      them was a second device saying what the space already says, and it read as
                      chrome inside a row that is otherwise all verbs. */}
                  <span className="qc-gap" />
                  <button
                    ref={closeTriggerRef}
                    type="button"
                    className="qc-btn qc-btn-shrink"
                    aria-haspopup="menu"
                    aria-expanded={isCloseMenuOpen}
                    title="Mark this query closed"
                    onClick={() => setIsCloseMenuOpen((o) => !o)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11l3 3 8-8M21 12a9 9 0 1 1-6.2-8.5" /></svg>
                    <span>Mark closed</span>
                  </button>
                  {/* ⚠️ `Download as PDF` IS THE PACK'S "EXPORT", AND IT FINALLY HAS A SEAT (§3c).
                      §2 could place four verbs and left this one trailing behind a rule, flagged as
                      unresolved: its subject IS the query, so it could not be rehomed, and it was
                      not among the four. §3c names five and puts it second in the closing group —
                      between Mark closed and Delete. It stays an ICON at every width, which keeps
                      the four LABELLED verbs reading as four. */}
                  <button
                    type="button"
                    className="qc-btn qc-btn-icon"
                    disabled={isGeneratingPDF}
                    title={isGeneratingPDF ? "Generating…" : "Download this query as PDF"}
                    aria-label={isGeneratingPDF ? "Generating PDF" : "Download this query as PDF"}
                    onClick={() => handleDownloadPDF()}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" /></svg>
                  </button>
                  {/* ⚠️ DELETE SITS OPENLY IN THE ROW BECAUSE §9 GIVES IT AN UNDO. A destructive verb
                      with no way back needs a dialogue to interrupt the flow; one with five seconds
                      of undo does not, and the undo is the cheaper interruption. */}
                  <button
                    type="button"
                    className="qc-btn qc-btn-shrink qc-btn-danger"
                    title="Delete this query"
                    onClick={() => askDeleteQuery()}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></svg>
                    <span>Delete</span>
                  </button>

                </>
              );
            })() : (
              /* ⚠️ THE VERBS FADE AND GO INERT RATHER THAN DISAPPEARING (§9). An absent row would
                 collapse the control cell and shift both panels up the moment a query was chosen —
                 so the writer's very first click on the list would move the thing they clicked. The
                 shapes stay, at ~35%, unpressable; the ghost row also states what this column will
                 offer, which an empty line cannot.

                 ⚠️ AND THEY ARE `disabled`, NOT MERELY FADED. Opacity is a look; `disabled` is what
                 keeps them out of the tab order, so nothing here can be reached by keyboard and
                 fired against a query that is not there. `aria-hidden` for the same reason: it is a
                 shape, and a screen reader should meet the four verbs when they mean something. */
              <span className="qc-verbs-inert" aria-hidden="true">
                <button type="button" className="qc-btn qc-btn-fwd" disabled tabIndex={-1}>
                  <svg viewBox="0 0 24 24"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" /></svg>
                  <span>Record response</span>
                </button>
                <button type="button" className="qc-btn qc-btn-shrink" disabled tabIndex={-1}>
                  <svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>
                  <span>Nudge</span>
                </button>
                {/* ⚠️ THE GHOST MIRRORS THE LIVE ROW EXACTLY — same order, same grouping, same gap
                    (§3c). It is what the row looks like with nothing selected, so any divergence
                    would make the row move when a query is clicked, which is the fault the ghost
                    exists to prevent. */}
                <span className="qc-gap" />
                <button type="button" className="qc-btn qc-btn-shrink" disabled tabIndex={-1}>
                  <svg viewBox="0 0 24 24"><path d="M9 11l3 3 8-8M21 12a9 9 0 1 1-6.2-8.5" /></svg>
                  <span>Mark closed</span>
                </button>
                <button type="button" className="qc-btn qc-btn-icon" disabled tabIndex={-1}>
                  <svg viewBox="0 0 24 24"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" /></svg>
                </button>
                <button type="button" className="qc-btn qc-btn-shrink qc-btn-danger" disabled tabIndex={-1}>
                  <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></svg>
                  <span>Delete</span>
                </button>
              </span>
            )}
          </div>

          {/* ── List pane (F12, ref queries-hub-v14.html .list): search field only at the top,
              56px rows, slim footer (SHOWING n OF m · EXPORT CSV · key hints). No "your move"
              pills, no manuscript spine — the row is avatar · name/agency · StatusDot + date. ── */}
          <div className="f12-list">
            {/* ══ §1 · THE COUNT CAPS THE COLUMN ═══════════════════════════════════════════════
                ⚠️ IT WAS AN ORPHANED LINE FLOATING ABOVE A PANEL. In the header it caps the list
                the way Tracking and Notes are capped, so the three columns read as one family
                instead of two capped cards beside an uncapped one.

                ⚠️ THE SAME RULE, NOT THE SAME LOOK — `.f12-chh` is `PaneCard`'s own class,
                unscoped from `.f12-card` for this. A third sage band would be a third place for the
                gradient to drift.

                ⚠️ AND IT SITS ABOVE THE SEARCH ROW, which does not move: search, filter and sort
                narrow the list and belong with the rows, while the count states what the list IS.
                Two different jobs, and the cap is the one that introduces the column. */}
            {/**
              * ⚠️ §3 · THE SAGE HEADER BLOCK IS GONE, RESETTING TO THE EARLIER LAYOUT. It stated
              * "25 queries" and an answered split above a list whose groups already state their own
              * counts — a band of figures between the search field and the work, on a column that
              * introduces itself twice.
              *
              * ⚠️ AND `answeredSplit` KEEPS ITS TESTS AND LOSES THIS CALLER. Reported rather than
              * deleted: the derivation is sound and the decision that removed it is about where a
              * count belongs, not about whether the count is right.
              */}
            {/* ⚠️ THE COLUMN'S OWN HEADING IS GONE (§1a). It read "20 queries" — the same figure
                the masthead states directly above it, on one screen, twice. Panes do not introduce
                themselves: the page is titled once, and the count belongs to the title.

                ⚠️ THE FOOT STILL STATES "SHOWING n OF m", AND THAT IS NOT THE SAME FACT. The
                masthead counts the whole scope; the foot counts what the FILTER left. They differ
                the moment anything is narrowed, which is when the second number starts earning its
                place. `listHeadLabel` keeps its own tests but has no caller — reported, not deleted
                here, because a lib function with a live test suite is a separate decision. */}
            {/* ⚠️ THE LIST'S CONTROLS SIT AT THE HEAD OF THE LIST COLUMN (§1c) — and they came back
                DOWN here from the grid's page-wide toolbar row, which is the correction. Search,
                Filter and Sort narrow the list; they do nothing to the reading pane beside it. A
                strip spanning both columns claimed a reach they do not have, and put the controls
                further from the rows they govern than from the pane they do not.

                ⚠️ NOT GATED ON THE JOURNEY. The old `toolbar` prop dropped these on
                `creating || recording` because the list was hidden then. It is not hidden any more
                (§2) — it sits under the scrim, whole, with `inert` doing the disabling. A head that
                vanished while the sheet was open would animate the desk behind the writer's back.

                Wiring is untouched: same handlers, same popovers, same refs. */}
            {/* ⚠️ THE PANEL STARTS STRAIGHT INTO ROWS. `listHead` moved into the command row's left
                cell — it is the same JSX, rendered one level up, so the wiring, the popovers and the
                refs are untouched. What changes is that it now shares a line with the pane's verbs. */}
            {/**
              * ⚠️ DERIVED, UNDISMISSABLE, AND IT LEAVES ON ITS OWN (D6). It states a count and offers
              * the scope that holds them — no ✕, because there is nothing to remember having
              * dismissed, and a banner you can silence is how a gap outlives the notice about it.
              * It is not an alarm: an imported row missing its manuscript is work, not damage.
              */}
            {needsDecisionCount > 0 && selectedManuscriptFilter !== UNASSIGNED_MS && (
              <button type="button" className="qc-needbar"
                      onClick={() => setSelectedManuscriptFilter(UNASSIGNED_MS)}>
                <span>
                  <b>{needsDecisionCount}</b>{" "}
                  {needsDecisionCount === 1 ? "query is" : "queries are"} missing a manuscript or an agent.
                </span>
                <span className="qc-needbar-go">Show {needsDecisionCount === 1 ? "it" : "them"} ›</span>
              </button>
            )}
            <div ref={listScrollRef} className="f12-rows" role="listbox" aria-label="Queries" onKeyDown={onListKeyDown}>
              {/* ══ §5 · THE LIST GROUPS BY STATE ═══════════════════════════════════════════════
                  ⚠️ GROUPING PARTITIONS AN ALREADY-SORTED LIST — the agent list's rule, and the
                  reason it is worth restating: the sort applies WITHIN each group for free, rather
                  than through a second ordering pass that could disagree with the first.

                  ⚠️ AN EMPTY GROUP DRAWS NOTHING. A rule reading "OVERDUE · 0" is a heading for a
                  state you are not in; the absence of the rule is the same information, quieter.

                  ⚠️ AND THE COUNT IS THE RENDERED SET'S. These are counts of what is on screen after
                  the filter and the search — unlike the cell above, which counts the scope. Two
                  numbers, two facts; the head says how many queries you have and the rules say how
                  the ones you are looking at are doing. */}
              {(() => {
                /* ⚠️ THE GROUPING IS DERIVED ABOVE (§4) AND READ HERE. It used to be computed in
                   this IIFE; the arrows need the same order, and two derivations of "which rows are
                   showing" come apart at exactly the states that are hard to notice — a folded
                   group, a grace row mid-collapse. */
                return listGroups.map(({ g, items, foldable, shut }) => {
                  return (
                /* ⚠️ A REAL `role="group"` WITH A NAME (§4c). The heading is a divider, not a stop:
                   it is `aria-hidden` on every group whose name the wrapper already carries, so a
                   screen reader announces "Overdue, 4" once rather than reading a decorative rule.
                   The comma is deliberate — "·" is announced as a character.

                   ⚠️ THE CLOSED GROUP'S HEADING IS THE ONE EXCEPTION, and it is flagged rather than
                   hidden: it is a real control (show/hide) and must stay reachable, so it keeps its
                   button role and its tab stop. That makes it a non-option child of a listbox, which
                   is an ARIA compromise; hiding it would trade a compromise for an unreachable
                   control, which is worse. */
                /* §1 — flat: no `role="group"`, no name, no heading. A single unnamed section over
                   every row is not a grouping, and announcing one would tell a screen reader the
                   list is organised when it is not. */
                <div className={g === "flat" ? "qc-grp qc-grp--flat" : "qc-grp"} {...(g === "flat" ? {} : { role: "group", "aria-label": `${GROUP_LABEL[g]}, ${items.length}` })} key={g}>
                  {g !== "flat" && <div className={`qc-gh${g === "overdue" ? " qc-gh-od" : ""}${foldable ? " qc-gh-fold" : ""}`}
                    {...(foldable ? { role: "button", tabIndex: 0, onClick: () => setClosedOpen((o) => !o),
                      onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setClosedOpen((o) => !o); } },
                      "aria-expanded": !shut } : { "aria-hidden": true })}>
                    <span>{GROUP_LABEL[g]} · {items.length}</span>
                    <i aria-hidden="true" />
                    {foldable && <em>{shut ? "show" : "hide"}</em>}
                  </div>}
                  {!shut && items.map(({ q, agent, ms }) => {
                const isSelected = selectedQueryId === q.id;
                /**
                 * ⚠️ §4b · THE FIGURE IS A RELATIVE DATE, AND "ago" IS WHAT RETIRES THE LABEL. It
                 * was a POSITION — days left against the agent's window, days late past it — which
                 * needed a caption above it ("with agent for") to say what the number measured, and
                 * that two-line block is what squeezed the status mark to 17px. "5 weeks ago" needs
                 * no caption: the word is the unit's own qualifier.
                 *
                 * ⚠️ IT MEASURES FROM THE LAST OUTBOUND SEND (`lastSendMs` — the newest of
                 * `dateSent` / `partialSentDate` / `fullSentDate`), never from the query's creation.
                 * A query whose partial went last month has been with the agent a month.
                 *
                 * ⚠️ ONE FORMATTER, "ago" APPENDED AT THE PRESENTATION LAYER — `agoLabel`, the same
                 * function the Nudge control uses for the same kind of sentence.
                 */
                const sendMs = lastSendMs(q as never);
                const figureLabel = sendMs != null ? agoLabel(daysBetween(sendMs, nowMs)) : (formatListRowDate(q.dateSent) ?? "—");
                const queriedDate = figureLabel;
                /* approximate display, precise truth — the exact date of THAT send rides in the title */
                const exact = sendMs != null ? exactDate(sendMs) : "";
                return (
                  <button
                    key={q.id}
                    type="button"
                    id={`query-row-${q.id}`}
                    role="option"
                    aria-selected={isSelected}
                    /* ⚠️ ONE TAB STOP (§4c). Forty rows, each a `<button>`, was forty stops between
                       the search field and the reading pane — Tab as a way THROUGH the list rather
                       than past it. Only the roving row is reachable; the arrows move the roving. */
                    tabIndex={q.id === cursorId ? 0 : -1}
    // v4 P2 — clicking another row while drafting is a click-away: resolve the
                    // draft first (silently when untouched, with a confirm when dirty), then
                    // select. pickRow also pushes to detail below md (Mobile Pass 1).
                    onClick={() => (creating ? closeCreate(() => pickRow(q.id)) : pickRow(q.id))}
                    /* ⚠️ SELECTION FOLLOWS FOCUS, LITERALLY (§4c) — and that fixes a fault this
                       section did not set out to fix. Measured: the FIRST click on a row after a
                       page visit focuses it and does not select it, because the header collapses on
                       engagement between `pointerdown` and `pointerup` and the shifted `pointerup`
                       never completes a `click`. Focus had already moved, so the row looked chosen
                       and the pane did not follow. Selecting on FOCUS is what the clause says and
                       it is immune to the click never arriving.

                       ⚠️ THE DRAFT GUARD KEEPS THE CLICK PATH. Clicking away from an open create
                       journey has to resolve the draft first; a bare focus must not, so this is
                       gated on `!creating` and the click handler above is unchanged. */
                    onFocus={() => { if (!creating && q.id !== selectedQueryId) pickRow(q.id); }}
                    className={`f12-row${isSelected ? " f12-sel" : ""}${settleId === q.id ? " f12-settle" : ""}${landedId === q.id ? " qc-landed" : ""}${graceRow?.id === q.id && graceRow.leaving ? " f12-row-leaving" : ""}`}
                    onAnimationEnd={(e) => {
                      if (e.animationName === "f12-settle") setSettleId((cur) => (cur === q.id ? null : cur));
                      // The collapse's own end fires the toast — no timer schedules either.
                      if (e.animationName === "f12-collapse") {
                        setGraceRow(null);
                        showToast({
                          message: "Query saved — it's hidden by your current filter",
                          undoLabel: "Show it",
                          duration: 4000,
                          undo: () => { resetAllFilters(); setListSearch(""); setSelectedQueryId(q.id); },
                        });
                      }
                    }}
                  >
                    {/**
                      * ⚠️ §3 · THE MONOGRAM RETURNS TO THE LEFT AND THE MARK TO THE RIGHT — a reset
                      * to the earlier layout, reversing the previous pack's §4a. That section moved
                      * the mark to the lead because the two-line elapsed block had squeezed it to
                      * 15px; the elapsed block is one line now, so the mark fits its old column at
                      * a readable size and the monogram gets the position that distinguishes two
                      * queries to the same agent.
                      */}
                    <span className="f12-av f12-av--sm" aria-hidden="true">{agentInitials(agent)}</span>
                    <span className="f12-mid">
                      <span className="f12-nm">{agentPrimary(agent)}</span>
                      <span className="f12-ag">{agentAgencyLine(agent)}</span>
                      {/**
                        * ⚠️ THE VERSION COLUMN (Part E, D10) — the version HELD where a full or
                        * partial has gone, otherwise the version READ. `listVersion` decides, and
                        * it is the same function the filter runs, so a row can never be filtered
                        * out by a version it is not showing.
                        *
                        * ⚠️ WHERE NEITHER IS KNOWN IT RENDERS NOTHING — not a dash. A dash in a
                        * column is a value; it says "we looked and the answer is empty", when the
                        * truth is that nobody recorded one. Absence is the honest mark, and it is
                        * the ordinary case for every query sent before this feature.
                        */}
                      {(() => {
                        const bvs = bookVersionsOf(ms ?? null);
                        if (bvs.length < 2) return null;
                        const v = listVersion(q as never, packages, versions, activities, bvs);
                        return v ? <span className="f12-ver pkgb-mver"><span aria-hidden="true">§</span>{v.name}</span> : null;
                      })()}
                    </span>
                    <span className="f12-end">
                      {undoingQueryIds.has(q.id) ? (
                        /* ⚠️ NO BURGUNDY IN THE LIST — these three dots mark a row whose undo is in
                           flight, and burgundy means OUTGOING on the mark they replace. */
                        <span className="animate-pulse" aria-hidden="true" style={{ display: "inline-flex", gap: 3 }}>
                          <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--muted)" }} />
                          <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--muted)" }} />
                          <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--muted)" }} />
                        </span>
                      ) : <StatusDot status={q.status} overrideSize={17} />}
                      {/* ⚠️ THE LANGUAGE DOES NOT RESET WITH THE LAYOUT. The screenshot shows
                          `+19 DAYS` and `27 DAYS LEFT`; the figure stays a relative date measured
                          from the last outbound send, with the exact date in its `title`. */}
                      <span className="f12-d2" title={exact ? `Sent ${exact}` : undefined}>{queriedDate}</span>
                    </span>
                  </button>
                );
                  })}
                </div>
                  );
                });
              })()}
              {/* ⚠️ `dataReady &&` STATES WHAT `queries.length > 0` ONLY IMPLIED. This was unreachable
                  during a load by coincidence — an empty store makes the second clause false — which
                  is exactly the kind of accidental correctness that stops being correct when
                  someone edits the clause for an unrelated reason. */}
              {dataReady && sortedList.length === 0 && queries.length > 0 && (
                <div style={{ textAlign: "center", padding: "48px 16px", color: "var(--faint)", fontSize: 12, fontStyle: "italic" }}>
                  No queries match these filters.
                </div>
              )}
            </div>
            <div className="f12-lfoot">
              <span>SHOWING <b>{sortedList.length}</b> OF {queries.length}</span>
              <button type="button" onClick={() => sortedList.length > 0 && handleExportFilteredCSV()}>EXPORT CSV</button>
            </div>
          </div>{/* closes list pane */}

          {/* Reading pane — the WORKSPACE (desk-rule second clause, ref queries-workspace-v2.html:
              a live process you act on FILLS to the viewport line, unlike the Agents document which
              hugs). A flex column: agent band (flex:none) over three full-height columns that each
              scroll behind their own edge fade (flex:1). The command bar pins to the pane foot in
              Phase 2; the top action toolbar above still exists this phase. */}
          <div
            /* ⚠️ THE PANE IS ONLY EVER THE REST STATE NOW (§2). It used to carry the journey's frame
               animation and the journey's lifecycle handler, because the journey WAS the pane. The
               journey is a sheet laid over the desk; the pane keeps reading behind it, unchanged,
               so `f12-pane-enter-read` is unconditional and the takeover's classes have moved to
               the sheet that actually arrives and leaves. */
            /* §2b — ⚠️ THE CHASSIS IS THE `qp-pane` BACKGROUND, and the unselected state drops it.
               Rendering the bare pane inside the panel would keep the card the ref removes, with
               the art floating in the middle of it. */
            className={`${paneUnselected ? "qc-pane-bare" : "qp-pane"} f12-detail f12-pane-enter-read`}
            /* ⚠️ NOT a .f12-pane. In the ref the pane column has NO wrapper card: the toolbar row, the
               hero and the three columns are siblings directly inside the workspace frame, and the
               only bordered surfaces are the hero and the columns themselves. Carrying .f12-pane
               here put a bordered, shadowed card around all of them — a card inside the frame,
               inside the sheet. The SKIN is gone; the layout it provided lives on the inline style
               below (flex column, min-height 0, overflow hidden). */
            /* ⚠️ THE CARD GAP IS THE COLUMN'S `gap`, NOT THE GRID'S PADDING (alignment amendment).
               It was `.qp-cols`' own `padding-top: 16`, which LOOKS identical and is not the same
               thing: measured, the two boxes had a sibling gap of ZERO and a padding standing in
               for it, so "every gap between siblings is one value" was true by coincidence rather
               than by construction — and the next element added to this column would have arrived
               flush against its neighbour. One `gap`, paid by the container, same as the stack's. */
            style={{ minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", gap: 16 }}>
            {/* ── THE TOOLBAR NOW LIVES IN THE PANE (ref query-centre-final.html) — first row of
                the pane column, flush with the cards beneath it, no longer a page-wide bar
                straddling the list. Create mode replaces it IN PLACE (its own branch inside the
                same IIFE), so the takeover swaps one pane row rather than a page bar. ── */}
            {/* ── F12 CONTROL BAR (ref queries-hub-v14.html .ctl): two zones locked by --listw —
                left = FILTER + SORT pill triggers (nothing else); right = the query actions as
                QUIET buttons (no filled button in this bar), PDF + Delete right-aligned. The old
                masthead + hub-grammar filter bar and the foot control-row cards are retired. ── */}
            {/* ⚠️ THE PANE TOOLBAR IS GONE (§1c). It held six controls and EVERY ONE of them was
                gated on `!sel` — View tasks, Nudge, Agent, Manuscript, ⋯ and Delete all act on the
                SELECTED QUERY, not on the list and not on the workspace. A row of six verbs that
                are dead until you pick something is not a command bar; it is a list of things you
                cannot do yet. They are one kebab in the hero now, beside the primary, where the
                query they act on is named. */}
            {/**
              * ⚠️ THE JOURNEYS ARE AN OVERLAY, NOT A BRANCH OF THIS PANE (§2). They sit lexically
              * inside it and render nowhere near it: `QueryJourneySheet` portals to document.body,
              * so the sheet lands above the whole desk while the JSX stays where the state it reads
              * already is. Moving 180 lines to move a box was the alternative, and it would have
              * bought nothing but a diff.
              *
              * ⚠️ WHICH MEANS THE PANE KEEPS READING UNDERNEATH. The hero, the columns and the
              * kebab are all still mounted and still correct while a journey is open — dimmed by
              * the scrim, not replaced. That is the whole of §2: a sheet laid on the desk rather
              * than a page that swapped itself out.
              *
              * ⚠️ THE LIFECYCLE HANDLER MOVED HERE WITH THE FRAME, AND MUST BE IN EXACTLY ONE
              * PLACE. React events bubble through the REACT tree, not the DOM one, so an
              * `animationend` inside the portal still reaches this pane — leaving a copy on the
              * pane as well would run every teardown twice.
              */}
            <QueryJourneySheet
              open={creating || recording}
              register={recording ? "record" : "create"}
              ariaLabel={recording ? "Recording a response" : "Logging a new query"}
              /* ⚠️ ONE EXIT, THREE ROUTES (§3). Escape, a backdrop click and the dock's Cancel all
                 call this — which is the SAME handler Cancel already called, so the dirty guard is
                 inherited rather than rebuilt. `closeCreate` / `closeRecord` diff the draft against
                 the baseline captured at open and confirm only when it is dirty; an untouched sheet
                 closes silently, and every seeded default (today's date, the house nudge, a
                 pre-selected manuscript) is part of that baseline and therefore already clean. */
              onRequestClose={() => (recording ? closeRecord() : closeCreate())}
              /* ⚠️ OFFER IS THE ONLY OUTCOME THAT MOVES THE LIGHT (§5). Record already sits a step
                 deeper than create — a reply is something that happened TO you — and an offer
                 deepens one further because it is the moment the whole campaign is for. Nothing
                 else changes it: a pass is not darker, just quieter, and a room that dimmed for a
                 rejection would be reacting to bad news on the writer's behalf. */
              lamp={recording ? (respDraft?.outcome === "offer" ? "offer" : "record") : "create"}
              act={recording ? "Record a response" : "Log a query"}
              /* ⚠️ THE SAME THREE CLASSES, ON THE NEW FRAME. They were a template literal on the
                 pane and stay one here — the classes did not change, only what wears them, and
                 keeping the expression shape means the locks that guard them still read as prose
                 about the thing they guard. Both journeys arm the same three; only the state
                 driving them differs. */
              stateClass={`${createEntering || respEntering ? " qc-entering" : ""}${createCancelling || respCancelling ? " qc-exit-cancel" : ""}${createExiting || respExiting ? " qc-exit-save" : ""}`.trim()}
              /* ⚠️ THE JOURNEY GOES WHEN THE ANIMATION ENDS, not after a hardcoded delay that would
                 drift the moment the timing changed.

                 ⚠️ THE OLD COMMENT HERE CLAIMED `animation: none` "still fires animationend". IT
                 DOES NOT — verified in-browser — which is why the reduced-motion path is a branch at
                 the arming site (saveCreate) rather than a second listener. Under reduced motion
                 this handler is never reached, because the class is never applied.

                 ⚠️ AND IT NOW ALSO RECEIVES THE SHEET'S OWN `qc-sheet-lay`. Unnamed animations fall
                 through every branch below and do nothing, which is the correct outcome — but it is
                 why each branch tests the NAME rather than assuming what fired. */
              onAnimationEnd={(e) => {
                /* ⚠️ THE SEAL ARMS THE EXIT, AND IT IS CHECKED FIRST. It is the beat between the
                   write landing and the sheet leaving, so nothing below should run while it plays.
                   `thenExit` is false for "Save & log another", where the seal marks a save that
                   is not a departure. */
                if (seal && e.animationName === "qc-seal") {
                  const leaving = seal.thenExit;
                  setSeal(null);
                  if (leaving) { if (recording) setRespExiting(true); else setCreateExiting(true); }
                  return;
                }
                if (respCancelling && e.animationName === "qc-exit-cancel") {
                  shutRecord(); recordTriggerRef.current?.focus(); return;
                }
                if (respExiting && e.animationName === "qc-exit-save") {
                  shutRecord(); recordTriggerRef.current?.focus(); return;
                }
                if (respEntering && e.animationName === "qc-in-last") { setRespEntering(false); return; }
                if (createCancelling && e.animationName === "qc-exit-cancel") { finishCancelExit(); return; }
                if (createExiting && e.animationName === "qc-exit-save") { finishSaveExit(); return; }
                if (createReseating && e.animationName === "qc-reseat") { finishReseat(e.currentTarget); return; }
                /* ⚠️ NOT WHILE LEAVING. A `qc-in-last` still in flight when Cancel is pressed would
                   otherwise put focus back into a journey that is on its way out. */
                if (!createCancelling && e.animationName === "qc-in-last") finishEntrance(e.currentTarget);
              }}
              dock={!isMobile ? (
                /* ⚠️ THE DOCK IS INSIDE THE SHEET NOW, not row 4 of WorkspacePageGrid. It states
                   what committing THIS composition will do, so it belongs to the composition rather
                   than to the page the composition is lying on.

                   ⚠️ AND THE RHYTHM PACK'S WARNING RETIRES WITH THE MOVE: "a dock's height comes out
                   of the scrollport" was true while the dock was a grid row. It is not a grid row.
                   Nothing about `--wpg-reclaim-pad` is affected by it any more — do not reinstate
                   that coupling on this page.

                   ⚠️ DESKTOP ONLY, BECAUSE THE MOBILE DOCK ALREADY EXISTS. `.qh-mcmd` is Query
                   Centre's own floating command bar below md — the same idea at the other
                   breakpoint, and it carries the Mark-sent anchor. Rendering both would stack two
                   bottom bars over a tab bar.

                   ⚠️ AND THE TOAST HOST FLOATS OVER IT, WHICH IS CORRECT. `.sa-toasts` is z:300
                   against the sheet's 201, so a receipt sits ABOVE the dock rather than pushing it
                   — a confirmation should never move the control you just used. */
                <div className={`qc-dock${createEntering || respEntering ? " qc-dock-in" : ""}${createCancelling || respCancelling ? " qc-dock-out" : ""}${seal ? " qc-dock-sealed" : ""}`}>
                  <span className="qc-dock-say">
                    {/* ⚠️ `OUTCOME_STATUS`, NOT A CAST. `respDraft.outcome` is an outcome KEY ("rr",
                        "noreply", "rejected") and casting it to `QueryStatus` typechecks while
                        producing a value the enum never contains — measured, the dock read "Saves as
                        rejected" in lowercase and `getPrimaryAction` fell through to its default, so
                        the line promised "closed — the row will offer Record response", which
                        contradicts itself. `responseDraft.ts` owns this map: "This module maps
                        outcomes to statuses; it never sets one." */}
                    {recording && respDraft
                      ? consequenceLine(respDraft.outcome ? OUTCOME_STATUS[respDraft.outcome] : null)
                      : consequenceLine(createReady ? QueryStatus.QUERIED : null)}
                  </span>
                  <span className="qc-dock-acts">
                    {/* ⚠️ THE SEAL SITS BESIDE THE PRIMARY, and it is `aria-hidden` because the
                        toast already announces the save in words. Two announcements of one event
                        talk over each other, and a wax seal is not information a screen reader
                        needs — it is the felt half of a confirmation whose spoken half exists. */}
                    {seal && (
                      <span className={`qc-seal qc-seal--${seal.kind}`} aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="m5 13 4 4L19 7" /></svg>
                      </span>
                    )}
                    <span className="qch-esc" aria-hidden="true">Esc</span>
                    {recording ? (
                      <>
                        <button type="button" className="f12-btn-sec" onClick={() => closeRecord()} disabled={respSaving}>Cancel</button>
                        {/* ⚠️ NO "SAVE AND RECORD ANOTHER" — a response belongs to one query, so there
                            is no next one to move on to and offering it would invent a batch. */}
                        <button type="button" className="f12-btn-pri" onClick={() => void saveResponse()}
                          disabled={!responseReady(respDraft!) || respSaving}>
                          {respSaving ? "Saving…" : "Save response"}
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="f12-btn-sec" onClick={() => closeCreate()} disabled={createSaving}>Cancel</button>
                        <button type="button" className="qch-tert" onClick={() => saveCreate(true)} disabled={!createReady || createSaving}>Save &amp; log another</button>
                        <button type="button" className="f12-btn-pri" onClick={() => saveCreate()} disabled={!createReady || createSaving}>
                          {createSaving ? "Saving…" : "Save query"}
                        </button>
                      </>
                    )}
                  </span>
                </div>
              ) : undefined}
            >
            {respDraft && respQueryId ? (
              /* ── RECORDING A RESPONSE (§1, ref 83-record-response.html) ── */
              <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1, padding: "16px 20px 20px" }}>
                <div className="qch qch-resp">
                  {/* ⚠️ THE BEAT NEEDS A WRAPPER (§5). The ring is a `::after`, and an `<img>` is a
                      replaced element that cannot carry one — hung off the image directly the rule
                      would parse, pass every lock, and draw nothing at all. */}
                  <span className="qc-motif">
                    <img className="qch-ill" src="/Log_Query_Icon.png" alt="" width={64} height={64} />
                  </span>
                  <div className="qch-txt">
                    <h2 className="qch-title">Recording a response</h2>
                    {/* ⚠️ THE LEDE IS GONE (§4); THE ERROR IS NOT. This one element did two jobs —
                        a standing line, and the save failure announced in burgundy — so deleting
                        the copy meant keeping the announcer. It renders only when there IS a
                        failure now, which is also the honest shape: a live region that is populated
                        at rest has nothing to announce when it changes.

                        The header is two lines: what this is, and where it sits. The lede said
                        neither — "the rest follows from that" describes the form's own behaviour,
                        which the chips and the enabled-on-a-pair Save already state by BEING it. */}
                    {respError && (
                      <p className="qch-sub qch-err" aria-live="assertive" aria-atomic="true">{respError}</p>
                    )}
                    {/* ⚠️ THE PLACE LINE (§2b) — where this act sits in the campaign, as FACT. No
                        adjective, no encouragement, no streak: "your 17th query for X" is a
                        position, "your 17th — keep going" is a coach. Rendered only when it has
                        something to say; a clause whose figure is missing omits itself rather than
                        printing a zero. It is NOT a live region — the lede above already is one,
                        and two announcers on one block talk over each other. */}
                    {respPlace && <p className="qch-place">{respPlace}</p>}
                    {/* ⚠️ TWO CHIPS ONLY, because Save waits for exactly two facts. The three-state
                        marks are create's: empty until answered, a DASH for what we pre-filled, a
                        tick only once the writer has opened the step carrying it. */}
                    <div className="qch-reqs">
                      {/* ⚠️ ONLY THE EARNED ONES (§4) — see create's note. `done`, never `prefilled`:
                          the arrival date is seeded to today, and a tick against a date nobody has
                          looked at claims a confirmation that did not happen. */}
                      {responseChips(respDraft, respOpened)
                        .filter((r) => r.state === "done")
                        .map((r) => (
                        <span key={r.key} className="qch-rq qch-answered">
                          <span className="qch-c" aria-hidden="true">✓</span>
                          {r.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* ⚠️ THE ACTIONS MOVED TO THE DOCK (§3). The journey header keeps IDENTITY AND
                      PROGRESS only — motif, title, lede, place line, chips. Two jobs, two places:
                      what this is and how far along it is here, what happens when you commit it at
                      the foot, next to the button that commits it. */}
                </div>
                <ResponsePane
                  draft={respDraft}
                  onChange={setRespDraft}
                  query={queries.find((q) => q.id === respQueryId)!}
                  agent={agents.find((a) => a.id === queries.find((q) => q.id === respQueryId)?.agentId) ?? null}
                  manuscripts={manuscripts}
                  active={respStep.active}
                  reached={respStep.reached}
                  /* The order is the DRAFT's, not a constant — the stack changes with the outcome,
                     so the two movers have to ask the same question the renderer does. */
                  /* ⚠️ PAST THE STEP, NOT ON IT (§4). This armed on `reached === "when" || active
                     === "when"`, so the Date chip ticked the moment the writer LANDED on the When
                     step rather than when they finished with it — the same unearned mark create's
                     header carried, one step later. `pastWhen` is the shared predicate. */
                  onJump={(id) => {
                    const n = jumpIn(stepsFor(respDraft.outcome), id, respStep.reached);
                    setRespStep(n);
                    if (pastWhen(respDraft.outcome, n.reached)) setRespOpened({ when: true });
                  }}
                  onAdvance={() => {
                    const n = advanceIn(stepsFor(respDraft.outcome), respStep.active, respStep.reached);
                    setRespStep(n);
                    if (pastWhen(respDraft.outcome, n.reached)) setRespOpened({ when: true });
                  }}
                  dropped={respDropped}
                  /* ⚠️ THE POSITION IS RESEATED WITH THE FIELDS. `reached` can point at a step the
                     new journey does not have, and a stack whose shape has just changed is one the
                     writer has to look at again — so it is clamped into the new order rather than
                     left dangling. */
                  onOutcomeChange={(next, lost) => {
                    setRespDraft(next);
                    setRespDropped(lost);
                    const order = stepsFor(next.outcome);
                    setRespStep((cur) => {
                      const n = reseatInto(order, order, cur.active, cur.reached);
                      return { active: n.active, reached: n.reached };
                    });
                  }}
                  onSave={() => void saveResponse()}
                  canSave={responseReady(respDraft)}
                  saving={respSaving}
                  sentISO={(queries.find((q) => q.id === respQueryId) as { dateSent?: string } | undefined)?.dateSent}
                  /* ⚠️ THE HISTORY ROW HAD NO DATA TO WORK WITH. `responseRefRows` was called with a
                     literal `[]`, so `historyRow` returned null on every reply ever recorded and the
                     row silently never appeared. */
                  queries={queries}
                />
              </div>
            ) : createDraft ? (
              /* v4 P2 — CREATE MODE owns the pane while a draft is open (ref create-mode-ref.html). */
              <div
                className={createReseating ? "qc-reseat" : undefined}
                style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1, padding: "16px 20px 20px" }}>
                {/* ── THE ILLUSTRATED HEADER (ref qc-create-v2.html) — replaces the retired
                    command bar. It says what you are doing, what it needs, and offers the three
                    ways out, in one band at the top of the work. ── */}
                <div className="qch">
                  {/* ⚠️ THE BEAT NEEDS A WRAPPER — see the record journey's note: a `::after` on a
                      replaced element draws nothing, silently. */}
                  <span className="qc-motif">
                    <img className="qch-ill" src="/Log_Query_Icon.png" alt="" width={64} height={64} />
                  </span>
                  <div className="qch-txt">
                    <h2 className="qch-title">Logging new query</h2>
                    {/* ⚠️ ONE LINE, TWO JOBS: the requirement by default, the save error in
                        burgundy when there is one. A failure belongs beside the button that
                        failed, not in a toast that can be missed.
                        The live region is PERMANENT rather than a role toggled on when the error
                        arrives. A live region announces CHANGES after first render, so the static
                        subtitle is not read on mount but the swap to an error is — whereas adding
                        role="alert" to an element already in the tree is unreliably announced
                        across screen readers. aria-atomic because the line replaces its text
                        rather than appending to it. */}
                    {/* ⚠️ THE LEDE IS GONE (§4); THE ERROR IS NOT. This element did two jobs — a
                        standing requirement line, and the save failure in burgundy — so deleting the
                        copy meant keeping the announcer, which now renders only when there IS a
                        failure. That is also the honest shape for a live region: one populated at
                        rest has nothing to announce when it changes.

                        "Needs an agent, a manuscript and a date — everything else can wait" promised
                        a queue that does not exist. The chips state the same requirement, and the
                        Save that enables on the trio states it as BEHAVIOUR rather than as a claim.
                        The header is two lines now: what this is, and where it sits. */}
                    {createError && (
                      <p className="qch-sub qch-err" aria-live="assertive" aria-atomic="true">{createError}</p>
                    )}
                    {/* ⚠️ THE PLACE LINE — where this act sits in the campaign, as FACT. No
                        adjective, no encouragement, no streak: "your 17th query for X" is a
                        position, "your 17th — keep going" is a coach. Rendered only when it has
                        something to say; a line whose figure is missing omits itself rather than
                        printing a zero. It is NOT a live region — the error above is one when it
                        appears, and two announcers on one block talk over each other. */}
                    {createPlace && <p className="qch-place">{createPlace}</p>}
                    {/* ⚠️ THE PIPS READ THE DRAFT, NEVER THE STEPS — required ≠ sequential. Two
                        are green on arrival because openCreate seeds the manuscript and today's
                        date; only the agent is genuinely open. They are deliberately NOT a live
                        region: the subtitle above already is one, and two announcers on one line
                        of chrome would talk over each other on every keystroke. */}
                    {/* ⚠️ THE CHECKLIST STATES VALUES, AND ITS TICKS ARE NOT ALL THE SAME TICK.
                        A bare green tick beside Manuscript and Date claimed the writer had
                        completed them when openCreate had merely pre-filled them — so the one
                        item that genuinely needs them read as one open thing among three
                        settled ones. Outlined = answered for you; solid = answered by you.
                        `createBase` is the baseline that tells them apart (see requirements). */}
                    {/* ⚠️ LABELS AND A MARK — NO VALUES. The chips used to preview "Manuscript
                        Murphy's Day Out" and "Date today", which restated what the sidebar and the
                        When step already say and read as confirmations of things the writer had not
                        seen. The values live in the collapsed step rows.
                        ⚠️ AND A TICK MEANS CONFIRMED. Pre-filled takes a DASH — the conventional
                        partial mark, and one that cannot be misread as completion — because an
                        outlined tick still reads as done, which is the claim this exists to stop
                        making. The tick arrives only once that step has been opened. */}
                    <div className="qch-reqs">
                      {/* ⚠️ ONLY THE EARNED ONES (§4). Every chip used to render from the first
                          frame, so the header opened with a row of empty rings exactly where the eye
                          should be going to the question. A chip appears when its phase is COMPLETE
                          — answered by the writer, not merely pre-filled for them — and it appears
                          already ticked, because there is no other state it can be in.
                          ⚠️ `answered`, NOT `answered || prefilled`. `prefilled` is the app's own
                          seeding: today's date and a manuscript the writer has not looked at. A chip
                          for that is a tick against work nobody did. */}
                      {requirements(createDraft, createBase, createOpened)
                        .filter((r) => r.state === "answered")
                        .map((r) => (
                        <span key={r.key} className="qch-rq qch-answered">
                          <span className="qch-c" aria-hidden="true">✓</span>
                          {r.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* ⚠️ THE ACTIONS MOVED TO THE DOCK (§3). The journey header keeps IDENTITY AND
                      PROGRESS only — motif, title, lede, place line, chips. Two jobs, two places:
                      what this is and how far along it is here, what happens when you commit it at
                      the foot, next to the button that commits it. */}
                    {/* ⚠️ THE TALLY STAYS IN THE HEADER, and it nearly went to the dock with the
                        buttons it was sitting beside. It is PROGRESS — how far this sitting has
                        got — which is the header's half of the split, not the dock's. The dock
                        states what the NEXT save will do; this states what the previous ones did.
                        Absent at zero: "0 logged" is a statement about nothing. */}
                    {sessionLogged > 0 && (
                      <span className="qch-tally" aria-live="polite">
                        {sessionLogged} logged
                      </span>
                    )}
                </div>
                <QueryCreatePane
                  draft={createDraft}
                  onChange={setCreateDraft}
                  agents={agents}
                  manuscripts={pickableManuscripts(manuscripts)}
                  onCreateAgent={handleCreateAgentInline}
                  queries={queries}
                  /* The duplicate link discards the draft through the normal door — closeCreate
                     owns the dirty-confirm, so "go and look at that one" can never lose typing
                     silently. */
                  onOpenQuery={(id) => closeCreate(() => setSelectedQueryId(id))}
                  /* ⚠️ ROUTES OUT OF CREATE MODE DISCARD THROUGH closeCreate, which owns the
                     dirty-confirm — leaving the pane by any other door could lose typing in
                     silence. Both are omitted when the page has no navigation bridge, because a
                     route card that goes nowhere teaches the wrong shape of the app. */
                  onStepsOpened={setCreateOpened}
                  onSave={() => void saveCreate()}
                  canSave={createReady}
                  saving={createSaving}
                  onSeeAllAgents={onNavigate ? () => closeCreate(() => onNavigate("agents")) : undefined}
                  onDiscover={onNavigate ? () => closeCreate(() => onNavigate("agents", "Discover")) : undefined}
                />
              </div>
            ) : null}
            </QueryJourneySheet>

            {/* ── THE REST STATE, WHICH NO LONGER STANDS DOWN FOR A JOURNEY. These three branches
                used to sit at the tail of one chain whose head was the two takeovers, so opening a
                journey unmounted whatever the writer had been reading. They are their own
                expression now, and the sheet floats over whichever of them is showing. ── */}
            {activeQuery && activeAgent && activeMs ? (
              <>
                <style>{`
                `}</style>
                {/* ══ §1/§2 · THE QUERY HEADER IS A MAIL HEADER ═══════════════════════════════
                    ⚠️ IT REPLACES THE PAIRING CARD, which replaced the plate and "What you sent".
                    The pairing card gave the agent and the manuscript a half each and a 66px mark
                    apiece; this gives each a LINE, with what belongs to it beneath on a shared
                    indent. One rule governs the card, and it is the rule a mail header follows:
                    a labelled subject, then its own details under it.

                    ⚠️ THE CONTACTS MOVED BENEATH THE NAME FOR A LAYOUT REASON, not a tidy one. On
                    one line, the longest agency name decided where every address began — so the
                    addresses started in a different place on every query. Under the name they start
                    on the label rail, which is one column for the whole card. */}
                {(() => {
                  const nameplate = agentPrimary(activeAgent);
                  /* the email address and the DOMAIN — see the note on `.qc-mchip-con` for why the
                     value rather than the word, and why it truncates rather than wraps */
                  const email = activeAgent.email?.trim() || "";
                  const site = agentWebsiteHref(activeAgent.website);
                  const siteText = site ? site.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "") : "";
                  return (
                    <div className="qc-mail">
                      <div className="qc-mailfr">
                        <div className="qc-mailgrid">

                          <div className="qc-mailrows">
                            {/* ── AGENT ── */}
                            {/* ⚠️ A BARE GLYPH WHERE THE WORD WAS (§1). `AGENT` and `SENT` carried
                                nothing — you already know which line is the person and which is the
                                book — and spent a third of the card's label column saying it.
                                ⚠️ BARE: no plate, no ring, no ground. The status mark stays the only
                                circular element on the card, which is what keeps the eye going name,
                                then status. */}
                            {/**
                              * ⚠️ §5 · THE MONOGRAM DISC RETURNS, replacing the bare person glyph.
                              * A glyph said "this row is a person" to a reader who could already
                              * see a name; the disc says WHICH person, and it is the same device
                              * the list rows use one column over — so the card confirms the row you
                              * clicked with the same mark.
                              */}
                            <span className="qc-mav" aria-hidden="true">{agentInitials(activeAgent)}</span>
                            <div className="qc-mval">
                              {/* ⚠️ THE SIZE DIFFERENCE IS REMOVED (§4), REVERSING THE EARLIER
                                  PACK'S §2. Its argument was sound — the list row you clicked was
                                  an agent, so the agent is what the card confirms first — and the
                                  MECHANISM was the problem: type carrying the hierarchy survives
                                  neither a long title, a short one, nor any later change to the
                                  scale. The CARD differentiates now, through a rule and a disc,
                                  and both of those hold whatever the words are. */}
                              {onNavigate ? (
                                <button type="button" className="qc-mname" onClick={() => onNavigate("agents")} title="Open the agent list">{nameplate}</button>
                              ) : <span className="qc-mname">{nameplate}</span>}
                              {/* ⚠️ THE AGENCY IS THE SECONDARY, and it states its own absence. An
                                  agent with no agency on file is a real record in this app; "No
                                  agency" is a fact, and a blank there is indistinguishable from a
                                  field nobody has looked at. */}
                            </div>
                            {/* ⚠️ §5 · THE AGENCY SITS UNDER THE NAME, not beside it. Beside it the
                                longest agency decided where the name ended; beneath, each has its
                                own line and neither truncates the other. */}
                            <div className="qc-magency">{activeAgent.agency?.trim() || "No agency"}</div>
                            <div className="qc-msub">
                              {/**
                                * ⚠️ §7 · AN ABSENT VALUE IS AN ACTION, NOT A DEAD PILL. Both read
                                * "No email" / "No website" and did nothing — a fact with no way to
                                * change it, on a card the writer is looking at precisely because
                                * they are dealing with this agent.
                                *
                                * ⚠️ AND IT EDITS THE AGENT, NOT THE QUERY. Stated in the popover's
                                * own title and in the toast, because a control on a query's card
                                * that silently changes shared data is the worse kind of surprise.
                                */}
                              {email ? (
                                <a className="qc-mchip qc-mchip-con" href={`mailto:${email}`} title={email}>
                                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v14H3zM3 5l9 7 9-7" /></svg>
                                  <span className="qc-mchiptx">Email</span>
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  className="qc-mchip qc-mchip-con qc-mchip-plus"
                                  title="Add an email address to this agent's record"
                                  onClick={(e) => {
                                    (agentEditTrigRef as React.MutableRefObject<HTMLElement | null>).current = e.currentTarget;
                                    setAgentDraft("");
                                    setAgentEdit("email");
                                  }}
                                >
                                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v14H3zM3 5l9 7 9-7" /></svg>
                                  <span className="qc-mchiptx">+ Add email</span>
                                </button>
                              )}
                              {site ? (
                                <a className="qc-mchip qc-mchip-con" href={site} target="_blank" rel="noreferrer noopener" title={site}>
                                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" /></svg>
                                  <span className="qc-mchiptx">Website</span>
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  className="qc-mchip qc-mchip-con qc-mchip-plus"
                                  title="Add a website to this agent's record"
                                  onClick={(e) => {
                                    (agentEditTrigRef as React.MutableRefObject<HTMLElement | null>).current = e.currentTarget;
                                    setAgentDraft("");
                                    setAgentEdit("website");
                                  }}
                                >
                                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" /></svg>
                                  <span className="qc-mchiptx">+ Add website</span>
                                </button>
                              )}
                            </div>

                            {/* ── SENT ── */}
                          </div>

                          {/* ══ §2 · THE STATUS BLOCK ══════════════════════════════════════════
                              ⚠️ THE LOCKED COMPONENT, LARGER AND OTHERWISE UNTOUCHED. `overrideSize`
                              is the only thing this card says about it: no transform, no second
                              ring, no postmark treatment, and the status text is NOT baked into it.
                              The ring, the centre fill and the direction colouring are whatever the
                              system defines them to be, here and on every other surface.

                              ⚠️ AND NO HAIRLINE BESIDE IT. The status is a mark applied to the
                              paper, not a field ruled off from the rows. */}
                          <div className="qc-mstatus">
                            <div className="qc-mstx">
                              <div className="qc-mswd">{statusDisplayLabel(activeQuery)}</div>
                              {/* ⚠️ THE DATE OF THE MOST RECENT DEVELOPMENT, not the send date.
                                  Tracking's first rung carries the send; what belongs beneath a
                                  STATE is when the query last entered one. It falls back to the
                                  send date only when nothing has happened since, which is true
                                  rather than a substitution. Both go through `refDate`, which omits
                                  an unparseable value rather than printing "Invalid Date". */}
                              {(() => {
                                const moved = refDate((activeQuery as { lastStatusChange?: unknown }).lastStatusChange)
                                  || refDate((activeQuery as { dateSent?: unknown }).dateSent);
                                return moved ? <div className="qc-msdate">{moved}</div> : null;
                              })()}
                            </div>
                            {/* ⚠️ §5 · THE MARK IS SMALL AND SITS AFTER THE WORDS. At 56px it was
                                the largest object on the page and the card's subject appeared to be
                                its status; the word already names the state, and the mark's job
                                here is to carry the direction the word cannot. */}
                            <StatusDot status={activeQuery.status} overrideSize={26} />
                          </div>

                        </div>
                      </div>
                      {/* ══ §5 · THE CHIP'S OWN POPOVER ═══════════════════════════════════════
                          ⚠️ ONE POPOVER, ANCHORED TO WHICHEVER CHIP OPENED IT. Three mounted
                          popovers would be three places for the open state to disagree.
                          ⚠️ AND IT PORTALS THROUGH THE PAGE'S OWN `F12Popover` — which already
                          closes on Escape and on an outside click and escapes the pane's
                          `overflow: hidden`. A fourth popover primitive on this page would be a
                          fourth way to open a menu. */}
                      {/**
                        * ══ §1 + §2 · THE MATERIALS EDITOR — ONE COMPONENT, BOTH ROUTES ═════════
                        *
                        * ⚠️ THE SAME `matPop` STATE SERVES THE PILL CLICK AND THE ATTACH MENU. They
                        * used to open different things: clicking a pill opened this editor, while
                        * choosing `Other` from the menu opened a separate inline row below the
                        * chips, and choosing `Opening sample` opened the editor with no anchor. Two
                        * routes to one job is how they come to disagree about what an editor is.
                        *
                        * ⚠️ AND IT COMMITS AS IT GOES. There is no Done and no Save: the stepper,
                        * the unit pills and the free-text field each write on change, and closing is
                        * closing. The old sheet's black DONE existed because it did NOT commit as
                        * you went; with that fixed the button had no job.
                        */}
                      {matPop && (() => {
                        const pbase = baseMaterialsFor(activeQuery, activeAgent);
                        const pref = agentSamplePref(activeAgent);
                        const eyebrow = matPop === "ql" ? materialLabel("Query letter") : matPop === "syn" ? "Synopsis" : matPop === "oth" ? "Other" : "Opening sample";
                        const removeThis = () => {
                          if (matPop === "smp") removeSampleMaterial(activeQuery, activeAgent);
                          else if (matPop === "oth" && otherEditing != null) removeOtherMaterial(activeQuery, activeAgent, otherEditing);
                          else if (matPop === "ql" ? pbase.some(isQueryLetterMat) : pbase.some(isSynopsisMat)) {
                            toggleDocMaterial(activeQuery, activeAgent, matPop === "ql" ? "query" : "synopsis");
                          }
                          closeMatPop();
                        };
                        return (
                        <F12Panel open eyebrow={eyebrow} style={matPopStyle} panelRef={matPopPanelRef} onClose={closeMatPop}>
                          {matPop === "smp" && (
                            <>
                              {/* ⚠️ THE STEPPER TAKES TYPED DIGITS AND ARROW KEYS, and each change
                                  commits. The unit SNAPS to its own default rather than converting
                                  3 chapters into 3 pages, and the step is `stepAmount`'s — 1
                                  chapter, 5 pages, 500 words. */}
                              <div className="f12-panel-row">
                                <span>Quantity</span>
                                <span className="f12-step">
                                  <button type="button" aria-label={`Down one step of ${sampleUnit.toLowerCase()}`}
                                    onClick={() => { const v = stepAmount(sampleQty, sampleUnit, -1); setSampleQty(v); commitSample(v, sampleUnit); }}>−</button>
                                  <input type="text" inputMode="numeric" value={sampleQty} aria-label="Quantity"
                                    onChange={(e) => { setSampleQty(e.target.value); commitSample(e.target.value, sampleUnit); }}
                                    onKeyDown={(e) => {
                                      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
                                      e.preventDefault();
                                      const v = stepAmount(sampleQty, sampleUnit, e.key === "ArrowUp" ? 1 : -1);
                                      setSampleQty(v); commitSample(v, sampleUnit);
                                    }} />
                                  <button type="button" aria-label={`Up one step of ${sampleUnit.toLowerCase()}`}
                                    onClick={() => { const v = stepAmount(sampleQty, sampleUnit, 1); setSampleQty(v); commitSample(v, sampleUnit); }}>+</button>
                                </span>
                              </div>
                              <div className="f12-units" role="group" aria-label="Sample unit">
                                {SAMPLE_UNITS.map((u) => (
                                  <button key={u} type="button" aria-pressed={sampleUnit === u} className={sampleUnit === u ? "on" : undefined}
                                    onClick={() => { const v = snapToUnit(u); setSampleUnit(u); setSampleQty(v); commitSample(v, u); }}>{u.toLowerCase()}</button>
                                ))}
                              </div>
                              {/* ⚠️ ONLY WHEN THE AGENT HAS ONE. A hint line for an agency that has
                                  stated nothing would invent a request. */}
                              {pref && (
                                <div className="f12-panel-hint">
                                  {activeAgent.agency?.trim() || agentPrimary(activeAgent)} ask for {pref.qty} {pref.unit.toLowerCase()}
                                </div>
                              )}
                            </>
                          )}
                          {matPop === "oth" && otherEditing != null && (
                            <div className="f12-panel-free">
                              <input
                                type="text"
                                autoFocus
                                value={otherText}
                                placeholder="What did you send?"
                                aria-label="Other material"
                                onChange={(e) => { setOtherText(e.target.value); saveOtherEdit(activeQuery, activeAgent, otherEditing, e.target.value); }}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); closeMatPop(); } }}
                              />
                            </div>
                          )}
                          <div className="f12-panel-sep" />
                          {/* ⚠️ THE SAME REMOVAL PATH AS THE HOVER ×, and quiet burgundy text rather
                              than a button: the two must not look like different amounts of
                              decision. It closes the panel and raises the undo toast. */}
                          <button type="button" className="f12-panel-rm" onClick={removeThis}>Remove from this send</button>
                        </F12Panel>
                        );
                      })()}
                    </div>
                  );
                })()}

                {/**
                  * ⚠️ TWO COLUMNS, NOT THREE (§2, ref 95-tracking-half.html at "Tracking slightly
                  * wider"). Tracking is the only card with a STORY; the other two are inventories.
                  * Equal thirds flattered the short cards and starved the long one — and that is the
                  * reason worth keeping, because a later pass looking only at the widths would read
                  * `1.15fr .85fr` as an arbitrary tuning.
                  *
                  * ⚠️ THE EQUALISATION CHANGES SHAPE WITH THE GRID. It used to come from three
                  * siblings sharing a row under `align-items: stretch`; the right column is a STACK
                  * now, so it has to come from that stack filling its own column. Browser-measured
                  * at three widths — a stacked card trailing into white is the failure this replaces.
                  */}
                {/* ⚠️ THE TWO TERMS AFTER `60%` ARE BOTH DERIVED, AND NEITHER IS A NUDGE (§3 + §4).
                    `- 9.6px` is the column gap's share: 60% of the PANE overshoots 60% of the space
                    the two columns actually divide by 0.6 × 16px, so the ratio is exact rather than
                    approximately right. `- reclaim × 0.2` is what makes the expansion EQUAL: the
                    pane receives two thirds of the reclaim, and 60% of two thirds is 1.2 shares —
                    so a fifth of one share comes back off to leave each column with exactly one.
                    Take either term away and the split still looks fine; it is simply no longer the
                    thing it claims to be.

                    ⚠️ 60/40 (§3), REPLACING `--listw` ON THE RIGHT COLUMN — and that supersedes the
                    alignment amendment's "the two narrow columns are one figure". That rule was
                    real and its reason was good: `1.15fr .85fr` made the pane's narrow column a
                    proportion of whatever was left, so it measured 245 against the list's 334 and
                    the two never lined up. Pinning it to `--listw` fixed that by making them the
                    same width. The ratio is now specified directly instead, so the stack is 40% of
                    the pane rather than the list's twin — a stated proportion, at every viewport,
                    which is what the amendment was reaching for by another route.

                    ⚠️ AND NO SIDE PADDING. It carried `16px 20px 20px`, which inset the cards from
                    the pane column's own edges — the same fault as the hero's margin, and the
                    reason content sat 20px from the right wall while the list sat hard against the
                    left. The top 16 stays: it is the CARD GAP between the header plate and the
                    cards, the same 16 the grid uses between them. The bottom is the work area's,
                    paid once by the row. */}
                <div className="qp-cols" style={{ display: "grid", gridTemplateColumns: "calc(60% - 9.6px - var(--qc-reclaim) * 0.2) minmax(0, 1fr)", gap: 16, padding: 0, flex: 1, minHeight: 0, alignItems: "stretch" }}>

                  {/* ── Sub-card 1: Tracking ── */}
                  <PaneCard
                    title="Tracking"
                    /* ⚠️ THE META IS THE STATUS, FROM THE ONE DERIVATION. `statusDisplayLabel` is what
                       the hero band's badge reads, so the band and the card cannot disagree about
                       what state this query is in. */
                    meta={statusDisplayLabel(activeQuery)}
                    /* ⚠️ §5 · THE TASKS CONTROL HAS LEFT THIS HEADER for the command bar, where the
                       query's other verbs are. A count in a card's band read as part of the card's
                       subject — Tracking is about where the query stands over TIME — while what it
                       actually offered was an action on the query as a whole.

                       ⚠️ AND IT WAS DEAD. `setIsTasksOpen(true)` had no listener: `TasksPopover` was
                       imported and never mounted, so "1 TASK" opened nothing at all. Reported rather
                       than quietly fixed in passing — the control is rebuilt in the bar WITH its
                       surface this time. */
                    glyph={<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h4l3 8 4-16 3 8h4" /></svg>}
                  >
                      {/* ⚠️ §4 · THE SCROLLER IS HELD CLEAR OF THE BAND. Its content began flush
                          against the sage header — browser-measured, the scroller's top edge and the
                          band's bottom at the same y — so the first thing under the header read as
                          sliced into it. The clearance is a CLASS rather than an inline padding
                          because it belongs with the events' `scroll-margin-top`, which has to be
                          the same figure: one holds the rest position, the other holds an anchored
                          scroll, and they are the same distance. */}
                      <PaneScroll scrollClassName="f12-quiet-scroll qc-trackscroll" outerStyle={{ flex: 1, minHeight: 0 }} scrollStyle={{ padding: "0 0 18px" }}>
                        {/**
                          * ⚠️ THE TWO STATS LEAD THE BODY (§2), in the comps page's grammar: icon
                          * plate, Playfair number, mono caption, one hairline between them.
                          *
                          * ⚠️ THEY ARE THE LIVE PAIR, AND THE HERO BAND HAS THE STATIC ONE. The band
                          * states the queried date; these two move, and they are the numbers the
                          * progress bar below reads against — so all three of them stay in one place
                          * rather than being split across two surfaces that would then restate each
                          * other.
                          *
                          * ⚠️ FROM `queryAmbientStatus`, THE SAME DERIVATION THE COMMAND BAR AND THE
                          * TRACKING BLOCK READ. A second count of "days waiting" on this page is a
                          * second answer to one question.
                          *
                          * Each cell omits itself when its figure is underivable — an undated import
                          * has no days and no expected date, and a dash against a caption states
                          * nothing while taking a line to do it.
                          */}
                        {(() => {
                          const ta0 = getPrimaryAction(activeQuery.status as QueryStatus);
                          /* §7 — the agent's stated window wins over the house one, so this pane's two figures and the
                             list's position figure count to the same instant. See queryAmbient's note. */
                          const amb = queryAmbientStatus(activeQuery, ta0.ballHolder, ta0.kind === "mark-sent" ? ta0.markKind : undefined, Date.now(), activeAgent.responseTimeWeeks);
                          /**
                           * ⚠️ THE CELLS ARE A PURE DERIVATION (§2) — `trackingStatCells`, beside
                           * the ambient status it reads. They were built inline here, which made
                           * the "Not set" branch untestable: the browser measure that proves the
                           * strip's SHAPE can only exercise the records the account holds, and every
                           * query on dev has an expected date, so that branch measured green by
                           * never running.
                           *
                           * ⚠️ THE GLYPH STAYS HERE, deliberately. A lib returning JSX is a lib a
                           * node-environment test cannot call — which is the whole reason the
                           * derivation moved.
                           */
                          const STAT_GLYPH: Record<string, React.ReactNode> = {
                            waiting: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>,
                            expected: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3.5v3M16 3.5v3" /></svg>,
                          };
                          const cells = trackingStatCells(amb);
                          if (!cells.length) return null;
                          return (
                            <div className="qp-stats">
                              {cells.map((c) => (
                                /**
                                 * ⚠️ §6 · THE CELL IS THE CONTROL. Both figures read `Not set` and did
                                 * nothing — an empty state offered as a label, with the only way to
                                 * fill it three clicks away in a drawer. `Not set` is what the field
                                 * says when it is empty, not what the field is called.
                                 *
                                 * ⚠️ A REAL BUTTON, so it is in the tab order and answers Enter and
                                 * Space without a keydown handler of ours. The hover affordance is
                                 * the cell's own (`.qp-stat` gains one), because the thing being
                                 * offered is the whole cell rather than a pencil beside it.
                                 */
                                <button
                                  type="button"
                                  className="qp-stat qp-stat--edit"
                                  key={c.key}
                                  title={c.key === "waiting" ? "Change the date this was sent" : "Change when a reply is expected"}
                                  onClick={(e) => {
                                    const which = c.key === "waiting" ? "sent" : "expected";
                                    (dateTrigRef as React.MutableRefObject<HTMLElement | null>).current = e.currentTarget;
                                    setDateDraft(toDateInputValue(which === "sent" ? activeQuery.dateSent : writerExpectedIso(activeQuery)));
                                    setDateEdit(which);
                                  }}
                                >
                                  <span className="qp-statgl" aria-hidden="true">{STAT_GLYPH[c.key]}</span>
                                  <div>
                                    {/* ⚠️ THE ABSENT FIGURE IS QUIETER THAN A REAL ONE (§2). "Not
                                        set" at 25px Playfair would give an unrecorded field more
                                        weight than a recorded one — the skeleton is there so the
                                        card keeps its shape, not so that absence shouts. */}
                                    <div className={`qp-statn${c.absent ? " qp-statn--off" : ""}`}>{c.value}{c.unit && <small> {c.unit}</small>}</div>
                                    <div className="qp-statk">{c.caption}</div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          );
                        })()}
                        <div style={{ padding: "0 16px" }}>
                        {(() => {
                          // Pass the same open-state fact the command bar uses, so the trailing block
                          // switches agent's-turn / writer's-turn / closed identically.
                          const ta = getPrimaryAction(activeQuery.status as QueryStatus);
                          return (
                            <QueryTimeline
                              query={activeQuery}
                              agent={activeAgent}
                              events={trackingEvents}
                              primaryAction={{ ballHolder: ta.ballHolder, markKind: ta.kind === "mark-sent" ? ta.markKind : undefined }}
                              /* ⚠️ CORRECTION IS UNREACHABLE UNTIL IT HAS ITS OWN HOME. The editor
                                  lived inside the inline composer this section removed, so there is
                                  nothing to hand an entry to. Omitted rather than wired to a ref
                                  that is always null — the menu item now hides itself. */
                              /**
                               * ⚠️ THE SEND'S MATERIALS HANG OFF THE SEND (§1/§2 layout half). They
                               * were on the header card, which describes the QUERY — so a
                               * resubmission had nowhere to say what went with it, and the card
                               * claimed one set of materials for a record that may have several
                               * sends. Under the `Query sent` rung they belong to the event that
                               * carries them.
                               *
                               * ⚠️ THE DATA IS UNCHANGED AND STILL THE QUERY'S. §2's migration —
                               * moving `materialsWanted` onto the activities — is gated on Nick's
                               * confirmation and is NOT done here; this reads exactly what it read
                               * before, from `baseMaterialsFor`. Moving the UI without the data
                               * keeps every write working while the model question is open, and it
                               * is what stops §1 stranding the editors with nothing to open them.
                               */
                              sentExtra={(() => {
                                /**
                                 * ⚠️ THE AGENT'S EXPECTED SET IS GUIDANCE, NOT A RECORD (D6/D7) — and
                                 * rendering it beside an attachment is the original complaint's
                                 * cause. `baseMaterialsFor` falls back to the AGENT's
                                 * `materialsWanted` whenever the query's own list is empty, which is
                                 * exactly the state a linked query is in: `materialsLinkWrites`
                                 * clears the list when it writes the link. So the pane drew the
                                 * agency's asks as pink chips above the package, and they read as a
                                 * second thing that was sent.
                                 *
                                 * ⚠️ THE FALLBACK IS KEPT WHERE IT EARNS ITS PLACE. With no
                                 * attachment it answers a real question — what does this agency ask
                                 * for — and the first edit promotes that set onto the query, which is
                                 * why the WRITERS still read `baseMaterialsFor` unchanged. Only the
                                 * RENDER suppresses it, and only when something is already attached.
                                 */
                                const attachedHere = !!activeQuery.packageId;
                                const base = attachedHere ? [] : baseMaterialsFor(activeQuery, activeAgent);
                                const qlSent = base.some(isQueryLetterMat);
                                const synSent = base.some(isSynopsisMat);
                                const sampleItem = base.find(isSampleMat) ?? null;
                                const otherItems = base.filter(isOtherMat);
                                const linkedPackage = (activeQuery.packageId ? packages.find(p => p.id === activeQuery.packageId) : null) ?? null;
                                /**
                                 * ⚠️ A POINTER THAT RESOLVES TO NOTHING IS NOT AN ATTACHMENT (F-AD, D2).
                                 * `packageId` truthy suppressed the fallback AND the fork, while
                                 * `linkedPackage` null drew no strip — so the whole "what went with this
                                 * query" section rendered BLANK: no strip, no loose row, no fork, no
                                 * message. Measured on a planted id: `strip 0 · loose 0 · fork 0`, the one
                                 * anomaly in 45 rows.
                                 *
                                 * ⚠️ AND BLANK IS THE WORST OF THE THREE OUTCOMES. A wrong message gets
                                 * reported; a blank section gets read as "nothing to see", and the writer
                                 * is not even offered the chance to say what they sent.
                                 *
                                 * ⚠️ THE FALLBACK STAYS SUPPRESSED HERE, DELIBERATELY. On an unattached
                                 * query the agent's expected materials are useful — they say what this
                                 * agency asks for. Beside a broken pointer they would be a guess wearing
                                 * the shape of a record: this query WAS sent with something, and what the
                                 * agency usually asks for is not evidence of what went.
                                 */
                                const danglingLink = !!activeQuery.packageId && !linkedPackage;
                                /* ⚠️ `pkgComponents` IS GONE WITH THE TOOLTIP IT FILLED (D-D5). It
                                   mapped the package's three slots to their CANONICAL TYPE NAMES —
                                   `Covering letter · Synopsis · Sample pages` — for a `title`
                                   attribute, which is exactly the leak: the type of each slot
                                   rather than the material in it, and only on hover. `linkedChips`
                                   resolves the real names onto the strip instead. */
                                const isPro = currentUser?.plan === UserPlan.PRO;
                                const openPackages = () => onNavigate?.("manuscripts", "Submission packages");
                                /* §2 — this manuscript's live packages; retired ones are not offered */
                                const attachablePkgs = attachablePackages(packages, activeQuery.manuscriptId);
                                const materialsOf = (q: Query) => ((q.materialsWanted ?? []) as (string | QueryMaterial)[]);
                                /**
                                 * ⚠️ ONE DERIVATION, READ TWICE. The strip below draws these groups
                                 * and the Attach menu offers to remove them; computing
                                 * `groupByOrigin` separately in each place would let the two come to
                                 * disagree about what the send is carrying — a menu offering to
                                 * remove a package no strip shows, or a strip with no way off it.
                                 */
                                const { groups: sentGroups } = groupByOrigin(materialsOf(activeQuery));
                                /* ⚠️ AFTER `materialsOf`, DELIBERATELY. Declared above it this is a
                                   temporal-dead-zone read — tsc catches THIS shape because the
                                   reference shares the declaration's scope, but the same mistake one
                                   helper deeper typechecks clean and throws at runtime. */
                                const openOtherEditor = (item: string | QueryMaterial, el: HTMLElement) => {
                                  setOtherEditing(item);
                                  setOtherText(sampleMaterialText(item));
                                  openMatPop("oth", el);
                                };
                                const openSampleEditor = () => {
                                  const stored = sampleItem && typeof sampleItem !== "string" ? sampleItem.type : undefined;
                                  const unit: SampleUnit = stored === "chapters" ? "Chapters" : stored === "words" ? "Words" : "Pages";
                                  setSampleUnit(unit);
                                  const qty = sampleItem && typeof sampleItem !== "string" && sampleItem.quantity != null ? String(sampleItem.quantity) : "";
                                  setSampleQty(qty || snapToUnit(unit));
                                };
                                /**
                                 * ══ §2 · A PILL EXISTS ONLY IF THAT MATERIAL WENT WITH THE SEND ══
                                 *
                                 * ⚠️ THE NOT-YET-SENT STATE IS RETIRED ENTIRELY. Every material had
                                 * a pill whether or not it had been sent, distinguished by a `○`
                                 * against a `✓` and a muted ink — a ghost, which is the app
                                 * remembering something that did not happen. A material that has
                                 * not been sent is simply not attached, so there is no flag on
                                 * `QueryMaterial` and no rules change: the absence IS the state.
                                 *
                                 * ⚠️ AND THE TICK GOES WITH IT. Every rendered pill is attached
                                 * now, so a ✓ on all of them states the one thing they all share.
                                 *
                                 * ⚠️ REMOVAL IS IMMEDIATE, AND THE UNDO IS WHAT MAKES THAT SAFE —
                                 * `writeMaterials` already shows the toast with the prior value.
                                 */
                                /* ⚠️ NO QUANTITY SLOT (§2b). The renderer used to take a `qty` and draw
                                   it as a second, mono chip inside the pill — `Opening sample · 3
                                   chapters`. The sample now NAMES itself from that same size, so the
                                   badge would restate the amount beside the words carrying it, and a
                                   pill holding a pill was the busiest thing in the row. */
                                /**
                                 * ⚠️ `extra` IS FOR A MARK THAT BELONGS TO THE MATERIAL, not to the
                                 * send (Part E, D5). Only the sample takes one today — the version
                                 * it excerpts, inherited through the package. A letter or a synopsis
                                 * does not excerpt an ordering of the book, so nothing passes one.
                                 */
                                const attach = (key: string, label: string, onClick: (el: HTMLElement) => void, title: string, onRemove: () => void, extra?: React.ReactNode) => (
                                  <button key={key} type="button" className="qc-mchip qc-mchip-att" onClick={(e) => onClick(e.currentTarget)} title={title}>
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5 12.5 20a5 5 0 0 1-7-7l8-8a3.5 3.5 0 0 1 5 5l-8 8a2 2 0 0 1-3-3l7.5-7.5" /></svg>
                                    <span className="qc-mchiptx">{label}</span>
                                    {extra}
                                    <span role="button" tabIndex={0} className="qc-mchipx"
                                      aria-label={`Remove ${label} from this send`} title={`Remove ${label}`}
                                      onClick={(e) => { e.stopPropagation(); onRemove(); }}
                                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onRemove(); } }}
                                    >×</span>
                                  </button>
                                );
                                return (
                                  <div className="qc-sentmat">
                                    {/* ⚠️ THE MANUSCRIPT IS THE SEND'S SUBJECT, and a link — the one
                                        thing here that navigates. Ink coloured, no underline at rest,
                                        underlined on hover and focus; 1.35 line-height with a pixel
                                        of bottom padding, because Playfair's descenders clip at
                                        tighter values and an underline makes it worse. */}
                                    {/**
                                      * ⚠️ §2 · THE MANUSCRIPT IS BODY CONTENT, NOT A HEADLINE. It
                                      * rendered at 19px against a 14px event title, so the thing
                                      * inside row 2 outweighed the event it belongs to. Its size is
                                      * `--tl-mst`, DERIVED from `--tl-title` rather than stated
                                      * beside it: two independent numbers can be put in the wrong
                                      * order by anyone tuning either, and a `calc` cannot.
                                      *
                                      * ⚠️ GENRE AND WORD COUNT ARE GONE. They describe the
                                      * manuscript, not this send — and they are already on the page,
                                      * so repeating them here made a send event carry facts that do
                                      * not change when the send does.
                                      *
                                      * ⚠️ THE LINK BEHAVIOUR IS UNTOUCHED: ink, no underline at
                                      * rest, underlined on hover AND focus, keyboard-reachable.
                                      */}
                                    <div className="qc-sentms">
                                      <svg className="qc-sentbk" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z" /><path d="M5 17h14" /></svg>
                                      {onNavigate ? (
                                        <button type="button" className="qc-mname qc-mname--ms" onClick={() => onNavigate("manuscripts")} title="Open your manuscripts">{activeMs.title}</button>
                                      ) : <span className="qc-mname qc-mname--ms">{activeMs.title}</span>}
                                    </div>
  <div className="qc-msub">
                                {/* ⚠️ THE CHIP OPENS ITS OWN POPOVER (§5) rather than toggling on click. A single click that
                                     silently flipped "sent" gave one control two of the three things a
                                     material can have done to it and no way to reach the third. */}
                                {(() => {
                                /**
                                 * ══ §1 · THE PACKAGE GROUP (ref 177, left panel) ══════════════════
                                 *
                                 * ⚠️ THE PILLS ARE THE SAME PILLS. Every one below is built by the
                                 * same `attach()` helper whether it lands inside a group or beneath
                                 * one — same markup, same editor, same ×. That is the whole content
                                 * of "snapshot, not reference": an item that came from a template is
                                 * an ordinary material, and removing one cannot break a package
                                 * because there is no container in the data to break. It only means
                                 * the send no longer matches the template, which is state 1.
                                 *
                                 * ⚠️ THE GROUP IS PRESENTATION OVER STORED ORIGIN. `materialsWanted`
                                 * stays one flat list; `groupByOrigin` reads the marks each item
                                 * already carries. Nothing here is a nested structure.
                                 */
                                const pills: { material: string; node: React.ReactNode }[] = [];
                                if (qlSent) pills.push({ material: "Query Letter", node: attach("ql", materialLabel("Query letter"), (el) => openMatPop("ql", el), materialLabel("Query letter"), () => toggleDocMaterial(activeQuery, activeAgent, "query")) });
                                if (synSent) pills.push({ material: "Synopsis", node: attach("syn", "Synopsis", (el) => openMatPop("syn", el), "Synopsis", () => toggleDocMaterial(activeQuery, activeAgent, "synopsis")) });
                                /**
                                 * ⚠️ THE SAMPLE CARRIES THE VERSION CHIP (Part E, D5), DERIVED
                                 * THROUGH THE PACKAGE'S SAMPLE — nothing about it is stored on the
                                 * query. `openingRead` returns null when there is no package, when
                                 * its sample slot is empty, or when that sample carries no version,
                                 * so the chip appears exactly where there is a fact to state.
                                 *
                                 * ⚠️ AND IT IS THE SAME `.pkgb-mver` CHIP the packages page and the
                                 * manuscripts panel draw. One mark for one object, wherever it
                                 * appears — a second treatment would teach two vocabularies for one
                                 * thing.
                                 */
                                if (sampleItem) pills.push({ material: "Sample Pages", node: attach("smp", formatQueryMaterial(sampleItem), (el) => { openSampleEditor(); openMatPop("smp", el); }, "Opening sample", () => removeSampleMaterial(activeQuery, activeAgent)) });
                                otherItems.forEach((it, i) => pills.push({
                                  material: materialName(it),
                                  node: attach(`oth-${i}`, formatQueryMaterial(it), (el) => openOtherEditor(it, el), formatQueryMaterial(it), () => removeOtherMaterial(activeQuery, activeAgent, it)),
                                }));

                                const groups = sentGroups;
                                const claimed = new Set(groups.flatMap((g) => g.materials));
                                const loose = pills.filter((p) => !claimed.has(p.material));
                                const take = (names: string[]) => pills.filter((p) => names.includes(p.material)).map((p) => p.node);

                                return (
                                  <>
                                    {groups.map((g) => (
                                      <PackageGroup
                                        key={g.packageId}
                                        group={g}
                                        live={packages.find((p) => p.id === g.packageId) ?? null}
                                        sent={materialsOf(activeQuery)}
                                        sentDate={activeQuery.dateSent}
                                        /* ⚠️ DERIVED, NOT STORED (Part B). The portion is the
                                           sample-and-other members of this query's own
                                           `materialsWanted` — the field this file already describes
                                           as "the record of what was sent". A second field beside
                                           it would have been two answers to one question. */
                                        portion={queryPortion(activeQuery, activeAgent)}
                                        onView={openPackages}
                                      >
                                        {take(g.materials)}
                                      </PackageGroup>
                                    ))}
                                    {/**
                                      * ⚠️ ANYTHING ATTACHED OUTSIDE A PACKAGE SITS BELOW IT — the
                                      * group is a statement about provenance, and a hand-added item
                                      * has none.
                                      *
                                      * ⚠️ AND IT IS NOT A CONTAINER (Part C, D-C3). `LooseMaterials`
                                      * draws a sheets plate and the chips directly on the pane, with
                                      * no border, fill or slug. Lighter than the packaged strip,
                                      * never lesser than it — a package is a convenience, not a
                                      * status, so boxing the loose case would say the wrong thing
                                      * about every send an agent named the materials for.
                                      */}
                                    {/**
                                      * ⚠️ ONE QUESTION, TWO ANSWERS, MUTUALLY EXCLUSIVE (D9). Neither
                                      * is the default and neither is dressed as the better choice —
                                      * a package is a convenience, not a status, and a writer with
                                      * three saved materials and no package has not done anything
                                      * wrong.
                                      *
                                      * ⚠️ IT ASKS ONCE. The fork appears only while the query carries
                                      * nothing; the moment either branch is taken it is replaced by
                                      * that branch's own surface, which then carries the way back.
                                      */}
                                    {/**
                                      * ⚠️ THE MESSAGE COMES BEFORE THE QUESTION, because it is the reason
                                      * the question is being asked. It states the fact and nothing else —
                                      * no blame, no alarm, no instruction — and the fork beneath it is the
                                      * "here is what you can do". Both of its branches heal the pointer:
                                      * attaching writes a new link, listing materials clears the old one.
                                      */}
                                    {danglingLink && (
                                      <p className="qc-gonelink">
                                        The package this query pointed at is no longer on file, so what went
                                        with it isn’t recorded here.
                                      </p>
                                    )}
                                    {!linkedPackage && loose.length === 0 && (
                                      <div className="qc-fork">
                                        <span className="qc-fork-q">What went with this query?</span>
                                        <span className="qc-fork-c">
                                          <button type="button" className="qc-forkbtn qc-forkbtn--pkg"
                                            onClick={() => {
                                                      (pkgPickTrigRef as React.MutableRefObject<HTMLElement | null>).current = addMatTrigRef.current;
                                              setPkgPickOpen(true);
                                            }}
                                            disabled={attachablePkgs.length === 0}
                                            title={attachablePkgs.length === 0 ? "Build a package on the Submission packages page first" : "Attach a submission package to this query"}
                                          >Attach a package</button>
                                          <button type="button" className="qc-forkbtn"
                                            onClick={() => { addMatTrigRef.current?.click(); }}
                                            title="List the materials that went with this query"
                                          >List materials</button>
                                        </span>
                                      </div>
                                    )}
                                    {loose.length > 0 && (
                                      <LooseMaterials>
                                        {loose.map((p) => p.node)}
                                      </LooseMaterials>
                                    )}
                                  </>
                                );
                                })()}

                                {/* ⚠️ THE SAMPLE CHIP OPENS ITS EDITOR RATHER THAN TOGGLING, because a
                                    sample is a quantity and a unit, not a yes. Its label carries what
                                    was sent; Remove keeps its own control, since a chip that both
                                    edits and clears on one click could not do either. */}
                                {/* ⚠️ §2b · THE SAMPLE NAMES ITSELF FROM ITS OWN SIZE — `First 3 chapters`,
                                      not `Opening sample` beside a badge reading `3 chapters`. The
                                      label is DERIVED at render through `formatQueryMaterial`, the
                                      module that is already the app's only material formatter, so
                                      nothing new is stored: the artefact keeps one `ComponentType`
                                      for all three units and the unit lives in the item.
                                      ⚠️ `Opening sample` REMAINS THE NAME IN THE ATTACH MENU, and
                                      that is not an inconsistency — the menu offers a type you have
                                      not sized yet, and the pill states a thing you sent. */}
                                  {/* (the sample's pill is built in the block above, so it can be
                                       placed inside its package's group or beneath it) */}
                                {/* ⚠️ AND `Other` OPENS ITS EDITOR TOO (§2) — free text rather than a
                                    quantity. It was the one pill that could only be removed, so a
                                    typo in it meant deleting and retyping. Same renderer as the
                                    rest, so its × and its hover cannot drift from theirs. */}
                                {/* (Other's pills are built in the block above, for the same reason) */}
                                {/* ⚠️ THE FLOATING `REMOVE` IS GONE (§4) — it now lives on the chip
                                    it removes. A verb parked at the end of a row of chips has no
                                    visible subject; this one silently meant "the sample". */}
                                {/* ⚠️ THE PACKAGE SURVIVES AS A CHIP. It is not among §1's named
                                    removals, and a Pro attachment is a record of what was sent —
                                    which is exactly what this sub-row lists. */}
                                {/**
                                  * ⚠️ D-D5 — A LINKED PACKAGE SHOWS ITS ACTUAL MATERIALS, and until
                                  * now it showed NONE. This rendered a single chip carrying the
                                  * package's NAME, with the canonical type strings
                                  * (`Covering letter · Synopsis · Sample pages`) hidden in a
                                  * `title` tooltip. So a writer could not see what went without
                                  * hovering, and what they saw when they did was the type of each
                                  * slot rather than the material in it.
                                  *
                                  * ⚠️ LIVE RESOLUTION IS SAFE HERE BECAUSE OF THE LOCK. The strip
                                  * reads the package's CURRENT contents, which cannot change once it
                                  * has been sent — that is what D-D1 buys, and it is why there is no
                                  * snapshot to keep in step.
                                  */}
                                {linkedPackage ? (
                                  <PackageGroup
                                    group={{ packageId: linkedPackage.id, packageName: linkedPackage.packageName, materials: [] }}
                                    live={linkedPackage}
                                    sent={[]}
                                    sentDate={activeQuery.dateSent}
                                    portion={queryPortion(activeQuery, activeAgent)}
                                    onView={openPackages}
                                    onChangePackage={() => {
                                      (pkgPickTrigRef as React.MutableRefObject<HTMLElement | null>).current = addMatTrigRef.current;
                                      setPkgPickOpen(true);
                                    }}
                                    onRemovePackage={() => void removeQueryPackage(activeQuery, linkedPackage.packageName)}
                                  >
                                    {linkedChips(linkedPackage, versions, activeBookVersions).map((c) => (
                                      <span key={c.key} className={`qc-mchip qc-mchip-slot${c.missing ? " qc-mchip-gone" : ""}`}>
                                        <span className="qc-mchipeye">{c.eyebrow}</span>
                                        <span className="qc-mchiptx">{c.name}</span>
                                        {/**
                                          * ⚠️ THE VERSION CHIP GOES ON THE SLOT PILL (Part E, D5),
                                          * and the first attempt put it on the WRONG BUILDER. The
                                          * strip's pills are `qc-mchip-slot`, built from the
                                          * PACKAGE's contents by `linkedChips`; `attach()` builds
                                          * `qc-mchip-att` from the query's own `materialsWanted`
                                          * and does not run for a packaged send — which is exactly
                                          * the case D5 is about. It rendered nothing, and a
                                          * measurement asserting "at most one chip" passed on zero.
                                          */}
                                        {/* ⚠️ THE VERSION IS ITS OWN PILL NOW, not a mark hung off
                                            another one. It used to be inherited through the sample
                                            material — the only thing that knew — and both halves of
                                            that have gone: the package states its version directly
                                            (D1) and sample pages is no longer a material (D9). So
                                            `linkedChips` returns it as the third slot and it
                                            renders like the other two, with no special case here. */}
                                      </span>
                                    ))}
                                  </PackageGroup>
                                ) : null}
                                {/**
                                * ⚠️ THE TWO DERIVED LINES SIT WITH WHAT WENT OUT (Part E, D7).
                                * They are statements about the package and the log — the sent
                                * strip immediately above is the rest of that story, and putting
                                * them among the query's own stat cells would file a fact about
                                * the PACKAGE under the query's identity.
                                */}
                                <VersionLines
                                query={activeQuery}
                                packages={packages}
                                materials={versions}
                                activities={activities}
                                bookVersions={activeBookVersions}
                                />
                                {/* ══ §5 · + ATTACH ═══════════════════════════════════════════════
                                    ⚠️ ALREADY-ADDED TYPES STAY IN THE MENU, MARKED `Added`. The menu
                                    is a complete statement of what a query CAN carry; hiding what is
                                    already on it would make the list shorter every time you used it,
                                    and leave you unable to see that a type exists at all.
                                    ⚠️ AND THE PACKAGE MOVES IN HERE, BELOW A RULE. The row's
                                    `UPGRADE TO ATTACH A PACKAGE` was a pitch parked among facts; as
                                    the last item of "what you could attach" it is one more thing you
                                    could attach, which is what it actually is. */}
                                {/**
                                  * ⚠️ NO `+ Attach` ON A PACKAGED QUERY (D11). A query holds a package
                                  * OR its own list, never both — and a control that can only produce
                                  * the forbidden state is an invitation to a write the model then has
                                  * to undo. The package's contents are changed on the package;
                                  * WHICH package this query used is changed on the strip's footer.
                                  *
                                  * ⚠️ IT IS ABSENT, NOT DISABLED. A greyed control here would pose a
                                  * question the writer cannot act on and cannot see the answer to.
                                  */}
                                {/**
                                  * ⚠️ NOT IN THE FORK'S STATE EITHER (D10). The fork already asks the
                                  * whole question — `Attach a package` / `List materials` — and this
                                  * control is one of those two answers a second time, three inches
                                  * below, in different words. `loose.length > 0` is the state where
                                  * it earns its place: materials are listed and adding another is a
                                  * real thing to want.
                                  *
                                  * ⚠️ THE TRIGGER REF STILL EXISTS IN BOTH STATES, deliberately — the
                                  * fork's `List materials` clicks it to open this very menu, so the
                                  * button renders hidden rather than not at all.
                                  */}
                                {!attachedHere && (() => {
                                  /* ⚠️ ONE DERIVATION, READ ONCE AND RENDERED NEVER. The fork draws
                                     when this query has nothing listed, and this control is the
                                     fork's own second answer in that state — so it hides then. The
                                     LENGTH is a branch, not a figure: `queryCentreChassis` forbids
                                     a materials COUNT over rows the reader can already see, and
                                     that law is about printing a number, which this does not. */
                                  const forkShowing = baseMaterialsFor(activeQuery, activeAgent).length === 0;
                                  return (
                                <span className={`f12-popwrap${forkShowing ? " qc-addmat-quiet" : ""}`}>
                                  <button
                                    ref={addMatTrigRef}
                                    type="button"
                                    className="qc-mchip qc-mchip-add"
                                    aria-haspopup="menu"
                                    aria-expanded={addMatOpen}
                                    onClick={() => setAddMatOpen((o) => !o)}
                                  >＋ Attach</button>
                                  <F12Menu
                                    open={addMatOpen}
                                    onClose={() => { setAddMatOpen(false); addMatTrigRef.current?.focus(); }}
                                    style={addMatMenuStyle}
                                    panelRef={addMatPanelRef}
                                    ariaLabel="Add to this query"
                                    items={[
                                      ...MATERIAL_MENU.map((m) => {
                                        const on = m.added(qlSent, synSent, !!sampleItem, otherItems.length > 0);
                                        return {
                                          label: m.label,
                                          /* ⚠️ `ATTACHED` IS A HINT, NOT PART OF THE LABEL. As a suffix it
                                             read as a different material ("Synopsis · Attached"); in the
                                             hint column it is the row's state, where `→ SIZE` and
                                             `FREE TEXT` say what the others will do. */
                                          hint: on ? "ATTACHED" : m.hint,
                                          disabled: on,
                                          /* ⚠️ THE ANCHOR IS THE ATTACH BUTTON ITSELF — the editor that
                                             opens next has to hang off something on screen, and the menu
                                             row is gone by the time it does. */
                                          onClick: () => { setAddMatOpen(false); if (addMatTrigRef.current) m.add(addMatTrigRef.current); },
                                        };
                                      }),
                                      /* ⚠️ THE PACKAGE ROW SITS BELOW A RULE AND IS NOT A FIFTH
                                         MATERIAL TYPE (§2). The four above are things you attach one
                                         OF; this fills the row above wholesale. The divider is what
                                         says so, and it goes only when the row does.
                                         ⚠️ AND IT NO LONGER SELLS ANYTHING (§3). It read
                                         `· Pro` and sent a Free user to the plans page; beta grants
                                         everyone Pro, and the free plan shows no ceilings here. The
                                         gate is `canAttachPackages`, one place, currently open. */
                                      ...(packageMenuRow(canAttachPackages(currentUser), attachablePkgs.length).length ? ["divider" as const] : []),
                                      ...packageMenuRow(canAttachPackages(currentUser), attachablePkgs.length).map((r) => ({
                                        label: r.label,
                                        onClick: () => {
                                          setAddMatOpen(false);
                                          /* the picker hangs off the same chip the menu did */
                                          (pkgPickTrigRef as React.MutableRefObject<HTMLElement | null>).current = addMatTrigRef.current;
                                          setPkgPickOpen(true);
                                        },
                                      })),
                                      /**
                                       * ⚠️ REMOVAL LIVES WHERE ATTACHMENT LIVES (F-O). `attachPackage`
                                       * had no inverse on any surface: `detachPackage` was written
                                       * and never mounted, so a package could be put on a send and
                                       * only ever be taken apart pill by pill — three removals and
                                       * three undos for one decision. A second, separate detach
                                       * entry point would be the wrong fix; this is the menu the
                                       * writer already opens to attach, so it is the menu that
                                       * offers to take it back.
                                       *
                                       * ⚠️ THE ROWS ARE DERIVED FROM THE GROUPS ALREADY ON SCREEN,
                                       * so the menu can never offer to remove a package the send is
                                       * not carrying, and it names each one rather than guessing
                                       * when a send drew on two.
                                       *
                                       * ⚠️ NO CONFIRM. The write is reversible and the toast carries
                                       * a real undo that restores the captured list — this app's
                                       * grammar for a reversible act. A dialogue here would ask the
                                       * writer to be certain about something they can put straight
                                       * back.
                                       */
                                      ...(sentGroups.length ? ["divider" as const] : []),
                                      ...detachMenuRows(sentGroups).map((r) => ({
                                        label: r.label,
                                        hint: r.hint,
                                        onClick: () => {
                                          setAddMatOpen(false);
                                          detachPackage(activeQuery, r.packageId, r.packageName);
                                        },
                                      })),
                                    ]}
                                  />
                                </span>
                                ); })()}
                              </div>

                              {/* ⚠️ THE ORIGIN TAG IS PROVENANCE, NOT A CONTROL OVER THE PILLS (§2).
                                  The items above are ordinary materials — individually editable and
                                  removable, indistinguishable from hand-attached ones, which is the
                                  point of a snapshot. This line only says where they came from, and
                                  offers to take back exactly what it brought.
                                  ⚠️ IT DERIVES FROM THE ITEMS, so removing a pill by hand makes it
                                  read one fewer, and removing the last makes it disappear. */}
                              {/* ⚠️ THE ORIGIN TAG IS RETIRED — the group above says everything it
                                  said, in the place the items actually are (ref 177 supersedes 173's
                                  small-text tag). Its `undo` went with it: removing a package's items
                                  wholesale is not a correction to a send, and each pill already
                                  carries its own ×. */}

                              {/* ⚠️ MOUNTED, OR `ask` NEVER RESOLVES. An unmounted confirm leaves the
                                  promise pending for ever and the switch silently does nothing —
                                  the dead-control family, one layer deeper than a no-op undo. */}
                              {confirmNode}
                              {pkgPickOpen && (
                                <PackagePicker
                                  packages={attachablePkgs}
                                  versions={versions}
                                  style={pkgPickStyle}
                                  panelRef={pkgPickPanelRef}
                                  /* ⚠️ EVERY NEW ATTACHMENT IS A LINK (D12). The snapshot path is
                                     retired: it copied the package's material NAMES onto the query
                                     and wrote `packageId: ""`, so the send could only ever say
                                     `Covering letter` while a link says `LETTER Hook-first`, and it
                                     contributed to no scorecard. The lock is what makes the link
                                     safe — a sent package cannot change, so there is nothing to
                                     snapshot against. */
                                  onPick={(pkg) => void (async () => {
                                    /* ⚠️ THE COUNT IS THE LOOSE LIST'S, read at the moment of the
                                       write — the only number that describes what is about to be
                                       replaced. */
                                    const listed = (materialsOf(activeQuery) ?? []).length;
                                    if (!(await confirmReplace(listed, pkg.packageName))) return;
                                    await changeQueryPackage(activeQuery, pkg);
                                  })()}
                                  onManage={() => { setPkgPickOpen(false); openPackages(); }}
                                  onClose={() => setPkgPickOpen(false)}
                                />
                              )}

                              {/* ⚠️ OTHER TAKES A FIELD, NOT A STEPPER — a quantity of what? Its chip
                                  reads whatever the writer types, verbatim. */}
                              {/* ⚠️ THE INLINE `Other` ROW IS RETIRED (§2). Choosing `Other` from the
                                  Attach menu opened a text field BELOW the chips while clicking an
                                  Other pill opened a popover — two editors for one material, and
                                  the one the menu opened had no anchor and no removal. Both routes
                                  open `F12Panel` now. */}
                                  </div>
                                );
                              })()}
                              onEditEntry={onEditEntry}
                              onDeleteEntry={onDeleteEntry}
                              onNudge={() => setIsNudgeOpen(true)}
                              /* §4c — the offer beneath a no-reply event opens the same close flow
                                 the bar's `Mark closed` does. One home for the act. */
                              onMarkClosed={() => setIsCloseMenuOpen(true)}
                              /**
                               * §5d — "Keep tracking" is a DECISION, so it is the one thing in §5
                               * that is stored: `closureOfferDismissed` on the query, in the update
                               * allowlist beside the rest.
                               *
                               * ⚠️ IT MUST NEVER COME BACK. Everything else the offer reads is
                               * derived and will keep being true — more months pass, the nudge stays
                               * unanswered — so without a stored answer the offer would return next
                               * month having learned nothing, which is the nagging this forbids.
                               */
                              onKeepTracking={async () => {
                                await updateQuery(activeQuery.id, { closureOfferDismissed: true } as never);
                                showToast({ message: "Still tracking this query" });
                              }}
                              /* §2 (whose-window pack) — the card's own control hands back a
                                 resolved date. It writes `responseDeadline` on the QUERY; the agent
                                 record is not touched, because what the writer stated is what THEY
                                 expect on this query rather than something the agency said. */
                              onSetExpectedDate={(iso) => {
                                /* ⚠️ §1 (provenance pack) · IT WRITES `writerExpectedDate`, AND THIS
                                   IS THE ONLY THING THAT DOES. That is what makes provenance
                                   structural rather than recorded: a value in that field is the
                                   writer's because there is nowhere else it can have come from.
                                   `responseDeadline` is no longer written from here — it was the
                                   field a create-time seed also wrote, so a date in it could never
                                   be evidence of who set it. */
                                /* ⚠️ §1 · THE DATE AND ITS SET-AT STAMP GO IN ONE WRITE, through
                                   `writerExpectedWrite` — they are one statement in two columns,
                                   and a path that set the date alone would produce a row that
                                   silently loses every recency contest (D4). */
                                const id = activeQuery.id;
                                const prev = writerExpectedIso(activeQuery);
                                const prevAt = (activeQuery as unknown as Record<string, unknown>)[WRITER_EXPECTED_SET_AT_FIELD];
                                void updateQuery(id, writerExpectedWrite(iso) as never);
                                showToast({
                                  message: `Expecting a reply by ${new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`,
                                  /* undo restores BOTH columns, or clears both — an undo that left
                                     a stamp behind would date a statement that no longer exists. */
                                  undo: () => void updateQuery(id, (prev
                                    ? { [WRITER_EXPECTED_FIELD]: prev, [WRITER_EXPECTED_SET_AT_FIELD]: typeof prevAt === "string" ? prevAt : deleteField() }
                                    : { [WRITER_EXPECTED_FIELD]: deleteField(), [WRITER_EXPECTED_SET_AT_FIELD]: deleteField() }) as never),
                                });
                              }}
                              {...(() => {
                                /**
                                 * §6b/§6c — the scheduled reminder, and the way to create one.
                                 *
                                 * ⚠️ THE STORED TASK STORE, NOT THE DERIVED FEED. `queryTaskBadge`
                                 * counts what the app NOTICED off `relatedRecordId`; a reminder is
                                 * something the writer SET, which lives in `userTasks` with a
                                 * `queryId` and a `dueDate`. The bar's count reads both; the ghost
                                 * must only ever draw the second.
                                 *
                                 * ⚠️ AND `Remind me later` GOES THROUGH `addUserTask`, the existing
                                 * task-creation path — the same one the to-do composer uses — so the
                                 * task it makes is an ordinary to-do that happens to be scoped here.
                                 */
                                const todayISO = new Date().toISOString().slice(0, 10);
                                const reminder = scheduledReminder(userTasks as never, activeQuery.id, todayISO);
                                return {
                                  reminder,
                                  onOpenReminder: () => onNavigate?.("todo"),
                                  onRemindLater: async () => {
                                    const due = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
                                    await addUserTask({
                                      text: `Nudge ${agentPrimary(activeAgent)}`,
                                      queryId: activeQuery.id,
                                      agentId: activeAgent.id,
                                      manuscriptId: activeQuery.manuscriptId,
                                      dueDate: due,
                                    });
                                    showToast({ message: "Reminder set for two weeks' time" });
                                  },
                                };
                              })()}
                              /* ⚠️ THE PICKER'S THIRD AND LAST HOME (§2). It anchors off the word it
                                 changes, so `methodPickTrigRef` is now a callback ref set by the
                                 in-place button rather than by a kebab that no longer exists — see
                                 the mount just below, which had to move with it. */
                              onEditSendMethod={(anchor) => {
                                (methodPickTrigRef as React.MutableRefObject<HTMLElement | null>).current = anchor;
                                setMethodPickOpen(true);
                              }}
                              /* §1c — the no-send-date offer opens the page's OWN date editor, the
                                 same one the stat cell's "Change the date this was sent" opens. A
                                 second date control for the same field is how two surfaces come to
                                 write it differently. */
                              onSetSendDate={(anchor) => {
                                (dateTrigRef as React.MutableRefObject<HTMLElement | null>).current = anchor;
                                setDateDraft(toDateInputValue(activeQuery.dateSent));
                                setDateEdit("sent");
                              }}
                            />
                          );
                        })()}
                        {/* ⚠️ THE SEND-METHOD PICKER MOUNTS BESIDE THE EVENT IT EDITS (§2). It has now
                            been moved three times — off the "Sent by …" line, into the ⋯, and here —
                            and the reason it kept moving is that the first two homes were places a
                            CONTROL could live rather than places the FACT was stated. Same menu, same
                            handler, same `useFixedMenu`; only the trigger changed, and the trigger is
                            now the word itself. */}
                        {/* ⚠️ §3 · THE MENU STATES WHAT IT IS. Four bare words with a tick beside
                            one of them read as a list of things to do; `Sent via` says the list is
                            an ANSWER to a question the card already asked, which is what every other
                            popover on this page does with its own head. */}
                        <F12Menu open={methodPickOpen} onClose={() => setMethodPickOpen(false)} style={methodPickMenuStyle} panelRef={methodPanelRef} ariaLabel="Change send method" heading="Sent via"
                          items={[SubmissionMethod.EMAIL, SubmissionMethod.ONLINE_FORM, SubmissionMethod.QUERY_MANAGER, SubmissionMethod.POST].map((m) => ({
                            label: sendMethodLabel(m),
                            icon: activeQuery?.sendMethod === m ? <span aria-hidden="true">✓</span> : undefined,
                            onClick: () => pickSendMethod(m),
                          }))}
                        />
                        {/* ⚠️ THE "What happened next?" COMPOSER IS GONE (§1). It was the second
                            implementation of the response journey — a primary and an inline
                            composer that behaved differently, in one room. The takeover is the
                            single door now, and the primary above opens it. TimelineComposer
                            itself survives for the dashboard's own flows; only this mount went. */}
                        </div>
                      </PaneScroll>
                  </PaneCard>

                  {/**
                    * ⚠️ THE RIGHT COLUMN IS A STACK, AND IT IS WHAT MAKES THE HEIGHTS EQUAL NOW. With
                    * three siblings in one row, `align-items: stretch` did it for free; with two
                    * columns, the second has to FILL its own column and share that height between
                    * its members, or the shorter card trails off into white above the taller one.
                    */}
                  {/* ⚠️ NO `--open` MODIFIER AND NO MEASURED FLOOR (§1). Both existed to hide the
                      first card in this stack and hold the column's height while it was hidden;
                      with one card there is no sibling to hide and no height to preserve — it
                      already fills the column. A toggle whose only effect was `display: none` on an
                      element that is no longer here is a control that does nothing. */}
                  <div className="qp-stack">

                  {/* ⚠️ "WHAT YOU SENT" IS GONE FROM HERE, MERGED INTO THE PAIRING CARD (§1) —
                      manuscript, materials and package all moved up whole. Nothing was dropped in
                      the move except the card's own sage header and its "Materials sent" eyebrow,
                      both of which existed to name a subject the card could not otherwise show and
                      which the pairing card names in Playfair at the top of the same column.

                      ⚠️ SO THIS STACK HOLDS ONE CARD, and that is the merge's purpose rather than a
                      leftover: Notes takes the whole right column and its list can show more than
                      one entry. */}
                  {/* ── Sub-card 3: Notes — journal pins to bottom via flex-1 on messages area ── */}
                  <PaneCard
                    title="Notes"
                    /* ⚠️ THE COUNT LIVES IN THE BAND SO THE BODY NEVER RESTATES IT, and it omits
                       itself at zero: "0 notes" is a sentence about nothing on a card whose empty
                       state already says so in words.

                       ⚠️ AND IT COUNTS THIS QUERY'S NOTES, WHICH IT DID NOT. `journalEntries` is
                       every note in the account; the body beneath filters it to
                       `entry.queryId === activeQuery.id`. So the band stated one number and the list
                       showed another — the precise failure a shared header's meta exists to prevent,
                       reintroduced by counting the wrong set one line above the right one. */
                    meta={(() => {
                      const n = journalEntries.filter((e) => e.queryId === activeQuery.id).length;
                      return n > 0 ? `${n} note${n === 1 ? "" : "s"}` : undefined;
                    })()}
                    glyph={<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v15H6a2 2 0 0 0-2 2z" /><path d="M4 19.5A1.5 1.5 0 0 1 5.5 18H19" /></svg>}
                    /* ⚠️ ONE CONTROL, BOTH DIRECTIONS (§8). The arrows flip inward while open rather
                       than a second button appearing to close what the first opened — the writer
                       presses the same place twice, which is what a toggle is for.

                       ⚠️ AND THE MEASUREMENT HAPPENS ON THE WAY IN, FROM THE STACK. Once the first
                       card is hidden the stack no longer has the height being asked for, so reading
                       it afterwards measures the outcome instead of the intent. */
                  >
                      {/**
                        * §1 — THE THREAD. Extracted to `NotesThread`: the ordering, the scroll
                        * anchor, the pinned strip, the composer and the settle are one card's
                        * behaviour, and inline here they were four more pieces of state in a
                        * component that already holds sixty.
                        *
                        * ⚠️ `resetKey` IS THE QUERY, so moving to another one is a different
                        * thread rather than the same one with new data — a draft, an open editor
                        * and a settling note all belong to the query they were started on.
                        */}
                      <NotesThread
                        resetKey={activeQuery.id}
                        notes={journalEntries
                          .filter((entry) => entry.queryId === activeQuery.id)
                          .map((e) => ({ id: e.id, entryText: e.entryText, createdAt: e.createdAt, pinned: (e as { pinned?: boolean }).pinned }))}
                        onAdd={(text) => addJournalEntry(activeQuery.id, text)}
                        onEdit={(id, text) => updateJournalEntry(id, text)}
                        onPin={(id, pinned) => pinJournalEntry(id, pinned)}
                        onDelete={(n) => showConfirm({
                          title: "Delete this note?",
                          danger: true,
                          confirmLabel: "Delete",
                          cancelLabel: "Keep it",
                          body: <p style={{ margin: 0 }}>This note will be removed from the query&rsquo;s record.</p>,
                          onConfirm: () => deleteJournalEntry(n.id),
                        })}
                      />
                  </PaneCard>
                  </div>{/* end the stacked right column */}

                </div>{/* end sub-cards row */}

              </>
            ) : sortedList.length === 0 ? (
              /* v4 P3 — FILTERED (or searched) TO ZERO. The page isn't empty, the view is — so no
                 ghost preview here; a quiet note and a one-tap way back to everything. */
              <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
                <div className="qc-nomatch">
                  <p>No queries match these filters.</p>
                  {/* clears the SEARCH too — a search term is just as likely to be what emptied the
                      view, and a button that doesn't restore the list is a dead end. */}
                  <button type="button" className="f12-btn-sec" onClick={() => { resetAllFilters(); setListSearch(""); }}>Clear filters</button>
                </div>
              </div>
            ) : (
              /* ══ §9 · NOTHING SELECTED ═══════════════════════════════════════════════════════════
                 ⚠️ IT NAMES THE THREE THINGS THE PANE HOLDS, and that is the whole of the copy's
                 job. "Select a query to open the reading pane" described the mechanism to someone
                 who can already see it; this says what they would GET, in the order the pane gives
                 it — where it stands, what you sent, what you have noted.

                 ⚠️ A MONOLINE MARK, NOT AN ILLUSTRATION. The pane's other states are dense with real
                 content; an illustrated empty state would be the loudest thing on a screen that is
                 empty only because nothing has been asked for yet. */
              /**
               * ══ §2b · THE UNSELECTED PANE (ref 176) ═══════════════════════════════════════════
               *
               * ⚠️ NO CHASSIS. No card, no border, no sage top edge — the pane's whole job when
               * nothing is selected is to be quietly absent, and a bordered empty box asserts more
               * presence than emptiness deserves. The full chassis returns with the selection,
               * which also makes selecting feel like something ARRIVING rather than swapping.
               *
               * ⚠️ THE ART IS IN LAYOUT FLOW, IN ITS OWN ROW, never absolutely positioned — the
               * standing law that no positioned element shares space with text. The caption's
               * position is fixed by the BOX, so the watercolour drops into the same 210×150 later
               * with no layout change; that is what makes shipping the placeholder honest rather
               * than a gap waiting to be filled.
               *
               * ⚠️ ONE LINE, AND NOTHING ELSE. No sub-line, no counters, no keyboard hint: the list
               * beside this already shows everything there is to know, and this surface only needs
               * to say why the right-hand side is blank. The retired copy named the three things
               * the pane holds — true, and an explanation nobody asked for yet.
               */
              <div className="qc-unsel">
                <div className="qc-unsel-art"><ArtSlot name="pane-unselected" maxWidth={210} /></div>
                <p className="qc-unsel-cap">Select a query to get started</p>
              </div>
            )}
          </div>{/* closes qp-pane */}

          {/* ── Control ROW — two floating cards sharing the workspace column-gap (ref
              queries-hub-stripped.html): a centred LIST card (col 1) beside the QUERY action ribbon
              (col 2). Both keep the strip-back floating-card treatment (--qp-cmd-* surface / border /
              radius / margin / shadow). The single subgrid bar is retired. ── */}
          <style>{`
            .qp-c:hover:not(:disabled){ background: #f3ede4; }
            .qp-menuitem:hover:not(:disabled){ background: rgba(58,44,31,.06); }
          `}</style>

          {/* (The foot control-row cards are retired — the F12 control bar at the top of the
              page carries every action; the list pane's own footer carries count + Export CSV.) */}

        </div>
        )}{/* closes f12-body, and with it the cards-or-detail branch */}

        {/* ── THE MOBILE COMMAND BAR (Mobile Pass 1, concept frame 03) — the hub's settled
            espresso container, condensed to one floating bar on the pushed detail. It takes
            the tab bar's place (the detail registration hides that). The PRIMARY is the hero's
            own contextual CTA — same derivation, same composer-focus behaviour, soft-pink per
            the button law — and carries the Mark-sent anchor below md; Edit is the drawer; ⋯
            opens the overflow sheet. JS-gated on the mobile detail view so the desktop DOM is
            untouched. ── */}
        {isMobile && mobileDetailOn && !creating && activeQuery && activeAgent && activeMs && (() => {
          const a = getPrimaryAction(activeQuery.status as QueryStatus);
          const closed = activeQuery.status === QueryStatus.REJECTED || activeQuery.status === QueryStatus.WITHDRAWN || activeQuery.status === QueryStatus.NO_RESPONSE;
          const isMark = a.kind === "mark-sent" && !closed;
          const label = closed ? "Reopen"
            : a.kind === "mark-sent" ? (a.markKind === "resubmit" ? "Record resubmission" : "Mark sent")
            : "Record response";
          const waiting = a.ballHolder === "agent";
          return (
            <>
              <div className="qh-mcmd">
                <button
                  ref={isMark ? markSentTriggerRef : undefined}
                  type="button"
                  className="f12-btn-pri"
                  onClick={() => openRecord(activeQuery)}
                >
                  {label}
                </button>
                <button type="button" className="qh-mq" onClick={() => openEditQuery(activeQuery.id)}>Edit</button>
                <button type="button" className="qh-mq" aria-label="More actions" aria-haspopup="dialog" onClick={() => setMobileMoreOpen(true)}>⋯</button>
              </div>
              <MobileSheet open={mobileMoreOpen} onClose={() => setMobileMoreOpen(false)} ariaLabel="More query actions">
                <div className="t-f12 qc-neutral qh-msheet">
                  {waiting && (
                    <button type="button" className="qh-msrow" onClick={() => { setMobileMoreOpen(false); setIsNudgeOpen(true); }}>
                      Nudge the agent
                    </button>
                  )}
                  {!closed && (
                    <>
                      <div className="qh-msk">Close this query as…</div>
                      {[QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE].map((reason) => (
                        <button key={reason} type="button" className="qh-msrow" onClick={() => { setMobileMoreOpen(false); updateQueryStatus(activeQuery.id, reason); }}>
                          <StatusDot status={reason} overrideSize={15} decorative /> {reason}
                        </button>
                      ))}
                      <div className="qh-msdiv" aria-hidden="true" />
                    </>
                  )}
                  <button type="button" className="qh-msrow" disabled={isGeneratingPDF} onClick={() => { setMobileMoreOpen(false); handleDownloadPDF(); }}>
                    {isGeneratingPDF ? "Generating…" : "Download as PDF"}
                  </button>
                  <button type="button" className="qh-msrow qh-msdanger" onClick={() => { setMobileMoreOpen(false); askDeleteQuery(); }}>
                    Delete this query
                  </button>
                </div>
              </MobileSheet>
            </>
          );
        })()}
        </>
        )}
        </WorkspacePageGrid>

        </div>{/* closes the F12 work-area column */}
      </div>{/* closes main container */}

    {activeQuery && (
      <RecordResponseModal
        isOpen={isRecordResponseModalOpen}
        onClose={() => setIsRecordResponseModalOpen(false)}
        query={activeQuery}
        agent={{
          name: (activeAgent ? agentPrimary(activeAgent) : "") || "the agent",
          agency: activeAgent?.agency || "Agency",
          responseTimeWeeks: activeAgent?.responseTimeWeeks || 6,
          submissionMethod: activeAgent?.submissionMethod || "Email"
        }}
        manuscript={{
          title: activeMs?.title || ""
        }}
        materialsOriginallySent={activeQuery?.materialsWanted || []}
        onNavigate={onNavigate}
        onSave={async (data) => {
          if (!currentUser) throw new Error("No user session active.");

          // Snapshot pre-change state so Undo can optimistically restore it before the write reverts.
          preSubmissionSnapshotRef.current = JSON.parse(JSON.stringify(activeQuery));

          // Single canonical write path shared with the Dashboard and Queries landing page.
          // Throws only if the primary write fails (RecordResponseModal surfaces the error);
          // the returned undo() reverts everything and gates the toast below.
          const result = await recordQueryResponse(
            {
              userId: currentUser.id,
              query: activeQuery,
              agent: activeAgent,
              manuscript: activeMs,
            },
            data
          );

          // Optimistic local status so the page behind the modal reflects the change immediately;
          // the query listener reconciles a moment later.
          setSelectedQuery((prev: any) => (prev ? { ...prev, status: result.newStatus } : prev));

          undoFnRef.current = result.undo;
          triggerToast(result.toastConfig);
        }}
      />
    )}

    {activeQuery && activeAgent && (
      <RecordResponseFocusForm
        key={activeQuery.id}
        isOpen={isRecordResponseFocusFormOpen}
        onClose={() => { setIsRecordResponseFocusFormOpen(false); setRichInitialType(undefined); setRichInitialDraft(undefined); }}
        query={activeQuery}
        agent={activeAgent}
        manuscript={{ title: activeMs?.title || "" }}
        initialResponseType={richInitialType}
        initialDraft={richInitialDraft}
        onSuccessToast={() => {
          // The focus form reports a prose message the toast never rendered (the title comes
          // from responseToastTitle, the body from agent/manuscript) — null = the honest
          // generic title, and the union type forbids smuggling prose in as a status.
          triggerToast({ queryId: activeQuery.id, agentName: agentPrimary(activeAgent), manuscriptTitle: activeMs?.title || "", responseStyle: null });
        }}
      />
    )}

    {/**
      * §7 — THE AGENT'S CONTACT EDITOR.
      *
      * ⚠️ IT WRITES THROUGH `updateAgent`, WHICH IS THE AGENT LIST'S OWN PATH — `AgentList`'s Done
      * commits one `updateAgent(draft.id, payload)` and its undo calls the same function. One
      * writer to an agent record, which is the rule this app has been applying everywhere else.
      *
      * ⚠️ AND IT SAYS WHOSE RECORD IT IS CHANGING, in the title and again in the toast. A control
      * on a QUERY's card that quietly edits shared data is the surprise worth spending two words on.
      *
      * ⚠️ VALIDATION IS THE SHAPE ONLY. An email that looks like one, and a URL that resolves to a
      * host through `agentWebsiteHref` — the same function the pill uses to build its link, so a
      * value that saves is a value the pill can render. Nothing here checks that either EXISTS;
      * that is not something a form can know.
      */}
    {agentEdit && activeAgent && (() => {
      const value = agentDraft.trim();
      const valid = agentEdit === "email"
        ? /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
        : !!agentWebsiteHref(value);
      const commit = async () => {
        if (!valid) return;
        await updateAgent(activeAgent.id, agentEdit === "email" ? { email: value } : { website: value });
        setAgentEdit(null);
        showToast({ message: agentEdit === "email" ? `Email added to ${agentPrimary(activeAgent)}` : `Website added to ${agentPrimary(activeAgent)}` });
      };
      return (
        /**
         * ⚠️ §5 · THE SAME SURFACE AND CONVENTIONS AS THE MATERIALS EDITORS — `F12Panel`, a mono
         * eyebrow, a single focused field, Enter to commit, Esc to close. It was a bespoke form
         * with a titled head and a `Save to the agent's record` button; two editor shapes on one
         * page is two sets of conventions for a reader to learn.
         *
         * ⚠️ AND IT COMMITS ON ENTER RATHER THAN ON EVERY KEYSTROKE, which is the one place this
         * differs from the materials editors and the reason is the write's SHAPE: a sample's
         * quantity is idempotent, while a half-typed address written to a shared agent record is a
         * wrong value other pages would read. The validation gates it either way.
         *
         * ⚠️ IT STILL SAYS WHOSE RECORD IT CHANGES, in the eyebrow — a control on a QUERY's card
         * that quietly edits shared data is the surprise worth spending two words on.
         */
        <F12Panel
          open
          eyebrow={agentEdit === "email" ? `Email · ${agentPrimary(activeAgent)}` : `Website · ${agentPrimary(activeAgent)}`}
          width={272}
          style={agentEditStyle}
          panelRef={agentEditPanelRef}
          onClose={() => setAgentEdit(null)}
        >
          <div className="f12-panel-free">
            <input
              type={agentEdit === "email" ? "email" : "url"}
              autoFocus
              value={agentDraft}
              placeholder={agentEdit === "email" ? "name@agency.com" : "agency.com"}
              aria-label={agentEdit === "email" ? "Email address" : "Website"}
              onChange={(e) => setAgentDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void commit(); } }}
            />
          </div>
          {/* ⚠️ WHAT ENTER WILL DO, not an instruction to press it — and only while the value is
              not yet usable, so a valid address shows nothing and a half-typed one says why. */}
          {!valid && agentDraft.trim() !== "" && (
            <div className="f12-panel-hint">{agentEdit === "email" ? "Needs an address like name@agency.com" : "Needs a web address"}</div>
          )}
        </F12Panel>
      );
    })()}

    {/**
      * §6 — THE DATE EDITOR THE TWO TRACKING CELLS OPEN.
      *
      * ⚠️ IT WRITES THROUGH `commitQueryEdits`, THE PATH THE EDIT DRAWER ALREADY USES — `dateSentMs`
      * for the send (which the drawer also passes, because the send date lives in the ACTIVITY LOG
      * and `recomputeQuery` derives `dateSent` from it) and `queryFields.responseDeadline` for the
      * expected date, which is a stored override rather than a derived field. `recomputeQuery`
      * remains the single writer for everything derived from either; nothing here writes a derived
      * field directly.
      *
      * ⚠️ AND A CLEARED FIELD IS `""`, NOT A DELETE — the same value the drawer sends, which is what
      * the rules' allowlist accepts.
      */}
    {dateEdit && activeQuery && (
      <F12Popover
        width={244}
        title={dateEdit === "sent" ? "Date sent" : "Reply expected by"}
        style={dateMenuStyle}
        panelRef={datePanelRef}
        onClose={() => setDateEdit(null)}
      >
        <input
          type="date"
          className="qc-pickfield"
          autoFocus
          value={dateDraft}
          max={dateEdit === "sent" ? toDateInputValue(new Date().toISOString()) : undefined}
          aria-label={dateEdit === "sent" ? "Date sent" : "Reply expected by"}
          onChange={(e) => setDateDraft(e.target.value)}
        />
        <button
          type="button"
          className="qc-mpopact"
          disabled={!dateDraft}
          onClick={async () => {
            if (!currentUser || !dateDraft) return;
            const ms = new Date(`${dateDraft}T12:00:00`).getTime();
            const ops = dateEdit === "sent"
              ? { dateSentMs: ms }
              : { queryFields: { writerExpectedDate: new Date(ms).toISOString() } };
            await commitQueryEdits(db, currentUser.id, activeQuery.id, ops as never, {
              agentName: agentPrimary(activeAgent), manuscriptId: activeQuery.manuscriptId, manuscriptTitle: activeMs?.title || "",
            });
            setDateEdit(null);
            showToast({ message: dateEdit === "sent" ? "Date sent updated" : "Expected date updated" });
          }}
        >Save</button>
      </F12Popover>
    )}

    {/**
      * §5 — THE TASK SURFACE THE BAR'S CONTROL OPENS.
      *
      * ⚠️ IT WAS NEVER MOUNTED. `TasksPopover` was imported and `setIsTasksOpen(true)` was wired to
      * the old Tracking-header count, with nothing listening — so that control opened nothing for
      * as long as it existed. Anchored off the bar's button through the page's own `useFixedMenu`,
      * like every other popover here.
      */}
    {isTasksOpen && activeQuery && (
      <TasksPopover scope={{ queryId: activeQuery.id }} style={tasksMenuStyle} panelRef={tasksPanelRef} onClose={() => setIsTasksOpen(false)} />
    )}

    {/**
      * §4c — THE CONFIRM. It states what the agency said, when that window expires and how far off
      * that is, then offers the two answers.
      *
      * ⚠️ NO VERDICT, WHICH IS WHY THERE IS NO "ARE YOU SURE". The copy is built by `nudgeConfirm`
      * and locked against advice; this mount contributes only the two buttons.
      *
      * ⚠️ IT IS PORTALLED WITH ITS OWN CHROME RATHER THAN THROUGH `F12Popover`, which is a titled
      * filter dialog with a DONE foot — a shape that would put a third answer on a two-answer
      * question.
      *
      * ⚠️ THE REF'S LITTLE WINDOW BAR IS NOT BUILT, deliberately and reversibly. It can only ever
      * draw one of its two states here (the confirm exists only while the window is OPEN), and in
      * the no-window case it would draw a bar for a window that does not exist. The pack's prose
      * lists the facts and the actions and no bar. Nick's call if he wants it back.
      */}
    {nudgeAsk && createPortal(
      <div className="t-f12 qc-neutral">
        <div ref={nudgePanelRef} className="qc-nask" style={{ ...nudgeAskStyle, zIndex: 60, display: "flex", flexDirection: "column", minHeight: 0 }} role="dialog" aria-label={nudgeAsk.title}>
          <div className="qc-nask-h">{nudgeAsk.title}</div>
          <div className="qc-nask-b">
            {nudgeAsk.body}
            {/* ⚠️ §4 · THE BAR ONLY WHERE THERE IS A WINDOW. `nudgeConfirm` omits it when the agency
                states no response time — drawing an empty track there would invent the very fact
                the sentence above is admitting does not exist. Same rule as the waiting state. */}
            {nudgeAsk.bar && (
              <div className="qc-naskw">
                <div className="qc-naskw-t"><i style={{ width: `${nudgeAsk.bar.pct}%` }} /></div>
                <div className="qc-naskw-f"><span>{nudgeAsk.bar.sentLabel}</span><span>{nudgeAsk.bar.closesLabel}</span></div>
              </div>
            )}
          </div>
          <div className="qc-nask-f">
            <button type="button" className="qc-nask-x" onClick={() => setNudgeAsk(null)}>Cancel</button>
            <button type="button" className="qc-nask-go" onClick={() => { setNudgeAsk(null); setIsNudgeOpen(true); }}>Nudge anyway</button>
          </div>
        </div>
      </div>,
      document.body,
    )}

    {/* Nudge — the ribbon's Nudge tile (writer waiting on the agent). Mirrors the dashboard mount:
        NudgeModal collects the check-back + note and logs via the isolated logNudge path. */}
    {isNudgeOpen && activeQuery && activeAgent && (
      <NudgeModal
        agentName={agentPrimary(activeAgent) || null}
        agency={activeAgent.name?.trim() ? activeAgent.agency || "" : ""}
        dateSent={activeQuery.dateSent}
        responseDeadline={activeQuery.responseDeadline}
        onClose={() => setIsNudgeOpen(false)}
        onConfirm={async ({ checkBackDate, note }) => {
          await logNudge(activeQuery.id, { checkBackDate, note });
          setIsNudgeOpen(false);
        }}
        onCloseInstead={() => { setIsNudgeOpen(false); setIsCloseMenuOpen(true); }}
      />
    )}

    {/* Toast Notification Container */}
    <div className="fixed bottom-[24px] left-[24px] z-[1100] flex flex-col gap-3 pointer-events-none select-none">
      <AnimatePresence>
        {undoToast && (
          <motion.div
            id="undo-toast"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{
              background: "#3a1c14",
              borderRadius: "10px",
              padding: "12px 16px",
              minWidth: "300px",
              maxWidth: "380px",
            }}
            className="flex items-center gap-[12px] shadow-lg pointer-events-auto border-0"
          >
            {/* Left Column: SVG Countdown Circle */}
            <div className="flex-shrink-0 w-7 h-7 relative">
              <svg className="w-7 h-7 -rotate-90" viewBox="0 0 28 28">
                {/* Outer Background Tracker Arc */}
                <circle
                  cx="14"
                  cy="14"
                  r="12"
                  fill="transparent"
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth="2.5"
                />
                {/* Inner Draining Arc */}
                <circle
                  cx="14"
                  cy="14"
                  r="12"
                  fill="transparent"
                  stroke="#c9a89e"
                  strokeWidth="2.5"
                  strokeDasharray="75.4"
                  strokeDashoffset="0"
                  style={{
                    animation: "toast-drain-countdown 10s linear forwards"
                  }}
                />
              </svg>
              <style dangerouslySetInnerHTML={{__html: `
                @keyframes toast-drain-countdown {
                  from { stroke-dashoffset: 0; }
                  to { stroke-dashoffset: 75.4; }
                }
              `}} />
            </div>

            {/* Center Segment */}
            <div className="flex-1 flex flex-col text-left">
              <span className="text-[12px] font-medium text-[#F8F5F0] leading-tight">
                {responseToastTitle(undoToast.responseStyle)}
              </span>
              <span className="text-[11px] text-[rgba(248,245,240,0.5)] leading-tight mt-0.5">
                {undoToast.agentName} · {undoToast.manuscriptTitle}
              </span>
            </div>

            {/* Right Stack */}
            <div className="flex flex-col items-end gap-0.5 justify-center pl-1 font-sans shrink-0">
              <button
                type="button"
                onClick={handleUndo}
                className="text-[11px] font-semibold text-[#c9a89e] hover:text-white cursor-pointer py-0.5 select-none transition-colors border-0 bg-transparent focus:outline-none"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={() => setUndoToast(null)}
                className="text-[11px] text-[rgba(248,245,240,0.4)] hover:text-white cursor-pointer py-0.5 select-none transition-colors border-0 bg-transparent focus:outline-none"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}

        {feedbackToast && (
          <motion.div
            id="feedback-toast"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{
              background: "#3a1c14",
              borderRadius: "10px",
              padding: "12px 16px",
              minWidth: "300px",
              maxWidth: "380px",
            }}
            className="flex flex-col text-left shadow-lg pointer-events-auto border-0"
          >
            <span 
              style={{
                color: feedbackToast.message.includes("Couldn't") ? "rgba(248,245,240,0.7)" : "#F8F5F0"
              }}
              className="text-[12px] font-medium leading-tight"
            >
              {feedbackToast.message}
            </span>
            {feedbackToast.subMessage && (
              <span className="text-[11px] text-[rgba(248,245,240,0.5)] leading-tight mt-0.5 font-sans">
                {feedbackToast.subMessage}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </div>
    </div>
  );
};
