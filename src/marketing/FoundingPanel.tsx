/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FoundingPanel — the landing hero's primary action (design ref:
 * design-refs/scriptally-landing-v10-panel.html `.fmini`): kicker, the ask, three perks, the
 * sign-up, a progress bar and a way through to `/founders`.
 *
 * ⚠️ IT REPLACES THE HERO'S ACTIONS ROW, AND `Start tracking — it's free` IS GONE RATHER THAN
 * RELOCATED. Pre-launch there is no self-serve product to start, so a button offering one is a
 * door to a room that is not built. The founding list is the funnel until launch.
 *
 * ⚠️ THE BUTTON IS INK HERE AND ALSO INK IN THE SEALED BAND, and that is the grammar rather than a
 * coincidence: primaries are pink on cream and parchment grounds, ink on pink ones. Both of these
 * sit on blush.
 *
 * ⚠️ THE PANEL IS CENTRED THROUGHOUT AND EVERYTHING IN IT IS IN FLOW. `How it works` used to be
 * pinned bottom-right with `position: absolute`, which is why the panel carried 46px of bottom
 * padding it did not otherwise need; it now sits in the form's row and the padding is gone with
 * it. Nothing here is positioned, so nothing here needs space reserved for it.
 *
 * ⚠️ AND THE LINK LEAVES WHEN THE FORM DOES. An outcome replaces the whole row, so a reader who
 * has just claimed a spot is told what happens next by the confirmation rather than being sent off
 * to read about it. The predicate is `formIsVisible`, the primitive's own — restating the list of
 * states here would be two lists to keep in step.
 *
 * ⚠️ SAME FORM AS THE BAND AND AS `/founders` — `FoundingSignup`, one component in three places,
 * one list, one counter, one outcome. Sign up here and the band at the foot of the page is already
 * answered.
 */

import React from "react";
import { Runs } from "./CopyRuns";
import {
  FOUNDING_PANEL_KICKER, FOUNDING_ASK, FOUNDING_PERKS, FOUNDING_PANEL_CTA, FOUNDING_LEARN,
  FOUNDING_PANEL_SENT_H, FOUNDING_PANEL_SENT_B, FOUNDING_PANEL_DUPE_H, FOUNDING_PANEL_DUPE_B,
  FOUNDING_PANEL_ERROR, FOUNDING_PANEL_DOWN,
} from "./landingCopy";
import { FoundingSignup, FoundingCounter, formIsVisible } from "./FoundingSignup";
import { useFounding } from "./foundingStore";

/**
 * The two outcomes worth celebrating, in the same treatment: a sage block with a solid burgundy
 * disc and a parchment tick.
 *
 * ⚠️ THE DISC AND ITS TICK ARE DRAWN, NOT TYPED — a rotated pair of borders inside a circle, the
 * same construction as the perks' ticks. A `✓` glyph would be announced, and the text beside it
 * already says what happened.
 */
const Ok: React.FC<{ head: string; body: string }> = ({ head, body }) => (
  <div className="mk-fmok">
    <span className="mk-fmokmark" aria-hidden="true" />
    <div>
      <p className="mk-fmokh">{head}</p>
      <p className="mk-fmokb">{body}</p>
    </div>
  </div>
);

export const FoundingPanel: React.FC<{
  onNavigate: (tab: string, subPageName?: string) => void;
  /**
   * ⚠️ TAKEN AS A PROP SO `.mk-found` CAN BE THE GRID ITEM ITSELF. It used to be wrapped in a
   * `<div className="mk-r mk-r4">` inside the hero, which made the WRAPPER the grid item — so the
   * `grid-row` / `grid-column` on `.mk-found` applied to a non-item and was discarded in silence.
   * Measured: the panel came out 578px wide inside the copy column instead of 768 across the full
   * width, and the form row wrapped because of it. The entrance stagger has to ride the same
   * element, which is why it arrives here rather than being hard-coded.
   */
  className?: string;
}> = ({ onNavigate, className }) => {
  /* ⚠️ THE LINK LIVES IN THE FORM'S ROW AND LEAVES WITH IT. An outcome replaces the row in place,
     so the way through goes too — it belongs to the ask, and a reader who has just claimed a spot
     is being told what happens next by the confirmation, not sent off to read about it. The
     predicate is the primitive's, imported rather than restated: two lists of states would drift
     the first time one was added. */
  const showForm = formIsVisible(useFounding().state);
  return (
  <div className={"mk-found" + (className ? " " + className : "")}>
    <div className="mk-found-panel">
      <p className="mk-fmkick">{FOUNDING_PANEL_KICKER}</p>
      <p className="mk-fmh"><Runs runs={FOUNDING_ASK} onNavigate={onNavigate} /></p>

      {/* ⚠️ ABOVE THE FORM, SO THE OFFER IS READ BEFORE THE ASK — it was beneath it, which put the
          reason to sign up after the thing to sign up with.
          ⚠️ A LIST, BECAUSE IT IS ONE. Three perks read as three items to a screen reader rather
          than as one run-on sentence, and the ticks are drawn by CSS (a rotated border on
          `::before`) rather than typed — a glyph would be announced. */}
      <ul className="mk-fmperks">
        {FOUNDING_PERKS.map((perk) => <li key={perk}>{perk}</li>)}
      </ul>

      {/* ⚠️ THE SAME STATE MACHINE, THIS SURFACE'S WORDING. `foundingStore` decides which state;
          `messages` decides what the panel says in it, and the sealed band keeps its own. The
          form is not appended to on success — it is REPLACED, because `HIDES_FORM` stops rendering
          it, which makes the action feel consumed and forecloses a double submit structurally
          rather than by disabling a button. */}
      <div className="mk-fmrow">
        <FoundingSignup
          idPrefix="mk-panel"
          source="landing-panel"
          ctaLabel={FOUNDING_PANEL_CTA}
          formClass="mk-fmform"
          messages={{
            sent: <Ok head={FOUNDING_PANEL_SENT_H} body={FOUNDING_PANEL_SENT_B} />,
            dupe: <Ok head={FOUNDING_PANEL_DUPE_H} body={FOUNDING_PANEL_DUPE_B} />,
            error: <p className="mk-fmwarn"><Runs runs={FOUNDING_PANEL_ERROR} onNavigate={onNavigate} /></p>,
            down: <p className="mk-fmwarn"><Runs runs={FOUNDING_PANEL_DOWN} onNavigate={onNavigate} /></p>,
          }}
          onNavigate={onNavigate}
        />
        {/* ⚠️ A BUTTON, NOT AN ANCHOR. Marketing routes are driven by `onNavigate`; an `<a href>`
            would reload the app to reach a page it is already able to render. */}
        {showForm && (
          <button type="button" className="mk-fmlearn" onClick={() => onNavigate("founders")}>
            {FOUNDING_LEARN}<span aria-hidden="true"> →</span>
          </button>
        )}
      </div>

      {/* Live or absent: nothing renders until a real figure comes back, so the panel closes on
          the form row when there is no count — which is what it does today. */}
      <FoundingCounter variant="tally" />
    </div>
  </div>
  );
};
