/**
 * LandingPhone — the waiting-list landing page at ≤760px (waitlist v2, 1 Nov; ref
 * design-refs/landing-mobile-v17.html, the page inside the phone frame — the notes beside it are stale).
 *
 * Top to bottom: the hero, a navy drawer pulled down over the page with its sign-up at its foot; the
 * Birds-eye view; the details banner; the six features ("format C" — heading over a navy rule, the line,
 * the picture, the ticks in a soft panel) on alternating bands; the mission as a sideways swipe of three
 * cards; the founding pass; the questions. The bar above and the footer below are the shell's; the join
 * bar is `JoinBar`.
 *
 * ⚠️ THE PAGE SCROLLS AS A PAGE. `html` never snaps; the mission's carousel is the ONE element with
 * scroll-snap (it reverses v1's "no carousel", at Nick's request).
 * ⚠️ ONE ASK. The founding sign-up is the shared `FoundingSignup` + `foundingStore` + `HeroPlaces`; the
 * hero's `source` is "landing-panel" and the pass's "sealed-band", as before.
 * ⚠️ NOTHING NAVIGATES: "See what it does", the six pills and every CTA scroll within the page.
 */
import React, { useRef, useState } from "react";
import {
  WAIT_HERO_Q, WAIT_HERO_STRAP, SEE_WHAT, HERO_CTA, HERO_PRIVACY_SHORT, BE_HEADING, BE_TICKS,
  FEATURE_ROWS, PHONE_FEATURE_ORDER, featureAnchor, VISION_POINTS, MISSION_HEADING, FAQ_HEADING, FAQ, FeatureRow,
} from "./landingCopy";
import { FoundingSignup } from "./FoundingSignup";
import { HeroLockup } from "./HeroLines";
import { HeroPlaces } from "./HeroPlaces";
import { ILLUSTRATIONS } from "./FeatureRows";
import { FoundingTicket } from "./FoundingTicket";
import { PLATES } from "./Vision";
import { BirdsEyeFocus, DetailsBanner, TrackFeature, Ticks, FeatureLine, PageAnchor, HERO_FORM } from "./WaitlistParts";

/** The binocular hawk in the phone hero, centred under the strap. */
export const HERO_BIRD = { src: "/images/binocular-hawk.webp", version: "6e3c0031", width: 380, height: 372 };
/** The Birds-eye heading's id: "See what it does" scrolls to it. */
export const BE_HEADING_ID = "mk-be-h";

type Navigate = (tab: string, subPageName?: string) => void;

const PhoneHero: React.FC<{ onNavigate: Navigate }> = ({ onNavigate }) => {
  return (
    <section className="mk-wl-hero" aria-labelledby="mk-wl-hero-h">
      <h1 id="mk-wl-hero-h" className="mk-wl-q">
        <span className="mk-wl-q1">{WAIT_HERO_Q[0]}</span>{" "}<span className="mk-wl-q2"><mark>{WAIT_HERO_Q[1]}</mark></span>
      </h1>
      <p className="mk-wl-strap">{WAIT_HERO_STRAP}</p>
      {/* A centred stack (2 Nov): the hawk, the lockup panel, the sign-up and the link, each under the last. */}
      <img className="mk-wl-herohawk" src={HERO_BIRD.src + "?v=" + HERO_BIRD.version} alt="" width={HERO_BIRD.width} height={HERO_BIRD.height} />
      <HeroLockup />
      <div className="mk-wl-signup" id={HERO_FORM + "-signup"}>
        <FoundingSignup idPrefix={HERO_FORM} source="landing-panel" formClass="mk-wl-form" ctaLabel={HERO_CTA}
          afterForm={<HeroPlaces variant="line" />} onNavigate={onNavigate} note={HERO_PRIVACY_SHORT} />
      </div>
      {/* 2 Nov: "See what it does" sits at the drawer's foot, after the sign-up. */}
      <PageAnchor to={BE_HEADING_ID} className="mk-wl-see">
        {SEE_WHAT}{" "}
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
          <path d="M4 6.5 8 10.5 12 6.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </PageAnchor>
    </section>
  );
};

/** One feature, format C: the heading over its navy rule, the line, the picture, the ticks in a soft panel. */
const Feature: React.FC<{ row: FeatureRow }> = ({ row }) => {
  const art = ILLUSTRATIONS[row.image];
  return (
    <div className="mk-wl-feat" id={featureAnchor(row.key)}>
      <h3>{row.heading}</h3>
      <FeatureLine row={row} className="mk-wl-fline" />
      {row.key === "track"
        ? <TrackFeature layout="phone" />
        : <div className="mk-wl-art"><img src={row.image + "?v=" + art.version} alt={row.alt} width={art.width} height={art.height} loading="lazy" /></div>}
      <Ticks items={row.points} />
    </div>
  );
};

/** The mission: three cream cards you swipe, one filling the width, the dot under the one in view. */
const Mission: React.FC = () => {
  const track = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  /* ⚠️ THE CARD IN VIEW IS DERIVED FROM THE SCROLL POSITION, never kept as a counter. */
  const onScroll = () => {
    const el = track.current, card = el?.querySelector<HTMLElement>(".mk-vcard");
    if (!el || !card) return;
    const step = card.offsetWidth + parseFloat(getComputedStyle(el).columnGap || "0");
    const k = Math.max(0, Math.min(VISION_POINTS.length - 1, Math.round(el.scrollLeft / step)));
    setAt((was) => (was === k ? was : k));
  };
  return (
    <section className="mk-wl-why" aria-labelledby="mk-wl-why-h">
      <h2 id="mk-wl-why-h" className="mk-wl-whyh">{MISSION_HEADING}</h2>
      <div className="mk-vc" ref={track} onScroll={onScroll} tabIndex={0} aria-labelledby="mk-wl-why-h">
        {VISION_POINTS.map((p) => (
          <article key={p.key} className="mk-vcard">
            <div className="mk-vimg"><img src={p.image + "?v=" + PLATES[p.image].version} alt="" width={PLATES[p.image].width} height={PLATES[p.image].height} loading="lazy" /></div>
            <h3>{p.heading}</h3>
            <p>{p.body}</p>
          </article>
        ))}
      </div>
      <div className="mk-vdots" aria-hidden="true">
        {VISION_POINTS.map((p, i) => <i key={p.key} className={i === at ? "mk-on" : undefined} />)}
      </div>
    </section>
  );
};

export const LandingPhone: React.FC<{ onNavigate: Navigate }> = ({ onNavigate }) => {
  const rows = PHONE_FEATURE_ORDER.map((k) => FEATURE_ROWS.find((r) => r.key === k)!);
  return (
    <div className="mk-wl">
      <PhoneHero onNavigate={onNavigate} />

      <section className="mk-wl-sec" id="mk-features" aria-label="Features">
        <div className="mk-wl-feat mk-wl-feat--first">
          <h3 id={BE_HEADING_ID}>{BE_HEADING}</h3>
          <BirdsEyeFocus layout="phone" />
          <Ticks items={BE_TICKS} />
        </div>
        <DetailsBanner layout="phone" />
        {rows.map((row) => <Feature key={row.key} row={row} />)}
      </section>

      <Mission />

      <FoundingTicket onNavigate={onNavigate} />

      <section className="mk-wl-faq" aria-labelledby="mk-wl-faq-h">
        <h2 id="mk-wl-faq-h" className="mk-wl-faqh">{FAQ_HEADING}</h2>
        {FAQ.map(([q, a], i) => (
          <details key={q} open={i === 0}><summary>{q}</summary><p>{a}</p></details>
        ))}
      </section>
    </div>
  );
};
