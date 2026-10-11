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
 * ⚠️ EVERY QUESTION IS ANSWERED IN ITS OWN ROW. The one-at-a-time guided walk (`FocusOverlay`), the
 * intro beats before it (`CoachmarkIntro`), the "Add details" tip (`SpotlightCoachmark`) and the
 * margin notes are retired: entering a step opens nothing over the list, and answering a row moves
 * the reader nowhere. The guide card says how the step works.
 *
 * ⚠️ NOTHING BLOCKS. Every proceed control on every step is live, as it always was — including
 * "Review all agents" with duplicate sets still open, which carry through to the agents step.
 */
import React, { useState, useRef, useMemo, useCallback } from "react";
import { queryOriginLine } from "../../lib/importLabels";
import "./importFlow.css";
import { SmartImportResult, ReviewReasonCode } from "../../types/smartImport";
import { QueryStatus } from "../../types";
import { agentPrimary, AGENT_NOT_SPECIFIED } from "../../lib/agentDisplay";
import {
  ReviewAgent, ReviewQuery, CheckReason,
  agentStatus, resolveReason, queryStatusOf, fmtDate,
  dupNoteOpen, dupNoteKept, parseModel, modelToResult, autoSetAsideRows, applyAgentRemoval, seedUnidentifiedSetAside,
  removeDuplicateRecord, buildClusters, mergedAwayByKeeper,
  rowsIdentical, derivedCurrentStatus, applyDuplicateCollapse,
} from "../../lib/smartImportReviewModel";
import { importSteps } from "../../lib/importSummary";
import { ReconcileCard, ReconcileCardRow } from "./ReconcileCard";
import { Chip, Stepper } from "./ImportParts";
import { AgentRow, QueryRow, DupeOpen, DupeKept, DupeMerged } from "./reviewRows";

// ── The words of the three steps ─────────────────────────────────────────────────────────────────
const NUM_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
/** "One agent looks like they came in twice." — words to twelve, then figures. */
export const duplicatesTitle = (openSets: number): string =>
  openSets === 0 ? "All duplicates sorted."
    : openSets === 1 ? "One agent looks like they came in twice."
    : `${openSets <= 12 ? NUM_WORDS[openSets] : openSets} agents look like they came in twice.`;
export const DUPLICATES_SUB = "Keep one row and its queries combine. Nothing is lost.";
export const REVIEW_PRIMARY = { duplicates: "Review all agents", agents: "Continue to queries" } as const;
/** The final primary: the build's own two sentences, without the arrow. */
export const importPrimary = (agents: number, openQueries: number): string =>
  openQueries > 0 ? `Import ${agents} agent${agents === 1 ? "" : "s"} · ${openQueries} to sharpen` : "Import and get started";

export const GUIDE: Record<"duplicates" | "agents" | "queries", { head: string; text: string }> = {
  duplicates: { head: "Same agent, twice?", text: "Remove the duplicate and its queries move onto the one you keep. Different people? Keep them both." },
  agents: { head: "Anything marked needs a quick look.", text: "It might be missing the agency's name. Check those, add any detail you can, then we'll move on to your queries." },
  queries: { head: "Dates drive your reminders.", text: "A sent date lets QueryHawk tell you when a nudge is due. Where we couldn't be sure, we've asked rather than guessed." },
};
export const GUIDE_EYEBROW = "How this step works";

export interface Faq { q: string; a: string }
/** The duplicates step's questions, verbatim. */
export const DUP_FAQS: Faq[] = [
  { q: "What's a duplicate?", a: "The same agent looks like it came in twice. Keep one (their queries combine) or keep both." },
  { q: "What if they're actually different people?", a: "Choose “keep both” and we'll leave them as two separate agents." },
  { q: "What happens when I merge?", a: "You keep one and its queries move onto it — nothing's lost." },
  { q: "Can I fix this later?", a: "Yes — you can come back to this step from the agents screen." },
];
/** The agents step's questions, verbatim. ⚠️ A NAME **OR** AN AGENCY IS ENOUGH — never assert that
 *  an agency is required; the row a few centimetres to the left offers "carry on without one". */
