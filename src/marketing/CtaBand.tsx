/**
 * CtaBand — the closing call-to-action on the desk (design ref: design-refs/landing-v13.html
 * .cta-band): parchment inner card wearing the Form 11 inset frame.
 */

import React from "react";
import { CTA_BAND_H2, CTA_BAND_SUB, CTA_START } from "./landingCopy";

export const CtaBand: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <section className="mk-ctaband">
    <div className="mk-ctainner">
      <h2>{CTA_BAND_H2}</h2>
      <p>{CTA_BAND_SUB}</p>
      <button type="button" className="mk-btn" onClick={onStart}>{CTA_START}</button>
    </div>
  </section>
);
