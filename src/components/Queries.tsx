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
import { QueryStatus, Agent, Manuscript, Query, SubmissionMethod, SubmissionStatus, ActivityType, QueryMaterial, UserPlan, ComponentType } from "../types";
import { TypeGlyph } from "./packages/TypeGlyph";
import { StatusPill, getStatusLabel } from "./StatusPill";
import { StatusDot } from "./StatusDot";
import { PillTrig, F12Popover, F12Menu, PopSection, PRow, Chip } from "./shell/F12Shell";
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
import { queryAmbientStatus, commandBarStatus, queryBucket, queriesPulse, queriesMastheadCounts, createPlaceLine, recordPlaceLine, agentRepliesForManuscript, consequenceLine, DAY } from "../lib/queryAmbient";
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
import { agentLabel, agentAgencyLine, agentPrimary, agentInitials, agentWebsiteHref } from "../lib/agentDisplay";
/* the shared date formatter — it OMITS an unparseable date rather than printing "Invalid Date" */
import { refDate } from "../lib/responseContext";
import { formatQueryMaterial, materialLabel, sampleMaterialText } from "../lib/materials";
import { formatListRowDate } from "../lib/listRowDate";
import { MarkSentPopover } from "./MarkSentPopover";
import { NudgeModal } from "./NudgeModal";
import { queryTaskBadge } from "../lib/queryTaskBadge";
/* §5 — the list's four groups and the position figure, both derived, both composing rules that
   already exist (`queryBucket` for membership, `taskPrecedence` for the clock). */
import { GROUP_ORDER, GROUP_LABEL, listGroupFor, rowFigure, figureText, foldClosed } from "../lib/queryCentreGroups";
/* §2/§5 — the ONE reply-overdue rule, two consumers: Nudge's greying and the list's OVERDUE group.
   `replyTaskFor` also owns the input assembly, which is the second place two callers could drift. */
import { replyTaskFor } from "../lib/taskPrecedence";
import { useFixedMenu } from "./forms/useFixedMenu";
import { useOpenEditQuery } from "./EditQueryHost";
import { MobileSheet } from "./shell/MobileSheet";
import { useIsMobile, useMobileChrome } from "./shell/mobileChrome";
import { QueryTimeline } from "./reading-pane/QueryTimeline";
import type { TimelineEntryRef } from "./reading-pane/QueryTimeline";
import { useToast } from "./toast/ToastProvider";
import { deriveQueryFields } from "../lib/queryDerivation";
import { subcollectionDocToDerivable } from "../lib/recomputeQuery";
import { TasksPopover } from "./TasksPopover";
import { MountCard } from "./MountCard";
import { ScriptAllyLogo } from "./ScriptAllyLogo";
import {
  kraft, parchment, PAPER_TEXTURE,
  burgundy, deepBurgundy, FONT_SERIF, FONT_MONO, mountShadow, labelColor,
  qdbCardLine,
  qdbBoldInk, qdbBoldInk2, qdbBoldMuted,
} from "../lib/designTokens";

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
  Pencil,
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
  Trash2,
  Move,
  Image as ImageIcon,
  Bell,
  XCircle,
  User,
  ListChecks,
  RotateCcw
} from "lucide-react";

// Materials are rendered through the single formatQueryMaterial helper (src/lib/materials.ts) —
// the one place a material (legacy string or structured QueryMaterial) becomes display text.

