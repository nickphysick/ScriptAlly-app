/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FoundersPage — `/founders` (design ref: design-refs/scriptally-founders-v4.html). The page the
 * landing hero's panel and the sealed band both point at: what a founding writer gets, what is
 * asked in return, and the same sign-up.
 *
 * ⚠️ IT MOUNTS `FoundingSignup` TWICE — once in the hero, once inside the sealed band at the foot
 * — so this is the page that forced the generalisation. Two forms on one document need two id
 * prefixes, and one shared store, or the page states two different counts and asks a reader who
 * has already signed up to do it again. See `FoundingSignup` and `foundingStore`.
 *
 * ⚠️ THE REF'S NAV IS A SIMPLIFIED STAND-IN AND IS NOT REPRODUCED. This page renders inside
 * `MarketingShell` like every other public route, and takes the shared footer with it.
 *
 * ⚠️ THE EARTH IS BARE — no rim, no caption, no tinted ground — which is why it does NOT go
 * through `MarketingIllustration`. That primitive exists to render placeholder chrome; this asset
 * arrived finished, and wrapping it would mean passing `finished` to switch off every part of the
 * component that does anything.
 */

import React, { useEffect } from "react";
import { Runs } from "./CopyRuns";
import { FoundingSignup, FoundingCounter } from "./FoundingSignup";
import { FoundingBand } from "./FoundingBand";
import { MarketingFooter } from "./MarketingFooter";
import {
  FOUNDERS_DOCUMENT_TITLE, FOUNDERS_EYEBROW, FOUNDERS_H1, FOUNDERS_LEDE, FOUNDERS_CTA,
  FOUNDERS_DEAL, FOUNDERS_HONEST_LEAD, FOUNDERS_HONEST, FOUNDERS_SIGNOFF,
} from "./foundersCopy";
import earth from "../assets/marketing/founders-earth.png";

export const FoundersPage: React.FC<{
  onNavigate: (tab: string, subPageName?: string) => void;
}> = ({ onNavigate }) => {
  useEffect(() => {
    const prev = document.title;
    document.title = FOUNDERS_DOCUMENT_TITLE;
    return () => { document.title = prev; };
  }, []);

  return (
    <div className="mk-fw">
      <div className="mk-fwpad">
        {/* ⚠️ `align-items: stretch` IS WHAT MAKES THE ARTWORK MATCH THE COPY, and it is why
            neither column declares a height. The earth is as tall as headline + lede + field
            because the row makes it so; a fixed height would decide the proportion from the wrong
            end and stop tracking the copy the moment the copy changes. */}
        <header className="mk-fwhero">
          <div className="mk-fwcol">
            <p className="mk-fweyebrow">{FOUNDERS_EYEBROW}</p>
            <h1 className="mk-fwh1">{FOUNDERS_H1}</h1>
            <p className="mk-fwlede"><Runs runs={FOUNDERS_LEDE} onNavigate={onNavigate} /></p>

            <FoundingSignup
              idPrefix="mk-fw"
              ctaLabel={FOUNDERS_CTA}
              formClass="mk-fwform"
              onNavigate={onNavigate}
            />
            <FoundingCounter variant="line" />
          </div>

          <div className="mk-fwillo">
            <img className="mk-fwearth" src={earth} alt="" />
          </div>
        </header>

        {/* Equal-height cards: `stretch` on the grid, flex-column inside, so three headings of
            different lengths do not push three bodies out of line with each other. */}
        <section className="mk-fwdeal" aria-label="What founding writers get">
          {FOUNDERS_DEAL.map((card) => (
            <div key={card.key} className={"mk-fwcard" + (card.highlight ? " mk-fwcard--hl" : "")}>
              <p className="mk-fwk">{card.kicker}</p>
              <h2>{card.heading}</h2>
              <p>{card.body}</p>
            </div>
          ))}
        </section>

        {/* ⚠️ A PULL-QUOTE ON THE PAGE GROUND, NOT A CARD. The parchment card that used to frame
            this is deleted — a bordered box around the one passage asking to be believed made it
            look like a disclaimer, which is the opposite of the register. Nothing here has a
            background, a border or a shadow; the 54ch measure and the centring are what hold it.
            ⚠️ AND THE `Full disclosure` LABEL IS GONE. A mono label above a lifted statement
            announces that a statement is coming; the statement announces itself. */}
        <section className="mk-fwhonest">
          {/* Decorative in full: it is a quotation mark, and the sentence beneath it is the
              quotation. A screen reader announcing it would be reading punctuation aloud. */}
          <p className="mk-fwmark" aria-hidden="true">&ldquo;</p>
          <p className="mk-fwlead">{FOUNDERS_HONEST_LEAD}</p>
          {FOUNDERS_HONEST.map((para, i) => (
            <p key={i}><Runs runs={para} onNavigate={onNavigate} /></p>
          ))}
          <p className="mk-fwsign">{FOUNDERS_SIGNOFF}</p>
        </section>
      </div>

      {/* ⚠️ THE SAME BAND, NOT A COPY. One list, one counter, one outcome — sign up in the hero
          above and this arrives already answered rather than asking again. */}
      <FoundingBand onNavigate={onNavigate} />
      <MarketingFooter onNavigate={onNavigate} />
    </div>
  );
};
