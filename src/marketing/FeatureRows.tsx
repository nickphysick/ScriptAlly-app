/**
 * FeatureRows — the landing page's features band: six rows, each one illustration beside a heading
 * and a single paragraph, alternating sides down the page (rows 1, 3 and 5 image left). Every word,
 * image path and alt text comes from `FEATURE_ROWS` in landingCopy.ts. The band's heading is
 * `BandHeader`, its own full-width section above this one, which also owns the trace and its observer.
 *
 * ⚠️ A ROW IS THE IMAGE, THE HEADING AND THE PARAGRAPH — NOTHING ELSE. The card mockups, the CTA
 * buttons, the text links and the Pro badge were retired together when the rows were rebuilt
 * (14 Sep); an eyebrow, a kicker or a button added back to one row is a departure from that brief.
 *
 * ⚠️ THE IMAGE COMES FIRST IN THE MARKUP AND THE ALTERNATION IS CSS. Stacked, a row reads image then
 * copy with no reordering at all; side by side, every second row is flipped by `direction` on its
 * grid in marketing.css — so all six rows are the same markup.
 */

import React from "react";
import { FEATURE_ROWS } from "./landingCopy";

/* Each illustration's own pixel size. CSS sizes the image to its column, so these state only the
   ratio — enough for a row to reserve its height before the lazily-loaded file arrives rather than
   jump when it does. They are NOT all one size (the Track artwork is 2880×2100, the rest 2880×1620),
   which is why this is keyed by file rather than one constant. A smoke test reads each PNG's own
   header against them, so a re-exported file that changes shape fails there first. */
const ILLUSTRATION_SIZE: Record<string, { width: number; height: number }> = {
  "/images/journey-so-far.png": { width: 2880, height: 1620 },
  "/images/track-agent-queries.png": { width: 2880, height: 2100 },
  "/images/home-for-your-agents.png": { width: 2880, height: 1620 },
  "/images/smart-email-drop.png": { width: 2880, height: 1620 },
  "/images/curate-and-compare.png": { width: 2880, height: 1620 },
  "/images/comparable-titles.png": { width: 2880, height: 1620 },
};

/* Illustrations that grow a third larger than their column, out past the gutter into the page margin
   (capped at the screen edge, off when rows stack — see .mk-rowillo--bleed). ⚠️ The stylesheet bleeds
   RIGHT only, so a file listed here must sit in an image-right row, i.e. every second one; a smoke test
   fails otherwise. A per-file presentation choice: the Track artwork, 15 Sep. */
const BLEEDS_INTO_MARGIN = new Set(["/images/track-agent-queries.png"]);

export const FeatureRows: React.FC = () => (
  <section className="mk-featband" id="mk-features">
    <div className="mk-rows">
      {FEATURE_ROWS.map((row) => (
        <div className="mk-frow" key={row.key}>
          <img
            className={"mk-rowillo" + (BLEEDS_INTO_MARGIN.has(row.image) ? " mk-rowillo--bleed" : "")}
            src={row.image}
            alt={row.alt}
            width={ILLUSTRATION_SIZE[row.image].width}
            height={ILLUSTRATION_SIZE[row.image].height}
            loading="lazy"
          />
          <div className="mk-fcopy">
            <h3>{row.heading}</h3>
            <p>{row.body}</p>
          </div>
        </div>
      ))}
    </div>
  </section>
);