export const AGENT_FAQS: Faq[] = [
  { q: 'What does “needs a look” mean?', a: "We've flagged something worth a glance — a suspected duplicate, or a missing agency. Everything else is ready to import as-is." },
  { q: "Can I add more agents later?", a: "Any time, from your dashboard — by import or by hand." },
  { q: "What if I don't have the agent's name?", a: "Leave the name blank and we'll track them by agency only. Add it whenever you find out." },
  { q: "Is the agency name required?", a: "No — a name or an agency is enough. An agency sharpens the record and can be added at any time." },
  { q: "What happens when I delete a duplicate?", a: "We import just one of the two records and merge any queries from the duplicate onto that single agent — so nothing's lost." },
];
/** The queries step's questions, verbatim. */
export const QUERY_FAQS: Faq[] = [
  { q: 'What does “needs a look” mean?', a: "We've flagged a query where we spotted two dates, an odd-looking date, or a status we weren't sure how to read. Everything else is ready to import." },
  { q: "Can I add more queries later?", a: "Any time — log a new query from your dashboard whenever you send one." },
  { q: "What if I don't know the date I sent it?", a: "Leave it undated. We'll never guess a date for you — you can fill it in later if it turns up." },
  { q: "Can a query have no agent?", a: "No — every query is linked to an agent. Match it to one you already have, or add the agent as new." },
  { q: "What does the status mean?", a: "It's where the query sits in your pipeline — queried, partial, full, and so on. We read it from your file; correct any that look off." },
];

// ── The rail: the guide card, then the questions ────────────────────────────────────────────────
const Guide: React.FC<{ step: "duplicates" | "agents" | "queries" }> = ({ step }) => (
  <div className="im-guide" data-im="guide">
    <span className="im-eyebrow">{GUIDE_EYEBROW}</span>
    <h3 className="im-guideh">{GUIDE[step].head}</h3>
    <p>{GUIDE[step].text}</p>
  </div>
);
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

// ── Gentle undo: a brief toast for the instant "oops", and the set-aside tray ────────────────────
const UndoToast: React.FC<{ msg: string; onUndo: () => void; onClose: () => void }> = ({ msg, onUndo, onClose }) => (
  <div role="status" className="im-toast" data-im="toast">
    <span>{msg}</span>
    <button type="button" className="im-toastundo" onClick={onUndo} data-im="toast-undo">Undo</button>
    <button type="button" className="im-toastx" onClick={onClose} aria-label="Dismiss">×</button>
  </div>
);

