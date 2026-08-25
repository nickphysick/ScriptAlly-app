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
 * ⚠️ THE HERO'S ACTION IS THE FOUNDING PANEL. `Start tracking — it's free` and `Learn more` are
 * both gone with the actions row they shared — see `FoundingPanel`.
 *
 * ⚠️ THE STATEMENT IS A FULL-WIDTH GRID ROW NOW, NOT A CHILD OF THE COPY COLUMN. The eyebrow and
 * the headline each span both columns; the copy and the artwork share the row beneath. That is
 * what lets the headline run to ~700px of ink instead of ~460 — the constraint that governed it
 * for four passes was the 585px copy column, and it is the 1188px container now.
 *
 * ⚠️ THE STATEMENT STANDS ALONE. Two lines of praise ("Congratulations." / "You've got further
 * than most.") and a party-popper sat between it and the lede; a ticked box replaced them; now the
 * headline carries the beat by itself. `hero-tick-placeholder.png` is RETAINED but unreferenced —
 * see CLAUDE.md, so an unused-asset sweep does not bin it. `landingCopy` says why the lede still
 * has something to turn against.
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
  HERO_EYEBROW, HERO_H1, HERO_LEDE, HERO_GRIND, HERO_TURN_B,
} from "./landingCopy";
import { MarketingIllustration } from "./marketingMarks";
import { FoundingPanel } from "./FoundingPanel";
import heroIllustration from "../assets/marketing/hero-illustration-placeholder.png";

/* ⚠️ THE HEADLINE IS ONE STRING AGAIN. It was split at its last space so the final word and the
   ticked box could be bound into one unbreakable unit — `.mk-tickword`, `STATEMENT_HEAD` and
   `STATEMENT_TAIL` all existed for the mark, and go with it. The headline stands alone now, so
   there is nothing to bind and the split would be machinery with no purpose. */

export const Hero: React.FC<{
  onNavigate: (tab: string, subPageName?: string) => void;
}> = ({ onNavigate }) => (
  <section className="mk-hero">
    <div className="mk-heroinner">
      <p className="mk-eyebrow mk-r mk-r1">{HERO_EYEBROW}</p>

      <h1 className="mk-statement mk-r mk-r1">{HERO_H1}</h1>

      <div className="mk-hcopy">
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

        {/* ⚠️ THE ACTIONS ROW IS GONE, BOTH HALVES. `Start tracking — it's free` left because
            pre-launch there is nothing self-serve behind it, and `Learn more` left with the row it
            shared — an in-page anchor to `#pulse` competing with a real offer three inches below
            it. The panel is the hero's only action now. */}
        <div className="mk-r mk-r4">
          <FoundingPanel onNavigate={onNavigate} />
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
