/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FoundingPanel — the landing hero's primary action (design ref:
 * design-refs/scriptally-landing-v16.html `.found-panel`): a blush panel carrying the offer, the
 * sign-up and a way through to `/founders`.
 *
 * ⚠️ IT REPLACES THE HERO'S ACTIONS ROW, AND `Start tracking — it's free` IS GONE RATHER THAN
 * RELOCATED. Pre-launch there is no self-serve product to start, so a button offering one is a
 * door to a room that is not built. The founding list is the funnel until launch.
 *
 * ⚠️ THE BUTTON IS PINK HERE AND INK IN THE SEALED BAND, and that is the rule working rather than
 * an inconsistency. Primaries are pink on cream and parchment grounds, ink on pink ones. This
 * panel's ground is BLUSH; the band's is the pink itself, where a pink button would have nothing
 * to sit against.
 *
 * ⚠️ SAME FORM AS THE BAND AND AS `/founders` — `FoundingSignup`, one component in three places,
 * one list, one counter, one outcome. Sign up here and the band at the foot of the page is already
 * answered.
 */

import React from "react";
import {
  FOUNDING_PANEL_KICKER, FOUNDING_OFFER_LEAD, FOUNDING_OFFER_REST, FOUNDING_LEARN,
} from "./landingCopy";
import { FoundingSignup, FoundingCounter } from "./FoundingSignup";

export const FoundingPanel: React.FC<{
  onNavigate: (tab: string, subPageName?: string) => void;
}> = ({ onNavigate }) => (
  <div className="mk-found">
    <div className="mk-found-panel">
      <p className="mk-found-kick">{FOUNDING_PANEL_KICKER}</p>
      <p className="mk-offer">
        <strong>{FOUNDING_OFFER_LEAD}</strong> {FOUNDING_OFFER_REST}
      </p>

      <FoundingSignup
        idPrefix="mk-panel"
        formClass="mk-found-form"
        onNavigate={onNavigate}
      />

      {/* Counter left, the way through right. The counter renders nothing until there is a real
          figure, so this row can come out as just the link — which is what it does today. */}
      <div className="mk-found-foot">
        <FoundingCounter variant="line" />
        {/* ⚠️ A BUTTON, NOT AN ANCHOR. Marketing routes are driven by `onNavigate`; an `<a href>`
            would reload the app to reach a page it is already able to render. */}
        <button type="button" className="mk-found-learn" onClick={() => onNavigate("founders")}>
          {FOUNDING_LEARN}<span aria-hidden="true"> →</span>
        </button>
      </div>
    </div>
  </div>
);