function formatWhatsAppDate(dateString: string): string {
  const d = new Date(dateString);
  const day = d.getDate();
  const month = d.toLocaleString("en-GB", { month: "short" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day} ${month}, ${time}`;
}

/* Send-method label for the What-you-sent "Sent by {method}" line (ref shows lower-case forms). */
const sentViaLabel = (method?: string): string => {
  if (!method) return "";
  const m = method.toLowerCase().trim();
  if (m === "email") return "email";
  if (m === "online form" || m === "online_form") return "online form";
  if (m === "querymanager" || m === "query manager") return "QueryManager";
  return method;
};

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

/* v4 P3 — last-viewed query, remembered across visits so the hub reopens where you left it.
   localStorage under the house `sa.` UI-prefs prefix; a lightweight preference, never a fact —
   an id that no longer exists just falls through to the first row of the current sort. */
const LAST_VIEWED_KEY = "sa.queries.lastViewed";
const readLastViewedQueryId = (): string | null => {
  try { return localStorage.getItem(LAST_VIEWED_KEY); } catch { return null; }
};
const writeLastViewedQueryId = (id: string | null) => {
  try { if (id) localStorage.setItem(LAST_VIEWED_KEY, id); else localStorage.removeItem(LAST_VIEWED_KEY); } catch { /* private mode — the preference is optional */ }
};

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
}> = ({ searchQuery, onNavigate, activeSubPage, inShell = false, createSeed, onCreateSeedConsumed, routeActive = false, statusFilter }) => {
  const {
    currentUser,
    manuscripts,
    agents,
    queries,
    packages,
    activities,
    journalEntries,
    tasks,
    addJournalEntry,
    addQuery,
    addAgent,
    updateQuery,
    deleteQuery,
    recordMaterialsSent,
    deleteJournalEntry,
    updateJournalEntry,
    deleteActivity,
    editActivity,
    updateAgent,
    updateQueryStatus,
    logNudge
  } = useScriptAllyDb();
  const { showConfirm, showToast } = useToast();
  // Query editing is the app-level Edit Query drawer (the inline isEditMode editor is retired).
  const openEditQuery = useOpenEditQuery();

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
  /** Select a row: on mobile this is also the push. */
  const pickRow = (id: string) => {
    setSelectedQueryId(id);
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
      /* ⚠️ deps FIRST, then the payload — and the payload is built by a named function rather
         than assembled at the call site, so the eighteen fields it needs are stated in one place
         that can be tested without a database. */
      const res = await recordQueryResponse(
        { userId: currentUser.id, query: q, agent, manuscript: { title: activeMs?.title } },
        responseDraftToPayload(respDraft),
      );
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
  const { triggerRef: markSentTriggerRef, menuStyle: markSentMenuStyle } = useFixedMenu<HTMLButtonElement>(isMarkSentOpen, isMobile ? { placement: "up" } : undefined);
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
   * §8 — Notes expands over What you sent.
   *
   * ⚠️ THE HEIGHT IS MEASURED, NOT DECLARED. `height: 100%` on the notes card would work only while
   * the stack's height came from its parent; the stack is a flex column inside a grid cell, so the
   * moment its first child is hidden the container it is measured against changes and everything
   * below jumps. The column's height is taken BEFORE the hide and applied as a floor, so the pane is
   * exactly as tall open as it was closed.
   *
   * ⚠️ AND IT CLOSES ON A QUERY CHANGE. The expanded state belongs to the query you were reading;
   * carrying it across would show a different query's notes at full height without being asked for.
   */
  const [notesOpen, setNotesOpen] = useState(false);
  const notesStackRef = useRef<HTMLDivElement | null>(null);
  const notesCardRef = useRef<HTMLDivElement | null>(null);
  const [notesFloor, setNotesFloor] = useState<number | null>(null);
  useEffect(() => { setNotesOpen(false); setNotesFloor(null); }, [selectedQueryId]);
  useEffect(() => {
    if (!notesOpen) return;
    /* ⚠️ POINTERDOWN, AND ON THE CAPTURE PHASE IS NOT NEEDED HERE. This is a collapse, not a
       dismissal that must beat another handler — a click that lands on a control inside the card
       should reach that control, and a click anywhere else should close. */
    const away = (e: PointerEvent) => {
      const card = notesCardRef.current;
      if (card && e.target instanceof Node && card.contains(e.target)) return;
      setNotesOpen(false);
      setNotesFloor(null);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [notesOpen]);
  // ⋯ overflow menu on the command bar (PDF demoted here — a rare action, chrome tidy).
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const { triggerRef: moreTrigRef, menuStyle: moreMenuStyle } = useFixedMenu<HTMLButtonElement>(isMoreOpen);
  // View tasks — the record-scoped popover (5c), anchored to the command-bar button.
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const { triggerRef: tasksTrigRef, menuStyle: tasksMenuStyle } = useFixedMenu<HTMLButtonElement>(isTasksOpen);
  // Timeline composer (5a): the CTA button scrolls + focuses this; Offer/R&R + "Add more detail"
  // open the rich form pre-set via these seam props.
  const [richInitialType, setRichInitialType] = useState<QueryStatus | undefined>(undefined);
  const [richInitialDraft, setRichInitialDraft] = useState<{ dateReceived?: string; note?: string } | undefined>(undefined);
  const openRichForm = (rt: QueryStatus, draft?: { dateReceived?: string; note?: string }) => {
    setRichInitialType(rt); setRichInitialDraft(draft); setIsRecordResponseFocusFormOpen(true);
  };
  // 5b — timeline corrections. Edit reopens the composer in place; Delete confirms with the DERIVED
  // consequence (the status the query recomputes to once this entry is gone) — never a bare "sure?".
  const onDeleteEntry = (entry: TimelineEntryRef) => {
    const remaining = trackingEvents
      .filter((e) => e.id !== entry.activityId)
      .map((e) => subcollectionDocToDerivable(e.id, e));
    const derived = remaining.length ? deriveQueryFields(remaining).status : "Not yet sent";
    const current = (activeQuery?.status as string) || "";
    const changes = derived !== current;
    showConfirm({
      title: "Delete this entry?",
      danger: true,
      confirmLabel: "Delete entry",
      body: (
        <>
          {changes ? (
            <p style={{ margin: "0 0 8px" }}>
              This query will move <b style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>{current}</b> → <b style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>{derived}</b>.
            </p>
          ) : (
            <p style={{ margin: "0 0 8px" }}>This won’t change the query’s status.</p>
          )}
          <p style={{ margin: 0, color: "var(--muted, #7d7469)" }}>
            Use this only if the entry was logged by mistake. If something genuinely changed, record a new entry instead.
          </p>
        </>
      ),
      onConfirm: async () => { await deleteActivity(entry.activityId); showToast({ message: "Entry deleted" }); },
    });
  };
  const { triggerRef: closeTriggerRef, menuStyle: closeMenuStyle } = useFixedMenu<HTMLButtonElement>(isCloseMenuOpen); // F12: downward
  // Close every ribbon popover/modal whenever the reader moves to a different query.
  useEffect(() => { setIsMarkSentOpen(false); setIsNudgeOpen(false); setIsCloseMenuOpen(false); setIsTasksOpen(false); setIsMoreOpen(false); }, [selectedQueryId]);
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
  /* ── F12 filter model (ref queries-hub-v14.html filter popover) ──
     turn — WHOSE TURN radio, derived from the CTA engine's queryBucket (the ONE source of
     truth): "move" = writer's turn, "wait" = agent's court; never a second derivation.
     statusSel — exact QueryStatus enum strings, multi-select (empty OR full set = no filter).
     needsOverdue / needsTasks — the NEEDS ATTENTION checkboxes, both derived (reply overdue
     from responseDeadline while waiting; open tasks from the derived tasks array). */
  const [turnFilter, setTurnFilter] = useState<"all" | "move" | "wait">("all");
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

  // Portalled popovers anchor to their icon triggers via the codebase's fixed-position utility
  // (chrome revision — the list pane keeps overflow:hidden; the portal escapes the clip).
  const { triggerRef: filterTrigRef, menuStyle: filterMenuStyle } = useFixedMenu<HTMLButtonElement>(filterPopOpen);
  const { triggerRef: sortTrigRef, menuStyle: sortMenuStyle } = useFixedMenu<HTMLButtonElement>(sortPopOpen);
  // 5d — reading-pane click-to-pick: send method + manuscript, constrained to valid values, written
  // straight to the query (updateQuery is a plain patch; both keys are in the query update allowlist)
  // with an undo. The Edit drawer stays the home for everything else (agent, dates, materials…).
  const [methodPickOpen, setMethodPickOpen] = useState(false);
  const { triggerRef: methodPickTrigRef, menuStyle: methodPickMenuStyle } = useFixedMenu<HTMLButtonElement>(methodPickOpen);
  // Phase 6 — the What-you-sent sample-materials inline editor (unit toggle + quantity). Wired to the
  // existing QueryMaterial.type/quantity via updateQuery — no new fields.
  const [sampleEditorOpen, setSampleEditorOpen] = useState(false);
  const [sampleUnit, setSampleUnit] = useState<"pages" | "chapters" | "words">("pages");
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

  // Select initial query on mount or use activeSubPage preselection
  useEffect(() => {
    if (activeSubPage && activeSubPage !== "All queries" && activeSubPage !== "Queries database") {
      const matched = queries.find(q => q.id === activeSubPage);
      if (matched) {
        setSelectedQueryId(activeSubPage);
        // Deep-linked arrival (?q=<id>): bring the row into the middle of the list viewport so it
        // lands clear of both edge fades. Only on the selection CHANGE — not on every data tick.
        if (selectedQueryId !== activeSubPage) {
          document.getElementById(`query-row-${activeSubPage}`)?.scrollIntoView({ block: "center" });
        }
        return;
      }
    }
    // v4 P3 — auto-select on load: the LAST-VIEWED query when it's still present. The fallback is
    // the first row of the CURRENT SORT, applied once the sort has resolved (the effect below) —
    // this used to grab queries[0], which is the raw array's first, not the first visible row.
    if (queries.length > 0 && !selectedQueryId) {
      const remembered = readLastViewedQueryId();
      if (remembered && queries.some((q) => q.id === remembered)) setSelectedQueryId(remembered);
    }
  }, [queries, selectedQueryId, activeSubPage]);

  // The active query + its agent/manuscript, resolved live. The reading pane is view-only EXCEPT the
  // 5d click-to-pick shortcuts (send method + manuscript); everything else edits via the Edit Query
  // drawer (openEditQuery) — agent, dates, materials, journal, corrections.
  const activeQuery = selectedQueryId ? (selectedQuery || queries.find(q => q.id === selectedQueryId)) : null;
  const currentStatus = activeQuery?.status ?? selectedQuery?.status;
  const activeAgent = activeQuery ? agents.find(a => a.id === activeQuery.agentId) : null;
  const activeMs = activeQuery ? manuscripts.find(m => m.id === activeQuery.manuscriptId) : null;
  // 5d — click-to-pick writers (constrained values, plain updateQuery + undo). No cascade needed:
  // sendMethod is a display field; manuscriptId reassignment is a plain patch (historical activities
  // keep their own manuscriptId — the same derived-over-stored limitation the drawer has).
  const pickSendMethod = (m: SubmissionMethod) => {
    setMethodPickOpen(false);
    if (!activeQuery || m === activeQuery.sendMethod) return;
    const id = activeQuery.id, prev = activeQuery.sendMethod;
    void updateQuery(id, { sendMethod: m });
    showToast({ message: `Sent by ${sentViaLabel(m)}`, undo: () => void updateQuery(id, prev ? { sendMethod: prev } : { sendMethod: deleteField() as unknown as string }) });
  };
  // Phase 6 — What-you-sent material writes. The query's own materialsWanted is the record of what was
  // sent; when it's empty we DISPLAY the agent's expected set, and the first edit promotes that set onto
  // the query. Writes patch materialsWanted (allowlisted) with an undo restoring the prior stored value.
  const isQueryLetterMat = (it: string | QueryMaterial) => materialLabel(it).toLowerCase().includes("query");
  const isSynopsisMat = (it: string | QueryMaterial) => materialLabel(it).toLowerCase().includes("synopsis");
  const isSampleMat = (it: string | QueryMaterial) => !isQueryLetterMat(it) && !isSynopsisMat(it);
  const baseMaterialsFor = (q: Query, ag: Agent | null | undefined): (string | QueryMaterial)[] => {
    const own = (q as any).materialsWanted;
    if (Array.isArray(own) && own.length) return own;
    return ag && Array.isArray(ag.materialsWanted) ? ag.materialsWanted : [];
  };
  const writeMaterials = (q: Query, next: (string | QueryMaterial)[], msg: string) => {
    const prev = (q as any).materialsWanted;
    const restore = Array.isArray(prev) ? { materialsWanted: prev } : { materialsWanted: deleteField() as unknown as QueryMaterial[] };
    void updateQuery(q.id, { materialsWanted: next });
    showToast({ message: msg, undo: () => void updateQuery(q.id, restore) });
  };
  const toggleDocMaterial = (q: Query, ag: Agent | null | undefined, kind: "query" | "synopsis") => {
    const base = baseMaterialsFor(q, ag);
    const pred = kind === "query" ? isQueryLetterMat : isSynopsisMat;
    const name = kind === "query" ? "Query letter" : "Synopsis";
    const present = base.some(pred);
    const next = present ? base.filter((it) => !pred(it)) : [...base, { material: kind === "query" ? "Query Letter" : "Synopsis" } as QueryMaterial];
    writeMaterials(q, next, present ? `${name} unmarked` : `${name} marked sent`);
  };
  const saveSampleMaterial = (q: Query, ag: Agent | null | undefined) => {
    const qty = sampleQty.trim();
    if (!qty) return;
    const numeric = /^[\d,]+$/.test(qty) ? Number(qty.replace(/,/g, "")) : qty;
    const item: QueryMaterial = { material: "Sample Pages", type: sampleUnit, quantity: numeric };
    const next = [...baseMaterialsFor(q, ag).filter((it) => !isSampleMat(it)), item];
    writeMaterials(q, next, "Sample materials updated");
    setSampleEditorOpen(false);
  };
  const removeSampleMaterial = (q: Query, ag: Agent | null | undefined) => {
    writeMaterials(q, baseMaterialsFor(q, ag).filter((it) => !isSampleMat(it)), "Sample materials removed");
    setSampleEditorOpen(false);
  };
  // Queries Hub subtitle — the manuscript currently in scope ("Tracking …").
  const trackedManuscript = selectedManuscriptFilter !== "All" ? manuscripts.find(m => m.id === selectedManuscriptFilter) : null;
  // Manuscripts that actually have queries — the MANUSCRIPT pill group only shows these.
  const manuscriptsWithQueries = manuscripts.filter(m => queries.some(q => q.manuscriptId === m.id));
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

  // Arrow-key navigation through the query list — registers once, reads state via stable refs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      e.preventDefault();
      const list = sortedListRef.current;
      const currentId = selectedQueryIdRef.current;
      const idx = list.findIndex((q: any) => q.id === currentId);
      if (idx === -1) return;
      const nextIdx = e.key === "ArrowDown"
        ? Math.min(idx + 1, list.length - 1)
        : Math.max(idx - 1, 0);
      if (nextIdx === idx) return;
      setSelectedQueryId(list[nextIdx].id);
      document.getElementById(`query-row-${list[nextIdx].id}`)?.scrollIntoView({ block: "nearest" });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  const matchesFilters = (q: Query): boolean => {
    const agent = agents.find(a => a.id === q.agentId);
    const ms = manuscripts.find(m => m.id === q.manuscriptId);

    if (!agent || !ms) return false;

    // Whose turn — the CTA engine's queryBucket is the ONE source of truth (never re-derived):
    // "move" = the agent replied, your turn; "waiting" = ball in the agent's court.
    const bkt = queryBucket(q.status as QueryStatus);
    if (turnFilter === "move" && bkt !== "move") return false;
    if (turnFilter === "wait" && bkt !== "waiting") return false;

    // Status multi-select — the exact QueryStatus strings; only a partial selection filters.
    if (statusFilterActive && !statusSel.includes(q.status as QueryStatus)) return false;

    // Manuscript filter
    if (selectedManuscriptFilter !== "All" && q.manuscriptId !== selectedManuscriptFilter) {
      return false;
    }

    // Needs attention — both derived (reply overdue; open tasks via the derived Task[]).
    if (needsOverdue && !isOverdueForReply(q)) return false;
    if (needsTasks && queryTaskBadge(tasks, q.id).count === 0) return false;

    // Search bar filters
    const term = (listSearch || searchQuery).toLowerCase();
    if (term) {
      return (
        agent.name.toLowerCase().includes(term) ||
        agent.agency.toLowerCase().includes(term) ||
        ms.title.toLowerCase().includes(term)
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
        const aD = a.responseDeadline ? new Date(a.responseDeadline).getTime() : MAXT;
        const bD = b.responseDeadline ? new Date(b.responseDeadline).getTime() : MAXT;
        return aD - bD;
      }
      case "journey_depth": return journeyRank(a) - journeyRank(b);
      case "last_activity":
      default: return lastActivityMs(b) - lastActivityMs(a);
    }
  };
  const sortedList = [...filteredList].sort(compareQueries);

  // ── F12 active-filter chips + the FILTER / SORT popovers (ref queries-hub-v14.html) ──
  const resetAllFilters = () => {
    setTurnFilter("all"); setStatusSel([]); setSelectedManuscriptFilter("All");
    setNeedsOverdue(false); setNeedsTasks(false);
  };
  const activeFilterChips: { key: string; label: string; remove: () => void }[] = [
    ...(turnFilter !== "all" ? [{ key: "turn", label: turnFilter === "move" ? "YOUR MOVE" : "WAITING", remove: () => setTurnFilter("all") }] : []),
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
      onClose={() => setFilterPopOpen(false)}
      headAction={<button type="button" className="f12-reset" onClick={resetAllFilters}>RESET ALL</button>}
      footText={<><b>{filteredList.length}</b>&nbsp;OF {queries.length} QUERIES</>}
    >
      <PopSection label="Whose turn">
        <PRow kind="rad" on={turnFilter === "all"} label="All queries" sub="Everything, open and closed" onClick={() => setTurnFilter("all")} />
        <PRow kind="rad" on={turnFilter === "move"} label="Your move" sub="The agent has replied — your turn" onClick={() => setTurnFilter("move")} />
        <PRow kind="rad" on={turnFilter === "wait"} label="Waiting" sub="Ball is in the agent's court" onClick={() => setTurnFilter("wait")} />
      </PopSection>
      <PopSection label="Manuscript">
        <PRow kind="rad" on={selectedManuscriptFilter === "All"} label="All manuscripts" onClick={() => setSelectedManuscriptFilter("All")} />
        {manuscriptsWithQueries.map(m => (
          <PRow key={m.id} kind="rad" on={selectedManuscriptFilter === m.id} label={m.title} onClick={() => setSelectedManuscriptFilter(m.id)} />
        ))}
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
  const renderSortPopover = () => (
    <F12Popover
      width={276}
      title="Sort"
      style={sortMenuStyle}
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

  // Automatically select first element if currently selected is filtered out
  const statusFiltersKey = `${turnFilter}|${statusSel.join(",")}|${needsOverdue}|${needsTasks}`;
  useEffect(() => {
    if (sortedList.length > 0) {
      const isStillInList = sortedList.some(q => q.id === selectedQueryId);
      if (!isStillInList) {
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
    const escapeCSVField = (val: string | number | undefined | null): string => {
      if (val === undefined || val === null) return "";
      const str = String(val).trim();
      if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
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

    const getSentViaLabel = (method?: string): string => {
      if (!method) return "";
      const m = method.toLowerCase().trim();
      if (m === "email") return "Email";
      if (m === "online form" || m === "online_form") return "Online form";
      if (m === "querymanager" || m === "query manager") return "QueryManager";
      return method;
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
      const sentVia = getSentViaLabel(q.sendMethod || ag?.submissionMethod);

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
      const responseDeadlineClean = formatCSVDate(q.responseDeadline);
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

      const sendMethodLabel = activeQuery.sendMethod || "Email";
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
        detail: `via ${sendMethodLabel}`,
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
        const deadlineDate = activeQuery.responseDeadline || activeQuery.dateSent;
        timelineEvents.push({
          title: "Waiting to hear back",
          date: deadlineDate,
          formattedDate: new Date(deadlineDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
          detail: null,
          materials: null,
          expectedDate: activeQuery.responseDeadline ? new Date(activeQuery.responseDeadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "None set",
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

  /* v4 P3 — the auto-select FALLBACK, here because it needs the resolved sort: with queries on file
     and nothing selected (and no draft open), land on the first row the user can actually see. */
  useEffect(() => {
    if (creating || selectedQueryId || sortedList.length === 0) return;
    setSelectedQueryId(sortedList[0].id);
  }, [creating, selectedQueryId, sortedList]);

  /* Remember the last-viewed query (a preference, written on change only). */
  useEffect(() => {
    if (selectedQueryId) writeLastViewedQueryId(selectedQueryId);
  }, [selectedQueryId]);

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
          fill
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
             of the scrollport" was true of a grid row and is not true of a child of an overlay:
             nothing about `--wpg-reclaim-pad` is coupled to it on this page any more. Do not
             reinstate that coupling here — and note the warning still stands for any page that
             puts a dock back in row 4. */
          /* ⚠️ NO `toolbar` PROP (§1c). Search, Filter and Sort act on the LIST and nothing else,
             so they sit at the head of the list COLUMN rather than in a page-wide strip. The grid's
             row 2 is gone from this page entirely; `.wpg-scroll`'s own `padding-top` pays the
             18px gap instead, which is the grid's documented no-toolbar case ("two elements, one
             gap, never both") — so the rhythm is unchanged by the move. */
          /* ⚠️ NO `condensed` PROP EITHER (§2). It stripped the header band on `creating ||
             recording`, which was right while a journey REPLACED the page. A journey is an overlay
             now: the desk stays whole underneath it, band and all, and stripping the chrome behind
             a scrim would animate a page the writer is not looking at. */
          plate={
          <PageHeader
            variant="workspace"
            mark="queries"
            /* The workspace masthead: this page is a fixed-height master–detail surface, so
               header height is working area taken from the panes. The description is KEPT as a
               prop though compact doesn't render it — the copy stays where it lives, so bringing
               it back is a flag flip rather than a hunt. */
            /* ⚠️ RENAMED (Amendment 1, H2): "Queries Hub" → "Query Centre". The nav, the crumb
               and the page's own heading must say the same thing — a page whose sidebar entry
               and title disagree makes you check you are where you think you are. */
            title="Query Centre"
            /* ⚠️ THE COUNTS, NOT A DESCRIPTION (§1b). "Every query you've sent, and exactly where
               each one stands" told the reader what page they were on while they stood on it. These
               are two facts they cannot get by looking, and both come from `queryBucket` — the same
               function the filter pills and `getPrimaryAction` read — so the masthead cannot
               disagree with the list beneath it about whose turn anything is.
               ⚠️ MANUSCRIPT-SCOPED, NOT VIEW-SCOPED, matching `queriesPulse`'s existing rule: the
               status filter and the search narrow the LIST, not the page's own totals. */
            description={queriesMastheadCounts(mastheadScopedQueries)}
            /* ⚠️ A JOURNEY LEAVES THE ACTIONS EMPTY, AND THE `Close` THAT WAS HERE IS GONE. The
               reason the strip carries no actions during a journey is unchanged: `Log query` would
               start a SECOND journey on top of the open one, and disabling it leaves a dead control
               where the only useful action belongs.
               ⚠️ WHAT WENT WAS A DUPLICATE, NOT AN EXIT. `Close` called `closeCreate` /
               `closeRecord` — byte for byte the handlers the in-pane Cancel already calls — so the
               same act was offered twice, eight pixels apart, on the same screen. Cancel and Esc
               keep doing the job, on the journey's own header, which is where the writer is
               looking. The header BAND itself stays: it is the page's own chrome, it strips on
               `creating || recording`, and removing it would undo three packs of that work. */
            actions={creating || recording
              ? []
              : queries.length > 0
              ? [
                  {
                    label: "Export",
                    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12M7.5 10.5 12 15l4.5-4.5" /><path d="M4 19h16" /></svg>,
                    onClick: () => { if (sortedList.length > 0) handleExportFilteredCSV(); },
                  },
                  {
                    label: "Log query",
                    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>,
                    onClick: () => onNavigate?.("queries", "Log a query"),
                    primary: true,
                    // Already drafting? The CTA says so rather than looking live and doing nothing.
                    disabled: creating,
                  },
                ]
              : [
                  {
                    label: "Log query",
                    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>,
                    onClick: () => onNavigate?.("queries", "Log a query"),
                    primary: true,
                    // Already drafting? The CTA says so rather than looking live and doing nothing.
                    disabled: creating,
                  },
                ]}
          />
          }
        >

        {/* `&& !creating`: create mode lives in the populated branch, so without this a
            first-run "Log your first query" set a draft that NOTHING rendered — the CTA read as
            dead. Found during the re-entry work; see the report. */}
        {queries.length === 0 && !creating ? (
          /* ── Empty database — F12 shell: a list pane with a "No queries yet" placeholder
             (Export disabled) beside the welcome pane (Smart Import + manual add). ── */
          <>
          {/* Empty split — list placeholder + welcome pane in the centred column. f12-body-empty
              opts OUT of the mobile pusher: at <md the two panes stack instead (the welcome pane
              must never hide behind a push that has nothing to push to). */}
          <div className="f12-body f12-body-empty" style={{ paddingTop: "var(--gut)" }}>

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
                kind={a2.markKind}
                query={activeQuery}
                agent={activeAgent}
                triggerRef={markSentTriggerRef}
                onClose={() => setIsMarkSentOpen(false)}
                onRecordResponseInstead={() => {
                  setIsMarkSentOpen(false);
                  setIsRecordResponseFocusFormOpen(true);
                }}
                onSave={async ({ sentDate, responseDeadline, nudgeDate }) => {
                  await recordMaterialsSent({
                    queryId: activeQuery.id,
                    targetStatus: a2.target as QueryStatus.PARTIAL_SENT | QueryStatus.FULL_SENT,
                    sentDate,
                    isResubmit: a2.markKind === "resubmit",
                    responseDeadline,
                    nudgeDate,
                  });
                }}
              />
            );
          })()}
        </AnimatePresence>

        {/* Close-reasons menu — anchored upward off the Close ribbon tile */}
        {isCloseMenuOpen && activeQuery && (
          <>
            <div onClick={() => setIsCloseMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 59 }} aria-hidden="true" />
            <div style={{ ...closeMenuStyle, zIndex: 60, background: "#fffefb", border: "1px solid var(--bd)", borderRadius: 12, boxShadow: "0 12px 34px rgba(58,44,31,.18)", padding: 6, minWidth: 198 }}>
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
        <div className="f12-body">

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
            <div className="qc-count">
              {mastheadScopedQueries.length} {mastheadScopedQueries.length === 1 ? "query" : "queries"}
              <i>{mastheadScopedQueries.filter((q) => queryBucket(q.status as QueryStatus) === "waiting").length} AWAITING</i>
            </div>
            <span className="qc-sp" />
            {/* ⚠️ FILTER AND SORT LEFT THE SEARCH ROW (§1). They narrow the list, so they stay over
                the list — but the search does ONE job in the panel below and these two are controls
                on the set, not on the field. Wiring untouched: same handlers, same popovers, same
                refs, so every lock that reads them still reads them. */}
            <div className="f12-popwrap">
              <PillTrig
                ref={filterTrigRef}
                label="Filter"
                open={filterPopOpen}
                active={activeFilterCount > 0}
                count={activeFilterCount}
                onClick={() => { setSortPopOpen(false); setFilterPopOpen(o => !o); }}
                icon={<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18l-7 8v6l-4-2v-4L3 5z" /></svg>}
              />
              {filterPopOpen && renderFilterPopover()}
            </div>
            <div className="f12-popwrap">
              <PillTrig
                ref={sortTrigRef}
                label="Sort"
                open={sortPopOpen}
                active={sortKey !== "last_activity"}
                value={sortKey !== "last_activity" ? (F12_SORT_GROUPS.flatMap(g => g.items).find(i => i.key === sortKey)?.label || undefined) : undefined}
                onClick={() => { setFilterPopOpen(false); setSortPopOpen(o => !o); }}
                icon={<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v14M7 18l-3-3M7 18l3-3M17 20V6M17 6l-3 3M17 6l3 3" /></svg>}
              />
              {sortPopOpen && renderSortPopover()}
            </div>
          </div>

          {/* ⚠️ THE PANE'S VERBS CAME UP OUT OF THE HERO BAND (§1). They acted on the selected query
              from inside the card that names it, which reads as the card's own chrome; a query's
              verbs belong to the column, above the thing they change, on the same line as the list's.
              §2 settles WHICH verbs — this row is their seat. */}
          <div className="qc-phead">
            <span className="qc-who">THIS QUERY</span>
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
              /* ⚠️ NUDGE READS THE RULE THAT FIRES ITS TO-DO TASK, NOT A SECOND OPINION (§2).
                 `replyTaskFor` is `replyTask` with the input assembled once — the same call the
                 dashboard's urgent panel and the task generator make — so the button greys and
                 un-greys on exactly the condition that puts "Nudge due" on the to-do list.

                 ⚠️ `=== "nudge"`, NOT `!== "none"`. Past its window with `noResponseMeansNo` set,
                 the rule returns "close": the query IS overdue and joins §5's group, and chasing it
                 is the one thing the agency has told you not to do. The two consumers of one rule
                 are deliberately different SETS — see `replyOverdue`'s note. */
              const nudgeDue = replyTaskFor(activeQuery as never, activeAgent, Date.now()) === "nudge";
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
                    className="qc-btn qc-btn-pri"
                    onClick={() => openRecord(activeQuery)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" /></svg>
                    <span>{verbLabel}</span>
                  </button>
                  {/* ⚠️ DISABLED IS A LIGHTER BORDER AND A MUTED ICON, NEVER ABSENCE. A verb that
                      vanished when it did not apply would reflow the row every time the selection
                      moved between a query that is due a chase and one that is not — so the row
                      would never be in the same place twice. `title` says WHY, which absence cannot. */}
                  <button
                    type="button"
                    className={`qc-btn qc-btn-shrink${nudgeDue ? "" : " qc-btn-off"}`}
                    disabled={!nudgeDue}
                    title={nudgeDue ? "Send a nudge" : verbWaitingOnAgent ? "Not due yet — the agent's stated window has not passed" : "Nothing to chase — the agent is not holding this one"}
                    onClick={() => setIsNudgeOpen(true)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>
                    <span>Nudge</span>
                  </button>
                  {/* The rule divides what continues the conversation from what ends it. */}
                  <span className="qc-sep" aria-hidden="true" />
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
                  {/* ⚠️ REPORTED, NOT RESOLVED — `Download as PDF` HAS NO SEAT IN THE PACK. §2 names
                      four verbs and rehomes four other controls "to where its subject is named";
                      this one's subject IS the query, so by the pack's own test it cannot move, and
                      it is not among the four. Deleting a live control to make a list of four come
                      out right is the one thing that would definitely be wrong, so it stays — as an
                      icon at every width, which keeps the four LABELLED verbs reading as four.
                      Nick's call whether it belongs here at all. */}
                  <span className="qc-sep" aria-hidden="true" />
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
                <button type="button" className="qc-btn qc-btn-pri" disabled tabIndex={-1}>
                  <svg viewBox="0 0 24 24"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" /></svg>
                  <span>Record response</span>
                </button>
                <button type="button" className="qc-btn qc-btn-shrink" disabled tabIndex={-1}>
                  <svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>
                  <span>Nudge</span>
                </button>
                <span className="qc-sep" />
                <button type="button" className="qc-btn qc-btn-shrink" disabled tabIndex={-1}>
                  <svg viewBox="0 0 24 24"><path d="M9 11l3 3 8-8M21 12a9 9 0 1 1-6.2-8.5" /></svg>
                  <span>Mark closed</span>
                </button>
                <button type="button" className="qc-btn qc-btn-shrink qc-btn-danger" disabled tabIndex={-1}>
                  <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></svg>
                  <span>Delete</span>
                </button>
                <span className="qc-sep" />
                <button type="button" className="qc-btn qc-btn-icon" disabled tabIndex={-1}>
                  <svg viewBox="0 0 24 24"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" /></svg>
                </button>
              </span>
            )}
          </div>

          {/* ── List pane (F12, ref queries-hub-v14.html .list): search field only at the top,
              56px rows, slim footer (SHOWING n OF m · EXPORT CSV · key hints). No "your move"
              pills, no manuscript spine — the row is avatar · name/agency · StatusDot + date. ── */}
          <div className="f12-list">
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
              {/* ⚠️ FILTER AND SORT ARE GONE FROM THIS ROW (§1) — they are in the control cell above
                  the panel now, beside the count they narrow. What is left does ONE job: search. */}
            </div>
            <div ref={listScrollRef} className="f12-rows" role="listbox" aria-label="Queries">
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
                const nowMs = Date.now();
                const rows = renderList
                  .map((q) => ({ q, agent: agents.find((a) => a.id === q.agentId), ms: manuscripts.find((m) => m.id === q.manuscriptId) }))
                  .filter((r) => !!r.agent && !!r.ms);
                const grouped = GROUP_ORDER
                  .map((g) => ({ g, items: rows.filter((r) => listGroupFor(r.q as never, r.agent, nowMs) === g) }))
                  .filter((s) => s.items.length > 0);
                return grouped.map(({ g, items }) => {
                  /* ⚠️ THE FOLD IS THE CLOSED GROUP'S ALONE, and it is only offered once folding
                     earns its place — see `foldClosed`. A first-time writer with two rejections
                     behind them sees both. */
                  const foldable = g === "closed" && foldClosed(items.length);
                  /* ⚠️ AND A FOLD NEVER HIDES THE ROW THE PANE IS READING. Measured on dev: the
                     auto-select picks `sortedList[0]`, which is first in SORT order and has nothing
                     to do with group order — so the opening selection was a closed query, and the
                     list folded away the only row that was marked. A reading pane whose subject
                     cannot be found in the list beside it is the shell's own
                     "the selector never marks a row that is not rendered" fault, one page over.

                     ⚠️ DERIVED, NOT AN EFFECT THAT OPENS THE FOLD. Setting state on selection would
                     leave the group open after the writer moved away, so the fold would drift open
                     over a session and the writer would never have asked for it. This reads the
                     selection every render: open while you are in there, shut the moment you leave. */
                  const holdsSelection = foldable && items.some((r) => r.q.id === selectedQueryId);
                  const shut = foldable && !closedOpen && !holdsSelection;
                  return (
                <React.Fragment key={g}>
                  <div className={`qc-gh${g === "overdue" ? " qc-gh-od" : ""}${foldable ? " qc-gh-fold" : ""}`}
                    {...(foldable ? { role: "button", tabIndex: 0, onClick: () => setClosedOpen((o) => !o),
                      onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setClosedOpen((o) => !o); } },
                      "aria-expanded": !shut } : {})}>
                    <span>{GROUP_LABEL[g]} · {items.length}</span>
                    <i aria-hidden="true" />
                    {foldable && <em>{shut ? "show" : "hide"}</em>}
                  </div>
                  {!shut && items.map(({ q, agent, ms }) => {
                const isSelected = selectedQueryId === q.id;
                /* ⚠️ THE RIGHT-HAND FIGURE IS A POSITION, NOT A DATE (§5) — days left while the
                   agent's window is open, days late once it has passed, and the date itself for the
                   two groups where neither is meaningful. The date fallback is the ORIGINAL
                   behaviour and is what an unplaceable row keeps. */
                const figure = rowFigure(q as never, agent, nowMs);
                const figureLabel = figureText(figure) ?? formatListRowDate(q.dateSent) ?? "—";
                const queriedDate = figureLabel;
                return (
                  <button
                    key={q.id}
                    type="button"
                    id={`query-row-${q.id}`}
                    role="option"
                    aria-selected={isSelected}
    // v4 P2 — clicking another row while drafting is a click-away: resolve the
                    // draft first (silently when untouched, with a confirm when dirty), then
                    // select. pickRow also pushes to detail below md (Mobile Pass 1).
                    onClick={() => (creating ? closeCreate(() => pickRow(q.id)) : pickRow(q.id))}
                    className={`f12-row${isSelected ? " f12-sel" : ""}${g === "overdue" ? " f12-row-od" : ""}${settleId === q.id ? " f12-settle" : ""}${landedId === q.id ? " qc-landed" : ""}${graceRow?.id === q.id && graceRow.leaving ? " f12-row-leaving" : ""}`}
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
                    <span className="f12-av f12-av--sm" aria-hidden="true">{agentInitials(agent)}</span>
                    <span className="f12-mid">
                      <span className="f12-nm">{agentPrimary(agent)}</span>
                      <span className="f12-ag">{agentAgencyLine(agent)}</span>
                    </span>
                    <span className="f12-end">
                      {undoingQueryIds.has(q.id) ? (
                        /* ⚠️ NO BURGUNDY IN THE LIST (§4) — and this is the only place it was left.
                           These three dots mark a row whose undo is in flight; burgundy means
                           OUTGOING on the StatusDot in the same row, so a transient indicator was
                           borrowing a colour that means something else two columns over. Muted ink
                           says "working" without claiming a state. */
                        <span className="animate-pulse" style={{ display: "inline-flex", gap: 3 }} aria-hidden="true">
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--muted)" }} />
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--muted)" }} />
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--muted)" }} />
                        </span>
                      ) : (
                        <StatusDot status={q.status} overrideSize={15} />
                      )}
                      <span className={`f12-d2${figure.kind === "late" ? " f12-d2-late" : ""}`}>{queriedDate}</span>
                    </span>
                  </button>
                );
                  })}
                </React.Fragment>
                  );
                });
              })()}
              {sortedList.length === 0 && queries.length > 0 && (
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
            className="qp-pane f12-detail f12-pane-enter-read"
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
                  .qp-noteacts{ opacity:0; transition:opacity .14s; }
                  .qp-note:hover .qp-noteacts{ opacity:1; }
                  .qp-noteact{ width:22px; height:22px; border:none; background:transparent; border-radius:5px; color:var(--qc-tx-noteact); display:flex; align-items:center; justify-content:center; cursor:pointer; }
                  .qp-noteact:hover{ background:var(--qc-surf-noteact-h); color:var(--burg); }
                `}</style>
                {/* ── Agent header (F12, ref .hero) — SAGE LEFT SPINE (::before in f12.css, clipped
                    by the card radius via overflow:hidden; there is NO top accent rule), pink avatar
                    with black initials, Playfair name, agency, pink status pill, plane ornament. ── */}
                {(() => {
                  const nameplate = agentPrimary(activeAgent);
                  const initials = agentInitials(activeAgent);
                  /* ⚠️ THE CTA DERIVATIONS WENT WITH THE BUTTONS (§1). `heroAction`, `heroIsMark`,
                     `heroLabel`, `heroTaskCount` and `heroWaitingOnAgent` all existed to feed the
                     primary and the kebab; both now compute in the control cell that renders them,
                     from the SAME `getPrimaryAction` call. Leaving the derivations here would have
                     been a second reading of whose turn it is, in a band that no longer acts. */
                  /* ⚠️ THROUGH `refDate`, WHICH OMITS RATHER THAN PRINTING "Invalid Date". Undated
                     imports exist, and `new Date(junk).toLocaleDateString()` is a literal string
                     this app has shown a writer before. */
                  const heroQueriedOn = refDate((activeQuery as { dateSent?: unknown }).dateSent);
                  return (
                    /* ⚠️ A BAND, NOT A BOX INSIDE A PANE OF BOXES (§1h). This was a bordered,
                       shadowed, sage-spined card sitting above three more cards — four framed
                       objects stacked, so nothing in the pane was more important than anything
                       else. It is one row beneath the masthead now, closed by a single rule.

                       ⚠️ IT TAKES THE QUERIED DATE AND LEAVES THE LIVE PAIR TO TRACKING. The date is
                       STATIC and belongs to identity — when this went out. "Days waiting" and
                       "expected by" move, and they are the two numbers Tracking's progress bar reads
                       against, so they stay where the bar is. Splitting them this way is what stops
                       either surface restating the other. */
                    <div className="f12-heroband" style={{ flexShrink: 0 }}>
                      <span className="f12-bigav" aria-hidden="true">{initials}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* ⚠️ THE NAME IS THE LINK TO THE AGENT RECORD (§2). The ⋯ carried an `Agent`
                            item that was permanently `disabled` — a verb with a subject and no
                            destination — and the destination it wanted is the agent list, which is
                            where the record lives. Naming a thing and making the name the way to it
                            is the whole of §2's relocation rule.

                            ⚠️ PLAIN TEXT WITH NO BRIDGE. `onNavigate` is optional on this page; a
                            link rendered without one would be a dead link, which this app does not
                            draw. It degrades to the heading it already was. */}
                        <div className="f12-hn" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {onNavigate ? (
                            <button type="button" className="qp-hlink" onClick={() => onNavigate("agents")} title="Open the agent list">{nameplate}</button>
                          ) : nameplate}
                        </div>
                        {/* ⚠️ ONE META LINE, NOT TWO STACKED. Agency and the queried date are both
                            quiet facts about this record; giving each its own line made a three-line
                            block out of a row. Either half omits itself when absent. */}
                        {/* ⚠️ THE AGENCY ALONE (§6). The queried date left this line for the state's
                            own caption on the right, where "when did it last move" belongs beside
                            "where does it stand". The interpunct rule survives for the case where a
                            second fact is ever added back — it draws only between siblings. */}
                        <div className="f12-hmeta">
                          {!!activeAgent.name?.trim() && !!activeAgent.agency?.trim() && (
                            <span>{activeAgent.agency}</span>
                          )}
                        </div>
                        {/* ⚠️ EMAIL AND WEBSITE ARE PILLS BENEATH THE AGENCY (§2), NOT MENU ITEMS.
                            Their subject is the AGENT, who is named on the line above them — which
                            is the rule; in a ⋯ headed "Actions for this query" they were two
                            contact details filed under the wrong noun.

                            ⚠️ AND THEY GREY RATHER THAN VANISH when the record holds no address or
                            URL, for the same reason Nudge does: an absent pill states nothing, a
                            grey one states that this agent has no email on file — which is a fact,
                            and often the one worth acting on. */}
                        <div className="qp-hlinks">
                          <a
                            className={`qp-lnk${activeAgent.email?.trim() ? "" : " qp-lnk-off"}`}
                            href={activeAgent.email?.trim() ? `mailto:${activeAgent.email.trim()}` : undefined}
                            title={activeAgent.email?.trim() || "No email address on this agent's record"}
                            aria-disabled={activeAgent.email?.trim() ? undefined : true}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v14H3zM3 5l9 7 9-7" /></svg>
                            Email
                          </a>
                          <a
                            className={`qp-lnk${agentWebsiteHref(activeAgent.website) ? "" : " qp-lnk-off"}`}
                            href={agentWebsiteHref(activeAgent.website) ?? undefined}
                            target="_blank"
                            rel="noreferrer noopener"
                            title={agentWebsiteHref(activeAgent.website) ?? "No website on this agent's record"}
                            aria-disabled={agentWebsiteHref(activeAgent.website) ? undefined : true}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" /></svg>
                            Website
                          </a>
                        </div>
                      </div>
                      {/* ⚠️ THE STATE, PLAIN (§6) — Playfair word, dot OUTBOARD of it, and beneath
                          the word only the date of the most recent development. The dot is the real
                          `StatusDot`: burgundy outgoing, sage incoming, grey closed, from the locked
                          component, never a recreation.

                          ⚠️ AND THE DATE IS `lastStatusChange`, NOT `dateSent`. The send date is
                          where the story starts and Tracking's first rung already carries it; what
                          belongs beside a STATE is when the query last entered one. It falls back to
                          the send date only when nothing has happened since — which is true rather
                          than a substitution, because on a query with no developments the send IS
                          the most recent one. Both go through `refDate`, which omits an unparseable
                          value rather than printing "Invalid Date". */}
                      <span className="f12-hs">
                        <span>
                          <span className="f12-hsw">{statusDisplayLabel(activeQuery)}</span>
                          {(() => {
                            const moved = refDate((activeQuery as { lastStatusChange?: unknown }).lastStatusChange) || heroQueriedOn;
                            return moved ? <div className="f12-hsd">{moved}</div> : null;
                          })()}
                        </span>
                        <StatusDot status={activeQuery.status} overrideSize={26} />
                      </span>
                      {/* ⚠️ THE PRIMARY AND THE KEBAB LEFT THIS BAND (§1). They act on the query, not
                          on the identity card that names it, and they now sit in the pane's control
                          cell above — on the same line as the list's count, which is what makes the
                          two columns read as one interface rather than two panels with their own
                          chrome. The band keeps IDENTITY: who, where, what state, when. */}
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
                {/* ⚠️ THE RIGHT COLUMN IS `--listw`, THE SAME TOKEN THE LIST READS (alignment
                    amendment). It was `1.15fr 0.85fr`, which made the pane's narrow column a
                    PROPORTION of whatever width was left — measured 245px against the list's 334,
                    so the work area's two narrow columns were two different widths at every
                    viewport and neither could line up with the other. One token, two consumers, and
                    the two match at 1180 as exactly as they do at 1680.

                    ⚠️ AND NO SIDE PADDING. It carried `16px 20px 20px`, which inset the cards from
                    the pane column's own edges — the same fault as the hero's margin, and the
                    reason content sat 20px from the right wall while the list sat hard against the
                    left. The top 16 stays: it is the CARD GAP between the header plate and the
                    cards, the same 16 the grid uses between them. The bottom is the work area's,
                    paid once by the row. */}
                <div className="qp-cols" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) var(--listw)", gap: 16, padding: 0, flex: 1, minHeight: 0, alignItems: "stretch" }}>

                  {/* ── Sub-card 1: Tracking ── */}
                  <PaneCard
                    title="Tracking"
                    /* ⚠️ THE META IS THE STATUS, FROM THE ONE DERIVATION. `statusDisplayLabel` is what
                       the hero band's badge reads, so the band and the card cannot disagree about
                       what state this query is in. */
                    meta={statusDisplayLabel(activeQuery)}
                    /* ⚠️ `View tasks` LANDED HERE WHEN THE ⋯ WENT (§2), AND THE PACK DOES NOT NAME IT.
                       §2's rule for everything that is not one of the four verbs is "moves to where
                       its subject is named" — and this query's outstanding work is named in
                       Tracking, which is the card about where the query stands over time. The count
                       is the existing `queryTaskBadge`, never a fresh tally.

                       ⚠️ ABSENT AT ZERO, not "0 TASKS". A control that opens a drawer onto nothing
                       is a control that lies about having something to show. */
                    action={queryTaskBadge(tasks, activeQuery.id).count > 0 ? (
                      <button
                        ref={tasksTrigRef}
                        type="button"
                        className="qp-cardact"
                        onClick={() => setIsTasksOpen(true)}
                        title="View this query's tasks"
                      >
                        {queryTaskBadge(tasks, activeQuery.id).count} {queryTaskBadge(tasks, activeQuery.id).count === 1 ? "TASK" : "TASKS"}
                      </button>
                    ) : undefined}
                    glyph={<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h4l3 8 4-16 3 8h4" /></svg>}
                  >
                      <PaneScroll scrollClassName="f12-quiet-scroll" outerStyle={{ flex: 1, minHeight: 0 }} scrollStyle={{ padding: "0 0 18px" }}>
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
                          const cells: { key: string; glyph: React.ReactNode; value: string; unit?: string; caption: string }[] = [];
                          if (amb.mode === "waiting" && amb.sentMs != null) {
                            cells.push({
                              key: "waiting",
                              glyph: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>,
                              value: String(amb.nDays), unit: amb.nDays === 1 ? "day" : "days", caption: "Waiting so far",
                            });
                          }
                          if (amb.expMs != null) {
                            cells.push({
                              key: "expected",
                              glyph: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3.5v3M16 3.5v3" /></svg>,
                              value: new Date(amb.expMs).toLocaleDateString("en-GB", { day: "numeric" }),
                              unit: new Date(amb.expMs).toLocaleDateString("en-GB", { month: "short" }),
                              caption: "Reply expected by",
                            });
                          }
                          if (!cells.length) return null;
                          return (
                            <div className="qp-stats">
                              {cells.map((c) => (
                                <div className="qp-stat" key={c.key}>
                                  <span className="qp-statgl" aria-hidden="true">{c.glyph}</span>
                                  <div>
                                    <div className="qp-statn">{c.value}{c.unit && <small> {c.unit}</small>}</div>
                                    <div className="qp-statk">{c.caption}</div>
                                  </div>
                                </div>
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
                              onDeleteEntry={onDeleteEntry}
                              onNudge={() => setIsNudgeOpen(true)}
                              onSetExpectedDate={() => openEditQuery(activeQuery.id)}
                              /* ⚠️ THE PICKER'S THIRD AND LAST HOME (§2). It anchors off the word it
                                 changes, so `methodPickTrigRef` is now a callback ref set by the
                                 in-place button rather than by a kebab that no longer exists — see
                                 the mount just below, which had to move with it. */
                              onEditSendMethod={(anchor) => {
                                (methodPickTrigRef as React.MutableRefObject<HTMLElement | null>).current = anchor;
                                setMethodPickOpen(true);
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
                        <F12Menu open={methodPickOpen} onClose={() => setMethodPickOpen(false)} style={methodPickMenuStyle} ariaLabel="Change send method"
                          items={[SubmissionMethod.EMAIL, SubmissionMethod.ONLINE_FORM, SubmissionMethod.QUERY_MANAGER, SubmissionMethod.POST].map((m) => ({
                            label: sentViaLabel(m),
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
                  <div className={`qp-stack${notesOpen ? " qp-stack--open" : ""}`} ref={notesStackRef}>

                  {/* ── Sub-card 2: What you sent ── */}
                  <PaneCard
                    title="What you sent"
                    /* ⚠️ COUNTED FROM THE LIST THE BODY RENDERS, never a second read of the query.
                       `baseMaterialsFor` is what this card's own spec sheet walks, so the band's
                       figure and the rows beneath it cannot come apart. */
                    meta={(() => {
                      const n = baseMaterialsFor(activeQuery, activeAgent).length;
                      return n > 0 ? `${n} item${n === 1 ? "" : "s"}` : undefined;
                    })()}
                    glyph={<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>}
                  >
                      {/* spec sheet */}
                      <PaneScroll scrollClassName="f12-quiet-scroll" outerStyle={{ flex: 1, minHeight: 0 }} scrollStyle={{ padding: "16px 16px 18px" }}>
                        {(() => {
                          // Phase 6 — the query's own materialsWanted is the record of what was sent; when
                          // empty we display the agent's expected set (the first edit promotes it onto the
                          // query). Each material is Query letter / Synopsis / a Sample item (type+quantity).
                          const base = baseMaterialsFor(activeQuery, activeAgent);
                          const qlSent = base.some(isQueryLetterMat);
                          const synSent = base.some(isSynopsisMat);
                          const sampleItem = base.find(isSampleMat) ?? null;
                          const linkedPackage = activeQuery.packageId ? packages.find(p => p.id === activeQuery.packageId) : null;
                          const pkgComponents = linkedPackage
                            ? [["Query letter", linkedPackage.queryLetterVersionId], ["Synopsis", linkedPackage.synopsisVersionId], ["Sample pages", linkedPackage.samplePagesVersionId]].filter(([, v]) => !!v).map(([l]) => l as string)
                            : [];
                          const isPro = currentUser?.plan === UserPlan.PRO;
                          const openPackages = () => onNavigate?.("manuscripts", "Submission packages");
                          const method = sentViaLabel(activeQuery.sendMethod || activeAgent.submissionMethod);
                          // dateSent is optional (undated imports) — render the date only when present, never invent one.
                          const sentDate = activeQuery.dateSent ? new Date(activeQuery.dateSent).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";

                          const proChip = (auto?: boolean) => (<span style={{ ...(auto ? { marginLeft: "auto" } : { marginLeft: 6 }), fontFamily: FONT_MONO, fontSize: 7.5, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#fff", background: "#6A89A7", borderRadius: 6, padding: "3px 7px", whiteSpace: "nowrap" as const }}>PRO</span>);
                          const addlinkStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "'Inter',sans-serif", fontSize: 12, color: "var(--qc-tx-quiet)", marginTop: 14, cursor: "pointer" };
                          const eyebrow: React.CSSProperties = { fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: ".12em", textTransform: "uppercase" as const, color: "var(--qc-tx-quiet)", margin: "18px 0 2px" };

                          // A material a query either did or didn't send — the whole row toggles it (writes
                          // materialsWanted). Un-marking is a CORRECTION to a factual record: a plain field
                          // patch, never a timeline-log entry (consistent with the corrections model).
                          const sentPip = (sent: boolean) => (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: ".06em", textTransform: "uppercase" as const, color: sent ? "#4a5d45" : burgundy }}>
                              {sent ? "Sent" : "Mark sent"}
                              <span style={{ width: 16, height: 16, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 9, flexShrink: 0, ...(sent ? { background: "var(--qc-acc-sage-tick)", color: "var(--qc-acc-sage-tick-i)" } : { border: "1.5px dashed #cfc3b1", color: "transparent" }) }}>✓</span>
                            </span>
                          );
                          const docRow = (kind: "query" | "synopsis", label: string, sent: boolean, gtype: ComponentType) => (
                            <button type="button" onClick={() => toggleDocMaterial(activeQuery, activeAgent, kind)} title={sent ? `Un-mark ${label.toLowerCase()} as sent` : `Mark ${label.toLowerCase()} as sent`}
                              style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", textAlign: "left", padding: "11px 0", background: "none", border: "none", borderBottom: "1px solid var(--bd)", cursor: "pointer", fontFamily: "'Inter',sans-serif", fontSize: 13.5, color: sent ? "var(--hub-item, #1a1512)" : "#8f877b" }}>
                              <TypeGlyph type={gtype} size={16} style={{ flexShrink: 0, color: sent ? "#6f4e37" : "#b3a596" }} />
                              <span style={{ flex: 1, minWidth: 0 }}>{label}</span>
                              {sentPip(sent)}
                            </button>
                          );

                          const openSampleEditor = () => {
                            if (sampleItem && typeof sampleItem !== "string" && sampleItem.type && sampleItem.type !== "other") { setSampleUnit(sampleItem.type); setSampleQty(sampleItem.quantity != null ? String(sampleItem.quantity) : ""); }
                            else { setSampleUnit("pages"); setSampleQty(""); }
                            setSampleEditorOpen(true);
                          };
                          const sampleRow = (
                            <div style={{ padding: "11px 0", borderBottom: "1px solid var(--bd)", fontFamily: "'Inter',sans-serif", fontSize: 13.5 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 11, color: sampleItem ? "var(--hub-item, #1a1512)" : "#8f877b" }}>
                                <TypeGlyph type={ComponentType.SAMPLE_PAGES} size={16} style={{ flexShrink: 0, color: sampleItem ? "#6f4e37" : "#b3a596" }} />
                                <span style={{ flex: 1, minWidth: 0 }}>Sample materials<span style={{ color: "var(--qc-tx-quiet)" }}> — {sampleItem ? sampleMaterialText(sampleItem) : "Not included"}</span></span>
                                {sampleItem ? (
                                  <span style={{ display: "inline-flex", gap: 13 }}>
                                    <button type="button" onClick={openSampleEditor} title="Change the sample you sent" style={{ fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: ".06em", textTransform: "uppercase" as const, color: burgundy, background: "none", border: "none", cursor: "pointer", padding: 0 }}>Change</button>
                                    <button type="button" onClick={() => removeSampleMaterial(activeQuery, activeAgent)} title="Clear the sample materials" style={{ fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: ".06em", textTransform: "uppercase" as const, color: "var(--qc-tx-quiet)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Remove</button>
                                  </span>
                                ) : (
                                  <button type="button" onClick={openSampleEditor} title="Set the sample you sent" style={{ fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: ".06em", textTransform: "uppercase" as const, color: burgundy, background: "none", border: "none", cursor: "pointer", padding: 0 }}>＋ Add</button>
                                )}
                              </div>
                              {sampleEditorOpen && (
                                <div style={{ marginTop: 11 }}>
                                  {/* unit toggle — Pages / Chapters / Words (→ QueryMaterial.type). Selected =
                                      inset ink ring, no fill; unselected stay plain/muted. */}
                                  <div role="group" aria-label="Sample unit" style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid var(--bd)" }}>
                                    {(["pages", "chapters", "words"] as const).map((u) => (
                                      <button key={u} type="button" onClick={() => setSampleUnit(u)} aria-pressed={sampleUnit === u}
                                        style={{ flex: 1, padding: "6px 0", fontFamily: "'Inter',sans-serif", fontSize: 12, textTransform: "capitalize" as const, cursor: "pointer", border: "none", background: "var(--panel, #fffdfb)", boxShadow: sampleUnit === u ? "inset 0 0 0 1.5px var(--ink, #1e1a16)" : "none", color: sampleUnit === u ? "var(--ink, #1e1a16)" : "#6b6257", fontWeight: sampleUnit === u ? 600 : 400 }}>{u}</button>
                                    ))}
                                  </div>
                                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                    <input type="text" inputMode="numeric" value={sampleQty} onChange={(e) => setSampleQty(e.target.value)} aria-label="Quantity"
                                      style={{ flex: 1, minWidth: 0, padding: "7px 10px", fontFamily: "'Inter',sans-serif", fontSize: 13, border: "1px solid var(--bd)", borderRadius: 8, background: "var(--panel, #fffdfb)", color: "var(--hub-item, #1a1512)" }} />
                                    <button type="button" onClick={() => saveSampleMaterial(activeQuery, activeAgent)} disabled={!sampleQty.trim()} style={{ padding: "7px 16px", fontFamily: "'Inter',sans-serif", fontSize: 12.5, fontWeight: 600, color: burgundy, background: "var(--qc-acc-pink-save)", border: "1px solid var(--qc-rim-pink)", borderRadius: 8, cursor: sampleQty.trim() ? "pointer" : "default", opacity: sampleQty.trim() ? 1 : 0.5 }}>Save</button>
                                    <button type="button" onClick={() => setSampleEditorOpen(false)} style={{ padding: "7px 10px", fontFamily: "'Inter',sans-serif", fontSize: 12.5, color: "var(--qc-tx-quiet)", background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );

                          return (
                            <>
                              {/* ⚠️ THE MANUSCRIPT'S NAME IS BACK, AND IT IS BACK AS THE HEADING (§2) — this
                                  REVERSES fix pack 4 §5, which deleted the block, and it reverses it on the
                                  pack's own terms rather than by preference.

                                  What that pack argued was that title, genre and word count are facts about
                                  the BOOK, not about this send — true, and still true. What has changed is
                                  that the ⋯ carried a permanently-disabled `Manuscript` verb, and §2's rule
                                  for it is "moves to where its subject is named". The subject was named
                                  nowhere on this pane, so there was nowhere for it to move TO. Naming it
                                  here gives the verb its home and the card its subject in one row: what you
                                  sent, of what.

                                  ⚠️ ONE ROW, NOT THE OLD BLOCK. Title as a link, then genre and word count
                                  as a single mono line — the ref's shape. The three-line block fix pack 4
                                  removed does not come back with it.

                                  ⚠️ AND IT RESTORES THE REASSIGN SHORTCUT THAT PACK FLAGGED AS A REAL LOSS:
                                  the name goes to the manuscript, where the record is. */}
                              <div className="qp-msrow">
                                {onNavigate ? (
                                  <button type="button" className="qp-msname" onClick={() => onNavigate("manuscripts")} title="Open your manuscripts">{activeMs.title}</button>
                                ) : (
                                  <span className="qp-msname">{activeMs.title}</span>
                                )}
                                {/* ⚠️ EACH HALF OMITS ITSELF. A manuscript with no genre recorded must not
                                    print an interpunct with nothing on one side of it, and one with no word
                                    count must not print "0 WORDS" — zero words is a claim, absence is not. */}
                                {(!!activeMs.genre || !!activeMs.wordCount) && (
                                  <div className="qp-msmeta">
                                    {[activeMs.genre || null, activeMs.wordCount ? `${activeMs.wordCount.toLocaleString()} words` : null]
                                      .filter(Boolean).join(" · ")}
                                  </div>
                                )}
                              </div>

                              {/* ⚠️ THE "SENT BY … · 13 AUG" LINE STAYS GONE (fix pack 6 §4) — both facts are
                                  stated by Tracking's `Query sent` event, and a card that opens by repeating
                                  the event beside it delays the thing it exists to show. §2 moves the PICKER
                                  onto that event instead: `Query sent · via email`, editable in place. */}

                              {/* Materials sent — the document rows (Query letter / Synopsis / Sample materials) */}
                              <div style={eyebrow}>Materials sent</div>
                              <div>
                                {docRow("query", "Query letter", qlSent, ComponentType.QUERY_LETTER)}
                                {docRow("synopsis", "Synopsis", synSent, ComponentType.SYNOPSIS)}
                                {sampleRow}
                              </div>

                              {/* Submission package (PRO) — the foot row */}
                              {linkedPackage ? (
                                <div style={{ marginTop: 14 }}>
                                  <div style={{ border: "1px solid #cfd9e2", background: "#f4f7fa", borderRadius: 11, padding: "12px 14px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 13.5, color: "#2e4257" }}>
                                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2e4257" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
                                      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{linkedPackage.packageName}</span>
                                      {proChip(true)}
                                    </div>
                                    {pkgComponents.length > 0 && <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11.5, color: "#5a6e80", marginTop: 5 }}>{pkgComponents.join(" · ")}</div>}
                                  </div>
                                  <div role="button" tabIndex={0} onClick={openPackages} style={addlinkStyle}>✎ Edit package</div>
                                </div>
                              ) : isPro ? (
                                <div role="button" tabIndex={0} onClick={openPackages} style={addlinkStyle}>＋ Attach a submission package</div>
                              ) : (
                                /* Free — attaching stays Pro-gated; the action reads Upgrade (slate) and routes
                                   to the plans/upgrade flow, the same plan check the rest of the app uses. */
                                <div role="button" tabIndex={0} onClick={() => onNavigate?.("plans")} style={{ ...addlinkStyle, color: "#6A89A7" }}>Upgrade to attach a submission package{proChip()}</div>
                              )}
                            </>
                          );
                        })()}
                      </PaneScroll>
                  </PaneCard>

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
                    action={(
                      <button
                        type="button"
                        className="qp-cardact qp-cardexp"
                        aria-expanded={notesOpen}
                        title={notesOpen ? "Collapse notes" : "Expand notes"}
                        aria-label={notesOpen ? "Collapse notes" : "Expand notes"}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (notesOpen) { setNotesOpen(false); setNotesFloor(null); return; }
                          const h = notesStackRef.current?.getBoundingClientRect().height ?? null;
                          setNotesFloor(h && h > 0 ? h : null);
                          setNotesOpen(true);
                        }}
                      >
                        {notesOpen ? (
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" /></svg>
                        ) : (
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                        )}
                      </button>
                    )}
                    cardRef={notesCardRef as unknown as React.Ref<HTMLElement>}
                    className={notesOpen ? "qp-notes-open" : undefined}
                    style={notesOpen && notesFloor ? { minHeight: notesFloor } : undefined}
                  >
                      {/* notes body — list (scrolls) + bottom-pinned composer */}
                      <div style={{ padding: "16px 16px 18px", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                        {(() => {
                          const notes = journalEntries
                            .filter(entry => entry.queryId === activeQuery.id)
                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // newest first
                          const send = () => { const t = journalInput.trim(); if (!t) return; addJournalEntry(activeQuery.id, t); setJournalInput(""); };
                          return (
                            <>
                              <PaneScroll scrollClassName="f12-quiet-scroll" outerStyle={{ flex: 1, minHeight: 0 }} scrollStyle={{ display: "flex", flexDirection: "column", paddingRight: 2 }}>
                                {notes.length === 0 ? (
                                  /* ghost first entry — DOTTED outline, no fill (a placeholder that looks
                                     like one; ref .note); replaced on first save */
                                  <div className="f12-note">
                                    <div className="f12-nd">TODAY</div>
                                    <div className="f12-nt">Your notes on this query appear here — first impressions, things they said, anything worth remembering.</div>
                                  </div>
                                ) : notes.map((entry) => {
                                  const isEditing = editingJournalId === entry.id;
                                  return (
                                    <div key={entry.id} className="qp-note" style={{ borderRadius: 12, padding: "11px 13px", marginBottom: 9 }}>
                                      {isEditing ? (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                          <textarea value={editingJournalText} onChange={(e) => setEditingJournalText(e.target.value)} autoFocus rows={2} style={{ width: "100%", fontFamily: "'Inter',sans-serif", fontSize: 13, color: "var(--qc-tx-input)", border: "1px solid var(--qc-rim-composer)", borderRadius: 7, padding: "6px 8px", outline: "none", resize: "vertical", background: "#fff" }} />
                                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                                            <button type="button" onClick={() => setEditingJournalId(null)} style={{ fontFamily: FONT_MONO, fontSize: 9, textTransform: "uppercase" as const, letterSpacing: ".04em", background: "transparent", border: "none", color: "var(--qc-tx-cancel)", cursor: "pointer" }}>Cancel</button>
                                            <button type="button" onClick={async () => { if (!editingJournalText.trim()) return; await updateJournalEntry(entry.id, editingJournalText.trim()); setEditingJournalId(null); }} style={{ fontFamily: FONT_MONO, fontSize: 9, textTransform: "uppercase" as const, letterSpacing: ".04em", background: burgundy, color: "#fff", border: "none", borderRadius: 6, padding: "5px 11px", cursor: "pointer" }}>Save</button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: "var(--qc-tx-note)", lineHeight: 1.48, whiteSpace: "pre-wrap" }}>{entry.entryText}</div>
                                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 9 }}>
                                            <span style={{ fontFamily: FONT_MONO, fontSize: 8, color: "var(--qc-tx-stamp)", letterSpacing: ".08em", textTransform: "uppercase" as const }}>{formatWhatsAppDate(entry.createdAt)}</span>
                                            <div className="qp-noteacts" style={{ display: "flex", gap: 4 }}>
                                              <button type="button" title="Edit" onClick={() => { setEditingJournalId(entry.id); setEditingJournalText(entry.entryText); }} className="qp-noteact"><Pencil style={{ width: 12, height: 12 }} /></button>
                                              <button type="button" title="Delete" onClick={() => showConfirm({ title: "Delete this note?", danger: true, confirmLabel: "Delete", cancelLabel: "Keep it", body: <p style={{ margin: 0 }}>This note will be removed from the query's record.</p>, onConfirm: () => deleteJournalEntry(entry.id) })} className="qp-noteact"><Trash2 style={{ width: 12, height: 12 }} /></button>
                                            </div>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  );
                                })}
                              </PaneScroll>
                              {/* composer — pinned to the column foot */}
                              <div style={{ marginTop: 12, background: "var(--qc-surf-composer)", border: "1px solid var(--qc-rim-composer)", borderRadius: 10, padding: "9px 10px 9px 13px", display: "flex", alignItems: "flex-end", gap: 9, boxShadow: "0 1px 2px rgba(58,28,20,0.04)", flexShrink: 0 }}>
                                <textarea
                                  value={journalInput} rows={1} placeholder="Write a note…"
                                  onChange={(e) => { setJournalInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
                                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); (e.target as HTMLTextAreaElement).style.height = "auto"; } }}
                                  style={{ flex: 1, border: "none", outline: "none", background: "transparent", resize: "none", fontFamily: "'Inter',sans-serif", fontSize: 13, color: "var(--qc-tx-input)", lineHeight: 1.4, minHeight: 20, maxHeight: 120, padding: "4px 0", overflowY: "auto" }}
                                />
                                <button type="button" onClick={send} disabled={!journalInput.trim()} style={{ flexShrink: 0, width: 32, height: 32, border: "1px solid var(--qc-rim-pink)", background: journalInput.trim() ? "var(--qc-acc-pink-save)" : "var(--qc-surf-send-off)", borderRadius: 8, color: journalInput.trim() ? burgundy : "var(--qc-tx-send-off)", display: "flex", alignItems: "center", justifyContent: "center", cursor: journalInput.trim() ? "pointer" : "not-allowed" }}>
                                  <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                                </button>
                              </div>
                            </>
                          );
                        })()}
                      </div>
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
              <div className="qc-blank">
                <span className="qc-blankmark" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" /></svg>
                </span>
                <h4>Nothing selected</h4>
                <p>Pick a query on the left to see where it stands, what you sent, and what you&rsquo;ve noted.</p>
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

        </div>{/* closes f12-body */}

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
