/**
 * Landing — the public front page at "/" (design ref: design-refs/landing-v13.html,
 * pixel-authoritative, except the feature rows — rebuilt to a written brief on 14 Sep). Hero → the
 * band header → the feature rows → the founding-members band → footer. Pure presentation over static
 * data — no Firebase, no stores, no workspace imports.
 *
 * ⚠️ THE PAGE CLOSES ON THE FOUNDING-MEMBERS LETTER, NOT ON A SECOND CTA BAND. `CtaBand` restated
 * the hero's "start tracking" three screens later; a page that ends by repeating its own opening
 * call to action is looping rather than closing.
 *
 * Action wiring: the feature rows carry no actions since that rebuild — an illustration, a heading
 * and a paragraph each — so the page's actions are the hero's founding panel, the founding band and
 * the nav. Privacy/Terms are real public routes now.
 * The footer deliberately has NO Help link: /help is a workspace
 * route, so for a logged-out visitor it dead-ended on the signup screen (Tier 2 · Phase 3);
 * no marketing help page exists, and inventing one is a separate decision.
 */

import React, { useEffect } from "react";
import { Hero } from "./Hero";
import { StatusBand } from "./StatusBand";
import { FeatureRows } from "./FeatureRows";
import { Vision } from "./Vision";
import { FoundingBand } from "./FoundingBand";
import { MarketingFooter } from "./MarketingFooter";
import { DOCUMENT_TITLE } from "./landingCopy";

export const Landing: React.FC<{ onNavigate: (tab: string, subPageName?: string) => void }> = ({ onNavigate }) => {
  useEffect(() => {
    const prev = document.title;
    document.title = DOCUMENT_TITLE;
    return () => { document.title = prev; };
  }, []);

  return (
    <div>
      <Hero onNavigate={onNavigate} />
      {/* ⚠️ THE SECOND SURFACE STARTS HERE AND RUNS TO THE FOOT OF THE PAGE. The hero is on the
          app's content ground above it and the boundary is marked by the colour change alone —
          there is deliberately no rule at the join. */}
      <div className="mk-lower">
        <StatusBand />
        <FeatureRows />
        {/* ⚠️ THE WHITE BAND SITS BETWEEN THE ROWS AND THE OFFER, AND THE ORDER IS THE ARGUMENT.
            The rows say what the product does; this says why it exists; the founding band asks for
            something. Moved above the rows it would ask a reader to care before they know what
            they are looking at, and below the offer nobody would reach it. */}
        <Vision onNavigate={onNavigate} />
        <FoundingBand onNavigate={onNavigate} />
      {/* ⚠️ LINKS, NOT SPANS. These were inert text for as long as the pages did not exist — which
          is a worse answer than an unfinished page, because a reader cannot tell the difference
          between "no policy yet" and "the link is broken". The footer is now shared, so a page
          added to the site is reachable from every other page by construction. */}
        <MarketingFooter onNavigate={onNavigate} />
      </div>
    </div>
  );
};
