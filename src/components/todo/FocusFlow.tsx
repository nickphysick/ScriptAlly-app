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
import { useScriptAllyDb } from "../../lib/db";
import { getPrimaryAction } from "../../lib/queryPrimaryAction";
import { TimelineRows, buildTimelineRows } from "../reading-pane/QueryTimeline";
import { NUDGE_NESTED_TYPE } from "../../lib/logNudge";
import { OfferDecision } from "../../lib/offerDecision";
import { notifyGroups, reminderFields, NotifyRow } from "../../lib/offerNotify";
import { lockStageScroll } from "../../lib/stageScroll";
import { reviewWeek, weekReviewStats, reviewSeedCandidates, reviewCompletionSnooze, SeedCandidate } from "../../lib/todoBoard";
import { agentPrimary } from "../../lib/agentDisplay";
import { nudgeDraft } from "../../lib/nudgeDraft";
import { flagKeyForTask, MUTED_UNTIL } from "../../lib/taskFlags";
import { agentDataQualityNeeds, AgentDataNeed } from "../../lib/agentDataQuality";
import { BoardCard } from "../../lib/todoBoard";
import { HkGroup, HkRule, HK_RULES, HK_PAYOFF, mutedMembersForRule } from "../../lib/todoHousekeeping";
import {
  StagedPayload, applyStaged, markSentWriteArgs, nudgeWriteArgs, materialOptsForTask, assumedSendItem, DEFAULT_CHECKBACK_DAYS, journeyEventISO,
  quickSendPayload, quickNudgePayload, receiptLine, sendKicker,
} from "../../lib/todoWalk";
import { USER_TASK_FLAG_TYPE } from "../../lib/todoBoard";
import { saveHkRows } from "../../lib/hkSave";
import { isProUser, fetchAssistedFill, AssistFillError, AssistFound } from "../../lib/assistFill";
import { ActivityType, Agent, Query, QueryStatus } from "../../types";

export type FocusItem = { kind: "card"; card: BoardCard } | { kind: "group"; group: HkGroup };

const todayISO = (): string => new Date().toISOString().slice(0, 10);
const plusDaysISO = (n: number): string => new Date(Date.now() + n * 86400000).toISOString();
const fmtShort = (iso: string): string => {
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? "" : new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};
const METHODS = ["Email", "QueryManager", "Post", "Other"];
const WEEK_CHIPS = [4, 6, 8, 12];
const MATERIAL_VOCAB = ["Query Letter", "Synopsis", "Sample Pages", "Full Manuscript"];

const itemKey = (it: FocusItem): string => (it.kind === "card" ? it.card.key : `group-${it.group.rule}`);
type CardJourney = "offer" | "send" | "nudge" | "stale" | "dq" | "note";
function cardJourney(c: BoardCard): CardJourney {
  if (c.userTaskId) return "note";
  if (c.taskType === "offer_received") return "offer";
  if (c.taskType === "nudge_overdue") return "nudge";
  if (c.taskType === "no_response_close") return "stale";
  if (c.taskType === "data_quality_poor") return "dq";
  return "send";
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
}

