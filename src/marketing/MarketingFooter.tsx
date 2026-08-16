/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MarketingFooter — ONE footer for every public page (refs: scriptally-about.html and its three
 * siblings, whose footers are byte-identical to each other).
 *
 * ⚠️ IT REPLACES THREE COPIES, WHICH IS THE POINT. `Landing.tsx`, `PricingPage.tsx` and
 * `LegalPage.tsx` each drew their own `.mk-foot` with a DIFFERENT set of links: the landing had
 * Pricing/Privacy/Terms, pricing had Home/Privacy/Terms, and the legal pages showed whichever of
 * Terms and Privacy you were not already reading. Three footers that disagreed about what the site
 * contains — which is exactly how About and Contact would have gone unreachable from two of them.
 * Adding a page is now one edit here.
 *
 * ⚠️ THE COMPANY COLUMN IS THE NEW ONE. Product / Company / Legal, per the ref; the base row
 * states the year and the host and nothing else.
 */

import React from "react";
import { FOOTER_TAGLINE, SITE_HOST } from "./companyInfo";

export const MarketingFooter: React.FC<{
  onNavigate: (tab: string, subPageName?: string) => void;
}> = ({ onNavigate }) => {
  const openSignup = () => { window.location.hash = "#/signup"; };

  return (
    <footer className="mk-foot">
      <div className="mk-footgrid">
        <div className="mk-footbrand">
          <div className="mk-brand">
            <span className="mk-monogram">S</span>
            <span className="mk-wordmark">ScriptAlly</span>
          </div>
          <p className="mk-foottag">{FOOTER_TAGLINE}</p>
        </div>

        <div className="mk-footcol">
          <h4>Product</h4>
          <button type="button" onClick={() => onNavigate("pricing")}>Pricing</button>
          <button type="button" onClick={openSignup}>Open ScriptAlly</button>
        </div>

        <div className="mk-footcol">
          <h4>Company</h4>
          <button type="button" onClick={() => onNavigate("about")}>About</button>
          <button type="button" onClick={() => onNavigate("contact")}>Contact</button>
        </div>

        <div className="mk-footcol">
          <h4>Legal</h4>
          <button type="button" onClick={() => onNavigate("privacy")}>Privacy</button>
          <button type="button" onClick={() => onNavigate("terms")}>Terms</button>
        </div>
      </div>

      <div className="mk-footbase">
        {/* The year is read rather than written: a hardcoded one is wrong every January, and it is
            the single value on this page that has a correct answer the app already knows. */}
        <span>© {new Date().getFullYear()} ScriptAlly · Made in the UK</span>
        <span>{SITE_HOST}</span>
      </div>
    </footer>
  );
};
