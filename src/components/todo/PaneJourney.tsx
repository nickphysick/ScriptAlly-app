/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PaneJourney — the recording journey, rendered INSIDE the card's body (Item 9, Phase 2; ref
 * design-refs/todo-journey-in-pane.html `journeyView`).
 *
 * ⚠️ IT IS NOT AN OVERLAY, AND THAT IS THE FEATURE. `FocusFlow` mounted a full-viewport takeover
 * through `useOverlay`, whose `sealBackground()` puts `inert` on `#root` on the stated premise that
 * overlays portal to `document.body`. FocusFlow does not portal — so the takeover sealed itself,
 * and every control inside it was unreachable by pointer AND by keyboard. Measured on the deployed
 * page: `elementsFromPoint` at the primary's own centre returned `[body, html]`. A journey that is
 * simply the card's body cannot have that fault, so this removes the bug rather than patching it.
 *
 * ⚠️ THE BAND STAYS AND ONLY ITS PRE-LINE CHANGES — the card above this is untouched. "Sending your
 * partial to / Greg Panetta" becomes "Recording what you sent to / Greg Panetta", so the writer
 * never loses who they are recording against half way through recording it.
 *
 * ⚠️ THREE WAYS OUT AND ALL THREE WRITE NOTHING: `Back to the task` at the top of the body, `Cancel`
 * in the footer, and Escape. There is no confirmation, because there is nothing to lose that the
 * writer did not just type and can see.
 *
 * ⚠️ THE REFERENCE SITS ABOVE THE FIRST STEP, NOT BESIDE IT. The ref draws it there and the reason
 * is the measure: at 860px there is no room for a sticky panel next to the steps, and what the agent
 * asked for reads better BEFORE the questions than alongside them.
 */
