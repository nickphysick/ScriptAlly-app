/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The public pricing page — marketing tier, `mk-` system, rendered for everyone.
 * Design ref: design-refs/scriptally-pricing-v2.html.
 *
 * ⚠️ NOTHING ON THIS PAGE WRITES ANYTHING. The page it replaces was a developer sandbox that had
 * escaped onto a public route: it rendered `null` for logged-out visitors (a blank page inside the
 * marketing chrome, on the route the landing's own CTA points at), and offered signed-in ones an
 * "Activate Pro account now" button that wrote `plan: 'Pro'` straight to their user document.
 *
 * ⚠️ IT TAKES NO USER AND READS NO DB. That is what makes the logged-out render impossible to get
 * wrong a second time; the smoke test drives it logged out first for the same reason.
 *
 * ⚠️ THREE TIERS, AND THE MIDDLE ONE IS THE ONLY ONE THAT CAN BE ACTED ON. Free and Pro cannot be
 * bought — there is no payment path — so they are `aria-disabled`, dimmed, and their calls to
 * action are LABELS rather than controls: no `role`, no `tabindex`, nothing in the tab order. A
 * greyed-out button still announces itself as a button and still invites the click it will refuse.
 * The order is by what a reader can DO, not by price, which is why Founding sits in the middle.
 *
 * ⚠️ AND NO SWITCHING SCRIPT. The ref draws the tiers as though they were tabs; two of the three
 * lead nowhere, so a tab set here would be chrome pretending at a choice that does not exist.
 *
 * ⚠️ THE PLACES BAR IS THE SHARED COUNTER, LIVE OR ABSENT. `FoundingCounter` reads the one store
 * the hero panel and the sealed band read, so the three surfaces cannot state different numbers —
 * and it renders NOTHING until a real figure comes back. The ref hardcodes "37 of 100 places
 * claimed"; on a public page that is a factual claim about how many people have signed up, made by
 * nobody and checkable by nobody.
 */

import React, { useEffect } from "react";
import {
  PRICING_DOCUMENT_TITLE, PRICING_EYEBROW, PRICING_H1, PRICING_SUB, PRICING_TIERS,
  PRICING_PLACES_NOTE, PRICING_PLACES_LINK, PRICING_FOOTNOTE,
  PRICING_COMPARISON_H2, PRICING_COMPARISON, PRICING_FAQ_H2, PRICING_FAQ, PricingTier,
} from "./landingCopy";
import { Runs } from "./CopyRuns";
import { FoundingCounter } from "./FoundingSignup";
import { MarketingFooter } from "./MarketingFooter";

/**
 * Each tier's bird. The words live in `PRICING_TIERS` (`illoAlt`); the file, its pixel size and its
 * hash live here — the same split `FeatureRows` uses, so copy stays in copy modules and asset facts
 * stay next to each other.
 *
 * ⚠️ THE VERSION IS THE FILE'S OWN md5 AND RIDES THE URL. Nothing under `public/` is fingerprinted
 * by the build and hosting lets a browser keep a file for an hour, so a re-export under the same
 * name is served stale. A smoke test reads both sides.
 */
const TIER_ART: Record<string, { src: string; version: string; width: number; height: number }> = {
  free: { src: "/images/tier-free.png", version: "6c11c444", width: 800, height: 800 },
  founding: { src: "/images/tier-founding.png", version: "e9d308a4", width: 800, height: 800 },
  pro: { src: "/images/tier-pro.png", version: "a11fb5f2", width: 800, height: 800 },
};

const Tier: React.FC<{ tier: PricingTier; onNavigate: (tab: string, sub?: string) => void }> = ({ tier, onNavigate }) => {
  const live = tier.cta === "live";
  const art = TIER_ART[tier.key];
  return (
    <div
      className={`mk-tier mk-tier--${tier.key}`}
      /* ⚠️ ONLY THE UNBUYABLE TIERS CARRY THIS, and it is what the CSS dims on — one attribute
         driving both the semantics and the treatment, so they cannot drift apart. */
      aria-disabled={live ? undefined : true}
    >
      {tier.tag && <span className="mk-tiertag">{tier.tag}</span>}
      {/* ⚠️ PERCHED ON THE CORNER, OUT OF FLOW (17 Sep). The fixed-height slot this replaced existed
          so three birds drawn at three scales could not push three plan names onto three lines;
          positioned absolutely, they cannot push anything at all. It stays here in the source, ahead
          of the name, so a screen reader meets the bird where it always has. */}
      <img
        className="mk-tierbird"
        src={art.src + "?v=" + art.version}
        alt={tier.illoAlt}
        width={art.width}
        height={art.height}
        loading="lazy"
      />
      <p className="mk-tiername">{tier.name}</p>
      <p className="mk-tierline">{tier.summary}</p>

      <div className="mk-tierprice">
        <span className="mk-tieramount">{tier.price}</span>
        {tier.priceUnit && <span className="mk-tierper">{tier.priceUnit}</span>}
        {tier.priceNote && <span className="mk-tierper">{tier.priceNote}</span>}
      </div>
      <p className="mk-tierafter"><Runs runs={tier.after} onNavigate={onNavigate} /></p>

      <ul className="mk-tierfeats">
        {tier.includes.map((f) => <li key={f}>{f}</li>)}
        {/* ⚠️ SHOWN AND MUTED, NOT OMITTED — and each carries its own sub-line. What a tier does
            not have is the reason to read the next card along; leaving it out makes three lists
            that look the same length, and showing a greyed-out name alone says something is
            missing without saying what. */}
        {tier.excludes?.map((f) => (
          <li key={f.label} className="mk-tieroff">
            {f.label}
            <span className="mk-tieroffnote">{f.note}</span>
          </li>
        ))}
      </ul>

      {live && <div className="mk-tierplaces"><FoundingCounter variant="tally" /></div>}

      <div className="mk-tiercta">
        {live ? (
          <>
            <button type="button" className="mk-btn mk-btn--ink" onClick={() => onNavigate("founders")}>
              {tier.action}
            </button>
            <p className="mk-tiernote">Closes at 100 · no card needed</p>
          </>
        ) : (
          /* A label. Not a button, not a disabled button, not a link. */
          <span className="mk-tierlater">{tier.action}</span>
        )}
      </div>
    </div>
  );
};

export const PricingPage: React.FC<{ onNavigate: (tab: string, subPageName?: string) => void }> = ({ onNavigate }) => {
  useEffect(() => {
    const prev = document.title;
    document.title = PRICING_DOCUMENT_TITLE;
    return () => { document.title = prev; };
  }, []);

  return (
    <div>
      <header className="mk-pricehead">
        <p className="mk-eyebrow">{PRICING_EYEBROW}</p>
        <h1>{PRICING_H1}</h1>
        <p>{PRICING_SUB}</p>
      </header>

      <div className="mk-pricebody">
        <section className="mk-tiers">
          {PRICING_TIERS.map((tier) => <Tier key={tier.key} tier={tier} onNavigate={onNavigate} />)}
        </section>

        <p className="mk-pricefoot">
          {PRICING_PLACES_NOTE}{" "}
          <button type="button" className="mk-tlink" onClick={() => onNavigate("founders")}>
            {PRICING_PLACES_LINK}<span aria-hidden="true"> →</span>
          </button>
        </p>
        <p className="mk-pricefoot mk-pricefoot--quiet">{PRICING_FOOTNOTE}</p>

        <section className="mk-cmp">
          <h2>{PRICING_COMPARISON_H2}</h2>
          {/* ⚠️ THE TABLE SCROLLS INSIDE ITS OWN BOX RATHER THAN WIDENING THE PAGE. Four columns of
              prose cannot be made narrow enough for 390px, and a page that scrolls sideways is a
              worse answer than a table that does. */}
          <div className="mk-cmpscroll">
            <table>
              <thead>
                <tr>
                  <th>Feature</th>
                  <th className="mk-c">Free</th>
                  <th className="mk-c mk-colfound">Founding</th>
                  <th className="mk-c">Pro</th>
                </tr>
              </thead>
              <tbody>
                {PRICING_COMPARISON.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td className="mk-c">{row.free}</td>
                    <td className="mk-c mk-colfound">{row.founding}</td>
                    <td className="mk-c">{row.pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mk-faq">
          <h2>{PRICING_FAQ_H2}</h2>
          {PRICING_FAQ.map((qa) => (
            <div className="mk-qa" key={qa.q}>
              <p className="mk-q">{qa.q}</p>
              <p className="mk-a">{qa.a}</p>
            </div>
          ))}
        </section>
      </div>

      <MarketingFooter onNavigate={onNavigate} />
    </div>
  );
};
