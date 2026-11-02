/**
 * Hero — the landing page's opening block at 761px and up (waitlist v1, 31 Oct; ref
 * design-refs/landing-desktop-v5.html `.qh-heroband`). The white card over the navy band: on the left
 * "Hunting for a" / "literary agent?" (highlighter), the handwritten "No more winging it.", the sub,
 * then the founding block (clarity v1, 2 Nov: heading, ticks, "Join the waitlist", places bar — no form);
 * on the right the binocular hawk.
 *
 * ⚠️ THE CARD PILE, ITS CAST SHADOW AND THE FLY-PAST LEFT THE HERO WITH THIS BUILD — and so did the
 * 1280px frame that scaled them (`size()`, `pileExtent`, `placeAgain`), "See how it works" and the
 * jump to the status band, which is retired too. The pile lives on as feature row 2 (`TrackFeature`).
 * ⚠️ ONE ASK: the founding band's form is the page's only sign-up; the hero's button and the nav's
 * scroll to it, and nothing in the hero navigates.
 * ⚠️ THE TEXT NEVER ANIMATES. Only the places counter counts down, as everywhere.
 */
import React from "react";
import { WAIT_HERO_Q, WAIT_HERO_STRAP } from "./landingCopy";
import { HeroSub } from "./HeroLines";
import { HeroFounding } from "./WaitlistParts";

/** The binocular hawk (523 px, sharper than `binocular-hawk.webp`), md5-versioned like every public/ file. WebP
    since landing perf fix v1 (54KB where the PNG is 235KB, same size and pixels); the PNG stays for other pages. */
export const DESK_HERO_BIRD = { src: "/images/contact/discover-binoculars-bird.webp", version: "bf3b2e8f", width: 523, height: 512 };

export const Hero: React.FC<{
  onNavigate: (tab: string, subPageName?: string) => void;
}> = () => (
  <section className="mk-dh" aria-labelledby="mk-dh-h">
    <div className="mk-dh-wrap">
      <div className="mk-dh-card">
        <div className="mk-dh-copy">
          <h1 id="mk-dh-h" className="mk-dh-q">
            <span className="mk-dh-q1">{WAIT_HERO_Q[0]}</span>{" "}
            <span className="mk-dh-q2"><mark>{WAIT_HERO_Q[1]}</mark></span>
          </h1>
          <p className="mk-dh-strap">{WAIT_HERO_STRAP}</p>
          <HeroSub />
          {/* Waitlist clarity v1 (2 Nov): the founding block in place of the form, places line and privacy line. */}
          <HeroFounding layout="desk" />
        </div>
        <div className="mk-dh-art">
          <img src={DESK_HERO_BIRD.src + "?v=" + DESK_HERO_BIRD.version} alt="" width={DESK_HERO_BIRD.width} height={DESK_HERO_BIRD.height} />
        </div>
      </div>
    </div>
  </section>
);
