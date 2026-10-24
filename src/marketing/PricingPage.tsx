/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The public pricing page — marketing tier, `mk-` system, rendered for everyone.
 * Design ref: design-refs/pricing-page-v2.html (24 Oct), ported wholesale. It supersedes
 * pricing-page-v1.html and scriptally-pricing-v2.html for this route; the signed-in /plans page is a
 * different page with its own sources and is untouched.
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
 * ⚠️ THE PAGE OPENS ON THE FOUNDING BOX, laid across the join between the ink below the nav and the
 * light sheet. Its counter sits above the form and is live or absent: the ref hardcodes "63 places
 * left" at 37%; `FoundingCounter` renders nothing until a real figure comes back.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  PRICING_DOCUMENT_TITLE, PV4_KICKER, PV4_H1, PV4_SUB, PV4_MORE, PV4_LESS, PV4_PERKS,
  PV4_STEPS_H, PV4_STEPS, type Pv4Perk, PV4_LAUNCH_LINE, PV4_FREE, PV4_PRO,
  PRO_FROM, PV4_FAQ_H2, PV4_FAQ, PV4_SOURCE_NOTE, PRO_PLANS, PLANS_TITLE, PLANS_SUB, planMonths,
  planPrice, planTileLine, SUIT_LINK, SUIT_HIDE,
} from "./pricingCopy";
import { FoundingSignup, FoundingCounter } from "./FoundingSignup";
import { CampaignJourney } from "./CampaignJourney";
import { Runs } from "./CopyRuns";
import { FOUNDING_ART, artUrl } from "./brandArt";

/** A price as the ref draws it: an optional "from", a small £, the figure, an optional unit. */
const Price: React.FC<{ amount: string; from?: string; per?: string }> = ({ amount, from, per }) => (
  <div className="mk-pv4price">
    {from && <span className="mk-pv4from">{from}</span>}
    <span className="mk-pv4cur">£</span>
    <span className="mk-pv4amt">{amount}</span>
    {per && <span className="mk-pv4per">{per}</span>}
  </div>
);

/**
 * ⚠️ THE QUESTIONS SCROLL INTO VIEW IN SCRIPT, NEVER BY CHANGING THE HASH. The app reads
 * `location.hash` for its pre-auth routes (`#/login`, `#/signup`), so a page that writes a hash of
 * its own is one listener away from being read as a route. The FAQ link keeps `href="#how-long"` for
 * the no-script reading and the address a reader copies.
 */
const scrollToQuestions = () => {
  const target = document.getElementById("how-long");
  if (!target) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
};

/** The four perk cards' line drawings — the ref's inline SVGs, path for path. */
const PERK_ICON: Record<Pv4Perk["icon"], React.ReactNode> = {
  gift: <><path d="M20 12v9H4v-9" /><path d="M2 7h20v5H2z" /><path d="M12 21V7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></>,
  chat: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M8 9h8M8 13h5" /></>,
  import: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /><path d="M12 18v-6M9 15l3 3 3-3" /></>,
  people: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M17 4.5a3.5 3.5 0 0 1 0 7" /><path d="M18.5 14.5A6.5 6.5 0 0 1 21.5 20" /></>,
};

/**
 * The founding box: the page's opening, laid across the boundary between the ink below the nav and
 * the light sheet (ref `.fb.fb--a`, pricing-page-v2).
 *
 * ⚠️ THE TOGGLE IS A REAL DISCLOSURE: a button with `aria-expanded` and `aria-controls`, and the panel
 * it controls is `hidden` until it opens — not a height animation over content a screen reader can
 * already reach. The panel comes BEFORE the toggle in the DOM, so when it opens the toggle is at its
 * foot, as the ref draws it.
 *
 * ⚠️ THE COUNTER IS LIVE OR ABSENT (`FoundingCounter variant="left"`), and the form is the shared
 * `FoundingSignup` — the same component and states as the landing's. Neither is forked here.
 */
