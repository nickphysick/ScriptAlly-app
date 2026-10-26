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
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  PV4_KICKER, PV4_H1, PV4_SUB, PV4_MORE, PV4_LESS, PV4_PERKS, PV4_STEPS_H, PV4_STEPS,
  PV4_LAUNCH_LINE, PV4_FREE, PV4_PRO, TAB_FREE_SMALL, TAB_PRO_SMALL, SUIT_LINK, PV4_FAQ_H2, PV4_FAQ,
  LADDER_DEFAULT,
} from "./pricingCopy";
import { FoundingSignup, FoundingCounter, formIsVisible } from "./FoundingSignup";
import { useFounding } from "./foundingStore";
import { foundingPlacesLeftLabel, FOUNDING_CTA } from "./landingCopy";
import { FOUNDING_ART, artUrl } from "./brandArt";
import { PERK_ICON } from "./pricingParts";
import { FreeCard, ProCard, Compass, type Months } from "./PricingPlans";
import { PlanSheetPhone } from "./PlanSheetPhone";

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
const FoundingBoxPhone: React.FC<{ onNavigate: Nav; formArea: React.RefObject<HTMLDivElement | null> }> = ({ onNavigate, formArea }) => {
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
      <div className="mk-pvin" ref={formArea}>
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

const reduceMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const scrollBehavior = (): ScrollBehavior => (reduceMotion() ? "auto" : "smooth");

/** The tab an arrow key moves to: two tabs, so left / right / Home / End each land on one. */
export const tabStep = (from: number, key: string): number | null =>
  key === "ArrowRight" || key === "ArrowLeft" ? 1 - from : key === "Home" ? 0 : key === "End" ? 1 : null;

/**
 * Then, once we launch, on a phone (pricing ladder, 26 Oct; ref design-refs/pricing-phone-plans-v1.html,
 * layout A): a Free / Pro switch pinned at the top of the section while it scrolls, and ONE plan at a
 * time beneath it. Pro is open on arrival. Each tab carries its plan's price, so Free is never out of
 * sight. There is no swiping.
 *
 * ⚠️ IT REPLACES THE FREE / PRO SWIPE TRACK AND THE PHONE'S PRO PLANS SECTION, BOTH DELETED. The Pro
 * card is the desktop's (`PricingPlans.tsx`): the same ladder, the same small print, the same link —
 * which here opens the questions sheet.
 * ⚠️ THE TABS ARE A REAL TABLIST: roving focus (only the selected tab is in the tab order), the arrow
 * keys move between them and select as they go, each panel is a `tabpanel` labelled by its tab, and the
 * hidden panel is `hidden`, not merely moved.
 * ⚠️ PINNED UNDER THE NAV (`top: var(--mk-nav-h)`) for as long as the section is on screen — the sticky
 * element's range is this section, so it lets go when the questions below arrive.
 */
const PlansPhone = React.forwardRef<HTMLElement, {
  tab: number; onTab: (i: number) => void;
  selected: Months; fit: Months | null; onSelect: (m: Months) => void;
  onSuit: (opener: HTMLElement) => void;
}>(({ tab, onTab, selected, fit, onSelect, onSuit }, ref) => {
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const to = tabStep(tab, e.key);
    if (to === null) return;
    e.preventDefault();
    onTab(to);
    e.currentTarget.querySelectorAll<HTMLElement>("[role=tab]")[to]?.focus();
  };
  const tabBtn = (i: number, id: string, name: string, small: string) => (
    <button
      type="button"
      role="tab"
      id={`mk-pvtab-${id}`}
      aria-selected={tab === i}
      aria-controls={`mk-pvpanel-${id}`}
      tabIndex={tab === i ? 0 : -1}
      onClick={() => onTab(i)}
    >
      <span>{name}</span><small>{small}</small>
    </button>
  );
  return (
    <section className="mk-pvlaunch" aria-labelledby="mk-pvm-launch" ref={ref}>
      <p id="mk-pvm-launch" className="mk-pvlaunchh">{PV4_LAUNCH_LINE}</p>
      <div className="mk-pvtabs">
        <div className="mk-pvtabsin" role="tablist" aria-labelledby="mk-pvm-launch" data-on={tab} onKeyDown={onKey}>
          <span className="mk-pvtabsthumb" aria-hidden="true" />
          {tabBtn(0, "free", PV4_FREE.name, TAB_FREE_SMALL)}
          {tabBtn(1, "pro", PV4_PRO.name, TAB_PRO_SMALL)}
        </div>
      </div>
      <div className="mk-pvpanel" role="tabpanel" id="mk-pvpanel-free" aria-labelledby="mk-pvtab-free" hidden={tab !== 0}>
        <FreeCard />
      </div>
      <div className="mk-pvpanel" role="tabpanel" id="mk-pvpanel-pro" aria-labelledby="mk-pvtab-pro" hidden={tab !== 1}>
        <ProCard
          selected={selected}
          fit={fit}
          onSelect={onSelect}
          suit={
            <button type="button" className="mk-lsuit" aria-haspopup="dialog" onClick={(e) => onSuit(e.currentTarget)}>
              <Compass />{SUIT_LINK}
            </button>
          }
        />
      </div>
    </section>
  );
});
PlansPhone.displayName = "PlansPhone";

