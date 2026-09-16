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
 */

import React from "react";
import { HERO_H1, HERO_SUB, HERO_CTA, HERO_LINK } from "./landingCopy";

/* The shadow's own facts. The version is the first eight hex digits of the file's md5 and rides the
   URL: nothing under public/ is fingerprinted by the build and prod hosting lets a browser keep a
   file for an hour, so a replaced file would otherwise be served stale. Replace the file, change the
   version — a smoke test reads the PNG's header against the size and its hash against the version. */
const SHADOW = { src: "/images/hawk-shadow.png", version: "db6fc6e7", width: 2200, height: 1604 };

export const Hero: React.FC<{
  onNavigate: (tab: string, subPageName?: string) => void;
}> = ({ onNavigate }) => {
  return (
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
  );
};
