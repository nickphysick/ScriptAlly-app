/**
 * StatusBand — the section break between the hero and the feature rows: an eyebrow and a question.
 *
 * ⚠️ THE STATUS CAROUSEL IS DELETED (18 Sep, ref design-refs/landing-v6.html), AND SO IS EVERY PART
 * OF IT: the six glyph buttons and their tablist, the state title and description, the dwell timer,
 * the `IntersectionObserver` that paused it off-screen, the reduced-motion gate, the position
 * dashes, and `STATUS_STEPS` in `landingCopy.ts`. The heading takes the reader straight into the
 * feature rows now, which say the same thing with the product's own pictures rather than by
 * rotating a definition at somebody four times a minute.
 *
 * ⚠️ THE GLYPHS THEMSELVES SURVIVE AND MUST. `StatusGlyph`/`STATUS_GLYPH_COUNT` live in
 * `marketingMarks` and `MarketingFooter` draws all six as its signature row — this component was
 * never their only consumer, and deleting them with the carousel would have taken the footer's row
 * with it. Checked by grep before the deletion rather than inferred from the diff.
 *
 * ⚠️ IT KEEPS `id="pulse"`, AND THAT IS LOAD-BEARING. The hero's "See how it works" is an in-page
 * jump to `#pulse`; the id has moved section twice now and losing it silently breaks that link.
 * The `scroll-margin-top` in the CSS is what keeps this heading clear of the sticky nav.
 *
 * ⚠️ AND IT IS A PLAIN FUNCTION AGAIN — no state, no refs, no effects. Anything reintroduced here
 * that ticks is a decision to make, not a component to grow back into.
 */

import React from "react";
import { BAND_EYEBROW, BAND_HEADING } from "./landingCopy";

export const StatusBand: React.FC = () => (
  <section className="mk-statband" id="pulse">
    <p className="mk-stateyebrow">{BAND_EYEBROW}</p>
    <h2 className="mk-stattitle">{BAND_HEADING}</h2>
  </section>
);
