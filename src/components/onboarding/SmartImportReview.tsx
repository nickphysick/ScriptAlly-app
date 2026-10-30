/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The import review (onboarding v5, part 2; ref design-refs/onboarding/onboarding-journey-v5.html
 * #dupes #agents #queries). Three steps over ONE in-memory working model — duplicates (only when the
 * file had duplicate sets), agents, queries — each a list card beside a guide card, inside the
 * set-up frame's sheet. Nothing is written until Import: `onImport` receives
 * `modelToResult(result, agents, queries)` and the host commits it.
 *
 * ⚠️ THIS FILE DRAWS; IT DECIDES NOTHING. What a row is, what is asked of it and what is written
 * are `lib/smartImportReviewModel`'s. Every handler below is the one the review has always had.
 *
 * EVERY QUESTION IS ASKED IN THE ANSWER DECK (onboarding v9). The agents and queries steps open on
 * a deck that asks one question at a time; beneath it, the rows that are ready. v5 asked each
 * question in its own row, beside a guide card and an FAQ rail; the rail is gone, the guide's
 * sentence is the step's subline, and the FAQ is behind the deck's "Questions".
 *
 * NOTHING FLAGGED IS OPTIONAL, AND A STEP'S PRIMARY WAITS. It is disabled until every question on
 * the step has an answer, and its label carries the count (`lib/reviewGate`). "Carry on without
 * an agency" and "I don't have this date" are answers. The duplicates step waits the same way,
 * so an undecided set no longer carries through to the agents step.
 *
 * A ROW WITH NO AGENT AND NO AGENCY IS ASKED ABOUT. The review used to set it aside by itself;
 * now it must be named or removed. A removed one is listed in the skipped-rows notice exactly as
 * the set-aside one was.
 */
import React, { useState, useRef, useMemo, useCallback } from "react";
import { queryOriginLine } from "../../lib/importLabels";
import "./importFlow.css";
import { SmartImportResult, ReviewReasonCode } from "../../types/smartImport";
import { QueryStatus } from "../../types";
import { agentPrimary, AGENT_NOT_SPECIFIED } from "../../lib/agentDisplay";
import {
  ReviewAgent, ReviewQuery, CheckReason,
  resolveReason, fmtDate,
  dupNoteOpen, dupNoteKept, parseModel, modelToResult, autoSetAsideRows, applyAgentRemoval, seedUnidentifiedSetAside,
  removeDuplicateRecord, buildClusters, mergedAwayByKeeper,
  rowsIdentical, derivedCurrentStatus, applyDuplicateCollapse,
} from "../../lib/smartImportReviewModel";
import { importSteps } from "../../lib/importSummary";
import { ReconcileCard, ReconcileCardRow } from "./ReconcileCard";
import { Chip, Stepper } from "./ImportParts";
import { AgentRow, QueryRow, DupeOpen, DupeKept, DupeMerged, PhoneDupePick } from "./reviewRows";
import { Disc, initialsOf } from "./ImportParts";
import { GoMark } from "./v9/GoMark";
import { PhonePin } from "./setupParts";
import { useSetupBand, useSetupFootHost } from "./SetupFrame";
import { useIsMobile } from "../shell/mobileChrome";
import { ReviewDeck, DeckCard } from "./v9/ReviewDeck";
import { AgencyQuestion, NamelessQuestion, MappingQuestion, QueryQuestion, Answered, DECK_WORDS } from "./v9/DeckQuestions";
import {
  agentAsk, AgentAsk, AGENT_ASK_CHIP, openAgentQuestions, openQueryQuestions, questionFamily,
  comingUpAgents, comingUpQueries, reviewSubline, gatePrimary, gateHint,
  answerKind, answeredLine, allAnsweredHead, writeHint, duplicatesDoneLine, duplicatesNextHint,
} from "../../lib/reviewGate";
import { STAGE_NAME } from "../../lib/qcSummary";
import { focusReasonMeta } from "../../lib/smartImportReviewModel";

// ── The words of the three steps ─────────────────────────────────────────────────────────────────
const NUM_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
/** "One agent looks like they came in twice." — words to twelve, then figures. */
export const duplicatesTitle = (openSets: number): string =>
  openSets === 0 ? "All duplicates sorted."
    : openSets === 1 ? "One agent looks like they came in twice."
    : `${openSets <= 12 ? NUM_WORDS[openSets] : openSets} agents look like they came in twice.`;
export const DUPLICATES_SUB = "Keep one row and its queries combine. Nothing is lost.";
export const REVIEW_PRIMARY = { duplicates: "Review all agents" } as const;
/** Duplicates, all sorted (v9). */
export const DUPES_DONE = { head: "Duplicates sorted.", list: "What you decided", change: "Change a decision", merged: "Merged", kept: "Kept both", open: "Decide each set above first." } as const;
/** The ready list beneath the deck (v9). */
export const READY_LIST = { head: "Ready to import", showAll: (n: number) => `Show all ${n}`, lead: "Coming up:" } as const;
/** How many ready rows show before "Show all". */
export const READY_FIRST = 5;

export interface Faq { q: string; a: string }
/** The duplicates step's questions, verbatim. */
export const DUP_FAQS: Faq[] = [
  { q: "What's a duplicate?", a: "The same agent looks like it came in twice. Keep one (their queries combine) or keep both." },
  { q: "What if they're actually different people?", a: "Choose “keep both” and we'll leave them as two separate agents." },
  { q: "What happens when I merge?", a: "You keep one and its queries move onto it — nothing's lost." },
  { q: "Can I fix this later?", a: "Yes — you can come back to this step from the agents screen." },
];
/** The answer both steps give to "Needs an answer" (v9). */
const NEEDS_AN_ANSWER = "Something in that row is missing, or your sheet said it in a way that reads two ways. Pick an answer, or say you don't have it where that's allowed. Continue lights once every one is answered.";
/** The agents step's questions, verbatim. ⚠️ A NAME **OR** AN AGENCY IS ENOUGH — never assert that
 *  an agency is required; the row a few centimetres to the left offers "carry on without one". */
