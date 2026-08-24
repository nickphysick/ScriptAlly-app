/**
 * Hero — the statement hero: a copy column beside the blush illustration slot
 * (design ref: design-refs/scriptally-landing-hero-v3.html). Copy verbatim from landingCopy.ts.
 *
 * ⚠️ THE HANGING ELLIPSIS IS A POSITIONED ELEMENT, NOT A CHARACTER IN THE PARAGRAPH. The h1 ends
 * in a full stop and the lede resumes its sentence, so the glyph has to sit OUTSIDE the text block
 * to hang in the margin — which a character in the string cannot do. It is `aria-hidden` for the
 * same reason: it is a piece of layout, and a screen reader announcing it would read out
 * punctuation the sighted reader experiences as a gap. Below 900px it becomes a plain block above
 * the paragraph, because there is no margin left to hang in.
 *
 * ⚠️ THE DASHBOARD DEMO IS GONE FROM HERE. The right column is an illustration slot now; the
 * animated replica and the Form 11 peek that used to live in it were retired with this hero.
 */

import React from "react";
import {
  HERO_EYEBROW, HERO_H1, HERO_LEDE, HERO_GRIND, HERO_TURN_A, HERO_TURN_B,
  HERO_NOTE, CTA_START, CTA_PRICING,
} from "./landingCopy";
import { MarketingIllustration } from "./marketingMarks";

export const Hero: React.FC<{ onStart: () => void; onPricing: () => void }> = ({ onStart, onPricing }) => (
  <section className="mk-hero">
    <div className="mk-heroinner">
      <div className="mk-hcopy">
        <p className="mk-eyebrow mk-r mk-r1">{HERO_EYEBROW}</p>
        <h1 className="mk-statement mk-r mk-r1">{HERO_H1}</h1>

        <div className="mk-after mk-r mk-r2">
          <span className="mk-dots" aria-hidden="true">…</span>
          <p className="mk-lede">{HERO_LEDE}</p>
          <p className="mk-grind mk-r mk-r3">
            {HERO_GRIND.map((seg, i) => (
              seg.mono
                ? <span className="mk-robots" key={i}>{seg.text}</span>
                : <React.Fragment key={i}>{seg.text}</React.Fragment>
            ))}
          </p>
        </div>

        <div className="mk-turn mk-r mk-r4">
          <span className="mk-turn-a">{HERO_TURN_A}</span>
          <span className="mk-turn-b">{HERO_TURN_B}</span>
        </div>

        <div className="mk-hctas mk-r mk-r5">
          <button type="button" className="mk-btn mk-btn--cta" onClick={onStart}>{CTA_START}</button>
          <button type="button" className="mk-tlink" onClick={onPricing}>{CTA_PRICING}</button>
        </div>
        <p className="mk-hnote mk-r mk-r5">{HERO_NOTE}</p>
      </div>

      <MarketingIllustration slot="landingHero" />
    </div>
  </section>
);