/**
 * Questions, as an accordion: each question a button with `aria-expanded`, its answer beneath it.
 * The answer to "Which plan should I choose?" carries the link that opens the questions sheet.
 */
const FaqPhone: React.FC<{ onSuit: (opener: HTMLElement) => void }> = ({ onSuit }) => {
  const [open, setOpen] = useState<ReadonlySet<number>>(new Set());
  const flip = (i: number) => setOpen((o) => { const n = new Set(o); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  return (
    <section className="mk-pvfaq" aria-labelledby="mk-pvm-faq">
      <h2 id="mk-pvm-faq" className="mk-pvfaqh">{PV4_FAQ_H2}</h2>
      <div>
        {PV4_FAQ.map((qa, i) => (
          <div className={"mk-pvqa" + (open.has(i) ? " mk-pvqa--open" : "")} key={qa.q}>
            <button type="button" aria-expanded={open.has(i)} aria-controls={`mk-pvqa-${i}`} onClick={() => flip(i)}>
              <span>{qa.q}</span>
              <span className="mk-pvpm" aria-hidden="true"><svg viewBox="0 0 12 12"><path d="M6 1v10M1 6h10" /></svg></span>
            </button>
            <p className="mk-pvqaa" id={`mk-pvqa-${i}`} hidden={!open.has(i)}>
              {qa.a.map((r, k) => typeof r === "string"
                ? <React.Fragment key={k}>{r}</React.Fragment>
                : <a key={k} className="mk-pvsuitlink" href="#" aria-haspopup="dialog"
                     onClick={(e) => { e.preventDefault(); onSuit(e.currentTarget); }}>{r.suit}</a>)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

/**
 * The sticky sign-up: a slim ink bar 14px off the bottom of the screen once the claim form has
 * scrolled out of view (ref .stick). Its button scrolls back to the top and focuses the email field.
 *
 * ⚠️ IT SHOWS ONLY WHEN IT CAN SAY SOMETHING TRUE AND DO SOMETHING USEFUL: never without a live
 * figure (it states the places left), never once the form has been used and replaced by an outcome
 * (there is nothing left to claim from it), and never while the questions sheet is open.
 * ⚠️ "OUT OF VIEW" IS BEHIND THE STICKY NAV, NOT ONLY ABOVE THE WINDOW. The ref's nav scrolls away;
 * this one stays, so a form whose bottom is under the bar is already out of sight.
 * ⚠️ IT NEVER COVERS THE FOOTER'S LINKS: while it shows, the page gains bottom padding equal to its
 * height plus its inset (the `:has()` rule in the sheet), so the last link can scroll clear of it.
 * ⚠️ IT IS PORTALLED, out of the sheet, because the sheet is `isolation: isolate` — a fixed element
 * inside it would be stacked inside it.
 */
const StickyClaim: React.FC<{ host: Element | null; formArea: React.RefObject<HTMLDivElement | null>; blocked: boolean }> = ({ host, formArea, blocked }) => {
  const { count, state } = useFounding();
  const [away, setAway] = useState(false);
  const live = !!count && state !== "down" && formIsVisible(state);
  useEffect(() => {
    if (!live) return;
    const check = () => {
      const form = formArea.current?.querySelector(".mk-pvform");
      if (!form) { setAway(false); return; }
      const top = document.querySelector(".mk-navwrap")?.getBoundingClientRect().bottom ?? 0;
      setAway(form.getBoundingClientRect().bottom < top + 10);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => { window.removeEventListener("scroll", check); window.removeEventListener("resize", check); };
  }, [live, formArea]);
  if (!host || !live || !count) return null;
  const on = away && !blocked;
  const back = () => {
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
    const field = document.getElementById("mk-pricing-email");
    window.setTimeout(() => field?.focus({ preventScroll: true }), reduceMotion() ? 0 : 450);
  };
  return createPortal(
    <div className={"mk-pvlayer mk-pvstick" + (on ? " mk-on" : "")} aria-hidden={!on}>
      <p>{foundingPlacesLeftLabel(count.claimed, count.cap)}<span>{PV4_KICKER}</span></p>
      <button type="button" tabIndex={on ? 0 : -1} onClick={back}>{FOUNDING_CTA}</button>
    </div>,
    host,
  );
};

export const PricingPhone: React.FC<{ onNavigate: Nav }> = ({ onNavigate }) => {
  const root = useRef<HTMLDivElement | null>(null);
  const formArea = useRef<HTMLDivElement | null>(null);
  const plans = useRef<HTMLElement | null>(null);
  /* The portalled parts live in the shell's `.mk-scope` — inside the marketing tokens, outside the
     sheet's stacking context. Found once the page is mounted. */
  const [host, setHost] = useState<Element | null>(null);
  useLayoutEffect(() => { setHost(root.current?.closest(".mk-scope") ?? null); }, []);
  /* The questions sheet: open or closed; and the plans: which tab, which length is checked, and the
     length a result arrived at (checked and flagged "Fits your campaign"). Pro is open on arrival. */
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tab, setTab] = useState(1);
  const [selected, setSelected] = useState<Months>(LADDER_DEFAULT);
  const [fit, setFit] = useState<Months | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const openSheet = useCallback((el: HTMLElement) => { opener.current = el; setSheetOpen(true); }, []);
  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    opener.current?.focus({ preventScroll: true });
  }, []);
  /* "See it in the plans" (26 Oct): close the sheet, open the Pro tab, and bring the Pro card into view
     just below the pinned tabs, with focus on its checked row — the one the result flagged. Waits a
     frame for the Pro panel to be shown before measuring it. */
  const seePlans = useCallback(() => {
    setSheetOpen(false);
    setTab(1);
    window.requestAnimationFrame(() => {
      const section = plans.current;
      const card = section?.querySelector<HTMLElement>("#mk-pvpanel-pro");
      if (!section || !card) return;
      section.querySelector<HTMLElement>('#mk-pvpanel-pro [role=radio][aria-checked="true"]')?.focus({ preventScroll: true });
      window.setTimeout(() => {
        const navH = document.querySelector(".mk-navwrap")?.getBoundingClientRect().height ?? 0;
        const tabsH = section.querySelector(".mk-pvtabs")?.getBoundingClientRect().height ?? 0;
        window.scrollTo({ top: card.getBoundingClientRect().top + window.scrollY - navH - tabsH, behavior: scrollBehavior() });
      }, reduceMotion() ? 0 : 300);
    });
  }, []);
  /* A result checks the row that fits and flags it — exactly one row, the estimate's. */
  const onFit = useCallback((m: Months) => { setFit(m); setSelected(m); }, []);
  return (
    <div className="mk-pvm" ref={root}>
      <FoundingBoxPhone onNavigate={onNavigate} formArea={formArea} />
      <PlansPhone ref={plans} tab={tab} onTab={setTab} selected={selected} fit={fit} onSelect={setSelected} onSuit={openSheet} />
      <FaqPhone onSuit={openSheet} />
      <StickyClaim host={host} formArea={formArea} blocked={sheetOpen} />
      <PlanSheetPhone host={host} open={sheetOpen} onClose={closeSheet} onSeePlans={seePlans} onFit={onFit} onNavigate={onNavigate} />
    </div>
  );
};
