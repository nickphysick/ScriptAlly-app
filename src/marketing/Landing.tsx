/**
 * Landing — the public front page at "/" (design ref: design-refs/landing-v13.html,
 * pixel-authoritative). Hero (copy + scaled dashboard demo + Form 11 peek) → the parchment
 * features band → CTA band → footer. Pure presentation over static data — no Firebase, no
 * stores, no workspace imports.
 *
 * Action wiring: every "start" CTA opens Create account via the pre-auth hash transport
 * (#/signup — App.tsx renders Auth for it; a signed-in visitor is bounced straight to the
 * workspace instead). "See pricing"/Pricing → /pricing; "See what Pro adds" → /pricing;
 * the import-template link downloads the real template; the remaining row text-links point
 * at sign-up (the app is the explainer). Privacy/Terms are real public routes now.
 * The footer deliberately has NO Help link: /help is a workspace
 * route, so for a logged-out visitor it dead-ended on the signup screen (Tier 2 · Phase 3);
 * no marketing help page exists, and inventing one is a separate decision.
 */

import React, { useEffect } from "react";
import { Hero } from "./Hero";
import { FeatureRows } from "./FeatureRows";
import { CtaBand } from "./CtaBand";
import { MarketingFooter } from "./MarketingFooter";
import { DOCUMENT_TITLE, FeatureRow } from "./landingCopy";

const openSignup = () => { window.location.hash = "#/signup"; };

export const Landing: React.FC<{ onNavigate: (tab: string, subPageName?: string) => void }> = ({ onNavigate }) => {
  useEffect(() => {
    const prev = document.title;
    document.title = DOCUMENT_TITLE;
    return () => { document.title = prev; };
  }, []);

  const onRowLink = (row: FeatureRow) => {
    if (row.key === "import") {
      // The real import template served from public/ (same asset the in-app empty state offers).
      const a = document.createElement("a");
      a.href = "/ScriptAlly-pipeline-import-template.xlsx";
      a.download = "ScriptAlly-pipeline-import-template.xlsx";
      a.click();
      return;
    }
    if (row.key === "email") { onNavigate("pricing"); return; }
    openSignup();
  };

  return (
    <div>
      <Hero onStart={openSignup} onPricing={() => onNavigate("pricing")} />
      <FeatureRows onStart={openSignup} onRowLink={onRowLink} />
      <CtaBand onStart={openSignup} />
      {/* ⚠️ LINKS, NOT SPANS. These were inert text for as long as the pages did not exist — which
          is a worse answer than an unfinished page, because a reader cannot tell the difference
          between "no policy yet" and "the link is broken". The footer is now shared, so a page
          added to the site is reachable from every other page by construction. */}
      <MarketingFooter onNavigate={onNavigate} />
    </div>
  );
};