export const AGENT_FAQS: Faq[] = [
  { q: 'What does "Needs an answer" mean?', a: NEEDS_AN_ANSWER },
  { q: "Can I add more agents later?", a: "Any time, from your dashboard — by import or by hand." },
  { q: "What if I don't have the agent's name?", a: 'If you know the agency, choose "Reference by agency only". If the row has neither a name nor an agency, add one or remove the row.' },
  { q: "Is the agency name required?", a: 'No. Add it if you know it, or choose "Carry on without an agency". Either counts as an answer.' },
  { q: "What happens when I delete a duplicate?", a: "We import just one of the two records and merge any queries from the duplicate onto that single agent — so nothing's lost." },
];
/** The queries step's questions, verbatim. */
export const QUERY_FAQS: Faq[] = [
  { q: 'What does "Needs an answer" mean?', a: NEEDS_AN_ANSWER },
  { q: "Can I add more queries later?", a: "Any time — log a new query from your dashboard whenever you send one." },
  { q: "What if I don't know the date I sent it?", a: 'Choose "I don\'t have this date". The query is kept undated, and the dashboard shows it as waiting on you until you add one.' },
  { q: "Can a query have no agent?", a: "No. Give the row an agent name or an agency, or remove it. A removed row is listed as not imported." },
  { q: "What does the status mean?", a: "It's where the query sits in your pipeline — queried, partial, full, and so on. We read it from your file; correct any that look off." },
];

// ── The step's questions: behind the deck's "Questions" (and the duplicates list's) ────────────
/** "Questions" — several answers may be open at once, as the built list allowed. */
const Questions: React.FC<{ items: Faq[]; open: Set<number>; onToggle: (i: number) => void }> = ({ items, open, onToggle }) => (
  <div className="im-faq" data-im="questions">
    <h3 className="im-faqh">Questions</h3>
    {items.map((item, i) => {
      const isOpen = open.has(i);
      return (
        <div className="im-faqitem" key={item.q}>
          <button type="button" className="im-faqq" aria-expanded={isOpen} onClick={() => onToggle(i)} data-im="faq-q">
            {item.q}<span aria-hidden="true">+</span>
          </button>
          {isOpen && <p className="im-faqa" data-im="faq-a">{item.a}</p>}
        </div>
      );
    })}
  </div>
);

// ── Gentle undo: a brief toast for a duplicates-step removal ────────────────────────────────────
/* A row left out on the agents or queries step needs no toast and no tray: it stays in its place,
   says "Won't be imported", and carries its own Undo (import review v1). */
const UndoToast: React.FC<{ msg: string; onUndo: () => void; onClose: () => void }> = ({ msg, onUndo, onClose }) => (
  <div role="status" className="im-toast" data-im="toast">
    <span>{msg}</span>
    <button type="button" className="im-toastundo" onClick={onUndo} data-im="toast-undo">Undo</button>
    <button type="button" className="im-toastx" onClick={onClose} aria-label="Dismiss">×</button>
  </div>
);

// ── Review (Duplicates → Agents ⇄ Queries) ──────────────────────────────────────────────────────
export interface SmartImportReviewProps {
  result: SmartImportResult;
  /** The manuscript's title, for the queries step's title. */
  manuscriptTitle?: string;
  onBack?: () => void;
  /** A commit error from the host (e.g. commitSmartImport threw) — surfaced above the list so a
   *  failed import is never silent. The host owns the message; this component just shows it. */
  error?: string | null;
  /** Import the final working model. The component converts it (modelToResult) to a SmartImportResult
   *  ready for commitSmartImport(deps, result, manuscriptId). The host owns the commit deps; this
   *  component owns the conversion. */
  /** `left` carries what the result cannot: the rows the review set aside by itself that are
   *  still set aside, for the host's skipped-rows notice. */
  onImport?: (result: SmartImportResult, left?: { setAside: { status: string; sentDate: string | null }[] }) => void | Promise<void>;
  /** A host with a way out of its own (the Import page) passes this; set-up passes none and no link is drawn. */
  onCancel?: () => void;
}

type Step = "duplicates" | "agents" | "queries";

