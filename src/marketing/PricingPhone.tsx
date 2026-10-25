/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PricingPhone — public /pricing at and below 760px (pricing on phones, 25 Oct; ref
 * design-refs/pricing-page-mobile-v1.html, the PAGE inside one of its 390 × 844 phones). Above 760px
 * `PricingPage` renders the v4 desktop tree and this is not mounted at all.
 *
 * ⚠️ IT REUSES, NEVER FORKS. Every word is read from `pricingCopy.ts` (the few phone-only ones are in
 * its "On phones" block), every figure from its plan table, the estimate from `campaignEstimate.ts`,
 * and the counter and the claim form are the shared `FoundingCounter` and `FoundingSignup` over the
 * one `foundingStore` — the same state machine as the landing, the band and the desktop box.
 *
 * ⚠️ THE REF'S REVIEW CHROME IS NOT HERE: its grey sheet, bezels, status row, captions, stand-in nav
 * (58px, hamburger) and stand-in footer. The page renders inside `MarketingShell`, under the real
 * phone nav (60px, the founding pill) and above the real footer. The ref's phone is its own scroll
 * container; here the WINDOW scrolls, so every offset the ref reads from `.scroll` is read from the
 * window.
 *
 * ⚠️ THE COUNTER IS LIVE OR ABSENT. The ref hardcodes "63 places left" at 37%; `FoundingCounter`
 * renders nothing until a real figure comes back, and nothing that depends on the figure shows
 * without one.
 */
import React, { useState } from "react";
import {
  PV4_KICKER, PV4_H1, PV4_SUB, PV4_MORE, PV4_LESS, PV4_PERKS, PV4_STEPS_H, PV4_STEPS,
} from "./pricingCopy";
import { FoundingSignup, FoundingCounter } from "./FoundingSignup";
import { FOUNDING_ART, artUrl } from "./brandArt";
import { PERK_ICON } from "./pricingParts";

type Nav = (tab: string, subPageName?: string) => void;

/** The current perk for a carousel scrolled `left` px, cards `card` px wide with the ref's 10px gap. */
export const perkIndex = (left: number, card: number, count: number): number =>
  card > 0 ? Math.min(count - 1, Math.max(0, Math.round(left / (card + 10)))) : 0;

/**
 * The founding box, straddling the ink and the oat (ref `.fbx`).
 *
 * ⚠️ THE TOGGLE IS A REAL DISCLOSURE: a button with `aria-expanded` and `aria-controls`, the panel
 * `hidden` until it opens. The panel comes before the toggle in the DOM, so open, the toggle ("Show
 * less") sits at the panel's foot on the same paper, as the ref draws it.
 */
const FoundingBoxPhone: React.FC<{ onNavigate: Nav }> = ({ onNavigate }) => {
  const [open, setOpen] = useState(false);
  const [perk, setPerk] = useState(0);
  return (
    <section className={"mk-pvbox" + (open ? " mk-pvbox--open" : "")} aria-labelledby="mk-pvm-h1">
      {/* Decorative — the box states the offer in words. Mirrored, so the hawks face the headline. */}
      <img
        className="mk-pvart"
        src={artUrl(FOUNDING_ART)}
        alt=""
        aria-hidden="true"
        width={FOUNDING_ART.width}
        height={FOUNDING_ART.height}
      />
      <div className="mk-pvin">
        <span className="mk-pvtag">{PV4_KICKER}</span>
        <h1 id="mk-pvm-h1" className="mk-pvh1">{PV4_H1}</h1>
        <p className="mk-pvsub">{PV4_SUB}</p>
        <div className="mk-pvcount"><FoundingCounter variant="left" /></div>
        {/* ⚠️ `source` IS "sealed-band", AS ON THE DESKTOP BOX: the server's source set is closed. */}
        <FoundingSignup idPrefix="mk-pricing" source="sealed-band" formClass="mk-pvform" onNavigate={onNavigate} />
      </div>
      <div className="mk-pvdetail" id="mk-pvdetail" hidden={!open}>
        <div
          className="mk-pvperks"
          onScroll={(e) => {
            const el = e.currentTarget;
            const card = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0;
            setPerk(perkIndex(el.scrollLeft, card, PV4_PERKS.length));
          }}
        >
          {PV4_PERKS.map((p) => (
            <div className="mk-pvperk" key={p.icon}>
              <span className="mk-pvperki" aria-hidden="true"><svg viewBox="0 0 24 24">{PERK_ICON[p.icon]}</svg></span>
              <h3 className="mk-pvperkh">{p.title}</h3>
              <p className="mk-pvperkp">{p.body}</p>
            </div>
          ))}
        </div>
        <div className="mk-pvdots" aria-hidden="true">
          {PV4_PERKS.map((p, i) => <i key={p.icon} className={i === perk ? "mk-on" : undefined} />)}
        </div>
        <div className="mk-pvsteps">
          <p className="mk-pvstepsh">{PV4_STEPS_H}</p>
          <ol>
            {PV4_STEPS.map((t, i) => <li key={t}><span aria-hidden="true">{i + 1}</span>{t}</li>)}
          </ol>
        </div>
      </div>
      <button
        type="button"
        className="mk-pvmore"
        aria-expanded={open}
        aria-controls="mk-pvdetail"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="mk-pvmorelbl">{open ? PV4_LESS : PV4_MORE}</span>
        <svg className="mk-pvchev" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" /></svg>
      </button>
    </section>
  );
};

export const PricingPhone: React.FC<{ onNavigate: Nav }> = ({ onNavigate }) => (
  <div className="mk-pvm">
    <FoundingBoxPhone onNavigate={onNavigate} />
  </div>
);
