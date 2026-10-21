/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The public pricing page — marketing tier, `mk-` system, rendered for everyone.
 * Design ref: design-refs/pricing-page-v1.html (21 Oct), ported wholesale. It supersedes
 * scriptally-pricing-v2.html for this route; the signed-in /plans page is a different page with its
 * own sources and is untouched.
 *
 * ⚠️ NOTHING ON THIS PAGE WRITES ANYTHING EXCEPT THE FOUNDING CLAIM FORM — the same component and
 * the same store the landing uses. No buy buttons, no payment path, no plan switching. The page it
 * descends from once rendered `null` to logged-out visitors and offered signed-in ones a button
 * that wrote to their user document; the smoke test drives it logged out first.
 *
 * ⚠️ IT TAKES NO USER AND READS NO DB. The counter and the form read `foundingStore`, a module-scope
 * store over a public endpoint, exactly as the landing's do.
 *
 * ⚠️ THE PAGE DESCRIBES THE PLANS PLANNED FOR LAUNCH, under "Then, once we launch:". It changes no
 * entitlement, limit or gate in the app; the copy for it lives in `pricingCopy.ts`, which /plans
 * never reads.
 *
 * ⚠️ THE COUNTER SITS ABOVE THE FORM, AND IT IS LIVE OR ABSENT. The ref hardcodes "63 places left"
 * at 37%; `FoundingCounter` renders nothing until a real figure comes back.
 */

import React, { useEffect } from "react";
import {
  PRICING_V3_DOCUMENT_TITLE, PV3_KICKER, PV3_H1, PV3_SUB, PV3_LAUNCH_LINE, PV3_FREE, PV3_PRO,
  PRO_FROM, PV3_FAQ_H2, PV3_FAQ, PV3_SOURCE_NOTE,
} from "./pricingCopy";
import { FoundingSignup, FoundingCounter } from "./FoundingSignup";
import { CampaignJourney } from "./CampaignJourney";
import { Runs } from "./CopyRuns";

/** A price as the ref draws it: an optional "from", a small £, the figure, an optional unit. */
const Price: React.FC<{ amount: string; from?: string; per?: string }> = ({ amount, from, per }) => (
  <div className="mk-pv3price">
    {from && <span className="mk-pv3from">{from}</span>}
    <span className="mk-pv3cur">£</span>
    <span className="mk-pv3amt">{amount}</span>
    {per && <span className="mk-pv3per">{per}</span>}
  </div>
);

/**
 * ⚠️ THE "How long will I need?" LINK SCROLLS IN SCRIPT, NOT BY CHANGING THE HASH. The app reads
 * `location.hash` for its pre-auth routes (`#/login`, `#/signup`), so a page that writes a hash of
 * its own is one listener away from being read as a route. `href` stays for the no-script reading
 * and the address a reader copies.
 */
export const scrollToJourney = (e: React.MouseEvent) => {
  const target = document.getElementById("how-long");
  if (!target) return;
  e.preventDefault();
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
};

export const PricingPage: React.FC<{ onNavigate: (tab: string, subPageName?: string) => void }> = ({ onNavigate }) => {
  useEffect(() => {
    const prev = document.title;
    document.title = PRICING_V3_DOCUMENT_TITLE;
    return () => { document.title = prev; };
  }, []);

  return (
    <div className="mk-pv3">
      {/* ── The navy band the tiers hang from ── */}
      <section className="mk-pv3band" aria-labelledby="mk-pv3-h1">
        <span className="mk-pv3kicker">{PV3_KICKER}</span>
        <h1 id="mk-pv3-h1" className="mk-pv3h1">{PV3_H1}</h1>
        <p className="mk-pv3sub">{PV3_SUB}</p>
        {/* ⚠️ THE `tally` VARIANT, BECAUSE IT IS THE REF'S SHAPE: a 5px bar and one mono line. Its
            wording is the shared component's ("37/100 places claimed"), not the ref's hardcoded
            "63 places left · no card needed" — the component and its words are not this page's to
            fork. The counter renders nothing until a figure comes back, so the wrapper holds no
            height of its own. */}
        <div className="mk-pv3count"><FoundingCounter variant="tally" /></div>
        {/* ⚠️ `source` IS "sealed-band" BECAUSE THE SERVER'S SOURCE SET IS CLOSED: an unknown value
            folds to `unknown`. A `pricing-banner` source needs `functions/src/waitlistModel.ts` and a
            prod functions deploy — flagged in reports/pricing-v3/REPORT.md rather than invented. */}
        <FoundingSignup
          idPrefix="mk-pricing"
          source="sealed-band"
          formClass="mk-pv3form"
          onNavigate={onNavigate}
        />
      </section>

      {/* ── Then, once we launch: the two tiers, hanging over the band's lower edge ── */}
      <section className="mk-pv3soon" aria-labelledby="mk-pv3-launch">
        <p id="mk-pv3-launch" className="mk-pv3launch">{PV3_LAUNCH_LINE}</p>
        <div className="mk-pv3tiers">
          <article className="mk-pv3tier mk-pv3tier--free">
            <h2 className="mk-pv3tname">{PV3_FREE.name}</h2>
            <Price amount={PV3_FREE.price} />
            <p className="mk-pv3tsub">{PV3_FREE.sub}</p>
            <ul className="mk-pv3tlist">
              {PV3_FREE.list.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </article>
          <article className="mk-pv3tier mk-pv3tier--pro">
            <h2 className="mk-pv3tname">{PV3_PRO.name}</h2>
            <Price amount={PRO_FROM} from={PV3_PRO.from} per={PV3_PRO.per} />
            <p className="mk-pv3tsub">{PV3_PRO.sub}</p>
            <ul className="mk-pv3tlist">
              <li className="mk-pv3plus">{PV3_PRO.plus}</li>
              {PV3_PRO.list.map((f) => <li key={f}>{f}</li>)}
            </ul>
            <p className="mk-pv3flex">{PV3_PRO.flex}</p>
            <a className="mk-pv3tlink" href="#how-long" onClick={scrollToJourney}>{PV3_PRO.link}</a>
          </article>
        </div>
      </section>

      {/* ── How long will I need? — the target of the Pro tier's link ── */}
      <section className="mk-pv3sect mk-pv3how" id="how-long">
        <CampaignJourney />
        <p className="mk-pv3source"><Runs runs={PV3_SOURCE_NOTE} onNavigate={onNavigate} /></p>
      </section>

      {/* ── Questions ── */}
      <section className="mk-pv3sect" aria-labelledby="mk-pv3-faq">
        <h2 id="mk-pv3-faq" className="mk-pv3h2">{PV3_FAQ_H2}</h2>
        <div className="mk-pv3faq">
          {PV3_FAQ.map((qa) => (
            <div className="mk-pv3qa" key={qa.q}>
              <p className="mk-pv3q">{qa.q}</p>
              <p className="mk-pv3a">{qa.a}</p>
            </div>
          ))}
        </div>
      </section>
      <div className="mk-pv3end" aria-hidden="true" />
    </div>
  );
};
