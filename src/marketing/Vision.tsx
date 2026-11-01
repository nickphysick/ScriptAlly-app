/**
 * Vision — "Our vision is simple.": a white band between the feature rows and the founding-writers
 * band (ref design-refs/landing-v6.html). A heading and three illustrated points. Pure presentation
 * over `VISION_POINTS` in landingCopy.ts.
 *
 * ⚠️ IT IS THE THIRD BAND INSIDE `.mk-lower` THAT PAINTS ITS OWN GROUND, and that is a decision
 * rather than a drift. The two-surface rule exists because a retired parchment band repainted by
 * accident over its whole height and flattened the cards on it; a BOUNDED band whose edges are
 * declared is a section, an unbounded repaint is a seam. This one states both edges with hairlines
 * and is white — the one value on the page that reads as a page turn rather than as another tint.
 * `marketingTokens.test.ts` asserts the SET of three, so a fourth has to be argued for.
 *
 * ⚠️ THE THREE PICTURES SHARE A BASELINE BECAUSE THEY SHARE A HEIGHT, NOT BECAUSE THEY WERE LINED
 * UP. Each PNG is trimmed to its own alpha bounding box and exported at the same 440px height, so
 * inside a fixed-height `figure` that ends at `flex-end` all three stand on the same line whatever
 * their widths. Replace one with a differently-proportioned export and the row still holds; replace
 * one with a padded export and it floats, silently.
 *
 * ⚠️ "Read our story" IS RETIRED (waitlist v1, 31 Oct, ref design-refs/landing-desktop-v5.html): the
 * landing page links nowhere but Privacy. The headings may wrap now (`.mk-vh3`), which fixes
 * "straightforward" overflowing its card. `onNavigate` stays in the props so the page's callers
 * do not change.
 */

import React from "react";
import { VISION_HEADING, VISION_POINTS } from "./landingCopy";

/* Each plate's own facts, keyed by file. The SIZE is the file's pixel size, so a point reserves its
   box before the picture arrives rather than jumping when it does; CSS sizes it to the figure.
   ⚠️ THE VERSION IS THE FIRST EIGHT HEX DIGITS OF THE FILE'S OWN MD5, AND IT RIDES THE URL. Nothing
   under public/ is fingerprinted by the build and prod hosting lets a browser keep a file for an
   hour, so a picture replaced under the same filename would otherwise be served stale — which is
   exactly what happens the day the commissioned artwork lands. Replace a file, change its version;
   a smoke test reads every PNG's header against the size and its hash against the version. */
export const PLATES: Record<string, { width: number; height: number; version: string }> = {
  "/images/get-good-stories-told.png": { width: 482, height: 440, version: "8baf6c8a" },
  "/images/make-querying-simple.png": { width: 456, height: 440, version: "be581a5e" },
  "/images/let-writers-write.png": { width: 347, height: 440, version: "d481eb31" },
};

/**
 * On phones (≤760px; landing on phones v4, 26 Oct; ref design-refs/landing-mobile-v4.html `.nv`,
 * `.vbf`, `.vbr`/`.vbt`): navy with rounded top corners, starting straight after the feature story.
 * "And so much more." and its lead (v3's closing beat, folded in), then ONE cream frame holding the
 * three pictures stacked — only the current one shows, cross-fading — and beneath it the three lines
 * you swipe. Swiping the lines changes the picture and the active dot; then "Read our story →".
 * Text on navy is always white; the active dot is pink.
 *
 * ⚠️ THE LINE IN VIEW IS DERIVED FROM THE SCROLL POSITION (whichever line's centre is nearest the
 * strip's), never kept as a counter, and the frame and the dots both read it. ← / → move one line;
 * under reduced motion the move jumps and the picture swaps instantly.
 */
/* ⚠️ `VisionNavy` — the phones' sideways carousel of the three principles — is RETIRED (waitlist v1,
   31 Oct). Phones draw the mission on navy in `LandingPhone` and the page never scrolls sideways. */

export const Vision: React.FC<{ onNavigate: (tab: string, subPageName?: string) => void }> = () => {
  return (
  <section className="mk-vision" aria-labelledby="mk-vision-h">
    <div className="mk-visionin">
      <h2 id="mk-vision-h" className="mk-visionh2">{VISION_HEADING}</h2>
      <div className="mk-visionpoints">
        {VISION_POINTS.map((point) => {
          const plate = PLATES[point.image];
          return (
            <div className="mk-vpoint" key={point.key}>
              {/* Decorative: the heading beside it says what the point is, and an alt text here
                  would state it twice to a screen reader. */}
              <figure className="mk-vfig">
                <img
                  src={point.image + "?v=" + plate.version}
                  alt=""
                  width={plate.width}
                  height={plate.height}
                  loading="lazy"
                />
              </figure>
              <h3 className="mk-vh3">{point.heading}</h3>
              <p className="mk-vbody">{point.body}</p>
            </div>
          );
        })}
      </div>
    </div>
  </section>
  );
};
