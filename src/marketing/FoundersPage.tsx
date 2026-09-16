/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FoundersPage — `/founders`. The page the landing band points at: what a founding writer gets,
 * what is asked in return, and the same sign-up.
 *
 * ⚠️ IT MOUNTS `FoundingSignup` TWICE — once in the hero, once inside the band at the foot — so
 * this is the page that forced the generalisation. Two forms on one document need two id
 * prefixes, and one shared store, or the page states two different counts and asks a reader who
 * has already signed up to do it again. See `FoundingSignup` and `foundingStore`.
 *
 * ⚠️ THE HERO AND THE BAND NOW RENDER THE SAME FORM, THE SAME FINE PRINT AND THE SAME COUNTER,
 * which is why the hero no longer passes a `ctaLabel`. It said "Become a Founding Writer" — the
 * NAV's words for the link that brings a reader here — above a form on the page they had already
 * reached. Both say "Claim your place" now, because both do the same thing.
 *
 * ⚠️ THE ARTWORK CARRIES REAL ALT TEXT, AND THE EARTH IT REPLACES DID NOT. `founders-earth.png`
 * was decorative — a globe beside a headline about building a world — and is DELETED from
 * `src/assets/marketing/` rather than left as an unimported file. This picture is the page's
 * argument stated as a picture, so a reader who cannot see it gets the argument.
 *
 * ⚠️ IT DOES NOT GO THROUGH `MarketingIllustration`, AND THAT IS UNCHANGED FROM THE EARTH. The
 * asset is finished and renders bare — no rim, no caption, no tinted ground. That primitive
 * exists to draw the chrome that says an asset has NOT arrived; wrapping this one would mean
 * passing `finished` to switch off every part of the component that does anything.
 *
 * ⚠️ THE REF'S NAV IS A SIMPLIFIED STAND-IN AND IS NOT REPRODUCED. This page renders inside
 * `MarketingShell` like every other public route, and takes the shared footer with it.
 */

import React, { useEffect } from "react";
import { Runs } from "./CopyRuns";
import { FoundingSignup, FoundingCounter } from "./FoundingSignup";
import { FoundingBand } from "./FoundingBand";
import { MarketingFooter } from "./MarketingFooter";
import {
  FOUNDERS_DOCUMENT_TITLE, FOUNDERS_EYEBROW, FOUNDERS_H1, FOUNDERS_LEDE, FOUNDERS_ART_ALT,
  FOUNDERS_DEAL, FOUNDERS_HONEST_LEAD, FOUNDERS_HONEST, FOUNDERS_SIGNOFF,
} from "./foundersCopy";

/**
 * The artwork's own facts. The version is the first eight hex digits of the file's md5 and rides
 * the URL: nothing under `public/` is fingerprinted by the build and prod hosting lets a browser
 * keep a file for an hour, so a replaced file would otherwise be served stale. Replace the file,
 * change the version — a smoke test reads the hash back against the file on disk.
 */
const ART = { src: "/images/off-the-ground.png", version: "430029d2", width: 1200, height: 1200 };

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
        {/* ⚠️ `align-items: center` NOW, WHERE IT WAS `stretch`. The old row made the earth exactly
            as tall as the copy beside it, which is what a `max-height` illustration wants; this
            artwork sizes itself from the column's width and the two columns are simply centred
            against each other. A `stretch` here would hand the picture a height it has no way to
            use and reintroduce the crop the earth needed `object-fit` to avoid. */}
        <header className="mk-fwhero">
          <div className="mk-fwcol">
            <p className="mk-fweyebrow">{FOUNDERS_EYEBROW}</p>
            <h1 className="mk-fwh1">{FOUNDERS_H1}</h1>
            <p className="mk-fwlede"><Runs runs={FOUNDERS_LEDE} onNavigate={onNavigate} /></p>

            <FoundingSignup
              idPrefix="mk-fw"
              source="founders-hero"
              formClass="mk-claimform"
              onNavigate={onNavigate}
            />
            {/* ⚠️ THE SAME COUNTER THE BAND DRAWS, not a second shape for one number. This hero
                showed the pricing card's compact `tally` while the band showed something else, so
                one figure had two appearances on one page. Width is a wrapper-scoped override in
                the stylesheet — the component is reused, never restyled in place. */}
            <FoundingCounter variant="claim" />
          </div>

          <img
            className="mk-fwart"
            src={ART.src + "?v=" + ART.version}
            alt={FOUNDERS_ART_ALT}
            width={ART.width}
            height={ART.height}
          />
        </header>

        {/* Equal-height cards: `stretch` on the grid, flex-column inside, so three headings of
            different lengths do not push three bodies out of line with each other. */}
        <section className="mk-fwdeal" aria-label="What founding writers get">
          {FOUNDERS_DEAL.map((card) => (
            <div key={card.key} className="mk-fwcard">
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