export const SmartImportReview: React.FC<SmartImportReviewProps> = ({ result, manuscriptTitle, onBack, error, onImport, onCancel }) => {
  const initial = useMemo(() => parseModel(result), [result]);
  // v9: nothing is set aside before the review begins. A row with no agent and no agency is
  // asked about on the agents step.
  const seeded = initial;
  const [agents, setAgents] = useState<ReviewAgent[]>(seeded.agents);
  const [queries, setQueries] = useState<ReviewQuery[]>(seeded.queries);
  // Open on the duplicates step only when the import actually has clusters (never empty).
  // `hadDuplicates` is fixed for the session: it keeps the step reachable again via Agents' Back even
  // after every cluster is resolved (so a mistaken merge can be undone).
  const hadDuplicates = useMemo(() => initial.agents.some((a) => a.mergeWith.length > 0 && !a.mergeResolved), [initial]);
  const [screen, setScreen] = useState<Step>(hadDuplicates ? "duplicates" : "agents");
  /* Repeats on a phone: which set is on screen, and each set's held choice (set-up on phones v1). */
  const [dupAt, setDupAt] = useState(0);
  const [, setDupTick] = useState(0);
  const dupApply = useRef<Record<string, (() => void) | null>>({});
  // Per-cluster pre-resolution snapshot (keyed by leader id) — restored verbatim on Undo, so a merge or
  // keep-both can be cleanly reversed (un-delete the removed agent, revert repointed queries).
  const snapRef = useRef<Record<string, { agents: ReviewAgent[]; queries: { id: string; agentRef: string }[] }>>({});
  // Reconcile: per-cluster query-collapse. A FULL snapshot (the cluster's agents + queries) so
  // "Change this" / reset can revert a collapse. `reconciled` drives the card's working↔sorted state,
  // keyed by the cluster leader id.
  const reconcileSnapRef = useRef<Record<string, { agents: ReviewAgent[]; queries: ReviewQuery[] }>>({});
  const [reconciled, setReconciled] = useState<Record<string, { keptId: string; kind: "collapsed" | "split" }>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  /* Rows whose details the writer changed in the panel: "✓ Details added" and "Edit details". */
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const touch = (id: string) => setTouched((t) => (t.has(id) ? t : new Set(t).add(id)));
  const [openFaqs, setOpenFaqs] = useState<Set<number>>(new Set());
  const toggleFaq = (i: number) => setOpenFaqs((prev) => { const next = new Set(prev); if (next.has(i)) next.delete(i); else next.add(i); return next; });

  // ── Gentle-undo: a brief "Undo" toast, plus the set-aside tray (below). Removing a record is never
  // a hard delete during review — it sets the record aside (recoverable via the tray) until Import.
  const [toast, setToast] = useState<{ msg: string; undo: () => void } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashToast = (msg: string, undo: () => void) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, undo });
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  };
  const dismissToast = () => { if (toastTimer.current) clearTimeout(toastTimer.current); setToast(null); };
  // Restore a set-aside agent: un-delete it AND bring back the queries its removal cascaded.
  const restoreAgent = (id: string) => {
    setAgents((xs) => xs.map((a) => (a.id === id ? { ...a, deleted: false, setAsideStage: undefined, setAsideContext: undefined } : a)));
    setQueries((xs) => xs.map((q) => (q.agentRef === id && q.removed && q.removedReason === "Agent removed" ? { ...q, removed: false, removedReason: undefined } : q)));
    dismissToast();
  };
  const restoreQuery = (id: string) => {
    setQueries((xs) => xs.map((q) => (q.id === id ? { ...q, removed: false, removedReason: undefined } : q)));
    dismissToast();
  };

  const active = agents.filter((a) => !a.deleted);
  const queryCount = useCallback((id: string) => queries.filter((q) => q.agentRef === id && !q.removed).length, [queries]);
  // How many queries a now-merged-away record brought across — counted from the ORIGINAL import (its
  // live count is 0 post-merge), so the bar pluralises "quer{y|ies}" correctly. Read-only.
  const movedCount = useCallback((removedId: string) => (result.queries || []).filter((q) => q.agentRef === removedId).length, [result]);

  const patch = (id: string, p: Partial<ReviewAgent>) => { setAgents((xs) => xs.map((a) => (a.id === id ? { ...a, ...p } : a))); };

  // Destructive row-level remove: removes the agent AND cascades its queries to "Not being imported".
  const remove = (id: string) => {
    const a = agents.find((x) => x.id === id);
    const qc = queryCount(id);
    const next = applyAgentRemoval(agents, queries, id);
    setAgents(next.agents.map((x) => (x.id === id ? { ...x, setAsideStage: "agents" as const } : x)));
    setQueries(next.queries);
    setOpenId((cur) => (cur === id ? null : cur));
  };

  // Snapshot a cluster's pre-resolution state (members + their queries' agentRefs) so the decision can
  // be undone verbatim later. Keyed by the cluster's leader id; first write wins (kept until undone).
  const snapshotCluster = (leaderId: string) => {
    if (snapRef.current[leaderId]) return;
    const leader = agents.find((a) => a.id === leaderId);
    if (!leader) return;
    const ids = new Set([leader.id, ...leader.mergeWith]);
    snapRef.current[leaderId] = {
      agents: agents.filter((a) => ids.has(a.id)).map((a) => JSON.parse(JSON.stringify(a)) as ReviewAgent),
      queries: queries.filter((q) => ids.has(q.agentRef)).map((q) => ({ id: q.id, agentRef: q.agentRef })),
    };
  };

  // Undo a resolved cluster: restore its members and their queries' agentRefs from the snapshot,
  // re-flagging the pair (keep-both) or un-deleting + re-pointing the removed agent (merge).
  const undoCluster = (leaderId: string) => {
    const snap = snapRef.current[leaderId];
    if (!snap) return;
    const aMap = new Map(snap.agents.map((a) => [a.id, a]));
    const qMap = new Map(snap.queries.map((q) => [q.id, q.agentRef]));
    setAgents((xs) => xs.map((a) => aMap.get(a.id) ?? a));
    setQueries((xs) => xs.map((q) => (qMap.has(q.id) ? { ...q, agentRef: qMap.get(q.id)! } : q)));
    delete snapRef.current[leaderId];
  };

  // Duplicate removal (NOT the row's remove): set aside ONLY the clicked record. The other members stay
  // flagged as a duplicate group for individual judgement — so a 3-way group takes two deliberate
  // removals to reach one keeper. The removed record's queries repoint to the consolidation target,
  // never dropped; the record is set aside (recoverable on the duplicates step), never hard-deleted.
  const removeDuplicate = (removedId: string) => {
    const leader = agents.find((a) => !a.deleted && !a.mergeResolved && a.mergeWith.length > 0 && (a.id === removedId || a.mergeWith.includes(removedId)));
    if (!leader) return;
    const next = removeDuplicateRecord(agents, queries, removedId);
    if (next.survivorId === null) return; // never set aside the last member
    snapshotCluster(leader.id);
    setAgents(next.agents);
    setQueries(next.queries);
    const label = (agents.find((x) => x.id === removedId)?.name || agents.find((x) => x.id === removedId)?.agency) || "Record";
    flashToast(`${label} won't be imported`, () => undoCluster(leader.id));
  };

  // Keep both: dismiss the suggestion, leaving two agents. The leader's `duplicate` reason resolves
  // with a "kept both" note (undoable — Undo re-opens the cluster).
  const keepBoth = (leaderId: string) => {
    const leader = agents.find((a) => a.id === leaderId);
    if (!leader) return;
    snapshotCluster(leader.id);
    const group = new Set([leader.id, ...leader.mergeWith]);
    setAgents((xs) => xs.map((a) => {
      if (a.id === leaderId) return { ...a, mergeResolved: true, reasons: a.reasons.map((r) => (r.kind === "duplicate" ? { ...r, resolved: true, undoable: true, note: dupNoteKept(a.agency, group.size) } : r)) };
      if (group.has(a.id)) return { ...a, mergeResolved: true };
      return a;
    }));
  };

  // ── Reconcile: collapse a flagged pair's two query rows into ONE ──────────────────────────────
  const snapReconcile = (leaderId: string) => {
    if (reconcileSnapRef.current[leaderId]) return;
    const leader = agents.find((a) => a.id === leaderId);
    if (!leader) return;
    const ids = new Set([leader.id, ...leader.mergeWith]);
    reconcileSnapRef.current[leaderId] = {
      agents: agents.filter((a) => ids.has(a.id)).map((a) => JSON.parse(JSON.stringify(a)) as ReviewAgent),
      queries: queries.filter((q) => ids.has(q.agentRef)).map((q) => JSON.parse(JSON.stringify(q)) as ReviewQuery),
    };
  };
  // "Looks right" — merge the pair AND collapse their two query rows into one derived-history query.
  const reconcileCollapse = (leaderId: string, removedId: string, keptStatus: QueryStatus, keptId: string) => {
    snapReconcile(leaderId);
    const next = applyDuplicateCollapse(agents, queries, removedId, keptStatus);
    setAgents(next.agents); setQueries(next.queries);
    setReconciled((r) => ({ ...r, [leaderId]: { keptId, kind: "collapsed" } }));
  };
  // "These are actually different submissions" — keep both as separate queries (the additive merge).
  const reconcileSplit = (leaderId: string, removedId: string, keptId: string) => {
    snapReconcile(leaderId);
    const next = removeDuplicateRecord(agents, queries, removedId);
    setAgents(next.agents); setQueries(next.queries);
    setReconciled((r) => ({ ...r, [leaderId]: { keptId, kind: "split" } }));
  };
  // "Change this" / reset — restore the cluster's pre-collapse agents + queries by id.
  const revertReconcile = (leaderId: string) => {
    const snap = reconcileSnapRef.current[leaderId];
    if (snap) {
      const aMap = new Map(snap.agents.map((a) => [a.id, a]));
      const qMap = new Map(snap.queries.map((q) => [q.id, q]));
      setAgents((xs) => xs.map((a) => aMap.get(a.id) ?? a));
      setQueries((xs) => xs.map((q) => qMap.get(q.id) ?? q));
      delete reconcileSnapRef.current[leaderId];
    }
    setReconciled((r) => { const n = { ...r }; delete n[leaderId]; return n; });
  };

  // Mark a non-duplicate (mapping) reason as checked — resolve in place.
  const resolveMapping = (id: string) => { setAgents((xs) => xs.map((a) => (a.id === id ? { ...a, reasons: resolveReason(a, "mapping") } : a))); };

  // Undo a checked note: re-open that reason.
  const reopenReason = (cardId: string, kind: CheckReason) => {
    if (kind === "duplicate") delete snapRef.current[cardId]; // keep-both re-opened here too — drop its snapshot
    setAgents((xs) => {
      const a0 = xs.find((a) => a.id === cardId);
      if (!a0) return xs;
      if (kind !== "duplicate")
        return xs.map((a) => (a.id === cardId ? { ...a, reasons: a.reasons.map((r) => (r.kind === kind ? { ...r, resolved: false } : r)) } : a));
      // Duplicate (keep-both) undo: re-open the whole cluster.
      const group = new Set([a0.id, ...a0.mergeWith]);
      return xs.map((a) => (group.has(a.id)
        ? { ...a, mergeResolved: false, reasons: a.reasons.map((r) => (r.kind === "duplicate" ? { ...r, resolved: false, note: dupNoteOpen(a.agency) } : r)) }
        : a));
    });
  };

  // Move between the steps; edits live in shared state, so they persist both ways.
  const switchScreen = (name: Step) => {
    setScreen(name); setOpenId(null); setOpenFaqs(new Set());
    /* The sheet scrolls, not the window (and on a phone, where the frame is a document, the window). */
    requestAnimationFrame(() => {
      document.querySelector('[data-sf="scroll"]')?.scrollTo({ top: 0 });
      window.scrollTo({ top: 0 });
    });
  };

  // ── The gate: a step's primary waits until everything on it has an answer ─────────────────────
  const agentOpen = openAgentQuestions(active).length;
  const onContinueClick = () => { if (active.length > 0 && agentOpen === 0) switchScreen("queries"); };

  // ── Queries side ──────────────────────────────────────────────────────────────────────────────
  const qActive = queries.filter((q) => !q.removed);
  const agentNameOf = (ref: string) => { const a = agents.find((x) => x.id === ref); return (a ? agentPrimary(a) : "") || AGENT_NOT_SPECIFIED; };
  const qNeed = openQueryQuestions(qActive).length;
  // Import needs at least one query to bring across, and every question answered.
  const canImport = qActive.length > 0 && qNeed === 0;

  const patchQuery = (id: string, p: Partial<ReviewQuery>) => { setQueries((xs) => xs.map((q) => (q.id === id ? { ...q, ...p } : q))); };
  const removeQuery = (id: string) => { setQueries((xs) => xs.map((q) => (q.id === id ? { ...q, removed: true, removedReason: "Removed by you" } : q))); setOpenId((cur) => (cur === id ? null : cur)); };
  // Mark one typed reason resolved (the row goes Ready when none remain open). `patch` lets a
  // resolution also apply the user's fix in the same update.
  const resolveQueryReason = (id: string, code: ReviewReasonCode, patch: Partial<ReviewQuery> = {}) => {
    setQueries((xs) => xs.map((q) => (q.id === id
      ? { ...q, ...patch, reasons: q.reasons.map((r) => (r.code === code ? { ...r, resolved: true } : r)) }
      : q)));
  };
  // Swap which date is the sent date vs the (first) timeline event — the two-dates "Swap" control.
  const swapQueryDates = (id: string) => {
    setQueries((xs) => xs.map((q) => {
      if (q.id !== id || q.timeline.length === 0) return q;
      const [ev, ...rest] = q.timeline;
      return { ...q, sentDate: ev.date, sentDateRaw: ev.raw, timeline: [{ ...ev, date: q.sentDate, raw: q.sentDateRaw }, ...rest] };
    }));
  };
  // Re-open a settled query's typed reasons (session-only: flips resolved flags; the applied fixes stay).
  const reopenQueryReasons = (id: string) => {
    setQueries((xs) => xs.map((q) => (q.id === id ? { ...q, reasons: q.reasons.map((r) => ({ ...r, resolved: false })) } : q)));
  };

  const onImportClick = () => {
    if (!canImport) return; // nothing to import, or a question still open
    void onImport?.(modelToResult(result, agents, queries), { setAside: autoSetAsideRows(agents, queries) });
  };

  // ── Duplicates ────────────────────────────────────────────────────────────────────────────────
  /** Undo every snapshot that covers a merged group, recovering the whole original set. */
  const undoMerged = (keeper: ReviewAgent, bars: ReviewAgent[]) => {
    const ids = [keeper.id, ...bars.map((b) => b.id)];
    Object.keys(snapRef.current)
      .filter((k) => snapRef.current[k].agents.some((a) => ids.includes(a.id)))
      .forEach((k) => undoCluster(k));
  };

  // Every detected cluster, resolved or not — the duplicates step renders open ones in the active
  // resolve UI and resolved ones in their settled state, so a decision stays revisitable via Back.
  const allClusters = buildClusters(agents);
  const openSets = allClusters.filter((c) => c.type !== "keepboth").length;
  /* v9: once every set is decided the list gives way to the mark and "What you decided". "Change a
     decision" brings the sets back, each with its Undo; deciding them all again returns here. */
  const [dupEditing, setDupEditing] = useState(false);
  const wasOpen = useRef(openSets > 0);
  React.useEffect(() => { if (wasOpen.current && openSets === 0) setDupEditing(false); wasOpen.current = openSets > 0; }, [openSets]);
  const dupesDone = screen === "duplicates" && openSets === 0 && !dupEditing;
  const decided = (): { id: string; name: string; initials: string; sub: string; chip: string; merged: boolean }[] => {
    const out: { id: string; name: string; initials: string; sub: string; chip: string; merged: boolean; at: number }[] = [];
    const idx = new Map<string, number>(agents.map((a, i): [string, number] => [a.id, i]));
    for (const [keeperId, bars] of mergedAwayByKeeper(agents)) {
      const k = agents.find((a) => a.id === keeperId);
      if (!k || k.deleted) continue;
      const name = k.name || k.agency || "This agent";
      const gone = bars.map((b) => `"${b.name || b.agency || "a row"}"`).join(", ");
      out.push({ id: keeperId, name, initials: k.name ? initialsOf(k.name) : "–", merged: true, chip: DUPES_DONE.merged, at: idx.get(keeperId) ?? 0,
        sub: [k.name && k.agency ? k.agency : null, "kept", `${gone} merged in`].filter(Boolean).join(" · ") });
    }
    for (const c of allClusters) {
      if (c.type !== "keepboth") continue;
      const l = c.members[0];
      out.push({ id: c.leaderId, name: c.members.map((m) => m.name || m.agency).join(", "), initials: l.name ? initialsOf(l.name) : "–", merged: false, chip: c.members.length > 2 ? "Kept all" : DUPES_DONE.kept, at: idx.get(c.leaderId) ?? 0,
        sub: [l.agency || null, "kept as separate agents"].filter(Boolean).join(" · ") });
    }
    return out.sort((a, b) => a.at - b.at);
  };

  // A flagged pair as the reconcile card: working while the cluster is open, sorted once
  // collapsed/split. Rows are the live member queries while open, or the pre-collapse snapshot once
  // resolved (one row is then removed but still shown so the harvest/summary reads correctly).
  const renderReconcileCard = (leaderId: string, members: ReviewAgent[]) => {
    const keeper = members[0];
    const res = reconciled[leaderId] ?? null;
    const snap = reconcileSnapRef.current[leaderId];
    const memberIds = new Set(members.map((m) => m.id));
    const sourceQueries = res && snap ? snap.queries : queries;
    const rowQs = sourceQueries.filter((q) => memberIds.has(q.agentRef) && (res ? true : !q.removed));
    const rows: ReconcileCardRow[] = rowQs.map((q) => ({ id: q.id, status: q.status, dateLabel: q.sentDate ? fmtDate(q.sentDate) : "no date", note: q.notes.trim() }));
    const defaultKeptId = (rowQs.find((q) => q.status === derivedCurrentStatus(rowQs)) ?? rowQs[0])?.id ?? "";
    const removedId = members[1]?.id ?? "";
    return (
      <ReconcileCard
        key={`recon-${leaderId}`}
        setId={leaderId}
        agentName={keeper.name || keeper.agency || "this agent"}
        manuscriptTitle=""
        rows={rows}
        defaultKeptId={defaultKeptId}
        resolved={res}
        onLooksRight={(keptId) => reconcileCollapse(leaderId, removedId, rowQs.find((q) => q.id === keptId)!.status, keptId)}
        onSplit={() => reconcileSplit(leaderId, removedId, defaultKeptId)}
        onChange={() => revertReconcile(leaderId)}
      />
    );
  };

  /** Every duplicate set, in the build's order: each cluster anchored at the agents-index of its
   *  TOPMOST original member, so a set that resolves stays in the slot the writer just acted in. */
  const duplicateUnits = (): React.ReactNode[] => {
    const byKeeper = mergedAwayByKeeper(agents);
    const idx = new Map<string, number>(agents.map((a, i): [string, number] => [a.id, i]));
    const at = (...ids: string[]) => Math.min(...ids.map((id) => idx.get(id) ?? 0));
    const placed = new Set<string>();
    const units: { sort: number; node: React.ReactNode }[] = [];
    for (const c of allClusters) {
      if (c.type === "keepboth") {
        const leaderAgency = agents.find((a) => a.id === c.leaderId)?.agency ?? "";
        units.push({ sort: at(...c.members.map((m) => m.id)),
          node: <DupeKept key={`kept-${c.leaderId}`} leaderId={c.leaderId} agency={leaderAgency} members={c.members} onUndo={() => undoCluster(c.leaderId)} /> });
        c.members.forEach((m) => placed.add(m.id));
      } else { // open (merge type never arises — a resolved merge has no live anchor)
        // A two-member pair with one live query each that DIFFER → the reconcile card (collapse
        // into one query), in place. Identical rows / 3-ways / other shapes keep the dedupe control.
        const pair = c.openMembers.length === 2
          ? c.openMembers.map((m) => queries.find((q) => q.agentRef === m.id && !q.removed)).filter((q): q is ReviewQuery => !!q)
          : [];
        if (pair.length === 2 && !rowsIdentical(pair[0], pair[1])) {
          units.push({ sort: at(...c.members.map((m) => m.id)), node: renderReconcileCard(c.leaderId, c.openMembers) });
          c.members.forEach((m) => placed.add(m.id));
        } else {
          const bars = byKeeper.get(c.leaderId) ?? [];
          /* A phone shows a two-agent set as three choices (5B), through the same two handlers. */
          if (isMobile && c.openMembers.length === 2 && bars.length === 0) {
            units.push({ sort: at(c.leaderId), node: (
              <PhoneDupePick key={`open-${c.leaderId}`} a={c.openMembers[0]} b={c.openMembers[1]} queryCount={queryCount}
                onRemove={removeDuplicate} onKeepBoth={() => keepBoth(c.leaderId)}
                register={(fn) => { dupApply.current[c.leaderId] = fn; setDupTick((t) => t + 1); }} />) });
            placed.add(c.leaderId);
            continue;
          }
          units.push({ sort: at(c.leaderId, ...bars.map((b) => b.id)),
            node: <DupeOpen key={`open-${c.leaderId}`} leader={c.members[0]} members={c.openMembers} bars={bars} queryCount={queryCount} movedCount={movedCount}
                    onRemove={removeDuplicate} onKeepBoth={() => keepBoth(c.leaderId)} /> });
          placed.add(c.leaderId);
          bars.forEach((b) => placed.add(b.id));
        }
      }
    }
    // Fully-resolved merges: a keeper no longer anchoring any open cluster, plus its bars.
    for (const [keeperId, bars] of byKeeper) {
      if (placed.has(keeperId)) continue;
      const keeper = agents.find((a) => a.id === keeperId);
      if (!keeper || keeper.deleted) continue;
      // A pair resolved via the reconcile card shows its OWN sorted state (collapsed/split), in place.
      units.push({ sort: at(keeperId, ...bars.map((b) => b.id)),
        node: reconciled[keeperId]
          ? renderReconcileCard(keeperId, [keeper, ...bars])
          : <DupeMerged key={`merged-${keeperId}`} keeper={keeper} bars={bars} queries={queryCount(keeperId)} movedCount={movedCount} onUndo={() => undoMerged(keeper, bars)} /> });
    }
    units.sort((a, b) => a.sort - b.sort);
    return units.map((u) => u.node);
  };

  // ── The three steps' rows ─────────────────────────────────────────────────────────────────────
  /* The ready rows. A row that still asks something is in the deck, not here. A row the writer
     chose not to import stays in its place, says so, and can be undone (import review v1). */
  const outAgent = (a: ReviewAgent) => a.deleted && a.setAsideStage === "agents";
  const listAgents = agents.filter((a) => (a.deleted ? outAgent(a) : agentAsk(a) === null));
  const readyAgents = listAgents.filter((a) => !a.deleted);
  const agentRows = (): React.ReactNode[] => {
    /* An agent merged from two rows says so in its second line. */
    const mergedKeepers = new Set(mergedAwayByKeeper(agents).keys());
    return listAgents.map((a) => (
      <AgentRow key={a.id} agent={a} merged={mergedKeepers.has(a.id)}
        open={openId === a.id} onToggleOpen={() => setOpenId((cur) => (cur === a.id ? null : a.id))}
        onPatch={(p) => { patch(a.id, p); touch(a.id); }} onDelete={() => remove(a.id)}
        onReopenReason={(kind) => reopenReason(a.id, kind)}
        out={a.deleted} onUndo={() => restoreAgent(a.id)} added={touched.has(a.id)}
      />
    ));
  };
  const originOf = (q: ReviewQuery): string => queryOriginLine(agents.find((x) => x.id === q.agentRef && !x.deleted));
  /* A query is left out in place when the writer chose it, or when its agent was left out on the
     agents step (its Undo brings the agent back, with its queries). */
  const outQuery = (q: ReviewQuery) => q.removed && (q.removedReason === "Removed by you"
    || (q.removedReason === "Agent removed" && agents.some((a) => a.id === q.agentRef && outAgent(a))));
  const listQueries = queries.filter((q) => (q.removed ? outQuery(q) : !q.reasons.some((r) => !r.resolved)));
  const readyQueries = listQueries.filter((q) => !q.removed);
  const queryRows = (): React.ReactNode[] => listQueries.map((q) => (
    <QueryRow key={q.id} query={q} agentName={agentNameOf(q.agentRef)} origin={originOf(q)}
      open={openId === q.id}
      onToggleOpen={() => setOpenId((cur) => (cur === q.id ? null : q.id))}
      onPatch={(p) => { patchQuery(q.id, p); touch(q.id); }}
      onDelete={() => removeQuery(q.id)}
      onReopen={() => reopenQueryReasons(q.id)}
      out={q.removed} onUndo={() => (q.removedReason === "Removed by you" ? restoreQuery(q.id) : restoreAgent(q.agentRef))}
      added={touched.has(q.id)}
    />
  ));

  // ── The deck's cards ──────────────────────────────────────────────────────────────────────────
  /* The cards are kept in the order their questions first appeared, and an answered one stays, so
     the arrows can go back to it. What each was first asked is remembered for its answered state. */
  const agentDeck = useRef<{ id: string; ask: AgentAsk }[]>([]);
  for (const a of agents) { const ask = agentAsk(a); if (ask && !agentDeck.current.some((d) => d.id === a.id)) agentDeck.current.push({ id: a.id, ask }); }
  const queryDeck = useRef<string[]>([]);
  for (const q of qActive) if (q.reasons.some((r) => !r.resolved) && !queryDeck.current.includes(q.id)) queryDeck.current.push(q.id);

  const agentCards = (): DeckCard[] => agentDeck.current.flatMap((d): DeckCard[] => {
    const a = agents.find((x) => x.id === d.id);
    if (!a) return [];
    const ask = agentAsk(a);
    const shown = ask ?? d.ask;
    const who = a.name || a.agency;
    const base = {
      key: `a-${a.id}`, name: who || "Unnamed row", initials: a.name ? initialsOf(a.name) : a.agency ? (a.agency.match(/\b\w/g)?.slice(0, 2).join("").toUpperCase() ?? "–") : "–",
      tone: (a.name ? "live" : "agency") as "live" | "agency", chip: ask ? AGENT_ASK_CHIP[shown] : "Answered", answered: ask === null,
      sub: shown === "nameless" && !who ? (a.setAsideContext || queries.find((q) => q.agentRef === a.id && q.notes.trim())?.notes.trim() ? `Your note: "${a.setAsideContext || queries.find((q) => q.agentRef === a.id && q.notes.trim())?.notes.trim()}"` : "No name or agency in your sheet")
        : !a.agency.trim() ? (a.agencyWaived ? "No agency" : "No agency in your sheet") : a.name ? a.agency : "Agent name not recorded",
    };
    if (ask === "nameless") return [{ ...base, body: (
      <NamelessQuestion
        onSave={({ name, agency }) => patch(a.id, { name, agency, agencyOnly: !name && !!agency })}
        onRemove={() => { const next = seedUnidentifiedSetAside(agents, queries, a.id); setAgents(next.agents); setQueries(next.queries); }}
      />) }];
    if (ask === "no-agency") return [{ ...base, body: <AgencyQuestion agent={a} onSave={(agency) => patch(a.id, { agency })} onCarryOn={() => patch(a.id, { agencyWaived: true })} /> }];
    if (ask === "mapping") return [{ ...base, body: <MappingQuestion note={a.reasons.find((r) => r.kind === "mapping" && !r.resolved)!.note} onChecked={() => resolveMapping(a.id)} /> }];
    /* answered: what was said, and the way to change it */
    if (a.deleted) return [{ ...base, name: "Unnamed row", body: <Answered reason="agent-nameless" onChange={() => restoreAgent(a.id)}>Row removed. It will be listed as not imported.</Answered> }];
    if (d.ask === "nameless") return [{ ...base, body: <Answered reason="agent-nameless" onChange={() => patch(a.id, { name: "", agency: "", agencyOnly: false })}>Saved as {who}.</Answered> }];
    if (d.ask === "no-agency") return [{ ...base, body: a.agency.trim()
      ? <Answered reason="agent-needs-agency" onChange={() => patch(a.id, { agency: "", agencyWaived: false })}>Agency saved: {a.agency}.</Answered>
      : <Answered reason="agent-needs-agency" onChange={() => patch(a.id, { agencyWaived: false })}>{DECK_WORDS.agencyKept}</Answered> }];
    return [{ ...base, body: <Answered reason="agent-mapping" onChange={() => reopenReason(a.id, "mapping")}>Marked as checked.</Answered> }];
  });

  const queryCards = (): DeckCard[] => queryDeck.current.flatMap((id): DeckCard[] => {
    const q = queries.find((x) => x.id === id);
    if (!q || q.removed) return [];
    const open = q.reasons.find((r) => !r.resolved);
    const code = (open ?? q.reasons[q.reasons.length - 1]).code;
    const name = agentNameOf(q.agentRef);
    const statusAsk = questionFamily(code) === "status";
    const base = {
      key: `q-${q.id}`, name, initials: initialsOf(name), answered: !open,
      /* a date question shows the status it has; a status question shows the date it has */
      sub: `${originOf(q)} · ${statusAsk ? (q.sentDate ? fmtDate(q.sentDate) : "Undated") : STAGE_NAME[q.status]}`,
      chip: open ? focusReasonMeta(code).pill : "Answered",
    };
    if (open) return [{ ...base, body: (
      <QueryQuestion key={code} query={q} code={code} onPatch={(p) => patchQuery(q.id, p)}
        onResolveReason={(c, p) => resolveQueryReason(q.id, c, p)} onSwapDates={() => swapQueryDates(q.id)} />) }];
    return [{ ...base, body: <Answered reason={code} onChange={() => reopenQueryReasons(q.id)}>{STAGE_NAME[q.status]}, {q.sentDate ? `sent ${fmtDate(q.sentDate)}` : "kept undated"}.</Answered> }];
  });

  // ── The frame of a step ───────────────────────────────────────────────────────────────────────
  const steps = importSteps(hadDuplicates);
  /* On a phone (set-up on phones v1, 2B) the band carries the review's progress: "Review: agents",
     with the review's own steps as its segments. The four-dot stepper is hidden there. */
  const isMobile = useIsMobile();
  const footHost = useSetupFootHost();
  const appSegs = isMobile && !footHost;
  const BAND_NAME: Record<string, string> = { duplicates: "repeats", agents: "agents", queries: "queries" };
  useSetupBand(isMobile ? {
    name: `Review: ${BAND_NAME[screen] ?? screen}`,
    steps: steps.map((id) => ({ id, label: id })),
    index: Math.max(0, steps.indexOf(screen)),
  } : null);
  const title = (manuscriptTitle ?? "").trim();
  /* v9: when the last answer lands on the queries step, the sage band says so and accounts for
     every answer given. Only a step that asked something can be "all answered". */
  const asked = qActive.filter((q) => q.reasons.length > 0);
  const queriesDone = screen === "queries" && asked.length > 0 && qNeed === 0;
  const doneKinds = asked.flatMap((q) => q.reasons.map((r) => answerKind(r.code, q)));

  const head =
    dupesDone ? null : screen === "duplicates" ? (
      <header className="im-ohead im-ohead--sm">
        <h1 className="im-h1" data-im="title">{duplicatesTitle(openSets)}</h1>
        <p>{DUPLICATES_SUB}</p>
      </header>
    ) : screen === "agents" ? (
      isMobile ? (
      /* One line in the typewriter face and one sentence beneath (2B; DOCS.headB), from the review's
         own numbers and words. */
      <header className="im-ohead im-ohead--sm im-phead">
        <h1 className="im-h1" data-im="title"><span data-im="title-n">{active.length}</span> agents for your contact list.</h1>
        <p data-im="title-sub">{reviewSubline(agentOpen, readyAgents.length, "agents")}</p>
      </header>
    ) : (
      <header className="im-ohead im-ohead--sm">
        <h1 className="im-stack" data-im="title">
          <span className="im-num" data-im="title-n">{active.length}</span>
          <span className="im-words">agents for your contact list</span>
          <span className="im-sub" data-im="title-sub">{reviewSubline(agentOpen, readyAgents.length, "agents")}</span>
        </h1>
      </header>
    )
    ) : isMobile ? (
      <header className="im-ohead im-ohead--sm im-phead">
        <h1 className="im-h1" data-im="title"><span data-im="title-n">{qActive.length}</span> {title ? <>queries for <i>{title}</i>.</> : "queries for your Query Centre."}</h1>
        {(qNeed > 0 || queriesDone) && <p data-im="title-sub">{reviewSubline(qNeed, readyQueries.length, "queries")}</p>}
      </header>
    ) : (
      <header className="im-ohead im-ohead--sm">
        <h1 className="im-stack" data-im="title">
          <span className="im-num" data-im="title-n">{qActive.length}</span>
          <span className="im-words">{title ? <>queries for <i>{title}</i></> : "queries for your Query Centre"}</span>
          {(qNeed > 0 || queriesDone) && <span className="im-sub" data-im="title-sub">{reviewSubline(qNeed, readyQueries.length, "queries")}</span>}
        </h1>
      </header>
    );

  const isDup = screen === "duplicates";
  const listTitle = isDup ? "Possible repeats" : READY_LIST.head;
  const [showAll, setShowAll] = useState(false);
  const allRows = isDup ? duplicateUnits() : screen === "agents" ? agentRows() : queryRows();
  /* Repeats on a phone (5B): one set per screen, paged by the pinned "Next set". */
  const dupPaged = isMobile && isDup;
  const dupI = Math.min(dupAt, Math.max(0, allRows.length - 1));
  const dupKey = String((allRows[dupI] as React.ReactElement | undefined)?.key ?? "");
  const dupLeader = dupKey.replace(/^[a-z]+-/, "");
  const dupOpenNow = dupKey.startsWith("open-") || (dupKey.startsWith("recon-") && !reconciled[dupLeader]);
  const dupApplyNow = dupApply.current[dupLeader] ?? null;
  const dupNext = () => {
    if (dupApplyNow) dupApplyNow();
    if (dupI < allRows.length - 1) setDupAt(dupI + 1);
  };
  const showDupNext = dupPaged && (dupOpenNow || dupI < allRows.length - 1);
  const rows = dupPaged ? allRows.slice(dupI, dupI + 1) : isDup || showAll ? allRows : allRows.slice(0, READY_FIRST);
  const outCount = screen === "agents" ? listAgents.length - readyAgents.length : screen === "queries" ? listQueries.length - readyQueries.length : 0;
  const liveCount = screen === "agents" ? readyAgents.length : readyQueries.length;
  const chips = isDup
    ? <Chip hot={openSets > 0} data-im="chip-sets">{openSets === 1 ? "1 set" : `${openSets} sets`}</Chip>
    : <>
        {outCount > 0 && <span className="im-outcount" data-im="out-count">{outCount} not importing</span>}
        <Chip className="im-chip--ready" data-im="ready-chip">{liveCount} ready</Chip>
      </>;
  const emptyLine = isDup ? "No duplicates to review." : screen === "agents" ? "No agents are ready yet." : "No queries are ready yet.";
  const faqs = isDup ? DUP_FAQS : screen === "agents" ? AGENT_FAQS : QUERY_FAQS;
  const back = isDup ? onBack : screen === "agents" ? () => (hadDuplicates ? switchScreen("duplicates") : onBack?.()) : () => switchScreen("agents");
  /* the deck, and what is left after the card on show */
  const cards = isDup ? [] : screen === "agents" ? agentCards() : queryCards();
  const openCount = isDup ? 0 : screen === "agents" ? agentOpen : qNeed;
  const restAgents = openAgentQuestions(active).slice(1);
  const restQueries = openQueryQuestions(qActive).slice(1);
  const coming = screen === "agents" ? comingUpAgents(restAgents, (id) => { const a = agents.find((x) => x.id === id); return a ? a.name || a.agency : ""; }) : screen === "queries" ? comingUpQueries(restQueries) : [];
  const [dupFaq, setDupFaq] = useState(false);
  const hint = isDup ? (openSets > 0 ? DUPES_DONE.open : duplicatesNextHint(agentOpen))
    : openCount > 0 ? gateHint(screen as "agents" | "queries", openCount)
    : screen === "queries" ? writeHint(active.length, qActive.length) : "";

  return (
    <div className="im-page" data-im="review" data-screen={`review-${screen}`} data-step={screen} key={screen}>
      {appSegs && (
        /* In the app's /import on a phone there is no set-up band: the review's own steps sit at the
           top of the sheet instead (set-up on phones v1). */
        <div className="im-appsegs" data-im="app-segs">
          <small>Review: {BAND_NAME[screen] ?? screen} · step {Math.max(0, steps.indexOf(screen)) + 1} of {steps.length}</small>
          <div aria-hidden="true">{steps.map((id, k) => <i key={id} className={k <= steps.indexOf(screen) ? "on" : undefined} />)}</div>
        </div>
      )}
      {head}
      <Stepper steps={steps} current={screen} label="Review progress" />
      {dupesDone && (
        <div className="o9-markrow" data-im="dupes-done">
          <GoMark />
          <div className="o9-mtxt">
            <h1 className="im-h1 o9-mhead" data-im="title">{DUPES_DONE.head}</h1>
            <span data-im="dupes-line">{duplicatesDoneLine({ merged: decided().filter((d) => d.merged).length, kept: decided().filter((d) => !d.merged).length, forward: active.length })}</span>
          </div>
        </div>
      )}
      {error && <p className="im-commiterr" role="alert" data-im="commit-error">{error}</p>}
      {!isDup && openCount > 0 && <ReviewDeck cards={cards} faq={<Questions items={faqs} open={openFaqs} onToggle={toggleFaq} />} />}
      {!isDup && openCount > 0 && coming.length > 0 && (
        <p className="o9-upnext o9-rise" data-im="coming-up"><span>{READY_LIST.lead}</span>{coming.map((c) => <Chip key={c}>{c}</Chip>)}</p>
      )}
      {queriesDone && (
        <div className="o9-alldone o9-pop" data-im="all-answered">
          <GoMark size="sm" />
          <div>
            <b data-im="all-head">{allAnsweredHead(asked.length)}</b>
            <span data-im="all-line">{answeredLine(doneKinds)}</span>
          </div>
        </div>
      )}
      <div className="im-revmain">
        {dupesDone ? (
          <section className="im-list o9-decided o9-rise" data-im="decided" aria-label={DUPES_DONE.list}>
            <div className="im-listhead im-listhead--quiet">
              <h2 className="im-listtitle">{DUPES_DONE.list}</h2>
              <button type="button" className="sf-link sf-link--quiet" onClick={() => setDupEditing(true)} data-im="change-decision">{DUPES_DONE.change}</button>
            </div>
            {decided().map((d) => (
              <div className="im-rw" key={d.id} data-decided={d.id}>
                <Disc initials={d.initials} />
                <div><b className="im-rwname">{d.name}</b><small className="im-rwsub">{d.sub}</small></div>
                <div className="im-rwend"><Chip className={d.merged ? "o9-chip--go" : undefined} data-im="decided-chip">{d.chip}</Chip></div>
              </div>
            ))}
          </section>
        ) : (
          <section className={`im-list${isDup ? "" : " o9-ready o9-rise"}`} data-im={isDup ? "list" : "ready"} aria-label={listTitle}>
            {dupPaged && allRows.length > 0 && <span className="im-setchip" data-im="dup-chip">Set {dupI + 1} of {allRows.length}</span>}
            <div className={`im-listhead${isDup ? "" : " im-listhead--ready"}`} data-im="list-head">
              {!isDup && (
                <span className="im-readymark" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                </span>
              )}
              <h2 className="im-listtitle">{listTitle}</h2>
              <span className="im-chips">
                {chips}
                {isDup && <button type="button" className="sf-link o9-decklink" aria-expanded={dupFaq} onClick={() => setDupFaq((o) => !o)} data-im="deck-questions">Questions</button>}
              </span>
            </div>
            {isDup && dupFaq && <div className="o9-deckfaq" data-im="deck-faq"><Questions items={faqs} open={openFaqs} onToggle={toggleFaq} /></div>}
            <div data-im="rows">
              {rows.length > 0 ? rows : <div className="im-listempty">{emptyLine}</div>}
            </div>
            {!isDup && !showAll && allRows.length > READY_FIRST && (
              <div className="o9-showall"><button type="button" className="sf-link sf-link--quiet" onClick={() => setShowAll(true)} data-im="show-all">{READY_LIST.showAll(allRows.length)}</button></div>
            )}
          </section>
        )}
        <div className="o9-bar" data-im="foot">
          <p className="o9-barhint" data-im="hint">{hint}</p>
          <PhonePin>
          <div className="o9-bargo">
            <button type="button" className="sf-link" onClick={() => back?.()} data-im="back">‹ Back</button>
            {onCancel && <button type="button" className="sf-link sf-link--quiet" onClick={onCancel} data-im="cancel">Cancel</button>}
            {showDupNext && (
              <button type="button" className="sf-btn" onClick={dupNext} disabled={dupOpenNow && !dupApplyNow} data-im="dup-next">Next set</button>
            )}
            {isDup && !showDupNext && (
              /* v9: lit only once every set is decided. It was always available, and an undecided
                 set carried through to the agents step. */
              <button type="button" className="sf-btn" onClick={() => switchScreen("agents")} disabled={openSets > 0} data-im="primary">{REVIEW_PRIMARY.duplicates}</button>
            )}
            {screen === "agents" && (
              <button type="button" className="sf-btn" onClick={onContinueClick} disabled={active.length === 0 || agentOpen > 0} data-im="primary">{gatePrimary("agents", agentOpen)}</button>
            )}
            {screen === "queries" && (
              /* Commit seam: onImport(modelToResult(...)) → the host's loader. */
              <button type="button" className="sf-btn" onClick={onImportClick} disabled={!canImport} data-im="primary">{gatePrimary("queries", qNeed)}</button>
            )}
          </div>
          </PhonePin>
        </div>
      </div>
      {toast && <UndoToast msg={toast.msg} onUndo={toast.undo} onClose={dismissToast} />}
    </div>
  );
};
