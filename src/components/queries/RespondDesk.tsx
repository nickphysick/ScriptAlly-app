/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RespondDesk — Record response inside the desk (respond-nudge run, §2).
 *
 * ⚠️ A COMPACT RENDERING OVER THE EXISTING MODEL, NEVER A SECOND ONE. The draft is the record
 * journey's own `ResponseDraft`; the outcome→status map is `OUTCOME_STATUS`; the save is
 * `recordQueryResponse` through the page. This file owns an arrangement — six kind cards, then
 * the details with the choice collapsed to a row — and no vocabulary of its own.
 *
 * ⚠️ OFFER ROUTES OUT. "Offered representation" opens the existing offer journey (the record
 *   takeover §4 deliberately kept): an offer carries terms and a reply-by that this compact
 *   surface does not collect, and collecting them here would be the second-editor drift.
 *
 * ⚠️ THE DERIVED LINE SPEAKS `OUTCOME_STATUS`'S OWN WORD — the same member the save writes, so
 *   the sentence and the record cannot disagree (asserted against the derivation, not a string).
 */
import React from "react";
import "./respondDesk.css";
import { StatusDot } from "../StatusDot";
import { BrandDatePicker } from "../forms/BrandDatePicker";
import { useFixedMenu } from "../forms/useFixedMenu";
import { createPortal } from "react-dom";
import { CREATE_QTY, formatQty, parseQty, stepLabel, stepQty } from "../../lib/createQty";
import { SAMPLE_UNITS, snapToUnit, type SampleUnit } from "../../lib/agentMaterials";
import { OUTCOME_STATUS, type DecidingOutcome, type ResponseDraft } from "../../lib/responseDraft";
import { todayInputDate } from "../../lib/queryDraft";
import { QueryStatus } from "../../types";

/** The desk's six choices — each carrying the `StatusDot` it will earn. */
const KINDS: readonly { key: DecidingOutcome; title: string; sub: string }[] = [
  { key: "partial", title: "Asked for a partial", sub: "Pages or chapters — you'll say how many" },
  { key: "full", title: "Asked for the full", sub: "The whole manuscript" },
  { key: "rr", title: "Asked for revisions", sub: "Revise and resubmit" },
  { key: "offer", title: "Offered representation", sub: "The call" },
  { key: "rejected", title: "Passed", sub: "A no, with or without a reason" },
  { key: "noreply", title: "Closed it yourself", sub: "Withdrawn, or gone quiet for good" },
];

export interface RespondDeskProps {
  agentName: string;
  agency: string;
  manuscriptTitle: string;
  draft: ResponseDraft;
  onDraft: (d: ResponseDraft) => void;
  /** the partial's quantity control — page-held so the ghost and the payload read one state */
  qty: { amount: string; unit: SampleUnit };
  onQty: (q: { amount: string; unit: SampleUnit }) => void;
  /** noreply's close reason — page-held; the payload overlay reads the same state */
  closeReason: "noresponse" | "withdrew";
  onCloseReason: (r: "noresponse" | "withdrew") => void;
  /** the derived consequence, built by the PAGE from the proposed activity — plain words */
  derivedLine: React.ReactNode;
  saving?: boolean;
  onRecord: () => void;
  onCancel: () => void;
  /** "Offered representation" → the existing offer journey */
  onOffer: () => void;
}

const pop = (style: React.CSSProperties, ref: React.RefObject<HTMLElement>, label: string, children: React.ReactNode) =>
  createPortal(
    <div className="t-f12 qc-neutral qrd-pop" ref={ref as React.RefObject<HTMLDivElement>} style={style} role="dialog" aria-label={label}>{children}</div>,
    document.body,
  );

