/**
 * Hero — the landing page's opening block (brief, 16 Sep): a copy column beside the hawk's shadow.
 * Two equal columns, vertically centred, the full width of the page; the shadow overflows its own
 * column and the hero clips it at the viewport's edge.
 *
 * ⚠️ IT REPLACED THE STATEMENT HERO WHOLESALE, AND THE FOUNDING PANEL WENT WITH IT. The hero used to
 * carry the page's only sign-up form: kicker, ask, three perks, the email field, a counter and a way
 * through to /founders. The form still exists twice — the sealed band at the foot of this page, and
 * /founders — so the funnel is intact, and the solid button here is the way to it.
 *
 * ⚠️ THE HELD PAIR WENT WITH THE HEADLINE THAT NEEDED IT. "A bird's-eye view of your querying
 * campaign" broke four lines deep at an 11ch measure and stranded "campaign" alone, so its last two
 * words were held on one line. The headline is three short words now, and the SAME mechanism would
 * strand "The": the held run becomes "hunt begins.", and a line that cannot break inside it forces
 * the break in front of it. A three-word headline wraps where it likes — there is nothing to hold,
 * and the 11ch measure that made the pair necessary is gone with it.
 *
 * ⚠️ THE SHADOW IS DECORATIVE: `alt=""`, and nothing in the copy depends on it. It is tinted in the
 * file; it takes no filter and no recolour here, and its transparency is the artwork.
 *
 * ⚠️ AND IT IS POSITIONED BY A RULE, NOT BY A DRAWN NUMBER (18 Sep). The ref that set its size was
 * authored in a 1440px frame with 120px gutters; this hero shares the feature rows' container —
 * 1180 capped, 56px gutters — so the ref's offsets put the wing through the headline. The rule is
 * stated in the stylesheet instead: centred, never within 24px of the headline's ink, never within
 * 24px of the viewport edge, and it SHRINKS rather than overlapping when those two cannot both
 * hold. The headline's ink width is the one thing CSS cannot compute, so it is a measured token
 * with a rendered lock on it.
 */

import React from "react";
import { HERO_H1, HERO_SUB, HERO_CTA, HERO_LINK } from "./landingCopy";

/* The shadow's own facts. The version is the first eight hex digits of the file's md5 and rides the
   URL: nothing under public/ is fingerprinted by the build and prod hosting lets a browser keep a
   file for an hour, so a replaced file would otherwise be served stale. Replace the file, change the
   version — a smoke test reads the PNG's header against the size and its hash against the version.
   ⚠️ IT IS TRIMMED TO ITS OWN INK NOW, AND THAT IS WHY IT USED TO RENDER SMALL (18 Sep). The file
   was 2200x1604 with the bird occupying 1527x1304 of it — 30% of the box was transparent padding,
   so an element sized to 72% of its column drew a hawk barely 267px wide. Trimmed, the element box
   IS the ink box: the hero's clearance rule can talk about "the shadow's left edge" and mean the
   wing tip, and the same percentage now buys twice the picture. Re-exported from the 2880x2100
   source, cropped to its alpha bounding box, and quantised — 241KB to 92KB with more drawing in it.
   ⚠️ ANY REPLACEMENT MUST ALSO BE TRIMMED. A padded export silently reintroduces the fault, and it
   fails as "the hawk looks small again" rather than as anything a test would name. */
const SHADOW = { src: "/images/hawk-shadow.png", version: "24b7a5ea", width: 1400, height: 1197 };

export const Hero: React.FC<{
  onNavigate: (tab: string, subPageName?: string) => void;
}> = ({ onNavigate }) => {
  return (
    /* ⚠️ THE WRAPPER IS A MEASUREMENT, NOT A LAYOUT. It carries `container-type: inline-size` so the
       shadow's rule can read how much room exists OUTSIDE the hero's 1180px cap — which the hero's
       own width stops reporting the moment the viewport passes it. `cqw` rather than `vw` because
       a classic scrollbar is counted by one and not the other. It has no styling of its own. */
    <div className="mk-herowrap">
    <section className="mk-hero">
      <div className="mk-herocopy">
        <h1 className="mk-herotitle">{HERO_H1}</h1>
        <p className="mk-herosub">{HERO_SUB}</p>
        <div className="mk-heroctas">
          {/* ⚠️ A BUTTON, NOT AN ANCHOR. Marketing routes are driven by `onNavigate`; an `<a href>`
              would reload the app to reach a page it can already render. */}
          <button type="button" className="mk-heropill" onClick={() => onNavigate("founders")}>
            {HERO_CTA}
          </button>
          {/* ⚠️ AN ANCHOR, BECAUSE THIS ONE REALLY IS AN IN-PAGE JUMP — to the section break that
              introduces the feature rows, which already carries the `scroll-margin-top` that keeps
              its heading clear of the sticky nav. */}
          <a className="mk-herolink" href="#pulse">{HERO_LINK}</a>
        </div>
      </div>
      <div className="mk-heroart">
        <img
          src={SHADOW.src + "?v=" + SHADOW.version}
          alt=""
          width={SHADOW.width}
          height={SHADOW.height}
        />
      </div>
    </section>
    </div>
  );
};
