/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The public pricing page — marketing tier, `mk-` system, rendered for everyone.
 *
 * ⚠️ NOTHING ON THIS PAGE WRITES ANYTHING. The page it replaces was a developer sandbox that had
 * escaped onto a public route: it rendered `null` for logged-out visitors (a blank page inside the
 * marketing chrome, on the route the landing's own CTA points at), and offered signed-in ones an
 * "Activate Pro account now" button that wrote `plan: 'Pro'` straight to their user document. There
 * is no payment path in this product yet, so the honest surface is one that says so — the
 * `ComingSoonPill` pattern `PlansPage` already uses — and the only controls here are links to sign
 * up for the free tier, which genuinely exists.
 *
 * ⚠️ IT TAKES NO USER AND READS NO DB. That is what makes the logged-out render impossible to get
 * wrong a second time; the smoke test drives it logged out first for the same reason.
 */

import React, { useEffect } from "react";
import { PRICING_DOCUMENT_TITLE, PRICING_H1, PRICING_SUB, PRICING_TIERS, PRICING_FOOTNOTE } from "./landingCopy";
import { MarketingFooter } from "./MarketingFooter";

export const PricingPage: React.FC<{ onNavigate: (tab: string, subPageName?: string) => void }> = ({ onNavigate }) => {
  useEffect(() => {
    const prev = document.title;
    document.title = PRICING_DOCUMENT_TITLE;
    return () => { document.title = prev; };
  }, []);

  const openSignup = () => { window.location.hash = "#/signup"; };

  return (
    <div>
      <section className="mk-pricehead">
        <div className="mk-eyebrow">Plans</div>
        <h1>{PRICING_H1}</h1>
        <p>{PRICING_SUB}</p>
      </section>

      <section className="mk-pricegrid">
        {PRICING_TIERS.map((tier) => (
          <div key={tier.key} className={"mk-pricecard" + (tier.key === "pro" ? " mk-pricecard-pro" : "")}>
            <div className="mk-pricecardhead">
              <h2>{tier.name}</h2>
              {/* The Pro card states its price as copy and offers no control — see the docblock. */}
              <div className="mk-priceline">
                <span className="mk-priceamount">{tier.price}</span>
                {tier.priceNote && <span className="mk-pricenote">{tier.priceNote}</span>}
              </div>
              <p className="mk-pricesum">{tier.summary}</p>
            </div>

            <ul className="mk-pricelist">
              {tier.includes.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>

            <div className="mk-priceaction">
              {tier.key === "free" ? (
                <button type="button" className="mk-btn" onClick={openSignup}>{tier.action}</button>
              ) : (
                /* ⚠️ A PILL, NOT A BUTTON. No payment path exists, so a control here would either
                   do nothing or do the wrong thing. Both were true of the page this replaces. */
                <span className="mk-comingsoon">Coming soon</span>
              )}
            </div>
          </div>
        ))}
      </section>

      <p className="mk-pricefoot">{PRICING_FOOTNOTE}</p>

      <MarketingFooter onNavigate={onNavigate} />
    </div>
  );
};
