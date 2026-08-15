/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FocusFlow — the ONE completion surface (design ref: design-refs/todo-focus-flow.html). A
 * full-screen takeover on the oat ground: one task, one sheet, one question at a time. REPLACES
 * both the TaskDetail side drawer and the Walkthrough centre modal (and absorbs the batch drawer):
 * every launch site — card click (a queue of one), the ribbon's "Work through priorities now"
 * (the Urgent lane set), the pop-up's "Work the list" (today's committed set), a grouped
 * housekeeping card — opens this.
 *
 * Surface choice (recon): a fixed full-viewport overlay hosted by ToDoPage, NOT a route — the flow
 * needs the board's live data/handlers, exit is a state flip, and a transient route would have to
 * be registered across the six locked nav surfaces for no benefit.
 *
 * The staged model: CAPTURES (mark-sent, nudge) and STANCES (snooze, mute) STAGE — nothing
 * persists until the review sheet's Save (apply = the existing per-item-isolated applyStaged;
 * partial failures are re-listed, never silently half-saved). Back at an item boundary un-stages
 * the previous item. IMMEDIATE writes (they're data entry or a decision, not a deferrable log):
 * the offer journey (celebration + three doors — the completion is a RECORDED DECISION via
 * recordOfferDecision; the offer itself is never re-logged), the
 * housekeeping batch/dq saves (updateAgent), the stale close (updateQueryStatus), and the note
 * tick (updateUserTask). One write path throughout: markSentWriteArgs/nudgeWriteArgs feed the same
 * recordMaterialsSent/logNudge the quick paths use.
 *
 * Theme: F12 tokens only. StatusDot consumed verbatim (the timeline chips).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { StatusDot } from "../StatusDot";
import { useConfirmAsk } from "./ConfirmAsk";
import { useScriptAllyDb } from "../../lib/db";
import { getPrimaryAction } from "../../lib/queryPrimaryAction";
import { TimelineRows, buildTimelineRows } from "../reading-pane/QueryTimeline";
import { JOURNEY_ART, JourneyArtKey } from "./journeyArt";
import { NUDGE_NESTED_TYPE } from "../../lib/logNudge";
import { OfferDecision } from "../../lib/offerDecision";
import { notifyGroups, reminderFields, NotifyRow } from "../../lib/offerNotify";
import { useOverlay } from "../shell/useOverlay";
import { reviewWeek, weekReviewStats, reviewSeedCandidates, reviewCompletionSnooze, SeedCandidate } from "../../lib/todoBoard";
import { clampSnoozeDays } from "../../lib/todoActions";
import { agentPrimary } from "../../lib/agentDisplay";
import { nudgeDraft } from "../../lib/nudgeDraft";
import { flagKeyForTask, MUTED_UNTIL } from "../../lib/taskFlags";
import { journeyMaterials, synopsisStateFor, journeySummary } from "../../lib/journeyMaterials";
import { RecordingCalendar } from "./RecordingCalendar";
import { shortDate } from "../../lib/recordingCalendar";
import { cardBucket } from "../../lib/todoBuckets";
import { cardJourney, isSendTask, CloseReason, CLOSE_REASONS } from "../../lib/todoJourneys";
import { isSlotFilled } from "../../lib/packageMetrics";
import { agentDataQualityNeeds, AgentDataNeed } from "../../lib/agentDataQuality";
import { BoardCard } from "../../lib/todoBoard";
import { HkGroup, HkRule, HK_RULES, HK_PAYOFF, mutedMembersForRule } from "../../lib/todoHousekeeping";
import {
  StagedPayload, applyStaged, markSentWriteArgs, nudgeWriteArgs, materialOptsForTask, assumedSendItem, DEFAULT_CHECKBACK_DAYS, journeyEventISO,
  quickSendPayload, quickNudgePayload, receiptLine, sendKicker, priorSameTypeSend, duplicateSendPrompt,
} from "../../lib/todoWalk";
import { USER_TASK_FLAG_TYPE } from "../../lib/todoBoard";
import { saveHkRows } from "../../lib/hkSave";
import { isProUser, fetchAssistedFill, AssistFillError, AssistFound } from "../../lib/assistFill";
import { ActivityType, Agent, Query, QueryStatus } from "../../types";

export type FocusItem = { kind: "card"; card: BoardCard } | { kind: "group"; group: HkGroup };

const todayISO = (): string => new Date().toISOString().slice(0, 10);
const plusDaysISO = (n: number): string => new Date(Date.now() + n * 86400000).toISOString();
/* ⚠️ LOCAL Y-M-D, because `journeyEventISO` compares the picked day against the LOCAL date. A
   UTC-derived "yesterday" is a day out for part of every evening in a positive-offset zone, and
   the symptom would be a chase logged on the wrong day rather than an error. */
const ymdLocal = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const ymdDaysAgo = (n: number): string => { const d = new Date(); d.setDate(d.getDate() - n); return ymdLocal(d); };
const fmtShort = (iso: string): string => {
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? "" : new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};
const METHODS = ["Email", "QueryManager", "Post", "Other"];
const WEEK_CHIPS = [4, 6, 8, 12];
const MATERIAL_VOCAB = ["Query Letter", "Synopsis", "Sample Pages", "Full Manuscript"];

const itemKey = (it: FocusItem): string => (it.kind === "card" ? it.card.key : `group-${it.group.rule}`);

/* ── THE JOURNEY TAKEOVER (journeys pack, Phase 1; ref design-refs/todo-workspace-v14.html) ─────
 *
 * ⚠️ ONE CHROME, SIX JOURNEYS, AND THE STEPS ARE A DECLARED TABLE. Every journey hands
 * `journeySheet` a spec and renders nothing of its own frame. The alternative — the shape this
 * replaces — was a per-journey `if (step === 0) return sheet(…)` with the numbering, the footer
 * and the consequence hint restated inside each one; six copies of a layout is six chances for
 * two of them to disagree about what the writer is looking at.
 *
 * ⚠️ A JOURNEY IS ONE SCREEN, NOT A WIZARD. The numbers are reading order, not pagination — the
 * writer sees everything they are about to record at once, which is the only way the summary
 * strip beneath can be true of the whole thing.
 */
export interface JourneyStep {
  id: string;
  /** The Playfair heading — "What went", "How it went", "When". */
  name: string;
  /** Renders the italic `optional` marker, right-aligned on the heading row. */
  optional?: boolean;
  body: React.ReactNode;
}

export interface JourneySpec {
  steps: JourneyStep[];
  /**
   * ⚠️ THE REFERENCE PANEL HOLDS WHAT THE RECORD ALREADY SAYS, never a control. It is what the
   * agent asked for, or what the listing states, or what closing does — the thing the writer would
   * otherwise leave the surface to go and check.
   */
  reference: { heading: string; body: React.ReactNode; meta?: string };
  /** ⚠️ MANDATORY. The commit button must never be the first time the writer sees what will be
   *  written — `journeySummary` off the LIVE form state, never off the string it composes. */
  summary: string;
  commit: { label: string; hint?: string; onCommit: () => void; disabled?: boolean };
  /**
   * Rendered above step 01. The ref is a mockup with no draft feature and so had no slot for the
   * chase's copyable note; this is that slot, and nothing else uses it.
   */
  lede?: React.ReactNode;
  /** A secondary footer action, beside Cancel. Only the note journey uses it — see `noteSheet`. */
  extraFoot?: React.ReactNode;
}
/** What the agent asked for, in prose, for the nudge draft. */
function requestedProse(status?: QueryStatus): string | undefined {
  if (status === QueryStatus.FULL_SENT || status === QueryStatus.FULL_REQUESTED) return "the full manuscript";
  if (status === QueryStatus.PARTIAL_SENT || status === QueryStatus.PARTIAL_REQUESTED) return "the partial";
  return undefined;
}

export interface FocusFlowProps {
  items: FocusItem[];
  onClose: () => void;
  onNavigate: (tab: string, subPageName?: string, opts?: { agentId?: string; manuscriptId?: string }) => void;
  onToast: (msg: string, action?: { label: string; fn: () => void }) => void;
  /** Seed the send capture (a receipt's "Edit details" re-opens the journey pre-filled with what
   *  the quick-✓ logged; the quick write is undone first so Save never double-writes). */
  prefill?: { sentDate?: string; method?: string; materials?: string[] };
  /** "sweep" = the speed grammar: one summary per screen, big ✓/⏸/skip, keyboard D·S·→ (F·N on
   *  housekeeping, Enter opens an offer). Sweep quick-✓s use the Phase-C defaults + a brief inline
   *  receipt, write IMMEDIATELY (Undo on the toast) and never stage. Default: the full journey. */
  mode?: "journey" | "sweep" | "weeklyReview";
  /** C2 family law — a Today's-list walk is a RITUAL: every band wears sage whole-walk (the
   *  mixed-lane crossfade never fires). Set only by the Work-the-list launch. */
  ritual?: boolean;
}

export const FocusFlow: React.FC<FocusFlowProps> = ({ items, onClose, onNavigate, onToast, prefill, mode = "journey", ritual = false }) => {
  const {
    queries, agents, manuscripts, activities, taskFlags, userTasks, packages, currentUser,
    recordMaterialsSent, logNudge, recordOfferDecision, dismissTask, upsertTaskFlag, updateUserProfile, updateAgent, updateUserTask, addUserTask, updateQueryStatus, undoQueryStatus, resolveTaskFlag, deleteActivity,
  } = useScriptAllyDb();

  const [qi, setQi] = useState(0);
  const [step, setStep] = useState(0);
  const [staged, setStaged] = useState<StagedPayload[]>([]);
  /* ⚠️ ONE FREE-TEXT FIELD, DELIBERATELY UNSTRUCTURED (journeys pack, Phase 3) — it is the part of
     the record the writer composes, and a checkbox list of guesses would invite them to confirm
     things the record never said. */
  const [alsoText, setAlsoText] = useState("");
  const { ask: confirmAsk, node: confirmAskNode } = useConfirmAsk();
  const [leaving, setLeaving] = useState(false);
  // the offer journey (P3; notify rebuilt by the popup-notify-scrim pass P2): which door is open,
  // the decision pick, the need-time date, and the notify step's selection state
  const [offerDoor, setOfferDoor] = useState<"" | "notify" | "decide" | "time">("");
  const [offerChoice, setOfferChoice] = useState<OfferDecision | null>(null);
  const [remindDate, setRemindDate] = useState("");
  const [notifyStep, setNotifyStep] = useState<"pick" | "rem">("pick");
  const [notifySel, setNotifySel] = useState<Record<string, boolean>>({});
  const [savedN, setSavedN] = useState<number | null>(null); // the "Desk cleared" screen
  const [saving, setSaving] = useState(false);
  // sweep mode
  const sweep = mode === "sweep";
  const [deepDive, setDeepDive] = useState(false); // F on a group / Enter on an offer → the full journey sheet
  const [sweepReceipt, setSweepReceipt] = useState<string | null>(null); // brief inline receipt before advancing
  const [sweepFork, setSweepFork] = useState(false); // N on housekeeping → the never-fork row
  // the Sunday review (finishing pack P3) — its own six steps; items = the live Urgent cards
  // (the seed-candidate source). Staged closes ride the normal staged set; seeds commit at finish.
  const review = mode === "weeklyReview";
  const [rvStep, setRvStep] = useState(0);
  const [rvQuiet, setRvQuiet] = useState<Record<string, "close" | "leave">>({});
  const [rvSeed, setRvSeed] = useState<Record<string, boolean> | null>(null);
  const [rvSummary, setRvSummary] = useState<{ closed: number; seeded: number } | null>(null);
  const activitiesRef = useRef(activities);
  activitiesRef.current = activities;
  // per-item scratch (reset on advance; the initial values honour a receipt-edit prefill)
  const [mats, setMats] = useState<Record<string, boolean>>(() => Object.fromEntries((prefill?.materials ?? []).map((m) => [m, true])));
  const [sentDate, setSentDate] = useState(prefill?.sentDate ?? todayISO());
  const [method, setMethod] = useState(prefill?.method ?? "Email");
  const [copied, setCopied] = useState(false);
  const [extrasOpen, setExtrasOpen] = useState(false); // "+ I sent something else too"
  const [backdated, setBackdated] = useState(false); // the quiet "I sent it earlier" day picker
  /* ⚠️ ONE `When` CONTROL FOR EVERY JOURNEY (journeys pack, Phase 2a). `sentDate` stays the single
     Y-M-D the write reads; `whenMode` only says which segment is lit and whether the picker shows.
     Building a second date control for the chase would be the exact fault the shared step
     vocabulary exists to prevent — two versions of one question, drifting apart. */
  const [whenMode, setWhenMode] = useState<string>("today");
  /* the open calendar's anchor element — `null` = closed. Held as the ELEMENT because that is what
     placement and focus-return both need, and holding a boolean would mean re-finding it. */
  const [calAnchor, setCalAnchor] = useState<HTMLElement | null>(null);
  /* the chase's check-back window in days; `null` = "Don't remind me" (see `chaseSheet`) */
  const [checkBack, setCheckBack] = useState<number | null>(DEFAULT_CHECKBACK_DAYS);
  /* the close journey's outcome — a radio, because these are three different things that happened */
  const [closeReason, setCloseReason] = useState<CloseReason>("no_reply");
  const [rows, setRows] = useState<Record<string, string>>({}); // batch/dq drafts keyed by agentId (+need for dq)
  const [noMeansNo, setNoMeansNo] = useState<Record<string, boolean>>({});
  const [found, setFound] = useState<Record<string, AssistFound>>({});
  const [notFound, setNotFound] = useState<Set<string>>(new Set());
  const [assistAt, setAssistAt] = useState<string | null>(null);
  const [assisting, setAssisting] = useState(false);
  const [assistMsg, setAssistMsg] = useState<string | null>(null);
  const [showMuted, setShowMuted] = useState(false);
  const [noteText, setNoteText] = useState<string | null>(null);

  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  // P3 — the dim-scrim presentation: the board stays mounted beneath; scroll locks for the
  // journey's life (lockStageScroll — the app-wide mechanism); focus is captured from the
  // invoking control, trapped in the sheet, and returned on close. Scrim clicks NUDGE, never close.
  const rootRef = useRef<HTMLDivElement>(null);
  const [nudged, setNudged] = useState(false);
  /* ⚠️ THE PRESENTATION IS THE SHARED PRIMITIVE NOW (§3). Focus capture and return, the
     stage-scroll lock and the Tab trap were the same twenty lines here and in
     `TaskSettingsSheet.tsx`; they live in `useOverlay` and this file no longer keeps a copy.

     ⚠️ WHAT STAYS THIS FILE'S OWN IS THE BACKDROP MEANING, and it is the opposite of the settings
     sheet's: a stray click on the scrim NUDGES rather than closes, because this journey holds a
     STAGED model that a misplaced click must not discard. That difference is why the primitive
     takes `onScrimClick` instead of assuming one.

     ⚠️ AND ESCAPE STAYS HERE TOO, deliberately. It routes through `requestExit`, which is async and
     may open a confirm, and it reads `staged.length` — so it is a handler with its own dependencies
     rather than the primitive's plain callback. `onEscape` is omitted for exactly this case. */
  const { trapTab, scrimClick } = useOverlay(rootRef, {
    scrimClasses: ["tdb-ff", "tdb-ffstage"],
    onScrimClick: () => { if (!reduce) setNudged(true); },
  });
  const atReview = qi >= items.length;
  const item = atReview ? undefined : items[qi];

  const resetScratch = () => {
    setMats({}); setSentDate(todayISO()); setMethod("Email"); setCopied(false); setExtrasOpen(false); setBackdated(false);
    /* ⚠️ `alsoText` WAS MISSING FROM THIS RESET, and it is the field every journey composes in — so
       a note typed against item one of a walk arrived pre-filled on item two, ready to be committed
       against a different agent. It is the quietest kind of wrong: the form looked filled in. */
    setAlsoText(""); setWhenMode("today"); setCheckBack(DEFAULT_CHECKBACK_DAYS); setCalAnchor(null); setCloseReason("no_reply");
    setRows({}); setNoMeansNo({}); setFound({}); setNotFound(new Set()); setAssistAt(null); setAssistMsg(null); setShowMuted(false); setNoteText(null);
    setDeepDive(false); setSweepReceipt(null); setSweepFork(false);
    setOfferDoor(""); setOfferChoice(null); setRemindDate(""); setNotifyStep("pick"); setNotifySel({});
  };

  /** Animate the sheet away, then run the transition. */
  function go(fn: () => void) {
    if (reduce) { fn(); return; }
    setLeaving(true);
    window.setTimeout(() => { setLeaving(false); fn(); }, 280);
  }
  const advance = () => go(() => { setQi((i) => i + 1); setStep(0); resetScratch(); });
  function backOne() {
    if (step > 0) { setStep((s) => s - 1); return; }
    if (qi === 0) return;
    // crossing an item boundary un-stages the previous item
    const prevKey = itemKey(items[qi - 1]);
    setStaged((s) => s.filter((p) => p.cardKey !== prevKey));
    setQi((i) => i - 1); setStep(0); resetScratch();
  }
  const stageAndAdvance = (p: StagedPayload) => { setStaged((s) => [...s, p]); advance(); };
  async function requestExit(after?: () => void) {
    // the styled ConfirmAsk replaced window.confirm (hero-pair P4) — a true blocking choice
    if (staged.length && !(await confirmAsk(`You have ${staged.length} staged change${staged.length === 1 ? "" : "s"}. Discard them?`, { confirmLabel: "Discard them", cancelLabel: "Keep working" }))) return;
    onClose();
    after?.();
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") requestExit(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staged.length]);

  // ONE handler map — the review-screen Save AND the Sunday review's finish both apply through it.
  const stagedHandlers = {
    markSent: (p: Extract<StagedPayload, { kind: "mark-sent" }>) => recordMaterialsSent(markSentWriteArgs(p)),
    nudge: (p: Extract<StagedPayload, { kind: "nudge" }>) => logNudge(...nudgeWriteArgs(p, new Date().toISOString())).then((r) => { if (!r.success) throw new Error(r.error || "nudge failed"); }),
    // the same offer cap at the staged-write choke point (tasks-pages P2, walk fix 2)
    snooze: (p: Extract<StagedPayload, { kind: "snooze" }>) => dismissTask(p.taskType, p.relatedRecordId, "fixed snooze", clampSnoozeDays(p.taskType, p.days)),
    muteItem: (p: Extract<StagedPayload, { kind: "mute-item" }>) => upsertTaskFlag(flagKeyForTask(p.taskType, p.relatedRecordId), { snoozedUntil: MUTED_UNTIL }),
    muteRule: (p: Extract<StagedPayload, { kind: "mute-rule" }>) => updateUserProfile({ mutedTaskRules: Array.from(new Set([...(currentUser?.mutedTaskRules ?? []), p.rule])) }),
    // the Sunday review's staged stale-close — the EXISTING close path, applied only at Save
    close: (p: Extract<StagedPayload, { kind: "close" }>) => updateQueryStatus(p.queryId, QueryStatus.NO_RESPONSE, "Closed as no response from the Sunday review").then(() => {}),
  };

  async function saveAll() {
    if (saving) return;
    setSaving(true);
    const res = await applyStaged(staged, stagedHandlers);
    setSaving(false);
    if (res.failed.length) {
      setStaged((s) => s.filter((p) => res.failed.includes(p.cardKey)));
      onToast(`Saved ${res.ok.length}; ${res.failed.length} failed — still listed below.`);
    } else {
      setSavedN(res.ok.length);
      setStaged([]);
    }
  }

  // ── shared bits ───────────────────────────────────────────────────────────
  const cardQuery = (c: BoardCard): Query | undefined => (c.relatedRecordId ? queries.find((q) => q.id === c.relatedRecordId) : undefined);
  const cardAgent = (c: BoardCard, q?: Query): Agent | undefined =>
    q ? agents.find((a) => a.id === q.agentId) : c.relatedRecordId ? agents.find((a) => a.id === c.relatedRecordId) : undefined;

  const emTitle = (c: BoardCard) =>
    c.who && c.title.includes(c.who)
      ? <>{c.title.split(c.who)[0]}<em>{c.who}</em>{c.title.split(c.who).slice(1).join(c.who)}</>
      : c.title;

  const whoRow = (ag?: Agent, initials?: string) => ag && (
    <div className="tdb-ffwho">
      <span className="tdb-ffbigav">{initials || "•"}</span>
      <span><div className="tdb-ffwn">{agentPrimary(ag)}</div>{ag.agency && <div className="tdb-ffwa">{ag.agency}</div>}</span>
    </div>
  );
  // B2 — the sheet renders THE HUB'S OWN timeline rows (TimelineRows + buildTimelineRows,
  // reading-pane/QueryTimeline — reuse, not imitation), condensed to the most recent 3–4,
  // newest first. The Hub feeds the builder per-query subcollection docs ({type, createdAt});
  // the sheet holds the TOP-LEVEL feed, adapted by shape: resultingStatus is stamped at append
  // by the SAME writes that append the subcollection docs, and NUDGE_SENT twins the nested
  // "Nudge sent" — so the rows come out identical. Pre-migration activities without a
  // resultingStatus drop out (the synthesised "Query sent" root covers the common gap).
  const sheetTimeline = (q?: Query, ag?: Agent) => {
    if (!q) return null;
    const events = activities
      .filter((a) => a.queryId === q.id)
      .map((a) => ({
        id: a.id,
        type: a.activityType === ActivityType.NUDGE_SENT ? NUDGE_NESTED_TYPE : a.resultingStatus,
        createdAt: a.date,
        note: "",
      }))
      .filter((e) => e.type != null);
    const rows = buildTimelineRows(events, q, ag ?? null).slice(-4).reverse();
    if (!rows.length) return null;
    return <div className="tdb-ffhubtl"><TimelineRows rows={rows} /></div>;
  };
  const openQueryLink = (q?: Query) => q && (
    <button type="button" className="tdb-fflink" onClick={() => requestExit(() => onNavigate("queries", q.id))}>Open the full query →</button>
  );

  // ── journeys ─────────────────────────────────────────────────────────────
  function sendSheet(c: BoardCard) {
    const q = cardQuery(c);
    const ag = cardAgent(c, q);
    const opts = materialOptsForTask(c.taskType);
    const any = opts.some((m) => mats[m]);
    if (step === 0) return sheet(
      <>
        {whoRow(ag, c.initials)}
        {sheetTimeline(q, ag)}
        {openQueryLink(q)}
      </>,
      <>
        <button type="button" className="tdb-ffback" disabled={qi === 0} onClick={backOne}>← Back</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffskip" onClick={advance}>Leave it</button>
        <button type="button" className="tdb-ffskip" onClick={() => c.taskType && c.relatedRecordId && stageAndAdvance({ kind: "snooze", cardKey: c.key, label: c.title, taskType: c.taskType, relatedRecordId: c.relatedRecordId, days: 7 })}>Snooze</button>
        <button type="button" className="tdb-ffpri" onClick={() => setStep(1)}>I’ve sent it — log it →</button>
      </>,
      // B1 kicker (stream + the ledger-shared DETAIL — never the same string twice) rides the band
      band("pink", sendKicker(c, { queries, taskFlags }, Date.now()), emTitle(c), c.subtitle || undefined, { art: "send", kickCls: c.warn ? "warn" : "" }),
    );
    const ms = q ? manuscripts.find((m) => m.id === q.manuscriptId) : undefined;
    const who = c.who || "the agent";
    const assumed = assumedSendItem(c.taskType, ag?.materialsWanted as string[] | undefined, who);
    /**
     * ⚠️ THE CONDITION IS STRUCTURAL, NEVER PARSED. `SubmissionPackage.synopsisVersionId` holds
     * `UNFILLED_SLOT` when no synopsis went; scanning an activity's free-text `details` for the
     * word would be deriving state by reading a display string. NO PACKAGE MEANS UNKNOWN rather
     * than "none" — a query logged before packages existed has not told us a synopsis was absent,
     * only that nothing linked it, and treating silence as absence would put a claim about the
     * agency's submission route on most historical queries.
     */
    const synState = synopsisStateFor(
      q?.packageId,
      (id) => packages.find((pk) => pk.id === id),
      isSlotFilled,
    );
    const { rows: matRows, note: matNote } = journeyMaterials(
      cardBucket(c), c.taskType, synState, who, ag?.materialsWanted as string[] | undefined,
    );
    /* the first row IS the assumed item, already rendered above — the rest are the conditional */
    const extraRows = matRows.slice(1);
    const extrasOn = extraRows.filter((m) => mats[m.label]).map((m) => m.label);
    const sendWhen = [whenSent(), whenYesterday(), WHEN_OTHER];
    const commitSend = async () => {
      if (!q) { advance(); return; }
      const action = getPrimaryAction(q.status as QueryStatus);
      if (action.kind !== "mark-sent") { advance(); return; }
      // B3 — the soft duplicate-send guard: read the log at write time; decline stages
      // NOTHING and stays on the step (staged work intact). R&R is never guarded.
      const prior = priorSameTypeSend(activities, q.id, action.target as QueryStatus, action.markKind === "resubmit");
      if (prior && !(await confirmAsk(duplicateSendPrompt(action.target as QueryStatus, c.who, prior), { confirmLabel: "Send again", cancelLabel: "Cancel" }))) return;
      stageAndAdvance({
        kind: "mark-sent", cardKey: c.key, label: c.title, queryId: q.id,
        targetStatus: action.target as QueryStatus,
        /* `journeyEventISO` collapses today's date back to the true moment of the write, so the
           shared control can always pass its Y-M-D and the "was it back-dated" flag disappears. */
        sentDate: journeyEventISO(sentDate, new Date().toISOString()),
        isResubmit: action.markKind === "resubmit", method: q.sendMethod || "Email",
        materials: [assumed.label, ...extrasOn],
      });
    };
    return journeySheet({
      steps: [{
        id: "what",
        name: "What went",
        body: (
      <>
        <div className="tdb-ffqsub">{who} asked for {assumed.label === "Full manuscript" ? "the full" : assumed.label === "Revised manuscript" ? "revisions" : assumed.label.toLowerCase()} — so that’s what we’ll log.</div>
        <div className="tdb-ffassume">
          <span className="tdb-ffatick" aria-hidden>✓</span>
          <span><b>{assumed.label}</b><span className="tdb-ffasub">{ms?.title ? `${ms.title} · ` : ""}{assumed.sub}</span></span>
        </div>
        {/**
          * ⚠️ THE SYNOPSIS ROW APPEARS ONLY ON A KNOWN ABSENCE, AND STATES WHY (journeys pack,
          * Phase 3). This offered `["First pages", "Synopsis", "Covering email"]` on EVERY send —
          * so the writer was invited to re-send a synopsis the agent has held since the original
          * submission. Offering to send what someone already has is not a neutral default: it is
          * the app suggesting work that should not happen, on the surface whose job is recording
          * what did.
          *
          * ⚠️ AND IT IS NOT PRE-TICKED. The record can say the agent has never seen one; it cannot
          * say the writer means to send one now.
          */}
        {extraRows.map((m) => (
          <button key={m.id} type="button" className={`tdb-ffchoice${mats[m.label] ? " on" : ""}`}
            onClick={() => setMats((p) => ({ ...p, [m.label]: !p[m.label] }))}>
            <span className="tdb-ffck" />
            <span className="tdb-ffct">{m.label}{m.sub && <span className="tdb-ffasub">{m.sub}</span>}</span>
          </button>
        ))}
        {/* ⚠️ THE OMISSION IS ACCOUNTED FOR ONCE, QUIETLY — a step that silently leaves out the
            query letter and synopsis looks like a step that forgot them. */}
        {matNote && <div className="tdb-ffnote">{matNote}</div>}
        {/* ⚠️ ANYTHING ELSE IS ONE FREE-TEXT FIELD, DELIBERATELY UNSTRUCTURED. A checkbox list of
            guesses is the same fault as the synopsis row, spread thinner: it invites the writer to
            confirm things the record never said. */}
        <div className="tdb-ffalso">
          <label htmlFor="ff-also">Anything else?</label>
          <textarea id="ff-also" className="tdb-fffree" value={alsoText}
            placeholder="A covering note, a change of address, anything worth remembering…"
            onChange={(e) => setAlsoText(e.target.value)} />
        </div>
      </>
        ),
      }, whenStep(sendWhen)],
      reference: {
        heading: `What ${who} asked for`,
        body: <><b>{assumed.label}</b>{assumed.sub ? <> — {assumed.sub}</> : null}</>,
        meta: [ms?.title, c.subtitle].filter(Boolean).join(" · ") || undefined,
      },
      summary: journeySummary({
        materials: [assumed.label, ...extraRows.filter((m) => mats[m.label]).map((m) => m.label)],
        when: whenText(sendWhen),
        also: alsoText,
      }),
      commit: { label: "Record it as sent", hint: "Nothing is sent from here — this records what you sent.", onCommit: () => { void commitSend(); } },
    }, journeyBand("pink", "Recording what you sent", ag, c.initials, "send"));
  }

  /**
   * The R&R. ⚠️ THE SECOND ROW IS PRE-TICKED AND SAYS WHY — this is the one stage where a second
   * default is conventional, because an agent who asked for revisions expects an account of how
   * you answered their notes, and a resubmission arriving without one is the single shape they
   * asked not to receive. Everywhere else a pre-tick would be the app deciding for the writer.
   */
  function resubmitSheet(c: BoardCard) {
    const q = cardQuery(c);
    const ag = cardAgent(c, q);
    const ms = q ? manuscripts.find((m) => m.id === q.manuscriptId) : undefined;
    const who = c.who || "the agent";
    if (step === 0) return sheet(
      <>
        {whoRow(ag, c.initials)}
        {sheetTimeline(q, ag)}
        {openQueryLink(q)}
      </>,
      <>
        <button type="button" className="tdb-ffback" disabled={qi === 0} onClick={backOne}>← Back</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffskip" onClick={advance}>Leave it</button>
        <button type="button" className="tdb-ffskip" onClick={() => c.taskType && c.relatedRecordId && stageAndAdvance({ kind: "snooze", cardKey: c.key, label: c.title, taskType: c.taskType, relatedRecordId: c.relatedRecordId, days: 7 })}>Snooze</button>
        <button type="button" className="tdb-ffpri" onClick={() => setStep(1)}>Record your resubmission →</button>
      </>,
      band("pink", sendKicker(c, { queries, taskFlags }, Date.now()), emTitle(c), c.subtitle || undefined, { art: "send", kickCls: c.warn ? "warn" : "" }),
    );
    const synState = synopsisStateFor(q?.packageId, (id) => packages.find((pk) => pk.id === id), isSlotFilled);
    /* the SAME table every other journey reads — `cardBucket(c)` is `decide` here, and the table
       answers on the task type, which is the fix that made these two rows reachable at all */
    const { rows: rrRows, note: rrNote } = journeyMaterials(
      cardBucket(c), c.taskType, synState, who, ag?.materialsWanted as string[] | undefined,
    );
    /* pre-ticked rows start ON: `mats` is empty until touched, so absence means "as the table left it" */
    const isOn = (label: string, dflt: boolean) => (label in mats ? mats[label] : dflt);
    const chosen = rrRows.filter((r) => isOn(r.label, r.on)).map((r) => r.label);
    const rrWhen = [whenSent(), whenYesterday(), WHEN_OTHER];
    return journeySheet({
      steps: [{
        id: "what",
        name: "What went",
        body: (
          <>
            <div className="tdb-jnopts">
              {rrRows.map((r) => (
                <button key={r.id} type="button" className={`tdb-jnrow${isOn(r.label, r.on) ? " on" : ""}`}
                  aria-pressed={isOn(r.label, r.on)}
                  onClick={() => setMats((p) => ({ ...p, [r.label]: !isOn(r.label, r.on) }))}>
                  <span className="tdb-jnbx">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span>{r.label}{r.sub && <span className="tdb-jnsub">{r.sub}</span>}</span>
                </button>
              ))}
            </div>
            {rrNote && <div className="tdb-ffnote">{rrNote}</div>}
            <div className="tdb-ffalso">
              <label htmlFor="ff-also-rr">Anything else?</label>
              <textarea id="ff-also-rr" className="tdb-fffree" value={alsoText}
                placeholder="A revised synopsis, a chapter map…"
                onChange={(e) => setAlsoText(e.target.value)} />
            </div>
          </>
        ),
      }, {
        id: "how",
        name: "How it went",
        body: (
          <div className="tdb-jnseg">
            {METHODS.slice(0, 2).map((m) => (
              <button key={m} type="button" className={method === m ? "on" : ""} onClick={() => setMethod(m)}>
                {m === "QueryManager" ? "Agency portal" : m}
              </button>
            ))}
          </div>
        ),
      }, whenStep(rrWhen)],
      reference: {
        heading: "Their notes",
        /* `rrNotes` is what RecordResponseModal kept when the R&R was logged — the agent's own
           guidance, which is exactly what the writer needs beside them while recording the reply */
        body: q?.rrNotes
          ? <>{q.rrNotes}</>
          : <>Nothing was kept on record when the revisions were requested. What goes back is yours to judge.</>,
        meta: [q?.revisionRound ? `Revision round ${q.revisionRound}` : null, ms?.title, c.subtitle]
          .filter(Boolean).join(" · ") || undefined,
      },
      summary: journeySummary({
        materials: chosen,
        channel: method === "QueryManager" ? "Agency portal" : method,
        when: whenText(rrWhen),
        also: alsoText,
      }),
      commit: {
        label: "Record the resubmission",
        hint: "Starts their clock again from today.",
        /* ⚠️ NO DUPLICATE-SEND GUARD HERE, and that is the standing rule rather than an omission:
           an R&R is expected to arrive after an earlier send of the same materials, so the guard
           that protects an ordinary send would fire on every legitimate resubmission. */
        onCommit: () => {
          if (!q) { advance(); return; }
          const action = getPrimaryAction(q.status as QueryStatus);
          if (action.kind !== "mark-sent") { advance(); return; }
          stageAndAdvance({
            kind: "mark-sent", cardKey: c.key, label: c.title, queryId: q.id,
            targetStatus: action.target as QueryStatus,
            sentDate: journeyEventISO(sentDate, new Date().toISOString()),
            isResubmit: action.markKind === "resubmit", method,
            materials: chosen,
          });
        },
      },
    }, journeyBand("pink", "Recording your resubmission", ag, c.initials, "send"));
  }

  /**
   * ⚠️ THE TWO JOURNEYS THAT RECORD NOTHING. A Decide and a Fix are not recorded here because
   * neither is a single event on a single query: an offer touches every open query at once, and a
   * gap in the record is corrected where the data lives. So this journey states why in one
   * paragraph and hands off. The commit verb NAVIGATES, and the hint says `Nothing is recorded
   * here.` — a surface that looks like every other recording surface must say when it is not one.
   *
   * ⚠️ IT IS THE FALL-THROUGH, NOT THE ROUTE FOR OFFERS AND HOUSEKEEPING. Every task type this app
   * actually generates already has a purpose-built journey — `offerSheet` IS the offer flow, and
   * `dqSheet` fills the reply window, materials list and wish list in place, none of which
   * Submission packages can touch. Putting the hand-off in front of either would add a click that
   * teaches nothing, or send a writer who clicked "3 agents have no reply window" to a page about
   * manuscript packages. What this DOES catch is the unrecognised task type, which fell through to
   * the SEND journey and was offered "Mark sent" for something that is not a send.
   */
  function handoffSheet(c: BoardCard, kind: "decide" | "fix") {
    const q = cardQuery(c);
    const ag = cardAgent(c, q);
    const decide = kind === "decide";
    const others = q ? queries.filter((x) => x.manuscriptId === q.manuscriptId && x.id !== q.id) : [];
    return journeySheet({
      steps: [{
        id: "why",
        name: decide ? "This one has its own flow" : "What to do",
        body: (
          <div className="tdb-jnreport">
            {decide
              ? "An offer touches every open query at once — the agents still holding material, the deadline you give them, and the decision itself. That is handled together in the offer flow rather than recorded here."
              : "This one is fixed where the data lives, not here. Recording it against a query would put a note on the record instead of correcting it."}
          </div>
        ),
      }],
      reference: decide
        ? {
          heading: "Still holding material",
          body: others.length
            ? <>{others.slice(0, 5).map((x) => agents.find((a) => a.id === x.agentId)).filter(Boolean).map((a, i) => <span key={i}><b>{agentPrimary(a!)}</b><br /></span>)}</>
            : <>No other agent is holding this manuscript.</>,
          meta: others.length ? "Each will need telling" : undefined,
        }
        : {
          heading: "Why it appeared",
          body: <>{c.subtitle || "Something in the record is incomplete."}</>,
          meta: c.due || undefined,
        },
      /* ⚠️ THE SUMMARY STRIP IS MANDATORY EVERYWHERE, and on a journey that records nothing the
         honest thing for it to say is that nothing is going on the record. */
      summary: "Nothing goes on the record here.",
      commit: {
        label: decide ? "Open the offer flow" : "Open submission packages",
        hint: "Nothing is recorded here.",
        onCommit: () => requestExit(() => (decide && q ? onNavigate("queries", q.id) : onNavigate("manuscripts", "Submission packages"))),
      },
    }, journeyBand(decide ? "pink" : "cof", decide ? "Answering the offer" : "Tidying the record", ag, c.initials, decide ? "offerCelebration" : "details"));
  }

  function nudgeSheet(c: BoardCard) {
    const q = cardQuery(c);
    const ag = cardAgent(c, q);
    if (step === 0) return sheet(
      <>
        <div className="tdb-ffqsub">
          {ag?.responseTimeWeeks ? <>Their stated reply time is <b>{ag.responseTimeWeeks} weeks</b> — a polite follow-up is fair.</> : "A polite follow-up is fair."}
        </div>
        {whoRow(ag, c.initials)}
        {openQueryLink(q)}
      </>,
      <>
        <button type="button" className="tdb-ffback" disabled={qi === 0} onClick={backOne}>← Back</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffskip" onClick={advance}>Leave it</button>
        <button type="button" className="tdb-ffskip" onClick={() => c.taskType && c.relatedRecordId && stageAndAdvance({ kind: "snooze", cardKey: c.key, label: c.title, taskType: c.taskType, relatedRecordId: c.relatedRecordId, days: 7 })}>Snooze</button>
        <button type="button" className="tdb-ffpri" onClick={() => setStep(1)}>Write the nudge →</button>
      </>,
      band("pink", c.due || "No reply yet", <>Time to nudge {c.who ? <em>{c.who}</em> : "them"}?</>, c.subtitle || undefined, { art: "nudge", kickCls: c.warn ? "warn" : "" }),
    );
    const ms = q ? manuscripts.find((m) => m.id === q.manuscriptId) : undefined;
    const draft = nudgeDraft({
      agentName: ag ? agentPrimary(ag) : null,
      dateSent: q?.dateSent,
      msTitle: ms?.title,
      requested: requestedProse(q?.status as QueryStatus | undefined),
    });
    const chaseWhen = [whenSent(), whenYesterday(), WHEN_OTHER];
    const weeksWaited = q?.dateSent ? Math.floor((Date.now() - new Date(q.dateSent).getTime()) / (7 * 86400000)) : null;
    return journeySheet({
      /* ⚠️ THE DRAFT IS A LEDE, NOT A STEP. The ref is a mockup with no draft feature, so it had no
         slot for one; deleting a working "here is a note you could send" to match a drawing would
         be losing a feature to a picture. It is not numbered because it is not a decision. */
      lede: (
        <div className="tdb-jnlede">
          <div className="tdb-ffdraft">{draft}</div>
          <button type="button" className="tdb-ffcopy" onClick={() => { navigator.clipboard?.writeText(draft); setCopied(true); window.setTimeout(() => setCopied(false), 1400); }}>
            {copied ? "✓ Copied" : "⧉  Copy the draft"}
          </button>
          <div className="tdb-ffsmall">ScriptAlly never sends anything for you. Copy it, send it from your own email, then record it below.</div>
        </div>
      ),
      steps: [{
        id: "how",
        name: "How you chased",
        body: (
          <div className="tdb-jnseg">
            {METHODS.slice(0, 2).map((m) => (
              <button key={m} type="button" className={method === m ? "on" : ""} onClick={() => setMethod(m)}>
                {m === "QueryManager" ? "Agency portal" : m}
              </button>
            ))}
          </div>
        ),
      },
        whenStep(chaseWhen),
        freeTextStep("asked", "What you asked", "A line about what you said, so the next one reads differently…"),
      {
        id: "checkback",
        name: "Check back",
        body: (
          <>
            <div className="tdb-jnseg">
              {([[14, "2 weeks"], [28, "4 weeks"], [null, "Don’t remind me"]] as [number | null, string][]).map(([d, label]) => (
                <button key={label} type="button" className={checkBack === d ? "on" : ""} onClick={() => setCheckBack(d)}>{label}</button>
              ))}
            </div>
            {/* ⚠️ SETTING THE NEXT REMINDER IS PART OF RECORDING THE CHASE, not a separate errand —
                a follow-up you have to remember to schedule is a follow-up you will forget. */}
            <div className="tdb-jnsub">
              {checkBack === null
                ? "Recorded, and this query stops asking. It stays live and nothing is deleted."
                : `We’ll put it back in front of you in ${checkBack === 14 ? "two weeks" : "four weeks"}.`}
            </div>
          </>
        ),
      }],
      reference: {
        heading: ag?.agency ? "What the listing states" : "What you know of their window",
        body: ag?.responseTimeWeeks
          ? <>They state <b>{ag.responseTimeWeeks} weeks</b>{ag.noResponseMeansNo ? <>, and that <b>no reply means no</b></> : null}.</>
          : <>No reply window is recorded for {c.who || "this agent"}. A polite follow-up is fair once their stated window has passed.</>,
        meta: [q?.dateSent ? `Queried ${fmtShort(q.dateSent)}` : null, weeksWaited != null ? `you have waited ${weeksWaited} week${weeksWaited === 1 ? "" : "s"}` : null]
          .filter(Boolean).join(" · ") || undefined,
      },
      summary: journeySummary({
        materials: [],
        channel: method === "QueryManager" ? "Agency portal" : method,
        when: whenText(chaseWhen),
        also: alsoText,
      }),
      commit: {
        label: "Record the chase",
        hint: checkBack === null ? "Logs a follow-up and stops the reminders." : "Logs a follow-up on the query and sets your next reminder.",
        onCommit: () => {
          if (!q) { advance(); return; }
          /**
           * ⚠️ "Don't remind me" STAGES A MUTE ALONGSIDE THE NUDGE, because `logNudge`'s
           * `checkBackDate` is REQUIRED by the write path — it becomes the query's `nudgeDate`, the
           * activity's `reminderDate`, and the "Follow-up reminder set for …" line. Making it
           * optional would ripple into `db.tsx`, which this pack does not touch. So the chase is
           * logged with the default window and the task is muted, which is what the writer asked
           * for. THE COST, STATED: the activity's display line still names a date they asked not to
           * be reminded on. The fix is an optional `checkBackDate` through `logNudge` + `db.tsx`.
           */
          const days = checkBack ?? DEFAULT_CHECKBACK_DAYS;
          setStaged((s) => [...s, {
            kind: "nudge" as const, cardKey: c.key, label: c.title, queryId: q.id,
            checkBackDate: plusDaysISO(days), nudgeDate: sentDate, method,
            ...(alsoText.trim() ? { note: alsoText.trim() } : {}),
          }, ...(checkBack === null && c.taskType && c.relatedRecordId
            ? [{ kind: "mute-item" as const, cardKey: c.key, label: c.title, taskType: c.taskType, relatedRecordId: c.relatedRecordId }]
            : [])]);
          advance();
        },
      },
    }, journeyBand("pink", "Recording your follow-up", ag, c.initials, "nudge"));
  }

  function offerSheet(c: BoardCard) {
    const q = cardQuery(c);
    const ag = cardAgent(c, q);
    const ms = q ? manuscripts.find((m) => m.id === q.manuscriptId) : undefined;
    const who = c.who || "An agent";
    const kicker = `${who.toUpperCase()}${ag?.agency ? ` · ${ag.agency.toUpperCase()}` : ""} · AN OFFER OF REPRESENTATION`;
    const replyBy = q?.responseDeadline;
    const daysTo = replyBy ? Math.max(0, Math.ceil((new Date(replyBy).getTime() - Date.now()) / 86400000)) : null;
    const OFFER_TERMINAL = new Set<QueryStatus>([QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE]);
    const others = q ? queries.filter((x) => x.manuscriptId === q.manuscriptId && x.id !== q.id && !OFFER_TERMINAL.has(x.status as QueryStatus)) : [];

    // ── door: notify — select-many → reminders (popup-notify-scrim P2; ref §2). Writes NO
    //    activities — the outputs are user tasks only, through the existing addUserTask path. ──
    if (offerDoor === "notify" && q) {
      const groups = notifyGroups(q, queries, agents, userTasks);
      const allRows = [...groups.pages, ...groups.queryOnly];
      const selectable = allRows.filter((r) => !r.covered);
      const selRows = selectable.filter((r) => notifySel[r.queryId]);
      const n = selRows.length;
      const kick = `${who.toUpperCase()}’S OFFER · LETTING YOUR OTHER AGENTS KNOW`;
      const selRow = (r: NotifyRow) => (
        <label key={r.queryId} className={`tdb-ffselrow${r.covered ? " covered" : notifySel[r.queryId] ? " on" : ""}`}>
          {r.covered
            ? <span className="tdb-ffcovered" title="A live reminder already exists for this agent">✓</span>
            : <input type="checkbox" checked={!!notifySel[r.queryId]} onChange={() => setNotifySel((p) => ({ ...p, [r.queryId]: !p[r.queryId] }))} />}
          <span className="tdb-ffseltx"><b>{r.name}</b><span>{[r.agency?.toUpperCase(), r.statusLine].filter(Boolean).join(" · ")}{r.covered ? " · REMINDER SET" : ""}</span></span>
          {r.caution && <span className="tdb-ffselwarn">{r.caution}</span>}
        </label>
      );
      if (notifyStep === "rem") {
        const names = selRows.map((r) => r.name).join(" · ");
        return sheet(
          <>
            <div className="tdb-ffqsub">One task per agent — <b>“Tell {"{agent}"} about the offer”</b> — on Urgent{replyBy ? <>, each carrying the <b>{fmtShort(replyBy)}</b> deadline</> : ", ready the moment you are"}. They tick off as you send each message{replyBy ? ", and anyone who hasn’t been told chases you as the deadline nears" : ""}.</div>
            <div className="tdb-ffremcard">
              <span className="tdb-ffremic" aria-hidden>✓</span>
              <span><b>{n} reminder{n === 1 ? "" : "s"}, ready to go</b><span className="tdb-ffremnames">{names}</span></span>
            </div>
            <div className="tdb-ffsmall">Skip this if you’re sending all {n === 1 ? "your message" : `${n} messages`} right now — you can always tick the task off the moment each one goes.</div>
          </>,
          <>
            <button type="button" className="tdb-ffback" onClick={() => setNotifyStep("pick")}>← Back</button>
            <span className="tdb-sp" />
            <button type="button" className="tdb-ffskip" onClick={() => { setNotifyStep("pick"); setOfferDoor(""); }}>Skip — I’ll send them now</button>
            <button type="button" className="tdb-ffpri" disabled={saving} onClick={async () => {
              setSaving(true);
              const fields = reminderFields(selRows, q.id, replyBy);
              for (const f of fields) await addUserTask(f);
              setSaving(false);
              onToast(`${n} reminder${n === 1 ? "" : "s"} on your desk.`);
              setNotifyStep("pick"); setOfferDoor("");
            }}>Create {n} reminder{n === 1 ? "" : "s"}</button>
          </>,
          band("pink", `★ ${kick}`, "Shall I put them on your desk?", undefined, { art: "offer", kickCls: "off" }),
        );
      }
      return sheet(
        <>
          <div className="tdb-ffqsub">Standard etiquette is to tell <b>everyone still considering {ms?.title || "this manuscript"}</b> in one sweep — same message, same deadline — so they can read quickly or step aside.</div>
          {replyBy
            ? <span className="tdb-ffreplyby">⏱ THE DEADLINE YOU GIVE THEM = YOUR REPLY-BY · {fmtShort(replyBy).toUpperCase()}</span>
            : <span className="tdb-ffreplyby">⏱ GIVE THEM ALL ONE DEADLINE — ETIQUETTE SAYS ONE TO TWO WEEKS</span>}
          {groups.pages.length > 0 && <><div className="tdb-ffgrp">HAVE YOUR PAGES</div><div className="tdb-ffsel">{groups.pages.map(selRow)}</div></>}
          {groups.queryOnly.length > 0 && <><div className="tdb-ffgrp">QUERY ONLY</div><div className="tdb-ffsel">{groups.queryOnly.map(selRow)}</div></>}
          {allRows.length === 0 && <div className="tdb-ffsmall">No other open queries on this manuscript — nothing to notify.</div>}
        </>,
        <>
          <button type="button" className="tdb-ffback" onClick={() => setOfferDoor("")}>← Back</button>
          <span className="tdb-sp" />
          <button type="button" className="tdb-ffpri" onClick={() => { if (n === 0) { setOfferDoor(""); } else { setNotifyStep("rem"); } }}>
            {n === 0 ? "Continue without telling anyone" : `Continue · ${n} selected`}
          </button>
        </>,
        band("pink", `★ ${kick}`, "Who should hear about it?", undefined, { art: "offer", kickCls: "off" }),
      );
    }

    // ── door: record the decision (THE completion) ──
    if (offerDoor === "decide") return sheet(
      <>
        <div className="tdb-ffqsub">This completes the task — the decision is logged at the time you record it.</div>
        <div className="tdb-ffseg">
          <button type="button" className={`tdb-ffopt${offerChoice === "accepted" ? " sel" : ""}`} onClick={() => setOfferChoice("accepted")}>
            <b>I accepted</b><span>{who} represents {ms?.title || "your manuscript"}</span>
          </button>
          <button type="button" className={`tdb-ffopt${offerChoice === "declined" ? " sel" : ""}`} onClick={() => setOfferChoice("declined")}>
            <b>I declined</b><span>The querying continues</span>
          </button>
        </div>
        {offerChoice === "declined" && <p className="tdb-ffhint">Your other queries stay open and untouched.</p>}
        {offerChoice === "accepted" && (
          <p className="tdb-ffhint"><b>Congratulations.</b> Your {others.length} other open {others.length === 1 ? "query" : "queries"} for this manuscript aren’t changed automatically — closing them (and the courtesy notes that go with it) is coming as its own guided step soon; until then they stay visible on the Queries Hub.</p>
        )}
      </>,
      <>
        <button type="button" className="tdb-ffback" onClick={() => setOfferDoor("")}>← Back</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffpri" disabled={!offerChoice || saving} onClick={async () => {
          if (!q || !offerChoice) return;
          setSaving(true);
          const r = await recordOfferDecision(q.id, offerChoice);
          setSaving(false);
          if (!r.success) { onToast(r.error || "Couldn’t record the decision — try again."); return; }
          onToast(offerChoice === "accepted" ? "Recorded — congratulations." : "Recorded — declined; the querying continues.");
          advance();
        }}>Record decision</button>
      </>,
      band("pink", "★ Recording your decision", <>What did you tell {who}?</>, undefined, { art: "offer", kickCls: "off" }),
    );

    // ── door: I need time — the existing snooze flag, capped at reply-by ──
    if (offerDoor === "time") return sheet(
      <>
        <div className="tdb-ffqsub">The offer card stays on Urgent — just quieter — and wakes on the day you choose.</div>
        <div className="tdb-ffremrow">
          ⏰ Remind me on
          <input type="date" value={remindDate} min={todayISO()} max={replyBy ? replyBy.slice(0, 10) : undefined} onChange={(e) => setRemindDate(e.target.value)} />
          {replyBy && <span className="tdb-ffsmall">Reply-by is <b>{fmtShort(replyBy)}</b> — we’ll cap the reminder there.</span>}
        </div>
      </>,
      <>
        <button type="button" className="tdb-ffback" onClick={() => setOfferDoor("")}>← Back</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffpri" disabled={!remindDate} onClick={async () => {
          if (!c.relatedRecordId || !remindDate) return;
          const capped = replyBy && remindDate > replyBy.slice(0, 10) ? replyBy.slice(0, 10) : remindDate;
          await upsertTaskFlag(flagKeyForTask("offer_received", c.relatedRecordId), { snoozedUntil: journeyEventISO(capped, new Date().toISOString()) });
          onToast("Quieter until then — the reply-by date still counts down.");
          advance();
        }}>Set reminder</button>
      </>,
      band("pink", "★ Taking time to decide", "When should we bring this back?", undefined, { art: "offer", kickCls: "off" }),
    );

    // ── the celebration + fork ──
    return sheet(
      <>
        <div className="tdb-ffstar" aria-hidden>★</div>
        <div className="tdb-ffqsub">This is the moment the querying was for. The offer is already on {ms?.title ? <b>{ms.title}</b> : "the manuscript"}’s timeline — what happens next is yours to choose.</div>
        {replyBy && <span className="tdb-ffreplyby">⏱ REPLY BY {fmtShort(replyBy).toUpperCase()}{daysTo != null ? ` · ${daysTo} DAY${daysTo === 1 ? "" : "S"}` : ""}</span>}
        <div className="tdb-ffoffernote" aria-hidden>— worth a cup of tea at least</div>
        <div className="tdb-ffdoors">
          <button type="button" className="tdb-ffdoor" onClick={() => {
            if (q) {
              const g = notifyGroups(q, queries, agents, userTasks);
              setNotifySel(Object.fromEntries([...g.pages, ...g.queryOnly].filter((r) => !r.covered).map((r) => [r.queryId, true])));
            }
            setNotifyStep("pick"); setOfferDoor("notify");
          }}>
            <span className="tdb-ffdic">✉</span>
            <span className="tdb-ffdtx"><b>Let your other agents know</b><span>{others.length ? `${others.length} agent${others.length === 1 ? " is" : "s are"} still considering ${ms?.title || "this manuscript"} — courtesy says they hear about the offer.` : "No other open queries on this manuscript."}</span></span>
          </button>
          <button type="button" className="tdb-ffdoor sage" onClick={() => setOfferDoor("decide")}>
            <span className="tdb-ffdic">✓</span>
            <span className="tdb-ffdtx"><b>Record your decision</b><span>Accepted or declined — this is what completes the task.</span></span>
          </button>
          <button type="button" className="tdb-ffdoor" onClick={() => {
            const week = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
            const cap = replyBy ? replyBy.slice(0, 10) : undefined;
            setRemindDate(cap && week > cap ? cap : week);
            setOfferDoor("time");
          }}>
            <span className="tdb-ffdic">⏳</span>
            <span className="tdb-ffdtx"><b>I need time to decide</b><span>Set a reminder against the reply-by date. The card stays on your board, quieter.</span></span>
          </button>
        </div>
      </>,
      <>
        <button type="button" className="tdb-ffback" disabled={qi === 0} onClick={backOne}>← Back</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffskip" onClick={advance}>Not now — leave it</button>
      </>,
      // ceremony D — the offer celebration (kicker carries the ★ per the family law)
      band("pink", `★ ${kicker}`, <>{who} has offered to represent you.</>, undefined, { art: "offerCelebration", center: true, kickCls: "off" }),
    );
  }

  function staleSheet(c: BoardCard) {
    const q = cardQuery(c);
    const ag = cardAgent(c, q);
    /* step 0 keeps the two STANCES — still waiting, stop asking — which are not closes and must not
       be lost behind a journey whose every outcome ends the query. */
    if (step === 0) return sheet(
      <>
        <div className="tdb-ffqsub">Closing keeps your response rate honest. Nothing is deleted, and it reopens if a reply is ever logged.</div>
        {whoRow(ag, c.initials)}
        {openQueryLink(q)}
        <div className="tdb-ffchoices">
          <button type="button" className="tdb-ffchoice" onClick={() => c.taskType && c.relatedRecordId && stageAndAdvance({ kind: "snooze", cardKey: c.key, label: c.title, taskType: c.taskType, relatedRecordId: c.relatedRecordId, days: 7 })}>
            <span className="tdb-ffck" /><span><span className="tdb-ffct">Still waiting — ask me in a week</span></span>
          </button>
          <button type="button" className="tdb-ffchoice" onClick={() => c.taskType && c.relatedRecordId && stageAndAdvance({ kind: "mute-item", cardKey: c.key, label: c.title, taskType: c.taskType, relatedRecordId: c.relatedRecordId })}>
            <span className="tdb-ffck" /><span><span className="tdb-ffct">Stop asking about this one</span>
            <span className="tdb-ffcs">Mutes the reminder — deletes nothing.</span></span>
          </button>
        </div>
      </>,
      <>
        <button type="button" className="tdb-ffback" disabled={qi === 0} onClick={backOne}>← Back</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffskip" onClick={advance}>Leave it</button>
        <button type="button" className="tdb-ffpri" onClick={() => setStep(1)}>Close the record →</button>
      </>,
      band("cof", "Stale query", emTitle(c), c.subtitle || undefined, { art: "stale", kickCls: "hk" }),
    );
    const chosen = CLOSE_REASONS.find((r) => r.key === closeReason) ?? CLOSE_REASONS[0];
    const windowClosed = q?.responseDeadline ? ymdLocal(new Date(q.responseDeadline)) : undefined;
    /* the first option is the window's own date where the record has one — a close usually happened
       when their window ran out, not on the day the writer got round to recording it */
    const closeWhen: WhenOption[] = [
      ...(windowClosed ? [{ mode: "closed", label: "When their window closed", ymd: windowClosed }] : []),
      whenSent(),
      WHEN_OTHER,
    ];
    const lastEntry = activities.filter((a) => a.queryId === q?.id).map((a) => a.date).sort().slice(-1)[0];
    return journeySheet({
      steps: [{
        id: "what",
        name: "What happened",
        body: (
          <div className="tdb-jnopts">
            {CLOSE_REASONS.map((r) => (
              <button key={r.key} type="button" className={`tdb-jnrow${closeReason === r.key ? " on" : ""}`}
                aria-pressed={closeReason === r.key} onClick={() => setCloseReason(r.key)}>
                <span className="tdb-jnbx rad">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </span>
                <span>{r.label}<span className="tdb-jnsub">{r.gloss}</span></span>
              </button>
            ))}
          </div>
        ),
      },
        whenStep(closeWhen, "When", "The entry is made now; the day you pick is kept on it."),
        freeTextStep("remember", "Anything to remember", "Worth noting for next time you query this agent…"),
      ],
      reference: {
        heading: "What closing does",
        body: <>The query leaves your active count and joins your history. <b>Nothing is deleted</b>, and it reopens if a reply is ever logged.</>,
        meta: lastEntry ? `Last entry ${fmtShort(lastEntry)}` : undefined,
      },
      summary: journeySummary({ materials: [chosen.label], when: whenText(closeWhen), also: alsoText }),
      commit: {
        label: "Record the close",
        hint: "Reopens by itself if they reply.",
        onCommit: () => {
          void (async () => {
            if (!q) { advance(); return; }
            const prev = q.status as QueryStatus;
            /**
             * ⚠️ THE CHOSEN DAY RIDES IN THE NOTE, NOT THE TIMESTAMP. `updateQueryStatus` stamps
             * `new Date()` and takes no event date, so a back-dated close cannot move the entry
             * without a change in `db.tsx` — which this pack does not touch. The note carries what
             * the writer said happened; the step says so on screen rather than letting the picker
             * imply a backdate it cannot perform.
             */
            const day = whenText(closeWhen);
            const note = [`${chosen.label} — recorded from the To-do journey`, day ? `dated ${day}` : null, alsoText.trim() || null]
              .filter(Boolean).join(" · ");
            await updateQueryStatus(q.id, chosen.status, note);
            // Undo = delete the created activity record (the existing undo path), never a compensating entry.
            onToast(`Closed — “${c.title}”`, { label: "Undo", fn: async () => { await undoQueryStatus(q.id, prev, chosen.status); onToast("Restored"); } });
            advance();
          })();
        },
      },
    }, journeyBand("cof", "Closing the record", ag, c.initials, "stale"));
  }

  function dqSheet(c: BoardCard) {
    const ag = c.relatedRecordId ? agents.find((a) => a.id === c.relatedRecordId) : undefined;
    const needs: AgentDataNeed[] = ag ? agentDataQualityNeeds(ag) : [];
    if (step === 0) return sheet(
      <>
        <div className="tdb-ffqsub">Clean data is how ScriptAlly judges fit and checks your package — worth most before you query. Fill what you know; skip what you don’t.</div>
        {whoRow(ag, c.initials)}
      </>,
      <>
        <button type="button" className="tdb-ffback" disabled={qi === 0} onClick={backOne}>← Back</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffskip" onClick={advance}>Not now</button>
        <button type="button" className="tdb-ffpri" onClick={() => setStep(1)}>Fill them in →</button>
      </>,
      band("cof", "Housekeeping", emTitle(c), undefined, { art: "details", kickCls: "hk" }),
    );
    const filled = needs.some((n) => (rows[n] ?? "").trim());
    return sheet(
      <>
        <div className="tdb-ffbatch">
          {needs.includes("responseTime") && (
            <div className="tdb-ffbrow">
              <span className="tdb-ffbn"><span className="tdb-ffbnn">Reply window</span></span>
              <span className="tdb-ffbf">
                {WEEK_CHIPS.map((w) => <button key={w} type="button" className={`tdb-ffbc${rows.responseTime === String(w) ? " on" : ""}`} onClick={() => setRows((p) => ({ ...p, responseTime: String(w) }))}>{w} wks</button>)}
                <input className="tdb-ffother" type="number" min={1} placeholder="other" value={WEEK_CHIPS.includes(Number(rows.responseTime)) ? "" : rows.responseTime ?? ""} onChange={(e) => setRows((p) => ({ ...p, responseTime: e.target.value }))} />
                <label className="tdb-fftick"><input type="checkbox" checked={!!noMeansNo.one} onChange={(e) => setNoMeansNo({ one: e.target.checked })} />No reply = no</label>
              </span>
            </div>
          )}
          {needs.includes("materials") && (
            <div className="tdb-ffbrow">
              <span className="tdb-ffbn"><span className="tdb-ffbnn">Materials wanted</span></span>
              <span className="tdb-ffbf">{MATERIAL_VOCAB.map((m) => {
                const set = new Set((rows.materials ?? "").split(",").map((s) => s.trim()).filter(Boolean));
                return <button key={m} type="button" className={`tdb-ffbc${set.has(m) ? " on" : ""}`} onClick={() => { set.has(m) ? set.delete(m) : set.add(m); setRows((p) => ({ ...p, materials: Array.from(set).join(", ") })); }}>{m}</button>;
              })}</span>
            </div>
          )}
          {needs.includes("mswl") && (
            <div className="tdb-ffbrow">
              <span className="tdb-ffbn"><span className="tdb-ffbnn">Wish list</span></span>
              <span className="tdb-ffbf"><input className="tdb-ffwide" type="text" placeholder="What are they looking for?" value={rows.mswl ?? ""} onChange={(e) => setRows((p) => ({ ...p, mswl: e.target.value }))} /></span>
            </div>
          )}
        </div>
      </>,
      <>
        <button type="button" className="tdb-ffback" onClick={backOne}>← Back</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffskip" onClick={advance}>Skip</button>
        <button type="button" className="tdb-ffpri" disabled={!filled} onClick={async () => {
          if (!ag) { advance(); return; }
          const fields: Partial<Agent> = {};
          if ((rows.responseTime ?? "").trim()) { fields.responseTimeWeeks = Number(rows.responseTime); fields.noResponseMeansNo = !!noMeansNo.one; }
          if ((rows.materials ?? "").trim()) fields.materialsWanted = rows.materials.split(",").map((s) => s.trim()).filter(Boolean);
          if ((rows.mswl ?? "").trim()) fields.mswlNotes = rows.mswl;
          try {
            await updateAgent(ag.id, fields);
            resolveTaskFlag(flagKeyForTask("data_quality_poor", ag.id));
            onToast("Saved to the profile.");
          } catch { onToast("Couldn’t save — try again."); }
          advance();
        }}>Save & continue →</button>
      </>,
      band("cof", <>{c.who || "Agent"} · details</>, "What do you know?", undefined, { art: "details", kickCls: "hk" }),
    );
  }

  function groupSheet(g: HkGroup) {
    const meta = HK_RULES[g.rule];
    const pro = isProUser(currentUser);
    const mutedList = mutedMembersForRule(g.rule, agents, taskFlags, Date.now());
    if (step === 0) {
      const title = meta.title(g.members.length);
      const numMatch = title.match(/^(\d+\s+agents?)([\s\S]*)$/);
      return sheet(
        <>
          <div className="tdb-ffqsub">{HK_PAYOFF[g.rule]} It’s usually on the agency’s submissions page. Fill what you know; skip what you don’t.</div>
          {mutedList.length > 0 && (
            <div className="tdb-ffsmall">
              <button type="button" className="tdb-fflink" onClick={() => setShowMuted((s) => !s)}>{mutedList.length} muted — {showMuted ? "hide" : "show"}</button>
              {showMuted && mutedList.map((mm) => (
                <span key={mm.agentId} className="tdb-ffmuted">{mm.agentName}
                  <button type="button" className="tdb-ffunmute" onClick={() => { upsertTaskFlag(flagKeyForTask("data_quality_poor", mm.agentId), { snoozedUntil: null }); onToast("Unmuted — it’ll come back to the board."); }}>Unmute</button>
                </span>
              ))}
            </div>
          )}
        </>,
        <>
          <button type="button" className="tdb-ffback" disabled={qi === 0} onClick={backOne}>← Back</button>
          <span className="tdb-sp" />
          <button type="button" className="tdb-ffskip" onClick={advance}>Not now</button>
          <button type="button" className="tdb-ffskip" onClick={() => stageAndAdvance({ kind: "mute-rule", cardKey: itemKey({ kind: "group", group: g }), label: meta.label, rule: g.rule })}>Never ask</button>
          <button type="button" className="tdb-ffpri" onClick={() => setStep(1)}>Fix them together →</button>
        </>,
        band("cof", <>Housekeeping · {meta.label.toLowerCase()}</>, numMatch ? <><em>{numMatch[1]}</em>{numMatch[2]}.</> : title, undefined, { art: "batch", kickCls: "hk" }),
      );
    }
    const filledIds = g.members.filter((m) => (rows[m.agentId ?? ""] ?? "").trim()).map((m) => m.agentId!);
    const q2 = g.rule === "dq_responseTime" ? "They usually reply within…" : g.rule === "dq_materials" ? "They ask to receive…" : "What are they looking for?";
    return sheet(
      <>
        <div className="tdb-ffbatch">{g.members.map((m) => {
          const id = m.agentId ?? m.card.key;
          const prov = m.agentId ? found[m.agentId] : undefined;
          return (
            <div key={m.card.key} className="tdb-ffbrow">
              <span className="tdb-ffbav">{m.card.initials}</span>
              <span className="tdb-ffbn">
                <span className="tdb-ffbnn">{m.agentName}{m.queried && <span className="tdb-pip" title="You’ve queried this agent" />}</span>
                {m.agency && <span className="tdb-ffbna">{m.agency}</span>}
              </span>
              <span className="tdb-ffbf">
                {g.rule === "dq_responseTime" && <>
                  {WEEK_CHIPS.map((w) => <button key={w} type="button" className={`tdb-ffbc${rows[id] === String(w) ? " on" : ""}`} onClick={() => setRows((p) => ({ ...p, [id]: String(w) }))}>{w} wks</button>)}
                  <input className="tdb-ffother" type="number" min={1} placeholder="other" value={WEEK_CHIPS.includes(Number(rows[id])) ? "" : rows[id] ?? ""} onChange={(e) => setRows((p) => ({ ...p, [id]: e.target.value }))} />
                </>}
                {g.rule === "dq_materials" && MATERIAL_VOCAB.map((mv) => {
                  const set = new Set((rows[id] ?? "").split(",").map((s) => s.trim()).filter(Boolean));
                  return <button key={mv} type="button" className={`tdb-ffbc${set.has(mv) ? " on" : ""}`} onClick={() => { set.has(mv) ? set.delete(mv) : set.add(mv); setRows((p) => ({ ...p, [id]: Array.from(set).join(", ") })); }}>{mv}</button>;
                })}
                {g.rule === "dq_mswl" && <input className="tdb-ffwide" type="text" placeholder="What are they looking for?" value={rows[id] ?? ""} onChange={(e) => setRows((p) => ({ ...p, [id]: e.target.value }))} />}
                {prov && <span className="tdb-ffprov" title={prov.source}>✨ Found · {prov.source}{assistAt ? ` · ${fmtShort(assistAt)}` : ""} — check before saving</span>}
                {!prov && m.agentId && notFound.has(m.agentId) && !(rows[id] ?? "").trim() && <span className="tdb-ffnf">Not found — enter manually</span>}
              </span>
            </div>
          );
        })}</div>
        {meta.assistable && (
          <div className="tdb-ffassist">
            <button type="button" className="tdb-ffcopy" disabled={assisting} onClick={async () => {
              if (!pro) { requestExit(() => onNavigate("plans")); return; }
              setAssisting(true); setAssistMsg(null);
              const targets = g.members.filter((m) => m.agentId);
              try {
                const rs = await fetchAssistedFill({ rule: g.rule as "dq_responseTime" | "dq_materials" | "dq_mswl", agents: targets.map((m) => ({ agentId: m.agentId!, name: m.agentName, ...(m.agency ? { agency: m.agency } : {}) })) });
                const byId: Record<string, AssistFound> = {};
                const next = { ...rows };
                for (const r of rs) { byId[r.agentId] = r; next[r.agentId] = r.value; }
                setFound((f) => ({ ...f, ...byId })); setRows(next); setAssistAt(new Date().toISOString());
                setNotFound(new Set(targets.map((m) => m.agentId!).filter((id) => !byId[id] && !(rows[id] ?? "").trim())));
                setAssistMsg(rs.length ? `Found ${rs.length} of ${targets.length} — check each before saving.` : "Nothing sourced this time — enter them manually.");
              } catch (e) {
                setAssistMsg(e instanceof AssistFillError && e.code === "deadline-exceeded" ? "Took too long — enter these manually." : "Couldn’t reach assisted fill — enter these manually.");
              } finally { setAssisting(false); }
            }}>
              {assisting ? "Searching…" : <>✨ Find these for me{!pro && <span className="tdb-propill">Pro</span>}</>}
            </button>
            {assistMsg && <span className="tdb-ffsmall">{assistMsg}</span>}
          </div>
        )}
      </>,
      <>
        <button type="button" className="tdb-ffback" onClick={backOne}>← Back</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffskip" onClick={advance}>Skip the rest</button>
        <button type="button" className="tdb-ffpri" disabled={!filledIds.length || saving} onClick={async () => {
          // THE batch save — shared with the quick rail's card-flip (hkSave.saveHkRows).
          const res = await saveHkRows(g, rows, noMeansNo, found, new Date().toISOString(), { agents, updateAgent, resolveTaskFlag });
          onToast(res.failed ? `Saved ${res.ok}; ${res.failed} failed.` : `Saved ${res.ok}.`, res.undo ? { label: "Undo all", fn: res.undo } : undefined);
          advance();
        }}>Save {filledIds.length || ""} & continue →</button>
      </>,
      band("cof", <>{meta.label} · {filledIds.length} of {g.members.length} filled</>, q2, undefined, { art: "batch", kickCls: "hk" }),
    );
  }

  /**
   * ⚠️ THE WRITER'S OWN NOTE, AND NOTHING IS LOGGED AGAINST A QUERY. It is the one journey whose
   * commit is the completion itself — there is no event to record, because the note was never an
   * exchange with an agent. Which is exactly why the reference panel says so: this surface looks
   * like the five that DO write, and the only thing distinguishing it is that it says it doesn't.
   */
  function noteSheet(c: BoardCard) {
    const text = noteText ?? c.title;
    const dirty = text.trim() !== c.title && text.trim().length > 0;
    const saveText = dirty && c.userTaskId ? { text: text.trim() } : {};
    return journeySheet({
      steps: [{
        id: "note",
        name: "Your note",
        body: (
          <>
            {/* the Caveat hand — a note the writer wrote to themselves stays in their handwriting */}
            <div className="tdb-ffalso">
              <textarea className="tdb-fffree tdb-jnbignote" value={text} aria-label="Your note"
                onChange={(e) => setNoteText(e.target.value)} />
            </div>
            {c.record && <div className="tdb-ffsmall">Attached to <b>{c.record.replace(/^On /, "")}</b>.</div>}
          </>
        ),
      }],
      reference: {
        heading: "Your own task",
        body: <>Ticking it is what finishes it. <b>Nothing is logged against a query.</b></>,
        meta: c.due || undefined,
      },
      /* the summary reads the live field, like every other journey — an emptied note says so */
      summary: text.trim() ? `Crossing off: ${text.trim()}` : "Nothing selected yet.",
      commit: {
        label: "Cross it off",
        hint: "Nothing is logged against a query.",
        disabled: !text.trim(),
        onCommit: () => {
          if (c.userTaskId) {
            updateUserTask(c.userTaskId, { done: true, completedAt: new Date().toISOString(), ...saveText });
            onToast(`Done — “${c.title}”`, { label: "Undo", fn: async () => { await updateUserTask(c.userTaskId!, { done: false }); onToast("Restored"); } });
          }
          advance();
        },
      },
      /* ⚠️ "Keep it" SURVIVES AS A SECOND FOOTER ACTION, deliberately beyond the ref's three. The
         note is EDITABLE here, so without it an edit could only be saved by also completing the
         task — and Cancel must write nothing, which is the rule that would otherwise eat the edit. */
      extraFoot: (
        <button type="button" className="tdb-ffskip"
          onClick={() => { if (dirty && c.userTaskId) updateUserTask(c.userTaskId, { text: text.trim() }); advance(); }}>
          Keep it
        </button>
      ),
    }, journeyBand("paper", "Crossing it off", cardAgent(c, cardQuery(c)), c.initials, "note"));
  }

  // ── sweep mode — the speed grammar (Phase D). Writes are IMMEDIATE (the Phase-C defaults through
  // the SAME builders/write paths), a brief inline receipt shows, then the queue advances; Undo rides
  // the toast. Nothing stages in sweep. ──
  const advanceAfterReceipt = (line: string) => {
    setSweepReceipt(line);
    window.setTimeout(() => advance(), 900);
  };

  async function sweepDone(c: BoardCard) {
    const nowIso = new Date().toISOString();
    if (c.userTaskId) {
      await updateUserTask(c.userTaskId, { done: true, completedAt: nowIso });
      onToast(`Done — “${c.title}”`, { label: "Undo", fn: async () => { await updateUserTask(c.userTaskId!, { done: false }); onToast("Restored"); } });
      advanceAfterReceipt(`${c.title} — struck through on Today.`);
      return;
    }
    const q = cardQuery(c);
    if (!q) { advance(); return; }
    if (c.taskType === "no_response_close") {
      const prev = q.status as QueryStatus;
      await updateQueryStatus(q.id, QueryStatus.NO_RESPONSE, "Closed as no response from sweep mode");
      onToast(`Done — “${c.title}”`, { label: "Undo", fn: async () => { await undoQueryStatus(q.id, prev, QueryStatus.NO_RESPONSE); onToast("Restored"); } });
      advanceAfterReceipt("Logged as no response — not a rejection, so your response rate stays honest.");
      return;
    }
    if (c.taskType === "nudge_overdue") {
      const p = quickNudgePayload({ cardKey: c.key, label: c.title, queryId: q.id, method: q.sendMethod, nowIso });
      const r = await logNudge(...nudgeWriteArgs(p, new Date().toISOString()));
      if (!r.success) { onToast(r.error || "Couldn’t log the nudge."); return; }
      const undo = async () => {
        const acts = activitiesRef.current
          .filter((a) => a.queryId === q.id && a.activityType === ActivityType.NUDGE_SENT)
          .sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());
        if (acts[0]?.id) await deleteActivity(acts[0].id);
      };
      onToast(`Done — “${c.title}”`, { label: "Undo", fn: async () => { await undo(); onToast("Restored"); } });
      advanceAfterReceipt(receiptLine(p, todayISO()));
      return;
    }
    const action = getPrimaryAction(q.status as QueryStatus);
    if (action.kind !== "mark-sent") { advance(); return; }
    // B3 — the same soft guard in this path's grammar (the styled ConfirmAsk); decline writes nothing.
    const priorQuick = priorSameTypeSend(activitiesRef.current, q.id, action.target as QueryStatus, action.markKind === "resubmit");
    if (priorQuick && !(await confirmAsk(duplicateSendPrompt(action.target as QueryStatus, c.who, priorQuick), { confirmLabel: "Send again", cancelLabel: "Cancel" }))) return;
    const p = quickSendPayload({ cardKey: c.key, label: c.title, taskType: c.taskType, queryId: q.id, targetStatus: action.target as QueryStatus, isResubmit: action.markKind === "resubmit", method: q.sendMethod, nowIso });
    const prev = q.status as QueryStatus;
    await recordMaterialsSent(markSentWriteArgs(p)); // the ONE mark-sent write path
    onToast(`Done — “${c.title}”`, { label: "Undo", fn: async () => { await undoQueryStatus(q.id, prev, p.targetStatus); onToast("Restored"); } });
    advanceAfterReceipt(receiptLine(p, todayISO(), materialOptsForTask(c.taskType)));
  }

  function sweepSnooze(it: FocusItem) {
    if (it.kind === "group") {
      it.group.members.forEach((m) => m.agentId && dismissTask("data_quality_poor", m.agentId, "fixed snooze", 7));
      onToast(`Snoozed until next week`, { label: "Undo", fn: async () => { it.group.members.forEach((m) => m.agentId && upsertTaskFlag(flagKeyForTask("data_quality_poor", m.agentId), { snoozedUntil: null, unbumpSnooze: true })); onToast("Restored"); } });
      advance();
      return;
    }
    const c = it.card;
    if (c.userTaskId) {
      const key = { taskType: USER_TASK_FLAG_TYPE, queryId: c.userTaskId };
      upsertTaskFlag(key, { snoozedUntil: plusDaysISO(7), bumpSnooze: true });
      onToast(`Snoozed until next week`, { label: "Undo", fn: async () => { await upsertTaskFlag(key, { snoozedUntil: null, unbumpSnooze: true }); onToast("Restored"); } });
    } else if (c.taskType && c.relatedRecordId) {
      /* ⚠️ THE PATH THAT BYPASSED THE OFFER CAP (tasks-pages P2, walk fix 2). This generic
         snooze wrote a flat 7 days for every derived card — an offer walked through the dock's
         More → this sheet and came back reading "BACK 7 AUG", past the tomorrow cap the menu
         enforces. An offer's reply-by is not ours to move: one day, and the toast says so. */
      /* ⚠️ THE CEILING COMES FROM lib/todoActions, not from a number written here
         (tasks-consolidation, extraction). This was the THIRD copy of the offer cap — the page
         had one, the staged runner below had another, and this had its own. Three copies of one
         rule is three chances to disagree, and the rule already shipped wrong once. */
      const days = clampSnoozeDays(c.taskType, 7);
      dismissTask(c.taskType, c.relatedRecordId, "fixed snooze", days);
      const key = flagKeyForTask(c.taskType, c.relatedRecordId);
      onToast(days === 1 ? `Snoozed until tomorrow` : `Snoozed until next week`, { label: "Undo", fn: async () => { await upsertTaskFlag(key, { snoozedUntil: null, unbumpSnooze: true }); onToast("Restored"); } });
    }
    advance();
  }

  function sweepNever(it: FocusItem, scope: "these" | "rule") {
    if (it.kind === "group") {
      if (scope === "rule") {
        updateUserProfile({ mutedTaskRules: Array.from(new Set([...(currentUser?.mutedTaskRules ?? []), it.group.rule])) });
        onToast("Muted — nothing deleted, the gaps still show on the profiles. Unmute from the lane header.");
      } else {
        it.group.members.forEach((m) => m.agentId && upsertTaskFlag(flagKeyForTask("data_quality_poor", m.agentId), { snoozedUntil: MUTED_UNTIL }));
        onToast("Muted — nothing deleted, the gap still shows on the profile.", { label: "Undo", fn: () => it.group.members.forEach((m) => m.agentId && upsertTaskFlag(flagKeyForTask("data_quality_poor", m.agentId), { snoozedUntil: null })) });
      }
    } else if (it.card.taskType && it.card.relatedRecordId) {
      const key = flagKeyForTask(it.card.taskType, it.card.relatedRecordId);
      upsertTaskFlag(key, { snoozedUntil: MUTED_UNTIL });
      onToast("Muted — nothing deleted, the gap still shows on the record.", { label: "Undo", fn: () => upsertTaskFlag(key, { snoozedUntil: null }) });
    }
    advance();
  }

  // Sweep keyboard grammar: D done · S snooze · → skip · F fix (housekeeping) · N never (housekeeping)
  // · Enter opens an offer. Inert while typing or while a journey sheet is open.
  useEffect(() => {
    if (!sweep || deepDive || atReview || sweepReceipt) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      const it = items[qi];
      if (!it) return;
      const k = e.key.toLowerCase();
      const isGroup = it.kind === "group";
      const j = it.kind === "card" ? cardJourney(it.card) : "group";
      if (k === "arrowright") { e.preventDefault(); advance(); }
      else if (j === "offer" && e.key === "Enter") { e.preventDefault(); setDeepDive(true); }
      else if (k === "d" && !isGroup && j !== "offer" && j !== "dq") { e.preventDefault(); void sweepDone(it.card); }
      else if (k === "s" && j !== "offer") { e.preventDefault(); sweepSnooze(it); }
      else if (k === "f" && (isGroup || j === "dq")) { e.preventDefault(); setDeepDive(true); setStep(1); }
      else if (k === "n" && (isGroup || j === "stale")) { e.preventDefault(); setSweepFork(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sweep, deepDive, atReview, sweepReceipt, qi, items]);

  const kbd = (k: string) => <span className="tdb-ffkbd">{k}</span>;

  function sweepSheet(it: FocusItem) {
    if (sweepReceipt) {
      return sheet(
        <div className="tdb-ffsweepr"><span className="tdb-rtick">✓</span><span>{sweepReceipt}</span></div>,
        <><span className="tdb-sp" /></>,
      );
    }
    if (it.kind === "group") {
      const g = it.group;
      return sheet(
        <>
          {sweepFork ? (
            <div className="tdb-ffbigacts">
              <button type="button" className="tdb-ffbig" onClick={() => sweepNever(it, "these")}>Never — just these agents</button>
              <button type="button" className="tdb-ffbig" onClick={() => sweepNever(it, "rule")}>Never — any agent missing this</button>
              <button type="button" className="tdb-ffbig quiet" onClick={() => setSweepFork(false)}>Cancel</button>
            </div>
          ) : (
            <div className="tdb-ffbigacts">
              <button type="button" className="tdb-ffbig" onClick={() => { setDeepDive(true); setStep(1); }}>{kbd("F")}Fix them together</button>
              <button type="button" className="tdb-ffbig" onClick={() => sweepSnooze(it)}>{kbd("S")}Snooze a week</button>
              <button type="button" className="tdb-ffbig" onClick={() => setSweepFork(true)}>{kbd("N")}Never ask</button>
            </div>
          )}
        </>,
        <>
          <button type="button" className="tdb-ffback" disabled={qi === 0} onClick={backOne}>← Back</button>
          <span className="tdb-sp" />
          <button type="button" className="tdb-ffskip" onClick={advance}>{kbd("→")}Skip</button>
        </>,
        band("cof", <>Housekeeping · {g.meta.label.toLowerCase()}</>, <>{g.meta.title(g.members.length)}.</>, HK_PAYOFF[g.rule], { art: "batch", kickCls: "hk" }),
      );
    }
    const c = it.card;
    const j = cardJourney(c);
    if (j === "offer") {
      return sheet(
        <>
          <div className="tdb-ffbigacts">
            <button type="button" className="tdb-ffbig" onClick={() => setDeepDive(true)}>{kbd("↵")}Open the offer</button>
          </div>
        </>,
        <>
          <button type="button" className="tdb-ffback" disabled={qi === 0} onClick={backOne}>← Back</button>
          <span className="tdb-sp" />
          <button type="button" className="tdb-ffskip" onClick={advance}>{kbd("→")}Skip</button>
        </>,
        band("pink", "★ Offer of representation", <>{c.who ? <em>{c.who}</em> : "An agent"} wants to represent you.</>, "This one needs the moment — no quick anything for an offer.", { art: "offer", kickCls: "off" }),
      );
    }
    const q = cardQuery(c);
    const ag = cardAgent(c, q);
    const streamFam = c.stream === "hk" ? "cof" as const : c.stream === "nt" ? "paper" as const : "pink" as const;
    const streamCls = c.stream === "hk" ? " hk" : c.stream === "nt" ? " nt" : c.warn ? " warn" : "";
    const doneLabel = j === "stale" ? "Close — no response" : j === "nudge" ? "Log the nudge (defaults)" : j === "note" ? "Mark it done" : "Done — log with defaults";
    return sheet(
      <>
        {whoRow(ag, c.initials)}
        {sweepFork && j === "stale" ? (
          <div className="tdb-ffbigacts">
            <button type="button" className="tdb-ffbig" onClick={() => sweepNever(it, "these")}>Never — just this query</button>
            <button type="button" className="tdb-ffbig quiet" onClick={() => setSweepFork(false)}>Cancel</button>
          </div>
        ) : (
          <div className="tdb-ffbigacts">
            {j !== "dq" && <button type="button" className="tdb-ffbig" onClick={() => void sweepDone(c)}>{kbd("D")}{doneLabel}</button>}
            {j === "dq" && <button type="button" className="tdb-ffbig" onClick={() => { setDeepDive(true); setStep(1); }}>{kbd("F")}Fill the details</button>}
            <button type="button" className="tdb-ffbig" onClick={() => sweepSnooze(it)}>{kbd("S")}Snooze a week</button>
            {j === "stale" && <button type="button" className="tdb-ffbig" onClick={() => setSweepFork(true)}>{kbd("N")}Never ask</button>}
          </div>
        )}
      </>,
      <>
        <button type="button" className="tdb-ffback" disabled={qi === 0} onClick={backOne}>← Back</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffskip" onClick={advance}>{kbd("→")}Skip</button>
      </>,
      band(streamFam, c.due || "On your desk", emTitle(c), c.subtitle || undefined, { kickCls: streamCls.trim() }),
    );
  }

  // ── review + done ─────────────────────────────────────────────────────────
  const stagedDetail = (p: StagedPayload): string => {
    if (p.kind === "mark-sent") return [fmtShort(p.sentDate), p.method, p.materials?.length ? p.materials.join(", ") : null].filter(Boolean).join(" · ");
    if (p.kind === "nudge") return [p.nudgeDate ? fmtShort(p.nudgeDate) : null, p.method].filter(Boolean).join(" · ") || "logged";
    if (p.kind === "snooze") return `snoozed ${p.days} days`;
    if (p.kind === "close") return "closes as no response";
    return "never ask";
  };
  const stagedVerb = (p: StagedPayload): { cls: string; label: string } =>
    p.kind === "mark-sent" || p.kind === "nudge" ? { cls: "d", label: "Done" } : p.kind === "close" ? { cls: "d", label: "Closed" } : p.kind === "snooze" ? { cls: "s", label: "Snoozed" } : { cls: "k", label: "Noted" };

  function reviewSheet() {
    if (savedN != null) return sheet(
      <div className="tdb-ffbigdone">
        <div className="tdb-ffcir">✓</div>
      </div>,
      <>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffpri" onClick={onClose}>Back to the board</button>
      </>,
      // ceremony D — a completion/receipt screen
      band("sage", "All saved", <>{savedN} saved. Desk cleared.</>, "They’re logged against their queries and struck through on Today. Go write something.", { art: "reviewClose", center: true }),
    );
    if (!staged.length) return sheet(
      <div className="tdb-ffbigdone">
        <div className="tdb-ffcir">✓</div>
      </div>,
      <>
        <button type="button" className="tdb-ffback" onClick={() => { setQi(items.length - 1); setStep(0); }}>← Back</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffpri" onClick={onClose}>Back to the board</button>
      </>,
      // ceremony D — the walk/sweep completion screen
      band("sage", sweep ? "Lane swept" : "Desk walked", sweep ? "Lane swept." : "Desk walked.", sweep ? "Everything got a decision — done, snoozed, or left for later." : "You left everything as it was — sometimes that’s the right call too.", { art: "reviewClose", center: true }),
    );
    return sheet(
      <>
        {staged.map((p, i) => {
          const v = stagedVerb(p);
          return (
            <div key={`${p.cardKey}-${i}`} className="tdb-ffsum">
              <span className={`tdb-ffverb ${v.cls}`}>{v.label}</span>
              <span className="tdb-ffst">{p.label ?? p.cardKey}</span>
              <span className="tdb-ffsd">{stagedDetail(p).toUpperCase()}</span>
              <button type="button" className="tdb-ffrm" title="Drop this one" onClick={() => setStaged((s) => s.filter((_, j) => j !== i))}>✕</button>
            </div>
          );
        })}
      </>,
      <>
        <button type="button" className="tdb-ffback" onClick={() => { setQi(items.length - 1); setStep(0); }}>← Back</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffskip" onClick={() => requestExit()}>Discard</button>
        <button type="button" className="tdb-ffpri" disabled={saving} onClick={saveAll}>Save {staged.length} & finish</button>
      </>,
      band("sage", "Ready to save", <>You worked through <em>{staged.length} thing{staged.length === 1 ? "" : "s"}</em>.</>, "Nothing has been saved yet — check the list, drop anything you’re not sure of, then save the lot.", { art: "review", kickCls: "sage" }),
    );
  }

  // ── frame ─────────────────────────────────────────────────────────────────
  /* ⚠️ `summaryNode` SITS OUTSIDE THE SCROLLER, deliberately. It is the account of what the commit
     button is about to write, so it must be on screen at the moment that button is pressed — a
     summary that scrolls away is a summary the writer can commit without having read. */
  function sheet(body: React.ReactNode, foot: React.ReactNode, bandNode?: React.ReactNode, summaryNode?: React.ReactNode) {
    return (
      <>
        {bandNode}
        <div className="tdb-ffbody">{body}</div>
        {summaryNode}
        <div className="tdb-fffoot">
          {/* C1 — progress relocated from the retired chrome row (dots + count, multi-item modes) */}
          {review ? (
            <span className="tdb-fffprog">
              <span className="tdb-ffprog" aria-hidden>
                {[0, 1, 2, 3, 4].map((i) => <span key={i} className={`tdb-ffdot${i < Math.min(rvStep, 4) ? " done" : i === Math.min(rvStep, 4) ? " on" : ""}`} />)}
              </span>
              <span className="tdb-ffcount">{rvStep < 5 ? `${rvStep + 1} OF 5` : "DONE"}</span>
            </span>
          ) : items.length > 1 && (
            <span className="tdb-fffprog">
              <span className="tdb-ffprog" aria-hidden>
                {items.map((it, i) => <span key={itemKey(it)} className={`tdb-ffdot${i < qi ? " done" : i === qi ? " on" : ""}`} />)}
              </span>
              <span className="tdb-ffcount">{atReview ? "REVIEW" : `${qi + 1} OF ${items.length}`}</span>
            </span>
          )}
          {staged.length > 0 && <span className="tdb-ffpend">{staged.length} staged — nothing saved yet</span>}
          {foot}
        </div>
      </>
    );
  }

  /** C1 — the zoned family BAND (layout E; center = ceremony D). The title carries .tdb-ffq so
   *  the dialog's aria-labelledby stamp keeps finding the heading; art comes from JOURNEY_ART
   *  (absent = the slot renders nothing at all). Keyed by family so mixed walks crossfade. */
  type BandFam = "pink" | "cof" | "sage" | "paper";
  // C2 — the family law: ritual (Today's-list) walks wear sage WHOLE-WALK; everything else wears
  // its journey's family (mixed walks crossfade via the band's key).
  const fam = (f: BandFam): BandFam => (ritual ? "sage" : f);
  function band(famKey: BandFam, kick: React.ReactNode, title: React.ReactNode, sub?: React.ReactNode, opts?: { art?: JourneyArtKey; center?: boolean; kickCls?: string }) {
    const src = opts?.art ? JOURNEY_ART[opts.art] : null;
    const f = fam(famKey);
    return (
      <div key={f} className={`tdb-fband ${f}${opts?.center ? " center" : ""}`}>
        <div className="tdb-fbtx">
          <div className={`tdb-ffstream ${opts?.kickCls ?? ""}`}>{kick}</div>
          {opts?.center && src && <div className="tdb-fbart big"><img src={src} alt="" /></div>}
          <div className="tdb-ffq tdb-fbh">{title}</div>
          {sub && <div className="tdb-fbsub">{sub}</div>}
        </div>
        {!opts?.center && src && <div className="tdb-fbart"><img src={src} alt="" /></div>}
      </div>
    );
  }
  /* ── the shared step vocabulary ─────────────────────────────────────────────────────────────
   *
   * ⚠️ EVERY JOURNEY THAT RECORDS AN EVENT ASKS `When` THE SAME WAY, so it is built once. The
   * options differ — a close offers "When their window closed" where a send offers "Today" — but
   * the control does not, because two versions of one question are two things to keep in step.
   * `sentDate` stays the single Y-M-D the write reads; `whenMode` only lights a segment.
   *
   * ⚠️ "Another date…" OPENS `RecordingCalendar`, ONE COMPONENT FOR ALL FOUR JOURNEYS. It is
   * declared once here, so the number of journeys that can pick a day is the number of entries in
   * the option lists — never a count of hand-written pickers that have to be kept in step.
   */
  interface WhenOption { mode: string; label: string; ymd?: string }
  const WHEN_OTHER: WhenOption = { mode: "other", label: "Another date…" };
  const whenSent = (): WhenOption => ({ mode: "today", label: "Today", ymd: todayISO() });
  const whenYesterday = (): WhenOption => ({ mode: "yesterday", label: "Yesterday", ymd: ymdDaysAgo(1) });

  /** The summary's phrasing of the chosen day — a picked date keeps its case, a named day does not. */
  const whenText = (options: WhenOption[]): string =>
    whenMode === "other" ? fmtShort(sentDate) : (options.find((o) => o.mode === whenMode)?.label.toLowerCase() ?? "today");

  function whenStep(options: WhenOption[], name = "When", note?: string): JourneyStep {
    return {
      id: "when",
      name,
      body: (
        <>
          <div className="tdb-jnseg">
            {options.map((o) => {
              const isOther = o.mode === "other";
              const chosenHere = isOther && whenMode === "other";
              return (
                <button key={o.mode} type="button"
                  className={`${whenMode === o.mode ? "on" : ""}${chosenHere ? " hasdate" : ""}`}
                  aria-haspopup={isOther ? "dialog" : undefined}
                  onClick={(e) => {
                    if (isOther) { setCalAnchor(e.currentTarget); return; }
                    setWhenMode(o.mode);
                    if (o.ymd) setSentDate(o.ymd);
                  }}>
                  {/* ⚠️ THE ANCHOR RELABELS ITSELF once a day is chosen — a button still reading
                      "Another date…" beside a chosen date states that nothing has been picked. */}
                  {chosenHere ? shortDate(sentDate) : o.label}
                </button>
              );
            })}
          </div>
          {note && <div className="tdb-jnsub">{note}</div>}
          {calAnchor && (
            <RecordingCalendar
              anchor={calAnchor}
              value={whenMode === "other" ? sentDate : undefined}
              /* ⚠️ THE JOURNEY SUPPLIES `max`, THE COMPONENT ASSUMES NOTHING. You cannot have sent
                 something tomorrow — but that is this caller's fact about recording, not the
                 calendar's about dates. */
              max={todayISO()}
              onPick={(day) => { setSentDate(day); setWhenMode("other"); }}
              onClose={() => setCalAnchor(null)}
            />
          )}
        </>
      ),
    };
  }

  /** The one-free-text step. ⚠️ ONE FIELD, UNSTRUCTURED — a checkbox list of guesses invites the
   *  writer to confirm things the record never said. */
  function freeTextStep(id: string, name: string, placeholder: string, optional = true): JourneyStep {
    return {
      id, name, optional,
      body: (
        <div className="tdb-ffalso">
          <textarea id={`ff-${id}`} className="tdb-fffree" value={alsoText} placeholder={placeholder}
            aria-label={name} onChange={(e) => setAlsoText(e.target.value)} />
        </div>
      ),
    };
  }

  /**
   * The journey's band. ⚠️ IT KEEPS THE AVATAR, THE NAME AND THE AGENCY ON SCREEN FOR THE WHOLE
   * JOURNEY — the writer must never lose track of who they are recording against, and a form that
   * only names its subject on the screen before it is a form you can fill in for the wrong agent.
   *
   * ⚠️ `.tdb-ffq` RIDES THE PRE-LINE, NOT THE NAME. The dialog is labelled by its first `.tdb-ffq`,
   * and "Recording what you sent" is what this surface is; the agent is its subject. Labelling the
   * dialog with a person's name would announce the wrong thing.
   *
   * Family colour goes through `fam()` like every other band, so the ritual law and the mixed-walk
   * crossfade key hold here too rather than being re-implemented.
   */
  function journeyBand(famKey: BandFam, title: React.ReactNode, ag?: Agent, initials?: string, art?: JourneyArtKey) {
    const f = fam(famKey);
    const src = art ? JOURNEY_ART[art] : null;
    return (
      <div key={f} className={`tdb-fband ${f} journey`}>
        <div className="tdb-jnwho">
          <span className="tdb-ffbigav">{initials || "•"}</span>
          <div className="tdb-fbtx">
            <div className="tdb-ffq tdb-jnpre">{title}</div>
            {ag && <div className="tdb-jnname">{agentPrimary(ag)}</div>}
            {ag?.agency && <div className="tdb-jnagency">{ag.agency}</div>}
          </div>
        </div>
        {src && <div className="tdb-fbart"><img src={src} alt="" /></div>}
      </div>
    );
  }

  /**
   * The journey body: numbered steps left, sticky reference panel right, summary strip above a
   * pinned footer of Cancel · the named commit verb · the consequence hint.
   *
   * ⚠️ SINGLE-COLUMN BELOW THE THRESHOLD IS A CONTAINER QUERY, NOT A MEDIA QUERY. The Calendar's
   * item sheet mounts this with no width constraint of its own, so the journey must answer to the
   * box it is in rather than to the viewport — a viewport query would lay a two-column journey out
   * inside a narrow sheet on a wide screen and be right about nothing.
   *
   * ⚠️ CANCEL AND ESCAPE BOTH GO THROUGH `requestExit`, which writes nothing. `← Back` appears only
   * where there is a step behind this one; it is an addition to the ref's three-item footer,
   * because dropping it would strand a multi-item walk with no way back to the item before.
   */
  function journeySheet(spec: JourneySpec, bandNode: React.ReactNode) {
    return sheet(
      <div className="tdb-jnbody">
        <div className="tdb-jngrid">
          <div className="tdb-jnsteps">
            {spec.lede}
            {spec.steps.map((st, i) => (
              <div key={st.id} className="tdb-jnstep">
                <div className="tdb-jnn">
                  <span className="tdb-jni">{String(i + 1).padStart(2, "0")}</span>
                  <h4>{st.name}</h4>
                  {st.optional && <span className="tdb-jnopt">optional</span>}
                </div>
                {st.body}
              </div>
            ))}
          </div>
          <div className="tdb-jnrefwrap">
            <div className="tdb-jnref">
              <h5>{spec.reference.heading}</h5>
              <div className="tdb-jnrefq">{spec.reference.body}</div>
              {spec.reference.meta && <div className="tdb-jnrefm">{spec.reference.meta}</div>}
            </div>
          </div>
        </div>
      </div>,
      <>
        {step > 0 && <button type="button" className="tdb-ffback" onClick={backOne}>← Back</button>}
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffskip" onClick={() => requestExit()}>Cancel</button>
        {spec.extraFoot}
        <button type="button" className="tdb-ffpri" disabled={spec.commit.disabled} onClick={spec.commit.onCommit}>{spec.commit.label}</button>
        {spec.commit.hint && <span className="tdb-jnhint">{spec.commit.hint}</span>}
      </>,
      bandNode,
      <div className="tdb-jnsum">
        <span className="tdb-jnsumic" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </span>
        <span className="tdb-jnsumtx">{spec.summary}</span>
      </div>,
    );
  }

  // The dialog is labelled by the CURRENT sheet's question heading — one renders at a time, so the
  // first .tdb-ffq is it (stamped after each step render; jsdom-safe).
  useEffect(() => {
    document.querySelector(".tdb-ff .tdb-ffq")?.setAttribute("id", "tdb-ff-heading");
  });

  // ── THE SUNDAY REVIEW (finishing pack P3; ref todo-sunday-review.html): six steps in the
  //    standard sheet chrome. Summary steps write NOTHING; quiet-closes STAGE (the normal staged
  //    set, applied through stagedHandlers at finish); seeds commit Monday's committedDate (the
  //    naturally-dormant future-date mechanism); completion writes the week's entry flag. ──
  function sundayReviewSheet() {
    const nowMs = Date.now();
    const win = reviewWeek(queries, nowMs);
    const stats = weekReviewStats({ activities, queries, agents }, win);
    const cards = items.filter((x): x is Extract<FocusItem, { kind: "card" }> => x.kind === "card").map((x) => x.card);
    const cands = reviewSeedCandidates(cards, queries, nowMs);
    const seedSel: Record<string, boolean> = rvSeed ?? Object.fromEntries(cands.filter((c) => c.preTicked).map((c) => [c.key, true]));
    const seedCount = cands.filter((c) => seedSel[c.key]).length;
    const W = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
    const spell = (n: number) => (n <= 12 ? W[n] : String(n));
    const mondayD = new Date(win.endMs);
    const mondayYmd = `${mondayD.getFullYear()}-${String(mondayD.getMonth() + 1).padStart(2, "0")}-${String(mondayD.getDate()).padStart(2, "0")}`;
    const kicker = `THE SUNDAY REVIEW · WEEK ${win.weekNumber} OF QUERYING`;

    const toggleQuiet = (row: { queryId: string; name: string; prevStatus: QueryStatus }, choice: "close" | "leave") => {
      const was = rvQuiet[row.queryId];
      const next = was === choice ? undefined : choice;
      setRvQuiet((prev) => { const n = { ...prev }; if (next) n[row.queryId] = next; else delete n[row.queryId]; return n; });
      const key = `rv-close-${row.queryId}`;
      setStaged((prev) => {
        const without = prev.filter((x) => x.cardKey !== key);
        return next === "close" ? [...without, { kind: "close", cardKey: key, label: `Close ${row.name} — no response`, queryId: row.queryId, prevStatus: row.prevStatus }] : without;
      });
    };

    async function finishReview() {
      if (saving) return;
      setSaving(true);
      const closes = staged.filter((x) => x.kind === "close");
      const res = await applyStaged(closes, stagedHandlers);
      const seeds = cands.filter((c) => seedSel[c.key]);
      for (const sc of seeds) {
        if (sc.userTaskId) await updateUserTask(sc.userTaskId, { committedDate: mondayYmd });
        else if (sc.taskType && sc.relatedRecordId) await upsertTaskFlag(flagKeyForTask(sc.taskType, sc.relatedRecordId), { committedDate: mondayYmd });
      }
      // the completion sentinel is single-sourced (todoBoard.reviewCompletionSnooze) so the scrap
      // afterlife can read "completed" without the formula drifting — same value as before.
      await upsertTaskFlag(flagKeyForTask("weekly_review", win.key), { snoozedUntil: reviewCompletionSnooze(win) });
      setStaged((prev) => prev.filter((x) => x.kind !== "close"));
      setRvSummary({ closed: res.ok.length, seeded: seeds.length });
      setSaving(false);
      setRvStep(5);
    }

    if (rvStep === 0) return sheet(
      <>
        <div className="tdb-rvhand" aria-hidden>— kettle on. this takes about five minutes.</div>
        <div className="tdb-rvstats">
          <span className="tdb-rvstat"><b>{stats.sent.length}</b>WENT OUT</span>
          <span className="tdb-rvstat"><b>{stats.back.length}</b>CAME BACK</span>
          <span className={`tdb-rvstat${stats.offers ? " star" : ""}`}><b>{stats.offers}</b>OFFER{stats.offers === 1 ? "" : "S"} ★</span>
          <span className="tdb-rvstat"><b>{stats.quiet.length}</b>WENT QUIET</span>
        </div>
      </>,
      <>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffpri" onClick={() => setRvStep(1)}>Begin →</button>
      </>,
      // ceremony D — the review's opening screen
      band("sage", kicker, <>Week {win.weekNumber}, closed properly</>, "A short look back before the week ahead: what went out, what came back, what’s gone quiet — and then we’ll set Monday’s list so tomorrow starts itself.", { art: "reviewOpen", center: true }),
    );

    if (rvStep === 1) return sheet(
      <>
        <div className="tdb-rvrows">{stats.sent.map((r, i) => (
          <div key={i} className="tdb-rvrow"><span className="tdb-rvbadge out">{r.badge}</span><span className="tdb-rvtx"><b>{r.label}</b><span>{r.meta}</span></span></div>
        ))}</div>
      </>,
      <>
        <button type="button" className="tdb-ffback" onClick={() => setRvStep(0)}>← Back</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffpri" onClick={() => setRvStep(2)}>Continue →</button>
      </>,
      band("sage", "Looking back · what went out", stats.sent.length === 0 ? "A quiet week on the way out" : `${spell(stats.sent.length)} thing${stats.sent.length === 1 ? "" : "s"} left your desk`, stats.sent.length === 0 ? "Nothing went out — rest weeks count too." : "Nothing to do here — just seeing your own momentum. Every one of these was work.", { art: "review" }),
    );

    if (rvStep === 2) return sheet(
      <>
        <div className="tdb-rvrows">{stats.back.map((r, i) => (
          <div key={i} className="tdb-rvrow"><span className={`tdb-rvbadge${r.star ? " star" : " in"}`}>{r.badge}</span><span className="tdb-rvtx"><b>{r.label}</b><span>{r.meta}</span></span></div>
        ))}</div>
      </>,
      <>
        <button type="button" className="tdb-ffback" onClick={() => setRvStep(1)}>← Back</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffpri" onClick={() => setRvStep(3)}>Continue →</button>
      </>,
      band("sage", "Looking back · what came back", stats.back.length === 0 ? "Nothing back this week" : `${spell(stats.back.length)} came back${stats.offers === 1 ? " — one of them gold" : stats.offers > 1 ? ` — ${stats.offers} of them gold` : ""}`, stats.back.length === 0 ? "Normal, not nothing — most weeks are quiet ones." : "Read them again if you like. They happened.", { art: "review" }),
    );

    if (rvStep === 3) return sheet(
      <>
        <div className="tdb-rvrows">{stats.quiet.map((r) => (
          <div key={r.queryId} className="tdb-rvrow">
            <span className="tdb-rvtx"><b>{r.name}</b><span>{[r.daysSilent != null ? `${r.daysSilent} DAYS SILENT` : null, "NO REPLY"].filter(Boolean).join(" · ")}</span></span>
            <span className="tdb-rvacts">
              <button type="button" className={`tdb-rvqa${rvQuiet[r.queryId] === "close" ? " sel" : ""}`} onClick={() => toggleQuiet(r, "close")}>Close it</button>
              <button type="button" className={`tdb-rvqa${rvQuiet[r.queryId] === "leave" ? " sel" : ""}`} onClick={() => toggleQuiet(r, "leave")}>Leave it</button>
            </span>
          </div>
        ))}</div>
      </>,
      <>
        <button type="button" className="tdb-ffback" onClick={() => setRvStep(2)}>← Back</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffpri" onClick={() => setRvStep(4)}>Continue →</button>
      </>,
      band("sage", "Looking back · what went quiet", stats.quiet.length === 0 ? "Nothing went quiet this week" : `${spell(stats.quiet.length)} ${stats.quiet.length === 1 ? "has" : "have"} gone quiet`, stats.quiet.length === 0 ? "Every live query is still inside its window." : "Decide now or decide later — either is a decision. Choices stage here and save at the end.", { art: "review" }),
    );

    if (rvStep === 4) return sheet(
      <>
        <div className="tdb-ffqsub">Dated things are pre-ticked. These land on <b>Monday’s Today list</b> — you’ll wake up to a desk that’s already set.</div>
        <div className="tdb-rvrows">{cands.map((c) => (
          <label key={c.key} className={`tdb-rvseed${seedSel[c.key] ? " on" : ""}`}>
            <input type="checkbox" checked={!!seedSel[c.key]} onChange={() => setRvSeed({ ...seedSel, [c.key]: !seedSel[c.key] })} />
            <span className="tdb-rvtx"><b>{c.label}</b><span>{c.meta}</span></span>
          </label>
        ))}
        {cands.length === 0 && <div className="tdb-ffsmall">Nothing on the Urgent lane to seed — Monday starts clean.</div>}</div>
      </>,
      <>
        <button type="button" className="tdb-ffback" onClick={() => setRvStep(3)}>← Back</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffpri" disabled={saving} onClick={finishReview}>Seed Monday & finish</button>
      </>,
      band("sage", "The week ahead · seeding Monday", "What should Monday hold?", undefined, { art: "review" }),
    );

    return sheet(
      <div className="tdb-rvdone">
        <span className="tdb-rvring" aria-hidden>☕</span>
      </div>,
      <>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffpri" onClick={() => requestExit()}>Back to my desk</button>
      </>,
      // ceremony D — the review's closing screen
      band("sage", kicker, <>Week {win.weekNumber}, closed.</>, <>{rvSummary ? `${rvSummary.closed} ${rvSummary.closed === 1 ? "query" : "queries"} closed · Monday’s list seeded with ${rvSummary.seeded} thing${rvSummary.seeded === 1 ? "" : "s"}.` : ""} See you at the desk tomorrow.</>, { art: "reviewClose", center: true }),
    );
  }

  const content = useMemo(() => {
    if (review) return sundayReviewSheet();
    if (atReview) return reviewSheet();
    const it = items[qi];
    if (sweep && !deepDive) return sweepSheet(it); // the speed grammar; F/Enter drill into the journey below
    if (it.kind === "group") return groupSheet(it.group);
    const j = cardJourney(it.card);
    if (j === "offer") return offerSheet(it.card);
    if (j === "resubmit") return resubmitSheet(it.card);
    if (j === "nudge") return nudgeSheet(it.card);
    if (j === "stale") return staleSheet(it.card);
    if (j === "dq") return dqSheet(it.card);
    if (j === "note") return noteSheet(it.card);
    /* ⚠️ THE FALL-THROUGH IS A HAND-OFF, NOT A SEND. Anything not named above used to land in
       `sendSheet` and be offered "Mark sent" for a task that is not a send — a live latent fault
       (`exclusive_expiring` is declared in this codebase and would have hit it). The bucket says
       which hand-off: a judgement goes to the offer flow, a gap in the record to where the data
       lives. Only the two send task types reach `sendSheet` now, and they say so. */
    if (isSendTask(it.card.taskType)) return sendSheet(it.card);
    const bucket = cardBucket(it.card);
    return handoffSheet(it.card, bucket === "decide" ? "decide" : "fix");
    // eslint-disable-next-line react-hooks/exhaustive-deps
    /* ⚠️ THE JOURNEY STATE BELONGS IN THESE DEPS OR THE SHEET DOES NOT REDRAW. `content` is memoised
       over every piece of scratch it reads, so a new one — `whenMode`, `checkBack`, `closeReason`,
       `calAnchor`, `alsoText` — that is left out renders as a control that visibly does nothing. */
  }, [atReview, qi, step, items, mats, sentDate, method, copied, extrasOpen, backdated, rows, noMeansNo,
    whenMode, checkBack, closeReason, calAnchor, alsoText, found, notFound, assistAt, assisting, assistMsg, showMuted, noteText, staged, savedN, saving, offerDoor, offerChoice, remindDate, notifyStep, notifySel, review, rvStep, rvQuiet, rvSeed, rvSummary, sweep, deepDive, sweepReceipt, sweepFork, queries, agents, manuscripts, activities, taskFlags, currentUser]);


  const remaining = items.length - qi - 1;
  return (
    <div className="tdb-ff" role="dialog" aria-modal="true" aria-label="Focus flow" aria-labelledby="tdb-ff-heading" ref={rootRef} tabIndex={-1} onKeyDown={trapTab} onClick={scrimClick}>
      {confirmAskNode}
      <div className="tdb-ffstage">
        {!atReview && remaining >= 2 && <div className="tdb-ffbehind b2" aria-hidden />}
        {!atReview && remaining >= 1 && <div className="tdb-ffbehind" aria-hidden />}
        {/* C1 — the positioning WRAPPER carries the corner exit; the sheet keeps overflow:hidden
            for band clipping, so the exit never lives inside the clipped box. Rendered AFTER the
            sheet in DOM order = the focus trap's LAST tab stop (trapTab walks DOM order). The
            chrome row is retired — progress lives in the sheet foot (sheet()). */}
        <div className="tdb-ffwrap">
          <div className={`tdb-ffsheet${leaving ? " leaving" : ""}${nudged ? " nudged" : ""}`} onAnimationEnd={(e) => { if ((e.target as HTMLElement).classList.contains("nudged")) setNudged(false); }}>
            {content}
          </div>
          <button type="button" className="tdb-ffx" aria-label="Back to my desk" onClick={() => requestExit()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FocusFlow;