import React, { useMemo, useRef, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { MaterialRow } from "../../lib/todoHandoff";
import {
  CLOSE_REASON_COPY, CloseReason, JOURNEY_HINT, JOURNEY_STEPS, JourneyKind, JourneySendValues, SEND_METHODS, SendMethod,
  StepId, canCommit, checkBackLabel, journeySummary, shortDay, whenMode, ymdLocal,
} from "../../lib/paneJourney";
import { RecordingCalendar } from "./RecordingCalendar";
import "./paneJourney.css";

/** One title per step id — the numbering comes from the stack's position, never from here. */
const STEP_TITLE: Record<StepId, string> = {
  "what-went": "What went",
  how: "How it went",
  when: "When",
  "check-back": "Come back to it",
  why: "How it ended",
  remember: "Anything to remember",
};

export interface PaneJourneyProps {
  /** The rows the card states as on file — pre-ticked, because this confirms rather than asks. */
  materials: MaterialRow[];
  /**
   * ⚠️ THE REQUEST, IN THE ONE REGISTER THE DATA CAN SUPPORT — a plain fact line, never a quote.
   *
   * The ref draws this slot carrying the agent's actual words ("First fifty pages as a PDF
   * attachment"), which is why it reads as something they said. NOTHING IN THIS APP STORES THAT.
   * Every `note` on a per-query activity rung is written by `buildActivityNote` /
   * `statusChangeDescription` — pure functions of the status and four typed fields, with no writer
   * text and no agent text folded in anywhere. So the quoted register would not be occasionally
   * wrong; it would be wrong every time.
   *
   * Two registers chosen by source is the right design and it needs a source. What would have to
   * exist: a writer-supplied field on the rung, captured when a response is recorded. `details`
   * exists on the LEGACY GLOBAL feed doc and is also derived (`respondBy()`), so it is not it.
   */
  ask?: { fact?: string; meta?: string };
  /** Which journey — the step stack is declared per kind in `JOURNEY_STEPS`. */
  kind: JourneyKind;
  value: JourneySendValues;
  onChange: (v: JourneySendValues) => void;
  /** `Back to the task` — the way out at the TOP of the body. Writes nothing. */
  onCancel: () => void;
}

export const PaneJourney: React.FC<PaneJourneyProps> = ({ materials, ask, kind, value, onChange, onCancel }) => {
  const now = useMemo(() => new Date(), []);
  const [calAnchor, setCalAnchor] = useState<HTMLElement | null>(null);
  const dateBtn = useRef<HTMLButtonElement | null>(null);

  const set = (patch: Partial<JourneySendValues>) => onChange({ ...value, ...patch });
  const yesterday = () => ymdLocal(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));

  const renderStep = (id: StepId): React.ReactNode => {
    switch (id) {
      case "what-went":
        return (
          <>
            <div className="pj-opts">
              {materials.map((m) => {
                const on = value.materials.includes(m.label);
                return (
                  <button type="button" key={m.label} className={`pj-orow${on ? " on" : ""}`}
                    aria-pressed={on} onClick={() => toggle(m.label)}>
                    <span className="pj-bx" aria-hidden>{on ? <Check size={10} /> : null}</span>
                    <span className="pj-otx">{m.label}{m.sub && <span className="sub">{m.sub}</span>}</span>
                  </button>
                );
              })}
              {/* ⚠️ NO ROWS IS A STATE, NOT AN EMPTY LIST. A send whose package has nothing on file
                  is a real thing to record; the step says so rather than rendering a gap. */}
              {materials.length === 0 && <div className="pj-none">Nothing is on file for this send.</div>}
            </div>
            <div className="pj-also">
              <label htmlFor="pj-also">Anything else?</label>
              <textarea id="pj-also" value={value.also} placeholder="A covering line, a note on the changes…"
                onChange={(e) => set({ also: e.target.value })} />
            </div>
          </>
        );
      case "how":
        return (
          <div className="pj-seg">
            {SEND_METHODS.map((m) => (
              <button type="button" key={m} className={value.method === m ? "on" : undefined}
                aria-pressed={value.method === m} onClick={() => set({ method: m as SendMethod })}>{m}</button>
            ))}
          </div>
        );
      case "when":
        return (
          <>
            <div className="pj-seg">
              <button type="button" className={mode === "today" ? "on" : undefined}
                onClick={() => set({ sentDate: ymdLocal(now) })}>Today</button>
              <button type="button" className={mode === "yesterday" ? "on" : undefined}
                onClick={() => set({ sentDate: yesterday() })}>Yesterday</button>
              {/* ⚠️ THE ANCHOR RELABELS ITSELF once a day is chosen — a button still reading
                  "Another date…" beside a chosen date states that nothing has been picked. */}
              <button type="button" className={mode === "other" ? "on" : undefined} aria-haspopup="dialog"
                onClick={(e) => setCalAnchor(e.currentTarget)}>
                {mode === "other" ? shortDay(value.sentDate) : "Another date…"}
              </button>
            </div>
            {calAnchor && (
              <RecordingCalendar
                anchor={calAnchor}
                value={value.sentDate}
                /* ⚠️ THE JOURNEY SUPPLIES `max`, THE COMPONENT ASSUMES NOTHING. You cannot have sent
                   something tomorrow — but that is this caller's fact about recording, not the
                   calendar's about dates. */
                max={ymdLocal(now)}
                onPick={(day) => set({ sentDate: day })}
                onClose={() => setCalAnchor(null)}
              />
            )}
          </>
        );
      case "check-back":
        return (
          <div className="pj-seg">
            {[7, 14, 28].map((d) => (
              <button type="button" key={d} className={value.checkBackDays === d ? "on" : undefined}
                aria-pressed={value.checkBackDays === d} onClick={() => set({ checkBackDays: d })}>
                {checkBackLabel(d)}
              </button>
            ))}
          </div>
        );
      case "why":
        /* ⚠️ THE THREE WRITE THREE DIFFERENT STATUSES, so this is a real decision and not a label.
           Each carries its gloss, because "a pass arrived off the record" is not self-explaining. */
        return (
          <div className="pj-opts">
            {CLOSE_REASON_COPY.map((r) => {
              const on = value.reason === r.key;
              return (
                <button type="button" key={r.key} className={`pj-orow${on ? " on" : ""}`}
                  aria-pressed={on} onClick={() => set({ reason: r.key as CloseReason })}>
                  <span className="pj-bx" aria-hidden>{on ? <Check size={10} /> : null}</span>
                  <span className="pj-otx">{r.label}<span className="sub">{r.gloss}</span></span>
                </button>
              );
            })}
          </div>
        );
      case "remember":
        return (
          <div className="pj-also bare">
            <textarea value={value.note} placeholder="What you tweaked, what the covering line said…"
              onChange={(e) => set({ note: e.target.value })} />
          </div>
        );
    }
  };
  const mode = whenMode(value.sentDate, now);
  const toggle = (label: string) =>
    set({ materials: value.materials.includes(label)
      ? value.materials.filter((m) => m !== label)
      : [...value.materials, label] });

  return (
    <>
      {/* ⚠️ THE WAY BACK IS THE FIRST THING IN THE BODY, above the reference and the steps. A
          journey whose exit is only in the footer asks the writer to read to the end to find out
          they can leave. */}
      <div className="pj-head">
        <button type="button" className="pj-back" onClick={onCancel}>
          <ArrowLeft size={13} aria-hidden /> Back to the task
        </button>
      </div>

      {/* ⚠️ "ON THE RECORD", NOT "WHAT THEY ASKED FOR" — the heading is half the register. The old
          one framed a derived string as something the agent phrased; this one states where the line
          came from and claims nothing about who wrote it. Omitted entirely where the record holds
          nothing: a "no request recorded" panel is a heading over an absence. */}
      {/* ⚠️ THE FACT IS WHAT EARNS THE BLOCK. `meta` alone is the agent and their agency — which the
          BAND states two inches above, in larger type — so a block holding only that is a heading
          over a duplicate. Measured on a close card, which has no incoming rung to quote: it drew a
          bordered box containing "ON THE RECORD" and the name already on screen. */}
      {ask?.fact && (
        <div className="pj-ref">
          <h5>On the record</h5>
          {ask.fact && <div className="pj-reff">{ask.fact}</div>}
          {ask.meta && <div className="pj-refm">{ask.meta}</div>}
        </div>
      )}

      {/* ⚠️ THE STACK IS DECLARED, NOT BRANCHED — `JOURNEY_STEPS[kind]`. A send asks four things; a
          chase asks two; a close asks one. Numbering follows the stack, so a shorter journey LOOKS
          shorter rather than showing "03 of 04" with a step that does nothing. */}
      {JOURNEY_STEPS[kind].map((id, i) => (
        <div className="pj-step" key={id}>
          <div className="pj-n">
            <span className="i">{String(i + 1).padStart(2, "0")}</span>
            <h4>{STEP_TITLE[id]}</h4>
            {id === "remember" && <span className="opt">optional</span>}
          </div>
          {renderStep(id)}
        </div>
      ))}

    </>
  );
};

