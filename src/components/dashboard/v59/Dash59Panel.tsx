/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v59 — THE FOUNDING WRITER PANEL (ref design-refs/dashboard-v59/dashboard-v59.html `.fw`).
 *
 * Shown to every account: every beta account is a founding writer. A white card with a navy band —
 * the dashboard's own rim and frame — that thanks the writer and takes a one-tap weekly pulse.
 * "Tell us anything →" and "Say more →" open the app's ONE feedback panel (`FeedbackDock`, through
 * `lib/feedbackStore`).
 *
 * ⚠️ THE COPY IS FIXED (the pack's table). No pricing countdown and no sign-up count, ever.
 * ⚠️ NO NATIVE `title` ANYWHERE IN THE PANEL: the faces' labels and the dots' weeks are drawn
 * tooltips, shown on hover and on `:focus-visible`.
 * ⚠️ NOTHING IS EVER CUT. The panel is a size container; its tiers (dash59.css) take the art, the
 * dots, the caption and the note's sentences away in a fixed order, and never the heading, the
 * faces or the signature.
 */
import React from "react";
import { MOODS, dotLabel, type Mood } from "../../../lib/weeklyPulse";

export const PANEL_COPY = {
  band: "— FOUNDING WRITER —",
  more: "Tell us anything →",
  heading: "The early bird gets the worm.",
  note1: "Thank you for helping shape QueryHawk for future writers.",
  note2: "Finding it useful? We’d love to hear your feedback!",
  sig: "— Nick, founder",
  caption: "This week?",
  noted: "Noted — thank you.",
  sayMore: "Say more →",
  change: "Change",
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

export type PulseState = "idle" | "sending" | "noted" | "failed";

export interface Dash59PanelProps {
  loading: boolean;
  /** four weeks ago … this week; null = no answer (or not read yet) */
  history: (Mood | null)[];
  /** the face shown as chosen (pressed, or this week's stored answer) */
  chosen: Mood | null;
  state: PulseState;
  onChoose: (m: Mood) => void;
  onChange: () => void;
  onFeedback: () => void;
}

export const Dash59Panel: React.FC<Dash59PanelProps> = ({ loading, history, chosen, state, onChoose, onChange, onFeedback }) => {
  if (loading) {
    return (
      <section className="d59-fw is-loading d58-skcard" data-sk="card" data-d58="panel" data-loading="1" aria-hidden="true">
        <div className="d59-fwframe">
          <div className="d59-fwband"><span className="d58-sk">{PANEL_COPY.band}</span></div>
          <div className="d59-fwbody"><div className="d59-fwart" /><div className="d59-fwtxt"><span className="d58-sk d59-skh" /><span className="d58-sk d59-skn" /><span className="d58-sk d59-skn" /></div></div>
        </div>
      </section>
    );
  }
  const noted = state === "noted";
  return (
    <section className={`d59-fw${noted ? " is-noted" : ""}`} data-d58="panel" data-loading="0" data-state={state} aria-labelledby="d59-fw-h">
      <div className="d59-fwframe">
        <div className="d59-fwband" data-d58="panel-band">
          <span>{PANEL_COPY.band}</span>
          <button type="button" className="d59-fwmore" data-d58="panel-more" onClick={onFeedback}>{PANEL_COPY.more}</button>
        </div>
        <div className="d59-fwbody">
          <div className="d59-fwart" data-d58="panel-art"><img src={FOUNDING_ART} alt="" /></div>
          <div className="d59-fwtxt">
            <h2 className="d59-fwh" id="d59-fw-h" data-d58="panel-h">{PANEL_COPY.heading}</h2>
            <p className="d59-fwnote" data-d58="panel-note"><span data-d58="panel-note1">{PANEL_COPY.note1}</span> <span data-d58="panel-note2">{PANEL_COPY.note2}</span></p>
            <div className="d59-fwrow" data-d58="panel-row">
              <span className="d59-sig" data-d58="panel-sig">{PANEL_COPY.sig}</span>
              <div className="d59-mood" role="group" aria-label="How is QueryHawk going this week?">
                <span className="d59-hist" data-d58="panel-hist" aria-label="Previous weeks">
                  {history.map((m, i) => (
                    <i key={i} data-m={m ?? ""} className={i === 4 ? "now" : undefined} data-tip={dotLabel(i, m)} />
                  ))}
                </span>
                {!noted && <span className="d59-cap" data-d58="panel-cap">{PANEL_COPY.caption}</span>}
                <div className="d59-faces" data-d58="panel-faces">
                  {MOODS.filter((f) => !noted || f.mood === chosen).map((f) => (
                    <button
                      key={f.mood} type="button" className={`d59-face${chosen === f.mood ? " on" : ""}`}
                      data-d58="panel-face" data-mood={f.mood} data-label={f.label} aria-label={f.label}
                      aria-pressed={chosen === f.mood}
                      disabled={state === "sending"}
                      onClick={() => { if (!noted) onChoose(f.mood); }}
                    >
                      <Face mood={f.mood} />
                    </button>
                  ))}
                </div>
                {noted && (
                  <span className="d59-noted" data-d58="panel-noted" aria-live="polite">
                    <b>{PANEL_COPY.noted}</b>
                    <button type="button" className="d59-say" data-d58="panel-say" onClick={onFeedback}>{PANEL_COPY.sayMore}</button>
                    <button type="button" className="d59-chg" data-d58="panel-change" onClick={onChange}>{PANEL_COPY.change}</button>
                  </span>
                )}
              </div>
            </div>
            {state === "failed" && <p className="d59-failed" data-d58="panel-failed" role="status">{PANEL_COPY.failed}</p>}
          </div>
        </div>
      </div>
    </section>
  );
};
