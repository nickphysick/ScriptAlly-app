/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MarkSentDesk — Mark sent inside the desk (respond-nudge run, §3), for with-you queries.
 *
 * ⚠️ THE NUDGE RULE IS THE LOG SHEET'S, VERBATIM: the agency's window leads as the sage pill,
 * pre-selected, and KEEPING it writes no override — the same `draftExpectedOverrideIso` decides,
 * fed a reminder+date pair, so the two surfaces cannot drift about what a kept window means.
 *
 * ⚠️ "AS ASKED" IS A PRE-FILL, NEVER A CLAIM. The quantity seeds from the request's own recorded
 * figure and stays editable — what went is the writer's statement, not an echo of the ask.
 */
import React from "react";
import "./respondDesk.css";
import { BrandDatePicker } from "../forms/BrandDatePicker";
import { useFixedMenu } from "../forms/useFixedMenu";
import { createPortal } from "react-dom";
import { formatQty, parseQty, stepLabel, stepQty } from "../../lib/createQty";
import { SAMPLE_UNITS, snapToUnit, type SampleUnit } from "../../lib/agentMaterials";
import { CREATE_SEND_METHODS, todayInputDate, type ReminderChoice } from "../../lib/queryDraft";
import type { SubmissionMethod } from "../../types";

export interface MarkSentDraft {
  dateSent: string;            /* input-format YYYY-MM-DD */
  sendMethod: SubmissionMethod;
  reminder: ReminderChoice;
  qty: { amount: string; unit: SampleUnit } | null;  /* null = a full/R&R send — no portion */
  /** which BOOK VERSION went — `""` = not recorded (the popover's D7 convention, ported with the
   *  field when MarkSentPopover retired into this desk). */
  bookVersionId: string;
  note: string;
}

export interface MarkSentDeskProps {
  title: string;               /* `Mark the partial sent` */
  subject: string;             /* `Harriet Vane-Coe asked for the first partial · 5 Sep` */
  askedLabel: string | null;   /* mono `as asked` beside the qty when it still matches */
  draft: MarkSentDraft;
  onDraft: (d: MarkSentDraft) => void;
  windowWeeks: number | null;  /* the agency's stated window */
  /** VERSION SENT (ported from MarkSentPopover on its retirement — D5–D8 keep their law here).
   *  The field renders only at two or more versions; `readVersion` is the shared `openingRead`
   *  derivation, pre-selected and SAID rather than guessed. */
  bookVersions?: { id: string; name: string }[];
  readVersion?: { id: string; name: string } | null;
  agentName?: string;
  derivedLine: React.ReactNode;
  saving?: boolean;
  onMark: () => void;
  onCancel: () => void;
}

const fmt1 = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

const pop = (style: React.CSSProperties, ref: React.RefObject<HTMLElement>, label: string, children: React.ReactNode) =>
  createPortal(
    <div className="t-f12 qc-neutral qrd-pop" ref={ref as React.RefObject<HTMLDivElement>} style={style} role="dialog" aria-label={label}>{children}</div>,
    document.body,
  );

