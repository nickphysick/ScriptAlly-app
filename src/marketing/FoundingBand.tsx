/**
 * FoundingBand — the page's closing offer (design ref: design-refs/scriptally-landing-v13.html
 * `.beta`): a parchment letter on a soft-pink band, sealed with wax.
 *
 * It REPLACES `CtaBand`, which restated the hero's "start tracking" three screens later. A page
 * that ends by repeating its own opening CTA is not closing, it is looping.
 *
 * ⚠️ THE SEAL IS THE ONE BURGUNDY FILL AT SCALE ON THIS SITE, and that is an exception worth
 * naming rather than a colour rule being relaxed. Every other burgundy fill in `marketing.css` is
 * a mark under 12px — the Pro tag, the status dot, the pinned-note pin, a few hairlines at half
 * opacity. The exception is about SIZE, not hue, and it does not travel: no button is
 * burgundy-filled, here or anywhere.
 *
 * ⚠️ THE BUTTON IS INK, ON A PINK GROUND, AND THAT CROSSES THE HOUSE GRAMMAR ON PURPOSE. The rule
 * was "ink in the nav, pink for page primaries"; it generalises rather than breaks — primaries are
 * pink on cream and parchment grounds, ink on pink ones. A pink button on this band would have
 * nothing to sit against.
 *
 * ⚠️ THE FORM ITSELF IS `FoundingSignup`, MOUNTED HERE — one component, three places on the site.
 * The chrome is this file's; the field, the states, the announcement and the count are shared, so
 * signing up in the landing hero's panel leaves this band already answered rather than asking a
 * second time. Copying the form instead would give the site three sign-ups that drift apart.
 *
 * ⚠️ THE COUNTER IS LIVE OR ABSENT. There is no bar, no number and no placeholder until a real
 * figure comes back from the endpoint. A fabricated scarcity number on a public page is a factual
 * claim about how many people have signed up, and it is one nobody could check.
 *
 * ⚠️ THE SUBMIT PATH IS WIRED AND WILL FAIL, AND THAT IS THE CORRECT BEHAVIOUR TODAY. There is no
 * `/api/waitlist` rewrite on either app host and the `waitlist` function is deployed on neither
 * project, so every attempt classifies as `down` — "sign-ups are briefly unavailable", form
 * hidden, a real address offered. See `waitlist.ts` for why the status code cannot be trusted to
 * tell us that: a missing route here answers **200 with `text/html`**, so `res.ok` is `true` for a
 * route that does not exist.
 */

import React from "react";
import { Runs } from "./CopyRuns";
import {
  FOUNDING_EYEBROW, FOUNDING_HEADING, FOUNDING_BLURB,
} from "./landingCopy";
import { FoundingSignup, FoundingCounter } from "./FoundingSignup";
import sealMark from "../assets/marketing/founding-seal-mark-placeholder.png";

export const FoundingBand: React.FC<{
  onNavigate: (tab: string, subPageName?: string) => void;
}> = ({ onNavigate }) => (
  <section className="mk-beta" aria-labelledby="mk-band-h">
    <div className="mk-betacard">
      {/* The wax seal, breaking the card's top edge. Decorative in full: the blob, the ring and
          the mark say nothing the heading beneath them does not. */}
      <span className="mk-wax" aria-hidden="true">
        <span className="mk-waxblob">
          <svg viewBox="0 0 92 92">
            <path d="M46 3c12 0 20 5 28 12s15 18 15 31-5 22-12 30-18 13-31 13-22-5-30-12S3 59 3 46 8 24 15 16 34 3 46 3z" />
            <circle cx="46" cy="46" r="32" />
          </svg>
        </span>
        <img src={sealMark} alt="" />
      </span>

      <p className="mk-betaeyebrow">{FOUNDING_EYEBROW}</p>
      <h2 id="mk-band-h">{FOUNDING_HEADING}</h2>
      <p className="mk-betablurb">{FOUNDING_BLURB}</p>

      <FoundingSignup
        idPrefix="mk-band"
        source="sealed-band"
        formClass="mk-betaform"
        onNavigate={onNavigate}
      />
      <FoundingCounter variant="bar" />

    </div>
  </section>
);