export const RespondDesk: React.FC<RespondDeskProps> = ({
  agentName, agency, manuscriptTitle, draft, onDraft, qty, onQty, closeReason, onCloseReason,
  derivedLine, saving, onRecord, onCancel, onOffer,
}) => {
  const [dateOpen, setDateOpen] = React.useState(false);
  const datePanelRef = React.useRef<HTMLElement>(null);
  const { triggerRef: dateRef, menuStyle: dateStyle } = useFixedMenu<HTMLElement>(
    dateOpen, { placement: "auto", align: "left", constrain: true, menuRef: datePanelRef },
  );
  const [qtyFocused, setQtyFocused] = React.useState(false);

  const kind = draft.outcome as DecidingOutcome | null;

  if (!kind) {
    return (
      <div className="qrd">
        <h3>What happened?</h3>
        <div className="qrd-subj">{agentName} · {agency} · {manuscriptTitle}</div>
        <div className="qrd-kinds">
          {KINDS.map((k) => (
            <button
              key={k.key}
              type="button"
              className="qrd-kind"
              onClick={() => (k.key === "offer" ? onOffer() : onDraft({ ...draft, outcome: k.key }))}
            >
              <span className="qrd-kn" aria-hidden="true">
                <StatusDot status={OUTCOME_STATUS[k.key]} overrideSize={18} decorative />
              </span>
              <span className="qrd-ktx">
                <u>{k.title}</u>
                <s>{k.sub}</s>
              </span>
            </button>
          ))}
        </div>
        <button type="button" className="qrd-cancel" onClick={onCancel}>Cancel</button>
      </div>
    );
  }

  const meta = KINDS.find((k) => k.key === kind)!;
  return (
    <div className="qrd">
      <h3>{meta.title}</h3>
      <div className="qrd-subj">{agentName} · {agency}</div>
      {/* the choice, collapsed to one line — "change" reopens the question */}
      <div className="qrd-step">
        <b>What happened</b> {meta.title}
        <button type="button" className="qrd-chg" onClick={() => onDraft({ ...draft, outcome: null })}>change</button>
      </div>

      <div className="qrd-row">
        <div>
          <label className="qrd-l">When</label>
          <button type="button" className="qrd-fld" ref={dateRef as React.RefObject<HTMLButtonElement>} onClick={() => setDateOpen((o) => !o)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c3a2a" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>
            {new Date(`${draft.dateArrived}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            {draft.dateArrived === todayInputDate() && <span className="qrd-sub">today</span>}
          </button>
          {dateOpen && pop(dateStyle, datePanelRef, "When it arrived", (
            /* a reply cannot arrive tomorrow — the timeline records what happened */
            <BrandDatePicker value={draft.dateArrived} max={todayInputDate()}
              onChange={(iso) => { onDraft({ ...draft, dateArrived: iso }); setDateOpen(false); }} />
          ))}
        </div>
        <div>
          <label className="qrd-l">Their words <span className="qrd-opt">— kept with the rung</span></label>
          <input className="qrd-fld" value={draft.theirWords} placeholder="A line worth keeping…"
            aria-label="Their words" onChange={(e) => onDraft({ ...draft, theirWords: e.target.value })} />
        </div>
      </div>

      {kind === "partial" && (
        <>
          <label className="qrd-l">How much did they ask for</label>
          <div className="qrd-qc">
            <span className="qrd-stepc">
              <button type="button" aria-label="Less" onClick={() => onQty({ ...qty, amount: String(stepQty(qty.amount, qty.unit, -1)) })}>−</button>
              <input value={qtyFocused ? qty.amount : formatQty(qty.amount)} inputMode="numeric" aria-label={`Amount in ${qty.unit.toLowerCase()}`}
                onFocus={() => setQtyFocused(true)} onBlur={() => setQtyFocused(false)}
                onChange={(e) => onQty({ ...qty, amount: String(parseQty(e.target.value)) })}
                onKeyDown={(e) => {
                  if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
                  e.preventDefault();
                  onQty({ ...qty, amount: String(stepQty(qty.amount, qty.unit, e.key === "ArrowUp" ? 1 : -1)) });
                }} />
              <button type="button" aria-label="More" onClick={() => onQty({ ...qty, amount: String(stepQty(qty.amount, qty.unit, 1)) })}>+</button>
              <span className="qrd-pm">{stepLabel(qty.unit)}</span>
            </span>
            <span className="qrd-useg">
              {SAMPLE_UNITS.map((u) => (
                <button key={u} type="button" className={qty.unit === u ? "on" : undefined}
                  onClick={() => onQty({ unit: u, amount: snapToUnit(u) })}>{u}</button>
              ))}
            </span>
          </div>
        </>
      )}

      {kind === "noreply" && (
        <>
          {/* the existing close-reason vocabulary — recordQueryResponse's own strings, no third list */}
          <label className="qrd-l">Why it closes</label>
          <div className="qrd-seg" role="group" aria-label="Why it closes">
            <button type="button" className={closeReason === "noresponse" ? "on" : undefined}
              onClick={() => onCloseReason("noresponse")}>No response</button>
            <button type="button" className={closeReason === "withdrew" ? "on" : undefined}
              onClick={() => onCloseReason("withdrew")}>I withdrew</button>
          </div>
        </>
      )}

      <label className="qrd-l">Note <span className="qrd-opt">— optional</span></label>
      <textarea className="qrd-ta" placeholder="Anything they said worth keeping…" value={draft.notes}
        aria-label="Note" onChange={(e) => onDraft({ ...draft, notes: e.target.value })} />

      <div className="qrd-derived">{derivedLine}</div>

      <div className="qrd-btns">
        <button type="button" className="qrd-b qrd-b--c" onClick={onCancel}>Cancel</button>
        <button type="button" className="qrd-b qrd-b--s" disabled={saving} onClick={onRecord}>
          {saving ? "Saving…" : "Record it"}
        </button>
      </div>
    </div>
  );
};
