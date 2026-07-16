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
 * the offer capture (the existing RecordResponseFocusForm — offers are never staged), the
 * housekeeping batch/dq saves (updateAgent), the stale close (updateQueryStatus), and the note
 * tick (updateUserTask). One write path throughout: markSentWriteArgs/nudgeWriteArgs feed the same
 * recordMaterialsSent/logNudge the quick paths use.
 *
 * Theme: F12 tokens only. StatusDot consumed verbatim (the timeline chips).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { StatusDot } from "../StatusDot";
import { RecordResponseFocusForm } from "../RecordResponseFocusForm";
import { useScriptAllyDb } from "../../lib/db";
import { getPrimaryAction } from "../../lib/queryPrimaryAction";
import { buildAgentTimeline } from "../../lib/agentsPage";
import { agentPrimary } from "../../lib/agentDisplay";
import { nudgeDraft } from "../../lib/nudgeDraft";
import { flagKeyForTask, MUTED_UNTIL } from "../../lib/taskFlags";
import { agentDataQualityNeeds, AgentDataNeed } from "../../lib/agentDataQuality";
import { BoardCard } from "../../lib/todoBoard";
import { HkGroup, HkRule, HK_RULES, HK_PAYOFF, mutedMembersForRule } from "../../lib/todoHousekeeping";
import {
  StagedPayload, applyStaged, markSentWriteArgs, nudgeWriteArgs, materialOptsForTask, DEFAULT_CHECKBACK_DAYS,
  quickSendPayload, quickNudgePayload, receiptLine,
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
  mode?: "journey" | "sweep";
}

