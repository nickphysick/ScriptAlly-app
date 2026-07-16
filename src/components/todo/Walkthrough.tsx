/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Walkthrough — the staged one-at-a-time flow (Urgent / Work the list). Design principle (settled):
 * STAGE ONLY WHAT CAN BE UN-STAGED. mark-sent + nudge steps STAGE (nothing writes until Save, so
 * Back genuinely reverses them). Every other type (offer / housekeeping / UserTask) performs an
 * immediate side-effecting write, so it gets an "Open" step that launches the drawer (which writes
 * immediately with its undo toast) and never enters the staged set.
 *
 * ← Back un-stages the previous staged step. A review screen lists ONLY staged changes (each ✕-able),
 * then one "Save N". apply() writes per item with per-item error isolation (todoWalk.applyStaged) and
 * reports partial failures — never a silent partial success.
 */
import React, { useMemo, useState } from "react";
import { useScriptAllyDb } from "../../lib/db";
import { walkStepKind, applyStaged, StagedPayload } from "../../lib/todoWalk";
import { BoardCard } from "../../lib/todoBoard";
import { TaskCaptureForm } from "./TaskCaptureForm";
import { TaskDetail } from "./TaskDetail";
import { QueryStatus } from "../../types";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export interface WalkthroughProps {
  title: string;
  cards: BoardCard[];
  onClose: () => void;
  onNavigate: (tab: string, subPageName?: string, opts?: { agentId?: string; manuscriptId?: string }) => void;
  onToast: (msg: string) => void;
}

export const Walkthrough: React.FC<WalkthroughProps> = ({ title, cards, onClose, onNavigate, onToast }) => {
  const { queries, agents, recordMaterialsSent, logNudge } = useScriptAllyDb();
  const [index, setIndex] = useState(0);
  const [staged, setStaged] = useState<Record<string, StagedPayload>>({});
  const [phase, setPhase] = useState<"walk" | "review">("walk");
  const [openCard, setOpenCard] = useState<BoardCard | null>(null);
  const [saving, setSaving] = useState(false);

  const cardByKey = useMemo(() => Object.fromEntries(cards.map((c) => [c.key, c])), [cards]);
  const stagedList = Object.values(staged);

  function finishOrReview() {
    if (Object.keys(staged).length > 0) setPhase("review");
    else onClose();
  }
  function goNext() {
    if (index >= cards.length - 1) finishOrReview();
    else setIndex((i) => i + 1);
  }
  function goPrev() {
    if (index === 0) return;
    const prev = cards[index - 1];
    if (prev && staged[prev.key]) setStaged((s) => { const n = { ...s }; delete n[prev.key]; return n; }); // un-stage the previous
    setIndex((i) => i - 1);
  }
  function stageAndNext(p: StagedPayload) {
    setStaged((s) => ({ ...s, [p.cardKey]: p }));
    goNext();
  }
  function requestClose() {
    if (Object.keys(staged).length > 0 && !window.confirm("Discard the staged changes and close?")) return;
    onClose();
  }
  async function save() {
    if (saving) return;
    setSaving(true);
    const res = await applyStaged(stagedList, {
      markSent: (p) => recordMaterialsSent({ queryId: p.queryId, targetStatus: p.targetStatus as QueryStatus.PARTIAL_SENT | QueryStatus.FULL_SENT, sentDate: p.sentDate, isResubmit: p.isResubmit }),
      nudge: (p) => logNudge(p.queryId, { checkBackDate: p.checkBackDate, note: p.note }).then((r) => { if (!r.success) throw new Error(r.error || "nudge failed"); }),
    });
    setSaving(false);
    if (res.failed.length) onToast(`Saved ${res.ok.length}; ${res.failed.length} failed — check those items.`);
    else onToast(`Saved ${res.ok.length} change${res.ok.length === 1 ? "" : "s"}.`);
    onClose();
  }

  // An Open step launches the real drawer for that one item; the walkthrough advances when it closes.
  if (openCard) {
    return <TaskDetail card={openCard} onClose={() => { setOpenCard(null); goNext(); }} onNavigate={onNavigate} />;
  }

  if (phase === "review") {
    return (
      <div className="tdb-scrim" onClick={requestClose}>
        <div className="tdb-walk" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
          <div className="tdb-walk-h"><span className="tdb-walk-title">Review — {stagedList.length} to save</span><button type="button" className="tdb-drawer-x" onClick={requestClose} aria-label="Close">✕</button></div>
          <div className="tdb-walk-body">
            {stagedList.length === 0 ? <p className="tdb-why">Nothing staged.</p> : stagedList.map((p) => (
              <div key={p.cardKey} className="tdb-review-row">
                <div className="tdb-review-mid">
                  <div className="tdb-review-t">{cardByKey[p.cardKey]?.title ?? p.cardKey}</div>
                  <div className="tdb-review-m">{p.kind === "mark-sent" ? `Mark sent · ${fmtDate(p.sentDate)}` : `Nudge · check back ${fmtDate(p.checkBackDate)}`}</div>
                </div>
                <button type="button" className="tdb-review-x" title="Remove" onClick={() => setStaged((s) => { const n = { ...s }; delete n[p.cardKey]; return n; })}>✕</button>
              </div>
            ))}
          </div>
          <div className="tdb-walk-f">
            <button type="button" className="tdb-btn-sec" onClick={() => setPhase("walk")}>← Back</button>
            <span className="tdb-sp" />
            <button type="button" className="tdb-btn-pri" disabled={saving || stagedList.length === 0} onClick={save}>Save {stagedList.length} change{stagedList.length === 1 ? "" : "s"}</button>
          </div>
        </div>
      </div>
    );
  }

  const card = cards[index];
  if (!card) { onClose(); return null; }
  const query = card.relatedRecordId ? queries.find((q) => q.id === card.relatedRecordId) : undefined;
  const agent = query ? agents.find((a) => a.id === query.agentId) : card.relatedRecordId ? agents.find((a) => a.id === card.relatedRecordId) : undefined;
  const kind = walkStepKind(card);

  return (
    <div className="tdb-scrim" onClick={requestClose}>
      <div className="tdb-walk" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="tdb-walk-h">
          <span className="tdb-walk-title">{title}</span>
          <span className="tdb-walk-count">{index + 1} of {cards.length}</span>
          <button type="button" className="tdb-drawer-x" onClick={requestClose} aria-label="Close">✕</button>
        </div>
        <div className="tdb-walk-body">
          <div className="tdb-walk-cardtitle">{card.title}</div>
          {card.subtitle && <div className="tdb-walk-cardsub">{card.subtitle}</div>}

          {(kind === "mark-sent" || kind === "nudge") && query ? (
            <TaskCaptureForm card={card} query={query} agent={agent} mode="stage" onStage={stageAndNext} onBack={index > 0 ? goPrev : undefined} />
          ) : (
            <>
              <p className="tdb-why">This one writes straight away — open it to handle it, then we’ll carry on.</p>
              <div className="tdb-drawer-cmd">
                {index > 0 && <button type="button" className="tdb-btn-sec" onClick={goPrev}>← Back</button>}
                <button type="button" className="tdb-btn-sec" onClick={goNext}>Skip →</button>
                <span className="tdb-sp" />
                <button type="button" className="tdb-btn-pri" onClick={() => setOpenCard(card)}>Open →</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Walkthrough;
