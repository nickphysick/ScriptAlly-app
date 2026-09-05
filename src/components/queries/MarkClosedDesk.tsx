/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MarkClosedDesk — Mark closed inside the desk (correction pass 3, §2). The fourth verb: the old
 * anchored close menu lost its trigger when the browsing chrome retired, so it was rendering IN
 * FLOW under the hero with an empty menuStyle; this replaces it in the desk grammar the other
 * three verbs already use. Three reason cards, a date, an optional note, the derived line — and
 * the save goes through the ONE response primitive, which the old menu's direct
 * `updateQueryStatus` never did.
 */
import React from "react";
import "./respondDesk.css";
import { StatusDot } from "../StatusDot";
import { BrandDatePicker } from "../forms/BrandDatePicker";
import { useFixedMenu } from "../forms/useFixedMenu";
import { createPortal } from "react-dom";
import { todayInputDate } from "../../lib/queryDraft";
import { QueryStatus } from "../../types";

export type ClosedReason = QueryStatus.REJECTED | QueryStatus.WITHDRAWN | QueryStatus.NO_RESPONSE;

export interface MarkClosedDraft {
  reason: ClosedReason | null;
  date: string;   /* YYYY-MM-DD, default today */
  note: string;
}

const REASONS: readonly { key: ClosedReason; sub: string }[] = [
  { key: QueryStatus.REJECTED, sub: "They said no" },
  { key: QueryStatus.WITHDRAWN, sub: "You pulled it back" },
  { key: QueryStatus.NO_RESPONSE, sub: "Gone quiet for good" },
];

export interface MarkClosedDeskProps {
  agencyName: string;
  subject: string;
  draft: MarkClosedDraft;
  onDraft: (d: MarkClosedDraft) => void;
  derivedLine: React.ReactNode;
  saving?: boolean;
  onRecord: () => void;
  onCancel: () => void;
}

const fmt1 = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export const MarkClosedDesk: React.FC<MarkClosedDeskProps> = ({
  agencyName, subject, draft, onDraft, derivedLine, saving, onRecord, onCancel,
}) => {
  const [dateOpen, setDateOpen] = React.useState(false);
  const datePanelRef = React.useRef<HTMLElement>(null);
  const { triggerRef: dateRef, menuStyle: dateStyle } = useFixedMenu<HTMLElement>(
    dateOpen, { placement: "auto", align: "left", constrain: true, menuRef: datePanelRef },
  );

  return (
    <div className="qrd">
      <h3>Close the query to {agencyName}</h3>
      <div className="qrd-subj">{subject}</div>

      <div className="qrd-kinds qrd-kinds--closed">
        {REASONS.map((r) => (
          <button key={r.key} type="button"
            className={`qrd-kind${draft.reason === r.key ? " qrd-kind--on" : ""}`}
            onClick={() => onDraft({ ...draft, reason: r.key })}>
            <span className="qrd-kn" aria-hidden="true"><StatusDot status={r.key} overrideSize={18} decorative /></span>
            <span className="qrd-ktx"><u>{r.key}</u><s>{r.sub}</s></span>
          </button>
        ))}
      </div>

      <div className="qrd-row" style={{ marginTop: 12 }}>
        <div>
          <label className="qrd-l">When</label>
          <button type="button" className="qrd-fld" ref={dateRef as React.RefObject<HTMLButtonElement>} onClick={() => setDateOpen((o) => !o)}>
            {fmt1(draft.date)}
            {draft.date === todayInputDate() && <span className="qrd-sub">today</span>}
          </button>
          {dateOpen && createPortal(
            <div className="t-f12 qc-neutral qrd-pop" ref={datePanelRef as React.RefObject<HTMLDivElement>} style={dateStyle} role="dialog" aria-label="Closed on">
              <BrandDatePicker value={draft.date} max={todayInputDate()}
                onChange={(iso) => { onDraft({ ...draft, date: iso }); setDateOpen(false); }} />
            </div>, document.body)}
        </div>
      </div>

      <label className="qrd-l">Note <span className="qrd-opt">— optional</span></label>
      <textarea className="qrd-ta" rows={2} placeholder="Anything worth keeping…"
        value={draft.note} onChange={(e) => onDraft({ ...draft, note: e.target.value })} />

      <div className="qrd-derived">{derivedLine}</div>

      <div className="qrd-btns">
        <button type="button" className="qrd-b qrd-b--c" onClick={onCancel}>Cancel</button>
        <button type="button" className="qrd-b qrd-b--s" disabled={saving || !draft.reason} onClick={onRecord}>
          {saving ? "Saving…" : "Mark closed"}
        </button>
      </div>
    </div>
  );
};