export const MarkSentDesk: React.FC<MarkSentDeskProps> = ({
  title, subject, askedLabel, draft, onDraft, windowWeeks, bookVersions = [], readVersion = null, agentName, derivedLine, saving, onMark, onCancel,
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
  const [qtyFocused, setQtyFocused] = React.useState(false);
  const qty = draft.qty;

  return (
    <div className="qrd">
      <h3>{title}</h3>
      <div className="qrd-subj">{subject}</div>

      <div className="qrd-row">
        <div>
          <label className="qrd-l">Sent on</label>
          <button type="button" className="qrd-fld" ref={dateRef as React.RefObject<HTMLButtonElement>} onClick={() => setDateOpen((o) => !o)}>
            {fmt1(draft.dateSent)}
            {draft.dateSent === todayInputDate() && <span className="qrd-sub">today</span>}
          </button>
          {dateOpen && pop(dateStyle, datePanelRef, "Sent on", (
            <BrandDatePicker value={draft.dateSent} max={todayInputDate()}
              onChange={(iso) => { onDraft({ ...draft, dateSent: iso }); setDateOpen(false); }} />
          ))}
        </div>
        <div>
          <label className="qrd-l">How</label>
          <div className="qrd-seg" role="group" aria-label="How">
            {CREATE_SEND_METHODS.map((m) => (
              <button key={m.value} type="button" className={draft.sendMethod === m.value ? "on" : undefined}
                onClick={() => onDraft({ ...draft, sendMethod: m.value })}>{m.label}</button>
            ))}
          </div>
        </div>
      </div>

      {qty && (
        <>
          <label className="qrd-l">What went</label>
          <div className="qrd-qc">
            <span className="qrd-stepc">
              <button type="button" aria-label="Less" onClick={() => onDraft({ ...draft, qty: { ...qty, amount: String(stepQty(qty.amount, qty.unit, -1)) } })}>−</button>
              <input value={qtyFocused ? qty.amount : formatQty(qty.amount)} inputMode="numeric" aria-label={`Amount in ${qty.unit.toLowerCase()}`}
                onFocus={() => setQtyFocused(true)} onBlur={() => setQtyFocused(false)}
                onChange={(e) => onDraft({ ...draft, qty: { ...qty, amount: String(parseQty(e.target.value)) } })}
                onKeyDown={(e) => {
                  if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
                  e.preventDefault();
                  onDraft({ ...draft, qty: { ...qty, amount: String(stepQty(qty.amount, qty.unit, e.key === "ArrowUp" ? 1 : -1)) } });
                }} />
              <button type="button" aria-label="More" onClick={() => onDraft({ ...draft, qty: { ...qty, amount: String(stepQty(qty.amount, qty.unit, 1)) } })}>+</button>
              <span className="qrd-pm">{stepLabel(qty.unit)}</span>
            </span>
            <span className="qrd-useg">
              {SAMPLE_UNITS.map((u) => (
                <button key={u} type="button" className={qty.unit === u ? "on" : undefined}
                  onClick={() => onDraft({ ...draft, qty: { unit: u, amount: snapToUnit(u) } })}>{u}</button>
              ))}
            </span>
            {askedLabel && <span className="qrd-sub">{askedLabel}</span>}
          </div>
        </>
      )}

      {(() => {
        /* D8 — gated on there being a choice to make: one version needs no field. */
        const showVersionField = bookVersions.length >= 2;
        if (!showVersionField) return null;
        return (
          <>
            <label className="qrd-l" htmlFor="qrd-bookversion">Version sent</label>
            {readVersion ? (
              <div className="qrd-vnote">{agentName || "The agent"} read <b>{readVersion.name}</b> in the sample you queried with. That&rsquo;s pre-selected below.</div>
            ) : (
              /* ⚠️ SAID, NOT GUESSED — silence here would let the empty option read as a choice. */
              <div className="qrd-vnote">No version is recorded for the sample you queried with.</div>
            )}
            <select id="qrd-bookversion" className="qrd-fld qrd-vsel" value={draft.bookVersionId}
              onChange={(e) => onDraft({ ...draft, bookVersionId: e.target.value })}>
              <option value="">— not recorded —</option>
              {bookVersions.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <div className="qrd-vfoot">Which version you actually sent. Change it if you sent something else — that&rsquo;s a fact worth recording, not a mistake.</div>
          </>
        );
      })()}

      <label className="qrd-l">Nudge me after</label>
      <div className="qrd-chips">
        {windowWeeks != null && (
          <button type="button" className={`qrd-win${draft.reminder.kind === "preset" && draft.reminder.weeks === windowWeeks ? " on" : ""}`}
            onClick={() => onDraft({ ...draft, reminder: { kind: "preset", weeks: windowWeeks } })}>
            {windowWeeks} wks <span className="qrd-mono8">· their window</span>
          </button>
        )}
        {[8, 12].filter((w) => w !== windowWeeks).map((w) => (
          <button key={w} type="button" className={draft.reminder.kind === "preset" && draft.reminder.weeks === w ? "on" : undefined}
            onClick={() => onDraft({ ...draft, reminder: { kind: "preset", weeks: w } })}>{w} wks</button>
        ))}
        <button type="button" ref={pickRef as React.RefObject<HTMLButtonElement>}
          className={draft.reminder.kind === "custom" ? "on" : undefined}
          onClick={() => setPickOpen((o) => !o)}>
          {draft.reminder.kind === "custom" ? fmt1(draft.reminder.date) : "Pick a date"}
        </button>
        {pickOpen && pop(pickStyle, pickPanelRef, "Nudge date", (
          <BrandDatePicker value={draft.reminder.kind === "custom" ? draft.reminder.date : ""}
            min={(() => { const d = new Date(`${draft.dateSent}T12:00:00`); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })()}
            onChange={(iso) => { onDraft({ ...draft, reminder: { kind: "custom", date: iso } }); setPickOpen(false); }} />
        ))}
        <button type="button" className={draft.reminder.kind === "none" ? "on" : undefined}
          onClick={() => onDraft({ ...draft, reminder: { kind: "none" } })}>No nudge</button>
      </div>

      <div className="qrd-derived">{derivedLine}</div>

      <div className="qrd-btns">
        <button type="button" className="qrd-b qrd-b--c" onClick={onCancel}>Cancel</button>
        <button type="button" className="qrd-b qrd-b--s" disabled={saving} onClick={onMark}>
          {saving ? "Saving…" : "Mark sent"}
        </button>
      </div>
    </div>
  );
};