const FoundingBox: React.FC<{ onNavigate: (tab: string, subPageName?: string) => void }> = ({ onNavigate }) => {
  const [open, setOpen] = useState(false);
  return (
    <section className={"mk-fb" + (open ? " mk-fb--open" : "")} aria-labelledby="mk-pv4-h1">
      <div className="mk-fbtext">
        <span className="mk-fbtag">{PV4_KICKER}</span>
        <h1 id="mk-pv4-h1" className="mk-fbh1">{PV4_H1}</h1>
        <p className="mk-fbsub">{PV4_SUB}</p>
        <div className="mk-fbcount"><FoundingCounter variant="left" /></div>
        {/* ⚠️ `source` IS "sealed-band" BECAUSE THE SERVER'S SOURCE SET IS CLOSED: an unknown value
            folds to `unknown`. A pricing source needs `functions/src/waitlistModel.ts` and a prod
            functions deploy — flagged in the reports rather than invented. */}
        <FoundingSignup idPrefix="mk-pricing" source="sealed-band" formClass="mk-fbform" onNavigate={onNavigate} />
      </div>
      {/* Decorative — the box states the offer in words — so `alt=""` inside an `aria-hidden` panel.
          It is the ref's older hawk showing a young hawk the way, mirrored so the older one points
          left, towards the text. Hidden below 640px. */}
      <div className="mk-fbpanel" aria-hidden="true">
        <img
          className="mk-fbart"
          src={artUrl(FOUNDING_ART)}
          alt=""
          width={FOUNDING_ART.width}
          height={FOUNDING_ART.height}
        />
      </div>
      <div className="mk-fbdetail" id="mk-fbdetail" hidden={!open}>
        <div className="mk-fbgrid">
          {PV4_PERKS.map((p) => (
            <div className="mk-fbd" key={p.icon}>
              <span className="mk-fbi" aria-hidden="true">
                <svg viewBox="0 0 24 24">{PERK_ICON[p.icon]}</svg>
              </span>
              <div>
                <h3 className="mk-fbdh">{p.title}</h3>
                <p className="mk-fbdp">{p.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mk-fbsteps">
          <p className="mk-fbstepsh">{PV4_STEPS_H}</p>
          <ol>
            {PV4_STEPS.map((t, i) => <li key={t}><span aria-hidden="true">{i + 1}</span>{t}</li>)}
          </ol>
        </div>
      </div>
      <button
        type="button"
        className="mk-fbmore"
        aria-expanded={open}
        aria-controls="mk-fbdetail"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="mk-fbmorelbl">{open ? PV4_LESS : PV4_MORE}</span>
        <svg className="mk-fbchev" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" /></svg>
      </button>
    </section>
  );
};

export const PricingPage: React.FC<{ onNavigate: (tab: string, subPageName?: string) => void }> = ({ onNavigate }) => {
  useEffect(() => {
    const prev = document.title;
    document.title = PRICING_DOCUMENT_TITLE;
    return () => { document.title = prev; };
  }, []);

  /* "Which plan suits me best?": the questions are hidden until the link (or the FAQ's link) opens
     them; the plan they arrive at turns its tile navy. Their answers survive closing them. */
  const [suitOpen, setSuitOpen] = useState(false);
  const [fit, setFit] = useState<number | null>(null);
  const [focusKey, setFocusKey] = useState(0);
  const pending = useRef(false);
  const openQuestions = () => { pending.current = true; setSuitOpen(true); };
  const toggleQuestions = () => (suitOpen ? setSuitOpen(false) : openQuestions());
  /* Once the opened questions have rendered: bring them into view, then put focus on the first
     question — after the scroll has had a moment, as the ref does, so focus does not fight it. */
  useEffect(() => {
    if (!suitOpen || !pending.current) return;
    pending.current = false;
    scrollToQuestions();
    const t = window.setTimeout(() => setFocusKey((k) => k + 1), 400);
    return () => window.clearTimeout(t);
  }, [suitOpen]);
  const onFaqLink = (e: React.MouseEvent) => {
    e.preventDefault();
    if (suitOpen) scrollToQuestions(); else openQuestions();
  };
  const onFit = useCallback((m: number) => setFit(m), []);

  return (
    <div className="mk-pv4">
      <FoundingBox onNavigate={onNavigate} />

      {/* ── Then, once we launch: the two tiers, hanging over the band's lower edge ── */}
      <section className="mk-pv4soon" aria-labelledby="mk-pv4-launch">
        <p id="mk-pv4-launch" className="mk-pv4launch">{PV4_LAUNCH_LINE}</p>
        <div className="mk-pv4tiers">
          <article className="mk-pv4tier mk-pv4tier--free">
            <h2 className="mk-pv4tname">{PV4_FREE.name}</h2>
            <Price amount={PV4_FREE.price} />
            <p className="mk-pv4tsub">{PV4_FREE.sub}</p>
            <ul className="mk-pv4tlist">
              {PV4_FREE.list.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </article>
          <article className="mk-pv4tier mk-pv4tier--pro">
            <h2 className="mk-pv4tname">{PV4_PRO.name}</h2>
            <Price amount={PRO_FROM} from={PV4_PRO.from} per={PV4_PRO.per} />
            <p className="mk-pv4tsub">{PV4_PRO.sub}</p>
            <ul className="mk-pv4tlist">
              <li className="mk-pv4plus">{PV4_PRO.plus}</li>
              {PV4_PRO.list.map((f) => <li key={f}>{f}</li>)}
            </ul>
            <p className="mk-pv4flex">{PV4_PRO.flex}</p>
          </article>
        </div>

        {/* ── Pro plans: one hairline container round the four plans and the questions. The prices are
            the one table in `pricingCopy.ts`. ── */}
        <div className="mk-pv4plans">
          <div className="mk-pv4phead">
            <div>
              <h2 className="mk-pv4ptitle">{PLANS_TITLE}</h2>
              <p className="mk-pv4psub">{PLANS_SUB}</p>
            </div>
            <button
              type="button"
              className="mk-pv4suit"
              aria-expanded={suitOpen}
              aria-controls="how-long"
              onClick={toggleQuestions}
            >
              {suitOpen ? SUIT_HIDE : SUIT_LINK}
            </button>
          </div>
          <ul className="mk-pv4pgrid">
            {PRO_PLANS.map((p) => {
              const line = planTileLine(p);
              return (
                <li className={"mk-pv4ptile" + (p.months === fit ? " mk-pv4ptile--fit" : "")} key={p.months} data-m={p.months}>
                  <p className="mk-pv4pname">{planMonths(p.months)}</p>
                  <b className="mk-pv4pprice">{planPrice(p)}</b>
                  <small className="mk-pv4pline">{line.lead}{line.save && <em>{line.save}</em>}</small>
                </li>
              );
            })}
          </ul>

          {/* ── Which plan suits me best? — hidden until the link opens it ── */}
          <div className="mk-pv4how" id="how-long" hidden={!suitOpen}>
            <CampaignJourney onFit={onFit} focusKey={focusKey} />
            <p className="mk-pv4source"><Runs runs={PV4_SOURCE_NOTE} onNavigate={onNavigate} /></p>
          </div>
        </div>
      </section>

      {/* ── Questions ── */}
      <section className="mk-pv4sect" aria-labelledby="mk-pv4-faq">
        <h2 id="mk-pv4-faq" className="mk-pv4h2">{PV4_FAQ_H2}</h2>
        <div className="mk-pv4faq">
          {PV4_FAQ.map((qa) => (
            <div className="mk-pv4qa" key={qa.q}>
              <p className="mk-pv4q">{qa.q}</p>
              <p className="mk-pv4a">
                {qa.a.map((r, i) => typeof r === "string"
                  ? <React.Fragment key={i}>{r}</React.Fragment>
                  : <a key={i} className="mk-pv4suitlink" href="#how-long" onClick={onFaqLink}>{r.suit}</a>)}
              </p>
            </div>
          ))}
        </div>
      </section>
      <div className="mk-pv4end" aria-hidden="true" />
    </div>
  );
};
