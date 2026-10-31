/**
 * LandingPhone — the waiting-list landing page at ≤760px (waitlist v1, 31 Oct; ref
 * design-refs/landing-mobile-v7.html, the page inside the phone frame — the notes beside it are not page).
 *
 * Top to bottom: the navy hero with its sign-up, the Birds-eye showcase, "Every query tracked" with the
 * real card, five more features, the mission on navy, the founding card, the questions. The bar above
 * and the footer below are the shell's; the join bar is `JoinBar`.
 *
 * ⚠️ THE PAGE SCROLLS AS A PAGE. No snapping, no sticky picture, no sideways carousel, no pull-up sheet —
 * all four were retired with this build (`HeroPhone`'s sheet, `FeatureStory`, `VisionNavy`).
 * ⚠️ ONE ASK. The founding sign-up is the shared `FoundingSignup` + `foundingStore` + `HeroPlaces`; the
 * hero's `source` is "landing-panel" and the founding card's "sealed-band", as before.
 */
import React from "react";
import {
  WAIT_HERO_Q, WAIT_HERO_STRAP, WAIT_HERO_SUB, HERO_CTA, BE_HEADING, BE_LINE_PHONE, BE_TICKS,
  FEATURE_STORY, FEATURE_ROWS, WAIT_AGENTS, VISION_POINTS, VISION_NAVY, MISSION_EYEBROW,
  FAQ_HEADING, FAQ, FeatureCard,
} from "./landingCopy";
import { FoundingSignup } from "./FoundingSignup";
import { HeroPlaces } from "./HeroPlaces";
import { ILLUSTRATIONS } from "./FeatureRows";
import { FoundingClose } from "./FoundingClose";
import { BirdsEyeShowcase, TrackFeature, Ticks, HERO_FORM } from "./WaitlistParts";

/** The binocular hawk beside the phone hero's question. */
export const HERO_BIRD = { src: "/images/binocular-hawk.webp", version: "6e3c0031", width: 380, height: 372 };
/** The mission's picture: the fireside, which is the vision band's first plate. */
const FIRESIDE = { src: "/images/get-good-stories-told.png", version: "8baf6c8a", width: 482, height: 440 };

type Navigate = (tab: string, subPageName?: string) => void;

const PhoneHero: React.FC<{ onNavigate: Navigate }> = ({ onNavigate }) => (
  <section className="mk-wl-hero" aria-labelledby="mk-wl-hero-h">
    <img className="mk-wl-herohawk" src={HERO_BIRD.src + "?v=" + HERO_BIRD.version} alt="" width={HERO_BIRD.width} height={HERO_BIRD.height} />
    <h1 id="mk-wl-hero-h" className="mk-wl-q">
      <span className="mk-wl-q1">{WAIT_HERO_Q[0]}</span>{" "}<span className="mk-wl-q2"><mark>{WAIT_HERO_Q[1]}</mark></span>
    </h1>
    <p className="mk-wl-strap">{WAIT_HERO_STRAP}</p>
    <p className="mk-wl-sub">{WAIT_HERO_SUB}</p>
    <div className="mk-wl-signup" id={HERO_FORM + "-signup"}>
      <FoundingSignup idPrefix={HERO_FORM} source="landing-panel" formClass="mk-wl-form" ctaLabel={HERO_CTA}
        afterForm={<HeroPlaces variant="line" />} onNavigate={onNavigate} />
    </div>
  </section>
);

/** One feature: the blush art panel, the heading, the line and three ticks. */
const Feature: React.FC<{ card: FeatureCard }> = ({ card }) => {
  const row = FEATURE_ROWS.find((r) => r.key === card.key)!;
  const art = ILLUSTRATIONS[row.image];
  return (
    <div className="mk-wl-feat">
      <div className="mk-wl-art"><img src={row.image + "?v=" + art.version} alt={row.alt} width={art.width} height={art.height} loading="lazy" /></div>
      <h3>{card.heading}</h3>
      <p>{card.line}</p>
      <Ticks items={card.points} />
    </div>
  );
};

export const LandingPhone: React.FC<{ onNavigate: Navigate }> = ({ onNavigate }) => {
  const track = FEATURE_STORY.find((f) => f.key === "track")!;
  const rest = FEATURE_STORY.filter((f) => f.key !== "track").map((f) => (f.key === "agents" ? WAIT_AGENTS : f));
  const stories = VISION_POINTS[0];
  const more = VISION_POINTS.slice(1);
  return (
    <div className="mk-wl">
      <PhoneHero onNavigate={onNavigate} />

      <section className="mk-wl-sec" id="mk-features" aria-label="Features">
        <div className="mk-wl-feat mk-wl-feat--first">
          <BirdsEyeShowcase />
          <h3>{BE_HEADING}</h3>
          <p>{BE_LINE_PHONE}</p>
          <Ticks items={BE_TICKS} />
        </div>
        <div className="mk-wl-feat">
          <TrackFeature layout="phone" />
          <h3>{track.heading}</h3>
          <p>{track.line}</p>
          <Ticks items={track.points} />
        </div>
        {rest.map((card) => <Feature key={card.key} card={card} />)}
      </section>

      <section className="mk-wl-why" aria-labelledby="mk-wl-why-h">
        <div className="mk-wl-whyart"><img src={FIRESIDE.src + "?v=" + FIRESIDE.version} alt="" width={FIRESIDE.width} height={FIRESIDE.height} loading="lazy" /></div>
        <h2 id="mk-wl-why-h" className="mk-wl-whyh"><span className="mk-wl-mq">{MISSION_EYEBROW}</span>{" "}{stories.heading}</h2>
        <p>{stories.body}</p>
        <div className="mk-wl-more">
          {more.map((p) => <div key={p.key}><b>{p.heading}</b><span>{VISION_NAVY[p.key]}</span></div>)}
        </div>
      </section>

      <FoundingClose onNavigate={onNavigate} />

      <section className="mk-wl-faq" aria-labelledby="mk-wl-faq-h">
        <h2 id="mk-wl-faq-h" className="mk-wl-faqh">{FAQ_HEADING}</h2>
        {FAQ.map(([q, a], i) => (
          <details key={q} open={i === 0}><summary>{q}</summary><p>{a}</p></details>
        ))}
      </section>
    </div>
  );
};
