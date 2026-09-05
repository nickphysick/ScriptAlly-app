/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NudgeDesk — Nudge inside the desk (respond-nudge run, §4).
 *
 * ⚠️ THE DRAFT IS `nudgeDraft`'s — the template the modal and the To-do walkthrough already share
 * (decision 4's first branch: one exists, so it is used). It is COPIED, never sent, and the desk
 * says so in the derived line and above the draft itself.
 */
import React from "react";
import "./respondDesk.css";
import { BrandDatePicker } from "../forms/BrandDatePicker";
import { useFixedMenu } from "../forms/useFixedMenu";
import { createPortal } from "react-dom";
import { todayInputDate } from "../../lib/queryDraft";

export interface NudgeDeskDraft {
  nudgeDate: string;           /* YYYY-MM-DD, default today */
  /** the next-reminder choice: weeks, a custom date, or none */
  again: { kind: "weeks"; weeks: number } | { kind: "custom"; date: string } | { kind: "none" };
}

export interface NudgeDeskProps {
  agencyName: string;          /* `Nudge Stillwater Reps` */
  subject: string;             /* `Query sent 12 Aug · 24 days ago · window 6 weeks` */
  toEmail: string | null;      /* the agent's recorded email — null renders no To line */
  draftText: string;           /* nudgeDraft's output, built by the page */
  defaultWeeks: number;        /* the leading sage chip — the existing reminder's interval, else 4 */
  draft: NudgeDeskDraft;
  onDraft: (d: NudgeDeskDraft) => void;
  derivedLine: React.ReactNode;
  saving?: boolean;
  onRecord: () => void;
  onCancel: () => void;
}

const fmt1 = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const plusWeeks = (iso: string, w: number) => {
  const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + w * 7);
  return d.toISOString().slice(0, 10);
};

export const NudgeDesk: React.FC<NudgeDeskProps> = ({
  agencyName, subject, toEmail, draftText, defaultWeeks, draft, onDraft, derivedLine, saving, onRecord, onCancel,
}) => {
  const [dateOpen, setDateOpen] = React.useState(false);
  const datePanelRef = React.useRef<HTMLElement>(null);
  const { triggerRef: dateRef, menuStyle: dateStyle } = useFixedMenu<HTMLElement>(
    dateOpen, { placement: "auto", align: "left", constrain: true, menuRef: datePanelRef },
  );
  const [pickOpen, setPickOpen] = React.useState(false);
  const pickPanelRef = React.useRef<HTMLElement>(null);
  const { triggerRef: pickRef, menuStyle: pickStyle } = useFixedMenu<HTMLElement>(
    pickOpen, { placement: "auto", align: "left", constrain: true, menuRef: pickPanelRef },
  );

  return (
    <div className="qrd">
      <h3>Nudge {agencyName}</h3>
      <div className="qrd-subj">{subject}</div>

      <div className="qrd-mail">
        <div className="qrd-mh">
          {toEmail ? <>To <b>{toEmail}</b> · </> : null}from your own mail client
        </div>
        {draftText.split("\n").map((line, i) => <React.Fragment key={i}>{line}<br /></React.Fragment>)}
      </div>

      <div className="qrd-row" style={{ marginTop: 12 }}>
        <div>
          <label className="qrd-l">Nudge date</label>
          <button type="button" className="qrd-fld" ref={dateRef as React.RefObject<HTMLButtonElement>} onClick={() => setDateOpen((o) => !o)}>
            {fmt1(draft.nudgeDate)}
            {draft.nudgeDate === todayInputDate() && <span className="qrd-sub">today</span>}
          </button>
          {dateOpen && createPortal(
            <div className="t-f12 qc-neutral qrd-pop" ref={datePanelRef as React.RefObject<HTMLDivElement>} style={dateStyle} role="dialog" aria-label="Nudge date">
              <BrandDatePicker value={draft.nudgeDate} max={todayInputDate()}
                onChange={(iso) => { onDraft({ ...draft, nudgeDate: iso }); setDateOpen(false); }} />
            </div>, document.body)}
        </div>
        <div>
          <label className="qrd-l">How</label>
          <div className="qrd-fld" aria-label="How">Email</div>
        </div>
      </div>

      <label className="qrd-l">Nudge me again after</label>
      <div className="qrd-chips">
        <button type="button" className={`qrd-win${draft.again.kind === "weeks" && draft.again.weeks === defaultWeeks ? " on" : ""}`}
          onClick={() => onDraft({ ...draft, again: { kind: "weeks", weeks: defaultWeeks } })}>
          {defaultWeeks} wks <span className="qrd-mono8">· {fmt1(plusWeeks(draft.nudgeDate, defaultWeeks))}</span>
        </button>
        {[6, 8].filter((w) => w !== defaultWeeks).map((w) => (
          <button key={w} type="button" className={draft.again.kind === "weeks" && draft.again.weeks === w ? "on" : undefined}
            onClick={() => onDraft({ ...draft, again: { kind: "weeks", weeks: w } })}>{w} wks</button>
        ))}
        <button type="button" ref={pickRef as React.RefObject<HTMLButtonElement>}
          className={draft.again.kind === "custom" ? "on" : undefined}
          onClick={() => setPickOpen((o) => !o)}>
          {draft.again.kind === "custom" ? fmt1(draft.again.date) : "Pick a date"}
        </button>
        {pickOpen && createPortal(
          <div className="t-f12 qc-neutral qrd-pop" ref={pickPanelRef as React.RefObject<HTMLDivElement>} style={pickStyle} role="dialog" aria-label="Next nudge">
            <BrandDatePicker value={draft.again.kind === "custom" ? draft.again.date : ""}
              min={(() => { const d = new Date(`${draft.nudgeDate}T12:00:00`); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })()}
              onChange={(iso) => { onDraft({ ...draft, again: { kind: "custom", date: iso } }); setPickOpen(false); }} />
          </div>, document.body)}
        <button type="button" className={draft.again.kind === "none" ? "on" : undefined}
          onClick={() => onDraft({ ...draft, again: { kind: "none" } })}>No more nudges</button>
      </div>

      <div className="qrd-derived">{derivedLine}</div>

      <div className="qrd-btns">
        <button type="button" className="qrd-b qrd-b--c" onClick={onCancel}>Cancel</button>
        <button type="button" className="qrd-b qrd-b--s" disabled={saving} onClick={onRecord}>
          {saving ? "Saving…" : "Copy draft & record nudge"}
        </button>
      </div>
    </div>
  );
};
