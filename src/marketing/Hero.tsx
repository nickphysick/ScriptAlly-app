/**
 * Hero — copy column beside the contained dashboard panel, with the Form 11 pair peeking
 * beneath (design ref: design-refs/landing-v13.html). Copy verbatim from landingCopy.ts:
 * Playfair 500 mocha H1 — no italics, no burgundy.
 */

import React from "react";
import { HERO_EYEBROW, HERO_H1, HERO_SUB, HERO_NOTE, CTA_START, CTA_PRICING } from "./landingCopy";
import { DashboardDemo } from "./DashboardDemo";
import { FormPeek } from "./FormPeek";

export const Hero: React.FC<{ onStart: () => void; onPricing: () => void }> = ({ onStart, onPricing }) => (
  <section className="mk-hero">
    <div className="mk-heroinner">
      <div className="mk-hcopy">
        <div className="mk-eyebrow">{HERO_EYEBROW}</div>
        <h1>{HERO_H1}</h1>
        <p className="mk-hsub">{HERO_SUB}</p>
        <div className="mk-hctas">
          <button type="button" className="mk-btn" onClick={onStart}>{CTA_START}</button>
          <button type="button" className="mk-tlink" onClick={onPricing}>{CTA_PRICING}</button>
        </div>
        <div className="mk-hnote">{HERO_NOTE}</div>
      </div>
      <div className="mk-hvisual">
        <DashboardDemo />
        <FormPeek />
      </div>
    </div>
  </section>
);
