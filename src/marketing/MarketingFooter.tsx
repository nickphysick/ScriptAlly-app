/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MarketingFooter — ONE footer for every public page.
 *
 * ⚠️ IT REPLACES THREE COPIES, WHICH IS THE POINT. `Landing.tsx`, `PricingPage.tsx` and
 * `LegalPage.tsx` each drew their own `.mk-foot` with a DIFFERENT set of links, which is exactly how
 * About and Contact would have gone unreachable from two of them. Adding a page is one edit here.
 *
 * Rebuilt 17 Sep: a full-width band on its own ground, the brand column beside Product, Company
 * and Legal, and a three-cell base line.
 */

import React from "react";
import { FOOTER_TAGLINE, SUPPORT_EMAIL } from "../lib/companyInfo";
import { BRAND_MARK, artUrl } from "./brandArt";
import { PaperPlane, StatusGlyph, STATUS_GLYPH_COUNT } from "./marketingMarks";

export const MarketingFooter: React.FC<{
  onNavigate: (tab: string, subPageName?: string) => void;
}> = ({ onNavigate }) => {
  /* ⚠️ `#/login`, NOT `#/signup`. The nav stopped pointing at account creation because there is no
     self-serve product behind it yet (see `marketingNav.ts`); this link was the one place in the
     chrome still opening it. App.tsx turns `#/login` into sign-in for a visitor and into the
     dashboard for someone already signed in, which is what "Open QueryHawk" means to both. */
  const openApp = () => { window.location.hash = "#/login"; };

  /* Features is an in-page anchor on "/" and the way home from anywhere else — the nav's own rule,
     restated, so the two links named Features cannot behave differently. */
  const toFeatures = () => {
    if (window.location.pathname === "/") {
      document.getElementById("mk-features")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      onNavigate("landing");
    }
  };

  return (
    <footer className="mk-foot">
      <div className="mk-footinner">
        <div className="mk-footgrid">
          <div className="mk-footbrand">
            {/* The hawk keeps `alt=""`: the name beside it already says QueryHawk, and saying it
                twice is noise to a screen reader. The name is type, not the nav's drawn wordmark —
                the brief sets it at a size and a weight, which only type has. */}
            <div className="mk-brand">
              <img
                className="mk-footmark"
                src={artUrl(BRAND_MARK)}
                alt=""
                width={BRAND_MARK.width}
                height={BRAND_MARK.height}
                loading="lazy"
              />
              <span className="mk-wordmark">QueryHawk</span>
            </div>
            <p className="mk-foottag">{FOOTER_TAGLINE}</p>
            {/* A signature, not a control: the six states restate nothing a reader needs, so the
                whole row is hidden from the accessibility tree. */}
            <div className="mk-footglyphs" aria-hidden="true">
              {Array.from({ length: STATUS_GLYPH_COUNT }, (_, i) => <StatusGlyph key={i} index={i} />)}
            </div>
          </div>

          <div className="mk-footcol">
            <h4>Product</h4>
            <ul>
              <li><button type="button" onClick={toFeatures}>Features</button></li>
              <li><button type="button" onClick={() => onNavigate("pricing")}>Pricing</button></li>
              <li><button type="button" onClick={openApp}>Open QueryHawk</button></li>
            </ul>
          </div>

          <div className="mk-footcol">
            <h4>Company</h4>
            <ul>
              <li><button type="button" onClick={() => onNavigate("about")}>About</button></li>
              <li><button type="button" onClick={() => onNavigate("founders")}>Founding writers</button></li>
              <li><button type="button" onClick={() => onNavigate("contact")}>Contact</button></li>
            </ul>
          </div>

          <div className="mk-footcol">
            <h4>Legal</h4>
            <ul>
              <li><button type="button" onClick={() => onNavigate("privacy")}>Privacy</button></li>
              <li><button type="button" onClick={() => onNavigate("terms")}>Terms</button></li>
            </ul>
          </div>
        </div>

        <div className="mk-footbase">
          {/* The year is read rather than written: a hardcoded one is wrong every January, and it
              is the single value here that has a correct answer the app already knows. */}
          <p>© {new Date().getFullYear()} QueryHawk</p>
          <p className="mk-footmade"><PaperPlane />Made in the UK, for writers</p>
          {/* ⚠️ `SUPPORT_EMAIL`, NOT hello@queryhawk.ink. On 17 Sep that domain did not resolve at all
              (NXDOMAIN, no MX record), so mail sent to it would bounce — and the privacy policy
              names `SUPPORT_EMAIL` as the address for a UK GDPR request, so a second address here
              would publish a route nothing else honours. When the new mailbox exists, changing the
              constant moves every surface at once. */}
          <a className="mk-footmail" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </div>
      </div>
    </footer>
  );
};
