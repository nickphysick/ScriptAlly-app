/**
 * StatusBand — the section break between the hero and the feature rows: one line.
 *
 * ⚠️ NO EYEBROW SINCE LANDING HERO v3 (20 Oct, ref design-refs/landing-hero-v3.html). "No more
 * winging it." moved up to be the hero's headline, and the heading here is a statement now — "A
 * bird’s-eye view of your entire querying campaign." — set in the typewriter face on one line at
 * desktop. Its ground continues the hero's lower ground (the ref's `.peek` gradient) with no seam.
 *
 * ⚠️ THE STATUS CAROUSEL IS LONG GONE (18 Sep) AND THE GLYPHS SURVIVE IT. `StatusGlyph` /
 * `STATUS_GLYPH_COUNT` in `marketingMarks` still draw the footer's signature row.
 *
 * ⚠️ IT KEEPS `id="pulse"`, AND THAT IS LOAD-BEARING. The hero's "See how it works" is an in-page
 * jump to `#pulse`; losing the id silently breaks that link. The `scroll-margin-top` in the CSS is
 * what keeps this heading clear of the sticky nav.
 *
 * ⚠️ AND IT IS A PLAIN FUNCTION — no state, no refs, no effects.
 */

import React from "react";
import { BAND_HEADING } from "./landingCopy";

export const StatusBand: React.FC = () => (
  <section className="mk-statband" id="pulse">
    <h2 className="mk-stattitle">{BAND_HEADING}</h2>
  </section>
);
