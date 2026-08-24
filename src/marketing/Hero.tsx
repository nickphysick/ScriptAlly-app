/**
 * Hero — the statement hero: a copy column beside the illustration
 * (design ref: design-refs/scriptally-hero-v5.html). Copy verbatim from landingCopy.ts.
 *
 * ⚠️ THE ELLIPSIS IS INLINE NOW, NOT HANGING. It used to be an absolutely-positioned glyph in the
 * left margin; the lede sits on a rotated paper slip, and a mark hanging outside a rotated box
 * reads as a printing error rather than as a device. It is still its own `aria-hidden` span,
 * because it is punctuation the sighted reader sees as a pause and a screen reader should not
 * announce, and because `line-height: 0` on it is what stops it opening the first line box.
 *
 * ⚠️ THE POSTSCRIPT SITS OUTSIDE THE SLIP AND TILTS AGAINST IT. The slip is −0.45°, the
 * postscript −0.9° from its own left edge; the disagreement is the point and must not be
 * harmonised. It is Caveat, so `robots` is UNDERLINED — mono inside a handwritten line reads as a
 * bug. There is no `P.S.` label.
 *
 * ⚠️ ONE CTA. `See pricing` and the `Free to start` microline are both gone.
 *
 * ⚠️ THE ILLUSTRATION IS A PLACEHOLDER AND NOTHING ON THE PAGE SAYS SO. It renders `finished`, so
 * the slot's dashed rim, tinted ground and "ILLUSTRATION · HERO" caption — the three things that
 * used to admit it was a stand-in — are all off. The filename is the remaining signal; see
 * CLAUDE.md. Swapping in the commissioned artwork is this import and nothing else.
 *
 * ⚠️ NO `mix-blend-mode`, AND DO NOT ADD ONE. The PNG is RGBA with a real alpha channel, so it
 * composites onto the cream directly. A blend mode here would also be silently killed by a
 * `transform` on any ancestor — and this hero has two rotated elements in it already.
 */

import React from "react";
import {
  HERO_EYEBROW, HERO_H1, HERO_LEDE, HERO_GRIND, HERO_TURN_B, CTA_START,
} from "./landingCopy";
import { MarketingIllustration } from "./marketingMarks";
import heroIllustration from "../assets/marketing/hero-illustration-placeholder.png";

export const Hero: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <section className="mk-hero">
    <div className="mk-heroinner">
      <div className="mk-hcopy">
        <p className="mk-eyebrow mk-r mk-r1">{HERO_EYEBROW}</p>
        <h1 className="mk-statement mk-r mk-r1">{HERO_H1}</h1>

        <div className="mk-after mk-r mk-r2">
          <div className="mk-slip">
            <p className="mk-lede">
              <span className="mk-dots" aria-hidden="true">…</span>
              {HERO_LEDE.map((seg, i) => (
                seg.b
                  ? <strong key={i}>{seg.text}</strong>
                  : <React.Fragment key={i}>{seg.text}</React.Fragment>
              ))}
            </p>
          </div>
          <p className="mk-ps mk-r mk-r3">
            {HERO_GRIND.map((seg, i) => (
              seg.underline
                ? <span className="mk-robots" key={i}>{seg.text}</span>
                : <React.Fragment key={i}>{seg.text}</React.Fragment>
            ))}
          </p>
        </div>

        <div className="mk-turn mk-r mk-r4">
          <span className="mk-turn-b">{HERO_TURN_B}</span>
        </div>

        <div className="mk-hctas mk-r mk-r5">
          <button type="button" className="mk-btn mk-btn--cta" onClick={onStart}>{CTA_START}</button>
        </div>
      </div>

      {/* `finished` is the slot primitive's own prop — the component is not forked, and the
          About page's vision plates keep every piece of chrome this drops. */}
      <MarketingIllustration slot="landingHero" finished>
        <img className="mk-illoart" src={heroIllustration} alt="" />
      </MarketingIllustration>
    </div>
  </section>
);
