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
  PV4_LAUNCH_LINE, PV4_FREE, PV4_PRO, PRO_FROM, SEG_PRO_FROM, PLANS_TITLE, PLANS_SUB, PRO_PLANS,
  planMonths, planPrice, planTileLines, SUIT_LINK, SUIT_NOTE, JY_FITS, PV4_FAQ_H2, PV4_FAQ,
} from "./pricingCopy";
import { FoundingSignup, FoundingCounter, formIsVisible } from "./FoundingSignup";
import { useFounding } from "./foundingStore";
import { foundingPlacesLeftLabel, FOUNDING_CTA } from "./landingCopy";
import { FOUNDING_ART, artUrl } from "./brandArt";
import { PERK_ICON, Price } from "./pricingParts";
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

/**
 * Then, once we launch: a Free / Pro switch over the two cards in a scroll-snapped track (ref .seg,
 * .track). Tapping a side scrolls the track to that card; swiping the track moves the switch.
 *
 * ⚠️ A TAP'S OWN SCROLL DOES NOT MOVE THE SWITCH BACK. The ref derives the switch from every scroll
 * event, so tapping Pro lit Pro, then the smooth scroll's first frames (still nearer Free) lit Free,
 * then Pro again. While a tap's scroll is travelling the handler waits for it to arrive.
 * ⚠️ THE CARDS KEEP THEIR OWN HEIGHTS (`align-items: flex-start` in the sheet): a short Free card is
 * not stretched to Pro's. The draft of this design stretched it; `pricingMobile.measure.ts` locks it.
 */
const TiersPhone: React.FC = () => {
  const [on, setOn] = useState(0);
  const track = useRef<HTMLDivElement | null>(null);
  const seeking = useRef<number | null>(null);
  const cards = () => [...(track.current?.querySelectorAll<HTMLElement>(".mk-pvtier") ?? [])];
  const go = (i: number) => {
    const el = track.current, card = cards()[i];
    setOn(i);
    if (!el || !card) return;
    const left = Math.max(0, Math.min(card.offsetLeft - 18, el.scrollWidth - el.clientWidth));
    seeking.current = Math.abs(el.scrollLeft - left) < 2 ? null : left;
    el.scrollTo({ left, behavior: scrollBehavior() });
  };
  const onScroll = () => {
    const el = track.current, pro = cards()[1];
    if (!el || !pro) return;
    if (seeking.current !== null) {
      if (Math.abs(el.scrollLeft - seeking.current) >= 2) return;
      seeking.current = null;
    }
    setOn(el.scrollLeft > pro.offsetLeft / 2 ? 1 : 0);
  };
  const tab = (i: number, label: React.ReactNode, id: string) => (
    <button
      type="button"
      role="tab"
      id={`mk-pvtab-${id}`}
      aria-selected={on === i}
      aria-controls={`mk-pvtier-${id}`}
      onClick={() => go(i)}
    >
      {label}
    </button>
  );
  return (
    <section className="mk-pvlaunch" aria-labelledby="mk-pvm-launch">
      <p id="mk-pvm-launch" className="mk-pvlaunchh">{PV4_LAUNCH_LINE}</p>
      <div className="mk-pvseg" role="tablist" aria-labelledby="mk-pvm-launch" data-on={on}>
        <span className="mk-pvthumb" aria-hidden="true" />
        {tab(0, PV4_FREE.name, "free")}
        {tab(1, <>{PV4_PRO.name} <small>{SEG_PRO_FROM}</small></>, "pro")}
      </div>
      <div className="mk-pvtrack" ref={track} onScroll={onScroll}>
        <article className="mk-pvtier" id="mk-pvtier-free" role="tabpanel" aria-labelledby="mk-pvtab-free">
          <div className="mk-pvtierin">
            <h2 className="mk-pvtname">{PV4_FREE.name}</h2>
            <Price amount={PV4_FREE.price} />
            <p className="mk-pvtsub">{PV4_FREE.sub}</p>
            <ul className="mk-pvtlist">{PV4_FREE.list.map((f) => <li key={f}>{f}</li>)}</ul>
          </div>
        </article>
        <article className="mk-pvtier mk-pvtier--pro" id="mk-pvtier-pro" role="tabpanel" aria-labelledby="mk-pvtab-pro">
          <div className="mk-pvtierin">
            <h2 className="mk-pvtname">{PV4_PRO.name}</h2>
            <Price amount={PRO_FROM} from={PV4_PRO.from} per={PV4_PRO.per} />
            <p className="mk-pvtsub">{PV4_PRO.sub}</p>
            <ul className="mk-pvtlist">
              <li className="mk-pvplus">{PV4_PRO.plus}</li>
              {PV4_PRO.list.map((f) => <li key={f}>{f}</li>)}
            </ul>
            <p className="mk-pvtnote">{PV4_PRO.flex}</p>
          </div>
        </article>
      </div>
    </section>
  );
};

