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
} from "./landingCopy";
import { FoundingSignup, FoundingCounter } from "./FoundingSignup";

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

      <FoundingSignup
        idPrefix="mk-panel"
        ctaLabel={FOUNDING_PANEL_CTA}
        formClass="mk-fmform"
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
