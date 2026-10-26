/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v71 — THE FOUNDING WRITER CARD (ref design-refs/dashboard-v71/ `.fw71`).
 *
 * A white card with a burgundy hairline frame, a navy band and a soft pink body: the hawks on the
 * left, three states on the right.
 *   ask   — "The early bird gets the worm." and the four faces (the weekly pulse)
 *   noted — the answer is back from the server: "Say more →" opens the one feedback panel
 *   sent  — the panel reported a note sent from one of this card's doors
 *
 * ⚠️ THE FACES ARE THE WEEKLY PULSE; THE WORDS GO TO THE ONE `FeedbackDock` (through
 * `lib/feedbackStore`). There is no second feedback panel.
 * ⚠️ ONLY THE SERVER'S YES SAYS "NOTED". A refusal keeps the card on Ask, clears the face and says so.
 * ⚠️ THE COPY IS FIXED (the pack's table). No native `title`: a face's label is a drawn tooltip.
 * ⚠️ NOTHING IS EVER CUT. The art is vertically centred and sized inside its column; on a short
 * window the line goes, and the heading, the faces and the buttons stay.
 */
import React from "react";
import { MOODS, moodLabel, type Mood } from "../../../lib/weeklyPulse";

export const FW_COPY = {
  band: "— FOUNDING WRITER —",
  more: "Tell us anything →",
  ask: { heading: "The early bird gets the worm.", line: "How’s QueryHawk going this week?", sig: "— Nick, founder" },
  noted: { heading: "Noted, thank you.", before: "You said ", after: " this week. Anything behind that?", sayMore: "Say more →", change: "Change" },
  sent: { heading: "Sent. Thank you.", line: "I read every note myself. If you left your email, I may reply.", sig: "— Nick", again: "Send another" },
  failed: "That didn't send. Try again?",
} as const;

export const FOUNDING_ART = "/images/founding-writers.png";

/** The four line faces (the reference's SVGs: frown, flat, smile, open grin). */
const FACE_PATH: Record<Mood, string> = {
  1: "M8 16c1-1.2 2.4-1.8 4-1.8s3 .6 4 1.8M9 9.5h.01M15 9.5h.01",
  2: "M8 15h8M9 9.5h.01M15 9.5h.01",
  3: "M8 14c1 1.3 2.4 2 4 2s3-.7 4-2M9 9.5h.01M15 9.5h.01",
  4: "M7.5 13.5c1 2.4 2.7 3.5 4.5 3.5s3.5-1.1 4.5-3.5zM9 9.5h.01M15 9.5h.01",
};
const Face: React.FC<{ mood: Mood }> = ({ mood }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d={FACE_PATH[mood]} /></svg>
);

export type FwState = "ask" | "noted" | "sent";

export interface Dash71FoundingProps {
  loading: boolean;
  state: FwState;
  /** the face shown as chosen: this week's answer, or the one pressed */
  chosen: Mood | null;
  /** a press is on its way to the server */
  sending: boolean;
  /** the last press was refused */
  failed: boolean;
  onChoose: (m: Mood) => void;
  onChange: () => void;
  /** "Tell us anything →", "Say more →" and "Send another" — the one feedback panel */
  onFeedback: () => void;
}

export const Dash71Founding: React.FC<Dash71FoundingProps> = ({ loading, state, chosen, sending, failed, onChoose, onChange, onFeedback }) => {
  if (loading) {
    return (
      <section className="d71-fw is-loading d58-skcard" data-sk="card" data-d58="panel" data-d71="fw" data-loading="1" aria-hidden="true">
        <div className="d71-fwframe">
          <div className="d71-fwband"><span>{FW_COPY.band}</span></div>
          <div className="d71-fwbody"><div className="d71-fwart" /><div className="d71-fwtxt" /></div>
        </div>
      </section>
    );
  }
  return (
    <section className="d71-fw" data-d58="panel" data-d71="fw" data-loading="0" data-state={state} aria-labelledby="d71-fw-h">
      <div className="d71-fwframe">
        <div className="d71-fwband" data-d71="fw-band">
          <span data-d71="fw-band-title">{FW_COPY.band}</span>
          <button type="button" className="d71-fwmore" data-d71="fw-more" onClick={onFeedback}>{FW_COPY.more}</button>
        </div>
        <div className="d71-fwbody" data-d71="fw-body">
          <div className="d71-fwart" data-d71="fw-art"><img src={FOUNDING_ART} alt="" draggable={false} /></div>
          <div className="d71-fwtxt" key={state} data-d71="fw-text">
            {state === "ask" && (
              <>
                <h2 className="d71-fwh" id="d71-fw-h" data-d71="fw-h">{FW_COPY.ask.heading}</h2>
                {failed
                  ? <p className="d71-fwline d71-fwfail" data-d71="fw-failed" role="status">{FW_COPY.failed}</p>
                  : <p className="d71-fwline" data-d71="fw-line">{FW_COPY.ask.line}</p>}
                <div className="d71-fwrow" data-d71="fw-row">
                  <span className="d71-sig d71-sig--full" data-d71="fw-sig">{FW_COPY.ask.sig}</span>
                  <div className="d71-faces" role="group" aria-label="How is QueryHawk going this week?" data-d71="fw-faces">
                    {MOODS.map((f) => (
                      <button
                        key={f.mood} type="button" className={`d71-face${chosen === f.mood ? " on" : ""}`}
                        data-d71="fw-face" data-mood={f.mood} data-label={f.label} aria-label={f.label}
                        aria-pressed={chosen === f.mood}
                        disabled={sending}
                        onClick={() => onChoose(f.mood)}
                      >
                        <Face mood={f.mood} />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            {state === "noted" && (
              <>
                <h2 className="d71-fwh" id="d71-fw-h" data-d71="fw-h">{FW_COPY.noted.heading}</h2>
                <p className="d71-fwline" data-d71="fw-line">{FW_COPY.noted.before}<b>{chosen ? moodLabel(chosen) : ""}</b>{FW_COPY.noted.after}</p>
                <div className="d71-fwrow" data-d71="fw-row">
                  <button type="button" className="d71-say" data-d71="fw-say" onClick={onFeedback}>{FW_COPY.noted.sayMore}</button>
                  <button type="button" className="d71-lnk" data-d71="fw-change" onClick={onChange}>{FW_COPY.noted.change}</button>
                </div>
              </>
            )}
            {state === "sent" && (
              <>
                <h2 className="d71-fwh" id="d71-fw-h" data-d71="fw-h">{FW_COPY.sent.heading}</h2>
                <p className="d71-fwline" data-d71="fw-line">{FW_COPY.sent.line}</p>
                <div className="d71-fwrow" data-d71="fw-row">
                  <span className="d71-sig" data-d71="fw-sig">{FW_COPY.sent.sig}</span>
                  <button type="button" className="d71-lnk" data-d71="fw-again" onClick={onFeedback}>{FW_COPY.sent.again}</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
