/**
 * FeatureRows — the landing page's features band: six rows, each one illustration beside a heading
 * and a single paragraph, alternating sides down the page (rows 1, 3 and 5 image left). Every word,
 * image path and alt text comes from `FEATURE_ROWS` in landingCopy.ts. The band's heading is
 * `StatusBand`, its own section above this one, which carries the heading and the six status marks.
 *
 * ⚠️ A ROW IS THE IMAGE, THE HEADING AND THE PARAGRAPH — NOTHING ELSE. The card mockups, the CTA
 * buttons, the text links and the Pro badge were retired together when the rows were rebuilt
 * (14 Sep); an eyebrow, a kicker or a button added back to one row is a departure from that brief.
 *
 * ⚠️ THE IMAGE COMES FIRST IN THE MARKUP AND THE ALTERNATION IS CSS. Stacked, a row reads image then
 * copy with no reordering at all; side by side, every second row is flipped by `direction` on its
 * grid in marketing.css — so all six rows are the same markup. Each illustration's bleed into the page
 * margin, away from its copy, is CSS too, keyed to the same alternation.
 */

import React from "react";
import { FEATURE_ROWS } from "./landingCopy";

/* Each illustration's own facts, keyed by file.
   The SIZE is the file's pixel size. CSS sizes the image to its column, so it states only the ratio —
   enough for a row to reserve its height before the lazily-loaded file arrives rather than jump when it
   does. They are NOT all one size (the Track artwork is 2880×2100, the rest 2880×2250).
   ⚠️ THE VERSION IS THE FIRST EIGHT HEX DIGITS OF THE FILE'S OWN MD5, AND IT RIDES THE URL. Nothing under
   public/ is fingerprinted by the build and prod hosting lets a browser keep a file for an hour, so an
   image replaced under the same filename would otherwise be served stale. Replace a file, change its
   version. A smoke test reads every PNG — its header against the size, its hash against the version —
   so a file that changes without this table following fails there first. */
/* ⚠️ ALL SIX WERE 2880 WIDE AND 13.4MB BETWEEN THEM (16 Sep). They render at ~545px — a 1fr column
   of `1.6fr 1fr` inside an 1180 container, plus the 33% bleed — so 2880 was five times more picture
   than any screen asks for, and the page paid for it on every visit. Re-encoded at 1600 (still ~2.9x
   the render size) as dithered 256-colour PNGs: 2116KB -> 290KB and the like, 87% off, with no
   visible loss checked at full size.
   ⚠️ `smart-email-drop` IS ALSO NEW ARTWORK, not just a smaller file. The repo shipped the previous
   drawing because the replacement could not be got under budget with the tooling that existed; that
   is no longer true, so the row finally shows what it was meant to. */
const ILLUSTRATIONS: Record<string, { width: number; height: number; version: string }> = {
  "/images/track-agent-queries.png": { width: 1600, height: 1166, version: "10aedb0e" },
  "/images/home-for-your-agents.png": { width: 1600, height: 1250, version: "2e426b48" },
  "/images/journey-so-far.png": { width: 1600, height: 1250, version: "c7f381b1" },
  "/images/curate-and-compare.png": { width: 1600, height: 1250, version: "70fd47b2" },
  "/images/smart-email-drop.png": { width: 1600, height: 1250, version: "3a2f3b16" },
  "/images/comparable-titles.png": { width: 1600, height: 1250, version: "f4514d2e" },
};

/* A heading split so that its last two words can be held on one line. At the heading's deliberate 13ch
   measure three of the six would otherwise end on a single word. The words are untouched: the break
   before the held pair stays an ordinary space, outside the held run. */
const lastTwoWords = (heading: string): [string, string] => {
  const last = heading.lastIndexOf(" ");
  const cut = last > 0 ? heading.lastIndexOf(" ", last - 1) : -1;
  return cut >= 0 ? [heading.slice(0, cut + 1), heading.slice(cut + 1)] : ["", heading];
};

export const FeatureRows: React.FC = () => (
  <section className="mk-featband" id="mk-features">
    <div className="mk-rows">
      {FEATURE_ROWS.map((row) => {
        const art = ILLUSTRATIONS[row.image];
        const [lead, held] = lastTwoWords(row.heading);
        return (
          <div className="mk-frow" key={row.key}>
            <img
              className="mk-rowillo"
              src={row.image + "?v=" + art.version}
              alt={row.alt}
              width={art.width}
              height={art.height}
              loading="lazy"
            />
            <div className="mk-fcopy">
              <h3>
                {lead}
                <span className="mk-fkeep">{held}</span>
              </h3>
              <p>{row.body}</p>
            </div>
          </div>
        );
      })}
    </div>
  </section>
);
