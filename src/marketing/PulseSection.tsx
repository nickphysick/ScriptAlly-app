/**
 * PulseSection — the centred line between the hero and the showreel
 * (design ref: design-refs/scriptally-landing-hero-v3.html .pulse-sec).
 *
 * ⚠️ THE WORD STAYS INK. `pulse` is plain Playfair in the heading's own colour and the effect is a
 * blush halo behind it — never a colour change, an italic or a weight change. A burgundy word in a
 * heading reads as a link, and a heading that changes colour mid-sentence reads as two things.
 * The span declares `color: inherit` so it cannot drift if the tier is ever retoned.
 *
 * ⚠️ THE HALO IS A `::before` AND THE ANIMATION IS DECLARED ONLY INSIDE `no-preference`, so a
 * reader who asked for less motion gets a still heading rather than a slower heartbeat.
 */

import React from "react";
import { PULSE_HEADING, PULSE_SUB } from "./landingCopy";

export const PulseSection: React.FC = () => (
  <section className="mk-pulsesec">
    <h2>
      {PULSE_HEADING.map((seg, i) => (
        seg.pulse
          ? <span className="mk-pulseword" key={i}>{seg.text}</span>
          : <React.Fragment key={i}>{seg.text}</React.Fragment>
      ))}
    </h2>
    <p className="mk-pulsesub">{PULSE_SUB}</p>
  </section>
);