interface SetAsideItem { kind: "agent" | "query"; id: string; name: string; sub: string; context?: string; unidentified?: boolean; }
const SetAsideTray: React.FC<{ items: SetAsideItem[]; onRestore: (kind: "agent" | "query", id: string) => void }> = ({ items, onRestore }) => {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <div className="im-tray" data-im="tray">
      <button type="button" className="im-trayhead" onClick={() => setOpen((o) => !o)} aria-expanded={open} data-im="tray-head">
        <span><b>{items.length}</b> set aside</span>
        <span className="im-trayend">{open ? "Hide ▲" : "Review ▼"}</span>
      </button>
      {open && items.map((it) => (
        <div className="im-trayrow" key={`${it.kind}-${it.id}`} data-tray-id={it.id}>
          <div>
            <div className="im-trayname">{it.name}</div>
            <div className="im-traysub">{it.sub}</div>
            {it.context && <div className="im-trayctx">Your note said “{it.context}” — no problem, set aside for now. Name them any time if a reply lands.</div>}
          </div>
          <button type="button" className="sf-btn sf-btn--sm sf-btn--line" onClick={() => onRestore(it.kind, it.id)} data-im="tray-restore">{it.unidentified ? "Name it instead" : "Restore"}</button>
        </div>
      ))}
    </div>
  );
};

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
  // Auto-set-aside the truly-unidentifiable (no name AND no agency) before review begins — they
  // wait in the tray with a "Name it instead" escape.
  const seeded = useMemo(() => seedUnidentifiedSetAside(initial.agents, initial.queries), [initial]);
  const [agents, setAgents] = useState<ReviewAgent[]>(seeded.agents);
  const [queries, setQueries] = useState<ReviewQuery[]>(seeded.queries);
  // Open on the duplicates step only when the import actually has clusters (never empty).
  // `hadDuplicates` is fixed for the session: it keeps the step reachable again via Agents' Back even
  // after every cluster is resolved (so a mistaken merge can be undone).
  const hadDuplicates = useMemo(() => initial.agents.some((a) => a.mergeWith.length > 0 && !a.mergeResolved), [initial]);
  const [screen, setScreen] = useState<Step>(hadDuplicates ? "duplicates" : "agents");
  // Per-cluster pre-resolution snapshot (keyed by leader id) — restored verbatim on Undo, so a merge or
  // keep-both can be cleanly reversed (un-delete the removed agent, revert repointed queries).
  const snapRef = useRef<Record<string, { agents: ReviewAgent[]; queries: { id: string; agentRef: string }[] }>>({});
  // Reconcile: per-cluster query-collapse. A FULL snapshot (the cluster's agents + queries) so
  // "Change this" / reset can revert a collapse. `reconciled` drives the card's working↔sorted state,
  // keyed by the cluster leader id.
  const reconcileSnapRef = useRef<Record<string, { agents: ReviewAgent[]; queries: ReviewQuery[] }>>({});
  const [reconciled, setReconciled] = useState<Record<string, { keptId: string; kind: "collapsed" | "split" }>>({});
  // "Reset all changes" baseline. Starts as the pristine parse, but is RE-CAPTURED the moment the user
  // leaves the duplicates step — so resetting on the Agents step reverts only Agents-step edits and
  // keeps the merge / keep-both decisions intact.
  const baselineRef = useRef<{ agents: ReviewAgent[]; queries: ReviewQuery[] } | null>(null);
  if (baselineRef.current === null) baselineRef.current = { agents: JSON.parse(JSON.stringify(seeded.agents)), queries: JSON.parse(JSON.stringify(seeded.queries)) };
  // Separate Queries-step baseline: the queries as they stood on ENTERING the Queries step.
  const queriesBaselineRef = useRef<ReviewQuery[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
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

  // Ids of agents inside an unresolved duplicate cluster (both members count as needs-check).
  const openDupIds = useMemo(() => {
    const s = new Set<string>();
    for (const a of agents) {
      if (a.deleted || a.mergeResolved || a.mergeWith.length === 0) continue;
      s.add(a.id);
      a.mergeWith.forEach((id) => s.add(id));
    }
    return s;
  }, [agents]);
  const statusOf = useCallback((a: ReviewAgent) => agentStatus(a, openDupIds.has(a.id)), [openDupIds]);

  const okCount = active.filter((a) => statusOf(a) === "captured").length;
  const needCount = active.length - okCount;       // sharpen items (incl. missing agency) — advisory, never blocks

  const patch = (id: string, p: Partial<ReviewAgent>) => { setAgents((xs) => xs.map((a) => (a.id === id ? { ...a, ...p } : a))); };

  // Destructive row-level remove: removes the agent AND cascades its queries to "Not being imported".
  const remove = (id: string) => {
    const a = agents.find((x) => x.id === id);
    const qc = queryCount(id);
    const next = applyAgentRemoval(agents, queries, id);
    setAgents(next.agents.map((x) => (x.id === id ? { ...x, setAsideStage: "agents" as const } : x)));
    setQueries(next.queries);
    flashToast(`${(a?.name || a?.agency || "Agent")} set aside${qc > 0 ? ` (with ${qc} quer${qc === 1 ? "y" : "ies"})` : ""}`, () => restoreAgent(id));
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
    flashToast(`${label} set aside`, () => undoCluster(leader.id));
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
    // Leaving the duplicates step locks in its decisions: snapshot them as the new reset baseline.
    if (screen === "duplicates" && name === "agents") {
      baselineRef.current = { agents: JSON.parse(JSON.stringify(agents)), queries: JSON.parse(JSON.stringify(queries)) };
    }
    // Entering the Queries step: snapshot the queries (post agents-cascade) as the Queries reset point.
    if (name === "queries") {
      queriesBaselineRef.current = queries.map((q) => JSON.parse(JSON.stringify(q)) as ReviewQuery);
    }
    setScreen(name); setOpenId(null); setOpenFaqs(new Set());
    /* The sheet scrolls, not the window (and on a phone, where the frame is a document, the window). */
    requestAnimationFrame(() => {
      document.querySelector('[data-sf="scroll"]')?.scrollTo({ top: 0 });
      window.scrollTo({ top: 0 });
    });
  };

  // Continue is advisory: sharpen items never block — proceed whenever there's at least one agent.
  const onContinueClick = () => { if (active.length > 0) switchScreen("queries"); };

  // Reset scoped to the CURRENT step — never reaches across steps.
  //  • Duplicates: restore every duplicates-step decision to its original group via the per-cluster snapshots.
  //  • Queries: revert only the queries to their on-entry snapshot, leaving agents-step edits.
  //  • Agents: revert agents AND their query cascade to the post-duplicates baseline.
  const reset = () => {
    if (screen === "duplicates") {
      Object.keys(reconcileSnapRef.current).forEach((leaderId) => revertReconcile(leaderId)); // undo collapses/splits
      Object.keys(snapRef.current).forEach((leaderId) => undoCluster(leaderId)); // restores members + repointed queries
      setOpenId(null);
      return;
    }
    if (screen === "queries") {
      const qb = queriesBaselineRef.current;
      if (qb) setQueries(qb.map((q) => JSON.parse(JSON.stringify(q)) as ReviewQuery));
    } else {
      const b = baselineRef.current!;
      setAgents(b.agents.map((a) => JSON.parse(JSON.stringify(a)) as ReviewAgent));
      setQueries(b.queries.map((q) => JSON.parse(JSON.stringify(q)) as ReviewQuery));
    }
    setOpenId(null);
  };

  // ── Queries side ──────────────────────────────────────────────────────────────────────────────
  const qActive = queries.filter((q) => !q.removed);
  const agentNameOf = (ref: string) => { const a = agents.find((x) => x.id === ref); return (a ? agentPrimary(a) : "") || AGENT_NOT_SPECIFIED; };
  // Set-aside shelf contents: deleted agents + queries the user removed directly (queries removed by
  // an agent's cascade ride back with that agent's restore, so they're not listed twice).
  const setAsideItems: SetAsideItem[] = [
    // Duplicates-step merges are recovered on the duplicates step, not here.
    ...agents.filter((a) => a.deleted && a.setAsideStage !== "duplicates").map((a) => (
      a.setAsideStage === "unidentified"
        ? { kind: "agent" as const, id: a.id, name: "Couldn't tell who this was for", sub: "Set aside — name it any time", context: a.setAsideContext, unidentified: true }
        : { kind: "agent" as const, id: a.id, name: agentPrimary(a) || AGENT_NOT_SPECIFIED, sub: "Agent · set aside" }
    )),
    ...queries.filter((q) => q.removed && q.removedReason === "Removed by you").map((q) => ({ kind: "query" as const, id: q.id, name: agentNameOf(q.agentRef), sub: `Query · ${q.status}` })),
  ];
  const onRestoreSetAside = (kind: "agent" | "query", id: string) => (kind === "agent" ? restoreAgent(id) : restoreQuery(id));
  const qNeed = qActive.filter((q) => queryStatusOf(q) === "needs-check").length;
  const qReady = qActive.length - qNeed;
  // Advisory review: import is available whenever there's ≥1 query to bring across.
  const canImport = qActive.length > 0;

  const patchQuery = (id: string, p: Partial<ReviewQuery>) => { setQueries((xs) => xs.map((q) => (q.id === id ? { ...q, ...p } : q))); };
  const removeQuery = (id: string) => { setQueries((xs) => xs.map((q) => (q.id === id ? { ...q, removed: true, removedReason: "Removed by you" } : q))); flashToast("Query set aside", () => restoreQuery(id)); };
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
    if (!canImport) return; // nothing to import (no active queries)
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
  const agentRows = (): React.ReactNode[] => {
    const rows: React.ReactNode[] = [];
    const consumed = new Set<string>();
    /* An agent merged from two rows says so in its second line. */
    const mergedKeepers = new Set(mergedAwayByKeeper(agents).keys());
    for (const a of active) {
      if (consumed.has(a.id)) continue;
      const toggle = () => setOpenId((cur) => (cur === a.id ? null : a.id));
      if (a.mergeWith.length > 0 && !a.mergeResolved) {
        // A duplicate set carried through from its own step: the leader's row asks, in place.
        const members = [a, ...a.mergeWith.map((id) => active.find((x) => x.id === id)).filter((x): x is ReviewAgent => !!x)];
        members.forEach((m) => consumed.add(m.id));
        rows.push(
          <AgentRow key={a.id} agent={a} dupOpen={true} clusterPeers={members.slice(1)}
            open={openId === a.id} onToggleOpen={toggle}
            onPatch={(p) => patch(a.id, p)} onDelete={() => remove(a.id)}
            onMerge={() => members.slice(1).forEach((m) => removeDuplicate(m.id))}
            onKeepBoth={() => keepBoth(a.id)}
            onResolveReason={(kind) => { if (kind === "mapping") resolveMapping(a.id); }}
            onReopenReason={(kind) => reopenReason(a.id, kind)}
          />
        );
      } else {
        consumed.add(a.id);
        rows.push(
          <AgentRow key={a.id} agent={a} dupOpen={openDupIds.has(a.id)} merged={mergedKeepers.has(a.id)}
            open={openId === a.id} onToggleOpen={toggle}
            onPatch={(p) => patch(a.id, p)} onDelete={() => remove(a.id)}
            onResolveReason={(kind) => { if (kind === "mapping") resolveMapping(a.id); }}
            onReopenReason={(kind) => reopenReason(a.id, kind)}
          />
        );
      }
    }
    return rows;
  };
  const originOf = (q: ReviewQuery): string => queryOriginLine(agents.find((x) => x.id === q.agentRef && !x.deleted));
  const queryRows = (): React.ReactNode[] => qActive.map((q) => (
    <QueryRow key={q.id} query={q} agentName={agentNameOf(q.agentRef)} origin={originOf(q)}
      open={openId === q.id}
      onToggleOpen={() => setOpenId((cur) => (cur === q.id ? null : q.id))}
      onPatch={(p) => patchQuery(q.id, p)}
      onDelete={() => removeQuery(q.id)}
      onResolveReason={(code, patch) => resolveQueryReason(q.id, code, patch)}
      onSwapDates={() => swapQueryDates(q.id)}
      onReopen={() => reopenQueryReasons(q.id)}
    />
  ));

  // ── The frame of a step ───────────────────────────────────────────────────────────────────────
  const steps = importSteps(hadDuplicates);
  const title = (manuscriptTitle ?? "").trim();
  const head =
    screen === "duplicates" ? (
      <header className="im-ohead im-ohead--sm">
        <h1 className="im-h1" data-im="title">{duplicatesTitle(openSets)}</h1>
        <p>{DUPLICATES_SUB}</p>
      </header>
    ) : screen === "agents" ? (
      <header className="im-ohead im-ohead--sm">
        <h1 className="im-stack" data-im="title">
          <span className="im-num" data-im="title-n">{active.length}</span>
          <span className="im-words">agents for your contact list</span>
          <span className="im-sub">Add as much or as little detail as you like.</span>
        </h1>
      </header>
    ) : (
      <header className="im-ohead im-ohead--sm">
        <h1 className="im-stack" data-im="title">
          <span className="im-num" data-im="title-n">{qActive.length}</span>
          <span className="im-words">queries for your Query Centre</span>
          {title && <span className="im-sub">for <i>{title}</i></span>}
        </h1>
      </header>
    );

  const listTitle = screen === "duplicates" ? "Possible repeats" : screen === "agents" ? "Agents from your file" : "Queries from your file";
  const chips =
    screen === "duplicates" ? (
      <Chip hot={openSets > 0} data-im="chip-sets">{openSets === 1 ? "1 set" : `${openSets} sets`}</Chip>
    ) : (
      <>
        <Chip data-im="chip-ready">{screen === "agents" ? okCount : qReady} ready</Chip>
        {(screen === "agents" ? needCount : qNeed) > 0 && <Chip hot data-im="chip-open">{screen === "agents" ? needCount : qNeed} to sharpen</Chip>}
      </>
    );
  const rows = screen === "duplicates" ? duplicateUnits() : screen === "agents" ? agentRows() : queryRows();
  const emptyLine = screen === "duplicates" ? "No duplicates to review." : screen === "agents" ? "No agents to review." : "No queries to review.";
  const faqs = screen === "duplicates" ? DUP_FAQS : screen === "agents" ? AGENT_FAQS : QUERY_FAQS;
  const back = screen === "duplicates" ? onBack : screen === "agents" ? () => (hadDuplicates ? switchScreen("duplicates") : onBack?.()) : () => switchScreen("agents");
  const trayItems = screen === "agents" ? setAsideItems.filter((i) => i.kind === "agent") : screen === "queries" ? setAsideItems.filter((i) => i.kind === "query") : [];

  return (
    <div className="im-page" data-im="review" data-screen={`review-${screen}`} data-step={screen} key={screen}>
      {head}
      <Stepper steps={steps} current={screen} label="Review progress" />
      <div className="im-rev">
        <div className="im-revmain">
          {error && <p className="im-commiterr" role="alert" data-im="commit-error">{error}</p>}
          <section className="im-list" data-im="list" aria-label={listTitle}>
            <div className="im-listhead" data-im="list-head">
              <h2 className="im-listtitle">{listTitle}</h2>
              <span className="im-chips">{chips}</span>
            </div>
            <div data-im="rows">
              {rows.length > 0 ? rows : <div className="im-listempty">{emptyLine}</div>}
            </div>
          </section>
          <SetAsideTray items={trayItems} onRestore={onRestoreSetAside} />
          <div className="im-actbar" data-im="foot">
            <button type="button" className="sf-link" onClick={() => back?.()} data-im="back">‹ Back</button>
            {onCancel && <button type="button" className="sf-link sf-link--quiet" onClick={onCancel} data-im="cancel">Cancel</button>}
            <button type="button" className="sf-link sf-link--quiet" onClick={reset} data-im="reset">Reset all changes made here</button>
            <span className="im-sp" />
            {screen === "duplicates" && (
              /* always available — unresolved sets carry through to the agents step */
              <button type="button" className="sf-btn" onClick={() => switchScreen("agents")} data-im="primary">{REVIEW_PRIMARY.duplicates}</button>
            )}
            {screen === "agents" && (
              <button type="button" className="sf-btn" onClick={onContinueClick} disabled={active.length === 0} data-im="primary">{REVIEW_PRIMARY.agents}</button>
            )}
            {screen === "queries" && (
              /* Commit seam: onImport(modelToResult(...)) → the host's loader. */
              <button type="button" className="sf-btn" onClick={onImportClick} disabled={!canImport} data-im="primary">{importPrimary(active.length, qNeed)}</button>
            )}
          </div>
        </div>
        <aside className="im-rail" data-im="rail">
          <Guide step={screen} />
          <Questions items={faqs} open={openFaqs} onToggle={toggleFaq} />
        </aside>
      </div>
      {toast && <UndoToast msg={toast.msg} onUndo={toast.undo} onClose={dismissToast} />}
    </div>
  );
};