export const FocusFlow: React.FC<FocusFlowProps> = ({ items, onClose, onNavigate, onToast, prefill, mode = "journey" }) => {
  const {
    queries, agents, manuscripts, activities, taskFlags, currentUser,
    recordMaterialsSent, logNudge, dismissTask, upsertTaskFlag, updateUserProfile, updateAgent, updateUserTask, updateQueryStatus, undoQueryStatus, resolveTaskFlag, deleteActivity,
  } = useScriptAllyDb();

  const [qi, setQi] = useState(0);
  const [step, setStep] = useState(0);
  const [staged, setStaged] = useState<StagedPayload[]>([]);
  const [leaving, setLeaving] = useState(false);
  const [offerFormOpen, setOfferFormOpen] = useState(false);
  const [savedN, setSavedN] = useState<number | null>(null); // the "Desk cleared" screen
  const [saving, setSaving] = useState(false);
  // sweep mode
  const sweep = mode === "sweep";
  const [deepDive, setDeepDive] = useState(false); // F on a group / Enter on an offer → the full journey sheet
  const [sweepReceipt, setSweepReceipt] = useState<string | null>(null); // brief inline receipt before advancing
  const [sweepFork, setSweepFork] = useState(false); // N on housekeeping → the never-fork row
  const activitiesRef = useRef(activities);
  activitiesRef.current = activities;
  // per-item scratch (reset on advance; the initial values honour a receipt-edit prefill)
  const [mats, setMats] = useState<Record<string, boolean>>(() => Object.fromEntries((prefill?.materials ?? []).map((m) => [m, true])));
  const [sentDate, setSentDate] = useState(prefill?.sentDate ?? todayISO());
  const [method, setMethod] = useState(prefill?.method ?? "Email");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
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
  const atReview = qi >= items.length;
  const item = atReview ? undefined : items[qi];

  const resetScratch = () => {
    setMats({}); setSentDate(todayISO()); setMethod("Email"); setNote(""); setCopied(false);
    setRows({}); setNoMeansNo({}); setFound({}); setNotFound(new Set()); setAssistAt(null); setAssistMsg(null); setShowMuted(false); setNoteText(null);
    setDeepDive(false); setSweepReceipt(null); setSweepFork(false);
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

  async function saveAll() {
    if (saving) return;
    setSaving(true);
    const res = await applyStaged(staged, {
      markSent: (p) => recordMaterialsSent(markSentWriteArgs(p)),
      nudge: (p) => logNudge(...nudgeWriteArgs(p)).then((r) => { if (!r.success) throw new Error(r.error || "nudge failed"); }),
      snooze: (p) => dismissTask(p.taskType, p.relatedRecordId, "fixed snooze", p.days),
      muteItem: (p) => upsertTaskFlag(flagKeyForTask(p.taskType, p.relatedRecordId), { snoozedUntil: MUTED_UNTIL }),
      muteRule: (p) => updateUserProfile({ mutedTaskRules: Array.from(new Set([...(currentUser?.mutedTaskRules ?? []), p.rule])) }),
    });
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
  const timelineChips = (ag?: Agent) => {
    if (!ag) return null;
    const tl = buildAgentTimeline(ag.id, queries, manuscripts, activities).slice(0, 5);
    if (!tl.length) return null;
    return (
      <div className="tdb-fftl">{tl.map((e: { id: string; status: QueryStatus; label: string; dateLabel: string }) => (
        <span key={e.id} className="tdb-fftle"><StatusDot status={e.status} overrideSize={13} />{e.label}<span className="tdb-fftld">{e.dateLabel}</span></span>
      ))}</div>
    );
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
        <div className={`tdb-ffstream${c.warn ? " warn" : ""}`}>Over to you{c.due ? ` · ${c.due}` : ""}</div>
        <div className="tdb-ffq">{emTitle(c)}</div>
        {c.subtitle && <div className="tdb-ffqsub">{c.subtitle}</div>}
        {whoRow(ag, c.initials)}
        {timelineChips(ag)}
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
    if (step === 1) return sheet(
      <>
        <div className="tdb-ffstream">{c.who || "Logging"} · logging the send</div>
        <div className="tdb-ffq">What went out?</div>
        <div className="tdb-ffqsub">Tick what you actually sent — it’s what we check against later.</div>
        <div className="tdb-ffchoices">{opts.map((m) => (
          <button key={m} type="button" className={`tdb-ffchoice${mats[m] ? " on" : ""}`} onClick={() => setMats((p) => ({ ...p, [m]: !p[m] }))}>
            <span className="tdb-ffck" /><span className="tdb-ffct">{m}</span>
          </button>
        ))}</div>
      </>,
      <>
        <button type="button" className="tdb-ffback" onClick={backOne}>← Back</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffpri" disabled={!any} onClick={() => setStep(2)}>{any ? "Next →" : "Tick what you sent"}</button>
      </>,
    );
    return sheet(
      <>
        <div className="tdb-ffstream">{c.who || "Logging"} · logging the send</div>
        <div className="tdb-ffq">When, and how?</div>
        <div className="tdb-ffrow">
          <div className="tdb-fff"><label>Date sent</label><input type="date" value={sentDate} onChange={(e) => setSentDate(e.target.value)} /></div>
          <div className="tdb-fff"><label>How</label><select value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></div>
        </div>
        <div className="tdb-ffrow"><div className="tdb-fff"><label>Note to yourself (optional)</label><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything worth remembering…" /></div></div>
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
            targetStatus: action.target as QueryStatus, sentDate: new Date(sentDate).toISOString(),
            isResubmit: action.markKind === "resubmit", method, materials: opts.filter((m) => mats[m]),
          });
        }}>Stage it →</button>
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
    if (offerFormOpen && q && ag) {
      return (
        <RecordResponseFocusForm
          isOpen
          onClose={() => { setOfferFormOpen(false); advance(); }}
          query={q}
          agent={ag}
          manuscript={{ title: ms?.title || "" }}
          onSuccessToast={() => onToast("Offer recorded — handled through the response flow.")}
        />
      );
    }
    if (step === 0) return sheet(
      <>
        <div className="tdb-ffconfetti" aria-hidden>🎉 ✦ 🎉</div>
        <div className="tdb-ffstream off">Offer of representation</div>
        <div className="tdb-ffofferq">{c.who || "An agent"} wants to represent you.</div>
        <div className="tdb-ffqsub">{ms?.title ? <>For <b>{ms.title}</b>. </> : ""}This is the thing all of it was for — take a breath before you do anything.</div>
        <div className="tdb-ffoffernote">— worth a cup of tea at least</div>
      </>,
      <>
        <button type="button" className="tdb-ffback" disabled={qi === 0} onClick={backOne}>← Back</button>
        <span className="tdb-sp" />
        <button type="button" className="tdb-ffskip" onClick={advance}>Not now — leave it</button>
        <button type="button" className="tdb-ffpri" onClick={() => setStep(1)}>What happens next →</button>
      </>,
    );
    return sheet(
      <>
        <div className="tdb-ffstream off">Offer · {c.who || "the agent"}</div>
        <div className="tdb-ffq">Before you answer…</div>
        <div className="tdb-ffqsub">You have <b>other agents still holding your work</b>. The done thing is to let them know you’ve had an offer and give them a chance to respond — most writers allow one to two weeks.</div>
        <div className="tdb-ffchoices">
          <button type="button" className="tdb-ffchoice" onClick={() => setOfferFormOpen(true)}>
            <span className="tdb-ffck" /><span><span className="tdb-ffct">Record the offer & notify the others</span>
            <span className="tdb-ffcs">Opens the response flow — logs the offer now (offers are never staged).</span></span>
          </button>
          <button type="button" className="tdb-ffchoice" onClick={advance}>
            <span className="tdb-ffck" /><span><span className="tdb-ffct">I’ll deal with this outside the flow</span>
            <span className="tdb-ffcs">Leaves it on the board, top of Urgent, where it belongs.</span></span>
          </button>
        </div>
      </>,
      <>
        <button type="button" className="tdb-ffback" onClick={backOne}>← Back</button>
        <span className="tdb-sp" />
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
              onToast("Closed as no response — not a rejection, so your response rate stays honest.", { label: "Undo", fn: () => undoQueryStatus(q.id, prev, QueryStatus.NO_RESPONSE) });
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
        <button type="button" className="tdb-ffpri pink" onClick={() => { if (c.userTaskId) updateUserTask(c.userTaskId, { done: true, completedAt: new Date().toISOString(), ...(dirty ? { text: text.trim() } : {}) }); onToast("Note done."); advance(); }}>✓ Mark it done</button>
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
      onToast("Note done", { label: "Undo", fn: () => updateUserTask(c.userTaskId!, { done: false }) });
      advanceAfterReceipt(`${c.title} — struck through on today’s list.`);
      return;
    }
    const q = cardQuery(c);
    if (!q) { advance(); return; }
    if (c.taskType === "no_response_close") {
      const prev = q.status as QueryStatus;
      await updateQueryStatus(q.id, QueryStatus.NO_RESPONSE, "Closed as no response from sweep mode");
      onToast("Closed as no response", { label: "Undo", fn: () => undoQueryStatus(q.id, prev, QueryStatus.NO_RESPONSE) });
      advanceAfterReceipt("Logged as no response — not a rejection, so your response rate stays honest.");
      return;
    }
    if (c.taskType === "nudge_overdue") {
      const p = quickNudgePayload({ cardKey: c.key, label: c.title, queryId: q.id, method: q.sendMethod, nowIso });
      const r = await logNudge(...nudgeWriteArgs(p));
      if (!r.success) { onToast(r.error || "Couldn’t log the nudge."); return; }
      const undo = async () => {
        const acts = activitiesRef.current
          .filter((a) => a.queryId === q.id && a.activityType === ActivityType.NUDGE_SENT)
          .sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());
        if (acts[0]?.id) await deleteActivity(acts[0].id);
      };
      onToast(`${c.title} — logged with defaults`, { label: "Undo", fn: undo });
      advanceAfterReceipt(receiptLine(p, todayISO()));
      return;
    }
    const action = getPrimaryAction(q.status as QueryStatus);
    if (action.kind !== "mark-sent") { advance(); return; }
    const p = quickSendPayload({ cardKey: c.key, label: c.title, taskType: c.taskType, queryId: q.id, targetStatus: action.target as QueryStatus, isResubmit: action.markKind === "resubmit", method: q.sendMethod, nowIso });
    const prev = q.status as QueryStatus;
    await recordMaterialsSent(markSentWriteArgs(p)); // the ONE mark-sent write path
    onToast(`${c.title} — logged with defaults`, { label: "Undo", fn: () => undoQueryStatus(q.id, prev, p.targetStatus) });
    advanceAfterReceipt(receiptLine(p, todayISO(), materialOptsForTask(c.taskType)));
  }

  function sweepSnooze(it: FocusItem) {
    if (it.kind === "group") {
      it.group.members.forEach((m) => m.agentId && dismissTask("data_quality_poor", m.agentId, "fixed snooze", 7));
      onToast("Snoozed for 7 days", { label: "Undo", fn: () => it.group.members.forEach((m) => m.agentId && upsertTaskFlag(flagKeyForTask("data_quality_poor", m.agentId), { snoozedUntil: null })) });
      advance();
      return;
    }
    const c = it.card;
    if (c.userTaskId) {
      const key = { taskType: USER_TASK_FLAG_TYPE, queryId: c.userTaskId };
      upsertTaskFlag(key, { snoozedUntil: plusDaysISO(7), bumpSnooze: true });
      onToast("Snoozed for 7 days", { label: "Undo", fn: () => upsertTaskFlag(key, { snoozedUntil: null }) });
    } else if (c.taskType && c.relatedRecordId) {
      dismissTask(c.taskType, c.relatedRecordId, "fixed snooze", 7);
      const key = flagKeyForTask(c.taskType, c.relatedRecordId);
      onToast("Snoozed for 7 days", { label: "Undo", fn: () => upsertTaskFlag(key, { snoozedUntil: null }) });
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
    return "never ask";
  };
  const stagedVerb = (p: StagedPayload): { cls: string; label: string } =>
    p.kind === "mark-sent" || p.kind === "nudge" ? { cls: "d", label: "Done" } : p.kind === "snooze" ? { cls: "s", label: "Snoozed" } : { cls: "k", label: "Noted" };

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
        <div className="tdb-fffoot">{foot}</div>
      </>
    );
  }

  const content = useMemo(() => {
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
  }, [atReview, qi, step, items, mats, sentDate, method, note, copied, rows, noMeansNo, found, notFound, assistAt, assisting, assistMsg, showMuted, noteText, staged, savedN, saving, offerFormOpen, sweep, deepDive, sweepReceipt, sweepFork, queries, agents, manuscripts, activities, taskFlags, currentUser]);

  // The offer capture is its own full-screen form — render it INSTEAD of the flow frame.
  if (offerFormOpen && item?.kind === "card") return <>{content}</>;

  const remaining = items.length - qi - 1;
  return (
    <div className="tdb-ff" role="dialog" aria-modal="true" aria-label="Focus flow">
      <div className="tdb-ffchrome">
        <button type="button" className="tdb-ffexit" onClick={() => requestExit()}>✕&nbsp;&nbsp;Back to the board</button>
        <span className="tdb-sp" />
        <div className="tdb-ffprog" aria-hidden>
          {items.map((it, i) => <span key={itemKey(it)} className={`tdb-ffdot${i < qi ? " done" : i === qi ? " on" : ""}`} />)}
        </div>
        <span className="tdb-ffcount">{atReview ? "REVIEW" : `${qi + 1} OF ${items.length}`}</span>
        {staged.length > 0 && <span className="tdb-ffpend">{staged.length} staged — nothing saved yet</span>}
      </div>
      <div className="tdb-ffstage">
        {!atReview && remaining >= 2 && <div className="tdb-ffbehind b2" aria-hidden />}
        {!atReview && remaining >= 1 && <div className="tdb-ffbehind" aria-hidden />}
        <div className={`tdb-ffsheet${leaving ? " leaving" : ""}`}>{content}</div>
      </div>
    </div>
  );
};

export default FocusFlow;