/** The compass on "Which plan suits me best?" — the ref's own drawing. */
const Compass = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></svg>
);

/**
 * Pro plans: the four plans as a 2 × 2 grid in a white-rimmed sheet, then the button that opens the
 * questions. The plan the questions arrive at turns navy and carries the "Fits your campaign" tag —
 * a real element, so the words are copy rather than a stylesheet's `content`.
 */
const PlansPhone = React.forwardRef<HTMLElement, { fit: number | null; onSuit: (opener: HTMLElement) => void }>(
  ({ fit, onSuit }, ref) => (
    <section className="mk-pvplans" aria-labelledby="mk-pvm-plans" ref={ref}>
      <h2 id="mk-pvm-plans" className="mk-pvplanst">{PLANS_TITLE}</h2>
      <p className="mk-pvplanss">{PLANS_SUB}</p>
      <ul className="mk-pvpgrid">
        {PRO_PLANS.map((p) => {
          const line = planTileLines(p);
          return (
            <li className={"mk-pvpt" + (p.months === fit ? " mk-pvpt--fit" : "")} key={p.months} data-m={p.months}>
              {p.months === fit && <span className="mk-pvfittag">{JY_FITS}</span>}
              <p className="mk-pvptname">{planMonths(p.months)}</p>
              <b className="mk-pvptprice">{planPrice(p)}</b>
              <small className="mk-pvptline">{line.lead}{line.save && <em>{line.save}</em>}</small>
            </li>
          );
        })}
      </ul>
      <button type="button" className="mk-pvsuit" aria-haspopup="dialog" onClick={(e) => onSuit(e.currentTarget)}>
        <Compass />{SUIT_LINK}
      </button>
      <p className="mk-pvplansnote">{SUIT_NOTE}</p>
    </section>
  ),
);
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
  /* The questions sheet: open, closed, and the plan it last arrived at (which turns its tile navy). */
  const [sheetOpen, setSheetOpen] = useState(false);
  const [fit, setFit] = useState<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const openSheet = useCallback((el: HTMLElement) => { opener.current = el; setSheetOpen(true); }, []);
  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    opener.current?.focus({ preventScroll: true });
  }, []);
  /* "See it in the plans": close, then bring Pro plans into view under the nav (the ref's 70px is
     its 58px nav plus 12; here the nav's own height plus the same 10). Focus goes to the plans'
     own button rather than back to the opener — the FAQ's link would scroll the page back down. */
  const seePlans = useCallback(() => {
    setSheetOpen(false);
    const section = plans.current;
    if (!section) return;
    section.querySelector<HTMLElement>(".mk-pvsuit")?.focus({ preventScroll: true });
    window.setTimeout(() => {
      const navH = document.querySelector(".mk-navwrap")?.getBoundingClientRect().height ?? 0;
      window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY - navH - 10, behavior: scrollBehavior() });
    }, reduceMotion() ? 0 : 300);
  }, []);
  const onFit = useCallback((m: number) => setFit(m), []);
  return (
    <div className="mk-pvm" ref={root}>
      <FoundingBoxPhone onNavigate={onNavigate} formArea={formArea} />
      <TiersPhone />
      <PlansPhone ref={plans} fit={fit} onSuit={openSheet} />
      <FaqPhone onSuit={openSheet} />
      <StickyClaim host={host} formArea={formArea} blocked={sheetOpen} />
      <PlanSheetPhone host={host} open={sheetOpen} onClose={closeSheet} onSeePlans={seePlans} onFit={onFit} onNavigate={onNavigate} />
    </div>
  );
};