/**
 * ⚠️ THE SUMMARY AND THE FOOTER ARE A SEPARATE EXPORT BECAUSE THEY ARE SIBLINGS OF THE SCROLLER,
 * NOT CHILDREN OF IT — and building them as children is exactly the mistake this file made first.
 *
 * Measured on the deployed page: with all of it inside `EdgeFadeScroll`, the commit sat at y 1271
 * in a 1000px viewport. It was reachable by scrolling to the bottom of the form, which is precisely
 * what "pinned" is supposed to prevent — you would answer four questions and then have to go
 * looking for the button. The file's own CSS comment said "siblings of the scroller"; the component
 * did not, and only a real measurement could tell the two apart.
 *
 * The steps scroll; the sentence about to be committed and the button that commits it stay on
 * screen together.
 */
export interface PaneJourneyFootProps {
  kind: JourneyKind;
  actLabel: string;
  value: JourneySendValues;
  onCancel: () => void;
  onCommit: () => void;
  saving?: boolean;
}

export const PaneJourneyFoot: React.FC<PaneJourneyFootProps> = ({ kind, actLabel, value, onCancel, onCommit, saving = false }) => {
  const now = useMemo(() => new Date(), []);
  return (
    <>
      <div className="pj-sum" role="status">
        <span className="i" aria-hidden><Check size={10} /></span>
        <span className="t">{journeySummary(kind, value, now)}</span>
      </div>
      <div className="pj-foot">
        <button type="button" className="pj-btn" onClick={onCancel}>Cancel</button>
        <span className="pj-hint">{JOURNEY_HINT[kind]}</span>
        <span className="pj-grow" />
        <button type="button" className="pj-prime" disabled={!canCommit(kind, value) || saving} onClick={onCommit}>
          <Check size={14} aria-hidden /> {saving ? "Recording…" : actLabel}
        </button>
      </div>
    </>
  );
};

export default PaneJourney;
