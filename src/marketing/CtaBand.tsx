/**
 * CtaBand — the closing call-to-action (design ref: design-refs/landing-v13.html .cta-band):
 * parchment inner card wearing the Form 11 inset frame.
 *
 * ⚠️ ONE LINE ABOVE THE BUTTON, NOT TWO. The band used to carry a heading and a subtitle; the
 * heading was retired and the subtitle took its typographic slot, so there is no `<p>` here any
 * more. Adding one back would need new copy, and the band is a button with a reason attached —
 * not a section.
 */

import React from "react";
import { CTA_BAND_HEADING, CTA_START } from "./landingCopy";

export const CtaBand: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <section className="mk-ctaband">
    <div className="mk-ctainner">
      <h2>{CTA_BAND_HEADING}</h2>
      <button type="button" className="mk-btn" onClick={onStart}>{CTA_START}</button>
    </div>
  </section>
);
