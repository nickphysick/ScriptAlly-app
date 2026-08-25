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
 * ⚠️ THE STATEMENT IS A FULL-WIDTH GRID ROW NOW, NOT A CHILD OF THE COPY COLUMN. The eyebrow and
 * the headline each span both columns; the copy and the artwork share the row beneath. That is
 * what lets the headline run to ~700px of ink instead of ~460 — the constraint that governed it
 * for four passes was the 585px copy column, and it is the 1188px container now.
 *
 * ⚠️ THE CONGRATULATION IS GONE AND THE TICK REPLACES IT. Two lines of praise ("Congratulations."
 * / "You've got further than most.") and a party-popper mark sat between the statement and the
 * lede; the acknowledgement is the ticked box on the statement's own row now. See `landingCopy`
 * for why the lede still has something to turn against.
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
  HERO_EYEBROW, HERO_H1, HERO_LEDE, HERO_GRIND, HERO_TURN_B, CTA_START, CTA_LEARN,
} from "./landingCopy";
import { MarketingIllustration } from "./marketingMarks";
import heroIllustration from "../assets/marketing/hero-illustration-placeholder.png";
/* ⚠️ A PLACEHOLDER AWAITING THE ILLUSTRATOR, like the hero artwork beside it — the filename is
   the only thing on the page that says so. */
import tickMark from "../assets/marketing/hero-tick-placeholder.png";

/**
 * ⚠️ THE HEADLINE IS SPLIT FOR TYPESETTING, NOT EDITED. `HERO_H1` stays one locked string in
 * `landingCopy`; this splits it at its last space so the final word and the tick can be bound
 * into one unbreakable unit. Without that binding the mark is orphaned in one of two ways, both
 * measured: as a flex sibling it is pinned to the column's right edge with a ~40px hole when the
 * headline wraps, and as a plain inline it drops onto a line of its own at any width where the
 * words fit but the words-plus-mark do not (1100, exactly). Bound, the mark travels with "book."
 * and the line breaks in front of both.
 */
const LAST_SPACE = HERO_H1.lastIndexOf(" ");
const STATEMENT_HEAD = HERO_H1.slice(0, LAST_SPACE + 1);
const STATEMENT_TAIL = HERO_H1.slice(LAST_SPACE + 1);

export const Hero: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <section className="mk-hero">
    <div className="mk-heroinner">
      <p className="mk-eyebrow mk-r mk-r1">{HERO_EYEBROW}</p>

      {/* ⚠️ THE TICK IS INSIDE THE HEADLINE, NOT A FLEX SIBLING OF IT — a deviation from the
          ref, and it is the wrap that forces it. The ref draws `.statement` as a flex row with
          the h1 and the mark as children, which is right for the one-line headline it draws and
          wrong the moment the headline wraps: a block flex item takes the whole available width
          and its text wraps INSIDE that box, so the mark is pushed to the far edge of the column
          with a hole between it and the words. Measured at 1100, that hole was ~40px wide and
          the mark read as unrelated furniture. As an inline mark it follows "book." on whatever
          line "book." ends up on, and at every width where the headline is one line it renders
          exactly where the ref puts it.
          `alt=""`: it is the sentence's full stop drawn as a mark, and a screen reader that
          announced it would be reading punctuation aloud.
          ⚠️ AND IT IS BOUND TO THE LAST WORD — see `STATEMENT_HEAD`/`STATEMENT_TAIL` above.
          A bare inline mark drops onto its own line wherever the words fit and the words plus
          the mark do not. */}
      <h1 className="mk-statement mk-r mk-r1">
        {STATEMENT_HEAD}
        <span className="mk-tickword">
          {STATEMENT_TAIL}
          <img className="mk-tick" src={tickMark} alt="" />
        </span>
      </h1>

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

        <div className="mk-hctas mk-r mk-r4">
          <button type="button" className="mk-btn mk-btn--cta" onClick={onStart}>{CTA_START}</button>
          {/* ⚠️ A REAL ANCHOR, NOT A JS SCROLL HANDLER. It works with JavaScript off, it is
              keyboard- and screen-reader-navigable as a link, the browser owns the focus move,
              and the reduced-motion case is one CSS line rather than a branch. A handler would
              have to reimplement all four. */}
          <a className="mk-learn" href="#pulse">
            {CTA_LEARN}<span className="mk-chev" aria-hidden="true">↓</span>
          </a>
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
