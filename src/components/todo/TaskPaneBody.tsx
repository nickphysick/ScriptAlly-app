/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TaskPaneBody — the pane's send form.
 *
 * ⚠️ THE MATERIALS ARE A CONTROL NOW, NOT A ROW OF TICKS (pane round, Phase 3). It was
 * `todo-materials-contract.html`'s `What goes` — a read-only row of `.chip`s stating what the
 * agency asked for. The pane contract asks the question the writer can actually answer: *what did
 * you put in the envelope?* — a unit, an amount, and anything that went alongside. Those are not
 * the same fact, and the old one could not be corrected: an agency that asked for three chapters
 * and got five had nowhere to say so.
 *
 * ⚠️ THE CONTROL IS `SampleSpecPicker`, MOUNTED DIRECTLY — not a copy of it, and not the retired
 * `PaneJourney` wrapper it used to live inside. It already owns the sample's vocabulary, its
 * physics and its encoding; what it did not have was a way to say "one parcel, one measure", and
 * that is `mode="sent"`. The rest of the form is the contract's: `When`, and `Anything else?`.
 *
 * ⚠️ THE FIELDS REPORT UPWARD; THEY DO NOT WRITE. The pane's primary is the one completion path, so
 * the body's whole job is to hold what the writer typed and hand it over when asked. That is the
 * carried behaviour — a body that wrote on its own would be a second way to finish a task.
 */
import React from "react";
import { SampleSpecPicker } from "../materials/SampleSpecPicker";
import type { MaterialRow } from "../../lib/agentMaterials";

export interface SendBodyValues {
  /**
   * ⚠️ THE SAMPLE ROWS, IN THE ONE SHAPE THE APP ALREADY STORES. `MaterialRow[]` is what
   * `SampleSpecPicker` reads and writes and what `materialsWantedFromRows` encodes, so what the
   * writer picks and what is recorded cannot come to mean different things.
   */
  rows: MaterialRow[];
  /** "Anything else going with it? e.g. author bio" — the writer's own words, verbatim */
  alongside: string;
  /** which of the contract's three `When` options is chosen */
  when: "Today" | "Yesterday" | "Another date…";
  /**
   * ⚠️ WHEN YOU EXPECT TO HEAR BACK — the writer's own expectation, in weeks from the send.
   * `null` is "A date…", which has no week count and is answered by a picker rather than a pill.
   */
  expectWeeks: number | null;
  /** how early the reminder lands, in days before the expected reply. `null` = no reminder. */
  remindDaysBefore: number | null;
  /** the free text under "Anything else?" */
  also: string;
}

/** the contract's four windows, in its order */
export const EXPECT_WEEKS = [4, 6, 8, 12] as const;

/**
 * ⚠️ THE REMINDER IS EXPRESSED AS A LEAD, NOT A DATE. "The week before" has to keep meaning the
 * week before even when the expected reply moves, so what is stored on the form is the OFFSET and
 * the date is derived from it — the same reason `surfaceOffset` is a lead rather than a stamp.
 */
export const REMIND_OPTIONS: { label: string; days: number | null }[] = [
  { label: "On the day", days: 0 },
  { label: "The week before", days: 7 },
  { label: "No reminder", days: null },
];

export interface TaskPaneBodyProps {
  value: SendBodyValues;
  onChange: (v: SendBodyValues) => void;
  /**
   * ⚠️ THE SAMPLE QUESTION IS ASKED ONLY WHERE A SAMPLE IS GOING. A nudge, a close and a note have
   * no parcel, so the whole section is absent rather than an empty control — the same rule the tile
   * row and the story column already follow.
   */
  sample?: boolean;
  /** the free-plan `.upsell`; omitted for Pro */
  upsell?: React.ReactNode;
}

/** the mockup's three, in its order */
const WHEN: SendBodyValues["when"][] = ["Today", "Yesterday", "Another date…"];

export const TaskPaneBody: React.FC<TaskPaneBodyProps> = ({ value, onChange, sample, upsell }) => (
  <>
    {/* ⚠️ A LABEL WITH NOTHING BENEATH IT DOES NOT RENDER (frame2 Phase 4). A note has no parcel,
        so the question stood over an empty row — a question the page then declined to answer.
        Absence is a value: no sample, no section. */}
    {sample && (
      <div className="sect">
        <label className="f-lbl">What are you sending?</label>
        <div className="f-sub" style={{ margin: "-3px 0 9px" }}>
          Pick the unit you actually sent in — one only.
        </div>
        <SampleSpecPicker
          rows={value.rows}
          onChange={(rows) => onChange({ ...value, rows })}
          /* ⚠️ "and", NOT "or". A requirement offers a choice; a record describes one parcel. */
          join="and"
          mode="sent"
          idPrefix="tpn-sent"
        />
        <input
          className="txt"
          placeholder="Anything else going with it? e.g. author bio"
          value={value.alongside}
          onChange={(e) => onChange({ ...value, alongside: e.target.value })}
        />
      </div>
    )}

    <label className="f-lbl">When</label>
    <div className="seg" style={{ marginBottom: 16 }}>
      {WHEN.map((w) => (
        <button type="button" key={w} className={value.when === w ? "on" : undefined}
          onClick={() => onChange({ ...value, when: w })}>{w}</button>
      ))}
    </div>

    {/* ⚠️ THE EXPECTATION BLOCK IS THE SEND JOURNEY'S ALONE. It asks when a reply is due and when
        to be reminded — both facts about a parcel in transit — so a nudge, a close and a note have
        nothing to answer here and the block is absent rather than disabled. */}
    {sample && (
      <div className="expect">
        <label className="f-lbl">When do you expect to hear back?</label>
        <div className="seg" style={{ marginBottom: 11 }}>
          {EXPECT_WEEKS.map((w) => (
            <button type="button" key={w} className={value.expectWeeks === w ? "on" : undefined}
              onClick={() => onChange({ ...value, expectWeeks: w })}>{w} weeks</button>
          ))}
        </div>
        <label className="f-lbl">Remind you to nudge?</label>
        <div className="seg">
          {REMIND_OPTIONS.map((o) => (
            <button type="button" key={o.label}
              className={value.remindDaysBefore === o.days ? "on" : undefined}
              onClick={() => onChange({ ...value, remindDaysBefore: o.days })}>{o.label}</button>
          ))}
        </div>
        {/* ⚠️ AND IT SAYS WHERE THE REMINDER GOES. The contract's own line, and it is the honest
            one: this app has no notification delivery of any kind, so a reminder that implied a
            push or an email would be promising something nothing sends. It lands on this list. */}
        <div className="inherit">The reminder lands here, on your list, when the time comes.</div>
      </div>
    )}

    <label className="f-lbl">Anything else?</label>
    <textarea className="note-in" placeholder="e.g. included the revised opening"
      value={value.also} onChange={(e) => onChange({ ...value, also: e.target.value })} />

    {upsell && <div className="upsell">{upsell}</div>}
  </>
);
