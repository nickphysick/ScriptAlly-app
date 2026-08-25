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
  HERO_H1, HERO_LEDE, HERO_GRIND, HERO_TURN_LEAD, HERO_TURN_BODY,
} from "./landingCopy";
import { Runs } from "./CopyRuns";
import { MarketingIllustration } from "./marketingMarks";
import { FoundingPanel } from "./FoundingPanel";
/* ⚠️ MATTED, NOT NATIVELY TRANSPARENT — see CLAUDE.md. The supplied file was RGB on near-white
   and its alpha was derived by luminance: 45.5% fully clear, 25.7% fully opaque, 28.8% PARTIAL,
   which is the signature of a matte rather than an export. Verified not to fringe on this page's
   cream at render size and at 2.6x, and the partial alpha helps here because the drawing's pale
   sheets let the ground through. It is one dark background away from failing; a proper transparent
   export is the fix, not more matting. */
import heroIllustration from "../assets/marketing/hero-stack-plane.png";
/* ⚠️ 138×115 AT SOURCE AND RENDERED AT 132px — essentially 1:1, so it is SOFT ON A HiDPI SCREEN.
   Extracted from the ref's base64; if it stays, it wants a 2× export. Flagged, not fixed. */
import heroFireworks from "../assets/marketing/hero-fireworks.png";

/* ⚠️ THE HEADLINE IS ONE STRING AGAIN. It was split at its last space so the final word and the
   ticked box could be bound into one unbreakable unit — `.mk-tickword`, `STATEMENT_HEAD` and
   `STATEMENT_TAIL` all existed for the mark, and go with it. The headline stands alone now, so
   there is nothing to bind and the split would be machinery with no purpose. */

export const Hero: React.FC<{
  onNavigate: (tab: string, subPageName?: string) => void;
}> = ({ onNavigate }) => (
  <section className="mk-hero">
    <div className="mk-heroinner">
      {/* ⚠️ NO EYEBROW. `For querying writers` sat above this line and is deleted, constant and
          all — the headline establishes its audience by itself, and a label saying who the page
          is for is the page explaining a sentence that does not need explaining. Every row below
          shifted up one when it went; the artwork's span moved with them. */}
      {/* ⚠️ A WRAPPER, AND THE `<h1>` KEEPS `.mk-statement`. The row needs to be a flex line and a
          stacking context so the burst can sit behind the words; the heading needs to stay the
          element three locks already name. Splitting those two jobs across two elements costs one
          div and keeps every assertion pointed at the thing it was written about.
          ⚠️ THE BURST FOLLOWS THE HEADING IN THE DOM. It is pulled back over the last word by a
          negative left margin, so its position is a property of where the words END — which is
          what "behind the end of 'book.'" means, and why it cannot be absolutely positioned. */}
      <div className="mk-statementrow mk-r mk-r1">
        <h1 className="mk-statement">{HERO_H1}</h1>
        <img className="mk-heroburst" src={heroFireworks} alt="" />
      </div>

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

      </div>

      {/* ⚠️ THE TURN AND THE PANEL ARE GRID ROWS OF THEIR OWN NOW, not children of the copy
          column — which is what lets the artwork SPAN them. An item can only be spanned by a
          sibling in the same grid; nested inside `.mk-hcopy` they were invisible to the row
          machinery, and the art could reach at most the copy row. */}
      <div className="mk-turn mk-r mk-r4">
        <span className="mk-turn-lead">
          {HERO_TURN_LEAD}
          {/* ⚠️ AN ELEMENT, NOT A CHARACTER, AND `aria-hidden` BECAUSE IT SAYS NOTHING. A caret is
              a cursor: it is there to make the line read as still being written, which is a
              visual claim only. A screen reader announcing a bar — or a `|` in the constant —
              would be noise in the middle of the page's one statement of what ScriptAlly is. */}
          <span className="mk-caret" aria-hidden="true" />
        </span>
        <span className="mk-turn-body"><Runs runs={HERO_TURN_BODY} onNavigate={onNavigate} /></span>
      </div>

      {/* ⚠️ THE ACTIONS ROW IS GONE, BOTH HALVES. `Start tracking — it's free` left because
          pre-launch there is nothing self-serve behind it, and `Learn more` left with the row it
          shared — an in-page anchor to `#pulse` competing with a real offer three inches below
          it. The panel is the hero's only action now. */}
      <FoundingPanel onNavigate={onNavigate} className="mk-r mk-r4" />

      {/* ⚠️ THE ARTWORK SPANS ROWS 2–4 AND PASSES BEHIND THE WORDS. Grid items may share cells;
          the statement and the copy sit at `z-index: 2`, the plate at `1`. `finished` is the slot
          primitive's own prop — the component is not forked, and the About page's vision plates
          keep every piece of chrome this drops. */}
      <MarketingIllustration slot="landingHero" finished>
        <img className="mk-illoart" src={heroIllustration} alt="" />
      </MarketingIllustration>
    </div>
  </section>
);
