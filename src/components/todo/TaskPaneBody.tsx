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
import { BrandDatePicker } from "../forms/BrandDatePicker";
import type { MaterialRow } from "../../lib/agentMaterials";

/**
 * ⚠️ EVERY CHOICE IS A UNION WITH `null` FOR UNCHOSEN, AND `null` IS NEVER A DEFAULT (finishing
 * round, Phase 3).
 *
 * These were plain values seeded on open — When "Today", the window from the agent's record, the
 * reminder a week before. Each looked like an answer the writer had given, and none of them was:
 * the strip read "today · reply expected ~15 Oct · nudge 8 Oct" before anybody had touched the
 * form, and pressing the primary would have recorded three facts nobody stated.
 *
 * ⚠️ AND "No reminder" IS A CHOICE, NOT AN ABSENCE. It is `{ kind: "none" }`, distinct from the
 * `null` that means the question is unanswered — which is exactly the distinction a single
 * `number | null` could not carry, and the reason these are unions rather than nullable numbers.
 */
export type DayChoice =
  | { kind: "today" }
  | { kind: "yesterday" }
  | { kind: "date"; ymd: string };
export type ExpectChoice =
  | { kind: "weeks"; weeks: number }
  | { kind: "date"; ymd: string };
export type RemindChoice =
  | { kind: "lead"; days: number }
  | { kind: "none" };

export interface SendBodyValues {
  /**
   * ⚠️ THE SAMPLE ROWS, IN THE ONE SHAPE THE APP ALREADY STORES. `MaterialRow[]` is what
   * `SampleSpecPicker` reads and writes and what `materialsWantedFromRows` encodes, so what the
   * writer picks and what is recorded cannot come to mean different things.
   */
  rows: MaterialRow[];
  /** "Anything else going with it? e.g. author bio" — the writer's own words, verbatim */
  alongside: string;
  /** the day it went — `null` until the writer says */
  when: DayChoice | null;
  /** when a reply is expected — a window, or an explicit date. `null` until chosen. */
  expect: ExpectChoice | null;
  /** the nudge reminder — a lead, or the explicit choice of none. `null` until chosen. */
  remind: RemindChoice | null;
  /** the free text under "Anything else?" */
  also: string;
}

/** the contract's four windows, in its order */
export const EXPECT_WEEKS = [4, 6, 8, 12] as const;

/** the contract's three When options, in its order */
export const DAY_OPTIONS: { label: string; make: () => DayChoice | "picker" }[] = [
  { label: "Today", make: () => ({ kind: "today" }) },
  { label: "Yesterday", make: () => ({ kind: "yesterday" }) },
  { label: "Another date…", make: () => "picker" },
];

/**
 * ⚠️ THE REMINDER IS EXPRESSED AS A LEAD, NOT A DATE. "The week before" has to keep meaning the
 * week before even when the expected reply moves, so what is stored on the form is the OFFSET and
 * the date is derived from it — the same reason `surfaceOffset` is a lead rather than a stamp.
 */
export const REMIND_OPTIONS: { label: string; make: () => RemindChoice | "picker" }[] = [
  { label: "On the day", make: () => ({ kind: "lead", days: 0 }) },
  { label: "The week before", make: () => ({ kind: "lead", days: 7 }) },
  { label: "A custom date…", make: () => "picker" },
  { label: "No reminder", make: () => ({ kind: "none" }) },
];

/** is this option the one currently chosen? — read from the value, never from a second state */
export const dayIsOn = (v: DayChoice | null, label: string): boolean =>
  !!v && ((v.kind === "today" && label === "Today")
       || (v.kind === "yesterday" && label === "Yesterday")
       || (v.kind === "date" && label === "Another date…"));
export const remindIsOn = (v: RemindChoice | null, label: string): boolean =>
  !!v && ((v.kind === "none" && label === "No reminder")
       || (v.kind === "lead" && v.days === 0 && label === "On the day")
       || (v.kind === "lead" && v.days === 7 && label === "The week before")
       || (v.kind === "lead" && v.days !== 0 && v.days !== 7 && label === "A custom date…"));

export interface TaskPaneBodyProps {
  value: SendBodyValues;
  onChange: (v: SendBodyValues) => void;
  /**
   * ⚠️ SHOWN, NEVER CHOSEN (Phase 3). The agency's own stated window is the best information on
   * record and the worst possible default: pre-selecting it would put the agency's answer in the
   * writer's mouth, and the strip would then record it as something they said. It renders as a
   * quiet line under the pills instead — there to be agreed with, or not.
   */
  statedWeeks?: number | null;
  /**
   * ⚠️ THE SAMPLE QUESTION IS ASKED ONLY WHERE A SAMPLE IS GOING. A nudge, a close and a note have
   * no parcel, so the whole section is absent rather than an empty control — the same rule the tile
   * row and the story column already follow.
   */
  sample?: boolean;
  /**
   * ⚠️ A NOTE'S OWN WORDS, AS THE CENTREPIECE (finishing round, Phase 5). Present only on the note
   * journey, and its presence is also what removes the When section: a note is dated by the tick,
   * so asking when it happened is asking about an event that has not happened yet.
   */
  note?: { text: string; added: string };
  /** the free-plan `.upsell`; omitted for Pro */
  upsell?: React.ReactNode;
}

/* (the three When options are `DAY_OPTIONS` now — each carries what choosing it MAKES, so the
   label and the value it produces cannot drift apart, and "Another date…" says "picker" rather
   than pretending to be a value.) */

