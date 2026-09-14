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

/* Every illustration is exported at 2880×1620. CSS sizes the image to its column, so these state
   only the ratio — enough for a row to reserve its height before the lazily-loaded file arrives
   rather than jump when it does. A smoke test reads each PNG's own header against them. */
const ILLUSTRATION_WIDTH = 2880;
const ILLUSTRATION_HEIGHT = 1620;

export const FeatureRows: React.FC = () => (
  <section className="mk-featband" id="mk-features">
    <div className="mk-rows">
      {FEATURE_ROWS.map((row) => (
        <div className="mk-frow" key={row.key}>
          <img
            className="mk-rowillo"
            src={row.image}
            alt={row.alt}
            width={ILLUSTRATION_WIDTH}
            height={ILLUSTRATION_HEIGHT}
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
