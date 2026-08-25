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
 * ⚠️ `How it works` IS PINNED BOTTOM-RIGHT INSIDE THE PANEL, AND THE PANEL'S BOTTOM PADDING EXISTS
 * TO CLEAR IT. The link is `position: absolute`; the 46px of padding beneath the counter is the
 * space it occupies. Reduce that padding and the link lands on top of the tally — it will not push
 * anything out of the way, because it is not in flow.
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
import { FoundingSignup, FoundingCounter } from "./FoundingSignup";

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
}> = ({ onNavigate }) => (
  <div className="mk-found">
    <div className="mk-found-panel">
      <p className="mk-fmkick">{FOUNDING_PANEL_KICKER}</p>
      <p className="mk-fmh"><Runs runs={FOUNDING_ASK} onNavigate={onNavigate} /></p>

      {/* ⚠️ A LIST, BECAUSE IT IS ONE. Three perks read as three items to a screen reader rather
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
      <FoundingSignup
        idPrefix="mk-panel"
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

      {/* Live or absent: nothing renders until a real figure comes back, so the panel closes on
          the form and the pinned link when there is no count — which is what it does today. */}
      <FoundingCounter variant="tally" />

      {/* ⚠️ A BUTTON, NOT AN ANCHOR. Marketing routes are driven by `onNavigate`; an `<a href>`
          would reload the app to reach a page it is already able to render. */}
      <button type="button" className="mk-fmlearn" onClick={() => onNavigate("founders")}>
        {FOUNDING_LEARN}<span aria-hidden="true"> →</span>
      </button>
    </div>
  </div>
);