/** today as YYYY-MM-DD, local — the picker's own vocabulary */
const todayYmd = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const TaskPaneBody: React.FC<TaskPaneBodyProps> = ({ value, onChange, sample, note, statedWeeks, upsell }) => (
  <>
    {/* ⚠️ THE WRITER'S OWN SENTENCE, AT READING SIZE. It was a label above a form; it is the thing
        the pane is about, so it is the first thing in it and it is set in the hand the list writes
        notes in. The meta line beneath carries the date and the one sentence about finishing —
        ONCE, in the pane, total: it used to appear here AND in the band's sub-line. */}
    {note && (
      <>
        <div className="notebody">{note.text}</div>
        <div className="notemeta">Added {note.added} · ticking it off is what finishes it</div>
      </>
    )}
    {/* ⚠️ A LABEL WITH NOTHING BENEATH IT DOES NOT RENDER (frame2 Phase 4). A note has no parcel,
        so the question stood over an empty row — a question the page then declined to answer.
        Absence is a value: no sample, no section. */}
    {sample && (
      <div className="sect">
        <label className="f-lbl" data-req="unit">What are you sending?</label>
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

    {/* ⚠️ A NOTE HAS NO `When`. Ticking it off IS the act and the tick carries its own date, so the
        question has no subject — an empty segmented control here would be asking the writer to date
        something that has not happened. Absent, not disabled. */}
    {!note && <div className="sect">
      <label className="f-lbl" data-req="when">When</label>
      <div className="seg">
        {DAY_OPTIONS.map((o) => (
          <button type="button" key={o.label}
            className={dayIsOn(value.when, o.label) ? "on" : undefined}
            onClick={() => {
              const made = o.make();
              onChange({ ...value, when: made === "picker" ? { kind: "date", ymd: "" } : made });
            }}>{o.label}</button>
        ))}
      </div>
      {/* ⚠️ THE PICKER IS THE APP'S OWN, and expect-back opens the SAME one — the brief's rule, and
          the reason a second date control would be wrong is that two pickers on one form is two
          places for a date to come from. */}
      {value.when?.kind === "date" && (
        <div style={{ marginTop: 8 }}>
          <BrandDatePicker value={value.when.ymd} placeholder="Pick the day it went"
            max={todayYmd()}
            onChange={(ymd) => onChange({ ...value, when: { kind: "date", ymd } })} />
        </div>
      )}
    </div>}

    {/* ⚠️ THE EXPECTATION BLOCK IS THE SEND JOURNEY'S ALONE. It asks when a reply is due and when
        to be reminded — both facts about a parcel in transit — so a nudge, a close and a note have
        nothing to answer here and the block is absent rather than disabled. */}
    {sample && (
      <div className="expect">
        <label className="f-lbl" data-req="expect">When do you expect to hear back?</label>
        <div className="seg" style={{ marginBottom: 11 }}>
          {EXPECT_WEEKS.map((w) => (
            <button type="button" key={w}
              className={value.expect?.kind === "weeks" && value.expect.weeks === w ? "on" : undefined}
              onClick={() => onChange({ ...value, expect: { kind: "weeks", weeks: w } })}>{w} weeks</button>
          ))}
          <button type="button"
            className={value.expect?.kind === "date" ? "on" : undefined}
            onClick={() => onChange({ ...value, expect: { kind: "date", ymd: "" } })}>Another date…</button>
        </div>
        {value.expect?.kind === "date" && (
          <div style={{ marginBottom: 11 }}>
            <BrandDatePicker value={value.expect.ymd} placeholder="Pick when you expect to hear"
              min={todayYmd()}
              onChange={(ymd) => onChange({ ...value, expect: { kind: "date", ymd } })} />
          </div>
        )}
        {/* ⚠️ THE AGENCY'S OWN FIGURE, STATED AND NOT CHOSEN. Absent where the record holds none —
            a line reading "Their stated window is —" would be the app talking about its own gap. */}
        {typeof statedWeeks === "number" && statedWeeks > 0 && (
          <div className="stated">Their stated window is {statedWeeks} weeks.</div>
        )}
        <label className="f-lbl" data-req="remind">Remind you to nudge?</label>
        <div className="seg">
          {REMIND_OPTIONS.map((o) => (
            <button type="button" key={o.label}
              className={remindIsOn(value.remind, o.label) ? "on" : undefined}
              onClick={() => {
                const made = o.make();
                onChange({ ...value, remind: made === "picker" ? { kind: "lead", days: 14 } : made });
              }}>{o.label}</button>
          ))}
        </div>
        {/* ⚠️ AND IT SAYS WHERE THE REMINDER GOES. The contract's own line, and it is the honest
            one: this app has no notification delivery of any kind, so a reminder that implied a
            push or an email would be promising something nothing sends. It lands on this list. */}
        <div className="inherit">The reminder lands here, on your list, when the time comes.</div>
      </div>
    )}

    {/* ⚠️ THE ONE OPTIONAL FIELD ON THIS FORM, AND IT SAYS SO. Everything above is required and
        carries no mark — Option B, where the exception is named rather than the rule. */}
    <label className="f-lbl" style={note ? { marginTop: 16 } : undefined}>Anything else? <span className="opttag">OPTIONAL</span></label>
    <textarea className="note-in" placeholder="e.g. included the revised opening"
      value={value.also} onChange={(e) => onChange({ ...value, also: e.target.value })} />

    {upsell && <div className="upsell">{upsell}</div>}
  </>
);