export const FocusFlow: React.FC<FocusFlowProps> = ({ items, onClose, onNavigate, onToast, prefill, mode = "journey" }) => {
  const {
    queries, agents, manuscripts, activities, taskFlags, userTasks, currentUser,
    recordMaterialsSent, logNudge, recordOfferDecision, dismissTask, upsertTaskFlag, updateUserProfile, updateAgent, updateUserTask, addUserTask, updateQueryStatus, undoQueryStatus, resolveTaskFlag, deleteActivity,
  } = useScriptAllyDb();

  const [qi, setQi] = useState(0);
  const [step, setStep] = useState(0);
  const [staged, setStaged] = useState<StagedPayload[]>([]);
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
  useEffect(() => {
    const invoker = document.activeElement as HTMLElement | null;
    const release = lockStageScroll();
    rootRef.current?.focus();
    return () => { release(); invoker?.focus?.(); };
  }, []);
  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const root = rootRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
      .filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
    if (!els.length) return;
    const first = els[0];
    const last = els[els.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === root)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  const scrimClick = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (!reduce && (t.classList.contains("tdb-ff") || t.classList.contains("tdb-ffstage"))) setNudged(true);
  };
  const atReview = qi >= items.length;
  const item = atReview ? undefined : items[qi];

  const resetScratch = () => {
    setMats({}); setSentDate(todayISO()); setMethod("Email"); setCopied(false); setExtrasOpen(false); setBackdated(false);
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
  function requestExit(after?: () => void) {
    if (staged.length && !window.confirm(`You have ${staged.length} staged change${staged.length === 1 ? "" : "s"}. Discard them?`)) return;
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
    snooze: (p: Extract<StagedPayload, { kind: "snooze" }>) => dismissTask(p.taskType, p.relatedRecordId, "fixed snooze", p.days),
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
        {/* B1 — stream + the row's DETAIL (ledger-shared source); never the same string twice */}
        <div className={`tdb-ffstream${c.warn ? " warn" : ""}`}>{sendKicker(c, { queries, taskFlags }, Date.now())}</div>
        <div className="tdb-ffq">{emTitle(c)}</div>
        {c.subtitle && <div className="tdb-ffqsub">{c.subtitle}</div>}
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
    );
    const ms = q ? manuscripts.find((m) => m.id === q.manuscriptId) : undefined;
    const who = c.who || "the agent";
    const assumed = assumedSendItem(c.taskType, ag?.materialsWanted as string[] | undefined, who);
    const extrasOn = assumed.extras.filter((m) => mats[m]);
    return sheet(
      <>
        <div className="tdb-ffstream">{c.who || "Logging"} · logging the send</div>
        <div className="tdb-ffq">Off it goes</div>
        <div className="tdb-ffqsub">{who} asked for {assumed.label === "Full manuscript" ? "the full" : assumed.label === "Revised manuscript" ? "revisions" : assumed.label.toLowerCase()} — so that’s what we’ll log.</div>
        <div className="tdb-ffassume">
          <span className="tdb-ffatick" aria-hidden>✓</span>
          <span><b>{assumed.label}</b><span className="tdb-ffasub">{ms?.title ? `${ms.title} · ` : ""}{assumed.sub}</span></span>
        </div>
        <button type="button" className="tdb-ffelse" aria-expanded={extrasOpen} onClick={() => setExtrasOpen((v) => !v)}>+ I sent something else too</button>
        {extrasOpen && (
          <div className="tdb-ffchoices tight">{assumed.extras.map((m) => (
            <button key={m} type="button" className={`tdb-ffchoice${mats[m] ? " on" : ""}`} onClick={() => setMats((p) => ({ ...p, [m]: !p[m] }))}>
              <span className="tdb-ffck" /><span className="tdb-ffct">{m}</span>
            </button>
          ))}</div>
        )}
        <div className="tdb-ffwhen">
          {backdated ? (
            <>Logging it as <input type="date" value={sentDate} max={todayISO()} onChange={(e) => setSentDate(e.target.value)} /> <span className="tdb-ffsmall">— we’ll log it at midday.</span></>
          ) : (
            <>Logged just now, {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · <button type="button" className="tdb-fflink" onClick={() => setBackdated(true)}>I sent it earlier</button></>
          )}
        </div>
      </>,
      <>
        <button type="button" className="tdb-ffback" onClick={backOne}>← Back</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffpri" onClick={() => {
          if (!q) { advance(); return; }
          const action = getPrimaryAction(q.status as QueryStatus);
          if (action.kind !== "mark-sent") { advance(); return; }
          stageAndAdvance({
            kind: "mark-sent", cardKey: c.key, label: c.title, queryId: q.id,
            targetStatus: action.target as QueryStatus,
            sentDate: journeyEventISO(backdated ? sentDate : undefined, new Date().toISOString()),
            isResubmit: action.markKind === "resubmit", method: q.sendMethod || "Email",
            materials: [assumed.label, ...extrasOn],
          });
        }}>Mark sent</button>
      </>,
    );
  }

  function nudgeSheet(c: BoardCard) {
    const q = cardQuery(c);
    const ag = cardAgent(c, q);
    if (step === 0) return sheet(
      <>
        <div className={`tdb-ffstream${c.warn ? " warn" : ""}`}>{c.due || "No reply yet"}</div>
        <div className="tdb-ffq">Time to nudge {c.who ? <em>{c.who}</em> : "them"}?</div>
        <div className="tdb-ffqsub">
          {c.subtitle ? `${c.subtitle}. ` : ""}
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
    );
    const ms = q ? manuscripts.find((m) => m.id === q.manuscriptId) : undefined;
    const draft = nudgeDraft({
      agentName: ag ? agentPrimary(ag) : null,
      dateSent: q?.dateSent,
      msTitle: ms?.title,
      requested: requestedProse(q?.status as QueryStatus | undefined),
    });
    return sheet(
      <>
        <div className="tdb-ffstream">Nudging {c.who || "them"}</div>
        <div className="tdb-ffq">Here’s a note you could send.</div>
        <div className="tdb-ffdraft">{draft}</div>
        <button type="button" className="tdb-ffcopy" onClick={() => { navigator.clipboard?.writeText(draft); setCopied(true); window.setTimeout(() => setCopied(false), 1400); }}>
          {copied ? "✓ Copied" : "⧉  Copy the draft"}
        </button>
        <div className="tdb-ffsmall">ScriptAlly never sends anything for you. Copy it, send it from your own email, then stage the log below.</div>
        <div className="tdb-ffrow">
          <div className="tdb-fff"><label>Date nudged</label><input type="date" value={sentDate} onChange={(e) => setSentDate(e.target.value)} /></div>
          <div className="tdb-fff"><label>How</label><select value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.slice(0, 2).map((m) => <option key={m}>{m}</option>)}</select></div>
        </div>
      </>,
      <>
        <button type="button" className="tdb-ffback" onClick={backOne}>← Back</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffpri" onClick={() => q && stageAndAdvance({
          kind: "nudge", cardKey: c.key, label: c.title, queryId: q.id,
          checkBackDate: plusDaysISO(DEFAULT_CHECKBACK_DAYS), nudgeDate: sentDate, method,
        })}>Stage it →</button>
      </>,
    );
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
            <div className="tdb-ffstream off">{kick}</div>
            <div className="tdb-ffq">Shall I put them on your desk?</div>
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
        );
      }
      return sheet(
        <>
          <div className="tdb-ffstream off">{kick}</div>
          <div className="tdb-ffq">Who should hear about it?</div>
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
      );
    }

    // ── door: record the decision (THE completion) ──
    if (offerDoor === "decide") return sheet(
      <>
        <div className="tdb-ffstream off">Recording your decision</div>
        <div className="tdb-ffq">What did you tell {who}?</div>
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
    );

    // ── door: I need time — the existing snooze flag, capped at reply-by ──
    if (offerDoor === "time") return sheet(
      <>
        <div className="tdb-ffstream off">Taking time to decide</div>
        <div className="tdb-ffq">When should we bring this back?</div>
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
    );

    // ── the celebration + fork ──
    return sheet(
      <>
        <div className="tdb-ffstream off">{kicker}</div>
        <div className="tdb-ffstar" aria-hidden>★</div>
        <div className="tdb-ffofferq">{who} has offered to represent you.</div>
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
    );
  }

  function staleSheet(c: BoardCard) {
    const q = cardQuery(c);
    const ag = cardAgent(c, q);
    return sheet(
      <>
        <div className="tdb-ffstream hk">Stale query</div>
        <div className="tdb-ffq">{emTitle(c)}</div>
        <div className="tdb-ffqsub">{c.subtitle ? `${c.subtitle}. ` : ""}Closing keeps your response rate honest — logged as <b>no response</b>, not a rejection.</div>
        {whoRow(ag, c.initials)}
        {openQueryLink(q)}
        <div className="tdb-ffchoices">
          <button type="button" className="tdb-ffchoice" onClick={async () => {
            if (q) {
              const prev = q.status as QueryStatus;
              await updateQueryStatus(q.id, QueryStatus.NO_RESPONSE, "Marked as no response from the focus flow");
              // Undo = delete the created activity record (the existing undo path), never a compensating entry.
              onToast(`✓ ${c.title} — done`, { label: "Undo", fn: async () => { await undoQueryStatus(q.id, prev, QueryStatus.NO_RESPONSE); onToast("Restored"); } });
            }
            advance();
          }}>
            <span className="tdb-ffck" /><span><span className="tdb-ffct">Close as no response</span>
            <span className="tdb-ffcs">Writes now — a decision, not a stance.</span></span>
          </button>
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
      </>,
    );
  }

  function dqSheet(c: BoardCard) {
    const ag = c.relatedRecordId ? agents.find((a) => a.id === c.relatedRecordId) : undefined;
    const needs: AgentDataNeed[] = ag ? agentDataQualityNeeds(ag) : [];
    if (step === 0) return sheet(
      <>
        <div className="tdb-ffstream hk">Housekeeping</div>
        <div className="tdb-ffq">{emTitle(c)}</div>
        <div className="tdb-ffqsub">Clean data is how ScriptAlly judges fit and checks your package — worth most before you query. Fill what you know; skip what you don’t.</div>
        {whoRow(ag, c.initials)}
      </>,
      <>
        <button type="button" className="tdb-ffback" disabled={qi === 0} onClick={backOne}>← Back</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffskip" onClick={advance}>Not now</button>
        <button type="button" className="tdb-ffpri" onClick={() => setStep(1)}>Fill them in →</button>
      </>,
    );
    const filled = needs.some((n) => (rows[n] ?? "").trim());
    return sheet(
      <>
        <div className="tdb-ffstream hk">{c.who || "Agent"} · details</div>
        <div className="tdb-ffq">What do you know?</div>
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
          <div className="tdb-ffstream hk">Housekeeping · {meta.label.toLowerCase()}</div>
          <div className="tdb-ffq">{numMatch ? <><em>{numMatch[1]}</em>{numMatch[2]}.</> : title}</div>
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
      );
    }
    const filledIds = g.members.filter((m) => (rows[m.agentId ?? ""] ?? "").trim()).map((m) => m.agentId!);
    const q2 = g.rule === "dq_responseTime" ? "They usually reply within…" : g.rule === "dq_materials" ? "They ask to receive…" : "What are they looking for?";
    return sheet(
      <>
        <div className="tdb-ffstream hk">{meta.label} · {filledIds.length} of {g.members.length} filled</div>
        <div className="tdb-ffq">{q2}</div>
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
    );
  }

  function noteSheet(c: BoardCard) {
    const text = noteText ?? c.title;
    const dirty = text.trim() !== c.title && text.trim().length > 0;
    return sheet(
      <>
        <div className="tdb-ffstream nt">{c.due || "Note to self"}</div>
        <div className="tdb-ffq">A note, in your own hand.</div>
        <div className="tdb-ffrow"><div className="tdb-fff"><label>Your note</label><textarea value={text} onChange={(e) => setNoteText(e.target.value)} /></div></div>
        {c.record && <div className="tdb-ffsmall">Attached to <b>{c.record.replace(/^On /, "")}</b>.</div>}
      </>,
      <>
        <button type="button" className="tdb-ffback" disabled={qi === 0} onClick={backOne}>← Back</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffskip" onClick={() => { if (dirty && c.userTaskId) updateUserTask(c.userTaskId, { text: text.trim() }); advance(); }}>Keep it</button>
        <button type="button" className="tdb-ffpri pink" onClick={() => { if (c.userTaskId) { updateUserTask(c.userTaskId, { done: true, completedAt: new Date().toISOString(), ...(dirty ? { text: text.trim() } : {}) }); onToast(`✓ ${c.title} — done`, { label: "Undo", fn: async () => { await updateUserTask(c.userTaskId!, { done: false }); onToast("Restored"); } }); } advance(); }}>✓ Mark it done</button>
      </>,
    );
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
      onToast(`✓ ${c.title} — done`, { label: "Undo", fn: async () => { await updateUserTask(c.userTaskId!, { done: false }); onToast("Restored"); } });
      advanceAfterReceipt(`${c.title} — struck through on today’s list.`);
      return;
    }
    const q = cardQuery(c);
    if (!q) { advance(); return; }
    if (c.taskType === "no_response_close") {
      const prev = q.status as QueryStatus;
      await updateQueryStatus(q.id, QueryStatus.NO_RESPONSE, "Closed as no response from sweep mode");
      onToast(`✓ ${c.title} — done`, { label: "Undo", fn: async () => { await undoQueryStatus(q.id, prev, QueryStatus.NO_RESPONSE); onToast("Restored"); } });
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
      onToast(`✓ ${c.title} — done`, { label: "Undo", fn: async () => { await undo(); onToast("Restored"); } });
      advanceAfterReceipt(receiptLine(p, todayISO()));
      return;
    }
    const action = getPrimaryAction(q.status as QueryStatus);
    if (action.kind !== "mark-sent") { advance(); return; }
    const p = quickSendPayload({ cardKey: c.key, label: c.title, taskType: c.taskType, queryId: q.id, targetStatus: action.target as QueryStatus, isResubmit: action.markKind === "resubmit", method: q.sendMethod, nowIso });
    const prev = q.status as QueryStatus;
    await recordMaterialsSent(markSentWriteArgs(p)); // the ONE mark-sent write path
    onToast(`✓ ${c.title} — done`, { label: "Undo", fn: async () => { await undoQueryStatus(q.id, prev, p.targetStatus); onToast("Restored"); } });
    advanceAfterReceipt(receiptLine(p, todayISO(), materialOptsForTask(c.taskType)));
  }

  function sweepSnooze(it: FocusItem) {
    if (it.kind === "group") {
      it.group.members.forEach((m) => m.agentId && dismissTask("data_quality_poor", m.agentId, "fixed snooze", 7));
      onToast(`✓ ${HK_RULES[it.group.rule].label} — snoozed`, { label: "Undo", fn: async () => { it.group.members.forEach((m) => m.agentId && upsertTaskFlag(flagKeyForTask("data_quality_poor", m.agentId), { snoozedUntil: null, unbumpSnooze: true })); onToast("Restored"); } });
      advance();
      return;
    }
    const c = it.card;
    if (c.userTaskId) {
      const key = { taskType: USER_TASK_FLAG_TYPE, queryId: c.userTaskId };
      upsertTaskFlag(key, { snoozedUntil: plusDaysISO(7), bumpSnooze: true });
      onToast(`✓ ${c.title} — snoozed`, { label: "Undo", fn: async () => { await upsertTaskFlag(key, { snoozedUntil: null, unbumpSnooze: true }); onToast("Restored"); } });
    } else if (c.taskType && c.relatedRecordId) {
      dismissTask(c.taskType, c.relatedRecordId, "fixed snooze", 7);
      const key = flagKeyForTask(c.taskType, c.relatedRecordId);
      onToast(`✓ ${c.title} — snoozed`, { label: "Undo", fn: async () => { await upsertTaskFlag(key, { snoozedUntil: null, unbumpSnooze: true }); onToast("Restored"); } });
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
          <div className="tdb-ffstream hk">Housekeeping · {g.meta.label.toLowerCase()}</div>
          <div className="tdb-ffq">{g.meta.title(g.members.length)}.</div>
          <div className="tdb-ffqsub">{HK_PAYOFF[g.rule]}</div>
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
      );
    }
    const c = it.card;
    const j = cardJourney(c);
    if (j === "offer") {
      return sheet(
        <>
          <div className="tdb-ffstream off">Offer of representation</div>
          <div className="tdb-ffq">{c.who ? <em>{c.who}</em> : "An agent"} wants to represent you.</div>
          <div className="tdb-ffqsub">This one needs the moment — no quick anything for an offer.</div>
          <div className="tdb-ffbigacts">
            <button type="button" className="tdb-ffbig" onClick={() => setDeepDive(true)}>{kbd("↵")}Open the offer</button>
          </div>
        </>,
        <>
          <button type="button" className="tdb-ffback" disabled={qi === 0} onClick={backOne}>← Back</button>
          <span className="tdb-sp" />
          <button type="button" className="tdb-ffskip" onClick={advance}>{kbd("→")}Skip</button>
        </>,
      );
    }
    const q = cardQuery(c);
    const ag = cardAgent(c, q);
    const streamCls = c.stream === "hk" ? " hk" : c.stream === "nt" ? " nt" : c.warn ? " warn" : "";
    const doneLabel = j === "stale" ? "Close — no response" : j === "nudge" ? "Log the nudge (defaults)" : j === "note" ? "Mark it done" : "Done — log with defaults";
    return sheet(
      <>
        <div className={`tdb-ffstream${streamCls}`}>{c.due || "On your desk"}</div>
        <div className="tdb-ffq">{emTitle(c)}</div>
        {c.subtitle && <div className="tdb-ffqsub">{c.subtitle}</div>}
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
        <div className="tdb-ffbt">{savedN} saved. Desk cleared.</div>
        <div className="tdb-ffbs">They’re logged against their queries and struck through on today’s list. Go write something.</div>
      </div>,
      <>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffpri" onClick={onClose}>Back to the board</button>
      </>,
    );
    if (!staged.length) return sheet(
      <div className="tdb-ffbigdone">
        <div className="tdb-ffcir">✓</div>
        <div className="tdb-ffbt">{sweep ? "Lane swept." : "Desk walked."}</div>
        <div className="tdb-ffbs">{sweep ? "Everything got a decision — done, snoozed, or left for later." : "You left everything as it was — sometimes that’s the right call too."}</div>
      </div>,
      <>
        <button type="button" className="tdb-ffback" onClick={() => { setQi(items.length - 1); setStep(0); }}>← Back</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffpri" onClick={onClose}>Back to the board</button>
      </>,
    );
    return sheet(
      <>
        <div className="tdb-ffstream sage">Ready to save</div>
        <div className="tdb-ffq">You worked through <em>{staged.length} thing{staged.length === 1 ? "" : "s"}</em>.</div>
        <div className="tdb-ffqsub">Nothing has been saved yet — check the list, drop anything you’re not sure of, then save the lot.</div>
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
    );
  }

  // ── frame ─────────────────────────────────────────────────────────────────
  function sheet(body: React.ReactNode, foot: React.ReactNode) {
    return (
      <>
        <div className="tdb-ffbody">{body}</div>
        <div className="tdb-fffoot">
          {staged.length > 0 && <span className="tdb-ffpend">{staged.length} staged — nothing saved yet</span>}
          {foot}
        </div>
      </>
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
        <div className="tdb-ffstream off">{kicker}</div>
        <div className="tdb-rvhand" aria-hidden>— kettle on. this takes about five minutes.</div>
        <div className="tdb-ffq">Week {win.weekNumber}, closed properly</div>
        <div className="tdb-ffqsub">A short look back before the week ahead: what went out, what came back, what’s gone quiet — and then we’ll set Monday’s list so tomorrow starts itself.</div>
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
    );

    if (rvStep === 1) return sheet(
      <>
        <div className="tdb-ffstream off">LOOKING BACK · WHAT WENT OUT</div>
        <div className="tdb-ffq">{stats.sent.length === 0 ? "A quiet week on the way out" : `${spell(stats.sent.length)} thing${stats.sent.length === 1 ? "" : "s"} left your desk`}</div>
        <div className="tdb-ffqsub">{stats.sent.length === 0 ? "Nothing went out — rest weeks count too." : "Nothing to do here — just seeing your own momentum. Every one of these was work."}</div>
        <div className="tdb-rvrows">{stats.sent.map((r, i) => (
          <div key={i} className="tdb-rvrow"><span className="tdb-rvbadge out">{r.badge}</span><span className="tdb-rvtx"><b>{r.label}</b><span>{r.meta}</span></span></div>
        ))}</div>
      </>,
      <>
        <button type="button" className="tdb-ffback" onClick={() => setRvStep(0)}>← Back</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffpri" onClick={() => setRvStep(2)}>Continue →</button>
      </>,
    );

    if (rvStep === 2) return sheet(
      <>
        <div className="tdb-ffstream off">LOOKING BACK · WHAT CAME BACK</div>
        <div className="tdb-ffq">{stats.back.length === 0 ? "Nothing back this week" : `${spell(stats.back.length)} came back${stats.offers === 1 ? " — one of them gold" : stats.offers > 1 ? ` — ${stats.offers} of them gold` : ""}`}</div>
        <div className="tdb-ffqsub">{stats.back.length === 0 ? "Normal, not nothing — most weeks are quiet ones." : "Read them again if you like. They happened."}</div>
        <div className="tdb-rvrows">{stats.back.map((r, i) => (
          <div key={i} className="tdb-rvrow"><span className={`tdb-rvbadge${r.star ? " star" : " in"}`}>{r.badge}</span><span className="tdb-rvtx"><b>{r.label}</b><span>{r.meta}</span></span></div>
        ))}</div>
      </>,
      <>
        <button type="button" className="tdb-ffback" onClick={() => setRvStep(1)}>← Back</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffpri" onClick={() => setRvStep(3)}>Continue →</button>
      </>,
    );

    if (rvStep === 3) return sheet(
      <>
        <div className="tdb-ffstream off">LOOKING BACK · WHAT WENT QUIET</div>
        <div className="tdb-ffq">{stats.quiet.length === 0 ? "Nothing went quiet this week" : `${spell(stats.quiet.length)} ${stats.quiet.length === 1 ? "has" : "have"} gone quiet`}</div>
        <div className="tdb-ffqsub">{stats.quiet.length === 0 ? "Every live query is still inside its window." : "Decide now or decide later — either is a decision. Choices stage here and save at the end."}</div>
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
    );

    if (rvStep === 4) return sheet(
      <>
        <div className="tdb-ffstream off">THE WEEK AHEAD · SEEDING MONDAY</div>
        <div className="tdb-ffq">What should Monday hold?</div>
        <div className="tdb-ffqsub">Dated things are pre-ticked. These land on <b>Monday’s Today’s list</b> — you’ll wake up to a desk that’s already set.</div>
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
    );

    return sheet(
      <div className="tdb-rvdone">
        <span className="tdb-rvring" aria-hidden>☕</span>
        <div className="tdb-ffq">Week {win.weekNumber}, closed.</div>
        <div className="tdb-ffqsub">
          {rvSummary ? `${rvSummary.closed} ${rvSummary.closed === 1 ? "query" : "queries"} closed · Monday’s list seeded with ${rvSummary.seeded} thing${rvSummary.seeded === 1 ? "" : "s"}.` : ""}
          <br />See you at the desk tomorrow.
        </div>
      </div>,
      <>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffpri" onClick={() => requestExit()}>Back to my desk</button>
      </>,
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
    if (j === "nudge") return nudgeSheet(it.card);
    if (j === "stale") return staleSheet(it.card);
    if (j === "dq") return dqSheet(it.card);
    if (j === "note") return noteSheet(it.card);
    return sendSheet(it.card);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atReview, qi, step, items, mats, sentDate, method, copied, extrasOpen, backdated, rows, noMeansNo, found, notFound, assistAt, assisting, assistMsg, showMuted, noteText, staged, savedN, saving, offerDoor, offerChoice, remindDate, notifyStep, notifySel, review, rvStep, rvQuiet, rvSeed, rvSummary, sweep, deepDive, sweepReceipt, sweepFork, queries, agents, manuscripts, activities, taskFlags, currentUser]);


  const remaining = items.length - qi - 1;
  return (
    <div className="tdb-ff" role="dialog" aria-modal="true" aria-label="Focus flow" aria-labelledby="tdb-ff-heading" ref={rootRef} tabIndex={-1} onKeyDown={trapTab} onClick={scrimClick}>
      <div className="tdb-ffstage">
        {!atReview && remaining >= 2 && <div className="tdb-ffbehind b2" aria-hidden />}
        {!atReview && remaining >= 1 && <div className="tdb-ffbehind" aria-hidden />}
        <div className={`tdb-ffsheet${leaving ? " leaving" : ""}${nudged ? " nudged" : ""}`} onAnimationEnd={(e) => { if ((e.target as HTMLElement).classList.contains("nudged")) setNudged(false); }}>
          {/* chrome-fixes P3 — the takeover-era chrome lives IN the sheet now: dots + count
              top-left (multi-item modes only), the labelled exit top-right; the staged chip sits
              in the footer (sheet()). Nothing renders outside the sheet except the scrim. */}
          <div className="tdb-ffbar">
            {review ? (
              <>
                <div className="tdb-ffprog" aria-hidden>
                  {[0, 1, 2, 3, 4].map((i) => <span key={i} className={`tdb-ffdot${i < Math.min(rvStep, 4) ? " done" : i === Math.min(rvStep, 4) ? " on" : ""}`} />)}
                </div>
                <span className="tdb-ffcount">{rvStep < 5 ? `${rvStep + 1} OF 5` : "DONE"}</span>
              </>
            ) : items.length > 1 && (
              <>
                <div className="tdb-ffprog" aria-hidden>
                  {items.map((it, i) => <span key={itemKey(it)} className={`tdb-ffdot${i < qi ? " done" : i === qi ? " on" : ""}`} />)}
                </div>
                <span className="tdb-ffcount">{atReview ? "REVIEW" : `${qi + 1} OF ${items.length}`}</span>
              </>
            )}
            <span className="tdb-sp" />
            <button type="button" className="tdb-ffexit" onClick={() => requestExit()}>✕&nbsp;&nbsp;Back to my desk</button>
          </div>
          {content}
        </div>
      </div>
    </div>
  );
};

export default FocusFlow;
